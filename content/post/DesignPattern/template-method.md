---
title: "模板方法模式 (Template Method Pattern) 完整實作指南：算法骨架設計與企業級流程控制最佳實踐"
author: Bill.Lin
date: 2018-08-07T12:18:20+08:00
draft: false
tags: ["Design Pattern", "Template Method Pattern", "Behavioral Pattern", "Algorithm Framework", "Inheritance", "Hook Methods", "Process Control", "Java", "Spring Boot", "Enterprise Architecture", "Workflow", "Business Process", "Code Reuse", "Hollywood Principle", "Abstract Methods", "Final Methods", "Best Practices"]
Description: "深入探討模板方法模式的完整實作指南，包含算法骨架設計、鉤子方法應用、Spring Boot 模板整合與企業級業務流程控制最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
aliases:
  - /post/DesignPattern/TemplateMethod/

---

## 模板方法模式 (Template Method Pattern) 完整實作指南

### 模式概述

模板方法模式是一種行為設計模式，它在超類中定義了一個算法的骨架，允許子類在不改變算法結構的前提下重新定義算法的某些特定步驟。這個模式體現了「好萊塢原則」(Hollywood Principle) - "Don't call us, we'll call you"，即父類調用子類的方法，而不是子類調用父類方法。

### 核心概念

#### 1. 模板方法模式解決的問題

- **代碼重複**：多個類別中存在相似的算法流程
- **算法變體**：相同的算法骨架，但某些步驟需要不同實現
- **流程控制**：需要確保算法執行的順序和完整性
- **擴展性**：在不修改原有代碼的情況下增加新的算法變體

#### 2. 模式結構

```java
// 抽象模板類別
public abstract class AbstractTemplate {
    
    // 模板方法 - 定義算法骨架
    public final void templateMethod() {
        step1();
        step2();
        if (hook()) {
            step3();
        }
        step4();
    }
    
    // 具體方法 - 所有子類共同的實現
    protected final void step1() {
        System.out.println("執行通用步驟1");
    }
    
    // 抽象方法 - 子類必須實現
    protected abstract void step2();
    protected abstract void step4();
    
    // 可選步驟 - 預設實現
    protected void step3() {
        System.out.println("執行預設步驟3");
    }
    
    // 鉤子方法 - 控制流程
    protected boolean hook() {
        return true;
    }
}

// 具體實現類別
public class ConcreteTemplateA extends AbstractTemplate {
    
    @Override
    protected void step2() {
        System.out.println("ConcreteA 實現步驟2");
    }
    
    @Override
    protected void step4() {
        System.out.println("ConcreteA 實現步驟4");
    }
    
    @Override
    protected boolean hook() {
        return false; // 跳過步驟3
    }
}

public class ConcreteTemplateB extends AbstractTemplate {
    
    @Override
    protected void step2() {
        System.out.println("ConcreteB 實現步驟2");
    }
    
    @Override
    protected void step4() {
        System.out.println("ConcreteB 實現步驟4");
    }
    
    @Override
    protected void step3() {
        System.out.println("ConcreteB 自定義步驟3");
    }
}
```

## 基礎實作範例

### 1. 訂單處理流程模板

```java
/**
 * 訂單處理抽象模板
 */
public abstract class OrderProcessingTemplate {
    
    /**
     * 訂單處理主流程 - 模板方法
     */
    public final OrderResult processOrder(OrderRequest request) {
        try {
            // 1. 訂單驗證
            validateOrder(request);
            logStep("訂單驗證完成");
            
            // 2. 庫存檢查
            checkInventory(request);
            logStep("庫存檢查完成");
            
            // 3. 價格計算
            BigDecimal totalPrice = calculatePrice(request);
            logStep("價格計算完成: " + totalPrice);
            
            // 4. 支付處理 (可選)
            if (requiresPayment()) {
                processPayment(request, totalPrice);
                logStep("支付處理完成");
            }
            
            // 5. 訂單確認
            String orderId = confirmOrder(request, totalPrice);
            logStep("訂單確認完成: " + orderId);
            
            // 6. 後續處理 (鉤子方法)
            if (needsPostProcessing()) {
                performPostProcessing(request, orderId);
                logStep("後續處理完成");
            }
            
            return new OrderResult(orderId, totalPrice, "訂單處理成功");
            
        } catch (Exception e) {
            handleError(request, e);
            return new OrderResult(null, null, "訂單處理失敗: " + e.getMessage());
        }
    }
    
    // 通用方法 - final，不可覆寫
    protected final void logStep(String message) {
        System.out.println("[" + LocalDateTime.now() + "] " + message);
    }
    
    // 抽象方法 - 子類必須實現
    protected abstract void validateOrder(OrderRequest request);
    protected abstract void checkInventory(OrderRequest request);
    protected abstract BigDecimal calculatePrice(OrderRequest request);
    protected abstract String confirmOrder(OrderRequest request, BigDecimal totalPrice);
    
    // 可選方法 - 有預設實現
    protected void processPayment(OrderRequest request, BigDecimal amount) {
        System.out.println("執行預設支付處理: " + amount);
    }
    
    protected void performPostProcessing(OrderRequest request, String orderId) {
        System.out.println("執行預設後續處理");
    }
    
    protected void handleError(OrderRequest request, Exception e) {
        System.err.println("訂單處理錯誤: " + e.getMessage());
    }
    
    // 鉤子方法 - 控制流程
    protected boolean requiresPayment() {
        return true;
    }
    
    protected boolean needsPostProcessing() {
        return false;
    }
}

/**
 * 線上訂單處理
 */
public class OnlineOrderProcessor extends OrderProcessingTemplate {
    
    @Override
    protected void validateOrder(OrderRequest request) {
        if (request.getCustomerId() == null) {
            throw new IllegalArgumentException("線上訂單必須有客戶ID");
        }
        if (request.getShippingAddress() == null) {
            throw new IllegalArgumentException("線上訂單必須有配送地址");
        }
    }
    
    @Override
    protected void checkInventory(OrderRequest request) {
        // 檢查線上庫存
        for (OrderItem item : request.getItems()) {
            System.out.println("檢查線上庫存: " + item.getProductName());
            // 模擬庫存檢查邏輯
        }
    }
    
    @Override
    protected BigDecimal calculatePrice(OrderRequest request) {
        BigDecimal total = request.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // 線上訂單加上運費
        BigDecimal shippingFee = new BigDecimal("50");
        return total.add(shippingFee);
    }
    
    @Override
    protected void processPayment(OrderRequest request, BigDecimal amount) {
        System.out.println("處理線上支付: " + amount);
        // 整合線上支付系統
    }
    
    @Override
    protected String confirmOrder(OrderRequest request, BigDecimal totalPrice) {
        String orderId = "ON-" + System.currentTimeMillis();
        System.out.println("確認線上訂單: " + orderId);
        return orderId;
    }
    
    @Override
    protected void performPostProcessing(OrderRequest request, String orderId) {
        System.out.println("發送訂單確認郵件");
        System.out.println("安排配送");
    }
    
    @Override
    protected boolean needsPostProcessing() {
        return true; // 線上訂單需要後續處理
    }
}

/**
 * 實體店訂單處理
 */
public class StoreOrderProcessor extends OrderProcessingTemplate {
    
    @Override
    protected void validateOrder(OrderRequest request) {
        if (request.getStoreId() == null) {
            throw new IllegalArgumentException("實體店訂單必須有店鋪ID");
        }
    }
    
    @Override
    protected void checkInventory(OrderRequest request) {
        // 檢查店鋪庫存
        for (OrderItem item : request.getItems()) {
            System.out.println("檢查店鋪庫存: " + item.getProductName());
        }
    }
    
    @Override
    protected BigDecimal calculatePrice(OrderRequest request) {
        BigDecimal total = request.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // 實體店可能有會員折扣
        if (request.isMember()) {
            total = total.multiply(new BigDecimal("0.9")); // 9折
        }
        
        return total;
    }
    
    @Override
    protected void processPayment(OrderRequest request, BigDecimal amount) {
        System.out.println("處理現金/刷卡支付: " + amount);
    }
    
    @Override
    protected String confirmOrder(OrderRequest request, BigDecimal totalPrice) {
        String orderId = "ST-" + System.currentTimeMillis();
        System.out.println("確認實體店訂單: " + orderId);
        return orderId;
    }
    
    @Override
    protected boolean requiresPayment() {
        return true; // 實體店即時付款
    }
    
    @Override
    protected boolean needsPostProcessing() {
        return false; // 實體店通常不需要後續處理
    }
}

/**
 * 批發訂單處理
 */
public class WholesaleOrderProcessor extends OrderProcessingTemplate {
    
    @Override
    protected void validateOrder(OrderRequest request) {
        if (request.getCompanyId() == null) {
            throw new IllegalArgumentException("批發訂單必須有公司ID");
        }
        
        // 批發訂單最小數量限制
        int totalQuantity = request.getItems().stream()
            .mapToInt(OrderItem::getQuantity)
            .sum();
        
        if (totalQuantity < 100) {
            throw new IllegalArgumentException("批發訂單最小數量為100件");
        }
    }
    
    @Override
    protected void checkInventory(OrderRequest request) {
        System.out.println("檢查批發倉庫庫存");
        // 批發可能需要預留庫存
    }
    
    @Override
    protected BigDecimal calculatePrice(OrderRequest request) {
        BigDecimal total = request.getItems().stream()
            .map(item -> {
                BigDecimal unitPrice = item.getPrice();
                int quantity = item.getQuantity();
                
                // 批發價格階梯折扣
                if (quantity >= 1000) {
                    unitPrice = unitPrice.multiply(new BigDecimal("0.7")); // 7折
                } else if (quantity >= 500) {
                    unitPrice = unitPrice.multiply(new BigDecimal("0.8")); // 8折
                } else if (quantity >= 100) {
                    unitPrice = unitPrice.multiply(new BigDecimal("0.9")); // 9折
                }
                
                return unitPrice.multiply(BigDecimal.valueOf(quantity));
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return total;
    }
    
    @Override
    protected void processPayment(OrderRequest request, BigDecimal amount) {
        System.out.println("處理批發付款（可能是賒帳）: " + amount);
    }
    
    @Override
    protected String confirmOrder(OrderRequest request, BigDecimal totalPrice) {
        String orderId = "WS-" + System.currentTimeMillis();
        System.out.println("確認批發訂單: " + orderId);
        return orderId;
    }
    
    @Override
    protected void performPostProcessing(OrderRequest request, String orderId) {
        System.out.println("生成批發發票");
        System.out.println("安排物流配送");
        System.out.println("更新客戶信用記錄");
    }
    
    @Override
    protected boolean requiresPayment() {
        return false; // 批發可能允許賒帳
    }
    
    @Override
    protected boolean needsPostProcessing() {
        return true; // 批發需要更多後續處理
    }
}
```

### 2. 輔助類別

```java
/**
 * 訂單請求
 */
public class OrderRequest {
    private String customerId;
    private String storeId;
    private String companyId;
    private List<OrderItem> items;
    private String shippingAddress;
    private boolean member;
    
    public OrderRequest(List<OrderItem> items) {
        this.items = items;
    }
    
    // Getters and Setters
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    
    public String getStoreId() { return storeId; }
    public void setStoreId(String storeId) { this.storeId = storeId; }
    
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    
    public List<OrderItem> getItems() { return items; }
    
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    
    public boolean isMember() { return member; }
    public void setMember(boolean member) { this.member = member; }
}

/**
 * 訂單項目
 */
public class OrderItem {
    private String productId;
    private String productName;
    private BigDecimal price;
    private int quantity;
    
    public OrderItem(String productId, String productName, BigDecimal price, int quantity) {
        this.productId = productId;
        this.productName = productName;
        this.price = price;
        this.quantity = quantity;
    }
    
    // Getters
    public String getProductId() { return productId; }
    public String getProductName() { return productName; }
    public BigDecimal getPrice() { return price; }
    public int getQuantity() { return quantity; }
}

/**
 * 訂單結果
 */
public class OrderResult {
    private String orderId;
    private BigDecimal totalPrice;
    private String message;
    private LocalDateTime timestamp;
    
    public OrderResult(String orderId, BigDecimal totalPrice, String message) {
        this.orderId = orderId;
        this.totalPrice = totalPrice;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters
    public String getOrderId() { return orderId; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    @Override
    public String toString() {
        return String.format("OrderResult{orderId='%s', totalPrice=%s, message='%s'}", 
                           orderId, totalPrice, message);
    }
}
```

### 3. 使用範例

```java
/**
 * 訂單處理系統示範
 */
public class OrderProcessingExample {
    
    public static void main(String[] args) {
        // 創建測試數據
        List<OrderItem> items = Arrays.asList(
            new OrderItem("P001", "筆記型電腦", new BigDecimal("30000"), 2),
            new OrderItem("P002", "滑鼠", new BigDecimal("500"), 5)
        );
        
        // 測試線上訂單
        System.out.println("=== 線上訂單處理 ===");
        testOnlineOrder(items);
        
        // 測試實體店訂單
        System.out.println("\n=== 實體店訂單處理 ===");
        testStoreOrder(items);
        
        // 測試批發訂單
        System.out.println("\n=== 批發訂單處理 ===");
        testWholesaleOrder(items);
    }
    
    private static void testOnlineOrder(List<OrderItem> items) {
        OrderProcessingTemplate processor = new OnlineOrderProcessor();
        OrderRequest request = new OrderRequest(items);
        request.setCustomerId("CUST-001");
        request.setShippingAddress("台北市信義區xxx路123號");
        
        OrderResult result = processor.processOrder(request);
        System.out.println("線上訂單結果: " + result);
    }
    
    private static void testStoreOrder(List<OrderItem> items) {
        OrderProcessingTemplate processor = new StoreOrderProcessor();
        OrderRequest request = new OrderRequest(items);
        request.setStoreId("STORE-001");
        request.setMember(true);
        
        OrderResult result = processor.processOrder(request);
        System.out.println("實體店訂單結果: " + result);
    }
    
    private static void testWholesaleOrder(List<OrderItem> items) {
        // 批發訂單需要更大數量
        List<OrderItem> wholesaleItems = Arrays.asList(
            new OrderItem("P001", "筆記型電腦", new BigDecimal("30000"), 50),
            new OrderItem("P002", "滑鼠", new BigDecimal("500"), 200)
        );
        
        OrderProcessingTemplate processor = new WholesaleOrderProcessor();
        OrderRequest request = new OrderRequest(wholesaleItems);
        request.setCompanyId("COMP-001");
        
        OrderResult result = processor.processOrder(request);
        System.out.println("批發訂單結果: " + result);
    }
}
```

## Spring Boot 整合

### 1. Spring Boot 配置

```java
/**
 * 模板方法模式 Spring Boot 配置
 */
@Configuration
@EnableConfigurationProperties(OrderProcessingProperties.class)
public class TemplateMethodConfig {
    
    @Bean
    @ConditionalOnProperty(name = "order.processing.type", havingValue = "online")
    public OrderProcessingTemplate onlineOrderProcessor() {
        return new OnlineOrderProcessor();
    }
    
    @Bean
    @ConditionalOnProperty(name = "order.processing.type", havingValue = "store")
    public OrderProcessingTemplate storeOrderProcessor() {
        return new StoreOrderProcessor();
    }
    
    @Bean
    @ConditionalOnProperty(name = "order.processing.type", havingValue = "wholesale")
    public OrderProcessingTemplate wholesaleOrderProcessor() {
        return new WholesaleOrderProcessor();
    }
    
    @Bean
    public OrderProcessingService orderProcessingService(
            List<OrderProcessingTemplate> processors) {
        return new OrderProcessingService(processors);
    }
}

/**
 * 配置屬性
 */
@ConfigurationProperties(prefix = "order.processing")
@Data
public class OrderProcessingProperties {
    private String type = "online";
    private boolean enablePostProcessing = true;
    private Duration timeout = Duration.ofMinutes(5);
    private int maxRetries = 3;
}

/**
 * Spring Boot 訂單處理服務
 */
@Service
@Transactional
public class OrderProcessingService {
    
    private final Map<String, OrderProcessingTemplate> processorMap;
    private final ApplicationEventPublisher eventPublisher;
    
    public OrderProcessingService(List<OrderProcessingTemplate> processors,
                                ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
        this.processorMap = processors.stream()
            .collect(Collectors.toMap(
                processor -> determineProcessorType(processor),
                processor -> processor
            ));
    }
    
    public OrderResult processOrder(OrderRequest request, String processorType) {
        OrderProcessingTemplate processor = processorMap.get(processorType);
        
        if (processor == null) {
            throw new IllegalArgumentException("不支援的處理器類型: " + processorType);
        }
        
        // 發布處理開始事件
        eventPublisher.publishEvent(new OrderProcessingStartedEvent(request));
        
        try {
            OrderResult result = processor.processOrder(request);
            
            // 發布處理完成事件
            eventPublisher.publishEvent(new OrderProcessingCompletedEvent(request, result));
            
            return result;
            
        } catch (Exception e) {
            // 發布處理失敗事件
            eventPublisher.publishEvent(new OrderProcessingFailedEvent(request, e));
            throw e;
        }
    }
    
    private String determineProcessorType(OrderProcessingTemplate processor) {
        if (processor instanceof OnlineOrderProcessor) return "online";
        if (processor instanceof StoreOrderProcessor) return "store";
        if (processor instanceof WholesaleOrderProcessor) return "wholesale";
        return "unknown";
    }
}
```

### 2. REST API 控制器

```java
/**
 * 訂單處理 REST API
 */
@RestController
@RequestMapping("/api/orders")
@Validated
public class OrderController {
    
    private final OrderProcessingService orderService;
    
    public OrderController(OrderProcessingService orderService) {
        this.orderService = orderService;
    }
    
    @PostMapping("/process/{type}")
    public ResponseEntity<OrderResponse> processOrder(
            @PathVariable @Pattern(regexp = "online|store|wholesale") String type,
            @Valid @RequestBody OrderRequest request) {
        
        try {
            OrderResult result = orderService.processOrder(request, type);
            return ResponseEntity.ok(OrderResponse.success(result));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(OrderResponse.error(e.getMessage()));
                
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(OrderResponse.error("訂單處理失敗: " + e.getMessage()));
        }
    }
    
    @GetMapping("/processors")
    public ResponseEntity<List<String>> getAvailableProcessors() {
        List<String> processors = Arrays.asList("online", "store", "wholesale");
        return ResponseEntity.ok(processors);
    }
}

/**
 * API 回應封裝
 */
public class OrderResponse {
    private boolean success;
    private String message;
    private OrderResult data;
    private LocalDateTime timestamp;
    
    private OrderResponse(boolean success, String message, OrderResult data) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }
    
    public static OrderResponse success(OrderResult result) {
        return new OrderResponse(true, "處理成功", result);
    }
    
    public static OrderResponse error(String message) {
        return new OrderResponse(false, message, null);
    }
    
    // Getters
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public OrderResult getData() { return data; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
```

## 進階主題

### 1. 效能優化策略

```java
/**
 * 高效能模板方法實作
 */
public abstract class OptimizedOrderProcessingTemplate extends OrderProcessingTemplate {
    
    private final Cache<String, BigDecimal> priceCache;
    private final ExecutorService executorService;
    
    public OptimizedOrderProcessingTemplate() {
        this.priceCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .build();
        this.executorService = Executors.newFixedThreadPool(5);
    }
    
    @Override
    protected BigDecimal calculatePrice(OrderRequest request) {
        String cacheKey = generatePriceCacheKey(request);
        
        return priceCache.get(cacheKey, key -> {
            return performActualPriceCalculation(request);
        });
    }
    
    // 異步後續處理
    @Override
    protected void performPostProcessing(OrderRequest request, String orderId) {
        CompletableFuture.runAsync(() -> {
            doAsyncPostProcessing(request, orderId);
        }, executorService);
    }
    
    protected abstract BigDecimal performActualPriceCalculation(OrderRequest request);
    protected abstract void doAsyncPostProcessing(OrderRequest request, String orderId);
    
    private String generatePriceCacheKey(OrderRequest request) {
        return request.getItems().stream()
            .map(item -> item.getProductId() + ":" + item.getQuantity())
            .collect(Collectors.joining(","));
    }
}
```

### 2. 測試策略

```java
/**
 * 模板方法模式單元測試
 */
@ExtendWith(MockitoExtension.class)
class OrderProcessingTemplateTest {
    
    @Test
    void testOnlineOrderProcessing() {
        // Given
        OnlineOrderProcessor processor = new OnlineOrderProcessor();
        OrderRequest request = createTestOrderRequest();
        request.setCustomerId("CUST-001");
        request.setShippingAddress("Test Address");
        
        // When
        OrderResult result = processor.processOrder(request);
        
        // Then
        assertThat(result.getOrderId()).startsWith("ON-");
        assertThat(result.getTotalPrice()).isGreaterThan(BigDecimal.ZERO);
        assertThat(result.getMessage()).contains("成功");
    }
    
    @Test
    void testTemplateMethodFlow() {
        // Given
        OrderProcessingTemplate processor = new TestOrderProcessor();
        OrderRequest request = createTestOrderRequest();
        
        // When
        OrderResult result = processor.processOrder(request);
        
        // Then
        // 驗證模板方法的執行順序
        verify(processor).validateOrder(request);
        verify(processor).checkInventory(request);
        verify(processor).calculatePrice(request);
        verify(processor).confirmOrder(eq(request), any(BigDecimal.class));
    }
    
    private OrderRequest createTestOrderRequest() {
        List<OrderItem> items = Arrays.asList(
            new OrderItem("P001", "Test Product", new BigDecimal("100"), 1)
        );
        return new OrderRequest(items);
    }
    
    // 測試專用的處理器實現
    private static class TestOrderProcessor extends OrderProcessingTemplate {
        @Override
        protected void validateOrder(OrderRequest request) {}
        
        @Override
        protected void checkInventory(OrderRequest request) {}
        
        @Override
        protected BigDecimal calculatePrice(OrderRequest request) {
            return new BigDecimal("100");
        }
        
        @Override
        protected String confirmOrder(OrderRequest request, BigDecimal totalPrice) {
            return "TEST-ORDER-123";
        }
    }
}
```

## 最佳實踐與建議

### 1. 設計原則

- **開閉原則**：新增處理器類型不需修改現有代碼
- **里氏替換原則**：確保子類能完全替換父類
- **單一職責原則**：每個處理器負責特定類型的訂單處理

### 2. 常見陷阱

#### 避免在模板方法中拋出異常
```java
// ✅ 好的設計 - 統一異常處理
public final OrderResult processOrder(OrderRequest request) {
    try {
        // 模板方法邏輯
        return createSuccessResult();
    } catch (Exception e) {
        handleError(request, e);
        return createErrorResult(e);
    }
}
```

#### 適當使用 final 修飾符
```java
// ✅ 模板方法應該是 final
public final OrderResult processOrder(OrderRequest request) {
    // 算法骨架不可變
}
```

### 3. 使用建議

1. **適用場景**：業務流程固定，但實現細節不同
2. **設計要點**：明確區分變化和不變的部分
3. **與其他模式結合**：可與策略模式、工廠模式組合使用

## 總結

模板方法模式通過將算法骨架固定在父類中，讓子類實現特定的變化部分，實現了代碼重用和流程控制的統一。在企業級應用中，這個模式特別適合工作流程、數據處理管道、業務流程控制等場景。

### 主要優點
- **代碼重用**：提取公共邏輯到父類
- **流程控制**：確保算法執行順序
- **擴展性強**：易於增加新的算法變體

### 主要缺點  
- **繼承限制**：需要使用繼承關係
- **調試困難**：父類調用子類方法的流程不直觀

正確使用模板方法模式可以大幅提升代碼的可維護性和可擴展性，是企業級應用開發中的重要設計模式。