---
title: "大規模系統的測試：端對端測試撐不起三十個服務"
date: 2026-11-23
draft: false
author: Bill.Lin
description: "System Design 系列 Part 10：三十個服務時端對端測試為何不夠用，說明以真實依賴做整合測試、服務與事件的契約測試、開放模型的負載測試與協同遺漏、故障注入與演練，以及授權的回歸測試"
categories: ["SystemDesign"]
tags: ["System Design", "Testing", "Testcontainers", "Contract Testing", "Load Testing", "Security"]
---

> **System Design 系列** Part 10-1｜上一篇：[分散式排程](/post/systemdesign/distributed-scheduler/)｜下一篇：[CI/CD 與部署策略](/post/systemdesign/cicd-deployment/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台拆成了約 30 個服務（[單體與微服務篇](/post/systemdesign/monolith-vs-microservices/)），每天部署十幾次。上一季的四起事故：

1. **事件欄位改名**：報名服務把事件裡的 `memberId` 改成 `attendeeId`，自己的測試全部通過。部署後，通知服務開始在每一則事件上拋出例外
2. **壓測通過，開賣時仍然崩潰**：壓測報告的 p99 是 300 毫秒，實際開賣時使用者等了 30 秒
3. **故障轉移從來沒有演練過**：Redis 的 primary 故障，應用程式的連線逾時設定是預設值，整個服務停擺 20 分鐘才恢復
4. **授權漏洞回來了**：一次重構把查詢裡的擁有者條件拿掉，BOLA 在正式環境存在了兩週（[授權篇](/post/systemdesign/authorization-owasp-api-top10/)）

```diagram
title: 上一季的四起事故
row: REG 報名服務 | K 報名事件 | N 通知服務
row: LT 壓測 | R Redis | U 使用者
step: 事件欄位改名
  報名服務把事件裡的 memberId 改成 attendeeId，自己的測試全部通過。部署後，通知服務開始在每一則事件上拋出例外。
REG -> K: 欄位改名
K -> N: 新格式的事件 [danger]
note REG: 自己的測試全過 [ok]
note N: 每則事件都拋例外 [danger]
step: 壓測通過，開賣崩潰
  壓測報告的 p99 是 300 毫秒，實際開賣時使用者等了 30 秒。
LT -> REG: 壓測
note LT: p99 300 ms [ok]
note U: 開賣時等了 30 秒 [danger]
step: 沒演練過的故障轉移
  Redis 的 primary 故障，應用程式的連線逾時是預設值，整個服務停擺 20 分鐘才恢復。
REG -> R: 預設逾時，一直等 [danger]
note R: primary 故障 [danger]
note REG: 停擺 20 分鐘 [danger]
step: 授權漏洞回來了
  一次重構把查詢裡的擁有者條件拿掉，BOLA 在正式環境存在了兩週。
U -> REG: 查別人的報名 [danger]
note REG: 擁有者條件被拿掉 [danger]
```

這四起事故，每一起在各自服務的單元測試裡都看不出來。

## 最簡單的做法與它的極限

建一個 staging 環境，部署所有服務，在上面跑完整的端對端測試，全部通過才上線：

- **慢**：30 個服務的完整流程測試要跑好幾個小時，每天十幾次部署只能排隊
- **不穩定**：任何一個服務、任何一次網路抖動都會讓測試失敗。失敗的原因常常和這次的變更無關，團隊開始習慣「再跑一次」
- **環境互相干擾**：多個團隊同時在同一個 staging 部署不同的版本，測試結果取決於當時其他服務是哪個版本
- **仍然不像正式環境**：資料量、流量、硬體都比正式環境小得多，事故 2 和 3 在這裡一樣測不出來

端對端測試有它的價值，但它不能是主要的安全網。

## 核心機制

### 每一種測試抓不同的問題

| 層級 | 抓得到的問題 | 執行時間 | 在哪裡執行 |
|---|---|---|---|
| 單元測試 | 領域邏輯、計算、狀態轉換 | 毫秒 | 每次提交 |
| 整合測試（真實的依賴） | SQL、交易、鎖、序列化、Redis script、Kafka 設定 | 秒到分鐘 | 每次提交 |
| 契約測試 | 服務之間、事件格式的不相容 | 秒 | 每次提交，提供者與消費者兩邊 |
| 負載測試 | 容量、延遲的轉折點、資源耗盡 | 小時 | 重大變更前、大型活動前 |
| 故障注入與演練 | 逾時、重試、熔斷、故障轉移的實際行為 | 分鐘到小時 | 整合測試裡；定期在 staging 與正式環境 |
| 少量的端對端冒煙測試 | 關鍵流程整條串起來 | 分鐘 | 部署之後 |
| 正式環境的金絲雀與合成監控 | 只在真實流量下出現的問題 | 持續 | 正式環境（[下一篇](/post/systemdesign/cicd-deployment/)） |

原則是**在能抓到問題的最便宜的層級抓它**。服務之間的相容性用契約測試，而不是靠端對端測試偶然碰到。

### 整合測試用真實的依賴

這個系列的實戰題用到了很多資料庫的特定行為：`FOR UPDATE SKIP LOCKED`（[分散式排程](/post/systemdesign/distributed-scheduler/)）、`LAST_INSERT_ID(expr)`（[聊天系統](/post/systemdesign/chat-system/)）、`ascii_bin` 定序（[URL Shortener](/post/systemdesign/url-shortener/)）、Redis 的 Lua script 與 hash tag（[秒殺搶票](/post/systemdesign/flash-sale-ticketing/)）。用 H2 這類記憶體資料庫模擬 MySQL，這些行為不是不支援，就是語意不同，測試通過不代表正式環境正確。

Testcontainers 在測試時啟動**和正式環境相同版本**的 MySQL、Redis、Kafka 容器。代價是速度：每個測試類別都重新啟動容器會非常慢，所以容器宣告成 Spring 的 bean，搭配 Spring 的測試 context 快取，讓多個測試類別共用同一組容器。

### 契約測試：不用把服務全部跑起來

事故 1 的根本原因是：**提供者不知道誰在用哪個欄位**。消費者驅動的契約測試（consumer-driven contract）把這件事明確化：

1. 消費者寫下自己的期望：「我呼叫 `GET /v1/lectures/42`，需要 `title` 和 `startsAt` 兩個欄位」，或者「我讀取 `registration-confirmed` 事件，需要 `memberId`」
2. 這份契約發布到共用的地方
3. 提供者的 CI 拿所有消費者的契約，驗證自己目前的程式碼仍然滿足。報名服務把 `memberId` 改名的那個提交，在提供者自己的 CI 就會失敗

常見的工具有 Pact 與 Spring Cloud Contract。事件的格式也可以用 schema registry 的相容性檢查：

| 相容性 | 保證 | 部署順序 |
|---|---|---|
| BACKWARD | 新的消費者讀得懂舊格式的事件 | 先升級消費者 |
| FORWARD | 舊的消費者讀得懂新格式的事件 | 先升級提供者 |
| FULL | 兩個方向都相容 | 任意順序 |

滾動部署與金絲雀部署期間，新舊版本**同時在線上**，所以要依部署順序選擇相容性。實務上最安全的規則是：只新增選擇性的欄位，不改名、不刪除，真的要改就分成多次部署（下一篇的 expand–contract）。

### 負載測試：開放模型與協同遺漏

事故 2 的壓測報告為什麼那麼好看？因為壓測工具使用**封閉模型**：固定 500 個虛擬使用者，每個收到回應之後才送出下一個請求。系統變慢時，工具送出的請求也跟著變少，壓力自動下降，而且排隊等待的時間根本沒有被量到。Gil Tene 把這個現象稱為**協同遺漏**（coordinated omission）：量測工具和被測系統「協同」地漏掉了最慢的那些時刻。

真實的使用者不會因為系統變慢就晚一點按下按鈕。開賣的流量是**開放模型**：請求依到達速率進來，和系統的回應速度無關。秒殺、新聞事件、整點的推播，都應該用開放模型測試。

負載測試的其他要點：

- **流量模型來自估算**：每一題開頭的規模估算（[粗估篇](/post/systemdesign/napkin-math/)）就是壓測的目標，包含讀寫比例、尖峰的形狀
- **資料量要接近**：資料表 1 萬列和 1 億列，索引是否放得進記憶體完全不同（[Index 與 B+Tree 篇](/post/systemdesign/index-btree/)）
- **找出轉折點**：逐步提高到達速率，直到延遲開始急劇上升。轉折點的位置，比「800 次/秒通過」更有用（[延遲與吞吐量篇](/post/systemdesign/latency-throughput/)）
- **持續時間**：短時間的尖峰測試之外，還要有數小時的耐久測試，才看得到連線洩漏、記憶體緩慢成長、日誌把磁碟塞滿

### 故障注入與演練

事故 3 的設定錯誤，在一個會注入延遲的整合測試裡就能發現。Toxiproxy 是一個可以程式化控制的 TCP 代理，放在應用程式和依賴之間，在測試裡加入延遲、斷線、頻寬限制，驗證[逾時與重試](/post/systemdesign/timeout-retry-backoff/)、[熔斷](/post/systemdesign/circuit-breaker-bulkhead/)的實際行為。

更大範圍的故障要靠**演練**：

- **混沌實驗**：先寫下假設（「Redis primary 故障時，報名 API 的錯誤率在 30 秒內回到 1% 以下」），控制影響範圍，設定中止條件，然後真的讓它故障
- **Game day**：團隊一起演練一個情境，包含告警是否響、值班的人是否知道怎麼處理、runbook 是否正確
- **還原演練**：定期從備份還原到一個獨立環境並驗證資料。沒有還原過的備份，不能算是備份（[備援與災難復原篇](/post/systemdesign/redundancy-failover-dr/)）

### 在正式環境測試

有些問題只在真實的流量、資料與設定下出現。正式環境的測試不是取代前面的測試，而是最後一層：

- **金絲雀部署**：新版本先接 1% 的流量，指標正常才擴大（下一篇）
- **合成監控**：每分鐘以測試帳號走一次關鍵流程（登入、瀏覽講座、報名一場免費的測試講座），失敗就告警
- **影子流量**：把正式的請求複製一份送到新版本，比較回應，但丟棄新版本的回應。有副作用的請求（付款、寄信）不能直接複製，要在新版本裡把外部呼叫替換成記錄

## 方案比較

| 決策 | 選擇 | 放棄的替代方案與原因 |
|---|---|---|
| 主要的安全網 | 單元 + 真實依賴的整合 + 契約測試 | 以端對端測試為主：慢、不穩定、環境互相干擾 |
| 整合測試的依賴 | Testcontainers，和正式環境相同版本 | 記憶體資料庫：語意不同；共用的測試資料庫：測試互相干擾 |
| 服務間的相容性 | 消費者驅動的契約、schema 相容性檢查 | 依賴文件與溝通：事故 1 就是這樣發生的 |
| 負載測試的模型 | 開放模型，依到達速率注入 | 封閉模型：系統變慢時壓力自動下降，結果過度樂觀 |
| 故障 | 整合測試注入延遲；定期演練 | 等真的發生：第一次執行的 runbook 一定有錯 |

## Java 落地

### 1. 共用的容器

```java
@TestConfiguration(proxyBeanMethods = false)
public class TestContainersConfig {

    @Bean
    @ServiceConnection
    MySQLContainer<?> mysql() {
        return new MySQLContainer<>("mysql:8.4");                              // 和正式環境相同的版本
    }

    @Bean
    @ServiceConnection
    KafkaContainer kafka() {
        return new KafkaContainer(DockerImageName.parse("apache/kafka:4.0.0"));
    }
}
```

- 容器是 bean，生命週期由 Spring 管理；匯入同一個設定類別的測試共用快取的 context，也就共用同一組容器
- `@ServiceConnection` 讓 Spring Boot 依容器的連線資訊產生 `ConnectionDetails`，不需要手動設定 JDBC URL 與 bootstrap servers
- `KafkaContainer` 是 `org.testcontainers.kafka` 套件下對應 `apache/kafka` 映像檔的新版類別

### 2. 用真實的 MySQL 驗證 `SKIP LOCKED`

[分散式排程](/post/systemdesign/distributed-scheduler/)的正確性依賴「多台機器同時取得任務時不會重疊」，這只能在真正的 MySQL 上驗證：

```java
@SpringBootTest
@Import({TestContainersConfig.class, TaskPollerConcurrencyTest.RecordingHandler.class})
class TaskPollerConcurrencyTest {

    @Autowired TaskPoller poller;
    @Autowired JdbcClient jdbc;
    @Autowired RecordingHandler recorder;

    @BeforeEach
    void cleanTasks() {
        jdbc.sql("DELETE FROM scheduled_task").update();              // 共用的容器裡可能有其他測試留下的任務
    }

    @Test
    void eachDueTaskRunsExactlyOnceAcrossConcurrentPollers() throws Exception {
        for (int i = 1; i <= 1_000; i++) {
            jdbc.sql("""
                            INSERT INTO scheduled_task (id, task_type, dedup_key, payload, run_at, status, created_by)
                            VALUES (:id, 'RECORDING', :key, '{}', NOW(3) - INTERVAL 1 SECOND, 'PENDING', 'test')
                            """)
                    .param("id", i).param("key", "test:" + i)
                    .update();
        }

        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {          // 模擬 4 台機器同時取得
            List<Callable<Void>> pollers = Collections.nCopies(4, () -> {
                poller.poll();
                return null;
            });
            for (Future<Void> f : pool.invokeAll(pollers)) {
                f.get();
            }
        }

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() ->
                assertThat(recorder.counts())
                        .hasSize(1_000)
                        .allSatisfy((id, count) -> assertThat(count).isEqualTo(1)));
    }

    @Component
    static class RecordingHandler implements TaskHandler {

        private final Map<Long, Integer> counts = new ConcurrentHashMap<>();

        @Override
        public String type() {
            return "RECORDING";
        }

        @Override
        public void handle(Task task) {
            counts.merge(task.id(), 1, Integer::sum);
        }

        Map<Long, Integer> counts() {
            return counts;
        }
    }
}
```

- 背景的 `@Scheduled` 也會同時取得任務，這正好多了一個競爭者
- 把 `SKIP LOCKED` 拿掉，測試通常仍然會通過但變慢（互相等待）；把取得任務時的 `UPDATE` 拿掉，測試就會失敗（同一個任務被執行多次）。寫好的整合測試要能抓到後者

### 3. 授權的回歸測試

事故 4 的防禦：每一個「屬於某個會員」的資源，都測試**另一個會員**存取時得到 404。另外再加一個測試，確保新增的端點不會忘了加進這張清單：

```java
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfig.class)
class OwnershipRegressionTest {

    static final List<String> OWNED_RESOURCES = List.of(
            "/v1/registrations/{id}",
            "/v1/orders/{id}",
            "/v1/conversations/{id}/messages",
            "/v1/notifications/{id}");

    static final List<String> PUBLIC_RESOURCES = List.of(             // 明確公開、不屬於任何會員
            "/v1/lectures/{id}",
            "/v1/speakers/{id}");

    @Autowired MockMvcTester mvc;
    @Autowired TestFixtures fixtures;

    static Stream<String> ownedResources() {
        return OWNED_RESOURCES.stream();
    }

    @ParameterizedTest
    @MethodSource("ownedResources")
    void anotherMemberGetsNotFound(String template) {
        long alice = fixtures.newMember();
        long bob = fixtures.newMember();
        long resourceId = fixtures.createOwnedBy(alice, template);

        assertThat(mvc.get().uri(template, resourceId)
                        .param("afterSeq", "0")
                        .with(jwt().jwt(j -> j.subject(Long.toString(bob)))))
                .hasStatus(404);                                                 // 不是 403：不透露資源是否存在
    }

    @Test
    void everyEndpointWithAnIdIsCovered(
            @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mappings) {
        Set<String> withId = mappings.getHandlerMethods().keySet().stream()
                .flatMap(info -> info.getPatternValues().stream())
                .filter(pattern -> pattern.contains("{id}"))
                .collect(Collectors.toSet());

        Set<String> classified = new HashSet<>(OWNED_RESOURCES);
        classified.addAll(PUBLIC_RESOURCES);
        assertThat(classified).containsAll(withId);                              // 新端點兩張清單都沒有列就失敗
    }
}
```

- 401 與 403 由 Spring Security 的設定處理，這個測試專注在**物件層**的授權：登入了，但不是擁有者
- 公開的資源（講座、講者頁面）不屬於任何會員，列在 `PUBLIC_RESOURCES`。新端點兩張清單都沒有列，測試就失敗：「忘記分類」本身就是錯誤

### 4. 秒殺的負載測試：開放模型

```java
public class FlashSaleSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http.baseUrl("https://perf.lectures.example.com");

    // 壓測專用的合成帳號；每一列只用一次（預設的佇列策略），列數要多於注入的總人數（約 68 萬）
    FeederBuilder<String> members = csv("perf-members.csv");

    ScenarioBuilder buyer = scenario("秒殺購票")
            .feed(members)
            .exec(http("開賣狀態").get("/v1/flashsale/42/status").check(status().is(200)))
            // 入場憑證 2 分鐘到期、只能使用一次，不能預先產生在 CSV 裡，要在情境中換發
            .exec(http("換發入場憑證").post("/v1/flashsale/42/admission")
                    .header("Authorization", "Bearer #{accessToken}")
                    .check(status().is(200), jsonPath("$.token").saveAs("admissionToken")))
            .exec(http("預扣").post("/v1/flashsale/42/reservations")
                    .header("Authorization", "Bearer #{accessToken}")
                    .header("X-Admission", "#{admissionToken}")
                    .check(status().in(202, 409, 410)));          // 處理中、已搶過、已額滿都是正常的業務結果

    {
        setUp(buyer.injectOpen(
                        rampUsersPerSec(100).to(2000).during(60),   // 等候室逐步放行
                        constantUsersPerSec(2000).during(300),
                        stressPeakUsers(20000).during(10)))         // 放行控制器失誤時的瞬間尖峰
                .protocols(httpProtocol)
                .assertions(
                        global().responseTime().percentile(99.0).lt(500),
                        global().failedRequests().percent().lt(0.1));
    }
}
```

- `injectOpen` 依到達速率注入虛擬使用者，不管前面的請求是否已經回應，這就是開放模型
- 409 與 410 列為成功的檢查結果：壓測的「失敗率」應該只計算系統的錯誤，而不是「沒搶到」
- 正式流程中，換發入場憑證要等排隊序號被放行；壓測環境把等候室設定成立即放行，專門測預扣與落庫的路徑，等候室本身另外測。如果把憑證預先產生在 CSV 裡，幾分鐘後就全部過期，壓測量到的只是「憑證無效」這條錯誤路徑
- 最後一段刻意注入超過設計的尖峰，觀察系統是**優雅地拒絕**（快速回傳 429 或 503），還是整個卡住

> 以上程式碼依 Spring Boot 4.1（Testcontainers 整合、`@ServiceConnection`）、Spring Framework 7（`MockMvcTester`）、Spring Security Test、Testcontainers 2.0 與 Gatling Java DSL 官方文件撰寫，沒有實際編譯與執行。`TestFixtures` 是示意的元件。

## 踩坑與 Gotchas

- **用記憶體資料庫跑整合測試**：測試通過，正式環境的 SQL 行為不同
- **每個測試類別重新啟動容器**：測試從幾分鐘變成一小時，最後沒有人想在本機跑
- **提供者改了欄位，只跑自己的測試**：消費者在部署之後才發現
- **封閉模型的壓測**：系統越慢，壓力越小，報告越好看
- **壓測環境的資料量太小**：所有資料都在記憶體裡，正式環境的磁碟 I/O 完全沒有被測到
- **只測尖峰，不測耐久**：連線洩漏要跑幾個小時才會出現
- **故障轉移只存在文件裡**：第一次真的發生時，才發現 runbook 的指令已經過時
- **不穩定的測試被習慣性重跑**：真正的間歇性錯誤（競爭條件）也被一起忽略。不穩定的測試要隔離並修好，不能長期重跑

### 資安相關

- **測試資料不能是正式資料的複本**：staging 的存取控制通常比正式環境寬鬆，複製過去的個人資料等於擴大了外洩面。使用合成資料；真的需要正式資料的分布時，使用不可逆的遮罩，並且對遮罩後的資料重新評估是否能被重新識別
- **測試用的後門不能進入正式環境**：`/test/reset-database`、「測試模式下略過驗證碼」、寫死的萬用 token，都要以建置設定排除，而不是只靠執行時的開關；正式環境的建置要有測試確認這些端點不存在
- **壓測與合成監控的帳號**：明確標記為測試帳號，權限最小，不能參加真實的抽獎或得到積分，並且排除在營運報表之外
- **壓測正式環境要先協調**：沒有事先告知，WAF 與濫用防護（[8-5](/post/systemdesign/abuse-prevention/)）會把壓測當作攻擊封鎖，或者更糟，資安團隊把真正的攻擊當作壓測而忽略
- **授權測試與安全掃描放在每次提交**：物件層授權的回歸測試、依賴套件的弱點掃描、secrets 掃描，在 CI 裡自動執行，不依賴上線前的人工檢查
- **staging 不是內部網路就安全**：staging 經常因為「只是測試環境」而對外開放、使用弱密碼、關掉 TLS。它和正式環境共用程式碼與部分設定，攻擊者可以在這裡找到正式環境的弱點

## 何時用／何時別用

- **單元測試**：所有的領域邏輯，越多越好，因為最便宜
- **Testcontainers 整合測試**：所有和資料庫、快取、訊息佇列互動的程式碼
- **契約測試**：服務之間有 API 或事件的相依，而且由不同的團隊各自部署時；只有一個團隊、一起部署的少數服務，成本可能大於效益
- **負載測試**：大型活動前、架構變更後、容量規劃時；不需要每次提交都跑
- **混沌實驗**：先有可觀測性與自動化的恢復機制，再做；在連告警都沒有的系統上注入故障，只會製造事故
- **端對端測試**：只留下幾條最關鍵的流程，作為部署後的冒煙測試

## 參考資料

- Gil Tene, "How NOT to Measure Latency", Strange Loop 2015
- Martin Fowler, "ContractTest"：<https://martinfowler.com/bliki/ContractTest.html>
- Ham Vocke, "The Practical Test Pyramid"：<https://martinfowler.com/articles/practical-test-pyramid.html>
- Spring Boot Reference — Testing、Testcontainers：<https://docs.spring.io/spring-boot/reference/testing/testcontainers.html>
- Spring Framework Reference — MockMvc with AssertJ：<https://docs.spring.io/spring-framework/reference/testing/mockmvc/assertj.html>
- Testcontainers for Java — Kafka Module、Toxiproxy Module：<https://java.testcontainers.org/>
- Gatling Documentation — Injection（open and closed workload models）：<https://docs.gatling.io/concepts/injection/>
- Principles of Chaos Engineering：<https://principlesofchaos.org/>
- Betsy Beyer et al., *Site Reliability Engineering*, O'Reilly, 2016, Chapter 17 "Testing for Reliability"
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
