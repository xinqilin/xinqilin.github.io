---
title: "Timeout、Retry、Backoff 與 Jitter：重試怎麼救系統，又怎麼壓垮系統"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 6：設定逾時與逾時預算，判斷哪些錯誤可以重試，用指數退避、jitter 與重試預算避免重試風暴，並用 Spring Framework 7 的 @Retryable 落地"
categories: ["SystemDesign"]
tags: ["System Design", "Timeout", "Retry", "Backoff", "Spring", "Security"]
---

> **System Design 系列** Part 6-2｜上一篇：[備援、故障轉移與災難復原](/post/systemdesign/redundancy-failover-dr/)｜下一篇：[Circuit Breaker 與 Bulkhead](/post/systemdesign/circuit-breaker-bulkhead/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

報名服務在完成報名前，要呼叫金流服務確認付款狀態。某天金流服務的資料庫變慢，回應時間從 50 毫秒變成 30 秒。

報名服務的 HTTP 用戶端沒有設定逾時。每個報名請求都卡在等待金流回應，Tomcat 的執行緒一個一個被佔住，連線池也被借光。幾分鐘後，**連完全不需要金流的查詢講座 API 也沒有回應了**，因為已經沒有可用的執行緒。

工程師加上了逾時與重試：逾時 5 秒，失敗重試 3 次。下一次金流服務變慢時，報名服務送給金流的請求數變成平常的 4 倍。金流服務本來只是變慢，現在被重試的流量徹底壓垮。

逾時和重試都是必要的，但設定錯了，它們會讓故障擴大，而不是縮小。

## 最簡單的做法與它的極限

- **不設逾時**：很多 HTTP 用戶端預設不會逾時，或逾時長達數分鐘。一個慢的下游就能佔住所有資源
- **失敗就立刻重試**：下游正因為負載太高而失敗，立刻重試只會讓負載更高
- **每一層都重試 3 次**：使用者的 App、API gateway、報名服務各自重試 3 次，一個請求到最下游最多變成 4 × 4 × 4 = 64 次嘗試（每層 1 次原始請求加 3 次重試）

## 核心機制

### 逾時：等待的成本

等待不是免費的。報名服務每在等待中的一個請求，都佔用了：

- 一個執行緒（或一個虛擬執行緒與它的記憶體）
- 一條連到下游的連線
- 可能還有一條資料庫連線，如果呼叫發生在交易裡
- 使用者那一端的耐心

逾時要分開設定：

| 逾時 | 意義 | 參考值 |
|---|---|---|
| 連線逾時 | 建立 TCP（與 TLS）連線的時間 | 同一個機房內通常幾毫秒就完成，設幾百毫秒；連不上代表對方不在了，不需要等很久 |
| 讀取逾時 | 送出請求後，等待回應資料的時間 | 依下游的延遲分布決定 |
| 整體期限（deadline） | 這次操作（包含所有重試）最多能花多久 | 依呼叫端的期限決定 |

**讀取逾時依下游的延遲分布決定**。金流服務的 p99 是 300 毫秒、p99.9 是 800 毫秒，讀取逾時設 1 秒：正常情況下幾乎不會誤判，下游真的出問題時，最多等 1 秒。設得比 p99 還短，正常的慢請求也會被當成失敗，接著觸發重試，反而增加負載。

### 逾時預算：越往下越短

使用者的請求有一個總期限，每往下一層，剩下的時間就越少：

```mermaid
flowchart LR
    U[App<br/>等 3 秒] --> G[API gateway<br/>逾時 2.8 秒]
    G --> R[報名服務<br/>剩 2.5 秒]
    R -->|每次 1 秒<br/>最多 2 次| P[金流服務]
```

如果報名服務對金流的逾時是 5 秒、重試 3 次，最長可能等 20 秒以上，但 gateway 在 2.8 秒就放棄了，使用者早就看到錯誤畫面。報名服務在那之後的等待與重試全是白費，還繼續佔著資源。

**內層的逾時加上重試，總和不能超過外層剩下的時間**。gRPC 會自動把 deadline 往下傳遞（[REST、gRPC 與 GraphQL 篇](/post/systemdesign/rest-grpc-graphql/)），HTTP 沒有標準的做法，要自己計算剩餘時間，必要時用 header 往下傳。

### 哪些錯誤可以重試

重試的前提是「再試一次可能會成功」，而且「再試一次不會造成傷害」：

| 錯誤 | 重試？ | 理由 |
|---|---|---|
| 連線被拒、連線逾時 | 可以 | 請求沒有送到對方，重試是安全的 |
| 讀取逾時 | 只有冪等的操作可以 | 請求可能已經處理完成，只是回應沒回來 |
| 502、503、504 | 可以，有退避 | 通常是暫時的；503 可能帶著 `Retry-After` |
| 429 Too Many Requests | 可以，依 `Retry-After` 等待 | 對方明確要求慢下來 |
| 500 | 通常不要 | 多半是程式錯誤，重試的結果一樣 |
| 400、401、403、404、409、422 | 不要 | 請求本身有問題，重試不會改變結果 |

非冪等的操作（建立付款）要重試，必須帶上同一個 [Idempotency Key](/post/systemdesign/idempotency-key/)，否則讀取逾時後的重試就可能扣兩次款。

### 指數退避

重試之間要等待，而且等待的時間要越來越長，給下游恢復的時間：

```text
第 n 次重試前的等待 = min(上限, 基本間隔 × 2^(n-1))
基本間隔 100 ms、上限 1 秒：100 ms、200 ms、400 ms、800 ms、1 秒、1 秒...
```

### Jitter：把重試打散

假設金流服務重啟，有 10,000 個請求在同一個瞬間失敗。如果每個用戶端都在失敗後剛好 100 毫秒重試，金流服務剛啟動，就在同一毫秒收到 10,000 個請求，再度被打垮；200 毫秒後又是一波。指數退避只拉開了波與波之間的距離，沒有消除波峰。

**Jitter** 在等待時間裡加入隨機性。AWS 的 Marc Brooker 在 2015 年的文章比較了幾種做法，其中 **full jitter** 最簡單，效果也是最好的幾種之一：

```text
等待時間 = random(0, min(上限, 基本間隔 × 2^(n-1)))
```

10,000 個重試平均分散在 0 到 100 毫秒之間，每毫秒大約 100 個，而不是 10,000 個擠在同一毫秒。

Spring Framework 7 的 `@Retryable` 也有 `jitter` 參數，但語意不同：它是在計算出來的 delay 上下浮動，而且**不會低於基本的 delay**。`delay = 100, jitter = 100` 時，第一次重試在 100 到 200 毫秒之間。只要 jitter 和 delay 同一個數量級，就足以打散同步的重試；jitter 設得太小（例如 delay 的 1%），效果有限。

### 重試預算

退避與 jitter 解決了「同時重試」，但沒有解決「重試讓總負載增加」。下游已經過載時，即使重試被打散，每個請求仍然會變成 3 到 4 次嘗試。

Google 的 SRE 書提出**重試預算**：每個用戶端追蹤重試佔總請求的比例，**超過 10% 就不再重試**。正常時偶爾的失敗都能重試；下游大規模故障時，重試最多只讓負載增加 10%，而不是 3 倍。

搭配「只在一層重試」的原則：gateway 與 App 不重試，或只重試連線錯誤；由最了解業務語意的那一層（報名服務）決定是否重試。

### 對沖請求

另一種相關的技巧是**對沖請求**（hedged request）：送出請求後，如果超過 p95 的時間還沒有回應，就再送一個相同的請求到另一台伺服器，採用先回來的結果。它降低的是尾端延遲，而不是處理錯誤。代價是增加約 5% 的負載，而且只能用在冪等的讀取。

## 方案比較

| 策略 | 解決什麼 | 沒解決什麼 |
|---|---|---|
| 只設逾時 | 慢的下游不會佔住資源 | 暫時性的失敗直接變成使用者看到的錯誤 |
| 逾時 + 立即重試 | 偶發的失敗 | 下游過載時加重負載 |
| 指數退避 | 給下游恢復的時間 | 大量用戶端同步重試 |
| 指數退避 + jitter | 打散重試的波峰 | 總負載仍然倍增 |
| 再加上重試預算 | 限制重試帶來的額外負載 | 下游持續故障時，每個請求仍要等到逾時才失敗（[下一篇](/post/systemdesign/circuit-breaker-bulkhead/)的 circuit breaker） |
| 佇列與非同步重試 | 不需要即時結果的工作，可以等更久再試（[Message Queue 篇](/post/systemdesign/message-queue/)） | 使用者需要立即的回應時不適用 |

## Java 落地

### 1. 每個 HTTP 用戶端都設逾時

```yaml
spring:
  http:
    clients:
      connect-timeout: 300ms
      read-timeout: 1s
```

Spring Boot 4 的 `spring.http.clients` 屬性會套用到所有自動設定的 HTTP 用戶端（`RestClient.Builder` 建立的用戶端、HTTP service client）。不同的下游需要不同的逾時時，用 `spring.http.serviceclient.<group>` 分別設定。

### 2. 簡單的情況：`@Retryable`

```java
@Configuration
@EnableResilientMethods
public class ResilienceConfig {
}

@Service
public class SeatQueryClient {

    private final RestClient restClient;

    public SeatQueryClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://inventory.internal.example.com").build();
    }

    // 只重試連線層的錯誤與 503；最多重試 2 次，等待 100~200 ms、再 200~400 ms
    @Retryable(includes = {ResourceAccessException.class, HttpServerErrorException.ServiceUnavailable.class},
            maxRetries = 2, delay = 100, jitter = 100, multiplier = 2, maxDelay = 1000)
    public SeatSnapshot fetch(long lectureId) {
        return restClient.get()
                .uri("/v1/lectures/{id}/seats", lectureId)
                .retrieve()
                .body(SeatSnapshot.class);
    }
}
```

- `@Retryable` 預設會對**任何例外**重試 3 次、間隔 1 秒。一定要用 `includes` 限定可以重試的例外，否則 404 與 400 也會被重試
- `maxRetries` 是重試的次數，不含第一次，所以最多執行 3 次
- 和 `@Transactional` 一樣是透過代理生效，同一個類別內部的呼叫不會被攔截

### 3. 完整的情況：期限、`Retry-After` 與重試預算

查詢付款狀態需要更細的控制：遵守呼叫端剩下的時間、尊重 `Retry-After`、受重試預算限制。為了看清楚每一個機制，這裡直接寫出重試的迴圈：

```java
/** 重試最多佔請求數的固定比例：每個請求存入一點額度，每次重試扣掉一整份。 */
public final class RetryBudget {

    private static final long TOKEN = 1_000;

    private final long depositPerRequest;
    private final long maxBalance;
    private final AtomicLong balance;

    public RetryBudget(double retryRatio, int maxBurst) {
        this.depositPerRequest = Math.round(retryRatio * TOKEN);
        this.maxBalance = maxBurst * TOKEN;
        this.balance = new AtomicLong(maxBalance);
    }

    public void recordRequest() {
        balance.accumulateAndGet(depositPerRequest, (current, deposit) -> Math.min(maxBalance, current + deposit));
    }

    public boolean tryAcquireRetry() {
        long current;
        do {
            current = balance.get();
            if (current < TOKEN) {
                return false;
            }
        } while (!balance.compareAndSet(current, current - TOKEN));
        return true;
    }
}
```

```java
@Component
public class PaymentStatusClient {

    private static final long BASE_MILLIS = 100;
    private static final long CAP_MILLIS = 1_000;
    private static final long MAX_RETRY_AFTER_MILLIS = 5_000;
    private static final int MAX_ATTEMPTS = 3;

    private final RestClient restClient;
    private final RetryBudget budget = new RetryBudget(0.1, 50);      // 重試最多佔 10%

    public PaymentStatusClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://payments.internal.example.com").build();
    }

    /** 查詢付款狀態是冪等的讀取。deadline 是呼叫端剩下的期限。 */
    public PaymentStatus fetch(String paymentId, Instant deadline) {
        budget.recordRequest();
        for (int attempt = 1; ; attempt++) {
            try {
                return restClient.get()
                        .uri("/v1/payments/{id}", paymentId)
                        .retrieve()
                        .body(PaymentStatus.class);
            } catch (RestClientException e) {
                long waitMillis = Math.max(fullJitter(attempt), retryAfterMillis(e));
                boolean giveUp = !isTransient(e)
                        || attempt >= MAX_ATTEMPTS
                        || Instant.now().plusMillis(waitMillis).isAfter(deadline)
                        || !budget.tryAcquireRetry();
                if (giveUp) {
                    throw e;
                }
                sleep(waitMillis);
            }
        }
    }

    private static long fullJitter(int attempt) {
        long ceiling = Math.min(CAP_MILLIS, BASE_MILLIS << (attempt - 1));
        return ThreadLocalRandom.current().nextLong(ceiling + 1);
    }

    private static boolean isTransient(RestClientException e) {
        if (e instanceof ResourceAccessException) {                 // 連線失敗、逾時
            return true;
        }
        if (e instanceof RestClientResponseException response) {
            int status = response.getStatusCode().value();
            return status == 429 || status == 502 || status == 503 || status == 504;
        }
        return false;
    }

    /** 只接受秒數格式，並限制上限：不能讓下游決定我們要等多久。 */
    private static long retryAfterMillis(RestClientException e) {
        if (e instanceof RestClientResponseException response && response.getResponseHeaders() != null) {
            String value = response.getResponseHeaders().getFirst(HttpHeaders.RETRY_AFTER);
            if (value != null && value.matches("\\d{1,6}")) {
                return Math.min(Long.parseLong(value) * 1_000, MAX_RETRY_AFTER_MILLIS);
            }
        }
        return 0;
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted while waiting to retry", e);
        }
    }
}
```

- 放棄重試的條件有四個：錯誤不是暫時性的、次數用完、等待後會超過期限、重試預算不足。超過期限的重試沒有意義，呼叫端已經不會用到結果了
- `Retry-After` 與 full jitter 取較大的值，而且有上限
- 預算初始是滿的，冷啟動時也能重試；流量很低的服務，預算可能很久才累積一份，必要時再加上「每秒至少允許幾次」的下限
- 每次嘗試的讀取逾時仍是設定檔裡的 1 秒；最後一次嘗試可能稍微超過期限。需要精確控制時，要能針對單一請求設定逾時

> 以上程式碼依 Spring Framework 7 與 Spring Boot 4.1 官方文件撰寫，沒有實際編譯與執行。

## 踩坑與 Gotchas

- **HTTP 用戶端沒有逾時**：最常見，也最致命。所有對外呼叫、資料庫、Redis、訊息佇列的用戶端都要檢查
- **內層逾時比外層長**：外層已經放棄，內層還在等待與重試
- **每一層都重試**：重試次數相乘。只在一層重試
- **`@Retryable` 沒有限定例外**：預設對所有例外重試，包括 400、404 與程式錯誤
- **在交易裡重試外部呼叫**：重試加上退避的等待期間，資料庫交易與連線一直被佔住。外部呼叫移到交易外
- **重試非冪等的操作**：讀取逾時後重試建立付款，造成重複扣款
- **重試掩蓋了問題**：重試成功了，監控上一切正常，但下游已經在大量失敗。重試的次數要有指標與告警（[Part 6 的 Observability](/post/systemdesign/observability/)）
- **逾時設得太短**：比下游的 p99 還短，正常的慢請求也被當成失敗並重試，下游的負載反而增加
- **把 jitter 設得太小**：`delay = 1000, jitter = 10`，所有用戶端仍然幾乎同時重試

### 資安相關

- **逾時也是防禦**：伺服器端如果沒有讀取請求的逾時，攻擊者可以開大量連線，每條都極慢地送出 header（slowloris），佔滿所有連線。設定伺服器端的連線與讀取逾時（例如 Spring Boot 的 `server.tomcat.connection-timeout`），並限制請求大小
- **重試放大可以被利用**：攻擊者找到一個會讓下游逾時的請求（例如特別昂貴的查詢），每送一個請求，系統內部就產生多次重試。重試預算把放大倍數限制在可控的範圍
- **不要讓下游決定你等多久**：`Retry-After: 86400` 會讓重試迴圈卡住一整天，`Retry-After: 0` 會讓用戶端不斷重試。被入侵或設定錯誤的下游都可能回傳這種值。解析時只接受預期的格式，並限制上下限
- **使用者提供的 URL**：webhook 這類由使用者填寫的網址，攻擊者可以指向一個故意極慢回應的伺服器，佔住你的執行緒。這類呼叫要有更短的逾時、回應大小上限，以及防範 SSRF 的檢查（Part 8）
- **重試時的 log**：重試時記錄完整的請求內容很方便除錯，但可能把 `Authorization` header、個資寫進 log。只記錄請求 ID、目的地與錯誤類型
- **憑證在重試期間過期**：長時間的重試可能遇到存取 token 過期，收到 401 之後應該重新取得 token，而不是用同一個 token 一直重試

## 何時用／何時別用

- **一定要做**：每一個跨網路的呼叫都設逾時，而且內層比外層短
- **重試**：暫時性的錯誤、冪等的操作（或有 Idempotency Key），搭配指數退避、jitter 與重試預算，只在一層重試
- **別重試**：4xx、程式錯誤、非冪等且沒有 Idempotency Key 的操作；使用者已經放棄等待的請求；下游明確已經故障時（交給 circuit breaker）

## 參考資料

- Marc Brooker, "Exponential Backoff And Jitter", AWS Architecture Blog, 2015：<https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/>
- AWS Builders' Library — Timeouts, retries, and backoff with jitter：<https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/>
- Google, *Site Reliability Engineering*, Chapter 21 "Handling Overload" 與 Chapter 22 "Addressing Cascading Failures"：<https://sre.google/sre-book/table-of-contents/>
- Jeffrey Dean, Luiz André Barroso, "The Tail at Scale", *Communications of the ACM*, 2013
- RFC 9110, "HTTP Semantics", Section 10.2.3 Retry-After：<https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3>
- Spring Framework Reference — Resilience Features：<https://docs.spring.io/spring-framework/reference/core/resilience.html>
- Spring Boot Reference — Calling REST Services：<https://docs.spring.io/spring-boot/reference/io/rest-client.html>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
