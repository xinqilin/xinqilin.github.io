---
title: "Rate Limiting：限流演算法、分散式限流，以及限流和降載的差別"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 6：比較固定視窗、滑動視窗與 token bucket，說明分散式限流、限流的 key 與 429 回應，區分限流與降載，並用 Redis Lua script 落地"
categories: ["SystemDesign"]
tags: ["System Design", "Rate Limiting", "Token Bucket", "Redis", "Spring", "Security"]
---

> **System Design 系列** Part 6-4｜上一篇：[Circuit Breaker 與 Bulkhead](/post/systemdesign/circuit-breaker-bulkhead/)｜下一篇：[Observability](/post/systemdesign/observability/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台最近遇到幾件事：

- 熱門講座開放報名的瞬間，有人用程式每秒送出上千個報名請求，名額在 2 秒內被搶光，真人使用者連頁面都還沒載入
- 一個合作夥伴的系統有 bug，在迴圈裡不斷呼叫查詢 API，每秒 5,000 個請求，拖慢了所有人
- 登入 API 每分鐘收到數萬次嘗試，帳號密碼來自其他網站外洩的資料（credential stuffing）
- 簡訊驗證碼 API 被大量呼叫，發送到國外的付費號碼，一個晚上燒掉幾萬元的簡訊費

[上一篇](/post/systemdesign/circuit-breaker-bulkhead/)的 circuit breaker 與 bulkhead 保護的是「我呼叫的下游」。這篇要保護的是自己：**限制每個呼叫者能用掉多少資源**，讓一個呼叫者的行為不會影響其他人。

## 最簡單的做法與它的極限

在每台應用伺服器的記憶體裡，用一個 map 記錄每個使用者這一分鐘的請求數，超過 100 就拒絕。

- 4 台伺服器各自計數，使用者實際能送出 400 個請求（[無狀態服務篇](/post/systemdesign/scaling-stateless/)的「記憶體計數器」問題）。自動擴充到 8 台，限額又悄悄變成 800
- 「這一分鐘」從整點開始算，使用者可以在 00:59 送 100 個、01:00 再送 100 個，2 秒內送出 200 個

## 核心機制

### 演算法

**固定視窗**（fixed window）：每個時間窗（例如每分鐘）一個計數器，超過上限就拒絕。

- 實作最簡單，Redis 一個 `INCR` 加上 `EXPIRE` 就完成
- 視窗交界的問題：上限每分鐘 100，最壞情況在 2 秒內通過 200 個

**滑動視窗紀錄**（sliding window log）：記錄每個請求的時間戳，計算最近 60 秒內的數量。

- 精確，沒有交界問題
- 記憶體與請求數成正比：100 萬個使用者、每人上限 100，光是時間戳就要 100 萬 × 100 × 8 bytes = 800 MB

**滑動視窗計數**（sliding window counter）：只保留「這一分鐘」與「上一分鐘」兩個計數器，用重疊比例估算：

```text
估計值 = 本分鐘的數量 + 上分鐘的數量 × (上分鐘仍在 60 秒視窗內的比例)
現在是本分鐘的第 15 秒：本分鐘 40、上分鐘 80 → 40 + 80 × 45/60 = 100
```

- 記憶體固定，誤差通常很小，假設上一分鐘的請求是平均分布的

**Token bucket**：桶子最多裝 C 個 token，每秒補充 R 個。每個請求拿走一個 token，桶子空了就拒絕。

- 允許**突發**：桶子滿的時候可以連續通過 C 個請求，之後依每秒 R 個的速率通過
- 每個 key 只需要兩個值：目前的 token 數、上次補充的時間
- 不同的請求可以有不同的成本：一般查詢拿 1 個 token，全文搜尋拿 5 個

**Leaky bucket**：請求進入一個佇列，以固定的速率流出。輸出非常平滑，但請求要排隊等待，適合控制「我送往下游」的速率，而不是對使用者的 API。

| 演算法 | 突發 | 精確度 | 每個 key 的狀態 | 適合 |
|---|---|---|---|---|
| 固定視窗 | 交界處可達 2 倍 | 低 | 1 個計數器 | 粗略的配額，例如每日上限 |
| 滑動視窗紀錄 | 無 | 精確 | 與請求數成正比 | 上限很小的場景，例如每小時 5 次密碼重設 |
| 滑動視窗計數 | 很小 | 近似 | 2 個計數器 | 一般的 API 限流 |
| Token bucket | 可控（容量 C） | 精確 | 2 個值 | 允許合理突發的 API 限流、成本加權 |
| Leaky bucket | 無，排隊 | 精確 | 佇列 | 控制送往下游的速率 |

### 用什麼當 key

限流的 key 決定了「誰」被限制：

| Key | 優點 | 問題 |
|---|---|---|
| IP 位址 | 不需要登入就能用 | 公司、學校、行動網路的大量使用者共用一個 IP（電信業者級 NAT）；攻擊者可以輪換大量 IP；IPv6 讓每個人都能有大量位址 |
| 使用者 ID | 精確對應到人 | 只能用在登入之後 |
| API key 或租戶 | 適合合作夥伴與付費方案 | key 外洩時，攻擊者用的是別人的額度 |
| 端點 | 保護特別昂貴的 API | 不區分呼叫者時，一個人就能用光所有人的額度 |

實務上會組合使用：未登入的請求依 IP（IPv6 依 /64 前綴）限流，登入後依使用者，合作夥伴依 API key，昂貴的端點再加上自己的上限。

### 分散式限流

多台伺服器要共用計數，最常見的做法是放在 Redis：

- **讀取、計算、寫回必須是原子的**：先 `GET` 再 `SET`，兩台伺服器同時讀到「還剩 1 個」，就會都放行。用 Lua script 讓整段邏輯在 Redis 裡一次執行完
- **時間以 Redis 為準**：每台應用伺服器的時鐘有誤差，script 裡用 Redis 的 `TIME`
- **每個請求多一次 Redis 往返**：同一個可用區內通常不到 1 毫秒，但 Redis 本身成為所有請求的依賴
- **熱點 key**：「整個 API 每秒最多 10,000 個請求」這種全域限制只有一個 key，落在 Redis Cluster 的同一個分片上。可以拆成多個子 key，或在每台伺服器上用本機的近似限制

**Redis 故障時怎麼辦**，要依限流的目的決定：

- **防止濫用、保護安全**（登入、簡訊驗證碼、密碼重設）：拒絕請求（fail closed）。放行等於讓攻擊者只要先打掛 Redis 就能無限嘗試
- **公平分配與容量保護**（一般 API）：改用每台伺服器本機的保守限制，而不是完全放行或完全拒絕

### 429 與回應 header

被限流的請求回傳 `429 Too Many Requests`，並用 `Retry-After` 告訴用戶端多久之後再試（RFC 6585）。良好的用戶端會依此等待，而不是立即重試（[Timeout 與 Retry 篇](/post/systemdesign/timeout-retry-backoff/)）。

剩餘額度要不要告訴用戶端？很多 API 使用 `X-RateLimit-Remaining` 這類非標準的 header。IETF 的 httpapi 工作小組正在制定標準的 `RateLimit` 與 `RateLimit-Policy` header，到 2026 年 5 月的 draft-11 仍是草案。對合作夥伴的 API，公開額度能幫助他們調整呼叫速度；對防止濫用的限流，就不要告訴攻擊者還剩幾次。

### 限流與降載

兩者都會拒絕請求，但目的不同：

| | Rate limiting（限流） | Load shedding（降載） |
|---|---|---|
| 依據 | 呼叫者用了多少額度 | 伺服器目前的負載 |
| 目的 | 公平：一個呼叫者不能影響其他人 | 自保：總負載超過容量時，丟掉一部分請求 |
| 正常時 | 守規矩的呼叫者不會被拒絕 | 不會發生 |
| 過載時 | 所有人都在額度內，系統仍可能過載 | 依優先順序丟棄 |

所有使用者都在自己的額度內，加總起來仍然可能超過系統的容量，所以只有限流不夠。降載依**優先順序**丟棄：先丟推薦、分析這類可以不要的請求，保留報名與付款。判斷依據可以是並行請求數、佇列等待時間或延遲，而不是 CPU 使用率這種反應較慢的指標。

### 搶購場景：排隊而不是拒絕

熱門講座開放報名時，大量真人使用者在同一秒湧入。對他們回 429，他們會不斷重新整理，負載反而更高。更好的做法是**虛擬等候室**：

- 使用者先進入等候頁面，取得一個有簽章、不可偽造的排隊序號
- 系統依報名服務能承受的速率，每秒放行固定人數進入報名頁面
- 搭配人機驗證（例如 [Cloudflare Turnstile](/post/security/cloudflare-turnstile-vue-spring-boot/)）過濾自動化程式

限流保護的是系統，等候室保護的是使用者體驗與公平性。

## 方案比較

| 位置 | 做法 | 適合 |
|---|---|---|
| CDN、WAF | 依 IP、地區、請求特徵限制 | 擋掉大量的惡意流量，不讓它進到機房 |
| API gateway | 依 API key、方案等級限制 | 對外 API 的配額管理 |
| 應用程式 | 依使用者、業務規則、請求成本限制 | 需要理解業務語意的限制，例如「每人每場講座最多報名 3 次」 |
| 呼叫外部服務的用戶端 | 控制自己送出的速率 | 遵守簡訊、email、金流服務商的配額 |

這些位置不是擇一，而是分層：外層擋掉明顯的濫用，內層處理業務上的公平性。

## Java 落地

### 1. Token bucket 的 Lua script

```lua
-- src/main/resources/ratelimit/token-bucket.lua
-- KEYS[1]：bucket 的 key
-- ARGV[1]：容量  ARGV[2]：每秒補充的 token 數  ARGV[3]：這次請求的成本
-- 回傳 0 代表允許；大於 0 代表拒絕，數值是建議等待的毫秒數
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])

local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(bucket[1]) or capacity
local ts = tonumber(bucket[2]) or now

tokens = math.min(capacity, tokens + math.max(0, now - ts) * rate / 1000)

local wait = 0
if tokens >= cost then
    tokens = tokens - cost
else
    wait = math.ceil((cost - tokens) * 1000 / rate)
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity * 1000 / rate) + 1000)
return wait
```

- 整段 script 在 Redis 裡原子執行，不會有兩台伺服器同時讀到同一個值的問題
- 時間用 Redis 的 `TIME`，不依賴應用伺服器的時鐘。Redis 7 起 script 一律以「效果」複寫到 replica，在 script 裡呼叫 `TIME` 不會造成主從不一致
- `PEXPIRE` 設成「從空到滿所需的時間」再多一秒：桶子已經滿了的 key 沒有保存的必要，閒置的使用者不會一直佔用記憶體

### 2. 呼叫 script，並處理 Redis 故障

```java
public record RateLimitPolicy(String name, int capacity, double refillPerSecond, boolean failClosed) {
}

@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private final StringRedisTemplate redis;
    private final RedisScript<Long> tokenBucket =
            RedisScript.of(new ClassPathResource("ratelimit/token-bucket.lua"), Long.class);
    private final Map<String, LocalTokenBucket> localFallbacks = new ConcurrentHashMap<>();

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** 回傳 0 代表允許；大於 0 代表拒絕，數值是建議等待的毫秒數。 */
    public long tryAcquire(RateLimitPolicy policy, String subject, int cost) {
        String key = "ratelimit:" + policy.name() + ":" + subject;
        try {
            Long wait = redis.execute(tokenBucket, List.of(key),
                    String.valueOf(policy.capacity()), String.valueOf(policy.refillPerSecond()), String.valueOf(cost));
            return wait == null ? 0 : wait;
        } catch (DataAccessException redisDown) {
            log.warn("rate limiter unavailable, policy={}", policy.name());
            if (policy.failClosed()) {
                return 1_000;                                       // 安全相關的限流：拒絕
            }
            // 一般的限流：改用本機的保守限制（整台伺服器共用一個桶子，不區分使用者）
            LocalTokenBucket local = localFallbacks.computeIfAbsent(policy.name(),
                    name -> new LocalTokenBucket(policy.capacity(), policy.refillPerSecond()));
            return local.tryAcquire(cost) ? 0 : 1_000;
        }
    }
}

final class LocalTokenBucket {

    private final double capacity;
    private final double refillPerNano;
    private double tokens;
    private long last = System.nanoTime();

    LocalTokenBucket(double capacity, double refillPerSecond) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000.0;
    }

    synchronized boolean tryAcquire(int cost) {
        long now = System.nanoTime();
        tokens = Math.min(capacity, tokens + (now - last) * refillPerNano);
        last = now;
        if (tokens < cost) {
            return false;
        }
        tokens -= cost;
        return true;
    }
}
```

本機的備援桶子用的是「單一使用者」的額度，但整台伺服器共用，所以非常保守：Redis 故障期間，這個功能的總流量大幅下降，但不會完全停擺，也不會完全不設防。

### 3. 套用到報名 API

```java
@Component
public class RegistrationRateLimitInterceptor implements HandlerInterceptor {

    // 每人最多連續 5 次，之後每 10 秒 1 次
    private static final RateLimitPolicy PER_MEMBER = new RateLimitPolicy("registration", 5, 0.1, false);

    private final RateLimiter rateLimiter;

    public RegistrationRateLimitInterceptor(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // 登入後依使用者限流；未登入的請求在 Spring Security 那一層就被擋下，不會走到這裡
        long waitMillis = rateLimiter.tryAcquire(PER_MEMBER, auth.getName(), 1);
        if (waitMillis == 0) {
            return true;
        }
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf((waitMillis + 999) / 1000));
        return false;
    }
}

@Configuration
public class RateLimitWebConfig implements WebMvcConfigurer {

    private final RegistrationRateLimitInterceptor registrationLimit;

    public RateLimitWebConfig(RegistrationRateLimitInterceptor registrationLimit) {
        this.registrationLimit = registrationLimit;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(registrationLimit).addPathPatterns("/v1/registrations/**");
    }
}
```

- 這個限流的目的是公平性，不是防止暴力破解，所以 `failClosed` 是 `false`。登入、簡訊驗證碼的 policy 則設成 `true`
- 依 IP 限流時，要先確認拿到的是真正的用戶端 IP，而不是用戶端可以自己填的 `X-Forwarded-For`（[Load Balancing 篇](/post/systemdesign/load-balancing/)）

> 以上程式碼依 Spring Framework 7、Spring Data Redis 與 Redis 官方文件撰寫，沒有實際編譯與執行。

## 踩坑與 Gotchas

- **每台伺服器各自計數**：實際的限額是設定值乘以伺服器數量，而且隨自動擴充變化
- **固定視窗的交界**：上限 100，2 秒內通過 200
- **先讀再寫**：沒有原子性，並行的請求都通過了檢查
- **用應用伺服器的時鐘**：時鐘不一致時，補充 token 的速度在不同伺服器上不一樣
- **沒有 `Retry-After`**：用戶端不知道要等多久，只好立刻重試，被拒絕的請求反而變多
- **只有限流，沒有降載**：每個人都在額度內，系統仍然過載
- **限流擋到自己人**：健康檢查、內部批次、webhook 回呼被一起限流。內部流量用不同的 policy 或路徑
- **限流的設定沒有文件**：合作夥伴不知道上限，直到上線那天才大量收到 429
- **全域限制的熱點 key**：一個 Redis key 承擔所有請求，那個分片成為瓶頸
- **限流設定的變更沒有灰度**：把上限從 1,000 誤改成 100，所有人同時被擋。限流設定的變更和程式部署一樣要分批

### 資安相關

- **只依 IP 限流擋不住、也擋錯人**：攻擊者用殭屍網路或代理服務輪換數萬個 IP，每個 IP 都在額度內；同時，同一個學校或電信業者 NAT 後面的大量真人使用者共用一個 IP 而被誤擋。依 IP 限流要搭配帳號、裝置與 IP 前綴，對可疑的流量改用人機驗證，而不是直接封鎖
- **偽造的 `X-Forwarded-For`**：直接信任這個 header，攻擊者每個請求填不同的 IP 就能繞過限流。只信任來自已知代理的 header
- **Credential stuffing**：登入要同時限制每個帳號、每個 IP、以及全站的失敗次數。只限制每個帳號，攻擊者會對每個帳號只試一兩次；只限制每個 IP，攻擊者會分散 IP
- **帳號鎖定也能被濫用**：失敗 5 次就鎖定帳號 30 分鐘，攻擊者只要故意輸錯，就能讓受害者無法登入。改用逐漸增加的延遲與人機驗證，而不是硬性鎖定
- **簡訊與 email 的成本攻擊**：簡訊驗證碼 API 被用來大量發送到付費號碼（SMS pumping），成本由你負擔。限制每個電話號碼、每個 IP、每個國碼的發送次數，並設定每日的總預算上限
- **限流的 key 數量也要限制**：如果未經驗證的請求可以決定 key（例如用請求裡的任意 ID 當 key），攻擊者送出大量不同的 ID，就能塞滿 Redis 的記憶體。未登入的請求只用 IP 前綴當 key，所有 key 都要有 TTL
- **安全相關的限流要 fail closed**：Redis 故障時，登入、驗證碼、密碼重設的限流要拒絕，而不是放行
- **不要洩漏防護的細節**：對登入這類防止濫用的限流，不要回傳剩餘次數；帳號存在與否也不應該影響限流的回應，否則限流本身就成了列舉帳號的管道
- **昂貴的請求要加權**：GraphQL 查詢依複雜度計算成本（[REST、gRPC 與 GraphQL 篇](/post/systemdesign/rest-grpc-graphql/)），全文搜尋與匯出拿更多 token，否則攻擊者用少量的請求就能耗盡資源

## 何時用／何時別用

- **一定要做**：對外 API、登入、驗證碼、密碼重設、任何會產生外部成本的操作（簡訊、email、第三方付費 API）
- **依業務決定**：方案等級的配額（免費方案每日 1,000 次）、搶購時的等候室
- **別用限流取代容量規劃**：正常的使用者在正常的流量下被 429，代表容量不足，不是限流的問題。限流擋的是異常與濫用，降載處理的是過載

## 參考資料

- RFC 6585, "Additional HTTP Status Codes", Section 4 "429 Too Many Requests"：<https://www.rfc-editor.org/rfc/rfc6585#section-4>
- IETF draft-ietf-httpapi-ratelimit-headers-11, "RateLimit header fields for HTTP", May 2026：<https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/>
- Redis Documentation — Scripting with Lua（Script replication）：<https://redis.io/docs/latest/develop/programmability/eval-intro/>
- Spring Data Redis Reference — Scripting：<https://docs.spring.io/spring-data/redis/reference/redis/scripting.html>
- AWS Builders' Library — Fairness in multi-tenant systems：<https://aws.amazon.com/builders-library/fairness-in-multi-tenant-systems/>
- AWS Builders' Library — Using load shedding to avoid overload：<https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/>
- OWASP — Credential Stuffing Prevention Cheat Sheet：<https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html>
- OWASP API Security Top 10 2023 — API4:2023 Unrestricted Resource Consumption：<https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
