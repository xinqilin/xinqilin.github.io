---
title: "代碼壞味道 (Code Smells) 完整識別與重構指南：軟體品質改善最佳實踐"
author: Bill.Lin
date: 2022-03-17T22:50:11+08:00
draft: false
tags: ["Code Smells", "Code Quality", "Refactoring", "Clean Code", "Software Architecture", "Best Practices", "Technical Debt", "Software Maintenance", "Code Review", "Design Patterns", "SOLID Principles", "Java", "Enterprise Development"]
description: "深入探討代碼壞味道的完整識別與重構指南，包含常見壞味道類型、識別方法、重構技巧、預防策略與企業級代碼品質改善最佳實踐"
categories: ["Architecture"]
disableComments: false
aliases:
  - /post/Architecture/BadSmell/

---

## 代碼壞味道 (Code Smells) 完整識別與重構指南

### 概述

代碼壞味道是指代碼中存在的設計缺陷和結構問題，雖然不會導致程序功能錯誤，但會影響代碼的可讀性、可維護性和可擴展性。本文將深入探討各種代碼壞味道的識別方法、重構技巧和預防策略。

### 經典四大軟體設計問題

#### 1. Rigidity (僵化性) - 難以變更

**問題描述：**
系統中存在過多的相依性，導致任何小的變更都需要修改大量相關代碼。

**症狀：**
- 修改一個小功能需要改動多個模組
- 開發人員害怕進行代碼變更
- 估算工作量困難，因為變更範圍難以預測

**壞味道示例：**
```java
// 僵化的訂單處理系統
public class OrderService {
    private DatabaseConnection dbConnection;
    private EmailService emailService;
    private InventoryService inventoryService;
    private PaymentService paymentService;
    private LoggingService loggingService;
    
    public void processOrder(Order order) {
        // 直接依賴具體實現，難以變更
        dbConnection.connect("jdbc:mysql://localhost:3306/orders");
        
        // 硬編碼的業務邏輯
        if (order.getType().equals("PREMIUM")) {
            order.setDiscount(0.1);
        } else if (order.getType().equals("STANDARD")) {
            order.setDiscount(0.05);
        }
        
        // 緊密耦合的操作順序
        inventoryService.reserveItems(order.getItems());
        paymentService.processPayment(order.getPayment());
        dbConnection.saveOrder(order);
        emailService.sendConfirmationEmail(order.getCustomer());
        loggingService.log("Order processed: " + order.getId());
    }
}
```

**重構解決方案：**
```java
// 使用依賴注入和策略模式解決僵化性
public class OrderService {
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final AuditService auditService;
    private final DiscountCalculator discountCalculator;
    
    public OrderService(OrderRepository orderRepository,
                       NotificationService notificationService,
                       InventoryService inventoryService,
                       PaymentService paymentService,
                       AuditService auditService,
                       DiscountCalculator discountCalculator) {
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
        this.auditService = auditService;
        this.discountCalculator = discountCalculator;
    }
    
    public void processOrder(Order order) {
        // 使用策略模式計算折扣
        order.setDiscount(discountCalculator.calculateDiscount(order));
        
        // 解耦的操作流程
        inventoryService.reserveItems(order.getItems());
        paymentService.processPayment(order.getPayment());
        orderRepository.save(order);
        notificationService.sendNotification(order.getCustomer(), createConfirmationMessage(order));
        auditService.logOrderProcessed(order);
    }
    
    private String createConfirmationMessage(Order order) {
        return "訂單 " + order.getId() + " 已成功處理";
    }
}

// 策略模式實現折扣計算
public interface DiscountCalculator {
    double calculateDiscount(Order order);
}

@Component
public class CustomerTypeDiscountCalculator implements DiscountCalculator {
    private final Map<String, Double> discountRates;
    
    public CustomerTypeDiscountCalculator() {
        this.discountRates = Map.of(
            "PREMIUM", 0.1,
            "STANDARD", 0.05,
            "BASIC", 0.0
        );
    }
    
    @Override
    public double calculateDiscount(Order order) {
        return discountRates.getOrDefault(order.getCustomerType(), 0.0);
    }
}
```

#### 2. Fragility (脆弱性) - 容易壞掉

**問題描述：**
系統中一個地方的變更會在意外的地方引起問題，特別是在邏輯上不相關的部分。

**症狀：**
- 修復一個bug會引起其他地方的問題
- 測試經常失敗，且失敗原因不明顯
- 生產環境經常出現意外問題

**壞味道示例：**
```java
// 脆弱的用戶管理系統
public class UserManager {
    private static List<User> users = new ArrayList<>();
    private static int nextId = 1;
    
    public static User createUser(String name, String email) {
        User user = new User(nextId++, name, email);
        users.add(user);
        
        // 脆弱的副作用：修改全局狀態
        System.setProperty("last.user.created", user.getName());
        
        // 脆弱的依賴：直接操作文件系統
        try (FileWriter writer = new FileWriter("users.log", true)) {
            writer.write(user.toString() + "\n");
        } catch (IOException e) {
            // 靜默處理異常，隱藏問題
        }
        
        return user;
    }
    
    public static void deleteUser(int id) {
        users.removeIf(user -> user.getId() == id);
        
        // 脆弱的邏輯：假設總是存在用戶
        User lastUser = users.get(users.size() - 1);
        System.setProperty("last.user.created", lastUser.getName());
    }
    
    public static List<User> getUsers() {
        // 返回可變引用，允許外部修改
        return users;
    }
}
```

**重構解決方案：**
```java
// 使用封裝和不可變性解決脆弱性
@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserAuditService auditService;
    private final EventPublisher eventPublisher;
    
    public UserService(UserRepository userRepository,
                      UserAuditService auditService,
                      EventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public User createUser(CreateUserRequest request) {
        validateUserRequest(request);
        
        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .createdAt(LocalDateTime.now())
            .build();
        
        User savedUser = userRepository.save(user);
        
        // 使用事件發布解耦副作用
        eventPublisher.publish(new UserCreatedEvent(savedUser));
        
        return savedUser;
    }
    
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + id));
        
        userRepository.delete(user);
        eventPublisher.publish(new UserDeletedEvent(user));
    }
    
    public List<User> getUsers() {
        // 返回不可變副本
        return Collections.unmodifiableList(userRepository.findAll());
    }
    
    private void validateUserRequest(CreateUserRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("用戶名不能為空");
        }
        if (request.getEmail() == null || !isValidEmail(request.getEmail())) {
            throw new ValidationException("無效的電子郵件地址");
        }
    }
    
    private boolean isValidEmail(String email) {
        return email.contains("@") && email.contains(".");
    }
}

// 事件處理器處理副作用
@Component
public class UserEventHandler {
    private final UserAuditService auditService;
    
    public UserEventHandler(UserAuditService auditService) {
        this.auditService = auditService;
    }
    
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        auditService.logUserCreated(event.getUser());
    }
    
    @EventListener
    public void handleUserDeleted(UserDeletedEvent event) {
        auditService.logUserDeleted(event.getUser());
    }
}
```

#### 3. Immobility (不可移植性) - 難以複用

**問題描述：**
系統中的代碼與其環境過度耦合，難以在其他項目或模組中重複使用。

**症狀：**
- 相似的代碼在多個地方重複出現
- 提取共用邏輯的成本很高
- 代碼與具體實現細節綁定

**壞味道示例：**
```java
// 不可移植的報告生成器
public class SalesReportGenerator {
    public void generateDailySalesReport() {
        // 硬編碼的數據庫查詢
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/sales_db", "admin", "password");
        
        PreparedStatement stmt = conn.prepareStatement(
            "SELECT product_id, SUM(quantity), SUM(amount) FROM orders WHERE date = ?");
        stmt.setDate(1, Date.valueOf(LocalDate.now()));
        
        ResultSet rs = stmt.executeQuery();
        
        // 硬編碼的輸出格式
        System.out.println("=== 每日銷售報告 ===");
        while (rs.next()) {
            System.out.printf("產品ID: %d, 數量: %d, 金額: %.2f%n",
                rs.getInt(1), rs.getInt(2), rs.getDouble(3));
        }
        
        // 硬編碼的文件保存
        try (FileWriter writer = new FileWriter("/tmp/daily_sales.txt")) {
            writer.write("報告生成時間: " + LocalDateTime.now());
        }
    }
    
    public void generateWeeklySalesReport() {
        // 大量重複的代碼
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/sales_db", "admin", "password");
        
        PreparedStatement stmt = conn.prepareStatement(
            "SELECT product_id, SUM(quantity), SUM(amount) FROM orders WHERE date >= ?");
        stmt.setDate(1, Date.valueOf(LocalDate.now().minusDays(7)));
        
        ResultSet rs = stmt.executeQuery();
        
        System.out.println("=== 每週銷售報告 ===");
        while (rs.next()) {
            System.out.printf("產品ID: %d, 數量: %d, 金額: %.2f%n",
                rs.getInt(1), rs.getInt(2), rs.getDouble(3));
        }
    }
}
```

**重構解決方案：**
```java
// 可複用的報告生成框架
public interface ReportDataSource {
    List<SalesData> getSalesData(DateRange dateRange);
}

public interface ReportFormatter {
    String format(List<SalesData> data, ReportMetadata metadata);
}

public interface ReportOutput {
    void output(String formattedReport, ReportMetadata metadata);
}

@Service
public class ReportService {
    private final ReportDataSource dataSource;
    private final ReportFormatter formatter;
    private final List<ReportOutput> outputs;
    
    public ReportService(ReportDataSource dataSource,
                        ReportFormatter formatter,
                        List<ReportOutput> outputs) {
        this.dataSource = dataSource;
        this.formatter = formatter;
        this.outputs = outputs;
    }
    
    public void generateReport(ReportRequest request) {
        List<SalesData> data = dataSource.getSalesData(request.getDateRange());
        
        ReportMetadata metadata = ReportMetadata.builder()
            .title(request.getTitle())
            .generatedAt(LocalDateTime.now())
            .dateRange(request.getDateRange())
            .build();
        
        String formattedReport = formatter.format(data, metadata);
        
        outputs.forEach(output -> output.output(formattedReport, metadata));
    }
}

// 具體實現
@Component
public class DatabaseReportDataSource implements ReportDataSource {
    private final SalesRepository salesRepository;
    
    public DatabaseReportDataSource(SalesRepository salesRepository) {
        this.salesRepository = salesRepository;
    }
    
    @Override
    public List<SalesData> getSalesData(DateRange dateRange) {
        return salesRepository.findSalesByDateRange(
            dateRange.getStartDate(), 
            dateRange.getEndDate()
        );
    }
}

@Component
public class TextReportFormatter implements ReportFormatter {
    @Override
    public String format(List<SalesData> data, ReportMetadata metadata) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== ").append(metadata.getTitle()).append(" ===\n");
        sb.append("生成時間: ").append(metadata.getGeneratedAt()).append("\n");
        sb.append("報告期間: ").append(metadata.getDateRange()).append("\n\n");
        
        data.forEach(item -> 
            sb.append(String.format("產品ID: %d, 數量: %d, 金額: %.2f%n",
                item.getProductId(), item.getQuantity(), item.getAmount()))
        );
        
        return sb.toString();
    }
}

@Component
public class ConsoleReportOutput implements ReportOutput {
    @Override
    public void output(String formattedReport, ReportMetadata metadata) {
        System.out.println(formattedReport);
    }
}

@Component
public class FileReportOutput implements ReportOutput {
    @Value("${report.output.directory:/tmp}")
    private String outputDirectory;
    
    @Override
    public void output(String formattedReport, ReportMetadata metadata) {
        String filename = String.format("%s_%s.txt", 
            metadata.getTitle().toLowerCase().replace(" ", "_"),
            metadata.getGeneratedAt().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
        );
        
        Path filePath = Paths.get(outputDirectory, filename);
        
        try {
            Files.write(filePath, formattedReport.getBytes());
        } catch (IOException e) {
            throw new ReportOutputException("無法寫入報告文件", e);
        }
    }
}
```

#### 4. Viscosity (黏性) - 難以正確修改

**問題描述：**
正確的修改比錯誤的修改更困難，開發人員傾向於使用臨時解決方案而非正確的設計。

**症狀：**
- 開發人員選擇快速修復而非正確解決方案
- 系統中充滿了臨時解決方案和"hack"
- 正確的修改需要很長時間或很多步驟

**壞味道示例：**
```java
// 高黏性的配置管理系統
public class ConfigManager {
    private static Properties props = new Properties();
    private static boolean initialized = false;
    
    static {
        try {
            props.load(new FileInputStream("config.properties"));
            initialized = true;
        } catch (IOException e) {
            // 臨時解決方案：使用硬編碼默認值
            props.setProperty("db.host", "localhost");
            props.setProperty("db.port", "3306");
            props.setProperty("db.timeout", "30");
            initialized = true;
        }
    }
    
    public static String getProperty(String key) {
        if (!initialized) {
            throw new RuntimeException("配置未初始化");
        }
        return props.getProperty(key);
    }
    
    public static void setProperty(String key, String value) {
        // 臨時解決方案：運行時修改配置
        props.setProperty(key, value);
        
        // 更多臨時解決方案：立即保存到文件
        try (FileOutputStream out = new FileOutputStream("config.properties")) {
            props.store(out, "Updated at " + new Date());
        } catch (IOException e) {
            // 忽略錯誤，繼續執行
        }
    }
    
    // 臨時解決方案：添加專門的方法來處理特殊情況
    public static int getDatabaseTimeout() {
        String timeout = getProperty("db.timeout");
        try {
            return Integer.parseInt(timeout);
        } catch (NumberFormatException e) {
            // 又一個臨時解決方案
            return 30;
        }
    }
}
```

**重構解決方案：**
```java
// 低黏性的配置管理系統
public interface ConfigurationSource {
    Optional<String> getProperty(String key);
    Map<String, String> getAllProperties();
    void reload();
}

public interface ConfigurationValidator {
    void validate(Map<String, String> properties) throws ValidationException;
}

@Component
public class ConfigurationService {
    private final List<ConfigurationSource> sources;
    private final ConfigurationValidator validator;
    private final ConfigurationCache cache;
    
    public ConfigurationService(List<ConfigurationSource> sources,
                               ConfigurationValidator validator,
                               ConfigurationCache cache) {
        this.sources = sources;
        this.validator = validator;
        this.cache = cache;
    }
    
    public <T> T getProperty(String key, Class<T> type, T defaultValue) {
        return cache.get(key, type)
            .orElseGet(() -> loadProperty(key, type, defaultValue));
    }
    
    public <T> T getRequiredProperty(String key, Class<T> type) {
        return getProperty(key, type, null)
            .orElseThrow(() -> new ConfigurationException("Required property not found: " + key));
    }
    
    private <T> T loadProperty(String key, Class<T> type, T defaultValue) {
        for (ConfigurationSource source : sources) {
            Optional<String> value = source.getProperty(key);
            if (value.isPresent()) {
                T convertedValue = convertValue(value.get(), type);
                cache.put(key, convertedValue);
                return convertedValue;
            }
        }
        return defaultValue;
    }
    
    @SuppressWarnings("unchecked")
    private <T> T convertValue(String value, Class<T> type) {
        if (type == String.class) {
            return (T) value;
        } else if (type == Integer.class) {
            return (T) Integer.valueOf(value);
        } else if (type == Boolean.class) {
            return (T) Boolean.valueOf(value);
        } else if (type == Duration.class) {
            return (T) Duration.parse(value);
        }
        throw new ConfigurationException("Unsupported type: " + type);
    }
    
    public void reload() {
        sources.forEach(ConfigurationSource::reload);
        cache.clear();
        
        // 重新加載後驗證配置
        Map<String, String> allProperties = getAllProperties();
        validator.validate(allProperties);
    }
    
    private Map<String, String> getAllProperties() {
        Map<String, String> allProperties = new HashMap<>();
        sources.forEach(source -> allProperties.putAll(source.getAllProperties()));
        return allProperties;
    }
}

// 具體實現
@Component
@Order(1)
public class FileConfigurationSource implements ConfigurationSource {
    private final String configFile;
    private Properties properties;
    
    public FileConfigurationSource(@Value("${config.file:config.properties}") String configFile) {
        this.configFile = configFile;
        this.properties = new Properties();
        reload();
    }
    
    @Override
    public Optional<String> getProperty(String key) {
        return Optional.ofNullable(properties.getProperty(key));
    }
    
    @Override
    public Map<String, String> getAllProperties() {
        return properties.entrySet().stream()
            .collect(Collectors.toMap(
                e -> e.getKey().toString(),
                e -> e.getValue().toString()
            ));
    }
    
    @Override
    public void reload() {
        try (InputStream is = new FileInputStream(configFile)) {
            properties.load(is);
        } catch (IOException e) {
            throw new ConfigurationException("Failed to load configuration from " + configFile, e);
        }
    }
}

@Component
@Order(2)
public class EnvironmentConfigurationSource implements ConfigurationSource {
    @Override
    public Optional<String> getProperty(String key) {
        return Optional.ofNullable(System.getenv(key.toUpperCase().replace('.', '_')));
    }
    
    @Override
    public Map<String, String> getAllProperties() {
        return System.getenv();
    }
    
    @Override
    public void reload() {
        // 環境變量不需要重新加載
    }
}
```

### 常見代碼壞味道類型與重構技巧

#### 1. Long Method (冗長方法)

**問題描述：**
方法過長，難以理解和維護。

**識別標準：**
- 方法超過20-30行
- 方法有多個職責
- 方法有多層嵌套

**重構技巧：**
```java
// 壞味道：冗長的訂單處理方法
public class OrderProcessor {
    public void processOrder(Order order) {
        // 驗證訂單
        if (order == null) {
            throw new IllegalArgumentException("訂單不能為空");
        }
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new IllegalArgumentException("訂單項目不能為空");
        }
        for (OrderItem item : order.getItems()) {
            if (item.getQuantity() <= 0) {
                throw new IllegalArgumentException("訂單項目數量必須大於0");
            }
            if (item.getPrice() <= 0) {
                throw new IllegalArgumentException("訂單項目價格必須大於0");
            }
        }
        
        // 計算總金額
        double totalAmount = 0;
        for (OrderItem item : order.getItems()) {
            totalAmount += item.getQuantity() * item.getPrice();
        }
        
        // 計算折扣
        double discount = 0;
        if (order.getCustomer().getType() == CustomerType.VIP) {
            discount = totalAmount * 0.1;
        } else if (order.getCustomer().getType() == CustomerType.PREMIUM) {
            discount = totalAmount * 0.05;
        }
        
        // 計算稅費
        double tax = (totalAmount - discount) * 0.08;
        
        // 設置訂單金額
        order.setSubtotal(totalAmount);
        order.setDiscount(discount);
        order.setTax(tax);
        order.setTotal(totalAmount - discount + tax);
        
        // 保存訂單
        Connection conn = null;
        try {
            conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/orders");
            PreparedStatement stmt = conn.prepareStatement(
                "INSERT INTO orders (customer_id, subtotal, discount, tax, total) VALUES (?, ?, ?, ?, ?)");
            stmt.setLong(1, order.getCustomer().getId());
            stmt.setDouble(2, order.getSubtotal());
            stmt.setDouble(3, order.getDiscount());
            stmt.setDouble(4, order.getTax());
            stmt.setDouble(5, order.getTotal());
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("保存訂單失敗", e);
        } finally {
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException e) {
                    // 忽略
                }
            }
        }
        
        // 發送確認郵件
        try {
            String subject = "訂單確認 - " + order.getId();
            String body = "您的訂單已成功處理。訂單總金額: " + order.getTotal();
            sendEmail(order.getCustomer().getEmail(), subject, body);
        } catch (Exception e) {
            // 記錄錯誤但不影響訂單處理
            System.err.println("發送確認郵件失敗: " + e.getMessage());
        }
    }
}
```

**重構後：**
```java
// 重構後：職責分離，方法簡潔
@Service
public class OrderProcessor {
    private final OrderValidator orderValidator;
    private final OrderCalculator orderCalculator;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    
    public OrderProcessor(OrderValidator orderValidator,
                         OrderCalculator orderCalculator,
                         OrderRepository orderRepository,
                         NotificationService notificationService) {
        this.orderValidator = orderValidator;
        this.orderCalculator = orderCalculator;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }
    
    @Transactional
    public void processOrder(Order order) {
        orderValidator.validate(order);
        orderCalculator.calculateAmounts(order);
        orderRepository.save(order);
        notificationService.sendOrderConfirmation(order);
    }
}

@Component
public class OrderValidator {
    public void validate(Order order) {
        validateOrderNotNull(order);
        validateOrderItems(order.getItems());
    }
    
    private void validateOrderNotNull(Order order) {
        if (order == null) {
            throw new IllegalArgumentException("訂單不能為空");
        }
    }
    
    private void validateOrderItems(List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("訂單項目不能為空");
        }
        
        items.forEach(this::validateOrderItem);
    }
    
    private void validateOrderItem(OrderItem item) {
        if (item.getQuantity() <= 0) {
            throw new IllegalArgumentException("訂單項目數量必須大於0");
        }
        if (item.getPrice() <= 0) {
            throw new IllegalArgumentException("訂單項目價格必須大於0");
        }
    }
}

@Component
public class OrderCalculator {
    private final DiscountService discountService;
    private final TaxService taxService;
    
    public OrderCalculator(DiscountService discountService, TaxService taxService) {
        this.discountService = discountService;
        this.taxService = taxService;
    }
    
    public void calculateAmounts(Order order) {
        double subtotal = calculateSubtotal(order.getItems());
        double discount = discountService.calculateDiscount(order);
        double tax = taxService.calculateTax(subtotal - discount);
        double total = subtotal - discount + tax;
        
        order.setSubtotal(subtotal);
        order.setDiscount(discount);
        order.setTax(tax);
        order.setTotal(total);
    }
    
    private double calculateSubtotal(List<OrderItem> items) {
        return items.stream()
            .mapToDouble(item -> item.getQuantity() * item.getPrice())
            .sum();
    }
}
```

#### 2. Large Class (巨大類)

**問題描述：**
類過大，承擔過多職責。

**識別標準：**
- 類超過200-300行
- 類有太多實例變量
- 類有太多方法

**重構技巧：**
```java
// 壞味道：巨大的用戶管理類
public class UserManager {
    private Connection dbConnection;
    private EmailService emailService;
    private Logger logger;
    private PasswordEncoder passwordEncoder;
    private UserValidator userValidator;
    private UserCache userCache;
    private SecurityService securityService;
    private AuditService auditService;
    private NotificationService notificationService;
    
    // 用戶CRUD操作
    public User createUser(UserRequest request) { /* ... */ }
    public User updateUser(Long id, UserRequest request) { /* ... */ }
    public void deleteUser(Long id) { /* ... */ }
    public User findUserById(Long id) { /* ... */ }
    public List<User> findAllUsers() { /* ... */ }
    public List<User> findUsersByEmail(String email) { /* ... */ }
    
    // 用戶認證
    public boolean authenticate(String username, String password) { /* ... */ }
    public String generateToken(User user) { /* ... */ }
    public boolean validateToken(String token) { /* ... */ }
    public void logout(String token) { /* ... */ }
    
    // 密碼管理
    public void changePassword(Long userId, String oldPassword, String newPassword) { /* ... */ }
    public void resetPassword(String email) { /* ... */ }
    public boolean isPasswordExpired(User user) { /* ... */ }
    
    // 用戶權限
    public void assignRole(Long userId, String role) { /* ... */ }
    public void removeRole(Long userId, String role) { /* ... */ }
    public Set<String> getUserRoles(Long userId) { /* ... */ }
    public boolean hasPermission(Long userId, String permission) { /* ... */ }
    
    // 用戶通知
    public void sendWelcomeEmail(User user) { /* ... */ }
    public void sendPasswordResetEmail(User user) { /* ... */ }
    public void sendAccountLockedNotification(User user) { /* ... */ }
    
    // 用戶統計
    public int getTotalUserCount() { /* ... */ }
    public int getActiveUserCount() { /* ... */ }
    public List<User> getRecentlyRegisteredUsers() { /* ... */ }
    
    // 用戶審計
    public void logUserActivity(Long userId, String activity) { /* ... */ }
    public List<AuditRecord> getUserAuditHistory(Long userId) { /* ... */ }
}
```

**重構後：**
```java
// 重構後：按職責分離為多個專門的類
@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserValidator userValidator;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;
    
    public UserService(UserRepository userRepository,
                      UserValidator userValidator,
                      UserMapper userMapper,
                      ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.userValidator = userValidator;
        this.userMapper = userMapper;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public User createUser(CreateUserRequest request) {
        userValidator.validate(request);
        
        User user = userMapper.toEntity(request);
        User savedUser = userRepository.save(user);
        
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser));
        
        return savedUser;
    }
    
    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User existingUser = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + id));
        
        userValidator.validate(request);
        userMapper.updateEntity(existingUser, request);
        
        User updatedUser = userRepository.save(existingUser);
        eventPublisher.publishEvent(new UserUpdatedEvent(updatedUser));
        
        return updatedUser;
    }
    
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + id));
        
        userRepository.delete(user);
        eventPublisher.publishEvent(new UserDeletedEvent(user));
    }
    
    public User findUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + id));
    }
    
    public List<User> findAllUsers() {
        return userRepository.findAll();
    }
    
    public List<User> findUsersByEmail(String email) {
        return userRepository.findByEmailContaining(email);
    }
}

@Service
public class UserAuthenticationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationEventPublisher eventPublisher;
    
    public UserAuthenticationService(UserRepository userRepository,
                                   PasswordEncoder passwordEncoder,
                                   JwtTokenProvider tokenProvider,
                                   AuthenticationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.eventPublisher = eventPublisher;
    }
    
    public AuthenticationResult authenticate(String username, String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new AuthenticationException("用戶名或密碼錯誤"));
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            eventPublisher.publishEvent(new AuthenticationFailedEvent(user));
            throw new AuthenticationException("用戶名或密碼錯誤");
        }
        
        String token = tokenProvider.generateToken(user);
        eventPublisher.publishEvent(new AuthenticationSuccessEvent(user));
        
        return AuthenticationResult.success(user, token);
    }
    
    public boolean validateToken(String token) {
        return tokenProvider.validateToken(token);
    }
    
    public void logout(String token) {
        tokenProvider.invalidateToken(token);
    }
}

@Service
public class UserPasswordService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordValidator passwordValidator;
    private final ApplicationEventPublisher eventPublisher;
    
    public UserPasswordService(UserRepository userRepository,
                              PasswordEncoder passwordEncoder,
                              PasswordValidator passwordValidator,
                              ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordValidator = passwordValidator;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + userId));
        
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new InvalidPasswordException("舊密碼不正確");
        }
        
        passwordValidator.validate(newPassword);
        
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        
        userRepository.save(user);
        eventPublisher.publishEvent(new PasswordChangedEvent(user));
    }
    
    @Transactional
    public void resetPassword(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("用戶不存在: " + email));
        
        String resetToken = generateResetToken();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().plusHours(24));
        
        userRepository.save(user);
        eventPublisher.publishEvent(new PasswordResetRequestedEvent(user, resetToken));
    }
    
    private String generateResetToken() {
        return UUID.randomUUID().toString();
    }
}
```

#### 3. Duplicate Code (重複代碼)

**問題描述：**
相同或相似的代碼在多個地方重複出現。

**重構技巧：**
```java
// 壞味道：重複的驗證邏輯
public class UserController {
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        // 重複的驗證邏輯
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ValidationException("電子郵件不能為空");
        }
        if (!request.getEmail().contains("@")) {
            throw new ValidationException("電子郵件格式不正確");
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new ValidationException("密碼長度至少8位");
        }
        
        // 業務邏輯
        User user = userService.createUser(request);
        return ResponseEntity.ok(user);
    }
    
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        // 重複的驗證邏輯
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ValidationException("電子郵件不能為空");
        }
        if (!request.getEmail().contains("@")) {
            throw new ValidationException("電子郵件格式不正確");
        }
        
        // 業務邏輯
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(user);
    }
}

public class AdminController {
    @PostMapping("/admin/users")
    public ResponseEntity<User> createAdminUser(@RequestBody CreateUserRequest request) {
        // 又一次重複的驗證邏輯
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ValidationException("電子郵件不能為空");
        }
        if (!request.getEmail().contains("@")) {
            throw new ValidationException("電子郵件格式不正確");
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new ValidationException("密碼長度至少8位");
        }
        
        // 業務邏輯
        User user = adminService.createAdminUser(request);
        return ResponseEntity.ok(user);
    }
}
```

**重構後：**
```java
// 重構後：提取共用驗證邏輯
@Component
public class UserRequestValidator {
    private final EmailValidator emailValidator;
    private final PasswordValidator passwordValidator;
    
    public UserRequestValidator(EmailValidator emailValidator, PasswordValidator passwordValidator) {
        this.emailValidator = emailValidator;
        this.passwordValidator = passwordValidator;
    }
    
    public void validate(CreateUserRequest request) {
        validateEmail(request.getEmail());
        validatePassword(request.getPassword());
        validateName(request.getName());
    }
    
    public void validate(UpdateUserRequest request) {
        validateEmail(request.getEmail());
        validateName(request.getName());
    }
    
    private void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ValidationException("電子郵件不能為空");
        }
        if (!emailValidator.isValid(email)) {
            throw new ValidationException("電子郵件格式不正確");
        }
    }
    
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new ValidationException("密碼長度至少8位");
        }
        if (!passwordValidator.isValid(password)) {
            throw new ValidationException("密碼強度不足");
        }
    }
    
    private void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("姓名不能為空");
        }
        if (name.length() > 50) {
            throw new ValidationException("姓名長度不能超過50個字符");
        }
    }
}

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService userService;
    private final UserRequestValidator validator;
    
    public UserController(UserService userService, UserRequestValidator validator) {
        this.userService = userService;
        this.validator = validator;
    }
    
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        validator.validate(request);
        User user = userService.createUser(request);
        return ResponseEntity.ok(user);
    }
    
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        validator.validate(request);
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(user);
    }
}

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final UserRequestValidator validator;
    
    public AdminController(AdminService adminService, UserRequestValidator validator) {
        this.adminService = adminService;
        this.validator = validator;
    }
    
    @PostMapping("/users")
    public ResponseEntity<User> createAdminUser(@RequestBody CreateUserRequest request) {
        validator.validate(request);
        User user = adminService.createAdminUser(request);
        return ResponseEntity.ok(user);
    }
}
```

### 代碼壞味道檢測工具

#### 1. SonarQube 整合

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.sonarsource.scanner.maven</groupId>
    <artifactId>sonar-maven-plugin</artifactId>
    <version>3.9.1.2184</version>
</plugin>

<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.7</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

#### 2. PMD 配置

```xml
<!-- pmd-ruleset.xml -->
<ruleset name="Custom PMD Rules" xmlns="http://pmd.sourceforge.net/ruleset/2.0.0">
    <rule ref="category/java/bestpractices.xml/AvoidReassigningParameters" />
    <rule ref="category/java/bestpractices.xml/SwitchStmtsShouldHaveDefault" />
    <rule ref="category/java/codestyle.xml/LongVariable" />
    <rule ref="category/java/design.xml/ExcessiveMethodLength">
        <properties>
            <property name="minimum" value="30" />
        </properties>
    </rule>
    <rule ref="category/java/design.xml/TooManyMethods">
        <properties>
            <property name="maxmethods" value="15" />
        </properties>
    </rule>
</ruleset>
```

#### 3. CheckStyle 配置

```xml
<!-- checkstyle.xml -->
<module name="Checker">
    <module name="TreeWalker">
        <module name="MethodLength">
            <property name="tokens" value="METHOD_DEF"/>
            <property name="max" value="30"/>
        </module>
        <module name="ParameterNumber">
            <property name="max" value="5"/>
        </module>
        <module name="CyclomaticComplexity">
            <property name="max" value="10"/>
        </module>
        <module name="ClassDataAbstractionCoupling">
            <property name="max" value="10"/>
        </module>
        <module name="ClassFanOutComplexity">
            <property name="max" value="20"/>
        </module>
    </module>
</module>
```

### 代碼品質監控

#### 1. 代碼品質指標

```java
@Component
public class CodeQualityMetrics {
    private final MeterRegistry meterRegistry;
    
    public CodeQualityMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public void recordMethodComplexity(String className, String methodName, int complexity) {
        Gauge.builder("code.complexity.cyclomatic")
            .tag("class", className)
            .tag("method", methodName)
            .register(meterRegistry, complexity);
    }
    
    public void recordCodeDuplication(String className, double duplicationPercentage) {
        Gauge.builder("code.duplication.percentage")
            .tag("class", className)
            .register(meterRegistry, duplicationPercentage);
    }
    
    public void recordTestCoverage(String className, double coveragePercentage) {
        Gauge.builder("code.coverage.percentage")
            .tag("class", className)
            .register(meterRegistry, coveragePercentage);
    }
}
```

#### 2. 自動化代碼檢查

```java
@Component
public class CodeQualityChecker {
    private final CodeQualityMetrics metrics;
    private final NotificationService notificationService;
    
    public CodeQualityChecker(CodeQualityMetrics metrics, NotificationService notificationService) {
        this.metrics = metrics;
        this.notificationService = notificationService;
    }
    
    @EventListener
    public void onCodeCommit(CodeCommitEvent event) {
        CodeQualityReport report = analyzeCode(event.getChangedFiles());
        
        if (report.hasQualityIssues()) {
            notificationService.sendQualityAlert(report);
        }
        
        updateMetrics(report);
    }
    
    private CodeQualityReport analyzeCode(List<String> changedFiles) {
        CodeQualityReport report = new CodeQualityReport();
        
        for (String file : changedFiles) {
            if (file.endsWith(".java")) {
                analyzeJavaFile(file, report);
            }
        }
        
        return report;
    }
    
    private void analyzeJavaFile(String filePath, CodeQualityReport report) {
        // 分析代碼複雜度
        int complexity = calculateCyclomaticComplexity(filePath);
        if (complexity > 10) {
            report.addIssue(new QualityIssue(filePath, "高複雜度", "圈複雜度: " + complexity));
        }
        
        // 分析方法長度
        int methodLength = calculateAverageMethodLength(filePath);
        if (methodLength > 30) {
            report.addIssue(new QualityIssue(filePath, "方法過長", "平均方法長度: " + methodLength));
        }
        
        // 分析重複代碼
        double duplication = calculateDuplication(filePath);
        if (duplication > 0.1) {
            report.addIssue(new QualityIssue(filePath, "代碼重複", "重複率: " + (duplication * 100) + "%"));
        }
    }
    
    private int calculateCyclomaticComplexity(String filePath) {
        // 實現複雜度計算邏輯
        return 0;
    }
    
    private int calculateAverageMethodLength(String filePath) {
        // 實現方法長度計算邏輯
        return 0;
    }
    
    private double calculateDuplication(String filePath) {
        // 實現重複度計算邏輯
        return 0.0;
    }
    
    private void updateMetrics(CodeQualityReport report) {
        report.getIssues().forEach(issue -> {
            String className = extractClassName(issue.getFilePath());
            switch (issue.getType()) {
                case "高複雜度":
                    metrics.recordMethodComplexity(className, "unknown", 
                        extractComplexityValue(issue.getDescription()));
                    break;
                case "代碼重複":
                    metrics.recordCodeDuplication(className, 
                        extractDuplicationValue(issue.getDescription()));
                    break;
            }
        });
    }
    
    private String extractClassName(String filePath) {
        return filePath.substring(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.'));
    }
    
    private int extractComplexityValue(String description) {
        // 從描述中提取複雜度值
        return 0;
    }
    
    private double extractDuplicationValue(String description) {
        // 從描述中提取重複度值
        return 0.0;
    }
}
```

### 總結

代碼壞味道的識別與重構是提升軟體品質的重要手段：

#### 關鍵最佳實踐

1. **持續監控**：使用自動化工具持續監控代碼品質
2. **漸進式重構**：小步驟、高頻率的重構比大規模重構更安全
3. **測試保護**：在重構前確保有充分的測試覆蓋
4. **團隊標準**：建立統一的代碼品質標準和評審流程
5. **教育培訓**：定期培訓開發人員識別和避免代碼壞味道

#### 預防策略

1. **設計階段**：在設計階段就考慮代碼品質
2. **編碼標準**：制定並遵循編碼標準
3. **代碼評審**：實施嚴格的代碼評審流程
4. **自動化檢查**：集成自動化代碼品質檢查工具
5. **重構文化**：培養持續重構的文化

通過系統性的代碼壞味道識別與重構，可以大幅提升代碼品質，降低維護成本，提高開發效率。

## Fowler 22 Code Smells 速查

Martin Fowler《Refactoring》定義的 22 個 Code Smell：

| # | Smell | 快速識別 |
|---|-------|---------|
| 1 | Mysterious Name | 看名字猜不出用途 |
| 2 | Duplicated Code | 同樣邏輯出現 2+ 次 |
| 3 | Long Function | 函數超過一個螢幕 |
| 4 | Long Parameter List | 超過 3-4 個參數 |
| 5 | Global Data | 全域可變狀態 |
| 6 | Mutable Data | 可變物件在多處共享 |
| 7 | Divergent Change | 一個 class 因多種原因修改（違反 SRP） |
| 8 | Shotgun Surgery | 一個變更需改多個 class |
| 9 | Feature Envy | method 更像在操作別的 class |
| 10 | Data Clumps | 同一組欄位一直一起出現 |
| 11 | Primitive Obsession | 用 String/int 代替 Domain 物件 |
| 12 | Repeated Switches | 同一個 switch 散落各處 |
| 13 | Parallel Inheritance | 繼承一個 class 就得繼承另一個 |
| 14 | Lazy Element | class/function 做太少事 |
| 15 | Speculative Generality | 「以後可能用到」的過度設計 |
| 16 | Temporary Field | 只在某些情況才有值的欄位 |
| 17 | Message Chains | `a.b().c().d()` 的過長鏈 |
| 18 | Middle Man | class 大部分 method 都委派給別的 class |
| 19 | Insider Trading | class 互相知道太多對方細節 |
| 20 | Large Class | class 做太多事（違反 SRP） |
| 21 | Alternative Classes | 做相同事但介面不一樣的 class |
| 22 | Data Class | 只有 getter/setter，沒有邏輯 |

## SonarQube / SpotBugs 規則對應

常見 Smell 的靜態分析工具規則：

| Smell | SonarQube Key | SpotBugs |
|-------|--------------|---------|
| Duplicated Code | `DuplicatedBlocks` | N/A |
| Long Method | `S138` (>150 lines) | N/A |
| God Class | `S2094` | `GOD_CLASS` |
| Null Return | `S1168` | `NP_NULL_ON_SOME_PATH` |
| Empty catch | `S1166` | `DE_MIGHT_IGNORE` |
| Mutable Static | `S2696` | `ST_WRITE_TO_STATIC_FROM_INSTANCE_METHOD` |