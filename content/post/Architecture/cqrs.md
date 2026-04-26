---
title: "CQRS (Command Query Responsibility Segregation) 完整實作指南：命令與查詢職責分離的企業架構模式"
author: Bill.Lin
date: 2021-05-16T21:18:11+08:00
draft: false
tags: ["Architecture", "CQRS", "Command Query Responsibility Segregation", "Event Sourcing", "Microservices", "Domain-Driven Design", "Spring Boot", "Enterprise Architecture", "Scalability", "Performance", "Event-Driven Architecture", "Eventual Consistency", "Read Write Separation"]
Description: "深入探討 CQRS 架構模式的完整實作指南，包含命令與查詢職責分離、事件驅動架構、最終一致性與企業級應用實踐"
Categories: ["Architecture"]
DisableComments: false
aliases:
  - /post/Architecture/CQRS/

---

## CQRS (Command Query Responsibility Segregation) 完整實作指南

### 模式概述

CQRS (Command Query Responsibility Segregation，命令查詢職責分離) 是一種架構模式，將讀取操作（Query）和寫入操作（Command）分離到不同的模型中。這種分離允許每個模型針對其特定用途進行優化，提高系統的擴展性和性能。

### 核心概念

#### 1. CQS 原則基礎

CQS (Command Query Separation) 原則是 CQRS 的理論基礎：

- **Command（命令）**：
  - 會對系統產生影響的動作
  - 改變系統狀態
  - 不回傳結果（void）
  - 具有副作用

- **Query（查詢）**：
  - 不會對系統產生影響的動作
  - 不改變系統狀態
  - 回傳結果
  - 無副作用

#### 2. CQRS 擴展

CQRS 將 CQS 原則從方法級別擴展到架構級別：

- **寫入模型（Write Model）**：專注於業務邏輯和數據一致性
- **讀取模型（Read Model）**：專注於查詢性能和數據展示
- **分離的數據存儲**：不同的存儲可以針對讀寫操作進行優化

### 傳統 CQRS 實現

#### 1. 基本架構

```java
// 命令接口
public interface Command {
    // 命令標記接口
}

// 查詢接口
public interface Query<T> {
    // 查詢標記接口
}

// 命令處理器接口
public interface CommandHandler<T extends Command> {
    void handle(T command);
}

// 查詢處理器接口
public interface QueryHandler<T extends Query<R>, R> {
    R handle(T query);
}

// 命令總線
@Component
public class CommandBus {
    private final Map<Class<? extends Command>, CommandHandler<? extends Command>> handlers;
    
    public CommandBus(List<CommandHandler<? extends Command>> handlerList) {
        this.handlers = handlerList.stream()
            .collect(Collectors.toMap(
                this::getCommandType,
                Function.identity()
            ));
    }
    
    @SuppressWarnings("unchecked")
    public <T extends Command> void send(T command) {
        CommandHandler<T> handler = (CommandHandler<T>) handlers.get(command.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("未找到命令處理器: " + command.getClass());
        }
        handler.handle(command);
    }
    
    @SuppressWarnings("unchecked")
    private Class<? extends Command> getCommandType(CommandHandler<? extends Command> handler) {
        return (Class<? extends Command>) ((ParameterizedType) handler.getClass()
            .getGenericInterfaces()[0]).getActualTypeArguments()[0];
    }
}

// 查詢總線
@Component
public class QueryBus {
    private final Map<Class<? extends Query<?>>, QueryHandler<? extends Query<?>, ?>> handlers;
    
    public QueryBus(List<QueryHandler<? extends Query<?>, ?>> handlerList) {
        this.handlers = handlerList.stream()
            .collect(Collectors.toMap(
                this::getQueryType,
                Function.identity()
            ));
    }
    
    @SuppressWarnings("unchecked")
    public <T extends Query<R>, R> R send(T query) {
        QueryHandler<T, R> handler = (QueryHandler<T, R>) handlers.get(query.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("未找到查詢處理器: " + query.getClass());
        }
        return handler.handle(query);
    }
    
    @SuppressWarnings("unchecked")
    private Class<? extends Query<?>> getQueryType(QueryHandler<? extends Query<?>, ?> handler) {
        return (Class<? extends Query<?>>) ((ParameterizedType) handler.getClass()
            .getGenericInterfaces()[0]).getActualTypeArguments()[0];
    }
}
```

#### 2. 用戶管理系統示例

```java
// 用戶實體（寫入模型）
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false)
    private String email;
    
    @Enumerated(EnumType.STRING)
    private UserStatus status;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // 業務方法
    public void activate() {
        this.status = UserStatus.ACTIVE;
    }
    
    public void deactivate() {
        this.status = UserStatus.INACTIVE;
    }
    
    public void updatePassword(String newPassword) {
        this.password = newPassword;
    }
    
    // 構造函數、getter、setter 略
}

// 用戶狀態枚舉
public enum UserStatus {
    ACTIVE, INACTIVE, PENDING, BANNED
}

// 用戶讀取模型
@Document(collection = "user_views")
public class UserView {
    @Id
    private String id;
    private Long userId;
    private String username;
    private String email;
    private String status;
    private String createdAt;
    private String updatedAt;
    private int totalOrders;
    private BigDecimal totalSpent;
    private String lastLoginAt;
    
    // 構造函數、getter、setter 略
}

// 創建用戶命令
public class CreateUserCommand implements Command {
    private final String username;
    private final String password;
    private final String email;
    
    public CreateUserCommand(String username, String password, String email) {
        this.username = username;
        this.password = password;
        this.email = email;
    }
    
    // Getter 方法
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getEmail() { return email; }
}

// 更新用戶命令
public class UpdateUserCommand implements Command {
    private final Long userId;
    private final String email;
    private final UserStatus status;
    
    public UpdateUserCommand(Long userId, String email, UserStatus status) {
        this.userId = userId;
        this.email = email;
        this.status = status;
    }
    
    // Getter 方法
    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public UserStatus getStatus() { return status; }
}

// 用戶查詢
public class GetUserQuery implements Query<UserView> {
    private final Long userId;
    
    public GetUserQuery(Long userId) {
        this.userId = userId;
    }
    
    public Long getUserId() { return userId; }
}

// 用戶列表查詢
public class GetUserListQuery implements Query<Page<UserView>> {
    private final String username;
    private final UserStatus status;
    private final Pageable pageable;
    
    public GetUserListQuery(String username, UserStatus status, Pageable pageable) {
        this.username = username;
        this.status = status;
        this.pageable = pageable;
    }
    
    // Getter 方法
    public String getUsername() { return username; }
    public UserStatus getStatus() { return status; }
    public Pageable getPageable() { return pageable; }
}

// 創建用戶命令處理器
@Component
public class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    
    public CreateUserCommandHandler(UserRepository userRepository, 
                                   PasswordEncoder passwordEncoder,
                                   ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }
    
    @Override
    @Transactional
    public void handle(CreateUserCommand command) {
        // 驗證用戶名是否已存在
        if (userRepository.existsByUsername(command.getUsername())) {
            throw new IllegalArgumentException("用戶名已存在: " + command.getUsername());
        }
        
        // 創建用戶
        User user = new User();
        user.setUsername(command.getUsername());
        user.setPassword(passwordEncoder.encode(command.getPassword()));
        user.setEmail(command.getEmail());
        user.setStatus(UserStatus.ACTIVE);
        
        User savedUser = userRepository.save(user);
        
        // 發布事件
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser.getId(), 
            savedUser.getUsername(), savedUser.getEmail()));
    }
}

// 更新用戶命令處理器
@Component
public class UpdateUserCommandHandler implements CommandHandler<UpdateUserCommand> {
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    public UpdateUserCommandHandler(UserRepository userRepository, 
                                   ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }
    
    @Override
    @Transactional
    public void handle(UpdateUserCommand command) {
        User user = userRepository.findById(command.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("用戶不存在: " + command.getUserId()));
        
        // 更新用戶信息
        if (command.getEmail() != null) {
            user.setEmail(command.getEmail());
        }
        if (command.getStatus() != null) {
            user.setStatus(command.getStatus());
        }
        
        userRepository.save(user);
        
        // 發布事件
        eventPublisher.publishEvent(new UserUpdatedEvent(user.getId(), 
            user.getUsername(), user.getEmail(), user.getStatus()));
    }
}

// 用戶查詢處理器
@Component
public class GetUserQueryHandler implements QueryHandler<GetUserQuery, UserView> {
    private final UserViewRepository userViewRepository;
    
    public GetUserQueryHandler(UserViewRepository userViewRepository) {
        this.userViewRepository = userViewRepository;
    }
    
    @Override
    public UserView handle(GetUserQuery query) {
        return userViewRepository.findByUserId(query.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("用戶不存在: " + query.getUserId()));
    }
}

// 用戶列表查詢處理器
@Component
public class GetUserListQueryHandler implements QueryHandler<GetUserListQuery, Page<UserView>> {
    private final UserViewRepository userViewRepository;
    
    public GetUserListQueryHandler(UserViewRepository userViewRepository) {
        this.userViewRepository = userViewRepository;
    }
    
    @Override
    public Page<UserView> handle(GetUserListQuery query) {
        return userViewRepository.findByFilters(
            query.getUsername(), 
            query.getStatus(), 
            query.getPageable()
        );
    }
}
```

#### 3. 事件驅動架構

```java
// 用戶創建事件
public class UserCreatedEvent {
    private final Long userId;
    private final String username;
    private final String email;
    private final LocalDateTime occurredAt;
    
    public UserCreatedEvent(Long userId, String username, String email) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.occurredAt = LocalDateTime.now();
    }
    
    // Getter 方法
    public Long getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
}

// 用戶更新事件
public class UserUpdatedEvent {
    private final Long userId;
    private final String username;
    private final String email;
    private final UserStatus status;
    private final LocalDateTime occurredAt;
    
    public UserUpdatedEvent(Long userId, String username, String email, UserStatus status) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.status = status;
        this.occurredAt = LocalDateTime.now();
    }
    
    // Getter 方法
    public Long getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public UserStatus getStatus() { return status; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
}

// 讀取模型投影處理器
@Component
public class UserViewProjectionHandler {
    private final UserViewRepository userViewRepository;
    
    public UserViewProjectionHandler(UserViewRepository userViewRepository) {
        this.userViewRepository = userViewRepository;
    }
    
    @EventListener
    @Async
    public void handle(UserCreatedEvent event) {
        UserView userView = new UserView();
        userView.setUserId(event.getUserId());
        userView.setUsername(event.getUsername());
        userView.setEmail(event.getEmail());
        userView.setStatus(UserStatus.ACTIVE.name());
        userView.setCreatedAt(event.getOccurredAt().toString());
        userView.setUpdatedAt(event.getOccurredAt().toString());
        userView.setTotalOrders(0);
        userView.setTotalSpent(BigDecimal.ZERO);
        
        userViewRepository.save(userView);
    }
    
    @EventListener
    @Async
    public void handle(UserUpdatedEvent event) {
        UserView userView = userViewRepository.findByUserId(event.getUserId())
            .orElseThrow(() -> new IllegalStateException("用戶視圖不存在: " + event.getUserId()));
        
        userView.setUsername(event.getUsername());
        userView.setEmail(event.getEmail());
        userView.setStatus(event.getStatus().name());
        userView.setUpdatedAt(event.getOccurredAt().toString());
        
        userViewRepository.save(userView);
    }
}
```

### 事件溯源 (Event Sourcing) 整合

#### 1. 事件存儲

```java
// 事件基類
@MappedSuperclass
public abstract class DomainEvent {
    private String eventId;
    private String aggregateId;
    private String eventType;
    private LocalDateTime occurredAt;
    private String userId;
    private long version;
    
    protected DomainEvent() {
        this.eventId = UUID.randomUUID().toString();
        this.occurredAt = LocalDateTime.now();
    }
    
    protected DomainEvent(String aggregateId, String eventType, String userId, long version) {
        this();
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.userId = userId;
        this.version = version;
    }
    
    // Getter 和 Setter 方法
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String aggregateId) { this.aggregateId = aggregateId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}

// 事件存儲實體
@Entity
@Table(name = "event_store")
public class EventStore {
    @Id
    private String eventId;
    
    @Column(nullable = false)
    private String aggregateId;
    
    @Column(nullable = false)
    private String eventType;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String eventData;
    
    @Column(nullable = false)
    private LocalDateTime occurredAt;
    
    @Column
    private String userId;
    
    @Column(nullable = false)
    private long version;
    
    // 構造函數、getter、setter 略
}

// 事件存儲倉庫
@Repository
public interface EventStoreRepository extends JpaRepository<EventStore, String> {
    List<EventStore> findByAggregateIdOrderByVersionAsc(String aggregateId);
    List<EventStore> findByAggregateIdAndVersionGreaterThanOrderByVersionAsc(String aggregateId, long version);
    boolean existsByAggregateIdAndVersion(String aggregateId, long version);
}

// 事件存儲服務
@Service
public class EventStoreService {
    private final EventStoreRepository eventStoreRepository;
    private final ObjectMapper objectMapper;
    
    public EventStoreService(EventStoreRepository eventStoreRepository, ObjectMapper objectMapper) {
        this.eventStoreRepository = eventStoreRepository;
        this.objectMapper = objectMapper;
    }
    
    public void saveEvent(DomainEvent event) {
        try {
            EventStore eventStore = new EventStore();
            eventStore.setEventId(event.getEventId());
            eventStore.setAggregateId(event.getAggregateId());
            eventStore.setEventType(event.getEventType());
            eventStore.setEventData(objectMapper.writeValueAsString(event));
            eventStore.setOccurredAt(event.getOccurredAt());
            eventStore.setUserId(event.getUserId());
            eventStore.setVersion(event.getVersion());
            
            eventStoreRepository.save(eventStore);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("事件序列化失敗", e);
        }
    }
    
    public List<DomainEvent> getEvents(String aggregateId) {
        return eventStoreRepository.findByAggregateIdOrderByVersionAsc(aggregateId)
            .stream()
            .map(this::deserializeEvent)
            .collect(Collectors.toList());
    }
    
    public List<DomainEvent> getEventsFromVersion(String aggregateId, long version) {
        return eventStoreRepository.findByAggregateIdAndVersionGreaterThanOrderByVersionAsc(aggregateId, version)
            .stream()
            .map(this::deserializeEvent)
            .collect(Collectors.toList());
    }
    
    private DomainEvent deserializeEvent(EventStore eventStore) {
        try {
            Class<?> eventClass = Class.forName(eventStore.getEventType());
            return (DomainEvent) objectMapper.readValue(eventStore.getEventData(), eventClass);
        } catch (Exception e) {
            throw new RuntimeException("事件反序列化失敗", e);
        }
    }
}
```

#### 2. 聚合根與事件溯源

```java
// 聚合根基類
public abstract class AggregateRoot {
    private String id;
    private long version;
    private final List<DomainEvent> uncommittedEvents = new ArrayList<>();
    
    protected AggregateRoot() {
        this.id = UUID.randomUUID().toString();
        this.version = 0;
    }
    
    protected AggregateRoot(String id) {
        this.id = id;
        this.version = 0;
    }
    
    protected void addEvent(DomainEvent event) {
        event.setAggregateId(this.id);
        event.setVersion(this.version + 1);
        this.uncommittedEvents.add(event);
    }
    
    public List<DomainEvent> getUncommittedEvents() {
        return new ArrayList<>(uncommittedEvents);
    }
    
    public void markEventsAsCommitted() {
        this.version += uncommittedEvents.size();
        this.uncommittedEvents.clear();
    }
    
    public void loadFromHistory(List<DomainEvent> events) {
        events.forEach(this::apply);
        this.version = events.size();
    }
    
    protected abstract void apply(DomainEvent event);
    
    // Getter 和 Setter 方法
    public String getId() { return id; }
    public long getVersion() { return version; }
}

// 用戶聚合根
public class UserAggregate extends AggregateRoot {
    private String username;
    private String email;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public UserAggregate() {
        super();
    }
    
    public UserAggregate(String id) {
        super(id);
    }
    
    // 創建用戶
    public static UserAggregate create(String username, String email, String userId) {
        UserAggregate user = new UserAggregate();
        user.addEvent(new UserCreatedDomainEvent(user.getId(), username, email, userId));
        return user;
    }
    
    // 更新用戶
    public void updateUser(String email, UserStatus status, String userId) {
        if (!Objects.equals(this.email, email) || !Objects.equals(this.status, status)) {
            this.addEvent(new UserUpdatedDomainEvent(this.getId(), this.username, email, status, userId));
        }
    }
    
    // 刪除用戶
    public void deleteUser(String userId) {
        this.addEvent(new UserDeletedDomainEvent(this.getId(), this.username, userId));
    }
    
    @Override
    protected void apply(DomainEvent event) {
        if (event instanceof UserCreatedDomainEvent) {
            apply((UserCreatedDomainEvent) event);
        } else if (event instanceof UserUpdatedDomainEvent) {
            apply((UserUpdatedDomainEvent) event);
        } else if (event instanceof UserDeletedDomainEvent) {
            apply((UserDeletedDomainEvent) event);
        }
    }
    
    private void apply(UserCreatedDomainEvent event) {
        this.username = event.getUsername();
        this.email = event.getEmail();
        this.status = UserStatus.ACTIVE;
        this.createdAt = event.getOccurredAt();
        this.updatedAt = event.getOccurredAt();
    }
    
    private void apply(UserUpdatedDomainEvent event) {
        this.username = event.getUsername();
        this.email = event.getEmail();
        this.status = event.getStatus();
        this.updatedAt = event.getOccurredAt();
    }
    
    private void apply(UserDeletedDomainEvent event) {
        this.status = UserStatus.INACTIVE;
        this.updatedAt = event.getOccurredAt();
    }
    
    // Getter 方法
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public UserStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

// 用戶創建領域事件
public class UserCreatedDomainEvent extends DomainEvent {
    private String username;
    private String email;
    
    public UserCreatedDomainEvent() {
        super();
    }
    
    public UserCreatedDomainEvent(String aggregateId, String username, String email, String userId) {
        super(aggregateId, "UserCreatedDomainEvent", userId, 1);
        this.username = username;
        this.email = email;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

// 用戶更新領域事件
public class UserUpdatedDomainEvent extends DomainEvent {
    private String username;
    private String email;
    private UserStatus status;
    
    public UserUpdatedDomainEvent() {
        super();
    }
    
    public UserUpdatedDomainEvent(String aggregateId, String username, String email, UserStatus status, String userId) {
        super(aggregateId, "UserUpdatedDomainEvent", userId, 1);
        this.username = username;
        this.email = email;
        this.status = status;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
}

// 用戶刪除領域事件
public class UserDeletedDomainEvent extends DomainEvent {
    private String username;
    
    public UserDeletedDomainEvent() {
        super();
    }
    
    public UserDeletedDomainEvent(String aggregateId, String username, String userId) {
        super(aggregateId, "UserDeletedDomainEvent", userId, 1);
        this.username = username;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}
```

### 企業級應用場景

#### 1. 電商系統實現

```java
// 訂單聚合根
public class OrderAggregate extends AggregateRoot {
    private String customerId;
    private List<OrderItem> items;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public OrderAggregate() {
        super();
        this.items = new ArrayList<>();
        this.totalAmount = BigDecimal.ZERO;
        this.status = OrderStatus.PENDING;
    }
    
    // 創建訂單
    public static OrderAggregate create(String customerId, List<OrderItem> items, String userId) {
        OrderAggregate order = new OrderAggregate();
        order.addEvent(new OrderCreatedDomainEvent(order.getId(), customerId, items, userId));
        return order;
    }
    
    // 添加商品
    public void addItem(OrderItem item, String userId) {
        this.addEvent(new OrderItemAddedDomainEvent(this.getId(), item, userId));
    }
    
    // 確認訂單
    public void confirm(String userId) {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("只有待處理的訂單可以確認");
        }
        this.addEvent(new OrderConfirmedDomainEvent(this.getId(), userId));
    }
    
    // 取消訂單
    public void cancel(String reason, String userId) {
        if (this.status == OrderStatus.SHIPPED || this.status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("已發貨或已送達的訂單不能取消");
        }
        this.addEvent(new OrderCancelledDomainEvent(this.getId(), reason, userId));
    }
    
    @Override
    protected void apply(DomainEvent event) {
        if (event instanceof OrderCreatedDomainEvent) {
            apply((OrderCreatedDomainEvent) event);
        } else if (event instanceof OrderItemAddedDomainEvent) {
            apply((OrderItemAddedDomainEvent) event);
        } else if (event instanceof OrderConfirmedDomainEvent) {
            apply((OrderConfirmedDomainEvent) event);
        } else if (event instanceof OrderCancelledDomainEvent) {
            apply((OrderCancelledDomainEvent) event);
        }
    }
    
    private void apply(OrderCreatedDomainEvent event) {
        this.customerId = event.getCustomerId();
        this.items = new ArrayList<>(event.getItems());
        this.totalAmount = calculateTotalAmount();
        this.status = OrderStatus.PENDING;
        this.createdAt = event.getOccurredAt();
        this.updatedAt = event.getOccurredAt();
    }
    
    private void apply(OrderItemAddedDomainEvent event) {
        this.items.add(event.getItem());
        this.totalAmount = calculateTotalAmount();
        this.updatedAt = event.getOccurredAt();
    }
    
    private void apply(OrderConfirmedDomainEvent event) {
        this.status = OrderStatus.CONFIRMED;
        this.updatedAt = event.getOccurredAt();
    }
    
    private void apply(OrderCancelledDomainEvent event) {
        this.status = OrderStatus.CANCELLED;
        this.updatedAt = event.getOccurredAt();
    }
    
    private BigDecimal calculateTotalAmount() {
        return items.stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    // Getter 方法
    public String getCustomerId() { return customerId; }
    public List<OrderItem> getItems() { return new ArrayList<>(items); }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public OrderStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

// 訂單項目
public class OrderItem {
    private String productId;
    private String productName;
    private int quantity;
    private BigDecimal price;
    
    public OrderItem(String productId, String productName, int quantity, BigDecimal price) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.price = price;
    }
    
    // Getter 和 Setter 方法
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}

// 訂單狀態
public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}

// 訂單創建命令
public class CreateOrderCommand implements Command {
    private final String customerId;
    private final List<OrderItem> items;
    
    public CreateOrderCommand(String customerId, List<OrderItem> items) {
        this.customerId = customerId;
        this.items = items;
    }
    
    // Getter 方法
    public String getCustomerId() { return customerId; }
    public List<OrderItem> getItems() { return items; }
}

// 訂單確認命令
public class ConfirmOrderCommand implements Command {
    private final String orderId;
    
    public ConfirmOrderCommand(String orderId) {
        this.orderId = orderId;
    }
    
    public String getOrderId() { return orderId; }
}

// 訂單查詢
public class GetOrderQuery implements Query<OrderView> {
    private final String orderId;
    
    public GetOrderQuery(String orderId) {
        this.orderId = orderId;
    }
    
    public String getOrderId() { return orderId; }
}

// 訂單視圖
@Document(collection = "order_views")
public class OrderView {
    @Id
    private String id;
    private String orderId;
    private String customerId;
    private String customerName;
    private List<OrderItemView> items;
    private BigDecimal totalAmount;
    private String status;
    private String createdAt;
    private String updatedAt;
    
    // 構造函數、getter、setter 略
}

// 訂單項目視圖
public class OrderItemView {
    private String productId;
    private String productName;
    private int quantity;
    private BigDecimal price;
    private BigDecimal subtotal;
    
    // 構造函數、getter、setter 略
}
```

#### 2. 庫存管理系統

```java
// 庫存聚合根
public class InventoryAggregate extends AggregateRoot {
    private String productId;
    private int quantity;
    private int reservedQuantity;
    private LocalDateTime lastUpdated;
    
    public InventoryAggregate() {
        super();
    }
    
    // 初始化庫存
    public static InventoryAggregate initialize(String productId, int initialQuantity, String userId) {
        InventoryAggregate inventory = new InventoryAggregate();
        inventory.addEvent(new InventoryInitializedDomainEvent(inventory.getId(), productId, initialQuantity, userId));
        return inventory;
    }
    
    // 增加庫存
    public void addStock(int quantity, String reason, String userId) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("增加的庫存數量必須大於0");
        }
        this.addEvent(new StockAddedDomainEvent(this.getId(), this.productId, quantity, reason, userId));
    }
    
    // 預留庫存
    public void reserveStock(int quantity, String orderId, String userId) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("預留的庫存數量必須大於0");
        }
        if (this.quantity - this.reservedQuantity < quantity) {
            throw new IllegalStateException("可用庫存不足");
        }
        this.addEvent(new StockReservedDomainEvent(this.getId(), this.productId, quantity, orderId, userId));
    }
    
    // 確認庫存消耗
    public void confirmStock(int quantity, String orderId, String userId) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("確認的庫存數量必須大於0");
        }
        if (this.reservedQuantity < quantity) {
            throw new IllegalStateException("預留庫存不足");
        }
        this.addEvent(new StockConfirmedDomainEvent(this.getId(), this.productId, quantity, orderId, userId));
    }
    
    // 釋放預留庫存
    public void releaseReservedStock(int quantity, String orderId, String userId) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("釋放的庫存數量必須大於0");
        }
        if (this.reservedQuantity < quantity) {
            throw new IllegalStateException("預留庫存不足");
        }
        this.addEvent(new StockReleasedDomainEvent(this.getId(), this.productId, quantity, orderId, userId));
    }
    
    @Override
    protected void apply(DomainEvent event) {
        if (event instanceof InventoryInitializedDomainEvent) {
            apply((InventoryInitializedDomainEvent) event);
        } else if (event instanceof StockAddedDomainEvent) {
            apply((StockAddedDomainEvent) event);
        } else if (event instanceof StockReservedDomainEvent) {
            apply((StockReservedDomainEvent) event);
        } else if (event instanceof StockConfirmedDomainEvent) {
            apply((StockConfirmedDomainEvent) event);
        } else if (event instanceof StockReleasedDomainEvent) {
            apply((StockReleasedDomainEvent) event);
        }
    }
    
    private void apply(InventoryInitializedDomainEvent event) {
        this.productId = event.getProductId();
        this.quantity = event.getInitialQuantity();
        this.reservedQuantity = 0;
        this.lastUpdated = event.getOccurredAt();
    }
    
    private void apply(StockAddedDomainEvent event) {
        this.quantity += event.getQuantity();
        this.lastUpdated = event.getOccurredAt();
    }
    
    private void apply(StockReservedDomainEvent event) {
        this.reservedQuantity += event.getQuantity();
        this.lastUpdated = event.getOccurredAt();
    }
    
    private void apply(StockConfirmedDomainEvent event) {
        this.quantity -= event.getQuantity();
        this.reservedQuantity -= event.getQuantity();
        this.lastUpdated = event.getOccurredAt();
    }
    
    private void apply(StockReleasedDomainEvent event) {
        this.reservedQuantity -= event.getQuantity();
        this.lastUpdated = event.getOccurredAt();
    }
    
    // 計算可用庫存
    public int getAvailableQuantity() {
        return quantity - reservedQuantity;
    }
    
    // Getter 方法
    public String getProductId() { return productId; }
    public int getQuantity() { return quantity; }
    public int getReservedQuantity() { return reservedQuantity; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
}

// 庫存相關領域事件
public class InventoryInitializedDomainEvent extends DomainEvent {
    private String productId;
    private int initialQuantity;
    
    public InventoryInitializedDomainEvent() {
        super();
    }
    
    public InventoryInitializedDomainEvent(String aggregateId, String productId, int initialQuantity, String userId) {
        super(aggregateId, "InventoryInitializedDomainEvent", userId, 1);
        this.productId = productId;
        this.initialQuantity = initialQuantity;
    }
    
    // Getter 和 Setter 方法
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public int getInitialQuantity() { return initialQuantity; }
    public void setInitialQuantity(int initialQuantity) { this.initialQuantity = initialQuantity; }
}

public class StockAddedDomainEvent extends DomainEvent {
    private String productId;
    private int quantity;
    private String reason;
    
    public StockAddedDomainEvent() {
        super();
    }
    
    public StockAddedDomainEvent(String aggregateId, String productId, int quantity, String reason, String userId) {
        super(aggregateId, "StockAddedDomainEvent", userId, 1);
        this.productId = productId;
        this.quantity = quantity;
        this.reason = reason;
    }
    
    // Getter 和 Setter 方法
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}

public class StockReservedDomainEvent extends DomainEvent {
    private String productId;
    private int quantity;
    private String orderId;
    
    public StockReservedDomainEvent() {
        super();
    }
    
    public StockReservedDomainEvent(String aggregateId, String productId, int quantity, String orderId, String userId) {
        super(aggregateId, "StockReservedDomainEvent", userId, 1);
        this.productId = productId;
        this.quantity = quantity;
        this.orderId = orderId;
    }
    
    // Getter 和 Setter 方法
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
}
```

### Spring Boot 整合

#### 1. 配置類

```java
@Configuration
@EnableAsync
@EnableJpaRepositories(basePackages = "com.example.repository")
@EnableMongoRepositories(basePackages = "com.example.readmodel.repository")
public class CqrsConfiguration {
    
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
    
    @Bean
    public ApplicationEventPublisher applicationEventPublisher(ApplicationContext context) {
        return context;
    }
    
    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("cqrs-async-");
        executor.initialize();
        return executor;
    }
}

// 資料庫配置
@Configuration
public class DatabaseConfiguration {
    
    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    @ConfigurationProperties("spring.datasource.readonly")
    public DataSource readOnlyDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Primary
    @Bean
    public JdbcTemplate primaryJdbcTemplate(@Qualifier("primaryDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
    
    @Bean
    public JdbcTemplate readOnlyJdbcTemplate(@Qualifier("readOnlyDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
```

#### 2. 控制器實現

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final CommandBus commandBus;
    private final QueryBus queryBus;
    
    public UserController(CommandBus commandBus, QueryBus queryBus) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
    }
    
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createUser(@RequestBody @Valid CreateUserRequest request) {
        try {
            CreateUserCommand command = new CreateUserCommand(
                request.getUsername(),
                request.getPassword(),
                request.getEmail()
            );
            
            commandBus.send(command);
            
            return ResponseEntity.ok(ApiResponse.<Void>success()
                .message("用戶創建成功")
                .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.<Void>failure("創建用戶失敗")
                .error(e.getMessage())
                .build());
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserView>> getUser(@PathVariable Long id) {
        try {
            GetUserQuery query = new GetUserQuery(id);
            UserView user = queryBus.send(query);
            
            return ResponseEntity.ok(ApiResponse.success(user)
                .message("用戶查詢成功")
                .build());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserView>>> getUsers(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) UserStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        
        try {
            GetUserListQuery query = new GetUserListQuery(username, status, pageable);
            Page<UserView> users = queryBus.send(query);
            
            return ResponseEntity.ok(ApiResponse.success(users)
                .message("用戶列表查詢成功")
                .metadata("total", users.getTotalElements())
                .metadata("pages", users.getTotalPages())
                .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.<Page<UserView>>failure("查詢用戶列表失敗")
                .error(e.getMessage())
                .build());
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateUser(@PathVariable Long id, 
                                                        @RequestBody @Valid UpdateUserRequest request) {
        try {
            UpdateUserCommand command = new UpdateUserCommand(id, request.getEmail(), request.getStatus());
            commandBus.send(command);
            
            return ResponseEntity.ok(ApiResponse.<Void>success()
                .message("用戶更新成功")
                .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.<Void>failure("更新用戶失敗")
                .error(e.getMessage())
                .build());
        }
    }
}

// 請求 DTO
public class CreateUserRequest {
    @NotBlank(message = "用戶名不能為空")
    private String username;
    
    @NotBlank(message = "密碼不能為空")
    @Size(min = 6, message = "密碼長度至少6位")
    private String password;
    
    @NotBlank(message = "郵箱不能為空")
    @Email(message = "郵箱格式不正確")
    private String email;
    
    // 構造函數、getter、setter 略
}

public class UpdateUserRequest {
    @Email(message = "郵箱格式不正確")
    private String email;
    
    private UserStatus status;
    
    // 構造函數、getter、setter 略
}
```

#### 3. 測試實現

```java
@SpringBootTest
@Transactional
class CqrsIntegrationTest {
    
    @Autowired
    private CommandBus commandBus;
    
    @Autowired
    private QueryBus queryBus;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserViewRepository userViewRepository;
    
    @Test
    void testCreateAndQueryUser() {
        // Given
        CreateUserCommand command = new CreateUserCommand("testuser", "password123", "test@example.com");
        
        // When
        commandBus.send(command);
        
        // Then
        // 驗證寫入模型
        Optional<User> user = userRepository.findByUsername("testuser");
        assertThat(user).isPresent();
        assertThat(user.get().getEmail()).isEqualTo("test@example.com");
        assertThat(user.get().getStatus()).isEqualTo(UserStatus.ACTIVE);
        
        // 等待異步投影完成
        await().atMost(5, TimeUnit.SECONDS).until(() -> {
            return userViewRepository.findByUserId(user.get().getId()).isPresent();
        });
        
        // 驗證讀取模型
        GetUserQuery query = new GetUserQuery(user.get().getId());
        UserView userView = queryBus.send(query);
        
        assertThat(userView.getUsername()).isEqualTo("testuser");
        assertThat(userView.getEmail()).isEqualTo("test@example.com");
        assertThat(userView.getStatus()).isEqualTo(UserStatus.ACTIVE.name());
    }
    
    @Test
    void testUpdateUser() {
        // Given
        User user = createTestUser();
        
        // When
        UpdateUserCommand command = new UpdateUserCommand(user.getId(), "updated@example.com", UserStatus.INACTIVE);
        commandBus.send(command);
        
        // Then
        User updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updatedUser.getEmail()).isEqualTo("updated@example.com");
        assertThat(updatedUser.getStatus()).isEqualTo(UserStatus.INACTIVE);
        
        // 驗證讀取模型最終一致性
        await().atMost(5, TimeUnit.SECONDS).until(() -> {
            UserView userView = userViewRepository.findByUserId(user.getId()).orElse(null);
            return userView != null && 
                   "updated@example.com".equals(userView.getEmail()) &&
                   UserStatus.INACTIVE.name().equals(userView.getStatus());
        });
    }
    
    @Test
    void testUserListQuery() {
        // Given
        createTestUser("user1", "user1@example.com", UserStatus.ACTIVE);
        createTestUser("user2", "user2@example.com", UserStatus.INACTIVE);
        
        // When
        GetUserListQuery query = new GetUserListQuery(null, UserStatus.ACTIVE, PageRequest.of(0, 10));
        Page<UserView> result = queryBus.send(query);
        
        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUsername()).isEqualTo("user1");
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(UserStatus.ACTIVE.name());
    }
    
    private User createTestUser() {
        return createTestUser("testuser", "test@example.com", UserStatus.ACTIVE);
    }
    
    private User createTestUser(String username, String email, UserStatus status) {
        User user = new User();
        user.setUsername(username);
        user.setPassword("password123");
        user.setEmail(email);
        user.setStatus(status);
        return userRepository.save(user);
    }
}

@WebMvcTest(UserController.class)
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private CommandBus commandBus;
    
    @MockBean
    private QueryBus queryBus;
    
    @Test
    void testCreateUser() throws Exception {
        // Given
        CreateUserRequest request = new CreateUserRequest("testuser", "password123", "test@example.com");
        
        // When & Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("用戶創建成功"));
        
        verify(commandBus).send(any(CreateUserCommand.class));
    }
    
    @Test
    void testGetUser() throws Exception {
        // Given
        UserView userView = new UserView();
        userView.setUserId(1L);
        userView.setUsername("testuser");
        userView.setEmail("test@example.com");
        userView.setStatus(UserStatus.ACTIVE.name());
        
        when(queryBus.send(any(GetUserQuery.class))).thenReturn(userView);
        
        // When & Then
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("testuser"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"));
        
        verify(queryBus).send(any(GetUserQuery.class));
    }
}
```

### 性能優化與最佳實踐

#### 1. 事件處理優化

```java
// 批量事件處理
@Component
public class BatchEventProcessor {
    private final List<DomainEvent> eventBatch = new ArrayList<>();
    private final Object lock = new Object();
    
    @Value("${cqrs.event.batch.size:100}")
    private int batchSize;
    
    @Value("${cqrs.event.batch.timeout:5000}")
    private long batchTimeout;
    
    @Autowired
    private EventStoreService eventStoreService;
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    @PostConstruct
    public void initialize() {
        // 定期刷新批次
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(this::flushBatch, batchTimeout, batchTimeout, TimeUnit.MILLISECONDS);
    }
    
    public void addEvent(DomainEvent event) {
        synchronized (lock) {
            eventBatch.add(event);
            if (eventBatch.size() >= batchSize) {
                flushBatch();
            }
        }
    }
    
    private void flushBatch() {
        List<DomainEvent> toProcess;
        synchronized (lock) {
            if (eventBatch.isEmpty()) {
                return;
            }
            toProcess = new ArrayList<>(eventBatch);
            eventBatch.clear();
        }
        
        // 批量保存事件
        toProcess.forEach(eventStoreService::saveEvent);
        
        // 批量發布事件
        toProcess.forEach(eventPublisher::publishEvent);
    }
}

// 異步事件處理
@Component
public class AsyncEventHandler {
    private final ThreadPoolTaskExecutor executor;
    
    public AsyncEventHandler() {
        this.executor = new ThreadPoolTaskExecutor();
        this.executor.setCorePoolSize(5);
        this.executor.setMaxPoolSize(20);
        this.executor.setQueueCapacity(100);
        this.executor.setThreadNamePrefix("async-event-");
        this.executor.initialize();
    }
    
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        executor.submit(() -> {
            try {
                // 異步處理用戶創建事件
                processUserCreatedEvent(event);
            } catch (Exception e) {
                // 錯誤處理和重試邏輯
                handleEventProcessingError(event, e);
            }
        });
    }
    
    private void processUserCreatedEvent(UserCreatedEvent event) {
        // 具體的事件處理邏輯
        updateUserView(event);
        sendWelcomeEmail(event);
        updateStatistics(event);
    }
    
    private void handleEventProcessingError(Object event, Exception e) {
        // 實現錯誤處理和重試邏輯
        log.error("事件處理失敗: " + event.getClass().getSimpleName(), e);
    }
}
```

#### 2. 讀寫分離優化

```java
// 讀寫分離路由
@Component
public class DatabaseRouter {
    private final DataSource writeDataSource;
    private final DataSource readDataSource;
    
    public DatabaseRouter(@Qualifier("writeDataSource") DataSource writeDataSource,
                         @Qualifier("readDataSource") DataSource readDataSource) {
        this.writeDataSource = writeDataSource;
        this.readDataSource = readDataSource;
    }
    
    public DataSource getDataSource(boolean isWrite) {
        return isWrite ? writeDataSource : readDataSource;
    }
}

// 動態數據源切換
@Component
public class DynamicDataSourceContextHolder {
    private static final ThreadLocal<Boolean> contextHolder = new ThreadLocal<>();
    
    public static void setWriteDataSource() {
        contextHolder.set(true);
    }
    
    public static void setReadDataSource() {
        contextHolder.set(false);
    }
    
    public static boolean isWriteDataSource() {
        return Boolean.TRUE.equals(contextHolder.get());
    }
    
    public static void clearDataSourceType() {
        contextHolder.remove();
    }
}

// 讀寫分離攔截器
@Component
public class ReadWriteSplittingInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        if ("GET".equals(method)) {
            DynamicDataSourceContextHolder.setReadDataSource();
        } else {
            DynamicDataSourceContextHolder.setWriteDataSource();
        }
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        DynamicDataSourceContextHolder.clearDataSourceType();
    }
}
```

### 監控與診斷

```java
// CQRS 監控
@Component
public class CqrsMonitor {
    private final MeterRegistry meterRegistry;
    private final Counter commandCounter;
    private final Counter queryCounter;
    private final Timer commandTimer;
    private final Timer queryTimer;
    
    public CqrsMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.commandCounter = Counter.builder("cqrs.commands")
            .description("Total number of commands processed")
            .register(meterRegistry);
        this.queryCounter = Counter.builder("cqrs.queries")
            .description("Total number of queries processed")
            .register(meterRegistry);
        this.commandTimer = Timer.builder("cqrs.command.duration")
            .description("Command processing time")
            .register(meterRegistry);
        this.queryTimer = Timer.builder("cqrs.query.duration")
            .description("Query processing time")
            .register(meterRegistry);
    }
    
    public <T extends Command> void recordCommand(T command, Runnable execution) {
        commandCounter.increment(Tags.of("type", command.getClass().getSimpleName()));
        commandTimer.recordCallable(() -> {
            execution.run();
            return null;
        });
    }
    
    public <T extends Query<R>, R> R recordQuery(T query, Supplier<R> execution) {
        queryCounter.increment(Tags.of("type", query.getClass().getSimpleName()));
        return queryTimer.recordCallable(execution::get);
    }
}

// 事件存儲監控
@Component
public class EventStoreMonitor {
    private final MeterRegistry meterRegistry;
    private final Counter eventsSaved;
    private final Counter eventsLoaded;
    private final Timer saveTimer;
    private final Timer loadTimer;
    
    public EventStoreMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.eventsSaved = Counter.builder("eventstore.events.saved")
            .description("Number of events saved to event store")
            .register(meterRegistry);
        this.eventsLoaded = Counter.builder("eventstore.events.loaded")
            .description("Number of events loaded from event store")
            .register(meterRegistry);
        this.saveTimer = Timer.builder("eventstore.save.duration")
            .description("Time taken to save events")
            .register(meterRegistry);
        this.loadTimer = Timer.builder("eventstore.load.duration")
            .description("Time taken to load events")
            .register(meterRegistry);
    }
    
    public void recordEventSaved(String eventType) {
        eventsSaved.increment(Tags.of("type", eventType));
    }
    
    public void recordEventLoaded(String eventType) {
        eventsLoaded.increment(Tags.of("type", eventType));
    }
    
    public <T> T recordSaveOperation(Supplier<T> operation) {
        return saveTimer.recordCallable(operation::get);
    }
    
    public <T> T recordLoadOperation(Supplier<T> operation) {
        return loadTimer.recordCallable(operation::get);
    }
}
```

### 總結

CQRS 是一種強大的架構模式，特別適用於：

1. **高併發系統**：分離讀寫操作，提高系統並發能力
2. **複雜業務邏輯**：將複雜的業務邏輯與查詢邏輯分離
3. **事件驅動架構**：與事件溯源結合，構建事件驅動的系統
4. **可擴展系統**：支持讀寫模型的獨立擴展

#### 關鍵最佳實踐

1. **事件設計**：設計清晰的事件結構和事件版本控制
2. **最終一致性**：接受並處理最終一致性的挑戰
3. **監控告警**：實施完善的監控和告警機制
4. **錯誤處理**：設計健壯的錯誤處理和重試機制
5. **性能優化**：實施讀寫分離、批量處理等優化策略
6. **測試策略**：建立全面的測試策略，包括事件重播測試

CQRS 結合事件溯源為企業級應用提供了強大的架構基礎，能夠有效處理複雜的業務場景和高並發需求。正確實施 CQRS 可以大幅提升系統的可維護性、可擴展性和性能。

## Outbox Pattern（事務一致性）

CQRS 最常見的雙寫問題：Command handler 在同一個 transaction 中寫 DB 又發 Event，網路故障時兩者不一致。

**Outbox Pattern 解法**：
1. 在同一個 DB transaction 寫入業務資料 + 一張 `outbox` 表（event 記錄）
2. 獨立的 poller/Debezium CDC 讀取 `outbox` 表，確認成功後發佈 event
3. 確保 at-least-once delivery（consumer 端需冪等）

```sql
CREATE TABLE outbox_events (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    aggregate_type VARCHAR(64)  NOT NULL,
    aggregate_id   VARCHAR(64)  NOT NULL,
    event_type     VARCHAR(128) NOT NULL,
    payload        JSON         NOT NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at   DATETIME
);
```

## 何時不該用 CQRS

- **簡單 CRUD**：增加了大量複雜度，但沒有對應的效益
- **強一致性要求高**：Read side 的 eventual consistency 在金融等場景是風險點
- **團隊規模小**：維護兩套 model 的成本可能超出收益
- **查詢不複雜**：標準 JPA query 已夠用時，不需要獨立 Read model

## 踩坑紀錄

### Eventual Consistency 的使用者體驗問題
使用者送出 Command 後立刻查詢，可能看到舊資料（Read model 尚未更新）。解法：
1. 前端樂觀更新（Optimistic UI）
2. 特定查詢直接走 Write side（Command side）
3. Read model 更新後透過 WebSocket 推送通知

## 生態系統

| 框架/工具 | 說明 |
|-----------|------|
| Axon Framework | Java 完整 CQRS + Event Sourcing 框架 |
| Spring Modulith | 模組內部 CQRS，基於 Spring Events + Outbox |
| Eventuate Tram | 輕量 Outbox + Saga 支援 |