---
title: "DesignPattern - Structural - Facade"
author: Bill.Lin
date: 2018-08-07T12:16:02+08:00
draft: false
tags: ["Design Pattern", "Structural", "Facade", "Spring", "Microservices", "Enterprise"]
Description: "Comprehensive guide to Facade Pattern with enterprise service patterns, microservices facade implementations, and Spring integration"
Categories: ["DesignPattern"]
DisableComments: false
aliases:
  - /post/DesignPattern/Facade/

---

# Facade Pattern

## 概述

Facade Pattern 是一種結構型設計模式，它為子系統中的一組接口提供統一的入口。Facade 定義了一個更高級別的接口，使子系統更易於使用。它通過隱藏複雜性並暴露簡單的接口來實現抽象，促進鬆散耦合。

## 核心概念

### 關鍵特性

1. **簡化接口**: 提供更簡單的接口來訪問複雜的子系統
2. **解耦**: 將客戶端與子系統的內部工作解耦
3. **統一訪問點**: 為多個子系統提供統一的訪問入口
4. **封裝複雜性**: 隱藏子系統的複雜實現細節

### 與其他模式的區別

- **Facade vs Adapter**: Facade 簡化接口，Adapter 轉換接口
- **Facade vs Mediator**: Facade 子系統不知道 Facade 存在，Mediator 中各組件都知道 Mediator
- **Facade vs Proxy**: Facade 簡化訪問，Proxy 控制訪問

### 結構組件

- **Facade**: 外觀類，提供簡化的接口
- **Subsystem Classes**: 子系統類，實現具體功能
- **Client**: 客戶端，通過 Facade 訪問子系統

## 基本實現

### 1. 經典 Facade 實現

```java
// 子系統類
public class AudioSystem {
    public void turnOn() {
        System.out.println("Audio system is now ON");
    }
    
    public void turnOff() {
        System.out.println("Audio system is now OFF");
    }
    
    public void setVolume(int level) {
        System.out.println("Audio volume set to " + level);
    }
}

public class VideoSystem {
    public void turnOn() {
        System.out.println("Video system is now ON");
    }
    
    public void turnOff() {
        System.out.println("Video system is now OFF");
    }
    
    public void setBrightness(int level) {
        System.out.println("Video brightness set to " + level);
    }
}

public class LightingSystem {
    public void turnOn() {
        System.out.println("Lighting system is now ON");
    }
    
    public void turnOff() {
        System.out.println("Lighting system is now OFF");
    }
    
    public void setIntensity(int level) {
        System.out.println("Lighting intensity set to " + level);
    }
}

// Facade 實現
public class HomeTheaterFacade {
    private final AudioSystem audioSystem;
    private final VideoSystem videoSystem;
    private final LightingSystem lightingSystem;
    
    public HomeTheaterFacade() {
        this.audioSystem = new AudioSystem();
        this.videoSystem = new VideoSystem();
        this.lightingSystem = new LightingSystem();
    }
    
    public void watchMovie() {
        System.out.println("Starting movie experience...");
        lightingSystem.turnOn();
        lightingSystem.setIntensity(20);
        audioSystem.turnOn();
        audioSystem.setVolume(70);
        videoSystem.turnOn();
        videoSystem.setBrightness(50);
        System.out.println("Movie experience ready!");
    }
    
    public void endMovie() {
        System.out.println("Ending movie experience...");
        videoSystem.turnOff();
        audioSystem.turnOff();
        lightingSystem.setIntensity(100);
        System.out.println("Movie experience ended!");
    }
    
    public void partyMode() {
        System.out.println("Starting party mode...");
        lightingSystem.turnOn();
        lightingSystem.setIntensity(100);
        audioSystem.turnOn();
        audioSystem.setVolume(90);
        System.out.println("Party mode activated!");
    }
}
```

### 2. 測試示例

```java
public class FacadePatternDemo {
    public static void main(String[] args) {
        HomeTheaterFacade homeTheater = new HomeTheaterFacade();
        
        // 觀看電影
        homeTheater.watchMovie();
        
        System.out.println("\n--- After movie ---\n");
        
        // 結束電影
        homeTheater.endMovie();
        
        System.out.println("\n--- Starting party ---\n");
        
        // 派對模式
        homeTheater.partyMode();
    }
}
```

## 現代 Java 實現

### 1. 函數式 Facade

```java
// 使用函數式接口
@FunctionalInterface
public interface ServiceOperation {
    void execute();
}

public class FunctionalFacade {
    private final Map<String, List<ServiceOperation>> workflows = new HashMap<>();
    
    public FunctionalFacade() {
        initializeWorkflows();
    }
    
    private void initializeWorkflows() {
        // 定義工作流
        workflows.put("startup", Arrays.asList(
            () -> System.out.println("Initializing database connections"),
            () -> System.out.println("Loading configuration"),
            () -> System.out.println("Starting web server"),
            () -> System.out.println("Registering services")
        ));
        
        workflows.put("shutdown", Arrays.asList(
            () -> System.out.println("Stopping web server"),
            () -> System.out.println("Closing database connections"),
            () -> System.out.println("Saving state"),
            () -> System.out.println("Cleanup completed")
        ));
    }
    
    public void executeWorkflow(String workflowName) {
        List<ServiceOperation> operations = workflows.get(workflowName);
        if (operations != null) {
            System.out.println("Executing workflow: " + workflowName);
            operations.forEach(ServiceOperation::execute);
        }
    }
    
    public void addOperation(String workflowName, ServiceOperation operation) {
        workflows.computeIfAbsent(workflowName, k -> new ArrayList<>()).add(operation);
    }
}
```

### 2. Builder 模式的 Facade

```java
public class FluentFacade {
    private final List<ServiceOperation> operations = new ArrayList<>();
    
    public FluentFacade initialize() {
        operations.add(() -> System.out.println("System initialized"));
        return this;
    }
    
    public FluentFacade configure(String config) {
        operations.add(() -> System.out.println("Configured with: " + config));
        return this;
    }
    
    public FluentFacade start() {
        operations.add(() -> System.out.println("System started"));
        return this;
    }
    
    public FluentFacade stop() {
        operations.add(() -> System.out.println("System stopped"));
        return this;
    }
    
    public void execute() {
        operations.forEach(ServiceOperation::execute);
        operations.clear();
    }
}

// 使用示例
public class FluentFacadeDemo {
    public static void main(String[] args) {
        FluentFacade facade = new FluentFacade();
        
        facade.initialize()
              .configure("production")
              .start()
              .execute();
    }
}
```

## 企業級應用模式

### 1. 服務編排 Facade

```java
// 服務接口
public interface UserService {
    User findById(Long id);
    User save(User user);
    void deleteById(Long id);
}

public interface OrderService {
    Order createOrder(Order order);
    List<Order> getOrdersByUserId(Long userId);
    void cancelOrder(Long orderId);
}

public interface PaymentService {
    Payment processPayment(Payment payment);
    PaymentStatus getPaymentStatus(Long paymentId);
}

public interface NotificationService {
    void sendEmail(String to, String subject, String body);
    void sendSms(String to, String message);
}

// 企業級 Facade 實現
@Service
public class ECommerceFacade {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Transactional
    public OrderResult placeOrder(OrderRequest orderRequest) {
        try {
            // 1. 驗證用戶
            User user = userService.findById(orderRequest.getUserId());
            if (user == null) {
                throw new IllegalArgumentException("User not found");
            }
            
            // 2. 創建訂單
            Order order = new Order();
            order.setUserId(orderRequest.getUserId());
            order.setItems(orderRequest.getItems());
            order.setTotalAmount(calculateTotal(orderRequest.getItems()));
            
            Order createdOrder = orderService.createOrder(order);
            
            // 3. 處理支付
            Payment payment = new Payment();
            payment.setOrderId(createdOrder.getId());
            payment.setAmount(createdOrder.getTotalAmount());
            payment.setPaymentMethod(orderRequest.getPaymentMethod());
            
            Payment processedPayment = paymentService.processPayment(payment);
            
            // 4. 發送通知
            notificationService.sendEmail(
                user.getEmail(),
                "Order Confirmation",
                "Your order #" + createdOrder.getId() + " has been placed successfully"
            );
            
            return new OrderResult(createdOrder, processedPayment, "SUCCESS");
            
        } catch (Exception e) {
            return new OrderResult(null, null, "ERROR: " + e.getMessage());
        }
    }
    
    @Transactional
    public CancellationResult cancelOrder(Long orderId, Long userId) {
        try {
            // 1. 驗證用戶權限
            User user = userService.findById(userId);
            if (user == null) {
                throw new IllegalArgumentException("User not found");
            }
            
            // 2. 取消訂單
            orderService.cancelOrder(orderId);
            
            // 3. 處理退款
            // (退款邏輯)
            
            // 4. 發送取消通知
            notificationService.sendEmail(
                user.getEmail(),
                "Order Cancellation",
                "Your order #" + orderId + " has been cancelled"
            );
            
            return new CancellationResult(orderId, "SUCCESS");
            
        } catch (Exception e) {
            return new CancellationResult(orderId, "ERROR: " + e.getMessage());
        }
    }
    
    public UserDashboard getUserDashboard(Long userId) {
        User user = userService.findById(userId);
        List<Order> orders = orderService.getOrdersByUserId(userId);
        
        return new UserDashboard(user, orders);
    }
    
    private BigDecimal calculateTotal(List<OrderItem> items) {
        return items.stream()
                   .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                   .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

### 2. 業務流程 Facade

```java
// 業務流程定義
public interface BusinessProcess {
    ProcessResult execute(ProcessContext context);
    void rollback(ProcessContext context);
    String getProcessName();
}

// 具體業務流程
@Component
public class UserRegistrationProcess implements BusinessProcess {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private EmailService emailService;
    
    @Override
    public ProcessResult execute(ProcessContext context) {
        try {
            UserRegistrationData data = context.getData(UserRegistrationData.class);
            
            // 創建用戶
            User user = new User();
            user.setEmail(data.getEmail());
            user.setName(data.getName());
            user.setStatus(UserStatus.PENDING);
            
            User savedUser = userService.save(user);
            
            // 發送驗證郵件
            emailService.sendVerificationEmail(savedUser.getEmail(), savedUser.getId());
            
            context.setResult("userId", savedUser.getId());
            return ProcessResult.success("User registration initiated");
            
        } catch (Exception e) {
            return ProcessResult.failure("Registration failed: " + e.getMessage());
        }
    }
    
    @Override
    public void rollback(ProcessContext context) {
        Long userId = context.getResult("userId", Long.class);
        if (userId != null) {
            userService.deleteById(userId);
        }
    }
    
    @Override
    public String getProcessName() {
        return "USER_REGISTRATION";
    }
}

// 業務流程 Facade
@Service
public class BusinessProcessFacade {
    
    private final Map<String, BusinessProcess> processes;
    
    public BusinessProcessFacade(List<BusinessProcess> businessProcesses) {
        this.processes = businessProcesses.stream()
            .collect(Collectors.toMap(
                BusinessProcess::getProcessName,
                Function.identity()
            ));
    }
    
    public ProcessResult executeProcess(String processName, ProcessContext context) {
        BusinessProcess process = processes.get(processName);
        if (process == null) {
            return ProcessResult.failure("Process not found: " + processName);
        }
        
        try {
            return process.execute(context);
        } catch (Exception e) {
            return ProcessResult.failure("Process execution failed: " + e.getMessage());
        }
    }
    
    public void rollbackProcess(String processName, ProcessContext context) {
        BusinessProcess process = processes.get(processName);
        if (process != null) {
            process.rollback(context);
        }
    }
    
    public List<String> getAvailableProcesses() {
        return new ArrayList<>(processes.keySet());
    }
}
```

## 微服務 Facade

### 1. API Gateway Facade

```java
// 微服務客戶端
@FeignClient(name = "user-service")
public interface UserServiceClient {
    @GetMapping("/users/{id}")
    User getUser(@PathVariable Long id);
    
    @PostMapping("/users")
    User createUser(@RequestBody User user);
}

@FeignClient(name = "order-service")
public interface OrderServiceClient {
    @GetMapping("/orders/{id}")
    Order getOrder(@PathVariable Long id);
    
    @PostMapping("/orders")
    Order createOrder(@RequestBody Order order);
    
    @GetMapping("/orders/user/{userId}")
    List<Order> getOrdersByUserId(@PathVariable Long userId);
}

@FeignClient(name = "payment-service")
public interface PaymentServiceClient {
    @PostMapping("/payments")
    Payment processPayment(@RequestBody Payment payment);
    
    @GetMapping("/payments/{id}")
    Payment getPayment(@PathVariable Long id);
}

// API Gateway Facade
@RestController
@RequestMapping("/api/v1")
public class ApiGatewayFacade {
    
    @Autowired
    private UserServiceClient userService;
    
    @Autowired
    private OrderServiceClient orderService;
    
    @Autowired
    private PaymentServiceClient paymentService;
    
    @GetMapping("/users/{id}/profile")
    public ResponseEntity<UserProfile> getUserProfile(@PathVariable Long id) {
        try {
            // 並行獲取用戶資料和訂單
            CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> 
                userService.getUser(id));
            
            CompletableFuture<List<Order>> ordersFuture = CompletableFuture.supplyAsync(() -> 
                orderService.getOrdersByUserId(id));
            
            // 等待所有請求完成
            User user = userFuture.get();
            List<Order> orders = ordersFuture.get();
            
            // 組合數據
            UserProfile profile = new UserProfile(user, orders);
            
            return ResponseEntity.ok(profile);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new UserProfile(null, null));
        }
    }
    
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResult> checkout(@RequestBody CheckoutRequest request) {
        try {
            // 創建訂單
            Order order = new Order();
            order.setUserId(request.getUserId());
            order.setItems(request.getItems());
            order.setTotalAmount(request.getTotalAmount());
            
            Order createdOrder = orderService.createOrder(order);
            
            // 處理支付
            Payment payment = new Payment();
            payment.setOrderId(createdOrder.getId());
            payment.setAmount(createdOrder.getTotalAmount());
            payment.setPaymentMethod(request.getPaymentMethod());
            
            Payment processedPayment = paymentService.processPayment(payment);
            
            CheckoutResult result = new CheckoutResult(createdOrder, processedPayment);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new CheckoutResult(null, null));
        }
    }
}
```

### 2. 服務聚合 Facade

```java
// 服務聚合器
@Service
public class ServiceAggregatorFacade {
    
    @Autowired
    private UserServiceClient userService;
    
    @Autowired
    private OrderServiceClient orderService;
    
    @Autowired
    private PaymentServiceClient paymentService;
    
    @Autowired
    private ProductServiceClient productService;
    
    @Async
    public CompletableFuture<DashboardData> getUserDashboard(Long userId) {
        // 並行獲取多個服務的數據
        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> 
            userService.getUser(userId));
        
        CompletableFuture<List<Order>> ordersFuture = CompletableFuture.supplyAsync(() -> 
            orderService.getOrdersByUserId(userId));
        
        CompletableFuture<List<Product>> recommendationsFuture = CompletableFuture.supplyAsync(() -> 
            productService.getRecommendations(userId));
        
        // 組合所有結果
        return CompletableFuture.allOf(userFuture, ordersFuture, recommendationsFuture)
            .thenApply(v -> {
                User user = userFuture.join();
                List<Order> orders = ordersFuture.join();
                List<Product> recommendations = recommendationsFuture.join();
                
                return new DashboardData(user, orders, recommendations);
            });
    }
    
    public OrderSummary getOrderSummary(Long orderId) {
        // 獲取訂單詳情
        Order order = orderService.getOrder(orderId);
        
        // 並行獲取用戶和支付信息
        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> 
            userService.getUser(order.getUserId()));
        
        CompletableFuture<Payment> paymentFuture = CompletableFuture.supplyAsync(() -> 
            paymentService.getPayment(order.getPaymentId()));
        
        try {
            User user = userFuture.get();
            Payment payment = paymentFuture.get();
            
            return new OrderSummary(order, user, payment);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to get order summary", e);
        }
    }
}
```

### 3. 微服務編排 Facade

```java
// 微服務編排模式
@Service
public class MicroserviceOrchestrator {
    
    @Autowired
    private UserServiceClient userService;
    
    @Autowired
    private InventoryServiceClient inventoryService;
    
    @Autowired
    private OrderServiceClient orderService;
    
    @Autowired
    private PaymentServiceClient paymentService;
    
    @Autowired
    private NotificationServiceClient notificationService;
    
    @Transactional
    public CompletableFuture<OrderProcessingResult> processOrder(OrderRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // 1. 驗證用戶
                User user = userService.getUser(request.getUserId());
                if (user == null) {
                    throw new IllegalArgumentException("User not found");
                }
                
                // 2. 檢查庫存
                InventoryCheckResult inventoryResult = inventoryService.checkAvailability(
                    request.getItems());
                if (!inventoryResult.isAvailable()) {
                    throw new IllegalStateException("Insufficient inventory");
                }
                
                // 3. 創建訂單
                Order order = orderService.createOrder(buildOrder(request));
                
                // 4. 處理支付
                Payment payment = paymentService.processPayment(
                    buildPayment(order, request.getPaymentMethod()));
                
                // 5. 更新庫存
                inventoryService.reserveItems(request.getItems());
                
                // 6. 發送通知
                notificationService.sendOrderConfirmation(user.getEmail(), order.getId());
                
                return new OrderProcessingResult(order, payment, "SUCCESS");
                
            } catch (Exception e) {
                return new OrderProcessingResult(null, null, "ERROR: " + e.getMessage());
            }
        });
    }
    
    private Order buildOrder(OrderRequest request) {
        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setItems(request.getItems());
        order.setTotalAmount(calculateTotal(request.getItems()));
        order.setStatus(OrderStatus.PENDING);
        return order;
    }
    
    private Payment buildPayment(Order order, PaymentMethod method) {
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setAmount(order.getTotalAmount());
        payment.setPaymentMethod(method);
        return payment;
    }
    
    private BigDecimal calculateTotal(List<OrderItem> items) {
        return items.stream()
                   .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                   .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

## Spring Boot 集成

### 1. 自動配置

```java
@Configuration
@EnableConfigurationProperties(FacadeProperties.class)
public class FacadeAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public BusinessProcessFacade businessProcessFacade(List<BusinessProcess> processes) {
        return new BusinessProcessFacade(processes);
    }
    
    @Bean
    @ConditionalOnMissingBean
    public ServiceAggregatorFacade serviceAggregatorFacade() {
        return new ServiceAggregatorFacade();
    }
    
    @Bean
    @ConditionalOnProperty(prefix = "facade.api-gateway", name = "enabled", havingValue = "true")
    public ApiGatewayFacade apiGatewayFacade() {
        return new ApiGatewayFacade();
    }
    
    @Bean
    @ConditionalOnProperty(prefix = "facade.orchestrator", name = "enabled", havingValue = "true")
    public MicroserviceOrchestrator microserviceOrchestrator() {
        return new MicroserviceOrchestrator();
    }
}

// 配置屬性
@ConfigurationProperties(prefix = "facade")
@Data
public class FacadeProperties {
    private ApiGateway apiGateway = new ApiGateway();
    private Orchestrator orchestrator = new Orchestrator();
    private CircuitBreaker circuitBreaker = new CircuitBreaker();
    
    @Data
    public static class ApiGateway {
        private boolean enabled = true;
        private int timeout = 5000;
        private int maxConcurrentRequests = 100;
    }
    
    @Data
    public static class Orchestrator {
        private boolean enabled = true;
        private int maxRetries = 3;
        private long retryDelay = 1000;
    }
    
    @Data
    public static class CircuitBreaker {
        private boolean enabled = true;
        private int failureThreshold = 5;
        private long timeout = 60000;
    }
}
```

### 2. 健康檢查 Facade

```java
@Component
public class HealthCheckFacade {
    
    @Autowired
    private List<HealthIndicator> healthIndicators;
    
    @Autowired
    private MeterRegistry meterRegistry;
    
    public HealthStatus getOverallHealth() {
        Map<String, Health> healthDetails = new HashMap<>();
        boolean allHealthy = true;
        
        for (HealthIndicator indicator : healthIndicators) {
            try {
                Health health = indicator.health();
                healthDetails.put(indicator.getClass().getSimpleName(), health);
                
                if (health.getStatus() != Status.UP) {
                    allHealthy = false;
                }
                
            } catch (Exception e) {
                Health errorHealth = Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
                healthDetails.put(indicator.getClass().getSimpleName(), errorHealth);
                allHealthy = false;
            }
        }
        
        // 記錄健康狀態指標
        meterRegistry.gauge("health.status", allHealthy ? 1 : 0);
        
        return new HealthStatus(allHealthy ? Status.UP : Status.DOWN, healthDetails);
    }
    
    public Health getServiceHealth(String serviceName) {
        return healthIndicators.stream()
            .filter(indicator -> indicator.getClass().getSimpleName().equals(serviceName))
            .findFirst()
            .map(HealthIndicator::health)
            .orElse(Health.unknown().withDetail("service", "not found").build());
    }
}
```

### 3. 配置管理 Facade

```java
@Service
public class ConfigurationFacade {
    
    @Autowired
    private Environment environment;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    private final Map<String, Object> runtimeConfig = new ConcurrentHashMap<>();
    
    public String getProperty(String key) {
        return environment.getProperty(key);
    }
    
    public String getProperty(String key, String defaultValue) {
        return environment.getProperty(key, defaultValue);
    }
    
    public <T> T getProperty(String key, Class<T> targetType) {
        return environment.getProperty(key, targetType);
    }
    
    public void setRuntimeProperty(String key, Object value) {
        runtimeConfig.put(key, value);
    }
    
    public Object getRuntimeProperty(String key) {
        return runtimeConfig.get(key);
    }
    
    public Map<String, Object> getAllRuntimeProperties() {
        return new HashMap<>(runtimeConfig);
    }
    
    public ConfigurationSummary getConfigurationSummary() {
        Map<String, Object> activeProfiles = Map.of(
            "active", Arrays.asList(environment.getActiveProfiles()),
            "default", Arrays.asList(environment.getDefaultProfiles())
        );
        
        return new ConfigurationSummary(activeProfiles, runtimeConfig);
    }
    
    public void refreshConfiguration() {
        // 刷新配置邏輯
        applicationContext.publishEvent(new EnvironmentChangeEvent(runtimeConfig.keySet()));
    }
}
```

## 性能優化和最佳實踐

### 1. 緩存 Facade

```java
@Service
public class CachingFacade {
    
    @Autowired
    private CacheManager cacheManager;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    public <T> T getFromCache(String cacheName, String key, Class<T> type, Supplier<T> valueLoader) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            Cache.ValueWrapper cached = cache.get(key);
            if (cached != null) {
                return type.cast(cached.get());
            }
        }
        
        T value = valueLoader.get();
        if (value != null && cache != null) {
            cache.put(key, value);
        }
        
        return value;
    }
    
    public void evictFromCache(String cacheName, String key) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.evict(key);
        }
    }
    
    public void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }
    
    public CacheStatistics getCacheStatistics(String cacheName) {
        // 獲取緩存統計信息
        return new CacheStatistics(cacheName, 0, 0, 0); // 簡化實現
    }
}
```

### 2. 批處理 Facade

```java
@Service
public class BatchProcessingFacade {
    
    @Autowired
    private TaskExecutor taskExecutor;
    
    private final Map<String, List<BatchOperation>> batchQueues = new ConcurrentHashMap<>();
    
    public void addToBatch(String batchId, BatchOperation operation) {
        batchQueues.computeIfAbsent(batchId, k -> new ArrayList<>()).add(operation);
    }
    
    public CompletableFuture<BatchResult> processBatch(String batchId) {
        List<BatchOperation> operations = batchQueues.remove(batchId);
        if (operations == null || operations.isEmpty()) {
            return CompletableFuture.completedFuture(new BatchResult(batchId, 0, 0));
        }
        
        return CompletableFuture.supplyAsync(() -> {
            int successful = 0;
            int failed = 0;
            
            for (BatchOperation operation : operations) {
                try {
                    operation.execute();
                    successful++;
                } catch (Exception e) {
                    failed++;
                }
            }
            
            return new BatchResult(batchId, successful, failed);
        }, taskExecutor);
    }
    
    public void schedulePeriodicBatch(String batchId, long interval) {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            if (batchQueues.containsKey(batchId)) {
                processBatch(batchId);
            }
        }, interval, interval, TimeUnit.MILLISECONDS);
    }
}
```

### 3. 監控 Facade

```java
@Service
public class MonitoringFacade {
    
    @Autowired
    private MeterRegistry meterRegistry;
    
    private final Map<String, Timer> timers = new ConcurrentHashMap<>();
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    
    public <T> T monitorOperation(String operationName, Supplier<T> operation) {
        Timer timer = timers.computeIfAbsent(operationName, 
            name -> Timer.builder(name).register(meterRegistry));
        
        Counter successCounter = counters.computeIfAbsent(operationName + ".success",
            name -> Counter.builder(name).register(meterRegistry));
        
        Counter errorCounter = counters.computeIfAbsent(operationName + ".error",
            name -> Counter.builder(name).register(meterRegistry));
        
        return timer.recordCallable(() -> {
            try {
                T result = operation.get();
                successCounter.increment();
                return result;
            } catch (Exception e) {
                errorCounter.increment();
                throw e;
            }
        });
    }
    
    public void recordMetric(String name, double value) {
        Gauge.builder(name)
             .register(meterRegistry, value, val -> val);
    }
    
    public void incrementCounter(String name) {
        Counter counter = counters.computeIfAbsent(name,
            counterName -> Counter.builder(counterName).register(meterRegistry));
        counter.increment();
    }
    
    public MetricsSummary getMetricsSummary() {
        return new MetricsSummary(
            timers.size(),
            counters.size(),
            meterRegistry.getMeters().size()
        );
    }
}
```

## 測試策略

### 1. 單元測試

```java
@ExtendWith(MockitoExtension.class)
class ECommerceFacadeTest {
    
    @Mock
    private UserService userService;
    
    @Mock
    private OrderService orderService;
    
    @Mock
    private PaymentService paymentService;
    
    @Mock
    private NotificationService notificationService;
    
    @InjectMocks
    private ECommerceFacade eCommerceFacade;
    
    @Test
    void testPlaceOrder_Success() {
        // 準備測試數據
        OrderRequest request = new OrderRequest();
        request.setUserId(1L);
        request.setItems(Arrays.asList(new OrderItem("Product1", 2, BigDecimal.valueOf(100))));
        request.setPaymentMethod(PaymentMethod.CREDIT_CARD);
        
        User user = new User(1L, "John Doe", "john@example.com");
        Order order = new Order(1L, 1L, BigDecimal.valueOf(200));
        Payment payment = new Payment(1L, 1L, BigDecimal.valueOf(200));
        
        // 模擬服務調用
        when(userService.findById(1L)).thenReturn(user);
        when(orderService.createOrder(any(Order.class))).thenReturn(order);
        when(paymentService.processPayment(any(Payment.class))).thenReturn(payment);
        
        // 執行測試
        OrderResult result = eCommerceFacade.placeOrder(request);
        
        // 驗證結果
        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getOrder()).isNotNull();
        assertThat(result.getPayment()).isNotNull();
        
        // 驗證服務調用
        verify(userService).findById(1L);
        verify(orderService).createOrder(any(Order.class));
        verify(paymentService).processPayment(any(Payment.class));
        verify(notificationService).sendEmail(eq(user.getEmail()), anyString(), anyString());
    }
    
    @Test
    void testPlaceOrder_UserNotFound() {
        // 準備測試數據
        OrderRequest request = new OrderRequest();
        request.setUserId(999L);
        
        when(userService.findById(999L)).thenReturn(null);
        
        // 執行測試
        OrderResult result = eCommerceFacade.placeOrder(request);
        
        // 驗證結果
        assertThat(result.getStatus()).startsWith("ERROR");
        assertThat(result.getOrder()).isNull();
        assertThat(result.getPayment()).isNull();
    }
}
```

### 2. 集成測試

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ApiGatewayFacadeIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @MockBean
    private UserServiceClient userServiceClient;
    
    @MockBean
    private OrderServiceClient orderServiceClient;
    
    @Test
    void testGetUserProfile() {
        // 準備測試數據
        User user = new User(1L, "John Doe", "john@example.com");
        List<Order> orders = Arrays.asList(
            new Order(1L, 1L, BigDecimal.valueOf(100)),
            new Order(2L, 1L, BigDecimal.valueOf(200))
        );
        
        when(userServiceClient.getUser(1L)).thenReturn(user);
        when(orderServiceClient.getOrdersByUserId(1L)).thenReturn(orders);
        
        // 執行測試
        ResponseEntity<UserProfile> response = restTemplate.getForEntity(
            "/api/v1/users/1/profile", UserProfile.class);
        
        // 驗證結果
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getUser()).isEqualTo(user);
        assertThat(response.getBody().getOrders()).hasSize(2);
    }
}
```

## 最佳實踐

### 1. 設計原則

- **單一職責**: 每個 Facade 只負責一個業務領域
- **簡化接口**: 提供簡潔易用的接口
- **松耦合**: 避免 Facade 與子系統緊密耦合
- **可測試性**: 確保 Facade 易於測試

### 2. 實現建議

- 使用依賴注入管理子系統依賴
- 實現適當的異常處理
- 考慮使用異步處理提高性能
- 提供詳細的日誌記錄

### 3. 性能考慮

- 使用緩存減少重複計算
- 實現批處理減少網絡調用
- 考慮使用並行處理
- 監控和優化關鍵路徑

### 4. 常見陷阱

- 避免 Facade 變得過於複雜
- 不要在 Facade 中實現業務邏輯
- 避免 Facade 之間的循環依賴
- 注意事務邊界和一致性

## 適用場景

### 何時使用

1. **複雜子系統**: 當子系統過於複雜時
2. **多服務集成**: 需要整合多個服務時
3. **API 簡化**: 需要簡化 API 接口時
4. **微服務聚合**: 需要聚合多個微服務時

### 何時避免

1. **簡單系統**: 當系統足夠簡單時
2. **性能關鍵**: 當額外的抽象層會影響性能時
3. **頻繁變更**: 當子系統頻繁變更時

## 總結

Facade Pattern 是一個非常實用的設計模式，特別適合現代企業級應用和微服務架構。通過提供統一的接口，它能夠有效地隱藏系統的複雜性，提高系統的可用性和可維護性。

在微服務架構中，Facade Pattern 可以作為 API Gateway 或服務聚合器，幫助管理複雜的服務間通信。結合 Spring Boot 的自動配置和依賴注入功能，我們可以創建出既靈活又高效的 Facade 實現。

關鍵是要理解何時使用 Facade Pattern，以及如何正確地設計和實現它。通過合理使用 Facade Pattern，我們可以構建出既簡潔又功能強大的企業級應用系統。