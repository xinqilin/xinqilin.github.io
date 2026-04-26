---
title: "Spring 依賴注入完整指南：@Autowired 與最佳實踐"
author: Bill.Lin
date: 2021-07-10T20:27:20+08:00
draft: false
tags: ["Java", "Spring", "DI", "IoC", "Autowired", "Constructor", "Best-Practices"]
Description: "深入探討 Spring 依賴注入的各種方式、最佳實踐與常見陷阱，重點說明為何不建議使用 Field Injection"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/@Autowired/

---

## 概述

Spring Framework 的核心特性之一是依賴注入（Dependency Injection, DI），它實現了控制反轉（Inversion of Control, IoC）的設計模式。正確使用依賴注入不僅能提升程式碼的可測試性和可維護性，還能降低組件間的耦合度。本文將深入探討 Spring 中各種依賴注入方式，並重點說明最佳實踐。

## 為什麼不建議使用 @Autowired Field Injection？

當你在 IntelliJ IDEA 中使用 `@Autowired` 進行欄位注入時，會看到這樣的警告：

```
Field injection is not recommended 
Inspection info: Spring Team recommends: 
"Always use constructor based dependency injection in your beans. 
Always use assertions for mandatory dependencies".
```

這個警告背後有深刻的技術理由，讓我們逐一分析。

## Spring 依賴注入的三種方式

### 1. Field Injection（不建議）

```java
@Service
public class OrderService {
    
    @Autowired
    private PaymentService paymentService;  // ❌ 不建議
    
    @Autowired
    private InventoryService inventoryService;  // ❌ 不建議
    
    @Autowired
    private EmailService emailService;  // ❌ 不建議
    
    public void processOrder(Order order) {
        paymentService.processPayment(order);
        inventoryService.updateStock(order);
        emailService.sendConfirmation(order);
    }
}
```

**Field Injection 的問題**：

#### 問題 1：違反單一職責原則
```java
@Service
public class UserService {
    @Autowired private UserRepository userRepository;
    @Autowired private EmailService emailService;
    @Autowired private SmsService smsService;
    @Autowired private AuditService auditService;
    @Autowired private CacheService cacheService;
    @Autowired private ValidationService validationService;
    @Autowired private SecurityService securityService;
    @Autowired private LoggingService loggingService;
    @Autowired private MetricsService metricsService;
    @Autowired private ConfigurationService configurationService;
    // ... 還有更多依賴
    
    // 當你看到這麼多依賴時，應該重新思考這個類別的職責
}
```

#### 問題 2：無法進行單元測試
```java
public class OrderServiceTest {
    
    @Test
    public void testProcessOrder() {
        // ❌ 無法輕易創建 OrderService 實例進行測試
        OrderService orderService = new OrderService(); // PaymentService 為 null!
        
        Order order = new Order();
        orderService.processOrder(order); // NullPointerException!
    }
}
```

#### 問題 3：隱藏的依賴關係
```java
// 從這個建構子看不出這個類別需要什麼依賴
public class OrderService {
    // 依賴隱藏在類別內部，外部無法得知
}
```

#### 問題 4：循環依賴不易發現
```java
@Service
public class ServiceA {
    @Autowired
    private ServiceB serviceB;  // 循環依賴在運行時才會發現
}

@Service
public class ServiceB {
    @Autowired
    private ServiceA serviceA;  // 循環依賴在運行時才會發現
}
```

### 2. Setter Injection（條件性建議）

```java
@Service
public class OrderService {
    
    private PaymentService paymentService;
    private EmailService emailService;
    
    @Autowired
    public void setPaymentService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
    
    @Autowired
    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }
    
    public void processOrder(Order order) {
        if (paymentService != null) {
            paymentService.processPayment(order);
        }
        
        if (emailService != null) {
            emailService.sendConfirmation(order);
        }
    }
}
```

**Setter Injection 適用場景**：
- 可選依賴（Optional Dependencies）
- 循環依賴的暫時解決方案
- 需要在運行時重新配置依賴

### 3. Constructor Injection（強烈建議）

```java
@Service
public class OrderService {
    
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    private final EmailService emailService;
    
    // ✅ 推薦：Constructor Injection
    public OrderService(PaymentService paymentService, 
                       InventoryService inventoryService,
                       EmailService emailService) {
        this.paymentService = Objects.requireNonNull(paymentService, "PaymentService cannot be null");
        this.inventoryService = Objects.requireNonNull(inventoryService, "InventoryService cannot be null");
        this.emailService = Objects.requireNonNull(emailService, "EmailService cannot be null");
    }
    
    public void processOrder(Order order) {
        paymentService.processPayment(order);
        inventoryService.updateStock(order);
        emailService.sendConfirmation(order);
    }
}
```

## Constructor Injection 的優勢

### 1. 不可變性（Immutability）

```java
@Service
public class OrderService {
    
    // ✅ final 關鍵字確保依賴不會被修改
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    
    public OrderService(PaymentService paymentService, InventoryService inventoryService) {
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }
    
    // 無法意外修改依賴關係
}
```

### 2. 強制依賴檢查

```java
@Service
public class OrderService {
    
    private final PaymentService paymentService;
    
    public OrderService(PaymentService paymentService) {
        // ✅ 在物件創建時就確保依賴存在
        this.paymentService = Objects.requireNonNull(paymentService, 
            "PaymentService is required for OrderService");
    }
    
    public void processOrder(Order order) {
        // ✅ 保證 paymentService 不為 null
        paymentService.processPayment(order);
    }
}
```

### 3. 易於單元測試

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock
    private PaymentService paymentService;
    
    @Mock
    private InventoryService inventoryService;
    
    @Mock
    private EmailService emailService;
    
    private OrderService orderService;
    
    @BeforeEach
    void setUp() {
        // ✅ 易於創建測試實例
        orderService = new OrderService(paymentService, inventoryService, emailService);
    }
    
    @Test
    void testProcessOrder() {
        // Given
        Order order = new Order();
        when(paymentService.processPayment(order)).thenReturn(true);
        
        // When
        orderService.processOrder(order);
        
        // Then
        verify(paymentService).processPayment(order);
        verify(inventoryService).updateStock(order);
        verify(emailService).sendConfirmation(order);
    }
}
```

### 4. 明確的依賴關係

```java
// ✅ 從建構子就能清楚看到所有依賴
public class OrderService {
    
    public OrderService(PaymentService paymentService, 
                       InventoryService inventoryService,
                       EmailService emailService,
                       AuditService auditService) {
        // 如果建構子參數太多，說明這個類別承擔了太多職責
        // 這是一個程式碼異味（Code Smell），提醒我們重構
    }
}
```

## 使用 Lombok 簡化 Constructor Injection

### 基本用法

```java
@Service
@RequiredArgsConstructor  // ✅ Lombok 自動生成建構子
public class OrderService {
    
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    private final EmailService emailService;
    
    // Lombok 自動生成：
    // public OrderService(PaymentService paymentService, 
    //                    InventoryService inventoryService,
    //                    EmailService emailService) {
    //     this.paymentService = paymentService;
    //     this.inventoryService = inventoryService;
    //     this.emailService = emailService;
    // }
    
    public void processOrder(Order order) {
        paymentService.processPayment(order);
        inventoryService.updateStock(order);
        emailService.sendConfirmation(order);
    }
}
```

### 混合必要和可選依賴

```java
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    // 必要依賴（final）
    private final EmailService emailService;
    private final SmsService smsService;
    
    // 可選依賴（non-final）
    private PushNotificationService pushService;
    private SlackService slackService;
    
    @Autowired(required = false)
    public void setPushNotificationService(PushNotificationService pushService) {
        this.pushService = pushService;
    }
    
    @Autowired(required = false)
    public void setSlackService(SlackService slackService) {
        this.slackService = slackService;
    }
    
    public void sendNotification(String message, User user) {
        // 必要服務
        emailService.send(message, user.getEmail());
        smsService.send(message, user.getPhone());
        
        // 可選服務
        if (pushService != null) {
            pushService.send(message, user.getDeviceToken());
        }
        
        if (slackService != null) {
            slackService.send(message, user.getSlackChannel());
        }
    }
}
```

## 進階依賴注入技巧

### 1. 條件性依賴注入

```java
@Configuration
public class ServiceConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
    public PaymentService stripePaymentService() {
        return new StripePaymentService();
    }
    
    @Bean
    @ConditionalOnProperty(name = "payment.provider", havingValue = "paypal")
    public PaymentService paypalPaymentService() {
        return new PaypalPaymentService();
    }
    
    @Bean
    @ConditionalOnMissingBean(PaymentService.class)
    public PaymentService defaultPaymentService() {
        return new DefaultPaymentService();
    }
}
```

### 2. 集合注入

```java
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    // ✅ 注入所有 NotificationProvider 實作
    private final List<NotificationProvider> providers;
    
    public void sendNotification(String message, User user) {
        providers.forEach(provider -> {
            try {
                provider.send(message, user);
            } catch (Exception e) {
                log.warn("Failed to send notification via {}: {}", 
                        provider.getClass().getSimpleName(), e.getMessage());
            }
        });
    }
}

// 不同的通知提供者
@Component
public class EmailNotificationProvider implements NotificationProvider {
    public void send(String message, User user) {
        // 發送郵件
    }
}

@Component
public class SmsNotificationProvider implements NotificationProvider {
    public void send(String message, User user) {
        // 發送簡訊
    }
}
```

### 3. 限定符注入

```java
// 使用 @Qualifier 區分相同類型的 Bean
@Service
@RequiredArgsConstructor
public class OrderService {
    
    @Qualifier("primary")
    private final PaymentService primaryPaymentService;
    
    @Qualifier("backup")
    private final PaymentService backupPaymentService;
    
    public void processPayment(Order order) {
        try {
            primaryPaymentService.processPayment(order);
        } catch (PaymentException e) {
            log.warn("Primary payment failed, trying backup: {}", e.getMessage());
            backupPaymentService.processPayment(order);
        }
    }
}

@Configuration
public class PaymentConfiguration {
    
    @Bean
    @Qualifier("primary")
    public PaymentService primaryPaymentService() {
        return new StripePaymentService();
    }
    
    @Bean
    @Qualifier("backup")
    public PaymentService backupPaymentService() {
        return new PaypalPaymentService();
    }
}
```

### 4. Profile 相關注入

```java
@Configuration
public class DatabaseConfiguration {
    
    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new H2DataSource();
    }
    
    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        return new MySQLDataSource();
    }
    
    @Bean
    @Profile("test")
    public DataSource testDataSource() {
        return new TestContainerDataSource();
    }
}
```

## 常見陷阱與解決方案

### 1. 循環依賴問題

#### 問題示例：
```java
@Service
public class OrderService {
    private final CustomerService customerService;
    
    public OrderService(CustomerService customerService) {
        this.customerService = customerService;
    }
}

@Service
public class CustomerService {
    private final OrderService orderService;  // ❌ 循環依賴
    
    public CustomerService(OrderService orderService) {
        this.orderService = orderService;
    }
}
```

#### 解決方案 1：重新設計架構
```java
// ✅ 引入共享服務，避免循環依賴
@Service
@RequiredArgsConstructor
public class OrderService {
    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final OrderValidationService validationService;
}

@Service
@RequiredArgsConstructor
public class CustomerService {
    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
}

@Service
@RequiredArgsConstructor
public class OrderValidationService {
    private final CustomerRepository customerRepository;
    private final PaymentService paymentService;
}
```

#### 解決方案 2：使用事件驅動架構
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    private final OrderRepository orderRepository;
    
    public void createOrder(Order order) {
        order = orderRepository.save(order);
        // ✅ 發布事件而非直接調用
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
    }
}

@Service
@RequiredArgsConstructor
@EventListener
public class CustomerService {
    private final CustomerRepository customerRepository;
    
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 處理訂單創建事件
        updateCustomerOrderCount(event.getOrder().getCustomerId());
    }
}
```

### 2. 建構子參數過多

#### 問題識別：
```java
@Service
public class UserService {
    
    // ❌ 建構子參數過多，違反 SRP 原則
    public UserService(UserRepository userRepository,
                      EmailService emailService,
                      SmsService smsService,
                      AuditService auditService,
                      CacheService cacheService,
                      ValidationService validationService,
                      SecurityService securityService,
                      NotificationService notificationService,
                      PaymentService paymentService,
                      ReportService reportService) {
        // 太多依賴！
    }
}
```

#### 解決方案：拆分服務
```java
// ✅ 拆分為多個專門的服務
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final UserValidationService validationService;
    private final UserSecurityService securityService;
}

@Service
@RequiredArgsConstructor
public class UserNotificationService {
    private final EmailService emailService;
    private final SmsService smsService;
    private final NotificationService notificationService;
}

@Service
@RequiredArgsConstructor
public class UserBillingService {
    private final PaymentService paymentService;
    private final BillingRepository billingRepository;
}
```

### 3. 可選依賴處理

```java
@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    // ✅ 可選依賴使用 Optional
    private final Optional<SmsService> smsService;
    
    public void createUser(User user) {
        user = userRepository.save(user);
        
        // 必要服務
        emailService.sendWelcomeEmail(user);
        
        // 可選服務
        smsService.ifPresent(service -> 
            service.sendWelcomeSms(user.getPhone())
        );
    }
}

@Configuration
public class ServiceConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "sms.enabled", havingValue = "true")
    public SmsService smsService() {
        return new TwilioSmsService();
    }
}
```

## 效能考量

### 1. 延遲初始化

```java
@Service
@Lazy  // ✅ 延遲初始化，減少啟動時間
@RequiredArgsConstructor
public class ReportService {
    private final DataAnalysisService dataAnalysisService;
    private final ChartGenerationService chartService;
    
    public Report generateReport(String type) {
        // 只有在實際使用時才會初始化
        return dataAnalysisService.analyze(type);
    }
}
```

### 2. 原型 Bean 的注入

```java
@Service
@RequiredArgsConstructor
public class OrderProcessorService {
    
    private final ApplicationContext applicationContext;
    
    public void processOrder(Order order) {
        // ✅ 每次都創建新的處理器實例
        OrderProcessor processor = applicationContext.getBean(OrderProcessor.class);
        processor.process(order);
    }
}

@Component
@Scope("prototype")  // 原型範圍
public class OrderProcessor {
    public void process(Order order) {
        // 處理邏輯
    }
}
```

### 3. Provider 模式

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    // ✅ 使用 Provider 延遲獲取 Bean
    private final Provider<ExpensiveService> expensiveServiceProvider;
    
    public void processSpecialOrder(Order order) {
        if (order.isSpecial()) {
            // 只有在需要時才獲取昂貴的服務
            ExpensiveService service = expensiveServiceProvider.get();
            service.processSpecialOrder(order);
        }
    }
}
```

## 測試最佳實踐

### 1. 使用 Constructor Injection 的測試

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock
    private PaymentService paymentService;
    
    @Mock
    private InventoryService inventoryService;
    
    @Mock
    private EmailService emailService;
    
    private OrderService orderService;
    
    @BeforeEach
    void setUp() {
        // ✅ 清晰的測試設置
        orderService = new OrderService(paymentService, inventoryService, emailService);
    }
    
    @Test
    void shouldProcessOrderSuccessfully() {
        // Given
        Order order = TestDataBuilder.createOrder();
        when(paymentService.processPayment(order)).thenReturn(PaymentResult.success());
        
        // When
        OrderResult result = orderService.processOrder(order);
        
        // Then
        assertThat(result.isSuccessful()).isTrue();
        verify(paymentService).processPayment(order);
        verify(inventoryService).updateStock(order);
        verify(emailService).sendConfirmation(order);
    }
    
    @Test
    void shouldHandlePaymentFailure() {
        // Given
        Order order = TestDataBuilder.createOrder();
        when(paymentService.processPayment(order))
            .thenThrow(new PaymentException("Payment failed"));
        
        // When & Then
        assertThatThrownBy(() -> orderService.processOrder(order))
            .isInstanceOf(OrderProcessingException.class)
            .hasMessageContaining("Payment failed");
            
        verify(inventoryService, never()).updateStock(order);
        verify(emailService, never()).sendConfirmation(order);
    }
}
```

### 2. Integration Testing

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "payment.provider=mock"
})
class OrderServiceIntegrationTest {
    
    @Autowired
    private OrderService orderService;
    
    @MockBean  // ✅ Spring Boot 的 Mock 支援
    private EmailService emailService;
    
    @Test
    void shouldProcessOrderEndToEnd() {
        // Given
        Order order = TestDataBuilder.createOrder();
        
        // When
        OrderResult result = orderService.processOrder(order);
        
        // Then
        assertThat(result.isSuccessful()).isTrue();
        verify(emailService).sendConfirmation(order);
    }
}
```

## Spring Boot 中的依賴注入

### 1. 自動配置與依賴注入

```java
@SpringBootApplication
public class ECommerceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ECommerceApplication.class, args);
    }
}

// ✅ Spring Boot 自動配置 + Constructor Injection
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/orders")
public class OrderController {
    
    private final OrderService orderService;
    private final OrderMapper orderMapper;
    
    @PostMapping
    public ResponseEntity<OrderDto> createOrder(@RequestBody CreateOrderRequest request) {
        Order order = orderMapper.toEntity(request);
        Order savedOrder = orderService.createOrder(order);
        OrderDto dto = orderMapper.toDto(savedOrder);
        return ResponseEntity.ok(dto);
    }
}
```

### 2. Configuration Properties

```java
@ConfigurationProperties(prefix = "app.order")
@ConstructorBinding  // ✅ 不可變配置類
@RequiredArgsConstructor
@Getter
public class OrderProperties {
    
    private final Duration timeout;
    private final int maxRetries;
    private final boolean enableNotifications;
    private final PaymentConfig payment;
    
    @RequiredArgsConstructor
    @Getter
    public static class PaymentConfig {
        private final String provider;
        private final Duration timeout;
        private final boolean enableRetry;
    }
}

// 使用配置
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderProperties properties;
    private final PaymentService paymentService;
    
    public void processOrder(Order order) {
        try {
            paymentService.processPayment(order, properties.getPayment().getTimeout());
        } catch (PaymentException e) {
            if (properties.getPayment().isEnableRetry()) {
                retryPayment(order);
            }
        }
    }
}
```

## 監控與偵錯

### 1. Bean 依賴關係檢查

```java
@Component
@RequiredArgsConstructor
public class DependencyHealthIndicator implements HealthIndicator {
    
    private final List<HealthCheckable> healthCheckableServices;
    
    @Override
    public Health health() {
        Health.Builder builder = Health.up();
        
        for (HealthCheckable service : healthCheckableServices) {
            try {
                service.checkHealth();
                builder.withDetail(service.getClass().getSimpleName(), "UP");
            } catch (Exception e) {
                builder.withDetail(service.getClass().getSimpleName(), "DOWN: " + e.getMessage());
                builder.down();
            }
        }
        
        return builder.build();
    }
}
```

### 2. 依賴注入除錯

```java
@EventListener
@Component
@Slf4j
public class ApplicationStartupListener {
    
    @EventListener
    public void handleContextRefresh(ContextRefreshedEvent event) {
        ApplicationContext context = event.getApplicationContext();
        
        log.info("=== Spring Context Loaded ===");
        log.info("Total beans: {}", context.getBeanDefinitionCount());
        
        // 列出所有 Bean
        String[] beanNames = context.getBeanDefinitionNames();
        for (String beanName : beanNames) {
            Object bean = context.getBean(beanName);
            log.debug("Bean: {} -> {}", beanName, bean.getClass().getName());
        }
    }
}
```

## 總結

### 依賴注入方式比較

| 注入方式 | 推薦度 | 優點 | 缺點 | 適用場景 |
|---------|-------|------|------|---------|
| **Constructor** | ⭐⭐⭐⭐⭐ | 不可變、強制檢查、易測試 | 建構子可能變長 | **預設選擇** |
| **Setter** | ⭐⭐⭐ | 靈活、支援可選依賴 | 可變、晚期檢查 | 可選依賴、循環依賴 |
| **Field** | ⭐ | 簡潔 | 難測試、隱藏依賴、可變 | **避免使用** |

### 最佳實踐總結

1. **優先使用 Constructor Injection**：確保依賴的不可變性和強制檢查
2. **使用 Lombok `@RequiredArgsConstructor`**：減少模板程式碼
3. **限制建構子參數數量**：超過 5 個參數考慮重構
4. **使用 `final` 關鍵字**：確保依賴不會被意外修改
5. **適當使用 `@Qualifier`**：區分相同類型的 Bean
6. **考慮可選依賴**：使用 `Optional` 或 Setter Injection
7. **避免循環依賴**：重新設計架構或使用事件驅動
8. **編寫完整的測試**：利用 Constructor Injection 的可測試性

### 遷移策略

如果你的專案目前大量使用 Field Injection，可以採用漸進式遷移：

1. **新程式碼**：立即採用 Constructor Injection
2. **現有程式碼**：在修改時逐步重構
3. **關鍵服務**：優先重構核心業務邏輯
4. **工具支援**：使用 IDE 的自動重構功能

正確的依賴注入不僅是技術最佳實踐，更是建立可維護、可測試、高品質軟體的基礎。

## 踩坑紀錄

### Circular Dependency
Spring Boot 2.6+ 預設禁止循環依賴（`spring.main.allow-circular-references=false`）。出現 `UnsatisfiedDependencyException: circular` 時，正確解法是重新設計（拆分介面、引入第三個 bean），而非啟用 `allow-circular-references=true`。

### `@Autowired` 在 `static` 欄位上無效
Spring AOP 代理只對 instance 欄位作用。`static` 欄位注入永遠是 `null`。

## 版本變遷

| 版本 | 變更 |
|------|------|
| Spring 4.3 | 單一建構子時 `@Autowired` 可省略 |
| Spring 5.0 | Kotlin primary constructor 支援 |
| Spring Boot 2.6 | 循環依賴預設禁止 |

## 替代方案比較

| 方式 | 適用場景 | 缺點 |
|------|---------|------|
| Constructor injection | 必填依賴（推薦） | 依賴多時建構子很長 |
| `@RequiredArgsConstructor` (Lombok) | 簡化建構子注入 | 需加 Lombok 依賴 |
| `ObjectProvider<T>` | 可選依賴或避免循環 | API 較冗長 |
| Setter injection | 可選依賴 | 允許 null，難測試 |

## 參考資料

- [Spring Framework Reference Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#beans-dependencies)
- [Spring Boot Reference Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.spring-application)
- [Effective Java by Joshua Bloch](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/)
- [Clean Code by Robert Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Spring in Action by Craig Walls](https://www.manning.com/books/spring-in-action-sixth-edition)