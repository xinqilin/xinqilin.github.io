---
title: "JPA Enum 型別處理完整指南：映射策略與最佳實踐"
author: Bill.Lin
date: 2023-01-05T23:18:48+08:00
draft: false
tags: ["Java", "JPA", "Hibernate", "Enum", "ORM", "Database", "Spring", "MySQL"]
Description: "深入探討 JPA 中 Enum 型別的各種映射策略、自訂轉換器、效能優化與最佳實踐"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/ORMEnumType/

---

## 概述

在企業級應用程式開發中，Enum（列舉）是表示有限狀態集合的理想選擇，如訂單狀態、使用者角色、審核狀態等。本文深入探討如何在 JPA/Hibernate 中有效處理 Enum 型別，包含各種映射策略、效能考量和實際應用場景。

## 基本 Enum 映射

### 1. @Enumerated 註解

JPA 提供 `@Enumerated` 註解來處理 Enum 映射，支援兩種策略：

#### EnumType.ORDINAL（數字映射）

```java
// 定義狀態列舉
public enum OrderStatus {
    PENDING,    // 0
    CONFIRMED,  // 1
    SHIPPED,    // 2
    DELIVERED,  // 3
    CANCELLED   // 4
}

// 實體類使用
@Entity
@Table(name = "orders")
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "status", nullable = false)
    private OrderStatus status = OrderStatus.PENDING;
    
    // 其他屬性...
}
```

**資料庫儲存**：
```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    status TINYINT NOT NULL DEFAULT 0,
    -- 其他欄位
);

-- 儲存的值：0=PENDING, 1=CONFIRMED, 2=SHIPPED, 3=DELIVERED, 4=CANCELLED
```

#### EnumType.STRING（字串映射）

```java
@Entity
@Table(name = "orders")
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private OrderStatus status = OrderStatus.PENDING;
    
    // 其他屬性...
}
```

**資料庫儲存**：
```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- 其他欄位
);

-- 儲存的值：'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
```

### 2. 映射策略比較

| 特性 | ORDINAL | STRING |
|------|---------|--------|
| **儲存空間** | 小（1-4 bytes） | 大（字串長度） |
| **可讀性** | 差（數字） | 好（文字） |
| **順序變更風險** | 高（破壞性） | 無 |
| **新增項目** | 只能追加 | 任意位置 |
| **資料庫查詢** | 快速 | 較慢 |
| **除錯友善** | 困難 | 容易 |

**建議**：生產環境通常使用 `EnumType.STRING`，因為其具備更好的可維護性和可讀性。

## 進階 Enum 處理

### 1. 自訂 Enum 值

當需要更具語意的資料庫值時，可以為 Enum 添加自訂屬性：

```java
public enum OrderStatus {
    PENDING("PND", "訂單待處理"),
    CONFIRMED("CNF", "訂單已確認"),
    SHIPPED("SHP", "商品已出貨"),
    DELIVERED("DLV", "商品已送達"),
    CANCELLED("CXL", "訂單已取消");
    
    private final String code;
    private final String description;
    
    OrderStatus(String code, String description) {
        this.code = code;
        this.description = description;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDescription() {
        return description;
    }
    
    // 從代碼查找 Enum
    public static OrderStatus fromCode(String code) {
        return Arrays.stream(values())
            .filter(status -> status.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("未知的訂單狀態代碼: " + code));
    }
    
    // 取得所有代碼
    public static List<String> getAllCodes() {
        return Arrays.stream(values())
            .map(OrderStatus::getCode)
            .collect(Collectors.toList());
    }
}
```

### 2. 自訂 AttributeConverter

使用 JPA 2.1 的 `@Converter` 註解來實現自訂轉換：

```java
@Converter(autoApply = true)
public class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {
    
    @Override
    public String convertToDatabaseColumn(OrderStatus orderStatus) {
        if (orderStatus == null) {
            return null;
        }
        return orderStatus.getCode();
    }
    
    @Override
    public OrderStatus convertToEntityAttribute(String code) {
        if (code == null || code.isEmpty()) {
            return null;
        }
        return OrderStatus.fromCode(code);
    }
}
```

**實體類使用**：
```java
@Entity
@Table(name = "orders")
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Convert(converter = OrderStatusConverter.class)
    @Column(name = "status", length = 3, nullable = false)
    private OrderStatus status = OrderStatus.PENDING;
    
    // 其他屬性...
}
```

**資料庫儲存結果**：
```sql
-- 儲存的值：'PND', 'CNF', 'SHP', 'DLV', 'CXL'
INSERT INTO orders (status) VALUES ('PND');
```

### 3. 通用 Enum 轉換器

建立通用的 Enum 轉換器基類：

```java
public interface CodedEnum {
    String getCode();
    
    static <T extends Enum<T> & CodedEnum> T fromCode(Class<T> enumClass, String code) {
        return Arrays.stream(enumClass.getEnumConstants())
            .filter(e -> e.getCode().equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "未知的 " + enumClass.getSimpleName() + " 代碼: " + code));
    }
}

// 通用轉換器基類
public abstract class CodedEnumConverter<T extends Enum<T> & CodedEnum> 
    implements AttributeConverter<T, String> {
    
    private final Class<T> enumClass;
    
    protected CodedEnumConverter(Class<T> enumClass) {
        this.enumClass = enumClass;
    }
    
    @Override
    public String convertToDatabaseColumn(T attribute) {
        return attribute != null ? attribute.getCode() : null;
    }
    
    @Override
    public T convertToEntityAttribute(String dbData) {
        return dbData != null ? CodedEnum.fromCode(enumClass, dbData) : null;
    }
}
```

**具體實作**：
```java
// 實作 CodedEnum 介面
public enum Priority implements CodedEnum {
    LOW("L"), MEDIUM("M"), HIGH("H"), URGENT("U");
    
    private final String code;
    
    Priority(String code) {
        this.code = code;
    }
    
    @Override
    public String getCode() {
        return code;
    }
}

// 具體轉換器
@Converter(autoApply = true)
public class PriorityConverter extends CodedEnumConverter<Priority> {
    public PriorityConverter() {
        super(Priority.class);
    }
}
```

## 複雜應用場景

### 1. 多狀態 Enum 設計

設計包含狀態轉換邏輯的 Enum：

```java
public enum OrderStatus implements CodedEnum {
    
    DRAFT("DFT", "草稿", Set.of()),
    PENDING("PND", "待處理", Set.of(DRAFT)),
    CONFIRMED("CNF", "已確認", Set.of(PENDING)),
    PAID("PAD", "已付款", Set.of(CONFIRMED)),
    SHIPPED("SHP", "已出貨", Set.of(PAID)),
    DELIVERED("DLV", "已送達", Set.of(SHIPPED)),
    CANCELLED("CXL", "已取消", Set.of(DRAFT, PENDING, CONFIRMED, PAID)),
    REFUNDED("RFD", "已退款", Set.of(PAID, SHIPPED, DELIVERED));
    
    private final String code;
    private final String description;
    private final Set<OrderStatus> allowedPreviousStatuses;
    
    OrderStatus(String code, String description, Set<OrderStatus> allowedPreviousStatuses) {
        this.code = code;
        this.description = description;
        this.allowedPreviousStatuses = allowedPreviousStatuses;
    }
    
    @Override
    public String getCode() {
        return code;
    }
    
    public String getDescription() {
        return description;
    }
    
    // 檢查狀態轉換是否合法
    public boolean canTransitionFrom(OrderStatus currentStatus) {
        return allowedPreviousStatuses.contains(currentStatus);
    }
    
    // 取得可轉換到的狀態
    public Set<OrderStatus> getNextPossibleStatuses() {
        return Arrays.stream(values())
            .filter(status -> status.canTransitionFrom(this))
            .collect(Collectors.toSet());
    }
    
    // 檢查是否為終結狀態
    public boolean isFinalStatus() {
        return this == DELIVERED || this == CANCELLED || this == REFUNDED;
    }
    
    // 檢查是否可取消
    public boolean isCancellable() {
        return CANCELLED.canTransitionFrom(this);
    }
}
```

### 2. 業務邏輯整合

在 Service 層中整合狀態轉換邏輯：

```java
@Service
@Transactional
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private OrderStatusHistoryService statusHistoryService;
    
    public void updateOrderStatus(Long orderId, OrderStatus newStatus, String reason) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("訂單不存在: " + orderId));
        
        OrderStatus currentStatus = order.getStatus();
        
        // 驗證狀態轉換
        if (!newStatus.canTransitionFrom(currentStatus)) {
            throw new IllegalStateException(String.format(
                "無法從 %s 轉換到 %s", 
                currentStatus.getDescription(), 
                newStatus.getDescription()
            ));
        }
        
        // 更新狀態
        order.setStatus(newStatus);
        order.setLastModified(LocalDateTime.now());
        
        // 記錄狀態變更歷史
        statusHistoryService.recordStatusChange(orderId, currentStatus, newStatus, reason);
        
        // 觸發相關業務邏輯
        handleStatusChange(order, currentStatus, newStatus);
        
        orderRepository.save(order);
    }
    
    private void handleStatusChange(Order order, OrderStatus from, OrderStatus to) {
        switch (to) {
            case CONFIRMED:
                // 發送確認郵件
                emailService.sendOrderConfirmation(order);
                break;
            case SHIPPED:
                // 發送出貨通知
                emailService.sendShippingNotification(order);
                // 減少庫存
                inventoryService.decreaseStock(order.getItems());
                break;
            case DELIVERED:
                // 發送送達通知
                emailService.sendDeliveryNotification(order);
                break;
            case CANCELLED:
                // 恢復庫存
                inventoryService.restoreStock(order.getItems());
                // 處理退款
                if (from == OrderStatus.PAID) {
                    paymentService.processRefund(order);
                }
                break;
        }
    }
    
    // 批量狀態查詢
    public List<Order> findOrdersByStatuses(Set<OrderStatus> statuses) {
        return orderRepository.findByStatusIn(statuses);
    }
    
    // 取得可操作的訂單
    public List<Order> findOrdersReadyForShipping() {
        return orderRepository.findByStatus(OrderStatus.PAID);
    }
}
```

### 3. 狀態歷史追蹤

建立狀態變更歷史表：

```java
@Entity
@Table(name = "order_status_history")
public class OrderStatusHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_id", nullable = false)
    private Long orderId;
    
    @Convert(converter = OrderStatusConverter.class)
    @Column(name = "from_status", length = 3)
    private OrderStatus fromStatus;
    
    @Convert(converter = OrderStatusConverter.class)
    @Column(name = "to_status", length = 3, nullable = false)
    private OrderStatus toStatus;
    
    @Column(name = "reason", length = 500)
    private String reason;
    
    @Column(name = "changed_by")
    private String changedBy;
    
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
    
    // 建構子、Getter、Setter...
}
```

### 4. Repository 查詢方法

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // 基本狀態查詢
    List<Order> findByStatus(OrderStatus status);
    
    List<Order> findByStatusIn(Collection<OrderStatus> statuses);
    
    List<Order> findByStatusNot(OrderStatus status);
    
    // 複合查詢
    List<Order> findByStatusAndCreatedAtBetween(
        OrderStatus status, 
        LocalDateTime start, 
        LocalDateTime end
    );
    
    // 統計查詢
    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countOrdersByStatus();
    
    // 自訂查詢
    @Query("SELECT o FROM Order o WHERE o.status IN :statuses AND o.totalAmount > :minAmount")
    List<Order> findHighValueOrdersByStatuses(
        @Param("statuses") Collection<OrderStatus> statuses,
        @Param("minAmount") BigDecimal minAmount
    );
    
    // 原生 SQL 查詢
    @Query(value = "SELECT * FROM orders WHERE status IN :statusCodes AND DATE(created_at) = CURDATE()", 
           nativeQuery = true)
    List<Order> findTodayOrdersByStatusCodes(@Param("statusCodes") Collection<String> statusCodes);
}
```

## 效能優化

### 1. 索引設計

```sql
-- 狀態欄位索引
CREATE INDEX idx_orders_status ON orders(status);

-- 複合索引
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- 部分索引（針對特定狀態）
CREATE INDEX idx_orders_active_status ON orders(status) 
WHERE status IN ('PND', 'CNF', 'PAD', 'SHP');
```

### 2. 查詢優化

```java
@Service
public class OrderQueryService {
    
    // 使用 Specification 進行動態查詢
    public Page<Order> findOrdersWithCriteria(OrderSearchCriteria criteria, Pageable pageable) {
        return orderRepository.findAll(Specification
            .where(hasStatus(criteria.getStatuses()))
            .and(createdBetween(criteria.getStartDate(), criteria.getEndDate()))
            .and(hasCustomer(criteria.getCustomerId())), 
            pageable);
    }
    
    private static Specification<Order> hasStatus(Set<OrderStatus> statuses) {
        return (root, query, cb) -> 
            statuses == null || statuses.isEmpty() ? 
            cb.conjunction() : 
            root.get("status").in(statuses);
    }
    
    // 快取常用統計
    @Cacheable("orderStatusStats")
    public Map<OrderStatus, Long> getOrderStatusStatistics() {
        List<Object[]> results = orderRepository.countOrdersByStatus();
        return results.stream()
            .collect(Collectors.toMap(
                row -> (OrderStatus) row[0], 
                row -> (Long) row[1]
            ));
    }
}
```

### 3. 快取策略

```java
@Service
public class OrderStatusCacheService {
    
    private final Cache<String, List<Order>> orderCache;
    
    public OrderStatusCacheService() {
        this.orderCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(5))
            .build();
    }
    
    public List<Order> getCachedOrdersByStatus(OrderStatus status) {
        return orderCache.get(status.getCode(), 
            code -> orderRepository.findByStatus(status));
    }
    
    @EventListener
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        // 清除相關快取
        orderCache.invalidate(event.getOldStatus().getCode());
        orderCache.invalidate(event.getNewStatus().getCode());
    }
}
```

## 測試策略

### 1. 單元測試

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private OrderStatusHistoryService statusHistoryService;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    void testValidStatusTransition() {
        // Given
        Order order = createOrderWithStatus(OrderStatus.PENDING);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        
        // When
        orderService.updateOrderStatus(1L, OrderStatus.CONFIRMED, "客戶確認");
        
        // Then
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        verify(statusHistoryService).recordStatusChange(
            eq(1L), eq(OrderStatus.PENDING), eq(OrderStatus.CONFIRMED), eq("客戶確認"));
    }
    
    @Test
    void testInvalidStatusTransition() {
        // Given
        Order order = createOrderWithStatus(OrderStatus.DELIVERED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        
        // When & Then
        assertThatThrownBy(() -> 
            orderService.updateOrderStatus(1L, OrderStatus.PENDING, "無效轉換"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("無法從");
    }
    
    @Test
    void testOrderStatusEnumProperties() {
        // 測試狀態轉換邏輯
        assertTrue(OrderStatus.CONFIRMED.canTransitionFrom(OrderStatus.PENDING));
        assertFalse(OrderStatus.PENDING.canTransitionFrom(OrderStatus.DELIVERED));
        
        // 測試終結狀態
        assertTrue(OrderStatus.DELIVERED.isFinalStatus());
        assertFalse(OrderStatus.PENDING.isFinalStatus());
        
        // 測試可取消狀態
        assertTrue(OrderStatus.PENDING.isCancellable());
        assertFalse(OrderStatus.DELIVERED.isCancellable());
    }
}
```

### 2. 整合測試

```java
@SpringBootTest
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class OrderStatusIntegrationTest {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Test
    @Transactional
    void testCompleteOrderWorkflow() {
        // 建立訂單
        Order order = createTestOrder();
        order = orderRepository.save(order);
        
        // 確認訂單
        orderService.updateOrderStatus(order.getId(), OrderStatus.CONFIRMED, "自動確認");
        
        // 付款
        orderService.updateOrderStatus(order.getId(), OrderStatus.PAID, "信用卡付款");
        
        // 出貨
        orderService.updateOrderStatus(order.getId(), OrderStatus.SHIPPED, "物流出貨");
        
        // 送達
        orderService.updateOrderStatus(order.getId(), OrderStatus.DELIVERED, "客戶簽收");
        
        // 驗證最終狀態
        Order finalOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.DELIVERED, finalOrder.getStatus());
    }
    
    @Test
    void testDatabaseEnumPersistence() {
        // 測試 Enum 值正確儲存和讀取
        Order order = createTestOrder();
        order.setStatus(OrderStatus.CONFIRMED);
        order = orderRepository.save(order);
        
        // 清除 JPA 快取
        orderRepository.flush();
        entityManager.clear();
        
        // 重新讀取
        Order reloadedOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CONFIRMED, reloadedOrder.getStatus());
    }
}
```

## 最佳實踐與建議

### 1. 設計原則

```java
// ✅ 好的實踐：使用有意義的名稱和描述
public enum UserRole implements CodedEnum {
    ADMIN("ADM", "系統管理員", Set.of("*")),
    MANAGER("MGR", "部門主管", Set.of("USER_MANAGE", "REPORT_VIEW")),
    USER("USR", "一般使用者", Set.of("PROFILE_EDIT"));
    
    private final String code;
    private final String description;
    private final Set<String> permissions;
    
    // 建構子和方法...
}

// ❌ 避免：過於簡單或不清楚的列舉
public enum Status {
    A, B, C, D  // 不清楚的含義
}
```

### 2. 版本管理策略

```java
// 支援向後相容的 Enum 設計
public enum OrderStatus implements CodedEnum {
    
    // 新版本可以安全添加新狀態
    PENDING("PND", "待處理"),
    CONFIRMED("CNF", "已確認"),
    SHIPPED("SHP", "已出貨"),
    DELIVERED("DLV", "已送達"),
    CANCELLED("CXL", "已取消"),
    
    // 新增狀態（向後相容）
    PARTIAL_SHIPPED("PSH", "部分出貨"),  // v2.0 新增
    RETURNED("RET", "已退貨");          // v2.1 新增
    
    // 處理未知狀態的安全機制
    public static OrderStatus fromCodeSafely(String code, OrderStatus defaultValue) {
        try {
            return fromCode(code);
        } catch (IllegalArgumentException e) {
            logger.warn("遇到未知的訂單狀態代碼: {}, 使用預設值: {}", code, defaultValue);
            return defaultValue;
        }
    }
}
```

### 3. 國際化支援

```java
@Component
public class OrderStatusI18nService {
    
    @Autowired
    private MessageSource messageSource;
    
    public String getLocalizedDescription(OrderStatus status, Locale locale) {
        String key = "order.status." + status.name().toLowerCase();
        return messageSource.getMessage(key, null, status.getDescription(), locale);
    }
    
    public Map<OrderStatus, String> getAllLocalizedStatuses(Locale locale) {
        return Arrays.stream(OrderStatus.values())
            .collect(Collectors.toMap(
                status -> status,
                status -> getLocalizedDescription(status, locale)
            ));
    }
}
```

## 監控與維護

### 1. 狀態分佈監控

```java
@Component
public class OrderStatusMetrics {
    
    private final MeterRegistry meterRegistry;
    private final OrderRepository orderRepository;
    
    public OrderStatusMetrics(MeterRegistry meterRegistry, OrderRepository orderRepository) {
        this.meterRegistry = meterRegistry;
        this.orderRepository = orderRepository;
        
        // 註冊度量
        Gauge.builder("orders.by.status")
            .description("訂單狀態分佈")
            .tag("status", "all")
            .register(meterRegistry, this, OrderStatusMetrics::getTotalOrderCount);
    }
    
    @EventListener
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        // 記錄狀態轉換次數
        Counter.builder("order.status.transitions")
            .description("訂單狀態轉換次數")
            .tag("from", event.getOldStatus().getCode())
            .tag("to", event.getNewStatus().getCode())
            .register(meterRegistry)
            .increment();
    }
    
    private double getTotalOrderCount() {
        return orderRepository.count();
    }
}
```

### 2. 效能監控

```java
@Aspect
@Component
public class OrderStatusPerformanceAspect {
    
    @Around("execution(* com.example.service.OrderService.updateOrderStatus(..))")
    public Object measureStatusUpdate(ProceedingJoinPoint joinPoint) throws Throwable {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return joinPoint.proceed();
        } finally {
            sample.stop(Timer.builder("order.status.update.duration")
                .description("訂單狀態更新耗時")
                .register(meterRegistry));
        }
    }
}
```

## 總結

JPA 中的 Enum 處理是企業級應用程式開發的重要技能。透過本文的深入探討，我們了解到：

### 核心要點

1. **選擇適當的映射策略**：生產環境建議使用 `EnumType.STRING` 或自訂轉換器
2. **設計可擴展的 Enum**：考慮未來需求，支援狀態轉換邏輯
3. **效能優化**：合理使用索引、快取和查詢優化
4. **測試完整性**：涵蓋狀態轉換邏輯和持久化測試
5. **監控維護**：建立適當的監控機制

### 實際應用建議

- 對於簡單狀態，使用基本的 `@Enumerated(EnumType.STRING)`
- 對於複雜業務邏輯，實作 `CodedEnum` 介面和自訂轉換器
- 建立狀態轉換規則和歷史追蹤機制
- 考慮國際化和向後相容性
- 實施適當的監控和效能優化策略

正確處理 Enum 型別不僅能提升程式碼的可讀性和維護性，還能確保資料的一致性和業務邏輯的正確執行。

## 踩坑紀錄

### `EnumType.STRING` vs `EnumType.ORDINAL`
`ORDINAL`（預設）儲存 enum 的 index（0, 1, 2...）——一旦 enum 順序調整，所有現有資料就會對應錯誤，且沒有 compile time 錯誤。**生產環境務必用 `STRING`**。

### PostgreSQL Native Enum
PostgreSQL 有原生 `CREATE TYPE status AS ENUM (...)` 型別。Hibernate 6 透過 `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` 支援，但 Flyway migration 需特別處理 enum 值的新增順序（PostgreSQL enum 值只能加在末尾或指定位置，不能刪除）。

## 版本變遷

| 版本 | 變更 |
|------|------|
| JPA 2.0 | `@Enumerated(EnumType.STRING/ORDINAL)` |
| Hibernate 6.0 | `AttributeConverter` 更靈活；`@JdbcTypeCode` 支援 DB native enum |
| Spring Data JPA 3.0 | 與 Hibernate 6 整合，自動轉換改善 |

## 替代方案比較

| 方案 | 優點 | 缺點 |
|------|------|------|
| `@Enumerated(STRING)` | 簡單，可讀 | DB 端無約束，可存任意字串 |
| `AttributeConverter` | 完全自定義映射（含縮寫） | 需手寫 convert/revert |
| PostgreSQL native enum | DB 層強約束 | 不可移植，migration 較複雜 |

## 參考資料

- [JPA 2.2 Specification](https://jcp.org/en/jsr/detail?id=338)
- [Hibernate ORM Documentation](https://hibernate.org/orm/documentation/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
- [Java Enum Best Practices](https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html)
- [Database Design Patterns](https://martinfowler.com/eaaCatalog/)