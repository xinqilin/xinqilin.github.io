---
title: "交易與隔離等級：MVCC、Lost Update、Write Skew 與 Spring 的交易邊界"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 3：以活動報名實測 lost update 與 write skew，比較條件式 UPDATE、悲觀鎖、樂觀鎖與唯一約束，並說明各資料庫隔離等級的差異與 Spring 交易邊界"
categories: ["SystemDesign"]
tags: ["System Design", "Transaction", "Isolation Level", "MVCC", "MySQL", "PostgreSQL", "Spring"]
---

> **System Design 系列** Part 3-4｜上一篇：[B-Tree vs LSM-Tree](/post/systemdesign/btree-vs-lsm/)｜下一篇：[檔案與物件儲存](/post/systemdesign/object-storage/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

[導讀篇](/post/systemdesign/system-design-thinking/)的年度講座報名上線前，需求又多了幾條：

1. 名額不能超賣
2. 講座分上午、下午場，**同一位會員同一時段只能報名一場**
3. 主辦方可以臨時加開名額
4. 報名成功要寄確認信

QA 壓測後回報三個問題：3,000 個名額卻有 3,012 筆報名；有會員在同一時段報了兩場；主辦方把上限從 3,000 改成 3,500 之後，剩餘名額對不上。程式碼每一行看起來都沒錯，而且全都包在 `@Transactional` 裡。

`@Transactional` 不代表沒有並行問題。交易保證什麼、不保證什麼，取決於隔離等級，以及程式**怎麼讀、怎麼寫**。

## 最簡單的做法與它的極限

最直覺的寫法是「先讀出來、在 Java 判斷、再寫回去」。兩個請求同時進來時，時間軸是這樣：

| 時間 | 交易 A（會員 101） | 交易 B（會員 102） |
|---|---|---|
| t1 | `SELECT remaining` → 1 | |
| t2 | | `SELECT remaining` → 1 |
| t3 | `UPDATE ... SET remaining = 0`、新增報名、`COMMIT` | |
| t4 | | `UPDATE ... SET remaining = 0`、新增報名、`COMMIT` |

兩個交易都讀到「還有 1 個名額」，都報名成功，`remaining` 卻只被扣了一次：A 的扣減被 B 覆蓋掉了。這叫 **lost update**。

「同一時段只能報名一場」也有一樣的問題：會員 7 同時送出上午場兩個不同講座的報名，兩個交易各自查詢「會員 7 上午場有沒有報名」都得到「沒有」，於是各自新增一筆。

實際用兩條執行緒、兩個連線同時跑看看。下面的程式除了這兩種寫法，也一併跑了後面會介紹的修正方式：

<details>
<summary>實測程式（H2 記憶體資料庫，READ COMMITTED；<code>java -cp h2.jar RegistrationRaceDemo.java</code>）</summary>

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** 兩個交易同時報名，比較不同寫法的結果。使用 H2 記憶體資料庫，隔離等級 READ COMMITTED。 */
public class RegistrationRaceDemo {

    static final String URL = "jdbc:h2:mem:race;DB_CLOSE_DELAY=-1";

    interface Attempt {
        String run(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception;
    }

    public static void main(String[] args) throws Exception {
        execute("CREATE TABLE event (id BIGINT PRIMARY KEY, slot VARCHAR(20) NOT NULL,"
                + " remaining INT NOT NULL, version INT NOT NULL)");
        execute("CREATE TABLE registration (event_id BIGINT NOT NULL, member_id BIGINT NOT NULL, slot VARCHAR(20) NOT NULL)");

        System.out.println("名額只剩 1 個，會員 101 與 102 同時報名同一場：");
        seatRace("先讀再寫", RegistrationRaceDemo::readModifyWrite);
        seatRace("條件式 UPDATE", RegistrationRaceDemo::conditionalUpdate);
        seatRace("SELECT ... FOR UPDATE", RegistrationRaceDemo::selectForUpdate);
        seatRace("樂觀鎖（version）+ 重試", RegistrationRaceDemo::optimistic);

        System.out.println();
        System.out.println("會員 7 同時報名同一時段的兩場活動（規則：同一時段只能報名一場）：");
        slotRace("先查詢再新增", false);
        slotRace("加上 UNIQUE (member_id, slot)", true);
    }

    // ---- 寫法一：先讀再寫 ----
    static String readModifyWrite(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception {
        int remaining = queryInt(c, "SELECT remaining FROM event WHERE id = ?", eventId);
        together.await(5, TimeUnit.SECONDS);                  // 兩邊都讀完才開始寫
        if (remaining <= 0) {
            return "額滿";
        }
        update(c, "UPDATE event SET remaining = ? WHERE id = ?", remaining - 1, eventId);
        register(c, memberId, eventId);
        c.commit();
        return "報名成功";
    }

    // ---- 寫法二：把檢查和修改合成一個 UPDATE ----
    static String conditionalUpdate(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception {
        together.await(5, TimeUnit.SECONDS);
        int updated = update(c, "UPDATE event SET remaining = remaining - 1"
                + " WHERE id = ? AND remaining > 0", eventId);
        if (updated == 0) {
            c.rollback();
            return "額滿";
        }
        register(c, memberId, eventId);
        c.commit();
        return "報名成功";
    }

    // ---- 寫法三：讀取時就鎖住那一列 ----
    static String selectForUpdate(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception {
        together.await(5, TimeUnit.SECONDS);
        int remaining = queryInt(c, "SELECT remaining FROM event WHERE id = ? FOR UPDATE", eventId);
        if (remaining <= 0) {
            c.rollback();
            return "額滿";
        }
        update(c, "UPDATE event SET remaining = ? WHERE id = ?", remaining - 1, eventId);
        register(c, memberId, eventId);
        c.commit();
        return "報名成功";
    }

    // ---- 寫法四：樂觀鎖，寫入時確認版本沒變，變了就重來 ----
    static String optimistic(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception {
        for (int attempt = 1; attempt <= 3; attempt++) {
            int[] row = queryInts(c, "SELECT remaining, version FROM event WHERE id = ?", eventId);
            int remaining = row[0];
            int version = row[1];
            if (attempt == 1) {
                together.await(5, TimeUnit.SECONDS);
            }
            if (remaining <= 0) {
                c.rollback();
                return "額滿（第 " + attempt + " 次嘗試）";
            }
            int updated = update(c, "UPDATE event SET remaining = ?, version = version + 1"
                    + " WHERE id = ? AND version = ?", remaining - 1, eventId, version);
            if (updated == 1) {
                register(c, memberId, eventId);
                c.commit();
                return "報名成功（第 " + attempt + " 次嘗試）";
            }
            c.rollback();                                     // 版本已被別人改過：放棄這次，重新讀取
        }
        return "重試次數用完";
    }

    // ---- 同一時段只能報名一場 ----
    static String checkThenInsert(Connection c, long memberId, long eventId, CyclicBarrier together) throws Exception {
        String slot = queryString(c, "SELECT slot FROM event WHERE id = ?", eventId);
        int existing = queryInt(c, "SELECT COUNT(*) FROM registration WHERE member_id = ? AND slot = ?", memberId, slot);
        together.await(5, TimeUnit.SECONDS);                  // 兩邊都檢查完才開始寫
        if (existing > 0) {
            return "時段衝突";
        }
        register(c, memberId, eventId);
        c.commit();
        return "報名成功";
    }

    static void seatRace(String title, Attempt attempt) throws Exception {
        execute("DELETE FROM registration");
        execute("DELETE FROM event");
        execute("INSERT INTO event VALUES (42, 'SAT-AM', 1, 0)");
        List<String> results = race(attempt, new long[][] {{101, 42}, {102, 42}});
        System.out.printf("  %s：%s｜剩餘名額 %d｜報名 %d 筆%n", title, results,
                scalar("SELECT remaining FROM event WHERE id = 42"), scalar("SELECT COUNT(*) FROM registration"));
    }

    static void slotRace(String title, boolean uniqueConstraint) throws Exception {
        execute("DELETE FROM registration");
        execute("DELETE FROM event");
        execute("INSERT INTO event VALUES (42, 'SAT-AM', 100, 0), (43, 'SAT-AM', 100, 0)");
        execute(uniqueConstraint
                ? "CREATE UNIQUE INDEX IF NOT EXISTS uk_member_slot ON registration (member_id, slot)"
                : "DROP INDEX IF EXISTS uk_member_slot");
        List<String> results = race(RegistrationRaceDemo::checkThenInsert, new long[][] {{7, 42}, {7, 43}});
        System.out.printf("  %s：%s｜會員 7 在 SAT-AM 有 %d 筆報名%n", title, results,
                scalar("SELECT COUNT(*) FROM registration WHERE member_id = 7 AND slot = 'SAT-AM'"));
    }

    static List<String> race(Attempt attempt, long[][] requests) throws Exception {
        CyclicBarrier together = new CyclicBarrier(requests.length);
        ExecutorService pool = Executors.newFixedThreadPool(requests.length);
        try {
            List<Future<String>> futures = new ArrayList<>();
            for (long[] request : requests) {
                futures.add(pool.submit(() -> {
                    try (Connection c = DriverManager.getConnection(URL)) {
                        c.setAutoCommit(false);
                        c.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
                        try {
                            return attempt.run(c, request[0], request[1], together);
                        } catch (SQLException e) {
                            c.rollback();
                            return "失敗（SQLState " + e.getSQLState() + "）";
                        }
                    }
                }));
            }
            List<String> results = new ArrayList<>();
            for (Future<String> future : futures) {
                results.add(future.get(10, TimeUnit.SECONDS));
            }
            results.sort(null);
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    static void register(Connection c, long memberId, long eventId) throws SQLException {
        update(c, "INSERT INTO registration (event_id, member_id, slot) SELECT id, ?, slot FROM event WHERE id = ?",
                memberId, eventId);
    }

    static int update(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(c, sql, params)) {
            return ps.executeUpdate();
        }
    }

    static int queryInt(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(c, sql, params); ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getInt(1);
        }
    }

    static int[] queryInts(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(c, sql, params); ResultSet rs = ps.executeQuery()) {
            rs.next();
            return new int[] {rs.getInt(1), rs.getInt(2)};
        }
    }

    static String queryString(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(c, sql, params); ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getString(1);
        }
    }

    static PreparedStatement prepare(Connection c, String sql, Object... params) throws SQLException {
        PreparedStatement ps = c.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            ps.setObject(i + 1, params[i]);
        }
        return ps;
    }

    static void execute(String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
            s.execute(sql);
        }
    }

    static int scalar(String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL)) {
            return queryInt(c, sql);
        }
    }
}
```

</details>

```text
名額只剩 1 個，會員 101 與 102 同時報名同一場：
  先讀再寫：[報名成功, 報名成功]｜剩餘名額 0｜報名 2 筆
  條件式 UPDATE：[報名成功, 額滿]｜剩餘名額 0｜報名 1 筆
  SELECT ... FOR UPDATE：[報名成功, 額滿]｜剩餘名額 0｜報名 1 筆
  樂觀鎖（version）+ 重試：[報名成功（第 1 次嘗試）, 額滿（第 2 次嘗試）]｜剩餘名額 0｜報名 1 筆

會員 7 同時報名同一時段的兩場活動（規則：同一時段只能報名一場）：
  先查詢再新增：[報名成功, 報名成功]｜會員 7 在 SAT-AM 有 2 筆報名
  加上 UNIQUE (member_id, slot)：[報名成功, 失敗（SQLState 23505）]｜會員 7 在 SAT-AM 有 1 筆報名
```

連續執行五次結果都一樣。`CyclicBarrier` 讓兩邊都讀完才開始寫，等於把競態發生的時間窗撐大；正式環境裡這個時間窗只有幾毫秒，所以平常測不出來，壓測或大量使用者同時操作時才會出現。

## 核心機制

### 交易保證了什麼

| | 意思 | 常見誤解 |
|---|---|---|
| Atomicity | 交易內的修改全部成功，或全部撤銷 | 不是「不會被其他交易打斷」 |
| Consistency | 資料符合應用程式定義的規則（例如 `remaining >= 0`） | 這是**應用程式**的責任，資料庫只能幫忙守住宣告出來的約束：`NOT NULL`、`UNIQUE`、`CHECK`、外鍵 |
| Isolation | 並行的交易彼此干擾的程度 | 有等級之分，主流資料庫的預設都**不是**完全隔離 |
| Durability | commit 之後當機也不會遺失 | 靠 redo log／WAL 寫到磁碟 |

### MVCC：讀不擋寫，寫不擋讀

InnoDB 和 PostgreSQL 都用 MVCC（multi-version concurrency control）：每一列保留多個版本，一般的 `SELECT` 讀某個時間點的**快照**，不加任何鎖；修改則要取得那一列的 row lock。

快照什麼時候建立，由隔離等級決定：

- **READ COMMITTED**：每一句 `SELECT` 各自建立新的快照
- **REPEATABLE READ**：MySQL 是交易中第一次讀取時，PostgreSQL 是交易中第一個查詢或修改語句時，整個交易都讀同一份快照

關鍵在於：**一般 `SELECT` 和 `UPDATE` 看到的可能不是同一個世界**。MySQL 文件寫得很明白：REPEATABLE READ 交易中，一般 `SELECT` 讀快照；`UPDATE`、`DELETE`、`SELECT ... FOR UPDATE` 則讀最新已提交的資料並加鎖。文件甚至不建議在同一個 REPEATABLE READ 交易裡混用這兩種讀法，因為結果很難推理。

lost update 就是這樣發生的：判斷依據來自快照（舊值），寫入卻作用在最新的資料上。

### 並行異常

| 異常 | 報名系統裡的樣子 |
|---|---|
| Dirty read | 讀到別人還沒 commit、後來被 rollback 的名額 |
| Non-repeatable read | 同一個交易讀了兩次剩餘名額，數字不一樣 |
| Phantom | 同一個交易查了兩次「會員 7 上午場的報名」，第二次多出一筆 |
| Lost update | 兩個交易都讀到剩 1 個，各自寫回 0，其中一次扣減消失 |
| Write skew | 兩個交易各自確認「會員 7 上午場沒有報名」，分別新增**不同**講座的報名，合起來違反規則 |

write skew 最難察覺：兩個交易寫的是**不同的列**，彼此沒有 row lock 衝突，所以一般的隔離等級完全攔不住。

### 隔離等級的實際行為

SQL 標準用「禁止哪些異常」定義隔離等級，但各資料庫的實作差很多。以「先讀再寫」的程式為準：

| 異常 | READ COMMITTED | MySQL REPEATABLE READ | PostgreSQL REPEATABLE READ | SERIALIZABLE |
|---|---|---|---|---|
| Dirty read | 不會 | 不會 | 不會 | 不會 |
| Non-repeatable read | 會 | 不會 | 不會 | 不會 |
| Phantom（一般 `SELECT`） | 會 | 不會 | 不會 | 不會 |
| Lost update | 會 | **會** | 不會：後寫的交易收到序列化錯誤 | 不會 |
| Write skew | 會 | 會 | 會 | 不會 |

- **預設值**：InnoDB 是 REPEATABLE READ，PostgreSQL 是 READ COMMITTED
- **MySQL 的 REPEATABLE READ 擋不住 lost update**：`UPDATE` 直接作用在最新資料上，不會檢查你讀到的值是否已經過期。PostgreSQL 的 REPEATABLE READ 會：要修改的列在交易開始後被別人改過並提交，就丟出錯誤（SQLSTATE `40001`），整個交易要重來
- **SERIALIZABLE 的實作方式不同**：MySQL 是讓一般 `SELECT` 也加上共享鎖，衝突時互相等待，常以死結收場；PostgreSQL 用 Serializable Snapshot Isolation，不額外加鎖，偵測到可能違反序列化的讀寫關係時，讓其中一個交易失敗。兩者都**必須準備好重試**

## 方案比較

| 做法 | 原理 | 優點 | 代價 | 適合 |
|---|---|---|---|---|
| 條件式 `UPDATE` | 檢查與修改寫在同一句，資料庫用最新值判斷 | 最簡單、最快，不需要重試 | 只能表達單列、能寫成 SQL 條件的規則 | 扣名額、扣庫存、扣餘額 |
| `SELECT ... FOR UPDATE`（悲觀鎖） | 讀的時候就鎖住，其他人排隊 | 可以在 Java 做複雜判斷 | 持鎖時間變長，熱點列吞吐量下降；可能死結 | 判斷複雜、衝突頻繁 |
| 樂觀鎖（`version` 欄位） | 寫入時確認版本沒變，變了就重來 | 讀取期間不持鎖 | 衝突一多就大量重試 | 衝突少的編輯，例如後台修改活動 |
| 唯一約束 | 把「不能同時存在」寫成唯一索引 | 由資料庫保證，最可靠 | 規則要能化成「某組欄位不可重複」 | write skew 類規則：一人一時段、一券一用 |
| SERIALIZABLE | 交給資料庫防止所有異常 | 不必逐一分析競態 | MySQL 鎖多、死結多；PostgreSQL 要處理序列化失敗 | 規則複雜、難以化成約束，而且量不大 |

幾個判斷原則：

- **能寫成條件式 `UPDATE` 就不要先讀**。[導讀篇](/post/systemdesign/system-design-thinking/)算過，熱點列的吞吐量上限約等於「1 ÷ 每筆交易的持鎖時間」。`SELECT ... FOR UPDATE` 從讀取那一刻就開始持鎖，中間的 Java 邏輯、應用程式與資料庫之間的往返時間全都算進持鎖時間
- **write skew 的解法是把衝突變成同一列的衝突**。唯一約束是最直接的方式：兩個交易都要插入 `(member_id = 7, slot = 'SAT-AM')`，第二個一定失敗。規則無法化成唯一約束時（例如「會議室時段不能重疊」），可以改成先鎖住一個共同的列（例如 `SELECT ... FROM member WHERE id = 7 FOR UPDATE`），讓同一位會員的操作排隊
- **樂觀鎖適合「人」在編輯的資料**：主辦方修改活動的頻率很低，衝突罕見，重試一次就好

## Java 落地

### 1. Entity：樂觀鎖與唯一約束

```java
package signup;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "event")
public class Event {

    @Id
    private Long id;

    @Column(nullable = false, length = 20)
    private String slot;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private int remaining;

    @Version
    private long version;

    protected Event() {
    }

    public String getSlot() {
        return slot;
    }

    /** 主辦方調整名額上限：已報名人數不變，剩餘名額跟著調整。 */
    public void changeCapacity(int newCapacity) {
        int registered = capacity - remaining;
        if (newCapacity < registered) {
            throw new IllegalArgumentException("名額上限不能低於已報名人數 " + registered);
        }
        capacity = newCapacity;
        remaining = newCapacity - registered;
    }
}
```

```java
package signup;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "registration",
       uniqueConstraints = @UniqueConstraint(name = "uk_member_slot", columnNames = {"member_id", "slot"}))
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private long eventId;

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Column(nullable = false, length = 20)
    private String slot;

    protected Registration() {
    }

    public Registration(long eventId, long memberId, String slot) {
        this.eventId = eventId;
        this.memberId = memberId;
        this.slot = slot;
    }
}
```

正式環境的唯一約束要寫在 migration 裡，`@UniqueConstraint` 只在讓 Hibernate 產生 schema 時才有作用（同 [Index 篇](/post/systemdesign/index-btree/)的 `@Index`）。

### 2. Repository：條件式 UPDATE

```java
package signup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    /** 檢查與扣減在同一個 UPDATE 完成。bulk update 不經過樂觀鎖，所以要自己遞增 version。 */
    @Modifying
    @Query("""
            update Event e
               set e.remaining = e.remaining - 1, e.version = e.version + 1
             where e.id = :id and e.remaining > 0
            """)
    int takeSeat(@Param("id") long id);
}
```

這裡藏了一個容易漏掉的問題。JPA 規格規定，bulk update 直接對應到資料庫的 `UPDATE`，**不經過樂觀鎖檢查，也不會自動遞增 version**。如果漏掉 `e.version = e.version + 1`：

1. 主辦方載入活動，讀到 `remaining = 10`、`version = 5`
2. 這時有人報名，`takeSeat` 把 `remaining` 扣成 9，但 `version` 仍是 5
3. 主辦方存檔。Hibernate 預設會更新所有欄位，`version` 檢查也通過，於是 `remaining` 被寫回以 10 為基準算出的值，剛才那筆報名就「消失」了

這正是情境中「剩餘名額對不上」的原因。

### 3. 交易內：熱點列放在最後

```java
package signup;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private final EventRepository events;
    private final RegistrationRepository registrations;

    public RegistrationService(EventRepository events, RegistrationRepository registrations) {
        this.events = events;
        this.registrations = registrations;
    }

    /** 一次報名就是一個交易：任何一步失敗，整筆報名都不成立。 */
    @Transactional
    public void register(long memberId, long eventId) {
        Event event = events.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("活動不存在：" + eventId));
        // 同一時段重複報名會在這裡違反 uk_member_slot
        registrations.saveAndFlush(new Registration(eventId, memberId, event.getSlot()));
        // 熱點列放在最後一步：從取得 row lock 到 commit 的時間最短
        if (events.takeSeat(eventId) == 0) {
            throw new SoldOutException(eventId);           // RuntimeException：連同上面的 INSERT 一起 rollback
        }
    }

    @Transactional
    public void changeCapacity(long eventId, int newCapacity) {
        Event event = events.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("活動不存在：" + eventId));
        event.changeCapacity(newCapacity);                 // commit 時 version 不符，就丟出樂觀鎖例外
    }
}
```

- **順序很重要**：`findById` 是一般讀取，不加鎖；新增報名只會鎖住新的那一列；最後才 `takeSeat` 取得 `event` 那一列的 row lock，所以持鎖時間只有「最後一句到 commit」這一小段
- **`saveAndFlush`**：明確要求在這一行送出 `INSERT`，讓唯一約束的違規在這裡發生。主鍵是 `IDENTITY` 時，Hibernate 其實在 `save` 就會立即 `INSERT`；但換成 `SEQUENCE` 等策略，`INSERT` 會延到 flush 甚至 commit 才送出。寫成 `saveAndFlush`，行為就不受主鍵策略影響
- **`SoldOutException` 是 `RuntimeException`**：Spring 預設只在 `RuntimeException` 與 `Error` 時 rollback，checked exception 不會

### 4. 交易外：重試與例外轉換

```java
package signup;

import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;

/** 位在交易外面：每次重試都會呼叫 RegistrationService，開一個全新的交易。 */
@Service
@Retryable(includes = ConcurrencyFailureException.class, maxRetries = 3, delay = 50, jitter = 20, multiplier = 2)
public class RegistrationFacade {

    private final RegistrationService service;

    public RegistrationFacade(RegistrationService service) {
        this.service = service;
    }

    public RegistrationResult register(long memberId, long eventId) {
        try {
            service.register(memberId, eventId);
            return RegistrationResult.REGISTERED;
        } catch (SoldOutException e) {
            return RegistrationResult.SOLD_OUT;
        } catch (DataIntegrityViolationException e) {
            // 這個交易唯一可能違反的約束是 uk_member_slot；對外不要帶出約束名稱或 SQL
            return RegistrationResult.SLOT_CONFLICT;
        }
    }

    public void changeCapacity(long eventId, int newCapacity) {
        service.changeCapacity(eventId, newCapacity);
    }
}
```

```java
package signup;

import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.EnableResilientMethods;

@Configuration
@EnableResilientMethods
public class ResilienceConfig {
}
```

`@Retryable` 是 Spring Framework 7 內建的重試支援，要用 `@EnableResilientMethods` 啟用。三個設計重點：

**重試必須在交易外面**。交易失敗後已經被標記為 rollback，在同一個交易裡重試沒有意義；必須 rollback 後開新的交易、拿新的快照，才讀得到別人剛提交的版本。用 H2 實際驗證：

<details>
<summary>驗證程式（Spring 7.0.10 + H2，用 <code>JdbcClient</code> 模擬樂觀鎖衝突）</summary>

```java
package retrycheck;

import java.util.Map;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 驗證：@Retryable 在交易外時，每次重試都是新的交易，並讀到別人已提交的新版本。 */
public class RetryOutsideTransactionCheck {

    public static class CapacityService {
        private final JdbcClient jdbc;
        private final DataSource dataSource;
        private int attempt;

        public CapacityService(JdbcClient jdbc, DataSource dataSource) {
            this.jdbc = jdbc;
            this.dataSource = dataSource;
        }

        @Transactional
        public void changeCapacity(long eventId, int newCapacity) throws Exception {
            attempt++;
            Map<String, Object> row = jdbc.sql("SELECT capacity, remaining, version FROM event WHERE id = ?")
                    .param(eventId).query().singleRow();
            int capacity = (Integer) row.get("CAPACITY");
            int remaining = (Integer) row.get("REMAINING");
            long version = (Long) row.get("VERSION");
            if (attempt == 1) {
                try (var other = dataSource.getConnection(); var st = other.createStatement()) {
                    // 模擬另一個請求在這時完成報名並提交
                    st.executeUpdate("UPDATE event SET remaining = remaining - 1, version = version + 1 WHERE id = " + eventId);
                }
            }
            int registered = capacity - remaining;
            int updated = jdbc.sql("UPDATE event SET capacity = ?, remaining = ?, version = version + 1 WHERE id = ? AND version = ?")
                    .params(newCapacity, newCapacity - registered, eventId, version).update();
            System.out.printf("第 %d 次：交易中=%s，讀到 remaining=%d、version=%d，更新 %d 筆%n", attempt,
                    TransactionSynchronizationManager.isActualTransactionActive(), remaining, version, updated);
            if (updated == 0) {
                throw new OptimisticLockingFailureException("event " + eventId + " 已被其他交易修改");
            }
        }
    }

    @Retryable(includes = ConcurrencyFailureException.class, maxRetries = 3, delay = 50, jitter = 20, multiplier = 2)
    public static class CapacityFacade {
        private final CapacityService service;

        public CapacityFacade(CapacityService service) {
            this.service = service;
        }

        public void changeCapacity(long eventId, int newCapacity) throws Exception {
            System.out.printf("Facade 呼叫時：交易中=%s%n", TransactionSynchronizationManager.isActualTransactionActive());
            service.changeCapacity(eventId, newCapacity);
        }
    }

    @Configuration
    @EnableTransactionManagement
    @EnableResilientMethods
    public static class Config {
        @Bean
        public DataSource dataSource() {
            JdbcDataSource ds = new JdbcDataSource();
            ds.setURL("jdbc:h2:mem:retry;DB_CLOSE_DELAY=-1");
            return ds;
        }

        @Bean
        public PlatformTransactionManager transactionManager(DataSource ds) {
            return new DataSourceTransactionManager(ds);
        }

        @Bean
        public JdbcClient jdbcClient(DataSource ds) {
            return JdbcClient.create(ds);
        }

        @Bean
        public CapacityService capacityService(JdbcClient jdbc, DataSource ds) {
            return new CapacityService(jdbc, ds);
        }

        @Bean
        public CapacityFacade capacityFacade(CapacityService service) {
            return new CapacityFacade(service);
        }
    }

    public static void main(String[] args) throws Exception {
        try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
            JdbcClient jdbc = ctx.getBean(JdbcClient.class);
            jdbc.sql("CREATE TABLE event (id BIGINT PRIMARY KEY, capacity INT, remaining INT, version BIGINT)").update();
            jdbc.sql("INSERT INTO event VALUES (42, 100, 10, 0)").update();      // 已報名 90 人
            ctx.getBean(CapacityFacade.class).changeCapacity(42, 120);
            System.out.println("最終：" + jdbc.sql("SELECT capacity, remaining, version FROM event WHERE id = 42").query().singleRow());
        }
    }
}
```

</details>

```text
Facade 呼叫時：交易中=false
第 1 次：交易中=true，讀到 remaining=10、version=0，更新 0 筆
Facade 呼叫時：交易中=false
第 2 次：交易中=true，讀到 remaining=9、version=1，更新 1 筆
最終：{CAPACITY=120, REMAINING=29, VERSION=2}
```

Facade 被呼叫時不在交易中；第 1 次嘗試讀到 `version=0`，在它更新之前另一個請求已經提交了報名，所以更新 0 筆；第 2 次是全新的交易，讀到 `remaining=9`、`version=1`，更新成功。已報名的 91 人沒有被覆蓋。

**一定要限定重試的例外**。`@Retryable` 預設對**任何**例外重試 3 次、間隔 1 秒，連「名額上限不能低於已報名人數」這種業務錯誤也會被重試。`ConcurrencyFailureException` 是 Spring 對並行衝突的共同父類別，用 Spring 7.0.10 的 JDBC 例外轉換器實測：

| 資料庫錯誤 | 轉換後的例外 | 父類別 |
|---|---|---|
| MySQL 1213 死結 | `DeadlockLoserDataAccessException`（已 deprecated） | `PessimisticLockingFailureException` |
| MySQL 1205 lock wait timeout | `CannotAcquireLockException` | `PessimisticLockingFailureException` |
| PostgreSQL 40001 序列化失敗 | `CannotSerializeTransactionException`（已 deprecated） | `PessimisticLockingFailureException` |
| MySQL 1062 重複鍵 | `DuplicateKeyException` | `DataIntegrityViolationException` |

`PessimisticLockingFailureException` 與樂觀鎖失敗的 `OptimisticLockingFailureException` 都繼承自 `ConcurrencyFailureException`。有兩個子類別已經 deprecated 但仍會被丟出，所以 catch 或重試條件要寫父類別，不要寫子類別。重複鍵屬於 `DataIntegrityViolationException`，重試也不會成功，所以不在重試範圍內。

**`DataIntegrityViolationException` 要在交易外 catch**。如果在 `RegistrationService` 裡面 catch 再回傳結果，例外已經穿過 repository 的交易攔截器，整個交易被標記成 rollback-only；方法正常結束後 Spring 要 commit，就會丟出 `UnexpectedRollbackException`。

### 5. 副作用放到 commit 之後

確認信不能在交易裡寄。交易可能在寄信之後 rollback（使用者收到確認信，報名卻不存在），也可能被重試（收到兩封）。用 `@TransactionalEventListener` 在 commit 之後才寄，做法見 [Cache 篇](/post/systemdesign/caching/)；要保證「commit 了就一定寄得出去」，則需要 Part 7 的 Outbox。

## 踩坑與 Gotchas

- **以為 `@Transactional` 就沒有並行問題**：交易只保證原子性，隔離程度取決於隔離等級與讀寫方式
- **以為 MySQL 的 REPEATABLE READ 能防 lost update**：不能，一般 `SELECT` 讀快照，`UPDATE` 寫最新資料
- **把整個系統調成 SERIALIZABLE**：MySQL 的鎖與死結大增；PostgreSQL 的序列化失敗變多。兩者都要配合重試，而且會降低吞吐量
- **用 `synchronized` 包住 `@Transactional` 方法**：commit 是在 proxy 裡、方法返回之後才做，`synchronized` 在 commit 前就已經釋放；而且多台機器時完全沒效果（見 [無狀態服務篇](/post/systemdesign/scaling-stateless/)）
- **同一個類別內呼叫自己的 `@Transactional` 或 `@Retryable` 方法**：self-invocation 不經過 proxy，註解形同虛設
- **checked exception 不會 rollback**：要 rollback 就用 `RuntimeException`，或設定 `rollbackFor`
- **MySQL lock wait timeout 預設 50 秒，而且只 rollback 那一句**：除非開啟 `innodb_rollback_on_timeout`，交易本身還活著，程式若吞掉例外繼續 commit，就會留下半套資料
- **把死結當成 bug 追**：死結是並行系統的正常現象，InnoDB 會立即偵測並 rollback 其中一個交易。真正要做的是重試整個交易，並讓所有交易以相同順序存取資料，降低發生機率
- **在交易裡呼叫外部服務**：呼叫付款或簡訊 API 的期間，交易一直佔著連線與鎖。連線池 10 條、外部呼叫要 2 秒，整個服務每秒最多處理 5 個這種請求（連線池調校見 [HikariCP 篇](/post/database/hikaricp-tuning/)）
- **長時間不結束的交易**：MVCC 的舊版本必須保留到最舊的快照不再需要為止（InnoDB 的 undo log、PostgreSQL 的 dead tuple），一個忘記結束的交易會讓表越來越肥、查詢越來越慢

### 資安相關

- **競態條件本身就是漏洞**：優惠券重複使用、禮物卡餘額重複扣款、邀請獎勵重複領取，都是同一種「先檢查、再修改」的競態（limit overrun）。PortSwigger 在 2023 年發表的研究示範了讓數十個請求幾乎同時抵達伺服器的手法，攻擊者不需要碰運氣。rate limit 擋不住，因為這些請求都在限制之內；要在資料層用條件式 `UPDATE` 或唯一約束解決
- **鎖可以被拿來癱瘓服務**：對熱點列做 `SELECT ... FOR UPDATE` 的 API，每個排隊等鎖的請求都佔著一條資料庫連線，最久等 50 秒。攻擊者只要持續送出少量請求，就能耗盡連線池，讓不相關的 API 一起掛掉。縮短等鎖時間（MySQL 可以針對連線 `SET SESSION innodb_lock_wait_timeout`，PostgreSQL 用 `lock_timeout`）、優先用條件式 `UPDATE`，並對這類 API 做 rate limit（Part 8 濫用防護）
- **稽核紀錄跟著 rollback 一起消失**：把「登入失敗」「授權被拒」的稽核紀錄寫在業務交易裡，交易 rollback 時紀錄也不見了，攻擊的痕跡正好被抹掉。安全相關的稽核要寫在獨立的交易（`Propagation.REQUIRES_NEW`）或交易之外。注意 `REQUIRES_NEW` 會再拿一條連線，尖峰時每個請求同時佔兩條，連線池要算進去
- **錯誤訊息洩漏 schema**：直接把資料庫例外的訊息回給前端，會帶出表名、約束名稱甚至 SQL。像 `RegistrationFacade` 一樣轉成業務結果，細節只寫在伺服器端的日誌

## 何時用／何時別用

- **單列的數量檢查**（名額、庫存、餘額）：條件式 `UPDATE`
- **「不能同時存在」的規則**：唯一約束
- **判斷複雜、衝突頻繁**：悲觀鎖，並且讓持鎖時間越短越好
- **衝突少的編輯**：樂觀鎖加上交易外的重試
- **跨多列、難以化成約束、量不大的規則**：SERIALIZABLE 加重試，PostgreSQL 的 SSI 比 MySQL 的鎖實作更適合
- **別用**：在交易裡呼叫外部服務、用 `synchronized` 解決資料庫的並行問題、不限定例外就重試
- **跨多個服務或資料庫**：單一資料庫的交易已經不夠，需要[分散式鎖](/post/systemdesign/distributed-lock/)或 Saga（[Part 7](/post/systemdesign/saga-outbox/)）

## 參考資料

- Hal Berenson et al., "A Critique of ANSI SQL Isolation Levels", SIGMOD 1995
- Dan R. K. Ports, Kevin Grittner, "Serializable Snapshot Isolation in PostgreSQL", VLDB 2012
- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017, Chapter 7
- MySQL 8.4 Reference Manual — Transaction Isolation Levels：<https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html>
- MySQL 8.4 Reference Manual — Consistent Nonlocking Reads：<https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html>
- MySQL 8.4 Reference Manual — InnoDB Error Handling：<https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html>
- PostgreSQL 18 Documentation — Transaction Isolation：<https://www.postgresql.org/docs/18/transaction-iso.html>
- PostgreSQL 18 Documentation — Serialization Failure Handling：<https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html>
- Jakarta Persistence Specification — Bulk Update and Delete Operations：<https://jakarta.ee/specifications/persistence/>
- Spring Framework Reference — Declarative Transaction Management：<https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html>
- Spring Framework Reference — Resilience Features：<https://docs.spring.io/spring-framework/reference/core/resilience.html>
- James Kettle, "Smashing the state machine: the true potential of web race conditions", PortSwigger Research, 2023：<https://portswigger.net/research/smashing-the-state-machine>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
