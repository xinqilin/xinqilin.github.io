---
title: "分散式 ID：UUIDv7、Snowflake 與號段模式，主鍵的排序、大小與洩漏的資訊"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 4：實測隨機與時間有序主鍵對 B+Tree 的影響，比較 UUIDv7、Snowflake 與號段模式的取捨，並示範公開的 ID 會洩漏多少業務量與時間資訊"
categories: ["SystemDesign"]
tags: ["System Design", "Distributed ID", "UUIDv7", "Snowflake", "Hibernate", "MySQL", "Security"]
---

> **System Design 系列** Part 4-4｜上一篇：[Consistent Hashing](/post/systemdesign/consistent-hashing/)｜下一篇：[CAP 與 PACELC](/post/systemdesign/cap-pacelc/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

[Sharding 篇](/post/systemdesign/sharding/)把報名資料分到 16 個分片之後，每個分片各自的 `AUTO_INCREMENT` 都從 1 開始，不同分片出現了相同的報名編號。新的 ID 方案要滿足：

1. **全域唯一**：任何分片、任何機器產生的 ID 都不能重複
2. **大致遞增**：新資料插在 B+Tree 的右邊，維持寫入效能（[Index 篇](/post/systemdesign/index-btree/)）
3. **不依賴單點**：產生 ID 不能讓某一台機器成為瓶頸或單點故障，尖峰每秒 2 萬筆
4. **夠小**：主鍵會複製到每一個二級索引裡，越小越好；如果要給前端使用，最好不要超過 JavaScript 能精確表示的整數範圍
5. **不洩漏資訊**：對外公開的 ID 不能讓人推算出業務量

這五點沒有一個方案能全部滿足，這篇的重點是取捨。

## 最簡單的做法與它的極限

- **單一資料庫發號**：所有分片都向同一個資料庫的 `AUTO_INCREMENT` 要 ID，等於把單點又加了回來，每次寫入還要多一次網路往返
- **每個分片不同的起點與步長**：MySQL 的 `auto_increment_increment = 16`、`auto_increment_offset = 1..16`，第一個分片產生 1、17、33…，第二個產生 2、18、34…。簡單有效，但分片數量寫死在設定裡，重新分片時步長也要跟著改
- **UUIDv4**：每台機器自己產生，不需要任何協調，但完全隨機。下面的實測說明它對索引的影響

## 核心機制

### 隨機與時間有序：實測主鍵的插入

用簡化的 InnoDB 葉節點層模擬插入 200 萬筆：頁面 16 KB、填到 15/16 就分裂、每列除了主鍵還有 150 bytes 的資料、buffer pool 只放得下 3,000 頁（約 47 MB）。分裂規則仿照 InnoDB：新的一筆緊接在上次插入的那一筆之後時，從插入點分裂（舊頁保持全滿），否則對半分裂。UUIDv7 用 Hibernate 7.4 的實作產生：

<details>
<summary>模擬程式（<code>IdIndexSimulation.java</code>）</summary>

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.IntFunction;
import org.hibernate.id.uuid.UuidVersion7Strategy;

/**
 * 簡化的 InnoDB 叢集索引葉節點層：16 KB 頁面、填到 15/16 就分裂，buffer pool 只放得下 3,000 頁。比較四種主鍵的插入行為。
 * 分裂規則仿照 InnoDB：新的一筆緊接在這一頁上次插入的那一筆之後時，從插入點分裂；否則對半分裂。
 */
public class IdIndexSimulation {

    static final int ROWS = 2_000_000;
    static final int USABLE_BYTES = 16 * 1024 * 15 / 16;
    static final int PAYLOAD_BYTES = 150;                           // 主鍵以外的欄位
    static final int BUFFER_POOL_PAGES = 3_000;

    record Key(long hi, long lo) implements Comparable<Key> {
        public int compareTo(Key o) {
            int c = Long.compareUnsigned(hi, o.hi);
            return c != 0 ? c : Long.compareUnsigned(lo, o.lo);
        }
    }

    static final class Page {
        final List<Key> keys = new ArrayList<>();
        final int id;
        Key lastInserted;
        Page(int id) {
            this.id = id;
        }
    }

    public static void main(String[] args) {
        UuidVersion7Strategy[] v7 = new UuidVersion7Strategy[4];  // 4 台應用伺服器各自產生，交錯寫入
        for (int i = 0; i < v7.length; i++) {
            v7[i] = new UuidVersion7Strategy();
        }
        System.out.println("主鍵                  主鍵大小  葉節點頁數  平均填充率  頁面分裂  每千筆插入的 buffer pool miss");
        run("AUTO_INCREMENT", 8, i -> new Key(i + 1, 0));
        Random random = new Random(42);
        int[] workerOrder = {0, 1, 2, 3};
        run("Snowflake（4 台）", 8, i -> {
            long ms = i / 4;                                        // 每毫秒 4 筆，每台各 1 筆，到達順序隨機
            if (i % 4 == 0) {
                shuffle(workerOrder, random);
            }
            return new Key((ms << 22) | ((long) workerOrder[i % 4] << 12), 0);
        });
        run("UUIDv7（4 台）", 16, i -> uuid(v7[i % 4].generateUuid(null)));
        run("UUIDv4", 16, i -> uuid(UUID.randomUUID()));
    }

    static void shuffle(int[] a, Random random) {
        for (int i = a.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
    }

    static Key uuid(UUID u) {
        return new Key(u.getMostSignificantBits(), u.getLeastSignificantBits());
    }

    static void run(String label, int keyBytes, IntFunction<Key> ids) {
        int capacity = USABLE_BYTES / (keyBytes + PAYLOAD_BYTES);
        TreeMap<Key, Page> tree = new TreeMap<>();                 // 每頁的最小 key → 頁面
        LinkedHashMap<Integer, Boolean> bufferPool = new LinkedHashMap<>(BUFFER_POOL_PAGES, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Boolean> eldest) {
                return size() > BUFFER_POOL_PAGES;
            }
        };
        int[] nextPageId = {0};
        long misses = 0;
        long splits = 0;
        for (int i = 0; i < ROWS; i++) {
            Key key = ids.apply(i);
            Map.Entry<Key, Page> entry = tree.floorEntry(key);
            Page page;
            if (entry == null) {
                page = tree.isEmpty() ? new Page(nextPageId[0]++) : tree.firstEntry().getValue();
                if (!tree.isEmpty()) {
                    tree.remove(tree.firstKey());
                }
                tree.put(key, page);
            } else {
                page = entry.getValue();
            }
            misses += bufferPool.put(page.id, Boolean.TRUE) == null ? 1 : 0;
            int index = -Collections.binarySearch(page.keys, key) - 1;
            boolean rightward = index > 0 && page.keys.get(index - 1).equals(page.lastInserted);
            page.keys.add(index, key);
            page.lastInserted = key;
            if (page.keys.size() > capacity) {
                splits++;
                int from = rightward ? index : page.keys.size() / 2;
                Page right = new Page(nextPageId[0]++);           // 往右插入：比新資料小的留在舊頁，舊頁保持接近全滿
                right.lastInserted = key;
                right.keys.addAll(page.keys.subList(from, page.keys.size()));
                page.keys.subList(from, page.keys.size()).clear();
                tree.put(right.keys.get(0), right);
                bufferPool.put(right.id, Boolean.TRUE);
            }
        }
        double fill = (double) ROWS / ((long) tree.size() * capacity);
        System.out.printf("%-18s %6d B %,11d %10.0f%% %,9d %16.1f%n",
                label, keyBytes, tree.size(), fill * 100, splits, misses * 1000.0 / ROWS);
    }
}
```

</details>

```text
主鍵                  主鍵大小  葉節點頁數  平均填充率  頁面分裂  每千筆插入的 buffer pool miss
AUTO_INCREMENT          8 B      20,619        100%    20,618              0.0
Snowflake（4 台）          8 B      36,380         57%    36,379              0.0
UUIDv7（4 台）            16 B      35,001         62%    35,000              0.0
UUIDv4                 16 B      31,420         69%    31,419            672.7
```

- **buffer pool miss 是最大的差距**：UUIDv4 插入的位置是隨機的，索引大過 buffer pool 之後，每 1,000 筆插入有 673 次要從磁碟讀進一個頁面。以每秒 4,000 筆寫入計算，光是葉節點就要每秒 2,700 次隨機讀取。時間有序的 ID 永遠插在最右邊，最右邊的頁面一直在記憶體裡，miss 是 0
- **UUIDv4 的填充率 69%**，和隨機插入 B-Tree 的理論值 ln 2 ≈ 69% 相符，同樣的資料要多用約 45% 的頁面
- **嚴格遞增的 `AUTO_INCREMENT` 填滿每一頁**
- **多台交錯產生的 Snowflake 與 UUIDv7 只填到 57% 到 62%**：4 台機器的 ID 交錯到達，新的一筆常常不是緊接在上一筆之後，於是對半分裂，左半頁之後再也不會有新資料插進去。這是簡化模型的結果，實際的填充率取決於資料庫的分裂策略（InnoDB 還有往左插入的判斷），但「大致遞增」不等於「嚴格遞增」這件事要記得。對寫入效能影響最大的 buffer pool miss，它們和 `AUTO_INCREMENT` 一樣是 0
- **主鍵大小**：InnoDB 的每一個二級索引都存著主鍵。16 bytes 的 UUID 比 8 bytes 的 `BIGINT` 每個索引項多 8 bytes，有 5 個二級索引、30 億筆資料，就多了約 120 GB

### Snowflake

64 bits 的整數，由三段組成：

| 位元 | 內容 | 範圍 |
|---|---|---|
| 1 | 符號位，固定為 0 | |
| 41 | 自訂起點以來的毫秒數 | 2^41 毫秒約 69.7 年 |
| 10 | 機器編號 | 1,024 台 |
| 12 | 同一毫秒內的序號 | 每台每毫秒 4,096 個 |

優點是 64 bits、時間有序、每台機器自己產生。代價是兩個要自己管理的東西：

- **機器編號**：兩台機器拿到相同的編號，就會產生相同的 ID。在 Kubernetes 上，Pod 隨時會被重建，編號要從 StatefulSet 的序號、或資料庫與 ZooKeeper 的租約取得
- **時鐘回撥**：NTP 校正讓系統時間倒退時，新的時間戳可能和之前的重複。要偵測回撥，小幅回撥時等待，大幅回撥時拒絕發號

這兩點的完整實作在 [Snowflake 演算法與企業級實現](/post/architecture/snowflake-distributed-id/)。

### UUIDv7 與 ULID

RFC 9562（2024 年）定義的 UUIDv7 是 128 bits：前 48 bits 是 Unix 毫秒時間戳，其餘大部分是隨機數。Hibernate 7.4 的實作在時間戳之後放了 12 bits 的次毫秒時間與 62 bits 的隨機數，同一台機器產生的 ID 嚴格遞增。

它和 Snowflake 一樣時間有序，但**不需要機器編號**：隨機數的部分夠大，不同機器在同一毫秒內產生相同 ID 的機率可以忽略。代價是 128 bits，比 Snowflake 大一倍。PostgreSQL 18 起內建 `uuidv7()`。ULID 是相同概念的另一種格式（48 bits 時間 + 80 bits 隨機數，26 個字元的 base32 字串），在 UUIDv7 標準化之前就被廣泛使用。

### 號段模式

資料庫只負責「發號段」：每台應用伺服器一次向資料庫取 1,000 個 ID，在記憶體裡一個一個發，用完再取下一段。

- 資料庫每 1,000 個 ID 才被存取一次，負載很低
- 資料庫短暫故障時，手上剩下的號段還能撐一段時間。常見的優化是剩下 10% 時就在背景預先取下一段（雙緩衝）
- 產生的是 64 bits 的整數，每台機器內遞增，全域大致遞增
- 機器重啟時，沒發完的號段就浪費了，ID 會有缺口

## 方案比較

| | 大小 | 排序 | 需要協調 | 依賴 | 洩漏的資訊 |
|---|---|---|---|---|---|
| 單一資料庫 `AUTO_INCREMENT` | 8 B | 嚴格遞增 | 每個 ID 都要 | 單一資料庫 | 總數與成長速度 |
| 分片起點與步長 | 8 B | 各分片內遞增 | 否 | 分片數量寫死 | 總數與成長速度 |
| UUIDv4 | 16 B | 隨機 | 否 | 無 | 無 |
| UUIDv7 | 16 B | 大致遞增 | 否 | 時鐘 | 建立時間 |
| Snowflake | 8 B | 大致遞增 | 分配機器編號 | 時鐘、機器編號 | 建立時間、機器、每毫秒的量 |
| 號段模式 | 8 B | 大致遞增 | 每個號段一次 | 資料庫（有緩衝） | 總數與成長速度 |

選擇的方向：

- **不想管任何基礎設施**：UUIDv7，用 16 bytes 換掉機器編號與發號服務
- **需要 64 bits**（例如 ID 要放進既有的 `BIGINT` 欄位、或二級索引很多）：Snowflake 或號段模式。已經有可靠的資料庫時，號段模式最簡單；不想讓發號依賴資料庫時，用 Snowflake
- **ID 會公開**：不管內部用哪一種，對外都另外給一個隨機的 ID（見資安相關）

## Java 落地

### 1. JPA 主鍵用 UUIDv7

Hibernate 7 的 `@UuidGenerator` 可以直接指定 version 7。MySQL 沒有原生的 UUID 型別，存成 `BINARY(16)`，不要用 `CHAR(36)`：字串形式至少 36 bytes，而且二級索引裡的每一項都要帶著它。

```java
package entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
public class Registration {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    private long lectureId;
    private long memberId;

    protected Registration() {
    }

    public Registration(long lectureId, long memberId) {
        this.lectureId = lectureId;
        this.memberId = memberId;
    }

    public UUID getId() {
        return id;
    }
}
```

### 2. 號段模式

```java
package idgen;

import java.util.concurrent.locks.ReentrantLock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

/** 號段模式：每次向資料庫取一段 ID（例如 1,000 個），在記憶體裡發完再取下一段。 */
public class SegmentIdGenerator {

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final String bizTag;
    private final int step;
    private final ReentrantLock lock = new ReentrantLock();        // 取號段會做 I/O，用 ReentrantLock 避免 virtual thread 被 pin 住
    private long next;
    private long end;

    public SegmentIdGenerator(JdbcClient jdbc, TransactionTemplate tx, String bizTag, int step) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.bizTag = bizTag;
        this.step = step;
    }

    public long nextId() {
        lock.lock();
        try {
            if (next == end) {
                allocate();
            }
            return next++;
        } finally {
            lock.unlock();
        }
    }

    /** UPDATE 的列鎖讓多台機器的取號依序進行，每台拿到不重疊的區間 (max_id - step, max_id]。 */
    private void allocate() {
        long maxId = tx.execute(status -> {
            jdbc.sql("UPDATE id_segment SET max_id = max_id + :step WHERE biz_tag = :tag")
                    .param("step", step)
                    .param("tag", bizTag)
                    .update();
            return jdbc.sql("SELECT max_id FROM id_segment WHERE biz_tag = :tag")
                    .param("tag", bizTag)
                    .query(Long.class)
                    .single();
        });
        next = maxId - step + 1;
        end = maxId + 1;
    }
}
```

對應的資料表只有一列：

```sql
CREATE TABLE id_segment (
    biz_tag VARCHAR(32) PRIMARY KEY,
    max_id  BIGINT NOT NULL
);
INSERT INTO id_segment VALUES ('registration', 0);
```

3 台應用伺服器共用同一個 H2 資料庫，各用 4 個執行緒同時取號：

<details>
<summary>驗證程式（<code>SegmentDemo.java</code>）</summary>

```java
package idgen;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

/** 3 台應用伺服器共用同一個資料庫，各用 4 個執行緒同時取號。 */
public class SegmentDemo {

    record Issued(long sequence, String instance, long id) {}

    public static void main(String[] args) {
        DriverManagerDataSource ds = new DriverManagerDataSource("jdbc:h2:mem:ids;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000", "sa", "");
        JdbcClient jdbc = JdbcClient.create(ds);
        jdbc.sql("CREATE TABLE id_segment (biz_tag VARCHAR(32) PRIMARY KEY, max_id BIGINT NOT NULL)").update();
        jdbc.sql("INSERT INTO id_segment VALUES ('registration', 0)").update();
        TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(ds));

        ConcurrentLinkedQueue<Issued> issued = new ConcurrentLinkedQueue<>();
        java.util.concurrent.atomic.AtomicLong clock = new java.util.concurrent.atomic.AtomicLong();
        try (ExecutorService executor = Executors.newFixedThreadPool(12)) {
            for (String instance : List.of("app-a", "app-b", "app-c")) {
                SegmentIdGenerator generator = new SegmentIdGenerator(jdbc, tx, "registration", 1_000);
                for (int t = 0; t < 4; t++) {
                    executor.submit(() -> {
                        for (int i = 0; i < 10_000; i++) {
                            long id = generator.nextId();
                            issued.add(new Issued(clock.incrementAndGet(), instance, id));
                        }
                    });
                }
            }
        }

        List<Issued> all = new ArrayList<>(issued);
        all.sort((a, b) -> Long.compare(a.sequence(), b.sequence()));
        Set<Long> unique = new HashSet<>();
        all.forEach(i -> unique.add(i.id()));
        long inversions = 0;
        for (int i = 1; i < all.size(); i++) {
            inversions += all.get(i).id() < all.get(i - 1).id() ? 1 : 0;
        }
        long maxId = jdbc.sql("SELECT max_id FROM id_segment WHERE biz_tag = 'registration'").query(Long.class).single();
        System.out.printf("發出 %,d 個 ID，不重複的 %,d 個，資料庫取號 %d 次%n", all.size(), unique.size(), maxId / 1_000);
        System.out.printf("依發出的先後順序，比前一個 ID 小的比例：%.1f%%%n", 100.0 * inversions / (all.size() - 1));
        for (String instance : List.of("app-a", "app-b", "app-c")) {
            System.out.println(instance + " 最先發出的 3 個 ID：" + all.stream()
                    .filter(i -> i.instance().equals(instance)).limit(3).map(Issued::id).toList());
        }
    }
}
```

</details>

```text
發出 120,000 個 ID，不重複的 120,000 個，資料庫取號 120 次
依發出的先後順序，比前一個 ID 小的比例：2.7%
app-a 最先發出的 3 個 ID：[2001, 2002, 2003]
app-b 最先發出的 3 個 ID：[1001, 1002, 1003]
app-c 最先發出的 3 個 ID：[1, 3, 4]
```

- 12 萬個 ID 全部不重複，資料庫只被存取 120 次
- 每台在自己的號段內遞增，但三台交錯發號，全域的順序只是大致遞增。依發出的先後看，有 2.7% 的 ID 比前一個小
- 三台各自拿到不同的號段（1、1001、2001 開頭），這是 `UPDATE` 的列鎖讓取號依序進行的結果

### 3. Snowflake

機器編號的分配與時鐘回撥的處理，見 [Snowflake 演算法與企業級實現](/post/architecture/snowflake-distributed-id/)。

## 踩坑與 Gotchas

- **64 bits 的 ID 傳給 JavaScript**：JavaScript 的 `Number` 只能精確表示到 2^53（約 9 × 10^15）。下面的 Snowflake ID `912145357725569027` 轉成 `Number` 後變成 `912145357725569024`，畫面上顯示為 `912145357725569000`，用它查詢就找不到資料。JSON 裡的 64 bits ID 一律用字串
- **時鐘回撥**：Snowflake 與 UUIDv7 都依賴系統時間。Hibernate 的 UUIDv7 在同一個 JVM 內保證遞增，但不同機器之間的時鐘誤差，會讓 ID 的順序和實際的發生順序不一致。**不要用 ID 的大小判斷事件的先後**
- **機器編號重複**：兩個 Pod 拿到相同的 Snowflake 機器編號，就會產生重複的 ID。重複時，後寫入的資料可能覆蓋前一筆，或被主鍵擋下而失敗
- **UUID 存成 `CHAR(36)`**：比 `BINARY(16)` 大一倍以上。MySQL 用 `UUID_TO_BIN()` 轉換；它的 swap flag 是為 UUIDv1 調整位元順序用的，UUIDv7 本來就是時間在前，不要再交換
- **號段模式的 ID 有缺口**：重啟、擴容都會跳號。發票號碼這類法規要求連續的編號，要另外用資料庫的序號產生
- **分片起點與步長寫死**：從 16 個分片擴充到 32 個時，所有分片的步長都要改，而且新舊 ID 不能衝突

### 資安相關

- **ID 不是授權**：知道一筆報名的 ID，不代表有權限看它。可預測的 ID 讓攻擊者可以逐一嘗試，但就算 ID 不可預測，授權檢查也不能省略（Part 8 的 BOLA）
- **ID 會洩漏資訊**：攻擊者只拿到自己訂單的 ID，能推算出什麼：

  <details>
  <summary>示範程式（<code>IdLeakDemo.java</code>）</summary>

  ```java
  package idgen;

  import java.time.Instant;
  import java.time.ZoneId;
  import java.util.UUID;
  import org.hibernate.id.uuid.UuidVersion7Strategy;

  /** 攻擊者只拿到自己訂單的 ID，能推算出什麼。 */
  public class IdLeakDemo {

      static final long SNOWFLAKE_EPOCH = Instant.parse("2020-01-01T00:00:00Z").toEpochMilli();
      static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");

      public static void main(String[] args) {
          long yesterday = 1_203_551;
          long today = 1_215_907;
          System.out.printf("AUTO_INCREMENT：昨天 10:00 的訂單 #%d、今天 10:00 的訂單 #%d → 一天約 %,d 筆訂單%n",
                  yesterday, today, today - yesterday);

          long issuedAt = Instant.parse("2026-11-22T01:00:00.123Z").toEpochMilli() - SNOWFLAKE_EPOCH;
          long snowflake = (issuedAt << 22) | (17L << 12) | 3;         // 41 bits 時間、10 bits 機器、12 bits 序號；攻擊者只看得到這個數字
          long millis = (snowflake >>> 22) + SNOWFLAKE_EPOCH;
          System.out.printf("Snowflake %d → 建立於 %s、機器編號 %d、該毫秒內第 %d 個%n", snowflake,
                  Instant.ofEpochMilli(millis).atZone(TAIPEI).toLocalDateTime(), (snowflake >>> 12) & 0x3FF, snowflake & 0xFFF);

          UUID v7 = UuidVersion7Strategy.INSTANCE.generateUuid(null);
          System.out.printf("UUIDv7 %s → 建立於 %s%n", v7,
                  Instant.ofEpochMilli(v7.getMostSignificantBits() >>> 16).atZone(TAIPEI).toLocalDateTime());

          System.out.printf("UUIDv4 %s → 122 bits 隨機，沒有可推算的資訊%n", UUID.randomUUID());
      }
  }
  ```

  </details>

  ```text
  AUTO_INCREMENT：昨天 10:00 的訂單 #1203551、今天 10:00 的訂單 #1215907 → 一天約 12,356 筆訂單
  Snowflake 912145357725569027 → 建立於 2026-11-22T09:00:00.123、機器編號 17、該毫秒內第 3 個
  UUIDv7 01a20398-59fb-7220-a7b7-124383ab79db → 建立於 2026-11-22T22:10:45.883
  UUIDv4 b79a18d2-0a3d-4507-bd15-54a1f17fa16a → 122 bits 隨機，沒有可推算的資訊
  ```

  連續的 `AUTO_INCREMENT` 讓競爭對手每天下一張訂單，就能算出平台每天的訂單量；Snowflake 洩漏建立時間、機器數量與每毫秒的量；UUIDv7 洩漏建立的毫秒數，PostgreSQL 的 `uuid_extract_timestamp()` 一行就能取出。對「匿名檢舉」這類資料，建立時間本身就是敏感資訊
- **內部 ID 與公開 ID 分開**：資料表用時間有序的 ID 當主鍵，另外加一個 UUIDv4 欄位（加唯一索引）給 URL 與 API 使用。對外只出現 UUIDv4，內部的效能與外部的不可預測性兩者都顧到
- **UUIDv7 不能當秘密**：密碼重設、邀請連結這類「知道就能用」的 token，要用 `SecureRandom` 產生至少 128 bits 的隨機值。UUIDv7 的時間部分可以預測，Hibernate 的實作只有 62 bits 是隨機的

## 何時用／何時別用

- **UUIDv7**：新系統的預設選擇，不需要額外的基礎設施
- **Snowflake**：需要 64 bits、寫入量大、不希望發號依賴資料庫
- **號段模式**：已經有可靠的資料庫，需要 64 bits，想要最簡單的實作
- **UUIDv4**：對外公開的 ID、不需要排序的資料
- **別用 ID 做**：授權、事件排序、計數、需要連續編號的業務號碼

## 參考資料

- RFC 9562, "Universally Unique IDentifiers (UUIDs)", 2024：<https://www.rfc-editor.org/rfc/rfc9562>
- Twitter Snowflake（已封存）：<https://github.com/twitter-archive/snowflake>
- ULID Specification：<https://github.com/ulid/spec>
- 美團 Leaf：<https://github.com/Meituan-Dianping/Leaf>
- Andrew Chi-Chih Yao, "On Random 2–3 Trees", *Acta Informatica*, 1978
- MySQL 8.4 Reference Manual — `UUID_TO_BIN()`：<https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html>
- PostgreSQL Documentation — UUID Functions：<https://www.postgresql.org/docs/current/functions-uuid.html>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
