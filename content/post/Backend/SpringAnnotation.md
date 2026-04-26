---
title: "Spring Framework 註解完整指南：從基礎到進階應用"
author: Bill.Lin
date: 2019-09-05T23:50:29+08:00
draft: false
tags: ["Java", "Spring", "Annotation", "Spring-Boot", "Configuration", "Web", "Data", "Security"]
Description: "全面整理 Spring Framework 中的重要註解，包含核心容器、Web、資料存取、安全、測試等各個領域的註解使用指南"
Categories: ["Backend"]
DisableComments: false
---

## 概述

Spring Framework 廣泛使用註解（Annotations）來簡化配置和提升開發效率。從 Spring 2.5 開始引入註解驅動配置，到 Spring Boot 的自動配置，註解已成為現代 Spring 應用程式開發的核心。本文將系統性地整理 Spring 生態系統中的重要註解，並提供實用的程式碼範例。

## 核心容器註解

### 1. Bean 定義與管理

#### @Component 系列
```java
// 通用組件
@Component
public class UserValidator {
    public boolean validate(User user) {
        return user != null && user.getEmail() != null;
    }
}

// 服務層組件
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}

// 資料存取層組件
@Repository
public class UserRepositoryImpl implements UserRepository {
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public Optional<User> findById(Long id) {
        User user = entityManager.find(User.class, id);
        return Optional.ofNullable(user);
    }
}

// Web 層組件
@Controller
public class UserController {
    @Autowired
    private UserService userService;
    
    @GetMapping("/users/{id}")
    @ResponseBody
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
}

// RESTful API 控制器
@RestController  // 等同於 @Controller + @ResponseBody
@RequestMapping("/api/users")
public class UserRestController {
    @Autowired
    private UserService userService;
    
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
}
```

#### @Configuration 和 @Bean
```java
@Configuration
@EnableTransactionManagement
@ComponentScan(basePackages = "com.example")
public class AppConfiguration {
    
    @Bean
    @Primary  // 當有多個相同類型的 Bean 時，優先使用這個
    public DataSource primaryDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/primary");
        dataSource.setUsername("user");
        dataSource.setPassword("password");
        return dataSource;
    }
    
    @Bean
    @Qualifier("secondary")  // 使用限定符區分
    public DataSource secondaryDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/secondary");
        dataSource.setUsername("user");
        dataSource.setPassword("password");
        return dataSource;
    }
    
    @Bean
    @Scope("prototype")  // 每次注入都創建新實例
    public OrderProcessor orderProcessor() {
        return new OrderProcessor();
    }
    
    @Bean
    @Lazy  // 延遲初始化
    public ExpensiveService expensiveService() {
        return new ExpensiveService();
    }
}
```

### `@Configuration(proxyBeanMethods = false)`

預設 `proxyBeanMethods = true`：Spring 會用 CGLIB 代理 `@Configuration` 類別，確保 `@Bean` 方法之間互相呼叫時回傳的是同一個 singleton。

設為 `false` 時不代理，效能略好（適合 Spring Boot 的 auto-configuration 內部使用），但 `@Bean` 方法互相呼叫時會產生新 instance，而非 singleton。

**Rule**：除非明確需要 `@Bean` 互呼且要確保 singleton，否則保持預設 `true`。

### `@ConditionalOnMissingBean` / `@ConditionalOnProperty`

這兩個是 Spring Boot auto-configuration 的核心機制：

```java
@Bean
@ConditionalOnMissingBean(DataSource.class)  // 只在沒有 DataSource bean 時才建立
public DataSource embeddedDataSource() { ... }

@Bean
@ConditionalOnProperty(name = "feature.cache.enabled", havingValue = "true")
public CacheManager cacheManager() { ... }
```

`@ConditionalOnMissingBean` 是「讓使用者覆蓋預設設定」的標準做法。

### 2. 依賴注入註解

#### @Autowired 和相關註解
```java
@Service
public class OrderService {
    
    // 建構子注入（推薦）
    private final PaymentService paymentService;
    private final EmailService emailService;
    
    @Autowired
    public OrderService(PaymentService paymentService, EmailService emailService) {
        this.paymentService = paymentService;
        this.emailService = emailService;
    }
    
    // 可選依賴
    @Autowired(required = false)
    private Optional<SmsService> smsService;
    
    // 集合注入
    @Autowired
    private List<NotificationProvider> notificationProviders;
    
    // 使用限定符
    @Autowired
    @Qualifier("primary")
    private DataSource primaryDataSource;
    
    // JSR-330 標準註解
    @Inject  // 等同於 @Autowired
    private AuditService auditService;
    
    @Named("cache")  // 等同於 @Qualifier
    private CacheManager cacheManager;
}
```

#### @Value 屬性注入
```java
@Component
public class ConfigurationService {
    
    // 基本屬性注入
    @Value("${app.name}")
    private String appName;
    
    // 預設值
    @Value("${app.timeout:30}")
    private int timeout;
    
    // 系統屬性
    @Value("#{systemProperties['user.home']}")
    private String userHome;
    
    // SpEL 表達式
    @Value("#{T(java.lang.Math).random() * 100}")
    private double randomNumber;
    
    // 陣列注入
    @Value("${app.allowed-origins}")
    private String[] allowedOrigins;
    
    // List 注入
    @Value("#{'${app.features}'.split(',')}")
    private List<String> features;
    
    // Map 注入
    @Value("#{${app.database-config}}")
    private Map<String, String> databaseConfig;
    
    // 建構子參數注入
    public ConfigurationService(@Value("${app.version}") String version) {
        this.version = version;
    }
}
```

## Web 相關註解

### 1. MVC 控制器註解

#### @RequestMapping 系列
```java
@RestController
@RequestMapping("/api/v1/orders")
@CrossOrigin(origins = "http://localhost:3000")  // CORS 設定
public class OrderController {
    
    @Autowired
    private OrderService orderService;
    
    // GET 請求
    @GetMapping
    public Page<Order> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status,
        Pageable pageable) {
        return orderService.findOrders(status, pageable);
    }
    
    // 路徑變數
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        return orderService.findById(id)
            .map(order -> ResponseEntity.ok(order))
            .orElse(ResponseEntity.notFound().build());
    }
    
    // POST 請求
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order createOrder(@RequestBody @Valid CreateOrderRequest request) {
        return orderService.createOrder(request);
    }
    
    // PUT 請求
    @PutMapping("/{id}")
    public ResponseEntity<Order> updateOrder(
        @PathVariable Long id,
        @RequestBody @Valid UpdateOrderRequest request) {
        return orderService.updateOrder(id, request)
            .map(order -> ResponseEntity.ok(order))
            .orElse(ResponseEntity.notFound().build());
    }
    
    // DELETE 請求
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
    
    // 檔案上傳
    @PostMapping("/{id}/attachments")
    public ResponseEntity<String> uploadAttachment(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file) {
        String fileUrl = orderService.uploadAttachment(id, file);
        return ResponseEntity.ok(fileUrl);
    }
    
    // 自訂 HTTP 方法
    @RequestMapping(value = "/{id}/status", method = RequestMethod.PATCH)
    public Order updateOrderStatus(
        @PathVariable Long id,
        @RequestBody OrderStatusUpdate statusUpdate) {
        return orderService.updateStatus(id, statusUpdate);
    }
}
```

#### 參數處理註解
```java
@RestController
public class UserController {
    
    // 請求頭處理
    @GetMapping("/profile")
    public UserProfile getProfile(
        @RequestHeader("Authorization") String authToken,
        @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        return userService.getProfile(authToken);
    }
    
    // Cookie 處理
    @GetMapping("/preferences")
    public UserPreferences getPreferences(
        @CookieValue(name = "sessionId", required = false) String sessionId) {
        return userService.getPreferences(sessionId);
    }
    
    // Session 屬性
    @PostMapping("/login")
    public ResponseEntity<String> login(
        @RequestBody LoginRequest request,
        @SessionAttribute(required = false) String captcha,
        HttpSession session) {
        
        if (userService.validateLogin(request, captcha)) {
            session.setAttribute("userId", request.getUsername());
            return ResponseEntity.ok("Login successful");
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login failed");
    }
    
    // Model 屬性
    @ModelAttribute("commonData")
    public CommonData getCommonData() {
        return new CommonData();
    }
    
    @GetMapping("/dashboard")
    public String dashboard(@ModelAttribute("commonData") CommonData commonData) {
        return "dashboard";
    }
}
```

### 2. 驗證註解

#### Bean Validation
```java
@RestController
@Validated  // 開啟驗證
public class UserController {
    
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody @Valid CreateUserRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity.ok(user);
    }
    
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable @Min(1) Long id) {
        return userService.findById(id);
    }
}

// 請求 DTO 與驗證
public class CreateUserRequest {
    
    @NotBlank(message = "姓名不能為空")
    @Size(min = 2, max = 50, message = "姓名長度必須在 2-50 字元之間")
    private String name;
    
    @NotBlank(message = "信箱不能為空")
    @Email(message = "信箱格式不正確")
    private String email;
    
    @NotNull(message = "年齡不能為空")
    @Min(value = 18, message = "年齡必須大於等於 18")
    @Max(value = 120, message = "年齡必須小於等於 120")
    private Integer age;
    
    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "電話號碼格式不正確")
    private String phone;
    
    @Valid  // 巢狀物件驗證
    private Address address;
    
    @NotEmpty(message = "至少要有一個興趣")
    private List<@NotBlank String> interests;
    
    // getters and setters...
}

// 自訂驗證註解
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueEmailValidator.class)
public @interface UniqueEmail {
    String message() default "信箱已被使用";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        return email == null || !userRepository.existsByEmail(email);
    }
}
```

## 資料存取註解

### 1. JPA 和 Hibernate 註解

#### 實體定義
```java
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String name;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "user_status")
    private UserStatus status = UserStatus.ACTIVE;
    
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;
    
    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;
    
    // 一對多關係
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Order> orders = new ArrayList<>();
    
    // 多對一關係
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
    
    // 多對多關係
    @ManyToMany
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
    
    // 版本控制（樂觀鎖定）
    @Version
    private Long version;
    
    // getters and setters...
}
```

#### Repository 介面
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    
    // 查詢方法名稱規則
    Optional<User> findByEmail(String email);
    
    List<User> findByStatusAndCreatedAtAfter(UserStatus status, LocalDateTime date);
    
    Page<User> findByNameContainingIgnoreCase(String name, Pageable pageable);
    
    // 自訂查詢
    @Query("SELECT u FROM User u WHERE u.email = ?1 AND u.status = ?2")
    Optional<User> findByEmailAndStatus(String email, UserStatus status);
    
    // 命名參數
    @Query("SELECT u FROM User u WHERE u.name LIKE %:name% ORDER BY u.createdAt DESC")
    List<User> findByNameContaining(@Param("name") String name);
    
    // 原生 SQL
    @Query(value = "SELECT * FROM users WHERE email = ?1", nativeQuery = true)
    User findByEmailNative(String email);
    
    // 更新查詢
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
    int updateUserStatus(@Param("id") Long id, @Param("status") UserStatus status);
    
    // 刪除查詢
    @Modifying
    @Query("DELETE FROM User u WHERE u.status = :status")
    void deleteByStatus(@Param("status") UserStatus status);
    
    // 投影查詢
    @Query("SELECT new com.example.dto.UserSummary(u.id, u.name, u.email) FROM User u")
    List<UserSummary> findUserSummaries();
    
    // 計數查詢
    long countByStatus(UserStatus status);
    
    boolean existsByEmail(String email);
}
```

### 2. 交易管理

#### @Transactional 註解
```java
@Service
@Transactional  // 類別層級的交易設定
public class OrderService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private InventoryService inventoryService;
    
    // 預設交易設定
    public Order createOrder(CreateOrderRequest request) {
        Order order = new Order(request);
        order = orderRepository.save(order);
        
        // 這些操作都在同一個交易中
        paymentService.processPayment(order);
        inventoryService.updateStock(order.getItems());
        
        return order;
    }
    
    // 唯讀交易（效能優化）
    @Transactional(readOnly = true)
    public List<Order> findOrdersByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }
    
    // 指定傳播行為
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOrderEvent(Long orderId, String event) {
        // 這個方法總是在新的交易中執行
        OrderEvent orderEvent = new OrderEvent(orderId, event);
        orderEventRepository.save(orderEvent);
    }
    
    // 指定隔離級別
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void processHighValueOrder(Order order) {
        // 序列化隔離級別，避免併發問題
        processOrder(order);
    }
    
    // 異常回滾設定
    @Transactional(rollbackFor = {Exception.class}, noRollbackFor = {ValidationException.class})
    public void complexOperation() {
        // 遇到任何 Exception 都回滾，除了 ValidationException
    }
    
    // 超時設定
    @Transactional(timeout = 30)  // 30 秒超時
    public void longRunningOperation() {
        // 長時間運行的操作
    }
    
    // 指定交易管理器
    @Transactional(transactionManager = "secondaryTransactionManager")
    public void operationOnSecondaryDatabase() {
        // 使用指定的交易管理器
    }
}
```

## 排程和非同步處理

### 1. 排程任務註解

#### @Scheduled 和 @EnableScheduling
```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
    
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(10);
        scheduler.setThreadNamePrefix("scheduled-task-");
        scheduler.initialize();
        return scheduler;
    }
}

@Component
@Slf4j
public class ScheduledTasks {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private EmailService emailService;
    
    // 固定延遲執行（上次執行完成後多久再執行）
    @Scheduled(fixedDelay = 5000)  // 5 秒
    public void processOrders() {
        log.info("處理待處理訂單");
        orderService.processePendingOrders();
    }
    
    // 固定頻率執行（固定間隔執行）
    @Scheduled(fixedRate = 10000)  // 10 秒
    public void heartbeat() {
        log.info("系統心跳檢查");
        // 系統健康檢查邏輯
    }
    
    // 初始延遲
    @Scheduled(fixedDelay = 30000, initialDelay = 60000)  // 1 分鐘後開始，然後每 30 秒執行
    public void cleanupTempFiles() {
        log.info("清理暫存檔案");
        // 清理邏輯
    }
    
    // Cron 表達式 - 每分鐘執行
    @Scheduled(cron = "0 * * * * *")
    public void everyMinute() {
        log.info("每分鐘執行的任務");
    }
    
    // Cron 表達式 - 每天凌晨 2 點執行
    @Scheduled(cron = "0 0 2 * * *")
    public void dailyReport() {
        log.info("產生每日報告");
        emailService.sendDailyReport();
    }
    
    // Cron 表達式 - 工作日上午 9 點執行
    @Scheduled(cron = "0 0 9 * * MON-FRI")
    public void workdayMorningTask() {
        log.info("工作日早晨任務");
    }
    
    // Cron 表達式 - 每月最後一天執行
    @Scheduled(cron = "0 0 0 L * *")
    public void monthlyTask() {
        log.info("月末任務");
    }
    
    // 使用配置屬性
    @Scheduled(cron = "${app.cleanup.cron:0 0 3 * * *}")  // 預設每天凌晨 3 點
    public void configuredTask() {
        log.info("可配置的排程任務");
    }
    
    // 條件性排程
    @Scheduled(fixedDelay = 60000)
    @ConditionalOnProperty(name = "app.monitoring.enabled", havingValue = "true")
    public void monitoringTask() {
        log.info("監控任務");
    }
}
```

#### Cron 表達式詳解
```java
/**
 * Cron 表達式格式：秒 分 時 日 月 週
 * 
 * 欄位說明：
 * - 秒：0-59
 * - 分：0-59  
 * - 時：0-23
 * - 日：1-31
 * - 月：1-12 或 JAN-DEC
 * - 週：0-7 或 SUN-SAT (0 和 7 都代表週日)
 * 
 * 特殊字符：
 * * : 匹配任意值
 * ? : 只能用在日和週，表示不指定值
 * - : 表示範圍 (例如：1-5)
 * , : 表示列舉 (例如：1,3,5)
 * / : 表示增量 (例如：0/15 表示從 0 開始每 15 分鐘)
 * L : 表示最後 (例如：L 在日欄位表示該月最後一天)
 * W : 表示工作日 (例如：15W 表示距離 15 號最近的工作日)
 * # : 表示第幾個週幾 (例如：6#3 表示第三個週五)
 */

@Component
public class CronExamples {
    
    @Scheduled(cron = "0 0 * * * *")        // 每小時整點執行
    public void hourly() {}
    
    @Scheduled(cron = "*/10 * * * * *")      // 每 10 秒執行
    public void every10Seconds() {}
    
    @Scheduled(cron = "0 0 8-18 * * *")     // 每天 8-18 點整點執行
    public void businessHours() {}
    
    @Scheduled(cron = "0 0/30 8-18 * * *")  // 每天 8-18 點每半小時執行
    public void businessHalfHour() {}
    
    @Scheduled(cron = "0 0 9-17 * * MON-FRI") // 工作日 9-17 點整點執行
    public void workingHours() {}
    
    @Scheduled(cron = "0 0 0 25 12 ?")      // 每年聖誕節 00:00 執行
    public void christmas() {}
    
    @Scheduled(cron = "0 0 0 L * *")        // 每月最後一天 00:00 執行
    public void lastDayOfMonth() {}
    
    @Scheduled(cron = "0 0 0 LW * *")       // 每月最後一個工作日 00:00 執行
    public void lastWorkdayOfMonth() {}
    
    @Scheduled(cron = "0 0 0 * * 1#1")      // 每月第一個週一 00:00 執行
    public void firstMondayOfMonth() {}
}
```

### 2. 非同步處理註解

#### @Async 和 @EnableAsync
```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-task-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
    
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> {
            log.error("非同步方法 {} 執行異常", method.getName(), ex);
        };
    }
}

@Service
@Slf4j
public class NotificationService {
    
    // 簡單非同步方法
    @Async
    public void sendEmail(String to, String subject, String content) {
        log.info("發送郵件到 {}", to);
        // 模擬郵件發送
        try {
            Thread.sleep(2000);
            log.info("郵件發送完成");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
    
    // 返回 CompletableFuture
    @Async
    public CompletableFuture<String> sendSms(String phone, String message) {
        log.info("發送簡訊到 {}", phone);
        try {
            Thread.sleep(1000);
            return CompletableFuture.completedFuture("簡訊發送成功");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return CompletableFuture.failedFuture(e);
        }
    }
    
    // 指定執行器
    @Async("taskExecutor")
    public CompletableFuture<Boolean> processLargeFile(String filePath) {
        log.info("開始處理大檔案：{}", filePath);
        try {
            // 模擬檔案處理
            Thread.sleep(5000);
            log.info("檔案處理完成：{}", filePath);
            return CompletableFuture.completedFuture(true);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return CompletableFuture.failedFuture(e);
        }
    }
    
    // 批量非同步處理
    public CompletableFuture<Void> sendBulkNotifications(List<User> users, String message) {
        List<CompletableFuture<Void>> futures = users.stream()
            .map(user -> sendNotificationAsync(user, message))
            .collect(Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }
    
    @Async
    private CompletableFuture<Void> sendNotificationAsync(User user, String message) {
        // 發送通知邏輯
        return CompletableFuture.completedFuture(null);
    }
}
```

## Spring Boot 特定註解

### 1. 自動配置註解

#### @SpringBootApplication 分解
```java
// @SpringBootApplication 等同於以下三個註解的組合：
// @Configuration + @EnableAutoConfiguration + @ComponentScan

@SpringBootApplication
// 等同於：
// @Configuration
// @EnableAutoConfiguration  
// @ComponentScan(excludeFilters = { @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
//     @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class) })
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// 自訂掃描配置
@SpringBootApplication(
    scanBasePackages = {"com.example.app", "com.example.shared"},
    exclude = {DataSourceAutoConfiguration.class}  // 排除特定自動配置
)
public class CustomApplication {
    public static void main(String[] args) {
        SpringApplication.run(CustomApplication.class, args);
    }
}
```

#### 條件註解
```java
@Configuration
public class ConditionalConfiguration {
    
    // 當類別存在時
    @Bean
    @ConditionalOnClass(RedisTemplate.class)
    public RedisService redisService() {
        return new RedisService();
    }
    
    // 當類別不存在時
    @Bean
    @ConditionalOnMissingClass("com.example.CustomService")
    public DefaultService defaultService() {
        return new DefaultService();
    }
    
    // 當 Bean 存在時
    @Bean
    @ConditionalOnBean(DataSource.class)
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
    
    // 當 Bean 不存在時
    @Bean
    @ConditionalOnMissingBean(EmailService.class)
    public EmailService mockEmailService() {
        return new MockEmailService();
    }
    
    // 當屬性存在且符合條件時
    @Bean
    @ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true", matchIfMissing = false)
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager();
    }
    
    // 當 Web 應用程式時
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    public WebMvcConfigurer webMvcConfigurer() {
        return new CustomWebMvcConfigurer();
    }
    
    // 當非 Web 應用程式時
    @Bean
    @ConditionalOnNotWebApplication
    public CommandLineRunner commandLineRunner() {
        return args -> System.out.println("Non-web application started");
    }
    
    // 當特定 Profile 啟用時
    @Bean
    @Profile("development")
    public DataSource devDataSource() {
        return new H2DataSource();
    }
    
    @Bean
    @Profile("production")
    public DataSource prodDataSource() {
        return new MySQLDataSource();
    }
    
    // 自訂條件
    @Bean
    @ConditionalOnCustomCondition
    public CustomService customService() {
        return new CustomService();
    }
}

// 自訂條件實作
public class CustomCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        // 自訂條件邏輯
        String osName = context.getEnvironment().getProperty("os.name");
        return osName != null && osName.toLowerCase().contains("windows");
    }
}

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Conditional(CustomCondition.class)
public @interface ConditionalOnCustomCondition {
}
```

### 2. 配置屬性註解

#### @ConfigurationProperties
```java
@ConfigurationProperties(prefix = "app")
@Component
@Validated
@Data
public class AppProperties {
    
    @NotBlank
    private String name;
    
    @NotBlank
    private String version;
    
    @Valid
    private Database database = new Database();
    
    @Valid
    private Cache cache = new Cache();
    
    private List<String> allowedOrigins = new ArrayList<>();
    
    private Map<String, String> headers = new HashMap<>();
    
    @Data
    public static class Database {
        @NotBlank
        private String url;
        
        @NotBlank
        private String username;
        
        @NotBlank
        private String password;
        
        @Min(1)
        @Max(100)
        private int maxConnections = 10;
        
        @DurationMin(seconds = 1)
        @DurationMax(minutes = 5)
        private Duration timeout = Duration.ofSeconds(30);
    }
    
    @Data
    public static class Cache {
        private boolean enabled = true;
        
        @Positive
        private int maxSize = 1000;
        
        @DurationMin(minutes = 1)
        private Duration ttl = Duration.ofMinutes(10);
        
        private CacheType type = CacheType.MEMORY;
    }
    
    public enum CacheType {
        MEMORY, REDIS, HAZELCAST
    }
}

// 使用配置
@Service
@RequiredArgsConstructor
public class AppService {
    
    private final AppProperties appProperties;
    
    public void printConfig() {
        System.out.println("App Name: " + appProperties.getName());
        System.out.println("Database URL: " + appProperties.getDatabase().getUrl());
        System.out.println("Cache Enabled: " + appProperties.getCache().isEnabled());
    }
}
```

## 快取註解

### @EnableCaching 和快取操作
```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setAllowNullValues(false);
        return cacheManager;
    }
}

@Service
@Slf4j
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    // 快取結果
    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        log.info("從資料庫載入使用者：{}", id);
        return userRepository.findById(id).orElse(null);
    }
    
    // 條件快取
    @Cacheable(value = "users", key = "#email", condition = "#email.length() > 5")
    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
    
    // 快取多個值
    @Cacheable(value = "userProfiles", key = "#user.id", unless = "#result.isEmpty()")
    public List<UserProfile> getUserProfiles(User user) {
        return userProfileRepository.findByUserId(user.getId());
    }
    
    // 更新快取
    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) {
        log.info("更新使用者並刷新快取：{}", user.getId());
        return userRepository.save(user);
    }
    
    // 清除快取
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        log.info("刪除使用者並清除快取：{}", id);
        userRepository.deleteById(id);
    }
    
    // 清除所有快取
    @CacheEvict(value = "users", allEntries = true)
    public void clearUserCache() {
        log.info("清除所有使用者快取");
    }
    
    // 組合快取操作
    @Caching(
        cacheable = @Cacheable(value = "users", key = "#id"),
        evict = @CacheEvict(value = "userStats", key = "#id")
    )
    public User findAndUpdateStats(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            updateUserStats(user);
        }
        return user;
    }
    
    // 自訂快取鍵生成器
    @Cacheable(value = "userSearch", keyGenerator = "customKeyGenerator")
    public List<User> searchUsers(UserSearchCriteria criteria) {
        return userRepository.findByCriteria(criteria);
    }
}

@Component("customKeyGenerator")
public class CustomKeyGenerator implements KeyGenerator {
    @Override
    public Object generate(Object target, Method method, Object... params) {
        return method.getName() + "_" + Arrays.toString(params);
    }
}
```

## 測試註解

### Spring Boot 測試註解
```java
// 完整的 Spring Boot 測試
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class IntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserService userService;
    
    @Test
    void testCreateUser() {
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");
        ResponseEntity<User> response = restTemplate.postForEntity("/api/users", request, User.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getName()).isEqualTo("John");
    }
}

// Web 層測試
@WebMvcTest(UserController.class)
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @Test
    void testGetUser() throws Exception {
        User user = new User(1L, "John", "john@example.com");
        when(userService.findById(1L)).thenReturn(user);
        
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("John"))
            .andExpect(jsonPath("$.email").value("john@example.com"));
    }
}

// 資料層測試
@DataJpaTest
class UserRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void testFindByEmail() {
        // Given
        User user = new User("John", "john@example.com");
        entityManager.persistAndFlush(user);
        
        // When
        Optional<User> found = userRepository.findByEmail("john@example.com");
        
        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("John");
    }
}

// JSON 序列化測試
@JsonTest
class UserJsonTest {
    
    @Autowired
    private JacksonTester<User> json;
    
    @Test
    void testSerialize() throws Exception {
        User user = new User(1L, "John", "john@example.com");
        
        assertThat(json.write(user)).isEqualToJson("user.json");
        assertThat(json.write(user)).hasJsonPathStringValue("@.name");
        assertThat(json.write(user)).extractingJsonPathStringValue("@.name").isEqualTo("John");
    }
    
    @Test
    void testDeserialize() throws Exception {
        String content = """
            {
                "id": 1,
                "name": "John",
                "email": "john@example.com"
            }
            """;
        
        assertThat(json.parse(content)).usingRecursiveComparison()
            .isEqualTo(new User(1L, "John", "john@example.com"));
    }
}
```

## 事件處理註解

### @EventListener 和 @TransactionalEventListener
```java
// 事件定義
public class OrderCreatedEvent {
    private final Order order;
    private final LocalDateTime timestamp;
    
    public OrderCreatedEvent(Order order) {
        this.order = order;
        this.timestamp = LocalDateTime.now();
    }
    
    // getters...
}

// 事件發布
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = new Order(request);
        order = orderRepository.save(order);
        
        // 發布事件
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
        
        return order;
    }
}

// 事件監聽
@Component
@Slf4j
public class OrderEventListener {
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private InventoryService inventoryService;
    
    // 基本事件監聽
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("訂單創建事件：{}", event.getOrder().getId());
    }
    
    // 條件事件監聽
    @EventListener(condition = "#event.order.amount > 1000")
    public void handleHighValueOrder(OrderCreatedEvent event) {
        log.info("高價值訂單創建：{}", event.getOrder().getId());
        // 特殊處理邏輯
    }
    
    // 非同步事件處理
    @EventListener
    @Async
    public void sendOrderConfirmationEmail(OrderCreatedEvent event) {
        log.info("發送訂單確認郵件：{}", event.getOrder().getId());
        emailService.sendOrderConfirmation(event.getOrder());
    }
    
    // 交易事件監聽（在交易提交後執行）
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void updateInventoryAfterOrderCreated(OrderCreatedEvent event) {
        log.info("交易提交後更新庫存：{}", event.getOrder().getId());
        inventoryService.updateStock(event.getOrder().getItems());
    }
    
    // 交易回滾時執行
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void handleOrderCreationRollback(OrderCreatedEvent event) {
        log.warn("訂單創建回滾：{}", event.getOrder().getId());
        // 回滾處理邏輯
    }
    
    // 監聽多種事件類型
    @EventListener({OrderCreatedEvent.class, OrderUpdatedEvent.class})
    public void handleOrderEvents(Object event) {
        log.info("處理訂單事件：{}", event.getClass().getSimpleName());
    }
}
```

## 總結

Spring Framework 的註解系統為開發者提供了強大且靈活的配置方式。透過合理使用這些註解，可以大幅簡化配置工作並提升開發效率。

### 最佳實踐建議

1. **優先使用註解配置**：相比 XML 配置，註解更直觀且易於維護
2. **組合使用註解**：善用 `@SpringBootApplication` 等組合註解
3. **適當使用條件註解**：根據環境動態配置 Bean
4. **驗證配置屬性**：使用 `@Validated` 確保配置正確性
5. **合理使用快取**：在適當的地方使用快取提升效能
6. **測試覆蓋**：使用專門的測試註解進行各層測試
7. **事件驅動設計**：使用事件機制降低組件耦合度

### 注意事項

- **註解過載**：避免在單一類別或方法上使用過多註解
- **配置外部化**：敏感配置應使用外部屬性檔案
- **效能考量**：注意代理模式可能帶來的效能影響
- **測試友善**：設計時考慮測試的便利性

掌握這些註解的正確使用方式，將能大幅提升 Spring 應用程式的開發效率和程式碼品質。

## 參考資料

- [Spring Framework Reference Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/)
- [Spring Boot Reference Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
- [Bean Validation Specification](https://beanvalidation.org/2.0/spec/)
- [Cron Expression Generator](https://www.cronmaker.com/)