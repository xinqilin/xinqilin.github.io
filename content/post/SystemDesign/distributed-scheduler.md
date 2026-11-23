---
title: "實戰題：設計分散式排程，一百萬個延遲任務要在對的時間只做一次"
date: 2026-11-23
draft: false
author: Bill.Lin
description: "System Design 系列 Part 9：設計付款期限、講座提醒與延後通知這類延遲任務的排程，用 SKIP LOCKED 讓多台機器分批取得任務，說明租約與取得識別、重試、集中到期的抖動、週期性工作的錯過策略與威脅模型"
categories: ["SystemDesign"]
tags: ["System Design", "Scheduler", "Delayed Task", "MySQL", "SKIP LOCKED", "Security"]
---

> **System Design 系列** Part 9-7｜上一篇：[排行榜](/post/systemdesign/leaderboard/)｜下一篇：[大規模系統的測試](/post/systemdesign/testing-at-scale/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

前面幾題留下了一串「之後再做」的工作：

| 任務 | 數量 | 時間的要求 |
|---|---|---|
| 付款期限：10 分鐘未付款就取消訂單、釋出名額（[秒殺搶票](/post/systemdesign/flash-sale-ticketing/)） | 平常每天 5 萬個；秒殺時 1 萬個集中在同一分鐘到期 | 晚幾秒可以，不能不做，不能做兩次 |
| 講座開始前 15 分鐘提醒（[通知系統](/post/systemdesign/notification-system/)） | 每場講座一個，每天約 2,000 個 | 前後 1 分鐘內 |
| 勿擾時段結束後才送出的行銷推播 | 每天最多 100 萬個，原本全部在 08:00 到期 | 08:00 到 08:30 之間都可以 |
| 週期性工作：每日結算、每分鐘合併熱門排行（[排行榜](/post/systemdesign/leaderboard/)） | 數十個 | 依工作而定 |

[分散式鎖篇](/post/systemdesign/distributed-lock/)用 ShedLock 解決了「一個 cron 工作只讓一台機器執行」。這一題是另一個問題：**數十萬到上百萬個各自有到期時間的任務**，要能分散到多台機器執行、機器當機時由別台接手，而且每個任務的效果只發生一次。

**規模估算**

| 項目 | 估算 |
|---|---|
| 同時等待中的任務 | 約 100 萬列 |
| 平常的到期速度 | 每秒數十個 |
| 尖峰 | 08:00 的 100 萬個推播；加上抖動分散到 30 分鐘 → 每秒約 560 個 |
| 單一任務的執行時間 | 10 到 50 毫秒（一兩次資料庫寫入或發出一則訊息） |

## 最簡單的做法與它的極限

一台機器上的 `@Scheduled`，每分鐘掃描一次到期的任務並依序執行：

- **單點**：這台機器當機或部署時，所有任務停止；加上 ShedLock 讓多台輪流，同一時間仍然只有一台在做
- **吞吐量**：一台依序執行，每個任務 20 毫秒，每秒 50 個。08:00 的 100 萬個要 5.5 小時才做完
- **精確度**：每分鐘掃描一次，任務最多晚 1 分鐘
- **長任務阻塞**：一個卡住的任務讓後面的全部等待

## 核心機制

### 任務存在資料庫裡，和業務資料同一個交易

建立訂單時，在**同一個交易**裡寫入一筆「10 分鐘後檢查付款」的任務列。訂單建立成功，任務一定存在；訂單回滾，任務也不存在。這和 [Saga 與 Outbox 篇](/post/systemdesign/saga-outbox/)的 outbox 是同一個想法：用本地交易保證「業務狀態」和「之後要做的事」一致。

任務列只放**參考**（訂單 ID），不放資料本身。執行時再讀取最新的狀態，因為 10 分鐘之內什麼都可能改變。

### 多台機器分批取得：`FOR UPDATE SKIP LOCKED`

每台排程機器每秒執行一次：

```sql
SELECT id, task_type, payload, attempts FROM scheduled_task
 WHERE status = 'PENDING' AND run_at <= NOW(3)
 ORDER BY run_at
 LIMIT 200
 FOR UPDATE SKIP LOCKED;
```

`SKIP LOCKED`（MySQL 8.0 起）讓查詢**跳過其他交易已經鎖住的列**，而不是等待。三台機器同時執行，各自拿到不重疊的 200 個任務，互相不會阻塞。取得之後在同一個交易裡把狀態改成 `RUNNING`、寫入租約期限，提交，再到交易之外執行任務。

這讓排程機器變成**無狀態**的：要更多吞吐量就多加幾台，任何一台當機都不影響其他台（[無狀態服務篇](/post/systemdesign/scaling-stateless/)）。

### 租約與取得識別

執行中的機器可能當機，任務會永遠停在 `RUNNING`。所以取得時同時寫入：

- **租約期限**（`lease_until`）：例如 5 分鐘。超過期限還是 `RUNNING` 的任務，由清理程式改回 `PENDING`，讓別台重新取得
- **取得識別**（`claim_id`）：每一次取得產生一個新的隨機值。完成時的更新條件包含 `claim_id`，如果這個任務因為租約過期已經被別台重新取得，原本那台的完成更新會影響 0 列，不會覆寫別台的狀態

取得識別的作用和[分散式鎖篇](/post/systemdesign/distributed-lock/)的 fencing token 一樣：讓「以為自己還持有、其實已經過期」的一方無法改寫狀態。但它只保護任務列本身；任務的**效果**（取消訂單、送出通知）可能被執行兩次，所以處理器必須是冪等的。

### 處理器自己重新檢查狀態

付款期限到了，處理器不是直接取消訂單，而是：

```sql
UPDATE ticket_order SET status = 'EXPIRED'
 WHERE id = :orderId AND status = 'PENDING_PAYMENT';
```

- 會員在第 9 分 59 秒付款成功：訂單已經是 `PAID`，更新 0 列，什麼都不做
- 同一個任務被執行兩次：第二次訂單已經是 `EXPIRED`，更新 0 列
- 只有更新了 1 列，才釋出名額

**排程只負責「在這個時間點提醒處理器去檢查」，正確性由處理器的條件式更新保證**。付款成功時也可以順便把任務標記為 `CANCELLED`，但那只是省下一次無用的執行，不是正確性的必要條件。

### 一個任務，還是一萬個任務

講座提醒有兩種建法：

- 每位報名者一個任務：一場 1 萬人的講座就是 1 萬個任務，全部在同一秒到期
- **每場講座一個任務**：到期時，處理器把「這場講座的報名者」分批送進通知系統

第二種的任務數少了好幾個數量級，到期的尖峰也消失了。展開的工作交給下游的佇列，由它控制速度。**排程的單位應該是業務事件，而不是收件者**。

### 集中到期：加上抖動

勿擾時段在 08:00 結束，100 萬個推播的 `run_at` 都是 08:00:00。08:00 那一刻，資料庫要回傳大量到期的列，下游的推播供應商也承受瞬間的尖峰。

建立任務時就把 `run_at` 加上隨機的抖動：08:00 加上 0 到 30 分鐘之間的隨機值。這和 [Timeout 與 Retry 篇](/post/systemdesign/timeout-retry-backoff/)的重試抖動是同一個原理：把同時發生的事分散開。只有允許延後的任務才加抖動，付款期限不加。

### 精確度與輪詢間隔

每秒輪詢一次，任務通常在到期後 1 到 2 秒內執行。這對上面所有的任務都夠了。

需要毫秒等級的精確度時（例如遊戲的倒數、即時競標的結束時間），每秒查詢資料庫就不夠了。常見的做法是兩層：資料庫存放長期的任務，接近到期的任務載入記憶體中的**時間輪**（hashed timing wheel）。時間輪是一個環狀陣列，每一格代表一個時間單位，插入與觸發都是 O(1)，Kafka 用它管理大量的請求逾時，Netty 的 `HashedWheelTimer` 也是同樣的結構。記憶體中的部分在機器重啟時會遺失，所以仍然要以資料庫為準。

### 週期性工作與錯過的執行

每天 03:00 的結算，如果排程服務在 02:00 到 05:00 之間停機，恢復後要怎麼處理？這要**依工作事先決定**：

| 錯過時的策略 | 適合的工作 |
|---|---|
| 補做一次 | 每日結算：錯過的結算一定要做，但只要做一次 |
| 每一次都補做 | 每小時一份的報表，每份對應不同的時間區間 |
| 直接跳過 | 每分鐘合併熱門排行：下一分鐘會再做一次 |

實作上，週期性工作在每次執行完成時，計算下一次的時間並寫入新的任務列。錯過的策略就是「計算下一次時間」的規則。cron 運算式要指定時區；在有日光節約時間的時區，02:00 到 03:00 之間的時間可能不存在或出現兩次，重要的工作避開這段時間。

### 可觀測性

- **延遲**：最早一個到期但仍是 `PENDING` 的任務，距離現在多久。這是排程健康與否最直接的指標
- **卡住的任務**：`RUNNING` 超過租約的數量
- **失敗**：進入 `DEAD` 的任務數量，依任務類型分開告警

（[可觀測性篇](/post/systemdesign/observability/)）

## 方案比較

| 方案 | 優點 | 代價 | 適合 |
|---|---|---|---|
| 資料庫任務表 + `SKIP LOCKED` | 和業務資料同一個交易；不需要新的元件 | 輪詢的負載；精確度約 1 秒 | 每秒數百到數千個任務 |
| Redis sorted set（分數是到期時間） | 精確度高、速度快 | 持久性弱；和資料庫的交易無法一致 | 可以重建的短期任務 |
| 訊息佇列的延遲投遞 | 不需要輪詢 | 延遲的上限與取消的支援依產品而定 | 固定的短延遲 |
| Quartz 叢集模式 | 成熟，支援週期性工作 | 以資料庫的列鎖協調，任務量大時鎖競爭明顯；要求各節點的時鐘同步 | 週期性工作為主，數量不多 |
| 雲端的排程服務 | 不需要維運 | 費用與廠商綁定；和資料庫交易無法一致 | 已經在該雲端平台上 |

講座平台選擇**資料庫任務表**：任務量在每秒數百個的範圍，而且最重要的付款期限必須和訂單在同一個交易裡建立。Java 生態系也有採用同樣做法的函式庫（例如 db-scheduler），不一定要自己寫；這裡寫出來是為了說明每一個欄位的作用。

## Java 落地

### 1. 任務表

```sql
CREATE TABLE scheduled_task (
    id          BIGINT       PRIMARY KEY,
    task_type   VARCHAR(64)  NOT NULL,      -- PAYMENT_DEADLINE、LECTURE_REMINDER、NOTIFICATION_RELEASE
    dedup_key   VARCHAR(200) NOT NULL,      -- 例如 PAYMENT_DEADLINE:order:98765
    payload     JSON         NOT NULL,      -- 只放 ID，不放個人資料
    run_at      TIMESTAMP(3) NOT NULL,
    status      VARCHAR(16)  NOT NULL,      -- PENDING、RUNNING、DONE、CANCELLED、DEAD
    attempts    INT          NOT NULL DEFAULT 0,
    claim_id    BINARY(16)   NULL,
    lease_until TIMESTAMP(3) NULL,
    created_by  VARCHAR(64)  NOT NULL,      -- 建立任務的服務或會員，供稽核與執行時的授權檢查
    UNIQUE KEY uk_dedup (dedup_key),
    KEY idx_due (status, run_at),
    KEY idx_lease (status, lease_until)
);
```

`idx_due` 讓取得任務的查詢只掃描到期的 `PENDING` 列；`SKIP LOCKED` 搭配沒有合適索引的查詢，會鎖住並跳過大量不相干的列。

### 2. 建立與取消

```java
@Service
public class DelayedTasks {

    private final JdbcClient jdbc;
    private final IdGenerator ids;

    public DelayedTasks(JdbcClient jdbc, IdGenerator ids) {
        this.jdbc = jdbc;
        this.ids = ids;
    }

    /** 必須在業務交易之內呼叫：任務和業務資料一起提交或一起回滾。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void schedule(String type, String dedupKey, String payloadJson, Instant runAt, String createdBy) {
        try {
            jdbc.sql("""
                            INSERT INTO scheduled_task (id, task_type, dedup_key, payload, run_at, status, created_by)
                            VALUES (:id, :type, :dedup, :payload, :runAt, 'PENDING', :createdBy)
                            """)
                    .param("id", ids.next()).param("type", type).param("dedup", dedupKey)
                    .param("payload", payloadJson).param("runAt", Timestamp.from(runAt))
                    .param("createdBy", createdBy)
                    .update();
        } catch (DuplicateKeyException e) {
            // 同一個業務事件已經排過，略過
        }
    }

    /** 只是省下一次無用的執行；就算沒有取消到，處理器也會重新檢查狀態。 */
    public void cancel(String dedupKey) {
        jdbc.sql("UPDATE scheduled_task SET status = 'CANCELLED' WHERE dedup_key = :k AND status = 'PENDING'")
                .param("k", dedupKey).update();
    }

    /** 允許延後的任務：加上 0 到 maxJitter 之間的隨機延遲。 */
    public static Instant withJitter(Instant runAt, Duration maxJitter) {
        return runAt.plusMillis(ThreadLocalRandom.current().nextLong(maxJitter.toMillis() + 1));
    }
}
```

秒殺的訂單建立時（[秒殺搶票](/post/systemdesign/flash-sale-ticketing/)的 `OrderCreator`），在同一個交易裡呼叫 `schedule("PAYMENT_DEADLINE", "PAYMENT_DEADLINE:order:" + orderId, ..., now + 10 分鐘, "ticketing-service")`。

### 3. 取得與執行

```java
@Component
public class TaskPoller {

    private static final int BATCH = 200;
    private static final int MAX_ATTEMPTS = 8;

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final Map<String, TaskHandler> handlers;
    private final ExecutorService workers = Executors.newFixedThreadPool(32);

    public TaskPoller(JdbcClient jdbc, TransactionTemplate tx, List<TaskHandler> handlers) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.handlers = handlers.stream().collect(Collectors.toUnmodifiableMap(TaskHandler::type, h -> h));
    }

    @Scheduled(fixedDelay = 1000)
    public void poll() throws InterruptedException {
        List<Task> claimed;
        do {
            byte[] claimId = UuidBytes.random();
            claimed = claim(claimId);
            List<Callable<Void>> jobs = new ArrayList<>();
            for (Task t : claimed) {
                jobs.add(() -> {
                    run(t, claimId);
                    return null;
                });
            }
            workers.invokeAll(jobs);                  // 這一批做完才取下一批，同時執行的數量有上限
        } while (claimed.size() == BATCH);            // 還有積壓就繼續，不等下一秒
    }

    private List<Task> claim(byte[] claimId) {
        return tx.execute(status -> {
            List<Task> due = jdbc.sql("""
                            SELECT id, task_type, payload, attempts FROM scheduled_task
                             WHERE status = 'PENDING' AND run_at <= NOW(3)
                             ORDER BY run_at
                             LIMIT :batch
                             FOR UPDATE SKIP LOCKED
                            """)
                    .param("batch", BATCH)
                    .query(Task.class)
                    .list();
            if (!due.isEmpty()) {
                jdbc.sql("""
                                UPDATE scheduled_task
                                   SET status = 'RUNNING', claim_id = :claim, lease_until = NOW(3) + INTERVAL 5 MINUTE
                                 WHERE id IN (:ids)
                                """)
                        .param("claim", claimId)
                        .param("ids", due.stream().map(Task::id).toList())
                        .update();
            }
            return due;
        });
    }

    private void run(Task t, byte[] claimId) {
        TaskHandler handler = handlers.get(t.taskType());
        if (handler == null || t.attempts() >= MAX_ATTEMPTS) {
            finish(t.id(), claimId, "DEAD");          // 不認得的類型不執行；重試用盡的交給人工處理
            return;
        }
        try {
            handler.handle(t);
            finish(t.id(), claimId, "DONE");
        } catch (RuntimeException e) {
            long delaySeconds = Math.min(3600, 1L << (t.attempts() + 2));    // 4、8、16……秒，上限 1 小時
            jdbc.sql("""
                            UPDATE scheduled_task
                               SET status = 'PENDING', attempts = attempts + 1, run_at = NOW(3) + INTERVAL :delay SECOND
                             WHERE id = :id AND claim_id = :claim AND status = 'RUNNING'
                            """)
                    .param("delay", delaySeconds).param("id", t.id()).param("claim", claimId)
                    .update();
        }
    }

    private void finish(long id, byte[] claimId, String status) {
        // claim_id 不符代表租約已過期、任務被別台重新取得：影響 0 列，不覆寫別台的狀態
        jdbc.sql("UPDATE scheduled_task SET status = :s WHERE id = :id AND claim_id = :claim AND status = 'RUNNING'")
                .param("s", status).param("id", id).param("claim", claimId)
                .update();
    }

    @Scheduled(fixedDelay = 60_000)
    public void reclaimExpiredLeases() {
        jdbc.sql("""
                UPDATE scheduled_task SET status = 'PENDING', attempts = attempts + 1, claim_id = NULL
                 WHERE status = 'RUNNING' AND lease_until < NOW(3)
                """).update();
    }
}
```

- 每一台機器都執行 `poll()`，靠 `SKIP LOCKED` 分配任務，不需要選出 leader
- 時間的比較一律用資料庫的 `NOW(3)`，不用各台機器的時鐘
- 取得任務的交易只包含 `SELECT` 與 `UPDATE`，在執行任務之前就提交，鎖只持有幾毫秒
- 處理器拋出例外就以指數退避重試；租約過期而被重新取得的次數也算進 `attempts`，讓每次都讓機器當掉的任務最後進入 `DEAD`，不會無限循環
- `reclaimExpiredLeases` 每台都會執行，重複執行的結果相同

### 4. 處理器

```java
public interface TaskHandler {
    String type();
    void handle(Task task);
}

@Component
public class PaymentDeadlineHandler implements TaskHandler {

    private final JdbcClient jdbc;
    private final SeatRelease seatRelease;

    public PaymentDeadlineHandler(JdbcClient jdbc, SeatRelease seatRelease) {
        this.jdbc = jdbc;
        this.seatRelease = seatRelease;
    }

    @Override
    public String type() {
        return "PAYMENT_DEADLINE";
    }

    @Override
    @Transactional
    public void handle(Task task) {
        long orderId = task.longParam("orderId");
        int expired = jdbc.sql("UPDATE ticket_order SET status = 'EXPIRED' WHERE id = :id AND status = 'PENDING_PAYMENT'")
                .param("id", orderId).update();
        if (expired == 1) {
            seatRelease.release(orderId);   // 資料庫的名額加回，並透過 outbox 通知 Redis 加回庫存
        }
    }
}
```

> 以上程式碼依 Spring Boot 4.1、Spring Framework 7（`JdbcClient`、`TransactionTemplate`、`@Scheduled`）、MySQL 8.4（`SKIP LOCKED`）與 Java 21 官方文件撰寫，沒有實際編譯與執行。`IdGenerator`、`UuidBytes`、`Task`、`SeatRelease` 是示意的元件。

## 踩坑與 Gotchas

- **任務和業務資料不在同一個交易**：訂單建立了，付款期限的任務卻沒有寫入，名額永遠不會釋出
- **處理器信任任務**：直接取消訂單，不檢查會員是否已經付款
- **完成時不檢查取得識別**：租約過期後，原本那台機器把別台正在處理的任務標記為完成
- **用應用伺服器的時鐘判斷到期**：各台的時鐘誤差，讓任務提早或延後執行
- **每位收件者一個任務**：一場講座產生一萬個同時到期的任務
- **允許延後的任務沒有抖動**：08:00 整點的尖峰壓垮下游
- **沒有決定錯過的策略**：排程恢復後，每日結算跑了三次，或者一次都沒跑
- **在取得任務的交易裡執行任務**：列鎖與資料庫連線一直持有到整批任務做完；其中一個任務失敗，整批的狀態一起回滾
- **沒有 `DEAD` 狀態**：一個永遠失敗的任務每隔幾秒重試一次，直到永遠

### 威脅模型

| STRIDE | 威脅 | 講座平台的情境 | 防禦 |
|---|---|---|---|
| Spoofing 冒充 | 延遲執行時的身分 | 會員排程「明天 9 點發布這則動態」，但今晚帳號被停權，或者動態被改成別人的講座頁面；任務到期時以系統的權限執行 | 任務記錄建立者（`created_by`），執行時**以建立者的身分重新檢查權限**，而不是用系統權限直接執行（[8-3](/post/systemdesign/identity-propagation/)） |
| Tampering 竄改 | 修改任務列；不安全的反序列化 | 能寫入資料庫的人把 `payload` 改成別的訂單；任務內容以 Java 序列化儲存，竄改後反序列化時執行任意程式碼 | 處理器重新檢查業務狀態；payload 只用 JSON 並限定欄位，不用 Java 序列化，不依 payload 決定要建立的類別；任務類型以允許清單對應到處理器 |
| Repudiation 否認 | 誰排了、誰取消了這個任務 | 付款期限的任務被取消，訂單沒有過期，名額被長期佔住 | `created_by` 與取消的紀錄；取消操作寫入稽核紀錄 |
| Information disclosure 洩漏 | 任務表成為個人資料的副本 | payload 放了會員的姓名、電話、通知內容，保存期限比原始資料還長 | payload 只放 ID；完成的任務定期清除 |
| Denial of service 阻斷 | 大量建立任務；毒藥任務 | 會員可以建立「提醒我」的任務，被腳本建立數百萬個；一個任務每次都讓處理器當機 | 每位會員的任務數量上限；重試上限與 `DEAD` 狀態 |
| Elevation of privilege 提權 | 處理器以系統權限執行會員提供的內容 | 會員排程的任務 payload 裡指定了要呼叫的內部 URL 或要執行的動作 | 會員只能建立固定類型的任務，payload 只包含參數；處理器不執行 payload 裡的任意指令或 URL |

## 何時用／何時別用

- **ShedLock 加上 `@Scheduled`**：只有少數週期性工作，只需要「不要同時跑兩份」（[分散式鎖篇](/post/systemdesign/distributed-lock/)）
- **資料庫任務表**：大量的延遲任務，而且需要和業務資料在同一個交易裡建立
- **現成的函式庫或雲端服務**：需求符合它們的模型時，優先使用，不要自己維護
- **時間輪或 Redis**：需要次秒等級的精確度，而且可以接受重啟時從資料庫重新載入
- **重新評估的時機**：取得任務的查詢開始成為資料庫的主要負載，或者任務量超過每秒數千個時，考慮把任務表依到期時間或類型分開

## 參考資料

- MySQL 8.4 Reference Manual — Locking Read Concurrency with NOWAIT and SKIP LOCKED：<https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html>
- George Varghese, Anthony Lauck, "Hashed and Hierarchical Timing Wheels: Data Structures for the Efficient Implementation of a Timer Facility", SOSP 1987
- Apache Kafka Blog — "Apache Kafka, Purgatory, and Hierarchical Timing Wheels", 2015
- Spring Framework Reference — Task Execution and Scheduling：<https://docs.spring.io/spring-framework/reference/integration/scheduling.html>
- Quartz Scheduler Documentation — Configure Clustering with JDBC-JobStore
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
