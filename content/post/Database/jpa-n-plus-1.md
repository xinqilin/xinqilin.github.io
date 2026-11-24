---
title: "JPA N+1 偵測與解法"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "深入解析 JPA N+1 問題的成因、偵測方式，以及 JOIN FETCH、EntityGraph、BatchSize 三種解法的適用時機"
categories: ["Database"]
tags: ["JPA", "Hibernate", "N+1", "Performance", "Spring Data"]
aliases:
  - /post/backend/jpa-n-plus-1/
---

## 什麼是 N+1 問題

載入 1 筆 `Order` 後，Hibernate 額外發出 N 條 SQL 去撈每筆 `Order` 的 `OrderItem`：

```
SELECT * FROM orders WHERE user_id = 1;        -- 1 條
SELECT * FROM order_items WHERE order_id = 10; -- N 條（每筆 Order 一條）
SELECT * FROM order_items WHERE order_id = 11;
SELECT * FROM order_items WHERE order_id = 12;
...
```

根源在於 `@OneToMany` 預設是 `LAZY` 載入——存取集合屬性時才觸發查詢，在迴圈中存取就變成 N 條。

```java
@Entity
public class Order {
    @Id Long id;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items; // 預設 LAZY
}
```

```java
// Service 層：觸發 N+1
List<Order> orders = orderRepository.findByUserId(userId);
orders.forEach(o -> process(o.getItems())); // 每次 getItems() 觸發一條 SQL
```

```diagram
title: 3 筆訂單，4 條 SQL
actors: S OrderService | H Hibernate | DB MySQL
S -> H: findByUserId(1)
  Service 查出使用者 1 的所有訂單。
H -> DB: SELECT orders
  Hibernate 發出第 1 條 SQL，取回 3 筆 Order。items 是 LAZY，這時還沒有載入。
H --> S: 3 筆 Order
  Service 拿到訂單清單，開始用 forEach 逐筆處理。
S -> H: getItems()
  存取第一筆訂單的 items，集合在這一刻才觸發查詢。
H -> DB: order_id = 10
  第 2 條 SQL：撈出訂單 10 的 OrderItem。
H -> DB: order_id = 11
  迴圈走到下一筆，第 3 條。每多一筆訂單，就多一次資料庫往返。
H -> DB: order_id = 12 [danger]
  3 筆訂單共發出 1 + 3 條 SQL。訂單有 N 筆，就是 N + 1 條，而且這段程式碼看起來只查了一次。
H -> DB: JOIN FETCH，1 條 [ok]
  解法都在減少往返：JOIN FETCH 與 @EntityGraph 用一條 SQL 一起載入 Order 和 OrderItem；@BatchSize 則把 N 條合併成幾條 IN 查詢。
```

---

## 如何偵測

### 方式一：Hibernate Statistics

```yaml
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true
logging:
  level:
    org.hibernate.stat: DEBUG
```

啟動後每次請求結束，log 會顯示：

```
Session Metrics {
  1234567 nanoseconds spent acquiring 1 JDBC connections;
  ...
  20 flushes as part of pre-partial-flush operations;
  52 JDBC statements executed
}
```

52 條 SQL 來自 1 個請求，明顯異常。

### 方式二：P6Spy / datasource-proxy

加入 `datasource-proxy`，攔截所有 SQL 並計數，適合在測試環境斷言 SQL 數量：

```java
// build.gradle
testImplementation 'net.ttddyy:datasource-proxy:1.9'
```

```java
@Test
void should_loadOrdersWithItems_inSingleQuery() {
    QueryCountHolder.clear();

    List<Order> orders = orderRepository.findWithItemsByUserId(1L);
    orders.forEach(o -> assertThat(o.getItems()).isNotEmpty());

    QueryCount count = QueryCountHolder.getGrandTotal();
    assertThat(count.getSelect()).isEqualTo(1); // 只允許 1 條 SELECT
}
```

### 方式三：@DataJpaTest + SQL 斷言

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EntityManager em;

    @Test
    void no_n_plus_1_on_findWithItems() {
        SessionFactory sf = em.getEntityManagerFactory().unwrap(SessionFactory.class);
        Statistics stats = sf.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        orderRepository.findWithItemsByUserId(1L);

        assertThat(stats.getPrepareStatementCount()).isLessThanOrEqualTo(2);
    }
}
```

---

## 三種解法

### 解法一：JOIN FETCH（JPQL）

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.userId = :uid")
    List<Order> findWithItemsByUserId(@Param("uid") Long uid);

    // 多層關聯
    @Query("SELECT DISTINCT o FROM Order o " +
           "JOIN FETCH o.items i " +
           "JOIN FETCH i.product " +
           "WHERE o.userId = :uid")
    List<Order> findWithItemsAndProducts(@Param("uid") Long uid);
}
```

注意 `DISTINCT`：當 Order 有多個 OrderItem 時，JOIN 會產生重複的 Order 行，`DISTINCT` 讓 Hibernate 在 Java 層去重（SQL 層也會加上 DISTINCT）。

**限制**：無法與 `Pageable` 分頁並用，因為分頁是在記憶體中做而非資料庫層（見下方陷阱）。

### 解法二：@EntityGraph

```java
// 方式一：在 Repository 方法上直接宣告
@EntityGraph(attributePaths = {"items", "items.product"})
List<Order> findByUserId(Long userId);

// 方式二：在 Entity 上定義具名 graph
@NamedEntityGraph(
    name = "Order.withItems",
    attributeNodes = @NamedAttributeNode(value = "items", subgraph = "items.product"),
    subgraphs = @NamedSubgraph(name = "items.product", attributeNodes = @NamedAttributeNode("product"))
)
@Entity
public class Order { ... }

// Repository
@EntityGraph("Order.withItems")
List<Order> findByUserId(Long userId);
```

`@EntityGraph` 本質上等同於 `JOIN FETCH`，但讓 Repository 介面更乾淨，適合跨多個方法重用相同的 fetch 策略。

### 解法三：@BatchSize（Hibernate 專屬）

```java
@Entity
public class Order {
    @OneToMany(mappedBy = "order")
    @BatchSize(size = 30)
    private List<OrderItem> items;
}
```

Hibernate 不再為每筆 Order 發一條 SQL，而是每次批次載入 30 筆 Order 的 items：

```sql
-- 原本 100 條（N=100）
SELECT * FROM order_items WHERE order_id IN (1,2,...,30);
SELECT * FROM order_items WHERE order_id IN (31,32,...,60);
-- ...
-- 只剩 4 條（ceiling(100/30)=4）
```

**優點**：不需改動 Repository 方法，JPQL 查詢依然簡單；支援分頁。  
**缺點**：Hibernate 專屬，換成其他 JPA 實作就失效；需要 2 次以上查詢（非 JOIN）。

---

## Slice vs Page：COUNT Query 的代價

```java
// Page：Spring Data 自動追加一條 COUNT(*)
Page<Order> findByUserId(Long userId, Pageable pageable);
// 等同於：
// SELECT * FROM orders WHERE user_id = ? LIMIT ? OFFSET ?
// SELECT COUNT(*) FROM orders WHERE user_id = ?   <-- 額外一條

// Slice：只多取一筆，判斷是否有下一頁，不發 COUNT
Slice<Order> findByUserId(Long userId, Pageable pageable);
```

- 需要總頁數（pagination UI）→ 用 `Page`
- 無限滾動 / 只需「是否有更多」→ 用 `Slice`，省掉 COUNT 查詢

---

## 陷阱：EntityGraph + Pageable = 記憶體分頁

當 `@EntityGraph` 與 `Pageable` 並用時，Hibernate 會發出警告：

```
HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory
```

這表示 Hibernate **先把所有資料全部載入記憶體，再做分頁**，資料量大時 OOM。

**正確解法**：

```java
// 1. 先分頁查 ID（不 JOIN 集合）
@Query("SELECT o.id FROM Order o WHERE o.userId = :uid")
Page<Long> findIdsByUserId(@Param("uid") Long uid, Pageable pageable);

// 2. 用 ID 做 JOIN FETCH
@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.id IN :ids")
List<Order> findWithItemsByIds(@Param("ids") List<Long> ids);

// Service 層組合
Page<Long> idPage = orderRepository.findIdsByUserId(userId, pageable);
List<Order> orders = orderRepository.findWithItemsByIds(idPage.getContent());
```

或是設定 `countQuery`，讓 Spring Data 知道如何計算總數：

```java
@Query(
    value = "SELECT o FROM Order o JOIN FETCH o.items WHERE o.userId = :uid",
    countQuery = "SELECT COUNT(o) FROM Order o WHERE o.userId = :uid"
)
Page<Order> findWithItemsByUserId(@Param("uid") Long uid, Pageable pageable);
```

---

## 決策樹

```
需要分頁？
├── 是
│   ├── 集合關聯需要 JOIN FETCH？
│   │   ├── 是 → 兩步查詢（先查 ID，再 JOIN FETCH）
│   │   └── 否 → @BatchSize + Page/Slice
│   └── 無集合關聯 → 正常 Page
└── 否
    ├── 關聯層數 <= 2 → JOIN FETCH / @EntityGraph
    ├── 關聯層數 > 2 → 多個 JOIN FETCH + DISTINCT
    └── 不想改 JPQL → @BatchSize
```

---

## 小結

| 解法 | 查詢次數 | 分頁安全 | 可讀性 | 適用場景 |
|------|---------|---------|--------|---------|
| JOIN FETCH | 1 | 有限制 | 中 | 小資料集、無分頁 |
| @EntityGraph | 1 | 同上 | 高 | 方法重用多 |
| @BatchSize | ceil(N/size) | 安全 | 高 | 有分頁、Hibernate 環境 |
| 兩步查詢 | 2 | 安全 | 低 | 大資料分頁 + JOIN FETCH |

N+1 問題不是一刀切，選解法前先確認：有沒有分頁、資料量、關聯深度。
