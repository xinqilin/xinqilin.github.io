---
title: "狀態模式 (State Pattern) 完整實作指南：動態行為切換與狀態機設計最佳實踐"
author: Bill.Lin
date: 2018-08-07T22:37:58+08:00
draft: false
tags: ["Design Pattern", "State Pattern", "Behavioral Pattern", "State Machine", "Finite State Machine", "Dynamic Behavior", "Context", "State Transition", "Java", "Spring Boot", "Enterprise Architecture", "Workflow Engine", "Business Process", "Event-Driven Architecture", "Order Processing", "User Authentication", "Document Lifecycle", "Best Practices"]
Description: "深入探討狀態模式的完整實作指南，包含狀態機設計、動態行為切換、狀態轉換控制、Spring Boot 整合與企業級工作流程應用最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 狀態模式 (State Pattern) 完整實作指南

### 模式概述

狀態模式是一種行為設計模式，它允許物件在其內部狀態改變時改變其行為。這個模式將狀態相關的行為抽取到獨立的狀態類別中，讓原物件將工作委派給狀態物件的實例，而不是自行進行處理。

### 核心概念

#### 1. 狀態模式解決的問題

- **複雜的條件邏輯**：避免大量的 if-else 和 switch-case 語句
- **狀態相關行為分散**：將狀態相關的邏輯集中管理
- **狀態轉換複雜性**：提供清晰的狀態轉換機制
- **行為變化管理**：讓物件根據狀態動態改變行為

#### 2. 模式結構

```java
// 狀態介面
public interface State {
    void handle(Context context);
    String getStateName();
}

// 上下文類別
public class Context {
    private State currentState;
    
    public Context(State initialState) {
        this.currentState = initialState;
    }
    
    public void setState(State state) {
        this.currentState = state;
    }
    
    public void request() {
        currentState.handle(this);
    }
    
    public State getCurrentState() {
        return currentState;
    }
}

// 具體狀態類別
public class ConcreteStateA implements State {
    @Override
    public void handle(Context context) {
        System.out.println("處理狀態 A 的邏輯");
        // 可能的狀態轉換
        context.setState(new ConcreteStateB());
    }
    
    @Override
    public String getStateName() {
        return "State A";
    }
}

public class ConcreteStateB implements State {
    @Override
    public void handle(Context context) {
        System.out.println("處理狀態 B 的邏輯");
        // 可能的狀態轉換
        context.setState(new ConcreteStateA());
    }
    
    @Override
    public String getStateName() {
        return "State B";
    }
}
```

## 基礎實作範例

### 1. 文件審核流程

```java
/**
 * 文件審核狀態介面
 */
public interface DocumentState {
    void submit(DocumentContext document);
    void approve(DocumentContext document);
    void reject(DocumentContext document);
    void publish(DocumentContext document);
    String getStatusName();
    boolean canTransitionTo(DocumentState newState);
}

/**
 * 文件上下文類別
 */
public class DocumentContext {
    private DocumentState currentState;
    private String documentId;
    private String content;
    private String author;
    private LocalDateTime lastModified;
    private List<String> reviewComments;
    
    public DocumentContext(String documentId, String content, String author) {
        this.documentId = documentId;
        this.content = content;
        this.author = author;
        this.lastModified = LocalDateTime.now();
        this.reviewComments = new ArrayList<>();
        this.currentState = new DraftState();
    }
    
    public void setState(DocumentState state) {
        if (currentState.canTransitionTo(state)) {
            System.out.println("文件狀態從 " + currentState.getStatusName() + 
                             " 轉換為 " + state.getStatusName());
            this.currentState = state;
            this.lastModified = LocalDateTime.now();
        } else {
            throw new IllegalStateException("無法從 " + currentState.getStatusName() + 
                                          " 轉換為 " + state.getStatusName());
        }
    }
    
    public void submit() { currentState.submit(this); }
    public void approve() { currentState.approve(this); }
    public void reject() { currentState.reject(this); }
    public void publish() { currentState.publish(this); }
    
    // Getters and Setters
    public DocumentState getCurrentState() { return currentState; }
    public String getDocumentId() { return documentId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthor() { return author; }
    public LocalDateTime getLastModified() { return lastModified; }
    public List<String> getReviewComments() { return reviewComments; }
    public void addReviewComment(String comment) { reviewComments.add(comment); }
}

/**
 * 草稿狀態
 */
public class DraftState implements DocumentState {
    
    @Override
    public void submit(DocumentContext document) {
        System.out.println("提交文件進行審核");
        document.setState(new UnderReviewState());
    }
    
    @Override
    public void approve(DocumentContext document) {
        throw new IllegalStateException("草稿狀態無法直接批准");
    }
    
    @Override
    public void reject(DocumentContext document) {
        throw new IllegalStateException("草稿狀態無法拒絕");
    }
    
    @Override
    public void publish(DocumentContext document) {
        throw new IllegalStateException("草稿狀態無法直接發布");
    }
    
    @Override
    public String getStatusName() {
        return "DRAFT";
    }
    
    @Override
    public boolean canTransitionTo(DocumentState newState) {
        return newState instanceof UnderReviewState;
    }
}

/**
 * 審核中狀態
 */
public class UnderReviewState implements DocumentState {
    
    @Override
    public void submit(DocumentContext document) {
        throw new IllegalStateException("文件已在審核中");
    }
    
    @Override
    public void approve(DocumentContext document) {
        System.out.println("審核通過，文件已批准");
        document.setState(new ApprovedState());
    }
    
    @Override
    public void reject(DocumentContext document) {
        System.out.println("審核未通過，文件被拒絕");
        document.setState(new RejectedState());
    }
    
    @Override
    public void publish(DocumentContext document) {
        throw new IllegalStateException("審核中的文件無法直接發布");
    }
    
    @Override
    public String getStatusName() {
        return "UNDER_REVIEW";
    }
    
    @Override
    public boolean canTransitionTo(DocumentState newState) {
        return newState instanceof ApprovedState || newState instanceof RejectedState;
    }
}

/**
 * 已批准狀態
 */
public class ApprovedState implements DocumentState {
    
    @Override
    public void submit(DocumentContext document) {
        throw new IllegalStateException("已批准的文件無法重新提交");
    }
    
    @Override
    public void approve(DocumentContext document) {
        System.out.println("文件已經是批准狀態");
    }
    
    @Override
    public void reject(DocumentContext document) {
        System.out.println("撤銷批准，文件被拒絕");
        document.setState(new RejectedState());
    }
    
    @Override
    public void publish(DocumentContext document) {
        System.out.println("發布文件");
        document.setState(new PublishedState());
    }
    
    @Override
    public String getStatusName() {
        return "APPROVED";
    }
    
    @Override
    public boolean canTransitionTo(DocumentState newState) {
        return newState instanceof PublishedState || newState instanceof RejectedState;
    }
}

/**
 * 已拒絕狀態
 */
public class RejectedState implements DocumentState {
    
    @Override
    public void submit(DocumentContext document) {
        System.out.println("重新提交文件進行審核");
        document.setState(new UnderReviewState());
    }
    
    @Override
    public void approve(DocumentContext document) {
        throw new IllegalStateException("被拒絕的文件無法直接批准");
    }
    
    @Override
    public void reject(DocumentContext document) {
        System.out.println("文件已經是拒絕狀態");
    }
    
    @Override
    public void publish(DocumentContext document) {
        throw new IllegalStateException("被拒絕的文件無法發布");
    }
    
    @Override
    public String getStatusName() {
        return "REJECTED";
    }
    
    @Override
    public boolean canTransitionTo(DocumentState newState) {
        return newState instanceof UnderReviewState;
    }
}

/**
 * 已發布狀態
 */
public class PublishedState implements DocumentState {
    
    @Override
    public void submit(DocumentContext document) {
        throw new IllegalStateException("已發布的文件無法重新提交");
    }
    
    @Override
    public void approve(DocumentContext document) {
        System.out.println("文件已經是發布狀態");
    }
    
    @Override
    public void reject(DocumentContext document) {
        throw new IllegalStateException("已發布的文件無法拒絕");
    }
    
    @Override
    public void publish(DocumentContext document) {
        System.out.println("文件已經是發布狀態");
    }
    
    @Override
    public String getStatusName() {
        return "PUBLISHED";
    }
    
    @Override
    public boolean canTransitionTo(DocumentState newState) {
        return false; // 發布狀態是終端狀態
    }
}
```

### 2. 文件審核流程測試

```java
/**
 * 文件審核流程測試類別
 */
public class DocumentWorkflowExample {
    
    public static void main(String[] args) {
        // 創建文件
        DocumentContext document = new DocumentContext(
            "DOC-001", 
            "這是一份重要的技術文件", 
            "張三"
        );
        
        System.out.println("=== 文件工作流程示範 ===");
        System.out.println("初始狀態: " + document.getCurrentState().getStatusName());
        
        try {
            // 提交審核
            document.submit();
            System.out.println("當前狀態: " + document.getCurrentState().getStatusName());
            
            // 審核通過
            document.approve();
            System.out.println("當前狀態: " + document.getCurrentState().getStatusName());
            
            // 發布文件
            document.publish();
            System.out.println("當前狀態: " + document.getCurrentState().getStatusName());
            
        } catch (IllegalStateException e) {
            System.err.println("狀態轉換錯誤: " + e.getMessage());
        }
        
        // 測試錯誤的狀態轉換
        System.out.println("\n=== 測試錯誤狀態轉換 ===");
        try {
            document.submit(); // 已發布的文件無法重新提交
        } catch (IllegalStateException e) {
            System.err.println("預期錯誤: " + e.getMessage());
        }
    }
}
```

## 企業級應用案例

### 1. 訂單處理系統

```java
/**
 * 訂單狀態介面
 */
public interface OrderState {
    void confirmOrder(OrderContext order);
    void payOrder(OrderContext order);
    void shipOrder(OrderContext order);
    void deliverOrder(OrderContext order);
    void cancelOrder(OrderContext order);
    void returnOrder(OrderContext order);
    OrderStatus getStatus();
    Set<OrderStatus> getAllowedTransitions();
}

/**
 * 訂單狀態枚舉
 */
public enum OrderStatus {
    PENDING("待確認"),
    CONFIRMED("已確認"),
    PAID("已付款"),
    SHIPPED("已發貨"),
    DELIVERED("已送達"),
    CANCELLED("已取消"),
    RETURNED("已退貨");
    
    private final String description;
    
    OrderStatus(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}

/**
 * 訂單上下文類別
 */
public class OrderContext {
    private OrderState currentState;
    private String orderId;
    private String customerId;
    private List<OrderItem> items;
    private BigDecimal totalAmount;
    private LocalDateTime orderDate;
    private LocalDateTime lastUpdated;
    private List<OrderEvent> eventHistory;
    
    public OrderContext(String orderId, String customerId, List<OrderItem> items) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.items = new ArrayList<>(items);
        this.totalAmount = calculateTotal();
        this.orderDate = LocalDateTime.now();
        this.lastUpdated = LocalDateTime.now();
        this.eventHistory = new ArrayList<>();
        this.currentState = new PendingOrderState();
        
        addEvent("ORDER_CREATED", "訂單已創建");
    }
    
    public void setState(OrderState newState) {
        OrderState oldState = this.currentState;
        this.currentState = newState;
        this.lastUpdated = LocalDateTime.now();
        
        addEvent("STATE_CHANGED", 
                String.format("狀態從 %s 變更為 %s", 
                            oldState.getStatus().getDescription(),
                            newState.getStatus().getDescription()));
    }
    
    private void addEvent(String eventType, String description) {
        eventHistory.add(new OrderEvent(LocalDateTime.now(), eventType, description));
    }
    
    private BigDecimal calculateTotal() {
        return items.stream()
                   .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                   .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    // 委派給當前狀態的方法
    public void confirmOrder() { currentState.confirmOrder(this); }
    public void payOrder() { currentState.payOrder(this); }
    public void shipOrder() { currentState.shipOrder(this); }
    public void deliverOrder() { currentState.deliverOrder(this); }
    public void cancelOrder() { currentState.cancelOrder(this); }
    public void returnOrder() { currentState.returnOrder(this); }
    
    // Getters and Setters
    public OrderState getCurrentState() { return currentState; }
    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
    public List<OrderItem> getItems() { return items; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public LocalDateTime getOrderDate() { return orderDate; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public List<OrderEvent> getEventHistory() { return eventHistory; }
}

/**
 * 待確認訂單狀態
 */
public class PendingOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        System.out.println("確認訂單: " + order.getOrderId());
        order.setState(new ConfirmedOrderState());
    }
    
    @Override
    public void payOrder(OrderContext order) {
        throw new IllegalStateException("待確認的訂單無法直接付款");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        throw new IllegalStateException("待確認的訂單無法發貨");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        throw new IllegalStateException("待確認的訂單無法送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        System.out.println("取消訂單: " + order.getOrderId());
        order.setState(new CancelledOrderState());
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        throw new IllegalStateException("待確認的訂單無法退貨");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.PENDING;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED);
    }
}

/**
 * 已確認訂單狀態
 */
public class ConfirmedOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        System.out.println("訂單已經是確認狀態");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        System.out.println("付款成功: " + order.getOrderId());
        // 這裡可以整合支付系統
        order.setState(new PaidOrderState());
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        throw new IllegalStateException("未付款的訂單無法發貨");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        throw new IllegalStateException("未付款的訂單無法送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        System.out.println("取消已確認的訂單: " + order.getOrderId());
        order.setState(new CancelledOrderState());
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        throw new IllegalStateException("未付款的訂單無法退貨");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.CONFIRMED;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(OrderStatus.PAID, OrderStatus.CANCELLED);
    }
}

/**
 * 已付款訂單狀態
 */
public class PaidOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        System.out.println("訂單已經是確認狀態");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        System.out.println("訂單已經付款");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        System.out.println("發貨: " + order.getOrderId());
        // 整合物流系統
        order.setState(new ShippedOrderState());
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        throw new IllegalStateException("未發貨的訂單無法直接送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        System.out.println("取消已付款的訂單，將進行退款: " + order.getOrderId());
        // 這裡需要觸發退款流程
        order.setState(new CancelledOrderState());
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        throw new IllegalStateException("未發貨的訂單無法退貨");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.PAID;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED);
    }
}

/**
 * 已發貨訂單狀態
 */
public class ShippedOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        System.out.println("訂單已經確認並發貨");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        System.out.println("訂單已經付款");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        System.out.println("訂單已經發貨");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        System.out.println("訂單送達: " + order.getOrderId());
        order.setState(new DeliveredOrderState());
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        throw new IllegalStateException("已發貨的訂單無法取消，請聯繫客服");
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        throw new IllegalStateException("未送達的訂單無法退貨");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.SHIPPED;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(OrderStatus.DELIVERED);
    }
}

/**
 * 已送達訂單狀態
 */
public class DeliveredOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        System.out.println("訂單已完成");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        System.out.println("訂單已付款並完成");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        System.out.println("訂單已發貨並送達");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        System.out.println("訂單已經送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        throw new IllegalStateException("已送達的訂單無法取消");
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        System.out.println("處理退貨請求: " + order.getOrderId());
        order.setState(new ReturnedOrderState());
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.DELIVERED;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(OrderStatus.RETURNED);
    }
}

/**
 * 已取消訂單狀態
 */
public class CancelledOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        throw new IllegalStateException("已取消的訂單無法確認");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        throw new IllegalStateException("已取消的訂單無法付款");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        throw new IllegalStateException("已取消的訂單無法發貨");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        throw new IllegalStateException("已取消的訂單無法送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        System.out.println("訂單已經是取消狀態");
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        throw new IllegalStateException("已取消的訂單無法退貨");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.CANCELLED;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(); // 終端狀態
    }
}

/**
 * 已退貨訂單狀態
 */
public class ReturnedOrderState implements OrderState {
    
    @Override
    public void confirmOrder(OrderContext order) {
        throw new IllegalStateException("已退貨的訂單無法確認");
    }
    
    @Override
    public void payOrder(OrderContext order) {
        throw new IllegalStateException("已退貨的訂單無法付款");
    }
    
    @Override
    public void shipOrder(OrderContext order) {
        throw new IllegalStateException("已退貨的訂單無法發貨");
    }
    
    @Override
    public void deliverOrder(OrderContext order) {
        throw new IllegalStateException("已退貨的訂單無法送達");
    }
    
    @Override
    public void cancelOrder(OrderContext order) {
        throw new IllegalStateException("已退貨的訂單無法取消");
    }
    
    @Override
    public void returnOrder(OrderContext order) {
        System.out.println("訂單已經是退貨狀態");
    }
    
    @Override
    public OrderStatus getStatus() {
        return OrderStatus.RETURNED;
    }
    
    @Override
    public Set<OrderStatus> getAllowedTransitions() {
        return Set.of(); // 終端狀態
    }
}

/**
 * 輔助類別
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

public class OrderEvent {
    private LocalDateTime timestamp;
    private String eventType;
    private String description;
    
    public OrderEvent(LocalDateTime timestamp, String eventType, String description) {
        this.timestamp = timestamp;
        this.eventType = eventType;
        this.description = description;
    }
    
    // Getters
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getEventType() { return eventType; }
    public String getDescription() { return description; }
    
    @Override
    public String toString() {
        return String.format("[%s] %s: %s", timestamp, eventType, description);
    }
}
```

### 2. 訂單處理系統測試

```java
/**
 * 訂單處理系統示範
 */
public class OrderProcessingExample {
    
    public static void main(String[] args) {
        // 創建訂單項目
        List<OrderItem> items = Arrays.asList(
            new OrderItem("P001", "筆記型電腦", new BigDecimal("50000"), 1),
            new OrderItem("P002", "滑鼠", new BigDecimal("1000"), 2)
        );
        
        // 創建訂單
        OrderContext order = new OrderContext("ORDER-2023-001", "CUST-001", items);
        
        System.out.println("=== 訂單處理流程示範 ===");
        System.out.println("訂單總額: " + order.getTotalAmount());
        System.out.println("初始狀態: " + order.getCurrentState().getStatus().getDescription());
        
        try {
            // 正常流程
            order.confirmOrder();
            System.out.println("當前狀態: " + order.getCurrentState().getStatus().getDescription());
            
            order.payOrder();
            System.out.println("當前狀態: " + order.getCurrentState().getStatus().getDescription());
            
            order.shipOrder();
            System.out.println("當前狀態: " + order.getCurrentState().getStatus().getDescription());
            
            order.deliverOrder();
            System.out.println("當前狀態: " + order.getCurrentState().getStatus().getDescription());
            
            // 查看事件歷史
            System.out.println("\n=== 訂單事件歷史 ===");
            order.getEventHistory().forEach(System.out::println);
            
        } catch (IllegalStateException e) {
            System.err.println("狀態轉換錯誤: " + e.getMessage());
        }
    }
}
```

## Spring Boot 整合

### 1. 狀態管理服務

```java
/**
 * 狀態工廠介面
 */
public interface StateFactory<T extends Enum<T>> {
    State createState(T stateType);
    Set<T> getValidTransitions(T currentState);
}

/**
 * 文件狀態工廠
 */
@Component
public class DocumentStateFactory implements StateFactory<DocumentStatus> {
    
    private final Map<DocumentStatus, Supplier<DocumentState>> stateCreators;
    private final Map<DocumentStatus, Set<DocumentStatus>> transitionRules;
    
    public DocumentStateFactory() {
        // 初始化狀態創建器
        stateCreators = Map.of(
            DocumentStatus.DRAFT, DraftState::new,
            DocumentStatus.UNDER_REVIEW, UnderReviewState::new,
            DocumentStatus.APPROVED, ApprovedState::new,
            DocumentStatus.REJECTED, RejectedState::new,
            DocumentStatus.PUBLISHED, PublishedState::new
        );
        
        // 初始化狀態轉換規則
        transitionRules = Map.of(
            DocumentStatus.DRAFT, Set.of(DocumentStatus.UNDER_REVIEW),
            DocumentStatus.UNDER_REVIEW, Set.of(DocumentStatus.APPROVED, DocumentStatus.REJECTED),
            DocumentStatus.APPROVED, Set.of(DocumentStatus.PUBLISHED, DocumentStatus.REJECTED),
            DocumentStatus.REJECTED, Set.of(DocumentStatus.UNDER_REVIEW),
            DocumentStatus.PUBLISHED, Set.of() // 終端狀態
        );
    }
    
    @Override
    public DocumentState createState(DocumentStatus stateType) {
        Supplier<DocumentState> creator = stateCreators.get(stateType);
        if (creator == null) {
            throw new IllegalArgumentException("未知的文件狀態: " + stateType);
        }
        return creator.get();
    }
    
    @Override
    public Set<DocumentStatus> getValidTransitions(DocumentStatus currentState) {
        return transitionRules.getOrDefault(currentState, Set.of());
    }
}

/**
 * 文件狀態枚舉
 */
public enum DocumentStatus {
    DRAFT, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED
}

/**
 * 文件實體
 */
@Entity
@Table(name = "documents")
public class DocumentEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String documentId;
    
    @Column(nullable = false)
    private String title;
    
    @Lob
    private String content;
    
    @Column(nullable = false)
    private String author;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DocumentEventEntity> events = new ArrayList<>();
    
    // Constructors, Getters, and Setters
    public DocumentEntity() {}
    
    public DocumentEntity(String documentId, String title, String content, String author) {
        this.documentId = documentId;
        this.title = title;
        this.content = content;
        this.author = author;
        this.status = DocumentStatus.DRAFT;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    
    public DocumentStatus getStatus() { return status; }
    public void setStatus(DocumentStatus status) { this.status = status; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    
    public List<DocumentEventEntity> getEvents() { return events; }
}

/**
 * 文件事件實體
 */
@Entity
@Table(name = "document_events")
public class DocumentEventEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    private DocumentEntity document;
    
    @Column(nullable = false)
    private String eventType;
    
    @Column(nullable = false)
    private String description;
    
    @CreationTimestamp
    private LocalDateTime timestamp;
    
    // Constructors, Getters, and Setters
    public DocumentEventEntity() {}
    
    public DocumentEventEntity(DocumentEntity document, String eventType, String description) {
        this.document = document;
        this.eventType = eventType;
        this.description = description;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public DocumentEntity getDocument() { return document; }
    public String getEventType() { return eventType; }
    public String getDescription() { return description; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

/**
 * 文件管理服務
 */
@Service
@Transactional
public class DocumentManagementService {
    
    private final DocumentRepository documentRepository;
    private final DocumentEventRepository eventRepository;
    private final DocumentStateFactory stateFactory;
    private final ApplicationEventPublisher eventPublisher;
    
    public DocumentManagementService(DocumentRepository documentRepository,
                                   DocumentEventRepository eventRepository,
                                   DocumentStateFactory stateFactory,
                                   ApplicationEventPublisher eventPublisher) {
        this.documentRepository = documentRepository;
        this.eventRepository = eventRepository;
        this.stateFactory = stateFactory;
        this.eventPublisher = eventPublisher;
    }
    
    public DocumentEntity createDocument(String title, String content, String author) {
        String documentId = "DOC-" + System.currentTimeMillis();
        DocumentEntity document = new DocumentEntity(documentId, title, content, author);
        
        DocumentEntity savedDocument = documentRepository.save(document);
        recordEvent(savedDocument, "DOCUMENT_CREATED", "文件已創建");
        
        return savedDocument;
    }
    
    public DocumentEntity transitionState(String documentId, DocumentStatus newStatus) {
        DocumentEntity document = documentRepository.findByDocumentId(documentId)
            .orElseThrow(() -> new EntityNotFoundException("文件不存在: " + documentId));
        
        DocumentStatus currentStatus = document.getStatus();
        
        // 驗證狀態轉換是否有效
        Set<DocumentStatus> validTransitions = stateFactory.getValidTransitions(currentStatus);
        if (!validTransitions.contains(newStatus)) {
            throw new IllegalStateException(
                String.format("無法從狀態 %s 轉換到 %s", currentStatus, newStatus));
        }
        
        // 執行狀態轉換
        document.setStatus(newStatus);
        DocumentEntity savedDocument = documentRepository.save(document);
        
        // 記錄事件
        recordEvent(savedDocument, "STATE_CHANGED", 
                   String.format("狀態從 %s 變更為 %s", currentStatus, newStatus));
        
        // 發布領域事件
        eventPublisher.publishEvent(new DocumentStateChangedEvent(
            documentId, currentStatus, newStatus, LocalDateTime.now()));
        
        return savedDocument;
    }
    
    public DocumentEntity submitForReview(String documentId) {
        return transitionState(documentId, DocumentStatus.UNDER_REVIEW);
    }
    
    public DocumentEntity approveDocument(String documentId, String reviewComment) {
        DocumentEntity document = transitionState(documentId, DocumentStatus.APPROVED);
        if (reviewComment != null && !reviewComment.trim().isEmpty()) {
            recordEvent(document, "REVIEW_COMMENT", reviewComment);
        }
        return document;
    }
    
    public DocumentEntity rejectDocument(String documentId, String rejectionReason) {
        DocumentEntity document = transitionState(documentId, DocumentStatus.REJECTED);
        if (rejectionReason != null && !rejectionReason.trim().isEmpty()) {
            recordEvent(document, "REJECTION_REASON", rejectionReason);
        }
        return document;
    }
    
    public DocumentEntity publishDocument(String documentId) {
        return transitionState(documentId, DocumentStatus.PUBLISHED);
    }
    
    @Transactional(readOnly = true)
    public DocumentEntity getDocument(String documentId) {
        return documentRepository.findByDocumentId(documentId)
            .orElseThrow(() -> new EntityNotFoundException("文件不存在: " + documentId));
    }
    
    @Transactional(readOnly = true)
    public List<DocumentEventEntity> getDocumentHistory(String documentId) {
        DocumentEntity document = getDocument(documentId);
        return eventRepository.findByDocumentOrderByTimestampAsc(document);
    }
    
    private void recordEvent(DocumentEntity document, String eventType, String description) {
        DocumentEventEntity event = new DocumentEventEntity(document, eventType, description);
        eventRepository.save(event);
    }
}

/**
 * 文件狀態變更事件
 */
public class DocumentStateChangedEvent {
    private final String documentId;
    private final DocumentStatus fromStatus;
    private final DocumentStatus toStatus;
    private final LocalDateTime timestamp;
    
    public DocumentStateChangedEvent(String documentId, DocumentStatus fromStatus, 
                                   DocumentStatus toStatus, LocalDateTime timestamp) {
        this.documentId = documentId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.timestamp = timestamp;
    }
    
    // Getters
    public String getDocumentId() { return documentId; }
    public DocumentStatus getFromStatus() { return fromStatus; }
    public DocumentStatus getToStatus() { return toStatus; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

/**
 * 事件監聽器
 */
@Component
public class DocumentEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(DocumentEventListener.class);
    
    @EventListener
    public void handleDocumentStateChanged(DocumentStateChangedEvent event) {
        logger.info("文件狀態變更: {} 從 {} 變更為 {}", 
                   event.getDocumentId(), 
                   event.getFromStatus(), 
                   event.getToStatus());
        
        // 根據狀態變更執行相應的業務邏輯
        switch (event.getToStatus()) {
            case UNDER_REVIEW:
                sendReviewNotification(event.getDocumentId());
                break;
            case APPROVED:
                sendApprovalNotification(event.getDocumentId());
                break;
            case PUBLISHED:
                sendPublicationNotification(event.getDocumentId());
                break;
            default:
                // 其他狀態的處理
                break;
        }
    }
    
    private void sendReviewNotification(String documentId) {
        logger.info("發送審核通知: {}", documentId);
        // 實作通知邏輯
    }
    
    private void sendApprovalNotification(String documentId) {
        logger.info("發送批准通知: {}", documentId);
        // 實作通知邏輯
    }
    
    private void sendPublicationNotification(String documentId) {
        logger.info("發送發布通知: {}", documentId);
        // 實作通知邏輯
    }
}
```

### 2. REST API 控制器

```java
/**
 * 文件管理 REST API
 */
@RestController
@RequestMapping("/api/documents")
@Validated
public class DocumentController {
    
    private final DocumentManagementService documentService;
    
    public DocumentController(DocumentManagementService documentService) {
        this.documentService = documentService;
    }
    
    @PostMapping
    public ResponseEntity<DocumentResponse> createDocument(
            @Valid @RequestBody CreateDocumentRequest request) {
        
        DocumentEntity document = documentService.createDocument(
            request.getTitle(),
            request.getContent(),
            request.getAuthor()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED)
                           .body(DocumentResponse.from(document));
    }
    
    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> getDocument(
            @PathVariable @NotBlank String documentId) {
        
        DocumentEntity document = documentService.getDocument(documentId);
        return ResponseEntity.ok(DocumentResponse.from(document));
    }
    
    @PostMapping("/{documentId}/submit")
    public ResponseEntity<DocumentResponse> submitDocument(
            @PathVariable @NotBlank String documentId) {
        
        DocumentEntity document = documentService.submitForReview(documentId);
        return ResponseEntity.ok(DocumentResponse.from(document));
    }
    
    @PostMapping("/{documentId}/approve")
    public ResponseEntity<DocumentResponse> approveDocument(
            @PathVariable @NotBlank String documentId,
            @RequestBody(required = false) ApprovalRequest request) {
        
        String comment = request != null ? request.getComment() : null;
        DocumentEntity document = documentService.approveDocument(documentId, comment);
        return ResponseEntity.ok(DocumentResponse.from(document));
    }
    
    @PostMapping("/{documentId}/reject")
    public ResponseEntity<DocumentResponse> rejectDocument(
            @PathVariable @NotBlank String documentId,
            @Valid @RequestBody RejectionRequest request) {
        
        DocumentEntity document = documentService.rejectDocument(
            documentId, request.getReason());
        return ResponseEntity.ok(DocumentResponse.from(document));
    }
    
    @PostMapping("/{documentId}/publish")
    public ResponseEntity<DocumentResponse> publishDocument(
            @PathVariable @NotBlank String documentId) {
        
        DocumentEntity document = documentService.publishDocument(documentId);
        return ResponseEntity.ok(DocumentResponse.from(document));
    }
    
    @GetMapping("/{documentId}/history")
    public ResponseEntity<List<DocumentEventResponse>> getDocumentHistory(
            @PathVariable @NotBlank String documentId) {
        
        List<DocumentEventEntity> events = documentService.getDocumentHistory(documentId);
        List<DocumentEventResponse> responses = events.stream()
            .map(DocumentEventResponse::from)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(responses);
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(
            IllegalStateException ex) {
        
        ErrorResponse error = new ErrorResponse("STATE_TRANSITION_ERROR", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFoundException(
            EntityNotFoundException ex) {
        
        ErrorResponse error = new ErrorResponse("ENTITY_NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}

/**
 * 請求/回應 DTO 類別
 */
public class CreateDocumentRequest {
    @NotBlank(message = "標題不能為空")
    private String title;
    
    @NotBlank(message = "內容不能為空")
    private String content;
    
    @NotBlank(message = "作者不能為空")
    private String author;
    
    // Getters and Setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
}

public class ApprovalRequest {
    private String comment;
    
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}

public class RejectionRequest {
    @NotBlank(message = "拒絕原因不能為空")
    private String reason;
    
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}

public class DocumentResponse {
    private String documentId;
    private String title;
    private String content;
    private String author;
    private DocumentStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static DocumentResponse from(DocumentEntity entity) {
        DocumentResponse response = new DocumentResponse();
        response.documentId = entity.getDocumentId();
        response.title = entity.getTitle();
        response.content = entity.getContent();
        response.author = entity.getAuthor();
        response.status = entity.getStatus();
        response.createdAt = entity.getCreatedAt();
        response.updatedAt = entity.getUpdatedAt();
        return response;
    }
    
    // Getters
    public String getDocumentId() { return documentId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getAuthor() { return author; }
    public DocumentStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

public class DocumentEventResponse {
    private String eventType;
    private String description;
    private LocalDateTime timestamp;
    
    public static DocumentEventResponse from(DocumentEventEntity entity) {
        DocumentEventResponse response = new DocumentEventResponse();
        response.eventType = entity.getEventType();
        response.description = entity.getDescription();
        response.timestamp = entity.getTimestamp();
        return response;
    }
    
    // Getters
    public String getEventType() { return eventType; }
    public String getDescription() { return description; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

public class ErrorResponse {
    private String errorCode;
    private String message;
    private LocalDateTime timestamp;
    
    public ErrorResponse(String errorCode, String message) {
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters
    public String getErrorCode() { return errorCode; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
```

## 狀態機引擎實作

### 1. 通用狀態機引擎

```java
/**
 * 通用狀態機介面
 */
public interface StateMachine<S extends Enum<S>, E extends Enum<E>, C> {
    S getCurrentState();
    void sendEvent(E event, C context);
    Set<E> getAvailableEvents();
    boolean canTransition(E event);
    void addTransitionListener(TransitionListener<S, E, C> listener);
    void removeTransitionListener(TransitionListener<S, E, C> listener);
}

/**
 * 狀態轉換監聽器
 */
public interface TransitionListener<S extends Enum<S>, E extends Enum<E>, C> {
    void onTransition(S fromState, S toState, E event, C context);
    void onTransitionFailed(S currentState, E event, C context, Exception exception);
}

/**
 * 狀態轉換定義
 */
public class StateTransition<S extends Enum<S>, E extends Enum<E>, C> {
    private final S fromState;
    private final S toState;
    private final E event;
    private final Predicate<C> guard;
    private final Consumer<C> action;
    
    public StateTransition(S fromState, S toState, E event) {
        this(fromState, toState, event, null, null);
    }
    
    public StateTransition(S fromState, S toState, E event, Predicate<C> guard) {
        this(fromState, toState, event, guard, null);
    }
    
    public StateTransition(S fromState, S toState, E event, 
                          Predicate<C> guard, Consumer<C> action) {
        this.fromState = fromState;
        this.toState = toState;
        this.event = event;
        this.guard = guard != null ? guard : context -> true;
        this.action = action;
    }
    
    public boolean canExecute(S currentState, E triggerEvent, C context) {
        return fromState.equals(currentState) && 
               event.equals(triggerEvent) && 
               guard.test(context);
    }
    
    public void execute(C context) {
        if (action != null) {
            action.accept(context);
        }
    }
    
    // Getters
    public S getFromState() { return fromState; }
    public S getToState() { return toState; }
    public E getEvent() { return event; }
}

/**
 * 狀態機實作
 */
public class DefaultStateMachine<S extends Enum<S>, E extends Enum<E>, C> 
       implements StateMachine<S, E, C> {
    
    private S currentState;
    private final Map<String, StateTransition<S, E, C>> transitions;
    private final List<TransitionListener<S, E, C>> listeners;
    
    public DefaultStateMachine(S initialState) {
        this.currentState = initialState;
        this.transitions = new ConcurrentHashMap<>();
        this.listeners = new CopyOnWriteArrayList<>();
    }
    
    public void addTransition(StateTransition<S, E, C> transition) {
        String key = createTransitionKey(transition.getFromState(), transition.getEvent());
        transitions.put(key, transition);
    }
    
    @Override
    public synchronized void sendEvent(E event, C context) {
        String key = createTransitionKey(currentState, event);
        StateTransition<S, E, C> transition = transitions.get(key);
        
        if (transition == null) {
            String error = String.format("沒有從狀態 %s 透過事件 %s 的轉換", currentState, event);
            notifyTransitionFailed(currentState, event, context, 
                                 new IllegalStateException(error));
            throw new IllegalStateException(error);
        }
        
        if (!transition.canExecute(currentState, event, context)) {
            String error = String.format("轉換條件不滿足: %s -> %s (%s)", 
                                        currentState, transition.getToState(), event);
            notifyTransitionFailed(currentState, event, context, 
                                 new IllegalStateException(error));
            throw new IllegalStateException(error);
        }
        
        try {
            S fromState = currentState;
            transition.execute(context);
            currentState = transition.getToState();
            notifyTransition(fromState, currentState, event, context);
        } catch (Exception e) {
            notifyTransitionFailed(currentState, event, context, e);
            throw new RuntimeException("狀態轉換執行失敗", e);
        }
    }
    
    @Override
    public S getCurrentState() {
        return currentState;
    }
    
    @Override
    public Set<E> getAvailableEvents() {
        return transitions.keySet().stream()
            .filter(key -> key.startsWith(currentState.name() + ":"))
            .map(key -> key.substring(key.indexOf(":") + 1))
            .map(eventName -> Enum.valueOf(getEventClass(), eventName))
            .collect(Collectors.toSet());
    }
    
    @Override
    public boolean canTransition(E event) {
        String key = createTransitionKey(currentState, event);
        return transitions.containsKey(key);
    }
    
    @Override
    public void addTransitionListener(TransitionListener<S, E, C> listener) {
        listeners.add(listener);
    }
    
    @Override
    public void removeTransitionListener(TransitionListener<S, E, C> listener) {
        listeners.remove(listener);
    }
    
    private String createTransitionKey(S state, E event) {
        return state.name() + ":" + event.name();
    }
    
    private void notifyTransition(S fromState, S toState, E event, C context) {
        for (TransitionListener<S, E, C> listener : listeners) {
            try {
                listener.onTransition(fromState, toState, event, context);
            } catch (Exception e) {
                System.err.println("轉換監聽器執行錯誤: " + e.getMessage());
            }
        }
    }
    
    private void notifyTransitionFailed(S currentState, E event, C context, Exception exception) {
        for (TransitionListener<S, E, C> listener : listeners) {
            try {
                listener.onTransitionFailed(currentState, event, context, exception);
            } catch (Exception e) {
                System.err.println("轉換失敗監聽器執行錯誤: " + e.getMessage());
            }
        }
    }
    
    @SuppressWarnings("unchecked")
    private Class<E> getEventClass() {
        // 這是一個簡化的實作，實際應用中可能需要更複雜的類型推斷
        return (Class<E>) transitions.values().iterator().next().getEvent().getClass();
    }
}

/**
 * 狀態機建構器
 */
public class StateMachineBuilder<S extends Enum<S>, E extends Enum<E>, C> {
    
    private final S initialState;
    private final List<StateTransition<S, E, C>> transitions;
    
    public StateMachineBuilder(S initialState) {
        this.initialState = initialState;
        this.transitions = new ArrayList<>();
    }
    
    public static <S extends Enum<S>, E extends Enum<E>, C> 
           StateMachineBuilder<S, E, C> create(S initialState) {
        return new StateMachineBuilder<>(initialState);
    }
    
    public StateMachineBuilder<S, E, C> transition(S from, S to, E event) {
        transitions.add(new StateTransition<>(from, to, event));
        return this;
    }
    
    public StateMachineBuilder<S, E, C> transition(S from, S to, E event, Predicate<C> guard) {
        transitions.add(new StateTransition<>(from, to, event, guard));
        return this;
    }
    
    public StateMachineBuilder<S, E, C> transition(S from, S to, E event, 
                                                  Predicate<C> guard, Consumer<C> action) {
        transitions.add(new StateTransition<>(from, to, event, guard, action));
        return this;
    }
    
    public StateMachine<S, E, C> build() {
        DefaultStateMachine<S, E, C> stateMachine = new DefaultStateMachine<>(initialState);
        transitions.forEach(stateMachine::addTransition);
        return stateMachine;
    }
}
```

### 2. 狀態機使用範例

```java
/**
 * 訂單狀態和事件定義
 */
public enum OrderState {
    PENDING, CONFIRMED, PAID, SHIPPED, DELIVERED, CANCELLED, RETURNED
}

public enum OrderEvent {
    CONFIRM, PAY, SHIP, DELIVER, CANCEL, RETURN
}

/**
 * 訂單上下文
 */
public class OrderContext {
    private String orderId;
    private BigDecimal amount;
    private String customerId;
    private boolean paymentVerified;
    private boolean inventoryAvailable;
    
    public OrderContext(String orderId, BigDecimal amount, String customerId) {
        this.orderId = orderId;
        this.amount = amount;
        this.customerId = customerId;
        this.paymentVerified = false;
        this.inventoryAvailable = true;
    }
    
    // Getters and Setters
    public String getOrderId() { return orderId; }
    public BigDecimal getAmount() { return amount; }
    public String getCustomerId() { return customerId; }
    public boolean isPaymentVerified() { return paymentVerified; }
    public void setPaymentVerified(boolean paymentVerified) { this.paymentVerified = paymentVerified; }
    public boolean isInventoryAvailable() { return inventoryAvailable; }
    public void setInventoryAvailable(boolean inventoryAvailable) { this.inventoryAvailable = inventoryAvailable; }
}

/**
 * 訂單狀態機範例
 */
public class OrderStateMachineExample {
    
    public static void main(String[] args) {
        // 建立訂單狀態機
        StateMachine<OrderState, OrderEvent, OrderContext> orderStateMachine = 
            StateMachineBuilder.<OrderState, OrderEvent, OrderContext>create(OrderState.PENDING)
                
                // 基本轉換
                .transition(OrderState.PENDING, OrderState.CONFIRMED, OrderEvent.CONFIRM)
                .transition(OrderState.CONFIRMED, OrderState.PAID, OrderEvent.PAY, 
                           context -> context.isInventoryAvailable()) // 有庫存才能付款
                .transition(OrderState.PAID, OrderState.SHIPPED, OrderEvent.SHIP,
                           context -> context.isPaymentVerified()) // 付款確認後才能發貨
                .transition(OrderState.SHIPPED, OrderState.DELIVERED, OrderEvent.DELIVER)
                
                // 取消轉換
                .transition(OrderState.PENDING, OrderState.CANCELLED, OrderEvent.CANCEL)
                .transition(OrderState.CONFIRMED, OrderState.CANCELLED, OrderEvent.CANCEL)
                .transition(OrderState.PAID, OrderState.CANCELLED, OrderEvent.CANCEL,
                           null, context -> System.out.println("執行退款: " + context.getOrderId()))
                
                // 退貨轉換
                .transition(OrderState.DELIVERED, OrderState.RETURNED, OrderEvent.RETURN,
                           null, context -> System.out.println("處理退貨: " + context.getOrderId()))
                
                .build();
        
        // 添加轉換監聽器
        orderStateMachine.addTransitionListener(new TransitionListener<OrderState, OrderEvent, OrderContext>() {
            @Override
            public void onTransition(OrderState fromState, OrderState toState, 
                                   OrderEvent event, OrderContext context) {
                System.out.printf("訂單 %s: %s -> %s (事件: %s)\n", 
                                context.getOrderId(), fromState, toState, event);
            }
            
            @Override
            public void onTransitionFailed(OrderState currentState, OrderEvent event, 
                                         OrderContext context, Exception exception) {
                System.err.printf("轉換失敗 - 訂單 %s 在狀態 %s 執行事件 %s: %s\n",
                                context.getOrderId(), currentState, event, exception.getMessage());
            }
        });
        
        // 模擬訂單處理流程
        OrderContext orderContext = new OrderContext("ORDER-001", new BigDecimal("1000"), "CUST-001");
        
        try {
            System.out.println("=== 訂單處理流程 ===");
            System.out.println("初始狀態: " + orderStateMachine.getCurrentState());
            System.out.println("可用事件: " + orderStateMachine.getAvailableEvents());
            
            // 確認訂單
            orderStateMachine.sendEvent(OrderEvent.CONFIRM, orderContext);
            System.out.println("可用事件: " + orderStateMachine.getAvailableEvents());
            
            // 付款
            orderStateMachine.sendEvent(OrderEvent.PAY, orderContext);
            System.out.println("可用事件: " + orderStateMachine.getAvailableEvents());
            
            // 驗證付款
            orderContext.setPaymentVerified(true);
            
            // 發貨
            orderStateMachine.sendEvent(OrderEvent.SHIP, orderContext);
            System.out.println("可用事件: " + orderStateMachine.getAvailableEvents());
            
            // 送達
            orderStateMachine.sendEvent(OrderEvent.DELIVER, orderContext);
            System.out.println("最終狀態: " + orderStateMachine.getCurrentState());
            System.out.println("可用事件: " + orderStateMachine.getAvailableEvents());
            
        } catch (Exception e) {
            System.err.println("處理錯誤: " + e.getMessage());
        }
    }
}
```

## 最佳實踐與設計原則

### 1. 狀態模式 vs 策略模式

| 特徵 | 狀態模式 | 策略模式 |
|------|----------|----------|
| **目的** | 根據內部狀態改變行為 | 封裝可互換的算法 |
| **狀態/策略數量** | 通常固定且有限 | 可動態擴展 |
| **轉換控制** | 狀態自己控制轉換 | 客戶端選擇策略 |
| **上下文依賴** | 狀態知道上下文 | 策略相對獨立 |
| **生命週期** | 狀態可能有生命週期 | 策略通常無狀態 |

### 2. 設計原則

#### 單一職責原則 (SRP)
```java
// ✅ 好的設計：每個狀態類別只負責一個狀態的行為
public class DraftDocumentState implements DocumentState {
    @Override
    public void submit(DocumentContext context) {
        // 只處理草稿狀態的提交邏輯
        validateDocument(context);
        context.setState(new UnderReviewState());
    }
    
    private void validateDocument(DocumentContext context) {
        // 文件驗證邏輯
    }
}

// ❌ 壞的設計：一個類別處理多個狀態
public class DocumentProcessor {
    public void processDocument(DocumentContext context, String action) {
        switch (context.getStatus()) {
            case DRAFT:
                if ("submit".equals(action)) {
                    // 處理提交
                }
                break;
            case UNDER_REVIEW:
                if ("approve".equals(action)) {
                    // 處理批准
                }
                break;
            // 更多狀態...
        }
    }
}
```

#### 開閉原則 (OCP)
```java
// ✅ 容易擴展：添加新狀態不需要修改現有代碼
public class ArchiveState implements DocumentState {
    @Override
    public void submit(DocumentContext document) {
        throw new IllegalStateException("已歸檔的文件無法重新提交");
    }
    
    @Override
    public void approve(DocumentContext document) {
        throw new IllegalStateException("已歸檔的文件無法批准");
    }
    
    // 實現其他方法...
}
```

### 3. 效能優化策略

#### 狀態實例管理
```java
/**
 * 狀態實例池 - 避免重複創建狀態對象
 */
public class StateInstancePool {
    private static final Map<Class<? extends DocumentState>, DocumentState> INSTANCE_POOL = 
        new ConcurrentHashMap<>();
    
    @SuppressWarnings("unchecked")
    public static <T extends DocumentState> T getInstance(Class<T> stateClass) {
        return (T) INSTANCE_POOL.computeIfAbsent(stateClass, key -> {
            try {
                return key.getDeclaredConstructor().newInstance();
            } catch (Exception e) {
                throw new RuntimeException("無法創建狀態實例: " + key.getName(), e);
            }
        });
    }
}

// 使用狀態池
public class OptimizedDraftState implements DocumentState {
    @Override
    public void submit(DocumentContext document) {
        document.setState(StateInstancePool.getInstance(UnderReviewState.class));
    }
}
```

#### 狀態轉換快取
```java
/**
 * 狀態轉換快取
 */
@Component
public class StateTransitionCache {
    
    private final Map<String, Set<String>> transitionCache = new ConcurrentHashMap<>();
    
    public boolean isValidTransition(String fromState, String toState) {
        String key = fromState + "->" + toState;
        return transitionCache.computeIfAbsent(fromState, this::loadValidTransitions)
                             .contains(toState);
    }
    
    private Set<String> loadValidTransitions(String fromState) {
        // 從配置或資料庫載入有效轉換
        // 這裡簡化為硬編碼
        switch (fromState) {
            case "DRAFT":
                return Set.of("UNDER_REVIEW");
            case "UNDER_REVIEW":
                return Set.of("APPROVED", "REJECTED");
            case "APPROVED":
                return Set.of("PUBLISHED", "REJECTED");
            case "REJECTED":
                return Set.of("UNDER_REVIEW");
            default:
                return Set.of();
        }
    }
}
```

### 4. 測試策略

```java
/**
 * 狀態模式單元測試
 */
@ExtendWith(MockitoExtension.class)
class DocumentStateTest {
    
    @Mock
    private DocumentContext mockContext;
    
    @Test
    void testDraftStateSubmit() {
        // Given
        DraftState draftState = new DraftState();
        
        // When
        draftState.submit(mockContext);
        
        // Then
        verify(mockContext).setState(any(UnderReviewState.class));
    }
    
    @Test
    void testDraftStateCannotApprove() {
        // Given
        DraftState draftState = new DraftState();
        
        // When & Then
        assertThrows(IllegalStateException.class, () -> {
            draftState.approve(mockContext);
        });
    }
    
    @Test
    void testStateTransitionValidation() {
        // Given
        DocumentContext document = new DocumentContext("DOC-001", "Content", "Author");
        
        // When & Then
        assertDoesNotThrow(() -> document.submit());
        assertEquals("UNDER_REVIEW", document.getCurrentState().getStatusName());
        
        assertDoesNotThrow(() -> document.approve());
        assertEquals("APPROVED", document.getCurrentState().getStatusName());
        
        assertThrows(IllegalStateException.class, () -> document.submit());
    }
}

/**
 * 狀態機整合測試
 */
@SpringBootTest
@Transactional
class DocumentWorkflowIntegrationTest {
    
    @Autowired
    private DocumentManagementService documentService;
    
    @Test
    void testCompleteDocumentWorkflow() {
        // Given
        DocumentEntity document = documentService.createDocument(
            "測試文件", "測試內容", "測試作者");
        String documentId = document.getDocumentId();
        
        // When & Then
        // 提交審核
        document = documentService.submitForReview(documentId);
        assertEquals(DocumentStatus.UNDER_REVIEW, document.getStatus());
        
        // 批准文件
        document = documentService.approveDocument(documentId, "審核通過");
        assertEquals(DocumentStatus.APPROVED, document.getStatus());
        
        // 發布文件
        document = documentService.publishDocument(documentId);
        assertEquals(DocumentStatus.PUBLISHED, document.getStatus());
        
        // 驗證事件歷史
        List<DocumentEventEntity> events = documentService.getDocumentHistory(documentId);
        assertTrue(events.size() >= 4); // 創建、提交、批准、發布
    }
    
    @Test
    void testInvalidStateTransition() {
        // Given
        DocumentEntity document = documentService.createDocument(
            "測試文件", "測試內容", "測試作者");
        
        // When & Then
        assertThrows(IllegalStateException.class, () -> {
            documentService.publishDocument(document.getDocumentId()); // 草稿無法直接發布
        });
    }
}
```

## 總結與最佳實踐

### 狀態模式的優點

1. **清晰的狀態管理**：將狀態相關的行為封裝在獨立的類別中
2. **易於擴展**：新增狀態不需要修改現有代碼
3. **避免複雜的條件判斷**：消除大量的 if-else 和 switch-case 語句
4. **符合開閉原則**：對擴展開放，對修改封閉
5. **狀態轉換明確**：狀態之間的轉換關係清晰可見

### 狀態模式的缺點

1. **類別數量增加**：每個狀態都需要一個類別
2. **複雜度增加**：對於簡單的狀態邏輯可能過度設計
3. **狀態共享困難**：狀態之間難以共享數據

### 使用建議

1. **適用場景**：
   - 對象行為依賴於其狀態
   - 存在大量狀態相關的條件判斷
   - 狀態轉換邏輯複雜
   - 需要明確的狀態管理

2. **設計原則**：
   - 保持狀態類別的單一職責
   - 使用工廠模式管理狀態實例
   - 考慮狀態轉換的原子性
   - 實作完整的異常處理

3. **實作技巧**：
   - 使用枚舉定義狀態和事件
   - 實作狀態轉換驗證
   - 添加事件監聽機制
   - 考慮持久化狀態信息

狀態模式是管理復雜狀態邏輯的強大工具，特別適合工作流程、訂單處理、用戶認證等需要明確狀態管理的場景。正確使用狀態模式可以大幅提升代碼的可維護性和可擴展性。