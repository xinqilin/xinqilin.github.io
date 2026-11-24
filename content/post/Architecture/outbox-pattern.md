---
title: "Outbox Pattern — 分散式事務一致性"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "解析分散式 Dual-Write 問題，實作 Outbox Pattern 的 Polling 與 Debezium CDC 兩種方式，以及 Spring Modulith 內建支援"
categories: ["Architecture"]
tags: ["Architecture", "Outbox Pattern", "Event-Driven", "Distributed Systems", "Kafka"]
---

## 問題：Dual-Write

在微服務中，一個業務操作往往需要：

1. 寫入資料庫（持久化訂單）
2. 發布事件到 Kafka（通知下游服務）

這兩個動作**無法包在同一個 ACID transaction 裡**（資料庫 + Kafka 是兩個不同的資源管理器）：

```java
// 危險的 Dual-Write：兩個操作不是原子的
@Transactional
public void createOrder(CreateOrderCommand cmd) {
    Order order = orderRepository.save(new Order(cmd));  // DB 寫入成功
    kafkaTemplate.send("order.created", new OrderCreatedEvent(order)); // 若此處失敗？
    // DB 已提交，但 Kafka 事件未送出 → 下游永遠不知道這筆訂單
}
```

### 可能的失敗情境

```
情境 A：DB 成功，Kafka 失敗
  → 訂單存在，但下游沒收到事件，資料不一致

情境 B：Kafka 成功，DB 回滾
  → 下游已處理不存在的訂單

情境 C：應用程序在兩個操作中間 crash
  → 同情境 A 或 B
```

```diagram
title: 寫資料庫，也要發事件
row: S 訂單服務 | DB 資料庫
row: K Kafka | D 下游服務
step: 一個操作，兩個系統
  建立訂單要寫入資料庫，也要發布 order.created 事件通知下游。資料庫和 Kafka 是兩個不同的資源管理器，沒辦法包在同一個 ACID transaction 裡。
S -> DB: 寫入訂單
S -> K: order.created
K -> D: 通知下游
step: 情境 A：資料庫成功，Kafka 失敗
  訂單已經 commit，事件卻沒有送出。下游永遠不知道有這筆訂單，兩邊的資料從此不一致。
S -> DB: 已 commit [ok]
S -> K: 送出失敗 [danger]
note D: 沒收到這筆訂單 [danger]
step: 情境 B：Kafka 成功，資料庫回滾
  事件已經送出，資料庫的交易卻回滾了。下游處理了一筆不存在的訂單。
S -> K: 已送出
K -> D: 處理訂單
S -> DB: 回滾 [danger]
note D: 訂單根本不存在 [danger]
step: 情境 C：兩步之間當機
  應用程式在兩個動作中間當機，結果就是情境 A 或 B，看它停在哪一步。
note S: 兩步之間 crash [danger]
step: Outbox：寫進同一個交易
  把事件和訂單寫進同一個資料庫交易，由資料庫的 ACID 保證兩者一起成功或一起失敗；再由獨立的 Publisher 非同步地把事件送到 Kafka。
S -> DB: 訂單 + 事件 [ok]
note DB: 同一個交易 [ok]
DB -> K: Publisher 轉發
K -> D: 通知下游
```

---

## Outbox Pattern 解法

核心思想：**把事件記錄寫入與業務資料同一個 DB transaction**，讓 DB 的 ACID 保證兩者的原子性。再由獨立的 Publisher 非同步地將事件發布到 Kafka。

```
┌──────────────────────────────────────────────────────┐
│  同一個 DB Transaction                                │
│                                                      │
│  INSERT INTO orders (...)                            │
│  INSERT INTO outbox_events (payload, status='PENDING')│
│                                                      │
└──────────────────────────────────────────────────────┘
          │
          │ 獨立 Publisher（非同步）
          ▼
    ┌───────────┐       ┌─────────────────┐
    │  outbox   │──────►│  Kafka Topic    │
    │  events   │       │  order.created  │
    └───────────┘       └─────────────────┘
```

---

## 資料庫 Schema

```sql
CREATE TABLE outbox_events (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    aggregate_type VARCHAR(64)  NOT NULL,  -- e.g. 'Order'
    aggregate_id   VARCHAR(64)  NOT NULL,  -- e.g. '12345'
    event_type     VARCHAR(128) NOT NULL,  -- e.g. 'OrderCreatedEvent'
    payload        JSON         NOT NULL,
    status         ENUM('PENDING', 'SENT') DEFAULT 'PENDING',
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at        DATETIME,
    INDEX idx_status_created (status, created_at)
);
```

`status` + `created_at` 的複合索引讓 Polling Publisher 能高效查詢 `WHERE status = 'PENDING' ORDER BY created_at`。

---

## 業務層寫入 Outbox

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Order createOrder(CreateOrderCommand cmd) {
        Order order = new Order(cmd.userId(), cmd.productId(), cmd.quantity());
        Order saved = orderRepository.save(order);

        // 同一 transaction 寫入 outbox
        String payload = objectMapper.writeValueAsString(
            new OrderCreatedPayload(saved.getId(), saved.getUserId(), saved.getProductId())
        );
        OutboxEvent event = new OutboxEvent(
            "Order",
            String.valueOf(saved.getId()),
            "OrderCreatedEvent",
            payload
        );
        outboxRepository.save(event);

        return saved;
    }
}
```

```java
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String aggregateType;
    private String aggregateId;
    private String eventType;

    @Column(columnDefinition = "JSON")
    private String payload;

    @Enumerated(EnumType.STRING)
    private EventStatus status = EventStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime sentAt;

    protected OutboxEvent() {}

    public OutboxEvent(String aggregateType, String aggregateId,
                       String eventType, String payload) {
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
    }

    public void markSent() {
        this.status = EventStatus.SENT;
        this.sentAt = LocalDateTime.now();
    }
}

enum EventStatus { PENDING, SENT }
```

---

## Publisher 方式一：Polling（簡單）

```java
@Component
public class OutboxPollingPublisher {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 5000)  // 每 5 秒執行一次
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxRepository
            .findTop100ByStatusOrderByCreatedAtAsc(EventStatus.PENDING);

        for (OutboxEvent event : events) {
            String topic = resolveTopicName(event.getEventType());
            kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload());
            event.markSent();
            outboxRepository.save(event);
        }
    }

    private String resolveTopicName(String eventType) {
        return switch (eventType) {
            case "OrderCreatedEvent" -> "order.created";
            case "OrderCancelledEvent" -> "order.cancelled";
            default -> throw new IllegalArgumentException("Unknown event type: " + eventType);
        };
    }
}
```

```java
@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(EventStatus status);
}
```

**缺點**：Polling 有延遲（最多 5 秒）；高頻輪詢對 DB 有額外負擔。

---

## Publisher 方式二：Debezium CDC（低延遲）

Debezium 監聽 MySQL binlog，發現 `outbox_events` 有新記錄時立即觸發，不需 Polling。

```yaml
# docker-compose 啟動 Debezium Connector
version: "3"
services:
  kafka-connect:
    image: debezium/connect:2.4
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: debezium-connect
      CONFIG_STORAGE_TOPIC: debezium_connect_configs
      OFFSET_STORAGE_TOPIC: debezium_connect_offsets
```

```json
// POST /connectors — 建立 Outbox Connector
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.name": "myapp",
    "table.include.list": "mydb.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.route.by.field": "aggregate_type"
  }
}
```

Debezium 的 EventRouter transform 會自動：

- 以 `aggregate_type` 決定目標 Kafka topic（`Order` → `outbox.event.Order`）
- 以 `aggregate_id` 作為 Kafka message key（保證同一 aggregate 的事件有序）
- 發布後不需要修改 DB 的 `status`，offset 存在 Kafka 中

---

## At-Least-Once 語意與冪等性

Outbox Pattern 保證 **at-least-once delivery**：

```
Publisher 發出事件 → Kafka 確認收到 → 更新 outbox status 為 SENT
                                ↑
                      若 Publisher 在此 crash，
                      下次 Polling 會重發同一事件
```

消費者必須是**冪等的（idempotent）**：

```java
@KafkaListener(topics = "order.created")
public void handleOrderCreated(OrderCreatedEvent event) {
    // 用 event ID（或 aggregate_id + event_type）做冪等檢查
    if (processedEventRepository.existsById(event.getId())) {
        return; // 已處理過，忽略重複
    }
    inventoryService.reserve(event.getProductId(), event.getQuantity());
    processedEventRepository.save(new ProcessedEvent(event.getId()));
}
```

---

## Spring Modulith 內建支援

Spring Modulith 提供開箱即用的 Outbox 機制：

```java
// 應用事件發布（不直接呼叫 Kafka）
@Service
public class OrderService {

    private final ApplicationEventPublisher events;

    @Transactional
    public Order createOrder(CreateOrderCommand cmd) {
        Order order = orderRepository.save(...);
        events.publishEvent(new OrderCreatedEvent(order.getId())); // Spring Event
        return order;
    }
}
```

```java
// 在另一個 module 訂閱，Spring Modulith 自動寫 outbox
@ApplicationModuleListener
public void onOrderCreated(OrderCreatedEvent event) {
    kafkaTemplate.send("order.created", event.toPayload());
}
```

Spring Modulith 會自動在 `application_module_events` 表中記錄事件，確保 at-least-once 發布，無需手寫 Outbox 表與 Publisher。

---

## 方案比較

| 方案 | 複雜度 | 延遲 | 適用場景 |
|------|--------|------|---------|
| Polling Publisher | 低 | 秒級 | 流量不大、容忍延遲 |
| Debezium CDC | 中 | 毫秒級 | 高吞吐、低延遲需求 |
| Spring Modulith | 低（框架包辦）| 秒級 | Spring Modulith 既有項目 |
| 2PC（XA Transaction）| 高 | 高 | 幾乎不用，效能差 |
| Saga | 高 | 中 | 複雜多步驟流程 |

---

## 小結

- **Dual-Write 是分散式系統中的反模式**，DB 與 MQ 不能保證原子性。
- Outbox Pattern 用 DB ACID 保證「業務資料 + 事件記錄」的原子性，再非同步發布。
- Polling 實作簡單，CDC（Debezium）延遲低，二者各有適用場景。
- Consumer 必須設計為冪等，因為 at-least-once 保證可能重複投遞。
