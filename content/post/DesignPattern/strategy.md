---
title: "DesignPattern - Behavioral - Strategy Pattern"
author: Bill.Lin
date: 2018-08-07T22:37:39+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Strategy Pattern 策略模式

Strategy Pattern 是行為型設計模式之一，它定義了一系列算法，把它們封裝起來，並使它們可以相互替換。策略模式讓算法的變化獨立於使用算法的客戶端。

## 核心概念

策略模式的核心思想是將算法的定義與使用分離，通過定義一族算法，將每個算法封裝起來，並使它們可以互相替換。這樣可以讓算法的變化不會影響到使用算法的客戶端。

### 主要組成部分

1. **Strategy (策略接口)**: 定義所有具體策略的公共接口
2. **ConcreteStrategy (具體策略)**: 實現具體的算法
3. **Context (上下文)**: 持有策略的引用，並將客戶端的請求委派給策略

### 主要優勢

- **算法切換靈活**: 可以在運行時切換算法
- **算法獨立**: 算法的變化不影響客戶端
- **開閉原則**: 新增算法無需修改現有代碼
- **可測試性**: 每個策略都可以獨立測試
- **代碼重用**: 算法可以在不同上下文中重用

## 1. 基礎策略模式實現

### 經典支付策略範例

```java
// 策略接口
public interface PaymentStrategy {
    PaymentResult processPayment(PaymentRequest request);
    boolean validatePayment(PaymentRequest request);
    String getPaymentMethodName();
}

// 支付請求模型
public class PaymentRequest {
    private final BigDecimal amount;
    private final String currency;
    private final String merchantId;
    private final Map<String, String> additionalData;
    
    public PaymentRequest(BigDecimal amount, String currency, String merchantId) {
        this.amount = amount;
        this.currency = currency;
        this.merchantId = merchantId;
        this.additionalData = new HashMap<>();
    }
    
    // getters and setters
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getMerchantId() { return merchantId; }
    public Map<String, String> getAdditionalData() { return additionalData; }
}

// 支付結果模型
public class PaymentResult {
    private final boolean success;
    private final String transactionId;
    private final String message;
    private final LocalDateTime timestamp;
    
    public PaymentResult(boolean success, String transactionId, String message) {
        this.success = success;
        this.transactionId = transactionId;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
    
    // getters
    public boolean isSuccess() { return success; }
    public String getTransactionId() { return transactionId; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
```

### 具體策略實現

```java
// 信用卡支付策略
public class CreditCardPaymentStrategy implements PaymentStrategy {
    private final String cardNumber;
    private final String cardHolderName;
    private final String expiryDate;
    private final String cvv;
    
    public CreditCardPaymentStrategy(String cardNumber, String cardHolderName, 
                                   String expiryDate, String cvv) {
        this.cardNumber = cardNumber;
        this.cardHolderName = cardHolderName;
        this.expiryDate = expiryDate;
        this.cvv = cvv;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        if (!validatePayment(request)) {
            return new PaymentResult(false, null, "信用卡驗證失敗");
        }
        
        try {
            // 模擬信用卡支付處理
            String transactionId = "CC_" + System.currentTimeMillis();
            System.out.println("正在處理信用卡支付...");
            System.out.println("金額: " + request.getAmount() + " " + request.getCurrency());
            System.out.println("卡號: " + maskCardNumber(cardNumber));
            
            // 模擬網絡延遲
            Thread.sleep(1000);
            
            return new PaymentResult(true, transactionId, "信用卡支付成功");
        } catch (InterruptedException e) {
            return new PaymentResult(false, null, "支付過程中發生錯誤");
        }
    }
    
    @Override
    public boolean validatePayment(PaymentRequest request) {
        // 驗證邏輯
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        if (cardNumber == null || cardNumber.length() < 16) {
            return false;
        }
        if (cvv == null || cvv.length() != 3) {
            return false;
        }
        return true;
    }
    
    @Override
    public String getPaymentMethodName() {
        return "信用卡支付";
    }
    
    private String maskCardNumber(String cardNumber) {
        return "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
    }
}

// PayPal 支付策略
public class PayPalPaymentStrategy implements PaymentStrategy {
    private final String email;
    private final String password;
    
    public PayPalPaymentStrategy(String email, String password) {
        this.email = email;
        this.password = password;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        if (!validatePayment(request)) {
            return new PaymentResult(false, null, "PayPal 驗證失敗");
        }
        
        try {
            String transactionId = "PP_" + System.currentTimeMillis();
            System.out.println("正在處理 PayPal 支付...");
            System.out.println("金額: " + request.getAmount() + " " + request.getCurrency());
            System.out.println("PayPal 帳戶: " + email);
            
            // 模擬 PayPal API 調用
            Thread.sleep(800);
            
            return new PaymentResult(true, transactionId, "PayPal 支付成功");
        } catch (InterruptedException e) {
            return new PaymentResult(false, null, "PayPal 支付過程中發生錯誤");
        }
    }
    
    @Override
    public boolean validatePayment(PaymentRequest request) {
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        if (email == null || !email.contains("@")) {
            return false;
        }
        if (password == null || password.length() < 6) {
            return false;
        }
        return true;
    }
    
    @Override
    public String getPaymentMethodName() {
        return "PayPal 支付";
    }
}

// 銀行轉帳策略
public class BankTransferPaymentStrategy implements PaymentStrategy {
    private final String accountNumber;
    private final String routingNumber;
    private final String accountHolderName;
    
    public BankTransferPaymentStrategy(String accountNumber, String routingNumber, 
                                     String accountHolderName) {
        this.accountNumber = accountNumber;
        this.routingNumber = routingNumber;
        this.accountHolderName = accountHolderName;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        if (!validatePayment(request)) {
            return new PaymentResult(false, null, "銀行轉帳驗證失敗");
        }
        
        try {
            String transactionId = "BT_" + System.currentTimeMillis();
            System.out.println("正在處理銀行轉帳...");
            System.out.println("金額: " + request.getAmount() + " " + request.getCurrency());
            System.out.println("收款帳戶: " + maskAccountNumber(accountNumber));
            
            // 模擬銀行處理時間
            Thread.sleep(2000);
            
            return new PaymentResult(true, transactionId, "銀行轉帳成功");
        } catch (InterruptedException e) {
            return new PaymentResult(false, null, "銀行轉帳過程中發生錯誤");
        }
    }
    
    @Override
    public boolean validatePayment(PaymentRequest request) {
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        if (accountNumber == null || accountNumber.length() < 10) {
            return false;
        }
        if (routingNumber == null || routingNumber.length() != 9) {
            return false;
        }
        return true;
    }
    
    @Override
    public String getPaymentMethodName() {
        return "銀行轉帳";
    }
    
    private String maskAccountNumber(String accountNumber) {
        return "*".repeat(accountNumber.length() - 4) + accountNumber.substring(accountNumber.length() - 4);
    }
}
```

### 上下文類實現

```java
// 支付處理器上下文
public class PaymentProcessor {
    private PaymentStrategy paymentStrategy;
    
    public PaymentProcessor(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }
    
    public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }
    
    public PaymentResult processPayment(PaymentRequest request) {
        if (paymentStrategy == null) {
            return new PaymentResult(false, null, "未設置支付策略");
        }
        
        System.out.println("使用支付方式: " + paymentStrategy.getPaymentMethodName());
        PaymentResult result = paymentStrategy.processPayment(request);
        
        // 記錄支付結果
        logPaymentResult(request, result);
        
        return result;
    }
    
    private void logPaymentResult(PaymentRequest request, PaymentResult result) {
        System.out.println("=== 支付日誌 ===");
        System.out.println("時間: " + result.getTimestamp());
        System.out.println("金額: " + request.getAmount() + " " + request.getCurrency());
        System.out.println("狀態: " + (result.isSuccess() ? "成功" : "失敗"));
        System.out.println("訊息: " + result.getMessage());
        if (result.getTransactionId() != null) {
            System.out.println("交易ID: " + result.getTransactionId());
        }
        System.out.println("==================");
    }
}
```

### 基礎使用範例

```java
public class BasicStrategyDemo {
    public static void main(String[] args) {
        // 創建支付請求
        PaymentRequest request = new PaymentRequest(
            new BigDecimal("299.99"), 
            "TWD", 
            "MERCHANT_001"
        );
        
        // 信用卡支付
        PaymentStrategy creditCardStrategy = new CreditCardPaymentStrategy(
            "4111111111111111",
            "John Doe",
            "12/25",
            "123"
        );
        
        PaymentProcessor processor = new PaymentProcessor(creditCardStrategy);
        PaymentResult result1 = processor.processPayment(request);
        
        // 切換到 PayPal 支付
        PaymentStrategy paypalStrategy = new PayPalPaymentStrategy(
            "user@example.com",
            "password123"
        );
        
        processor.setPaymentStrategy(paypalStrategy);
        PaymentResult result2 = processor.processPayment(request);
        
        // 切換到銀行轉帳
        PaymentStrategy bankTransferStrategy = new BankTransferPaymentStrategy(
            "1234567890",
            "123456789",
            "John Doe"
        );
        
        processor.setPaymentStrategy(bankTransferStrategy);
        PaymentResult result3 = processor.processPayment(request);
    }
}
```

## 2. 現代 Java 函數式策略模式

### 使用 Lambda 表達式

```java
// 函數式策略接口
@FunctionalInterface
public interface DiscountStrategy {
    BigDecimal calculateDiscount(BigDecimal originalPrice, Customer customer);
}

// 客戶模型
public class Customer {
    private final String id;
    private final String name;
    private final CustomerType type;
    private final LocalDate memberSince;
    private final BigDecimal totalSpent;
    
    public Customer(String id, String name, CustomerType type, 
                   LocalDate memberSince, BigDecimal totalSpent) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.memberSince = memberSince;
        this.totalSpent = totalSpent;
    }
    
    // getters
    public String getId() { return id; }
    public String getName() { return name; }
    public CustomerType getType() { return type; }
    public LocalDate getMemberSince() { return memberSince; }
    public BigDecimal getTotalSpent() { return totalSpent; }
}

public enum CustomerType {
    REGULAR, PREMIUM, VIP
}

// 函數式折扣策略
public class FunctionalDiscountStrategies {
    
    // 常規折扣策略
    public static final DiscountStrategy REGULAR_DISCOUNT = 
        (price, customer) -> price.multiply(BigDecimal.valueOf(0.05));
    
    // 會員折扣策略
    public static final DiscountStrategy MEMBER_DISCOUNT = 
        (price, customer) -> {
            long membershipYears = ChronoUnit.YEARS.between(
                customer.getMemberSince(), LocalDate.now());
            double discountRate = Math.min(0.20, 0.05 + (membershipYears * 0.01));
            return price.multiply(BigDecimal.valueOf(discountRate));
        };
    
    // VIP 折扣策略
    public static final DiscountStrategy VIP_DISCOUNT = 
        (price, customer) -> {
            if (customer.getType() == CustomerType.VIP) {
                return price.multiply(BigDecimal.valueOf(0.25));
            }
            return BigDecimal.ZERO;
        };
    
    // 大額消費折扣策略
    public static final DiscountStrategy HIGH_SPENDER_DISCOUNT = 
        (price, customer) -> {
            if (customer.getTotalSpent().compareTo(BigDecimal.valueOf(10000)) >= 0) {
                return price.multiply(BigDecimal.valueOf(0.15));
            }
            return BigDecimal.ZERO;
        };
    
    // 組合策略 - 取最大折扣
    public static DiscountStrategy maxDiscount(DiscountStrategy... strategies) {
        return (price, customer) -> {
            return Arrays.stream(strategies)
                .map(strategy -> strategy.calculateDiscount(price, customer))
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
        };
    }
    
    // 組合策略 - 累加折扣
    public static DiscountStrategy additiveDiscount(DiscountStrategy... strategies) {
        return (price, customer) -> {
            return Arrays.stream(strategies)
                .map(strategy -> strategy.calculateDiscount(price, customer))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        };
    }
}
```

### 函數式策略使用

```java
// 價格計算器
public class PriceCalculator {
    private DiscountStrategy discountStrategy;
    
    public PriceCalculator(DiscountStrategy discountStrategy) {
        this.discountStrategy = discountStrategy;
    }
    
    public BigDecimal calculateFinalPrice(BigDecimal originalPrice, Customer customer) {
        BigDecimal discount = discountStrategy.calculateDiscount(originalPrice, customer);
        BigDecimal finalPrice = originalPrice.subtract(discount);
        
        System.out.printf("原價: %s, 折扣: %s, 最終價格: %s%n", 
            originalPrice, discount, finalPrice);
        
        return finalPrice;
    }
    
    public void setDiscountStrategy(DiscountStrategy discountStrategy) {
        this.discountStrategy = discountStrategy;
    }
}

// 函數式策略範例
public class FunctionalStrategyDemo {
    public static void main(String[] args) {
        // 創建客戶
        Customer regularCustomer = new Customer("001", "Alice", CustomerType.REGULAR, 
            LocalDate.now().minusYears(1), BigDecimal.valueOf(5000));
        
        Customer vipCustomer = new Customer("002", "Bob", CustomerType.VIP, 
            LocalDate.now().minusYears(3), BigDecimal.valueOf(15000));
        
        BigDecimal originalPrice = BigDecimal.valueOf(1000);
        
        // 使用預定義策略
        PriceCalculator calculator = new PriceCalculator(
            FunctionalDiscountStrategies.REGULAR_DISCOUNT);
        calculator.calculateFinalPrice(originalPrice, regularCustomer);
        
        // 使用 Lambda 表達式創建策略
        DiscountStrategy seasonalDiscount = (price, customer) -> 
            price.multiply(BigDecimal.valueOf(0.10)); // 10% 季節性折扣
        
        calculator.setDiscountStrategy(seasonalDiscount);
        calculator.calculateFinalPrice(originalPrice, regularCustomer);
        
        // 使用組合策略
        DiscountStrategy combinedStrategy = FunctionalDiscountStrategies.maxDiscount(
            FunctionalDiscountStrategies.MEMBER_DISCOUNT,
            FunctionalDiscountStrategies.VIP_DISCOUNT,
            FunctionalDiscountStrategies.HIGH_SPENDER_DISCOUNT
        );
        
        calculator.setDiscountStrategy(combinedStrategy);
        calculator.calculateFinalPrice(originalPrice, vipCustomer);
        
        // 使用方法引用
        calculator.setDiscountStrategy(FunctionalStrategyDemo::loyaltyDiscount);
        calculator.calculateFinalPrice(originalPrice, vipCustomer);
    }
    
    // 靜態方法作為策略
    private static BigDecimal loyaltyDiscount(BigDecimal price, Customer customer) {
        long membershipDays = ChronoUnit.DAYS.between(
            customer.getMemberSince(), LocalDate.now());
        double discountRate = Math.min(0.30, membershipDays * 0.0001);
        return price.multiply(BigDecimal.valueOf(discountRate));
    }
}
```

## 3. Spring Boot 中的策略模式

### Spring 配置和依賴注入

```java
// 通知策略接口
public interface NotificationStrategy {
    void sendNotification(String recipient, String message);
    boolean isAvailable();
    String getChannelName();
}

// 具體通知策略實現
@Component
public class EmailNotificationStrategy implements NotificationStrategy {
    
    @Value("${notification.email.enabled:true}")
    private boolean enabled;
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Override
    public void sendNotification(String recipient, String message) {
        if (!isAvailable()) {
            throw new IllegalStateException("Email 通知服務不可用");
        }
        
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(recipient);
            mailMessage.setSubject("系統通知");
            mailMessage.setText(message);
            
            mailSender.send(mailMessage);
            System.out.println("Email 通知已發送到: " + recipient);
        } catch (Exception e) {
            System.err.println("Email 發送失敗: " + e.getMessage());
        }
    }
    
    @Override
    public boolean isAvailable() {
        return enabled && mailSender != null;
    }
    
    @Override
    public String getChannelName() {
        return "email";
    }
}

@Component
public class SmsNotificationStrategy implements NotificationStrategy {
    
    @Value("${notification.sms.enabled:true}")
    private boolean enabled;
    
    @Value("${notification.sms.api-key:}")
    private String apiKey;
    
    @Override
    public void sendNotification(String recipient, String message) {
        if (!isAvailable()) {
            throw new IllegalStateException("SMS 通知服務不可用");
        }
        
        // 模擬 SMS API 調用
        System.out.println("SMS 通知已發送到: " + recipient);
        System.out.println("內容: " + message);
    }
    
    @Override
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isEmpty();
    }
    
    @Override
    public String getChannelName() {
        return "sms";
    }
}
```

### 策略工廠和管理

```java
// 通知策略工廠
@Component
public class NotificationStrategyFactory {
    
    private final Map<String, NotificationStrategy> strategies;
    
    public NotificationStrategyFactory(List<NotificationStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                NotificationStrategy::getChannelName,
                Function.identity()
            ));
    }
    
    public NotificationStrategy getStrategy(String channelName) {
        NotificationStrategy strategy = strategies.get(channelName);
        if (strategy == null) {
            throw new IllegalArgumentException("不支援的通知方式: " + channelName);
        }
        return strategy;
    }
    
    public List<NotificationStrategy> getAvailableStrategies() {
        return strategies.values().stream()
            .filter(NotificationStrategy::isAvailable)
            .collect(Collectors.toList());
    }
    
    public Set<String> getSupportedChannels() {
        return strategies.keySet();
    }
}

// 通知服務
@Service
public class NotificationService {
    
    private final NotificationStrategyFactory strategyFactory;
    
    public NotificationService(NotificationStrategyFactory strategyFactory) {
        this.strategyFactory = strategyFactory;
    }
    
    public void sendNotification(String channel, String recipient, String message) {
        NotificationStrategy strategy = strategyFactory.getStrategy(channel);
        
        if (!strategy.isAvailable()) {
            // 降級策略 - 嘗試其他可用的通知方式
            List<NotificationStrategy> availableStrategies = 
                strategyFactory.getAvailableStrategies();
            
            if (!availableStrategies.isEmpty()) {
                NotificationStrategy fallbackStrategy = availableStrategies.get(0);
                System.out.println("原通知方式不可用，使用備選方式: " + 
                    fallbackStrategy.getChannelName());
                fallbackStrategy.sendNotification(recipient, message);
                return;
            }
            
            throw new IllegalStateException("所有通知方式都不可用");
        }
        
        strategy.sendNotification(recipient, message);
    }
    
    public void broadcastNotification(String message) {
        List<NotificationStrategy> availableStrategies = 
            strategyFactory.getAvailableStrategies();
        
        availableStrategies.parallelStream()
            .forEach(strategy -> {
                try {
                    strategy.sendNotification("broadcast", message);
                } catch (Exception e) {
                    System.err.println("廣播通知失敗 [" + 
                        strategy.getChannelName() + "]: " + e.getMessage());
                }
            });
    }
}
```

## 4. 策略模式的最佳實踐

### 避免常見陷阱

```java
// ❌ 錯誤：策略類過於複雜
public class BadComplexStrategy implements PaymentStrategy {
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // 100+ 行複雜邏輯
        // 包含多個職責
        // 難以測試和維護
        return null;
    }
}

// ✅ 正確：單一職責的策略
public class GoodSimpleStrategy implements PaymentStrategy {
    private final PaymentValidator validator;
    private final PaymentProcessor processor;
    
    public GoodSimpleStrategy(PaymentValidator validator, PaymentProcessor processor) {
        this.validator = validator;
        this.processor = processor;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        if (!validator.validate(request)) {
            return new PaymentResult(false, null, "驗證失敗");
        }
        return processor.process(request);
    }
}
```

### 策略模式測試

```java
@ExtendWith(MockitoExtension.class)
class PaymentStrategyTest {
    
    @Test
    void creditCardPayment_shouldProcessSuccessfully() {
        // Given
        PaymentStrategy strategy = new CreditCardPaymentStrategy(
            "4111111111111111", "John Doe", "12/25", "123");
        PaymentRequest request = new PaymentRequest(
            BigDecimal.valueOf(100), "USD", "MERCHANT_001");
        
        // When
        PaymentResult result = strategy.processPayment(request);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getTransactionId()).isNotNull();
        assertThat(result.getTransactionId()).startsWith("CC_");
    }
    
    @Test
    void paymentProcessor_shouldSwitchStrategies() {
        // Given
        PaymentStrategy creditCardStrategy = new CreditCardPaymentStrategy(
            "4111111111111111", "John Doe", "12/25", "123");
        PaymentStrategy paypalStrategy = new PayPalPaymentStrategy(
            "user@example.com", "password123");
        
        PaymentProcessor processor = new PaymentProcessor(creditCardStrategy);
        PaymentRequest request = new PaymentRequest(
            BigDecimal.valueOf(100), "USD", "MERCHANT_001");
        
        // When & Then
        PaymentResult result1 = processor.processPayment(request);
        assertThat(result1.isSuccess()).isTrue();
        
        processor.setPaymentStrategy(paypalStrategy);
        PaymentResult result2 = processor.processPayment(request);
        assertThat(result2.isSuccess()).isTrue();
        assertThat(result2.getTransactionId()).startsWith("PP_");
    }
}
```

## 5. 總結

### 適用場景

1. **算法選擇**: 需要在多個算法間動態選擇
2. **行為變化**: 對象行為需要在運行時改變
3. **條件邏輯**: 替代複雜的條件分支結構
4. **擴展性**: 需要頻繁添加新的行為實現

### 關鍵要點

- **單一職責**: 每個策略專注於一個特定算法
- **開閉原則**: 容易添加新策略，無需修改現有代碼
- **運行時切換**: 支持動態切換策略
- **測試友好**: 每個策略可以獨立測試

### Spring Boot 最佳實踐

- **依賴注入**: 使用 Spring 管理策略實例
- **配置驅動**: 通過配置文件控制策略選擇
- **條件創建**: 使用 `@ConditionalOnProperty` 控制策略載入
- **監控集成**: 整合 Spring Actuator 監控策略使用情況

### 現代 Java 做法

Java 8+ 中，`@FunctionalInterface` 是 Strategy 的自然表達：

```java
// 傳統 Strategy
interface SortStrategy { void sort(int[] arr); }

// 現代：直接用 functional interface
List<String> names = new ArrayList<>(List.of("Charlie", "Alice", "Bob"));
names.sort(Comparator.naturalOrder());              // Strategy = Comparator
names.sort(Comparator.comparingInt(String::length)); // 不同策略，無需新建 class
```

**Enum + abstract method**（固定策略集合的輕量做法）：

```java
enum TaxStrategy {
    STANDARD {
        @Override public double calculate(double amount) { return amount * 0.05; }
    },
    REDUCED {
        @Override public double calculate(double amount) { return amount * 0.025; }
    };
    public abstract double calculate(double amount);
}
```

Enum 做法適合策略集合固定且不需要 Spring 注入的場景；Lambda 做法適合策略邏輯簡單、不需要單獨測試的場景。複雜的業務策略仍建議用獨立 class 實作，便於注入依賴和單元測試。

### 與其他模式的關係

- **工廠模式**: 用於創建策略實例
- **裝飾器模式**: 為策略添加額外功能
- **責任鏈模式**: 組合多個策略處理複雜業務
- **模板方法模式**: 在策略內部定義算法骨架

策略模式是企業級應用中最常用的設計模式之一，特別適合處理業務規則頻繁變化的場景。在 Spring Boot 環境中，結合依賴注入和配置管理，可以構建出高度靈活和可維護的應用系統。