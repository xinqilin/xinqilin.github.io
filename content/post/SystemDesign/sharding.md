---
title: "Sharding：shard key 怎麼選、重新分片怎麼搬，以及跨分片之後失去的東西"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 4：實測三種 shard key 的資料分布、重新分片要搬多少資料與跨分片查詢的尾端延遲，用 Spring 實作依講座分片的報名與 outbox 索引表，並處理多租戶隔離與熱點攻擊"
categories: ["SystemDesign"]
tags: ["System Design", "Sharding", "Partitioning", "MySQL", "Spring", "Outbox", "Security"]
---

> **System Design 系列** Part 4-2｜上一篇：[Replication 與 Replication Lag](/post/systemdesign/replication-lag/)｜下一篇：[Consistent Hashing](/post/systemdesign/consistent-hashing/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台營運三年後，報名相關的資料累積到 30 億筆、12 TB。熱門講座開放報名的瞬間，寫入尖峰每秒 2 萬次。[上一篇](/post/systemdesign/replication-lag/)的 read replica 幫不上忙：每台 replica 都要套用全部的寫入，寫入量和 primary 一樣多。

單台 primary 的極限同時出現在三個地方：

- **寫入量**：所有寫入都在同一台機器上排隊
- **資料量**：12 TB 的備份以每秒 500 MB 還原，要將近 7 小時
- **記憶體**：常用的索引已經放不進 buffer pool，查詢開始大量讀磁碟

## 最簡單的做法與它的極限

分片之前，先確認這些更簡單的做法都試過了：

1. **垂直擴展**：換更大的機器（[Part 2](/post/systemdesign/scaling-stateless/)）
2. **歸檔冷資料**：三年前的報名紀錄搬到便宜的儲存，主資料庫只留近期資料
3. **分割表**（partitioning）：同一台資料庫內，依月份把表切成多個分割區。查詢只掃描相關的分割區，過期資料用 `DROP PARTITION` 瞬間刪除。MySQL 要求每個唯一索引（包括主鍵）都包含分割欄位，這和分片的唯一約束是同一個限制。但它還是一台機器，寫入量的上限沒有改變
4. **功能拆分**：報名、觀看紀錄、站內訊息分到不同的資料庫，每個資料庫只承擔一部分寫入

這些都撐不住時，才把同一張表的資料分散到多台資料庫，也就是**分片**（sharding）。它的代價是：跨分片的交易、跨分片的查詢、跨分片的唯一約束、重新分片，以及 N 倍的維運工作。

## 核心機制

### 選 shard key

shard key 決定每一筆資料放在哪個分片，選錯了幾乎不可能改。依重要性排序：

1. **交易邊界**：一個交易要修改的資料，必須落在同一個分片
2. **查詢模式**：最常見的查詢要帶著 shard key，才能只查一個分片
3. **分布**：資料與流量要平均，不能有少數分片特別忙
4. **成長**：新資料不能永遠寫到同一個分片

### 分片方式

| 方式 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| Range | 依 key 的範圍，例如會員編號 1 到 100 萬放第一台 | 範圍查詢只查少數分片 | 遞增的 key 讓新資料全部寫到最後一台 |
| Hash | `hash(key) % N` | 分布平均 | 範圍查詢要查所有分片；N 改變時幾乎所有資料都要搬 |
| 查表（directory） | 另外存一張「key 在哪個分片」的對照表 | 每一筆都能個別搬移 | 對照表本身要高可用，而且每次查詢多一次查表 |
| 邏輯分片 | 先雜湊到固定數量的 slot（例如 1024 個），再查表找到實體分片 | 搬移以 slot 為單位，對照表很小 | slot 數量決定了未來擴充的上限 |

### 實測：分布、重新分片與跨分片查詢

16 個分片、200 萬筆報名，橫跨 16 個月。講座的熱門程度與會員的活躍程度都是長尾分布：少數熱門講座占了大量報名。

<details>
<summary>模擬程式（<code>java ShardingSimulation.java</code>）</summary>

```java
import java.util.Arrays;
import java.util.Random;
import java.util.function.IntUnaryOperator;

/** 16 個分片：比較三種 shard key 的資料與寫入分布、增加分片時要搬多少資料，以及跨分片查詢的尾端延遲。 */
public class ShardingSimulation {

    static final int SHARDS = 16;

    public static void main(String[] args) {
        Random random = new Random(42);
        distribution(random);
        resharding();
        scatterGather(random);
    }

    static void distribution(Random random) {
        int registrations = 2_000_000;
        int months = 16;
        double[] lectureCdf = zipfCdf(20_000, 0.9);                // 少數熱門講座占了大量報名
        double[] memberCdf = zipfCdf(300_000, 0.6);
        long[][] rows = new long[3][SHARDS];
        long[][] lastDay = new long[3][SHARDS];
        long dayStart = months * 30L * 24 - 24;                     // 以小時為單位，最後 24 小時
        for (int i = 0; i < registrations; i++) {
            int lecture = sample(lectureCdf, random);
            int member = sample(memberCdf, random);
            long hour = (long) (random.nextDouble() * months * 30 * 24);
            int[] shard = {
                    Math.floorMod(Long.hashCode(member * 0x9E3779B97F4A7C15L), SHARDS),
                    Math.floorMod(Long.hashCode(lecture * 0x9E3779B97F4A7C15L), SHARDS),
                    (int) (hour / (30 * 24))                         // 每個月一個分片
            };
            for (int k = 0; k < 3; k++) {
                rows[k][shard[k]]++;
                if (hour >= dayStart) {
                    lastDay[k][shard[k]]++;
                }
            }
        }
        String[] names = {"hash(member_id)", "hash(lecture_id)", "依建立月份 range"};
        for (int k = 0; k < 3; k++) {
            System.out.printf("%s：最大分片的資料量是平均的 %.2f 倍｜最近一天的寫入是平均的 %.2f 倍%n",
                    names[k], skew(rows[k]), skew(lastDay[k]));
        }
    }

    static void resharding() {
        int keys = 1_000_000;
        int[] slotOwner = new int[1024];                           // 1024 個邏輯分片，平均分給 16 台
        for (int s = 0; s < slotOwner.length; s++) {
            slotOwner[s] = s % SHARDS;
        }
        int[] newOwner = slotOwner.clone();
        int[] count = new int[SHARDS + 1];
        Arrays.fill(count, 0, SHARDS, 64);
        for (int s = 0; s < newOwner.length && count[SHARDS] < 1024 / (SHARDS + 1); s++) {
            int owner = newOwner[s];
            if (count[owner] > 1024 / (SHARDS + 1)) {              // 從每台各拿幾個給新的第 17 台
                count[owner]--;
                count[SHARDS]++;
                newOwner[s] = SHARDS;
            }
        }
        System.out.println();
        report("hash % 16 → hash % 17", keys, h -> Math.floorMod(h, 16), h -> Math.floorMod(h, 17));
        report("hash % 16 → hash % 32", keys, h -> Math.floorMod(h, 16), h -> Math.floorMod(h, 32));
        report("1024 個邏輯分片，16 → 17 台", keys,
                h -> slotOwner[Math.floorMod(h, 1024)], h -> newOwner[Math.floorMod(h, 1024)]);
    }

    static void report(String label, int keys, IntUnaryOperator before, IntUnaryOperator after) {
        int moved = 0;
        for (int key = 0; key < keys; key++) {
            int h = Long.hashCode(key * 0x9E3779B97F4A7C15L);
            moved += before.applyAsInt(h) != after.applyAsInt(h) ? 1 : 0;
        }
        System.out.printf("%-28s 要搬移 %5.1f%% 的資料%n", label, 100.0 * moved / keys);
    }

    /** 單一分片的延遲：中位數 4 ms，1% 的請求遇到 GC 或慢查詢，落在 50 到 200 ms。 */
    static void scatterGather(Random random) {
        System.out.println();
        int trials = 200_000;
        for (int fanOut : new int[] {1, 4, 16, 64}) {
            double[] latency = new double[trials];
            for (int t = 0; t < trials; t++) {
                double slowest = 0;
                for (int s = 0; s < fanOut; s++) {
                    double ms = random.nextDouble() < 0.01
                            ? 50 + random.nextDouble() * 150
                            : 4 * Math.exp(0.5 * random.nextGaussian());
                    slowest = Math.max(slowest, ms);                // 要等最慢的分片回來
                }
                latency[t] = slowest;
            }
            Arrays.sort(latency);
            System.out.printf("查詢 %2d 個分片：p50 %6.1f ms｜p99 %6.1f ms｜至少一個分片很慢的機率 %4.1f%%%n",
                    fanOut, latency[trials / 2], latency[trials * 99 / 100],
                    100 * (1 - Math.pow(0.99, fanOut)));
        }
    }

    static double skew(long[] counts) {
        long max = Arrays.stream(counts).max().orElseThrow();
        double avg = Arrays.stream(counts).average().orElseThrow();
        return max / avg;
    }

    static double[] zipfCdf(int n, double s) {
        double[] cdf = new double[n];
        double sum = 0;
        for (int k = 1; k <= n; k++) {
            sum += 1 / Math.pow(k, s);
            cdf[k - 1] = sum;
        }
        for (int k = 0; k < n; k++) {
            cdf[k] /= sum;
        }
        return cdf;
    }

    static int sample(double[] cdf, Random random) {
        int i = Arrays.binarySearch(cdf, random.nextDouble());
        return i >= 0 ? i : -i - 1;
    }
}
```

</details>

```text
hash(member_id)：最大分片的資料量是平均的 1.03 倍｜最近一天的寫入是平均的 1.11 倍
hash(lecture_id)：最大分片的資料量是平均的 1.74 倍｜最近一天的寫入是平均的 1.97 倍
依建立月份 range：最大分片的資料量是平均的 1.00 倍｜最近一天的寫入是平均的 16.00 倍

hash % 16 → hash % 17        要搬移  94.1% 的資料
hash % 16 → hash % 32        要搬移  50.0% 的資料
1024 個邏輯分片，16 → 17 台         要搬移   5.9% 的資料

查詢  1 個分片：p50    4.0 ms｜p99   24.2 ms｜至少一個分片很慢的機率  1.0%
查詢  4 個分片：p50    6.7 ms｜p99  162.4 ms｜至少一個分片很慢的機率  3.9%
查詢 16 個分片：p50   10.1 ms｜p99  190.9 ms｜至少一個分片很慢的機率 14.9%
查詢 64 個分片：p50   19.3 ms｜p99  197.6 ms｜至少一個分片很慢的機率 47.4%
```

**分布**：

- **`hash(member_id)`** 最平均，因為就算是最活躍的會員，也只占全部報名的一小部分
- **`hash(lecture_id)`** 的最大分片是平均的 1.74 倍：最熱門的講座所在的分片，一個講座就抵得上好幾個普通講座。雜湊只能打散「不同的 key」，同一個 key 的流量永遠在同一個分片
- **依建立月份的 range**：資料量完全平均，但最近一天的寫入全部落在最新的分片，是平均的 16 倍。其他 15 台閒著，最新的那台扛下所有寫入

**重新分片**：

- `hash % 16` 改成 `hash % 17`，94% 的資料要搬到別台，幾乎等於重建
- 從 16 台加倍到 32 台，要搬 50%
- 用 1024 個邏輯分片時，新加的第 17 台從每台各拿幾個 slot，只要搬 5.9%，也就是 1/17，這是平均分布下的理論最小值。下一篇的 [consistent hashing](/post/systemdesign/consistent-hashing/) 是另一種達到同樣效果的做法

**跨分片查詢的尾端延遲**：單一分片的 p99 是 24 毫秒，查 16 個分片時 p99 變成 191 毫秒。查詢要等最慢的分片回來，而「至少一個分片很慢」的機率是 1 − 0.99^N，16 個分片就有 15%。這就是 [Latency 篇](/post/systemdesign/latency-throughput/)提到的扇出（fan-out）放大尾端延遲。

### 分片之後失去的東西

- **跨分片交易**：資料庫的交易只在一台機器內有效。跨分片要用 2PC 或 Saga（Part 7），兩者都比本地交易複雜得多。所以 shard key 的第一原則是讓交易留在一個分片內
- **唯一約束**：唯一索引只在單一分片內檢查。「email 不能重複」如果 email 不是 shard key，兩個分片可以各存一筆相同的 email。解法是另一張依 email 分片的對照表，先在那裡佔住 email
- **二級索引**：依講座分片之後，「某會員報名了哪些講座」要查所有分片。解法是另一張依會員分片的索引表，透過 outbox 或 CDC 非同步更新，代價是最終一致
- **JOIN 與彙總**：跨分片的 `JOIN`、`COUNT(*)`、`ORDER BY ... LIMIT` 都要在應用程式裡合併

### 單一熱點，分片也救不了

熱門講座開放報名時，2 萬個請求都在搶同一列的剩餘名額。不管分成幾片，這一列只在一個分片上，問題是**單列的鎖競爭**，不是分片的容量。常見的緩解方式：

- **拆分計數器**：把 1,000 個名額拆成 10 列、每列 100 個，請求隨機選一列扣減，競爭降為十分之一。這 10 列用同一個 shard key，仍在同一個分片，交易依然是本地的
- **在資料庫前面排隊**：用佇列或 Redis 先篩掉超出名額的請求，只讓有機會成功的請求進資料庫（Part 5、Part 9）

## 方案比較

### 報名資料用什麼當 shard key

| | `member_id` | `lecture_id` |
|---|---|---|
| 「我的報名」 | 查一個分片 | 要查所有分片，或另建索引表 |
| 「這場講座的報名名單」 | 要查所有分片，或另建索引表 | 查一個分片 |
| 報名交易（扣名額 + 寫報名） | 名額在講座的分片，**跨分片** | **同一個分片**，本地交易 |
| 分布 | 平均 | 熱門講座造成傾斜 |

選 `lecture_id`：交易邊界是第一原則，分布的傾斜可以用邏輯分片把熱門講座所在的 slot 搬到專用的機器上；「我的報名」則用依會員分片的索引表。

### 自己做，還是用中介層

| | 應用程式自己路由 | 中介層（Vitess、ShardingSphere、Citus） |
|---|---|---|
| 做法 | 程式碼決定每個查詢送到哪個分片 | 應用程式看到的是一個資料庫，由中介層改寫與路由 SQL |
| 優點 | 行為透明，沒有額外元件 | 跨分片查詢、重新分片的工具都已經做好 |
| 缺點 | 重新分片、跨分片查詢都要自己做 | 多一層元件與學習成本，部分 SQL 不支援 |

Vitess 用於 MySQL，Citus 是 PostgreSQL 的擴充套件，Apache ShardingSphere 則提供 JDBC driver 與 proxy 兩種形式。分片數量多、團隊沒有餘力自己做重新分片工具時，中介層通常比較划算。

## Java 落地

### 1. 路由：邏輯分片

```java
package sharding;

/** key 先雜湊到 1024 個邏輯分片（slot），再查表找到實體分片。增加機器時只要搬移部分 slot、更新這張表。 */
public class ShardRouter {

    static final int SLOTS = 1024;

    private final int[] slotOwner;

    public ShardRouter(int[] slotOwner) {
        if (slotOwner.length != SLOTS) {
            throw new IllegalArgumentException("slot table must have " + SLOTS + " entries");
        }
        this.slotOwner = slotOwner.clone();
    }

    public static ShardRouter evenlySpread(int shards) {
        int[] owner = new int[SLOTS];
        for (int slot = 0; slot < SLOTS; slot++) {
            owner[slot] = slot % shards;
        }
        return new ShardRouter(owner);
    }

    public int shardOf(long key) {
        return slotOwner[slotOf(key)];
    }

    /** 雜湊函式一旦上線就不能改，改了等於所有資料重新分片。 */
    static int slotOf(long key) {
        long h = key * 0x9E3779B97F4A7C15L;
        return Math.floorMod((int) (h ^ (h >>> 32)), SLOTS);
    }
}
```

### 2. 依講座分片的報名

報名交易在講座的分片內完成；同一個交易寫入 outbox，由背景程序轉送到會員所在分片的索引表（[Outbox Pattern](/post/architecture/outbox-pattern/)）：

```java
package sharding;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 報名依 lecture_id 分片：名額與報名紀錄在同一個分片，報名是一個本地交易。 */
public class ShardedRegistrations {

    public record Registration(long lectureId, long memberId, LocalDateTime createdAt) {}

    record OutboxEvent(long id, long lectureId, long memberId, LocalDateTime createdAt) {}

    private final ShardRouter router;
    private final List<JdbcClient> shards;
    private final List<TransactionTemplate> transactions;

    public ShardedRegistrations(ShardRouter router, List<DataSource> dataSources) {
        this.router = router;
        this.shards = dataSources.stream().map(JdbcClient::create).toList();
        this.transactions = dataSources.stream()
                .map(ds -> new TransactionTemplate(new DataSourceTransactionManager(ds)))
                .toList();
    }

    /** 扣名額、寫報名紀錄、寫 outbox，都在講座所在的分片。重複報名會被主鍵擋下，整個交易回滾。 */
    public boolean register(long lectureId, long memberId, LocalDateTime now) {
        int shard = router.shardOf(lectureId);
        JdbcClient jdbc = shards.get(shard);
        return Boolean.TRUE.equals(transactions.get(shard).execute(status -> {
            int taken = jdbc.sql("""
                    UPDATE lecture_seat SET remaining = remaining - 1
                     WHERE lecture_id = :lectureId AND remaining > 0""")
                    .param("lectureId", lectureId)
                    .update();
            if (taken == 0) {
                return false;
            }
            Registration registration = new Registration(lectureId, memberId, now);
            jdbc.sql("INSERT INTO registration (lecture_id, member_id, created_at) VALUES (:lectureId, :memberId, :createdAt)")
                    .paramSource(registration)
                    .update();
            jdbc.sql("INSERT INTO outbox (lecture_id, member_id, created_at) VALUES (:lectureId, :memberId, :createdAt)")
                    .paramSource(registration)
                    .update();
            return true;
        }));
    }

    /** 背景程序：把 outbox 事件寫進會員所在分片的索引表。可以重送，主鍵擋下重複。 */
    public int relayOutbox() {
        int relayed = 0;
        for (JdbcClient source : shards) {
            List<OutboxEvent> events = source
                    .sql("SELECT id, lecture_id, member_id, created_at FROM outbox WHERE sent = FALSE ORDER BY id LIMIT 100")
                    .query(OutboxEvent.class)
                    .list();
            for (OutboxEvent event : events) {
                try {
                    shards.get(router.shardOf(event.memberId()))
                            .sql("INSERT INTO member_registration (member_id, lecture_id, created_at) VALUES (:memberId, :lectureId, :createdAt)")
                            .paramSource(event)
                            .update();
                } catch (DuplicateKeyException alreadyRelayed) {
                    // 上一次寫入成功、標記失敗，這次是重送
                }
                source.sql("UPDATE outbox SET sent = TRUE WHERE id = :id").param("id", event.id()).update();
                relayed++;
            }
        }
        return relayed;
    }

    public List<Registration> findByLecture(long lectureId) {
        return shards.get(router.shardOf(lectureId))
                .sql("SELECT lecture_id, member_id, created_at FROM registration WHERE lecture_id = :lectureId ORDER BY created_at")
                .param("lectureId", lectureId)
                .query(Registration.class)
                .list();
    }

    /** 走會員所在分片的索引表，是 outbox 轉送之後的最終一致結果。 */
    public List<Registration> findByMember(long memberId) {
        return shards.get(router.shardOf(memberId))
                .sql("SELECT lecture_id, member_id, created_at FROM member_registration WHERE member_id = :memberId ORDER BY created_at")
                .param("memberId", memberId)
                .query(Registration.class)
                .list();
    }

    /** 不含 shard key 的查詢：每個分片各取前 limit 筆再合併，任何一個分片逾時，整個查詢就失敗。 */
    public List<Registration> latest(int limit) {
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<List<Registration>>> perShard = shards.stream()
                    .map(jdbc -> CompletableFuture.supplyAsync(() -> jdbc
                                    .sql("SELECT lecture_id, member_id, created_at FROM registration ORDER BY created_at DESC LIMIT :limit")
                                    .param("limit", limit)
                                    .query(Registration.class)
                                    .list(), executor)
                            .orTimeout(500, TimeUnit.MILLISECONDS))
                    .toList();
            return perShard.stream()
                    .flatMap(future -> future.join().stream())
                    .sorted(Comparator.comparing(Registration::createdAt).reversed())
                    .limit(limit)
                    .toList();
        }
    }
}
```

用 4 個 H2 資料庫扮演 4 個分片實際執行：

<details>
<summary>驗證程式（<code>ShardingDemo.java</code>）</summary>

```java
package sharding;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

public class ShardingDemo {

    public static void main(String[] args) {
        ShardRouter router = ShardRouter.evenlySpread(4);
        List<DataSource> dataSources = new ArrayList<>();
        for (int shard = 0; shard < 4; shard++) {
            DataSource ds = new DriverManagerDataSource("jdbc:h2:mem:shard" + shard + ";DB_CLOSE_DELAY=-1", "sa", "");
            JdbcClient jdbc = JdbcClient.create(ds);
            jdbc.sql("CREATE TABLE lecture_seat (lecture_id BIGINT PRIMARY KEY, remaining INT NOT NULL)").update();
            jdbc.sql("CREATE TABLE registration (lecture_id BIGINT, member_id BIGINT, created_at TIMESTAMP, PRIMARY KEY (lecture_id, member_id))").update();
            jdbc.sql("CREATE TABLE member_registration (member_id BIGINT, lecture_id BIGINT, created_at TIMESTAMP, PRIMARY KEY (member_id, lecture_id))").update();
            jdbc.sql("CREATE TABLE outbox (id BIGINT AUTO_INCREMENT PRIMARY KEY, lecture_id BIGINT, member_id BIGINT, created_at TIMESTAMP, sent BOOLEAN DEFAULT FALSE NOT NULL)").update();
            dataSources.add(ds);
        }
        long[] lectures = {101, 102, 103, 104};
        for (long lecture : lectures) {
            JdbcClient.create(dataSources.get(router.shardOf(lecture)))
                    .sql("INSERT INTO lecture_seat VALUES (:id, :seats)")
                    .param("id", lecture).param("seats", lecture == 104 ? 1 : 30).update();
            System.out.printf("講座 %d → 分片 %d%n", lecture, router.shardOf(lecture));
        }
        System.out.printf("會員 7 → 分片 %d%n%n", router.shardOf(7));

        ShardedRegistrations registrations = new ShardedRegistrations(router, dataSources);
        LocalDateTime base = LocalDateTime.of(2026, 11, 22, 9, 0);
        long[][] requests = {{101, 7}, {102, 8}, {103, 7}, {104, 9}, {104, 7}, {101, 9}};
        for (int i = 0; i < requests.length; i++) {
            System.out.printf("講座 %d、會員 %d 報名：%s%n", requests[i][0], requests[i][1],
                    registrations.register(requests[i][0], requests[i][1], base.plusMinutes(i)) ? "成功" : "額滿");
        }
        try {
            registrations.register(101, 7, base.plusMinutes(10));
        } catch (DuplicateKeyException e) {
            System.out.println("講座 101、會員 7 重複報名：被主鍵擋下");
        }
        System.out.println("講座 101 剩餘名額：" + JdbcClient.create(dataSources.get(router.shardOf(101)))
                .sql("SELECT remaining FROM lecture_seat WHERE lecture_id = 101").query(Integer.class).single() + "（30 個名額，成功報名 2 人）");

        System.out.println();
        System.out.println("講座 101 的報名（1 個分片）：" + registrations.findByLecture(101).stream().map(r -> "會員 " + r.memberId()).toList());
        System.out.println("會員 7 的報名，outbox 轉送前：" + registrations.findByMember(7).stream().map(r -> "講座 " + r.lectureId()).toList());
        System.out.println("轉送 outbox 事件：" + registrations.relayOutbox() + " 筆");
        System.out.println("會員 7 的報名，outbox 轉送後：" + registrations.findByMember(7).stream().map(r -> "講座 " + r.lectureId()).toList());
        System.out.println("最新 3 筆報名（查詢 4 個分片後合併）：" + registrations.latest(3).stream()
                .map(r -> r.createdAt().toLocalTime() + " 講座 " + r.lectureId()).toList());
    }
}
```

</details>

```text
講座 101 → 分片 2
講座 102 → 分片 2
講座 103 → 分片 1
講座 104 → 分片 3
會員 7 → 分片 1

講座 101、會員 7 報名：成功
講座 102、會員 8 報名：成功
講座 103、會員 7 報名：成功
講座 104、會員 9 報名：成功
講座 104、會員 7 報名：額滿
講座 101、會員 9 報名：成功
講座 101、會員 7 重複報名：被主鍵擋下
講座 101 剩餘名額：28（30 個名額，成功報名 2 人）

講座 101 的報名（1 個分片）：[會員 7, 會員 9]
會員 7 的報名，outbox 轉送前：[]
轉送 outbox 事件：5 筆
會員 7 的報名，outbox 轉送後：[講座 101, 講座 103]
最新 3 筆報名（查詢 4 個分片後合併）：[09:05 講座 101, 09:03 講座 104, 09:02 講座 103]
```

- **報名是本地交易**：重複報名被 `registration` 的主鍵擋下，整個交易回滾，名額沒有被扣。主鍵 `(lecture_id, member_id)` 包含 shard key，唯一約束才有效
- **索引表是最終一致的**：outbox 轉送之前，「我的報名」是空的。報名成功的頁面不能依賴索引表，要直接顯示這次報名的結果
- **跨分片查詢**：「最新 3 筆報名」查了 4 個分片，每個分片各取 3 筆再合併。要第 100 頁（每頁 10 筆）時，每個分片都要回傳前 1,000 筆，4 個分片共 4,000 筆，只為了回傳 10 筆。後台的跨分片列表要用 keyset 分頁（[Index 篇](/post/systemdesign/index-btree/)），或乾脆交給搜尋引擎（[全文搜尋篇](/post/systemdesign/full-text-search/)）

### 3. 重新分片的流程

以 slot 為單位線上搬移：

1. 在新分片建立相同的表，複製這個 slot 的既有資料
2. 用 CDC 持續套用複製期間的新寫入，直到幾乎追上
3. 短暫停止這個 slot 的寫入，等最後的變更套用完成
4. 更新 slot 對照表，所有應用程式改用新的對照表
5. 恢復寫入；確認沒問題後，再清除舊分片上的資料

停止寫入的範圍只有一個 slot，時間只有幾秒。第 4 步要確保所有應用程式都拿到新的對照表，還在用舊表的那台會把資料寫回舊分片。

## 踩坑與 Gotchas

- **每個分片各自 `AUTO_INCREMENT`**：不同分片會產生相同的 ID。要用[分散式 ID](/post/systemdesign/distributed-id/)
- **改了雜湊函式**：等於所有資料重新分片。函式要固定，而且不同語言的服務要算出相同的結果
- **跨分片查詢沒有設逾時**：一個分片卡住，所有跨分片查詢跟著卡住。要設逾時，並決定逾時時是回傳部分結果還是整個失敗
- **schema 變更要套用到每個分片**：可能有幾台成功、幾台失敗，程式要能同時相容新舊兩種 schema
- **每個分片的備份時間點不同**：從備份還原時，分片之間的資料不一致，例如報名已還原、索引表還沒有
- **用分片解決單列熱點**：見上面的「單一熱點」。先確認瓶頸是整台機器，還是一列資料
- **太早分片**：分片數量從一開始就多，維運成本立刻翻倍。先用邏輯分片把 slot 對應到少數幾台實體資料庫，需要時再搬

### 資安相關

- **多租戶的隔離層級**：B2B 的企業客戶可以共用分片（每列帶 `tenant_id`），也可以有專屬的分片或資料庫。專屬分片能限制事故的影響範圍，大客戶的流量也不會拖慢別人，但**分片不等於授權**：每個查詢仍然要帶租戶條件，路由到正確的分片不代表這個使用者有權限讀這筆資料（Part 8 的 BOLA）
- **跨分片的管理查詢風險最高**：一般 API 只會碰到一個分片，後台的「查所有分片」等於一次讀出所有租戶的資料。這類查詢要有獨立的權限與稽核紀錄
- **熱點也能是攻擊**：攻擊者對同一個 key 灌入大量請求，壓垮的是整個分片，同一個分片上的其他租戶一起受影響。依 key 限流，並能把被攻擊的 slot 搬到隔離的機器
- **資料落地**：法規要求特定地區的資料存放在當地時，依地區分片，slot 對照表就成了合規的控制點，變更要經過審核並留下紀錄
- **刪除要涵蓋所有副本**：刪除會員的個資時，除了主要分片，還有其他分片上的索引表、outbox、備份，都要涵蓋

## 何時用／何時別用

- **用分片**：寫入量或資料量超過單台主機，而且垂直擴展、歸檔、分割表、功能拆分都已經用過
- **別用**：讀取才是瓶頸（用 replica 與快取）；資料量還在單台主機能處理的範圍內；最重要的查詢與交易無法對應到同一個 shard key
- **考慮分散式 SQL**：需要大量跨分片交易時，Spanner、CockroachDB、TiDB 這類資料庫把分片與跨分片交易都做在資料庫內部，代價是每次寫入多一輪跨節點的協調

## 參考資料

- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017，第 6 章 Partitioning
- Jeffrey Dean, Luiz André Barroso, "The Tail at Scale", *Communications of the ACM*, 2013
- MySQL 8.4 Reference Manual — Partitioning Keys, Primary Keys, and Unique Keys：<https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html>
- Vitess：<https://vitess.io/docs/>
- Citus：<https://docs.citusdata.com/>
- Apache ShardingSphere：<https://shardingsphere.apache.org/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
