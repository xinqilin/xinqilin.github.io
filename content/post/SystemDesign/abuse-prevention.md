---
title: "濫用防護：對付會調整策略的對手，讓黃牛、撞庫與假帳號無利可圖"
date: 2026-11-23
draft: false
author: Bill.Lin
description: "System Design 系列 Part 8：面對黃牛、撞庫、假帳號與簡訊灌量這類會調整策略的對手，說明多維度限流、依風險加強驗證、抽籤等流程設計，以及偵測與應變的循環"
categories: ["SystemDesign"]
tags: ["System Design", "Bot Protection", "Fraud Prevention", "Rate Limiting", "OWASP", "Security"]
---

> **System Design 系列** Part 8-5｜上一篇：[傳輸與資料加密及 Secrets 管理](/post/systemdesign/encryption-secrets/)｜下一篇：[URL Shortener](/post/systemdesign/url-shortener/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

[系列導讀](/post/systemdesign/system-design-thinking/)的年度講座：3,000 個名額、5 萬人在線上等、開放後 30 秒內湧進約 2.4 萬次報名請求。去年辦完之後，營運團隊整理出這些問題：

- 名額在 4 秒內全部報滿，社群上隨即出現加價轉售的票券。報名紀錄顯示，大量帳號在開放前一週才註冊，用同一組信用卡付款
- 開放前一小時，登入 API 的失敗率從平常的 3% 升到 60%，有 200 個帳號被盜用
- 新會員的首購折扣碼被大量領取，領取的帳號大多沒有任何後續活動
- 手機驗證碼的簡訊費用在一個晚上暴增，收件號碼集中在幾個國外的號碼區段
- 講者名單與講座內容被另一個網站完整複製

```diagram
title: 每個請求都合法，問題卻接連發生
row: BOT 黃牛帳號 | API 講座平台 | SEAT 3,000 個名額
row: ATK 撞庫程式 | SCR 爬蟲 | SMS 簡訊供應商
step: 4 秒報滿
  名額在 4 秒內全部報滿，社群上隨即出現加價轉售的票券。大量帳號在開放前一週才註冊，用同一組信用卡付款。
BOT => API: 大量新帳號 [danger]
API => SEAT: 4 秒內報滿 [danger]
note SEAT: 社群上加價轉售 [danger]
step: 撞庫
  開放前一小時，登入 API 的失敗率從平常的 3% 升到 60%，有 200 個帳號被盜用。
ATK => API: 失敗率 3% → 60% [danger]
note ATK: 200 個帳號被盜用 [danger]
step: 折扣碼被領光
  新會員的首購折扣碼被大量領取，領取的帳號大多沒有任何後續活動。
BOT => API: 領首購折扣 [danger]
note BOT: 領完就沒有活動 [danger]
step: 簡訊費暴增
  手機驗證碼的簡訊費在一個晚上暴增，收件號碼集中在幾個國外的號碼區段。
API => SMS: 發到國外號碼段 [danger]
note SMS: 一晚費用暴增 [danger]
step: 內容被複製
  講者名單與講座內容被另一個網站完整複製。
SCR => API: 講者與講座內容 [danger]
note SCR: 被完整複製 [danger]
step: 每個請求都合法
  每個請求都有帳號、有登入、格式正確、在限流範圍內。對手會調整策略：你擋下一種做法，對方就換另一種。
note API: 有帳號、有登入、在限流內
```

每個請求本身都是「合法」的：有帳號、有登入、格式正確、在限流範圍內。這些問題對應到 OWASP API Security Top 10 的 **API6 Unrestricted Access to Sensitive Business Flows**，以及 OWASP「Automated Threats to Web Applications」整理的自動化威脅：黃牛（Scalping）、囤積庫存（Denial of Inventory）、撞庫（Credential Stuffing）、大量建立帳號（Account Creation）、爬取內容（Scraping）。

和 [Rate Limiting 篇](/post/systemdesign/rate-limiting/)的差別是：限流是為了保護**容量**，對象是流量；濫用防護面對的是**會調整策略的對手**，對象是利益。你擋下一種做法，對方會換另一種。

## 最簡單的做法與它的極限

**依 IP 限流，所有表單都加上驗證碼**

- **IP 不再代表一個人**：住宅代理網路可以提供數百萬個真實家用 IP，每個 IP 只送幾個請求；反過來，企業與行動網路的 NAT 讓上千個正常使用者共用一個 IP，依 IP 限流先擋到的是他們
- **驗證碼的成本對攻擊者很低**：公開的人工解題服務，報價大約是每一千次數美元以內（粗估，依服務而定）。一張講座票轉售能賺上千元，解一次驗證碼的成本可以忽略
- **所有人都付出代價**：每個操作都要驗證碼，正常使用者的轉換率下降，使用輔助工具的使用者可能完全無法使用

## 核心機制

### 從經濟學思考：讓濫用無利可圖

攻擊者也在算成本。濫用防護的目標不是「完全擋住」，而是讓**攻擊的成本高於收益**：

| 攻擊 | 攻擊者的收益 | 提高成本的方法 |
|---|---|---|
| 黃牛 | 每張票的轉售價差 | 實名制與不可轉讓；抽籤取代先搶先贏 |
| 撞庫 | 被盜帳號的價值（儲值金、個資、可轉售的票） | 外洩密碼檢查、MFA、passkey |
| 假帳號領折扣 | 每個帳號的折扣金額 | 折扣綁定付款工具或實名，而不是帳號 |
| 簡訊灌量 | 與電信業者分潤的簡訊費用 | 每個號碼、每個國碼的發送上限 |
| 爬取內容 | 複製來的內容與名單 | 詳細資料需要登入；分頁上限；只回傳需要的欄位 |

很多時候，**修改業務流程**比任何偵測技術都有效。

### 業務流程是最強的防線

**先搶先贏本身就獎勵速度最快的人**，而速度最快的永遠是機器人。熱門講座改成**抽籤**：

- 開放登記 24 小時，登記期間任何時刻送出都一樣；截止後隨機抽出 3,000 名，中籤者在期限內付款
- 機器人的速度優勢消失了。攻擊者只能靠**更多帳號**提高中籤率，所以問題變成「一個人只能有一個有效的登記」：以驗證過的手機號碼、付款工具或實名資料去重
- 開放瞬間的 2.4 萬次請求也消失了，負載變成 24 小時內平均分散（[Napkin Math 篇](/post/systemdesign/napkin-math/)的尖峰估算完全改變）

不適合抽籤的場合，還有其他流程上的做法：

- **虛擬等候室**（[Rate Limiting 篇](/post/systemdesign/rate-limiting/)）：開放前就在等候的人，進場順序隨機排列，而不是依到達的毫秒數
- **預留名額的上限**：每個帳號同時只能預留一個名額，預留期限 10 分鐘，超過期限自動釋放（[Saga 篇](/post/systemdesign/saga-outbox/)的逾時）。囤積名額不付款的做法就失效了
- **實名與不可轉讓**：票券綁定報名者，入場時核對。轉售的票無法使用，黃牛的收益就消失了

### 多維度的訊號，而不是只看 IP

| 維度 | 訊號 | 注意 |
|---|---|---|
| 網路 | IP 信譽、是否來自資料中心或已知的代理、IPv6 的 /64 網段 | IPv6 使用者通常擁有整個 /64，攻擊者可以在裡面無限更換位址，所以 IPv6 要以 /64 為單位計數 |
| 用戶端 | 瀏覽器挑戰（例如 [Cloudflare Turnstile](/post/security/cloudflare-turnstile-vue-spring-boot/)）、App 的裝置驗證 | 可以被繞過，但能提高大量自動化的成本 |
| 帳號 | 註冊時間、是否驗證過、過去的行為、是否啟用 MFA | 新帳號在熱門活動前大量出現，本身就是訊號 |
| 行為 | 每分鐘的操作次數、操作順序（直接呼叫報名 API，沒有先瀏覽講座頁） | 正常使用者的行為也很多樣，門檻要依實際資料調整 |
| 業務 | 同一張卡、同一個手機號碼、同一個收件地址對應多個帳號 | 最難偽造，因為每一個都要花錢取得 |

單一訊號都能被繞過或會誤判，組合起來才可靠。限流的鍵也一樣，要同時依**帳號、裝置、網段、付款工具、目標資源**計數，並有全域的上限。

### 依風險加強驗證，而不是對所有人設關卡

把訊號組合成一個風險判斷，依風險決定摩擦的程度：

| 風險 | 處理 |
|---|---|
| 低（老帳號、已驗證、行為正常） | 直接放行 |
| 中（新帳號、資料中心的 IP、操作速度偏快） | 要求瀏覽器挑戰或驗證碼 |
| 高（已知的惡意 IP、同一張卡已用於多個帳號） | 要求 MFA 或實名驗證；或直接拒絕並記錄 |

大部分的正常使用者完全感受不到防護的存在，摩擦集中在可疑的請求上。

### 撞庫：不要用鎖帳號來防

撞庫的特徵是**每個帳號只試一兩次**，所以「同一個帳號失敗 5 次就鎖定」幾乎擋不到；反過來，攻擊者可以故意對受害者的帳號輸錯密碼，讓他被鎖住，這變成了對使用者的阻斷服務。

比較有效的做法：

- **看整體**：全站的登入失敗率、同一個裝置或網段嘗試的不同帳號數，而不是單一帳號的失敗次數
- **外洩密碼檢查**：登入或設定密碼時，檢查密碼是否出現在已知的外洩資料裡。Have I Been Pwned 的 Pwned Passwords API 使用 k-anonymity：只送出密碼 SHA-1 雜湊的前 5 個字元，在本機比對回傳的清單，服務端不會知道完整的雜湊
- **成功登入也要評估**：撞庫成功的那一次，帳密是正確的。新裝置、新地區的成功登入要求加強驗證，並通知使用者
- **根本的解法**：MFA 與 passkey（[身分驗證篇](/post/systemdesign/authentication-session-token-oidc/)）

### 簡訊灌量

每次「寄送手機驗證碼」都要花錢。攻擊者利用註冊或登入的簡訊驗證功能，對特定國家的高費率號碼大量發送，再從電信業者分得收益。粗略估算：每則國際簡訊幾元新台幣，一個晚上觸發 10 萬次，就是數十萬元的帳單，而且完全不會出現在一般的錯誤監控裡。

防護方式：

- 每個號碼、每個號碼區段、每個國碼都有發送上限，並有全域每小時的預算，超過時告警並自動停止
- 只對有業務需求的國家開放簡訊發送
- 發送簡訊前先通過瀏覽器挑戰，並要求先完成其他步驟（例如 email 驗證）
- 能用 email、passkey 或驗證 App 的地方，不用簡訊

### 偵測與應變是一個循環

濫用防護沒有「做完」的一天。需要的是一個能快速調整的循環：

1. **監控業務指標**：每場講座每分鐘的報名數、每小時的新帳號數、每個國碼的簡訊數、折扣碼的領取速度、全站登入失敗率（[Observability 篇](/post/systemdesign/observability/)）
2. **異常時告警**：和平常的基準比較，而不只是固定的門檻
3. **可以立即調整的開關**：不需要部署就能提高某個流程的摩擦（例如對所有新帳號啟用挑戰），或暫停某個國碼的簡訊
4. **事後分析**：把確認過的濫用案例回饋到規則與門檻

應變時要考慮**誤判的代價**：直接封鎖會讓攻擊者立刻知道並調整，也會誤傷正常使用者；只降低可疑帳號的權限（例如報名進入人工審核），可以爭取時間。被誤判的使用者要有申訴的管道。

### 隱私

裝置指紋、行為紀錄、IP 位置都是個人資料。只收集真正用於防護的訊號、設定保存期限、在隱私權政策中說明，而且這些資料本身也要依[加密篇](/post/systemdesign/encryption-secrets/)的原則保護。

## 方案比較

| 方案 | 擋得住 | 擋不住 | 代價 |
|---|---|---|---|
| 依 IP 限流 | 單一來源的大量請求 | 住宅代理、分散的殭屍網路 | NAT 後面的正常使用者被誤擋 |
| 驗證碼與瀏覽器挑戰 | 低成本的大量自動化 | 人工解題服務、真人操作 | 使用者的摩擦；無障礙的問題 |
| 依風險加強驗證 | 大部分自動化，摩擦集中在可疑請求 | 模仿正常行為的進階攻擊 | 需要收集訊號、調整模型與門檻 |
| 流程設計（抽籤、實名、上限） | 黃牛、囤積這類依賴速度與數量的攻擊 | 偽造身分的成本低時效果有限 | 改變使用者體驗，需要業務單位同意 |
| 商用的 bot 管理服務 | 已知的機器人特徵、大規模的訊號 | 針對你的業務特製的攻擊 | 費用；依賴第三方；隱私的考量 |

講座平台的選擇：

- **熱門講座改為抽籤**，以驗證過的手機號碼去重，中籤後 48 小時內付款，票券實名
- **一般講座維持先搶先贏**，但每個帳號同時只能預留一個名額，預留 10 分鐘
- **限流**：依帳號、裝置、IPv4 位址與 IPv6 的 /64 網段、付款工具分別計數
- **風險判斷**：新帳號、資料中心 IP、異常速度時要求 Turnstile；已知的惡意來源直接拒絕
- **簡訊**：只開放台灣門號，每個號碼每天 5 則，全域每小時有預算上限
- **登入**：外洩密碼檢查、新裝置登入要求 MFA、監控全站失敗率

## Java 落地

### 1. 多維度的限流鍵

```java
public final class AbuseKeys {

    private AbuseKeys() {
    }

    /** IPv4 用完整位址；IPv6 取前 64 位元，因為使用者通常擁有整個 /64。 */
    public static String network(InetAddress address) {
        byte[] ip = address.getAddress();
        if (ip.length == 4) {
            return "ip4:" + address.getHostAddress();
        }
        return "ip6:" + HexFormat.of().formatHex(ip, 0, 8) + "/64";
    }

    /** 報名一個講座時要檢查的所有計數器，任何一個超過就拒絕或要求加強驗證。 */
    public static List<RateLimitRule> forRegistration(long memberId, String deviceId, InetAddress ip, long lectureId) {
        return List.of(
                new RateLimitRule("reg:member:" + memberId, 5, Duration.ofMinutes(1)),
                new RateLimitRule("reg:device:" + deviceId, 10, Duration.ofMinutes(1)),
                new RateLimitRule("reg:net:" + network(ip), 30, Duration.ofMinutes(1)),
                new RateLimitRule("reg:lecture:" + lectureId, 2_000, Duration.ofSeconds(1)));    // 保護單一講座的熱點
    }
}
```

計數器的實作沿用 [Rate Limiting 篇](/post/systemdesign/rate-limiting/)的 Redis token bucket。`ip` 必須是可信任的來源位址：在負載平衡器之後，要從受信任的代理設定取得，而不是直接相信用戶端送來的 `X-Forwarded-For`。

### 2. 依風險決定是否要求挑戰

```java
public enum RiskDecision { ALLOW, CHALLENGE, DENY }

@Component
public class RegistrationRiskAssessor {

    private final IpReputation ipReputation;
    private final MemberProfileRepository members;

    public RegistrationRiskAssessor(IpReputation ipReputation, MemberProfileRepository members) {
        this.ipReputation = ipReputation;
        this.members = members;
    }

    public RiskDecision assess(long memberId, InetAddress ip, Duration sinceLecturePageView) {
        if (ipReputation.isKnownMalicious(ip)) {
            return RiskDecision.DENY;
        }
        MemberProfile member = members.findById(memberId).orElseThrow();
        int score = 0;
        if (member.createdAt().isAfter(Instant.now().minus(Duration.ofDays(7)))) score += 2;
        if (!member.phoneVerified()) score += 2;
        if (ipReputation.isDatacenter(ip)) score += 2;
        if (sinceLecturePageView.compareTo(Duration.ofSeconds(2)) < 0) score += 1;   // 看到頁面不到 2 秒就送出
        return score >= 3 ? RiskDecision.CHALLENGE : RiskDecision.ALLOW;
    }
}

@RestController
@RequestMapping("/v1/lectures/{lectureId}/entries")
public class LotteryEntryController {

    private final RegistrationRiskAssessor risk;
    private final TurnstileVerifier turnstile;
    private final LotteryService lottery;

    public LotteryEntryController(RegistrationRiskAssessor risk, TurnstileVerifier turnstile, LotteryService lottery) {
        this.risk = risk;
        this.turnstile = turnstile;
        this.lottery = lottery;
    }

    @PostMapping
    public ResponseEntity<Void> enter(@PathVariable long lectureId, @RequestBody EntryRequest request,
                                      @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
        long memberId = CurrentMember.from(jwt).memberId();
        InetAddress ip = InetAddresses.trustedClientAddress(http);
        switch (risk.assess(memberId, ip, request.sinceLecturePageView())) {
            case DENY -> throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            case CHALLENGE -> {
                if (request.turnstileToken() == null || !turnstile.verify(request.turnstileToken(), ip, "lottery-entry")) {
                    // 告訴前端顯示挑戰，而不是直接失敗
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).header("X-Challenge-Required", "turnstile").build();
                }
            }
            case ALLOW -> { }
        }
        lottery.enter(lectureId, memberId);
        return ResponseEntity.accepted().build();
    }
}
```

- `sinceLecturePageView` 來自用戶端，可以被偽造，所以只是加分的訊號之一，不能單獨決定放行
- Turnstile 的伺服器端驗證（`action`、hostname、防重放）見 [Cloudflare Turnstile 實戰](/post/security/cloudflare-turnstile-vue-spring-boot/)
- 分數與門檻要依實際資料調整；先以「只記錄、不攔截」的模式上線，觀察誤判率

### 3. 抽籤：一個驗證過的身分只能登記一次

```sql
CREATE TABLE lottery_entry (
    lecture_id     BIGINT       NOT NULL,
    member_id      BIGINT       NOT NULL,
    verified_phone BINARY(32)   NOT NULL,          -- 手機號碼的 HMAC（加密篇的盲索引）
    created_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    result         VARCHAR(10)  NULL,              -- WON、LOST，抽籤後填入
    PRIMARY KEY (lecture_id, member_id),
    UNIQUE KEY uk_lecture_phone (lecture_id, verified_phone)
);
```

```java
@Service
public class LotteryDraw {

    private final JdbcClient jdbc;

    public LotteryDraw(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** 登記截止後由批次工作執行一次。 */
    @Transactional
    public void draw(long lectureId, int seats) {
        List<Long> entrants = jdbc.sql("SELECT member_id FROM lottery_entry WHERE lecture_id = :id AND result IS NULL")
                .param("id", lectureId)
                .query(Long.class)
                .list();
        Collections.shuffle(entrants, new SecureRandom());          // 結果不可預測，也不受登記先後影響
        List<Long> winners = entrants.subList(0, Math.min(seats, entrants.size()));
        jdbc.sql("UPDATE lottery_entry SET result = IF(member_id IN (:winners), 'WON', 'LOST') WHERE lecture_id = :id AND result IS NULL")
                .param("winners", winners.isEmpty() ? List.of(-1L) : winners)
                .param("id", lectureId)
                .update();
    }
}
```

- `uk_lecture_phone` 讓同一個驗證過的手機號碼只能登記一次，攻擊者要提高中籤率，就必須取得更多真實的門號
- 5 萬筆登記一次載入記憶體並打亂沒有問題；`IN` 清單有 3,000 個值，MySQL 可以處理，但更大的規模應該分批或使用暫存表
- 抽籤只執行一次，結果寫入後不能重抽；抽籤的執行與結果都要寫入稽核紀錄，避免內部人員操縱

> 以上程式碼依 Spring Boot 4.1、Spring Security 7.1 與 Java 標準函式庫的官方文件撰寫，沒有實際編譯與執行。`IpReputation`、`TurnstileVerifier`、`InetAddresses.trustedClientAddress` 是示意的元件。

## 踩坑與 Gotchas

- **只依 IP 判斷**：擋到 NAT 後面的正常使用者，擋不到住宅代理
- **相信 `X-Forwarded-For`**：攻擊者自己加上這個標頭，每個請求都像是來自不同的 IP。只採用受信任代理加上的值
- **鎖定帳號**：撞庫擋不到，反而讓攻擊者可以鎖住任何人
- **所有人都要驗證碼**：正常使用者的轉換率下降，攻擊者用解題服務繞過
- **防護只在前端**：挑戰只在網頁上執行，App 的 API 或舊版的 API 沒有（OWASP API9）
- **錯誤訊息洩漏規則**：「你在 1 分鐘內已嘗試 5 次」告訴攻擊者門檻是多少，他只要每分鐘試 4 次
- **沒有簡訊的預算上限**：帳單來了才發現
- **規則改了要部署**：攻擊正在進行，調整門檻卻要走完整的部署流程
- **忽略誤判**：封鎖的規則越來越多，客服開始收到正常使用者無法報名的抱怨，卻沒有人知道是哪一條規則

### 攻擊情境

| 攻擊 | 怎麼發生 | 防禦 |
|---|---|---|
| 黃牛（Scalping） | 機器人在開放瞬間搶光名額，再加價轉售 | 抽籤；實名與不可轉讓；以驗證過的身分去重 |
| 囤積庫存（Denial of Inventory） | 大量預留名額但不付款，讓其他人無法報名 | 每個帳號的預留上限；短的預留期限；需要付款才算成立 |
| 撞庫（Credential Stuffing） | 用外洩的帳密大量嘗試，每個帳號只試一兩次 | 全站失敗率監控；外洩密碼檢查；新裝置加強驗證；MFA 與 passkey |
| 大量建立帳號 | 用拋棄式 email 註冊大量帳號，領取新會員優惠 | 優惠綁定付款工具或驗證過的手機；新帳號的權限逐步開放 |
| 簡訊灌量 | 觸發驗證碼發送到高費率號碼 | 依號碼、號碼區段、國碼的上限；全域預算；限制開放的國家 |
| 爬取內容（Scraping） | 自動化地複製講座與講者資料 | 詳細資料需要登入；分頁與速率上限；只回傳需要的欄位 |
| 盜刷測試（Carding） | 用付款 API 小額測試大量盜來的信用卡 | 每張卡、每個帳號的付款失敗上限；啟用 3-D Secure；交給金流的風控 |
| 驗證碼農場 | 把挑戰轉給真人解題 | 不只依賴挑戰；結合帳號與業務訊號 |
| 偽造來源 IP | 送出假的 `X-Forwarded-For` | 只信任受信任代理加上的位址 |

## 何時用／何時別用

- **一定要做**：涉及金錢、稀缺資源（名額、折扣）、帳號安全與發送成本（簡訊、email）的流程，都要有濫用的威脅模型與監控
- **先改流程**：抽籤、實名、上限這些做法，常常比偵測技術便宜而且有效
- **用依風險加強驗證**：使用者量大、不能對所有人增加摩擦
- **用商用的 bot 管理服務**：攻擊者的規模與技術超過團隊能自行應對的程度，而且業務損失足以支付費用
- **別過度防護**：沒有稀缺資源、沒有金錢價值的流程（例如瀏覽公開的講座列表），基本的限流就夠了；過多的防護傷害的是正常使用者

## 參考資料

- OWASP Automated Threats to Web Applications（OAT Handbook）：<https://owasp.org/www-project-automated-threats-to-web-applications/>
- OWASP API Security Top 10 2023 — API6 Unrestricted Access to Sensitive Business Flows：<https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/>
- OWASP Cheat Sheet Series — Credential Stuffing Prevention：<https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html>
- Have I Been Pwned — Pwned Passwords API（k-anonymity range search）：<https://haveibeenpwned.com/API/v3#PwnedPasswords>
- NIST SP 800-63B Rev. 4 — Rate Limiting (Throttling)：<https://pages.nist.gov/800-63-4/sp800-63b/authenticators>
- Cloudflare Turnstile Documentation：<https://developers.cloudflare.com/turnstile/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
