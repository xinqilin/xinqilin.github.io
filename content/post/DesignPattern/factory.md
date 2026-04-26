---
title: "DesignPattern - Creational - Factory Pattern"
author: Bill.Lin
date: 2018-08-07T01:07:16+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Factory Pattern 工廠模式

Factory Pattern 是創建型設計模式之一，提供了一種創建對象的最佳方式。在工廠模式中，我們在不向客戶端暴露創建邏輯的情況下創建對象，並且通過使用一個共同的接口來指向新創建的對象。

## 核心概念

工廠模式解決了直接實例化對象所帶來的問題，它封裝了對象創建的複雜性，讓客戶端程序可以通過簡單的接口獲取所需的對象，而無需了解對象創建的具體過程。

### 主要優勢

- **解耦**: 客戶端代碼與具體實現類解耦
- **可擴展性**: 容易添加新的產品類型
- **集中管理**: 對象創建邏輯集中在工廠中
- **一致性**: 確保對象創建的一致性
- **測試友好**: 便於單元測試和模擬

## 1. Simple Factory Pattern 簡單工廠模式

最基本的工廠模式實現，通過一個工廠類來創建所有相關的對象。

### 基礎實現

```java
// 產品接口
public interface Vehicle {
    void start();
    void stop();
    void accelerate();
    String getType();
}

// 具體產品實現
public class Car implements Vehicle {
    private String brand;
    
    public Car(String brand) {
        this.brand = brand;
    }
    
    @Override
    public void start() {
        System.out.println(brand + " 汽車啟動引擎");
    }
    
    @Override
    public void stop() {
        System.out.println(brand + " 汽車停止");
    }
    
    @Override
    public void accelerate() {
        System.out.println(brand + " 汽車加速");
    }
    
    @Override
    public String getType() {
        return "Car - " + brand;
    }
}

public class Motorcycle implements Vehicle {
    private String brand;
    
    public Motorcycle(String brand) {
        this.brand = brand;
    }
    
    @Override
    public void start() {
        System.out.println(brand + " 機車啟動");
    }
    
    @Override
    public void stop() {
        System.out.println(brand + " 機車停止");
    }
    
    @Override
    public void accelerate() {
        System.out.println(brand + " 機車加速");
    }
    
    @Override
    public String getType() {
        return "Motorcycle - " + brand;
    }
}

public class Truck implements Vehicle {
    private String brand;
    private int capacity;
    
    public Truck(String brand, int capacity) {
        this.brand = brand;
        this.capacity = capacity;
    }
    
    @Override
    public void start() {
        System.out.println(brand + " 卡車啟動 (載重: " + capacity + "噸)");
    }
    
    @Override
    public void stop() {
        System.out.println(brand + " 卡車停止");
    }
    
    @Override
    public void accelerate() {
        System.out.println(brand + " 卡車緩慢加速");
    }
    
    @Override
    public String getType() {
        return "Truck - " + brand + " (" + capacity + "t)";
    }
}
```

### 簡單工廠實現

```java
// 車輛類型枚舉
public enum VehicleType {
    CAR,
    MOTORCYCLE, 
    TRUCK
}

// 簡單工廠類
public class VehicleFactory {
    
    public static Vehicle createVehicle(VehicleType type, String brand) {
        return createVehicle(type, brand, 0);
    }
    
    public static Vehicle createVehicle(VehicleType type, String brand, int capacity) {
        switch (type) {
            case CAR:
                return new Car(brand);
            case MOTORCYCLE:
                return new Motorcycle(brand);
            case TRUCK:
                if (capacity <= 0) {
                    throw new IllegalArgumentException("卡車必須指定載重容量");
                }
                return new Truck(brand, capacity);
            default:
                throw new IllegalArgumentException("不支援的車輛類型: " + type);
        }
    }
    
    // 基於字符串的工廠方法（較不推薦）
    public static Vehicle createVehicle(String type, String brand) {
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("車輛類型不能為空");
        }
        
        switch (type.toLowerCase()) {
            case "car":
                return new Car(brand);
            case "motorcycle":
                return new Motorcycle(brand);
            case "truck":
                return new Truck(brand, 5); // 預設載重
            default:
                throw new IllegalArgumentException("不支援的車輛類型: " + type);
        }
    }
}
```

### 使用範例

```java
public class SimpleFactoryDemo {
    public static void main(String[] args) {
        // 使用枚舉創建車輛
        Vehicle car = VehicleFactory.createVehicle(VehicleType.CAR, "BMW");
        Vehicle motorcycle = VehicleFactory.createVehicle(VehicleType.MOTORCYCLE, "Harley-Davidson");
        Vehicle truck = VehicleFactory.createVehicle(VehicleType.TRUCK, "Volvo", 10);
        
        // 測試車輛功能
        testVehicle(car);
        testVehicle(motorcycle);
        testVehicle(truck);
        
        // 使用字符串創建（不推薦但有時必要）
        Vehicle stringBasedCar = VehicleFactory.createVehicle("car", "Mercedes");
        testVehicle(stringBasedCar);
    }
    
    private static void testVehicle(Vehicle vehicle) {
        System.out.println("\n=== 測試 " + vehicle.getType() + " ===");
        vehicle.start();
        vehicle.accelerate();
        vehicle.stop();
    }
}
```

## 2. Factory Method Pattern 工廠方法模式

工廠方法模式定義了一個創建對象的接口，但讓子類決定要實例化的類是哪一個。工廠方法讓類把實例化推遲到子類。

### 核心結構

```java
// 抽象產品
public abstract class Document {
    protected String title;
    protected String content;
    
    public Document(String title) {
        this.title = title;
    }
    
    public abstract void create();
    public abstract void save();
    public abstract void export(String format);
    
    // 通用方法
    public String getTitle() {
        return title;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
}

// 具體產品實現
public class WordDocument extends Document {
    public WordDocument(String title) {
        super(title);
    }
    
    @Override
    public void create() {
        System.out.println("創建 Word 文檔: " + title);
        this.content = "Word 文檔內容模板";
    }
    
    @Override
    public void save() {
        System.out.println("保存 Word 文檔: " + title + ".docx");
    }
    
    @Override
    public void export(String format) {
        System.out.println("將 Word 文檔導出為 " + format + " 格式");
    }
}

public class PdfDocument extends Document {
    public PdfDocument(String title) {
        super(title);
    }
    
    @Override
    public void create() {
        System.out.println("創建 PDF 文檔: " + title);
        this.content = "PDF 文檔內容模板";
    }
    
    @Override
    public void save() {
        System.out.println("保存 PDF 文檔: " + title + ".pdf");
    }
    
    @Override
    public void export(String format) {
        System.out.println("將 PDF 文檔導出為 " + format + " 格式");
    }
}

public class ExcelDocument extends Document {
    public ExcelDocument(String title) {
        super(title);
    }
    
    @Override
    public void create() {
        System.out.println("創建 Excel 文檔: " + title);
        this.content = "Excel 文檔數據模板";
    }
    
    @Override
    public void save() {
        System.out.println("保存 Excel 文檔: " + title + ".xlsx");
    }
    
    @Override
    public void export(String format) {
        System.out.println("將 Excel 文檔導出為 " + format + " 格式");
    }
}
```

### 抽象工廠創建者

```java
// 抽象創建者
public abstract class DocumentCreator {
    protected String author;
    
    public DocumentCreator(String author) {
        this.author = author;
    }
    
    // 工廠方法 - 子類必須實現
    public abstract Document createDocument(String title);
    
    // 模板方法 - 定義文檔創建流程
    public Document processDocument(String title, String content) {
        Document document = createDocument(title);
        document.setContent(content);
        document.create();
        return document;
    }
    
    // 通用方法
    public String getAuthor() {
        return author;
    }
}

// 具體創建者實現
public class WordDocumentCreator extends DocumentCreator {
    public WordDocumentCreator(String author) {
        super(author);
    }
    
    @Override
    public Document createDocument(String title) {
        return new WordDocument(title);
    }
}

public class PdfDocumentCreator extends DocumentCreator {
    public PdfDocumentCreator(String author) {
        super(author);
    }
    
    @Override
    public Document createDocument(String title) {
        return new PdfDocument(title);
    }
}

public class ExcelDocumentCreator extends DocumentCreator {
    public ExcelDocumentCreator(String author) {
        super(author);
    }
    
    @Override
    public Document createDocument(String title) {
        return new ExcelDocument(title);
    }
}
```

### 工廠方法使用範例

```java
public class FactoryMethodDemo {
    public static void main(String[] args) {
        // 創建不同類型的文檔創建者
        DocumentCreator wordCreator = new WordDocumentCreator("Bill.Lin");
        DocumentCreator pdfCreator = new PdfDocumentCreator("Bill.Lin");
        DocumentCreator excelCreator = new ExcelDocumentCreator("Bill.Lin");
        
        // 使用工廠方法創建文檔
        Document reportWord = wordCreator.processDocument("月報告", "本月銷售數據分析...");
        Document contractPdf = pdfCreator.processDocument("合同", "甲乙雙方協議條款...");
        Document dataExcel = excelCreator.processDocument("數據表", "銷售數據統計...");
        
        // 保存文檔
        reportWord.save();
        contractPdf.save();
        dataExcel.save();
        
        // 導出文檔
        reportWord.export("PDF");
        contractPdf.export("Word");
        dataExcel.export("CSV");
    }
}
```

## 3. Abstract Factory Pattern 抽象工廠模式

抽象工廠模式提供了一個創建一系列相關或相互依賴對象的接口，而無需指定它們具體的類。

### 抽象工廠結構

```java
// 抽象產品族 - 用戶界面元件
public interface Button {
    void render();
    void onClick();
}

public interface CheckBox {
    void render();
    void toggle();
}

public interface TextField {
    void render();
    void setText(String text);
    String getText();
}

// Windows 風格實現
public class WindowsButton implements Button {
    @Override
    public void render() {
        System.out.println("渲染 Windows 風格按鈕");
    }
    
    @Override
    public void onClick() {
        System.out.println("Windows 按鈕點擊事件");
    }
}

public class WindowsCheckBox implements CheckBox {
    private boolean checked = false;
    
    @Override
    public void render() {
        System.out.println("渲染 Windows 風格複選框");
    }
    
    @Override
    public void toggle() {
        checked = !checked;
        System.out.println("Windows 複選框狀態: " + (checked ? "選中" : "未選中"));
    }
}

public class WindowsTextField implements TextField {
    private String text = "";
    
    @Override
    public void render() {
        System.out.println("渲染 Windows 風格文本框");
    }
    
    @Override
    public void setText(String text) {
        this.text = text;
        System.out.println("Windows 文本框設置內容: " + text);
    }
    
    @Override
    public String getText() {
        return text;
    }
}

// macOS 風格實現
public class MacButton implements Button {
    @Override
    public void render() {
        System.out.println("渲染 macOS 風格按鈕");
    }
    
    @Override
    public void onClick() {
        System.out.println("macOS 按鈕點擊事件");
    }
}

public class MacCheckBox implements CheckBox {
    private boolean checked = false;
    
    @Override
    public void render() {
        System.out.println("渲染 macOS 風格複選框");
    }
    
    @Override
    public void toggle() {
        checked = !checked;
        System.out.println("macOS 複選框狀態: " + (checked ? "選中" : "未選中"));
    }
}

public class MacTextField implements TextField {
    private String text = "";
    
    @Override
    public void render() {
        System.out.println("渲染 macOS 風格文本框");
    }
    
    @Override
    public void setText(String text) {
        this.text = text;
        System.out.println("macOS 文本框設置內容: " + text);
    }
    
    @Override
    public String getText() {
        return text;
    }
}

// Linux 風格實現
public class LinuxButton implements Button {
    @Override
    public void render() {
        System.out.println("渲染 Linux 風格按鈕");
    }
    
    @Override
    public void onClick() {
        System.out.println("Linux 按鈕點擊事件");
    }
}

public class LinuxCheckBox implements CheckBox {
    private boolean checked = false;
    
    @Override
    public void render() {
        System.out.println("渲染 Linux 風格複選框");
    }
    
    @Override
    public void toggle() {
        checked = !checked;
        System.out.println("Linux 複選框狀態: " + (checked ? "選中" : "未選中"));
    }
}

public class LinuxTextField implements TextField {
    private String text = "";
    
    @Override
    public void render() {
        System.out.println("渲染 Linux 風格文本框");
    }
    
    @Override
    public void setText(String text) {
        this.text = text;
        System.out.println("Linux 文本框設置內容: " + text);
    }
    
    @Override
    public String getText() {
        return text;
    }
}
```

### 抽象工廠接口和實現

```java
// 抽象工廠接口
public interface GUIFactory {
    Button createButton();
    CheckBox createCheckBox();
    TextField createTextField();
}

// 具體工廠實現
public class WindowsFactory implements GUIFactory {
    @Override
    public Button createButton() {
        return new WindowsButton();
    }
    
    @Override
    public CheckBox createCheckBox() {
        return new WindowsCheckBox();
    }
    
    @Override
    public TextField createTextField() {
        return new WindowsTextField();
    }
}

public class MacFactory implements GUIFactory {
    @Override
    public Button createButton() {
        return new MacButton();
    }
    
    @Override
    public CheckBox createCheckBox() {
        return new MacCheckBox();
    }
    
    @Override
    public TextField createTextField() {
        return new MacTextField();
    }
}

public class LinuxFactory implements GUIFactory {
    @Override
    public Button createButton() {
        return new LinuxButton();
    }
    
    @Override
    public CheckBox createCheckBox() {
        return new LinuxCheckBox();
    }
    
    @Override
    public TextField createTextField() {
        return new LinuxTextField();
    }
}
```

### 工廠註冊器和配置

```java
// 工廠註冊器
public class GUIFactoryRegistry {
    private static final Map<String, GUIFactory> factories = new HashMap<>();
    
    static {
        register("windows", new WindowsFactory());
        register("macos", new MacFactory());
        register("linux", new LinuxFactory());
    }
    
    public static void register(String type, GUIFactory factory) {
        factories.put(type.toLowerCase(), factory);
    }
    
    public static GUIFactory getFactory(String type) {
        GUIFactory factory = factories.get(type.toLowerCase());
        if (factory == null) {
            throw new IllegalArgumentException("不支援的平台類型: " + type);
        }
        return factory;
    }
    
    public static GUIFactory detectPlatform() {
        String osName = System.getProperty("os.name").toLowerCase();
        if (osName.contains("windows")) {
            return getFactory("windows");
        } else if (osName.contains("mac")) {
            return getFactory("macos");
        } else {
            return getFactory("linux");
        }
    }
}

// 應用程序類
public class Application {
    private Button button;
    private CheckBox checkBox;
    private TextField textField;
    
    public Application(GUIFactory factory) {
        this.button = factory.createButton();
        this.checkBox = factory.createCheckBox();
        this.textField = factory.createTextField();
    }
    
    public void createUI() {
        System.out.println("=== 創建用戶界面 ===");
        button.render();
        checkBox.render();
        textField.render();
    }
    
    public void simulateUserInteraction() {
        System.out.println("\n=== 模擬用戶交互 ===");
        button.onClick();
        checkBox.toggle();
        textField.setText("Hello Factory Pattern!");
        System.out.println("文本框內容: " + textField.getText());
    }
}
```

### 抽象工廠使用範例

```java
public class AbstractFactoryDemo {
    public static void main(String[] args) {
        // 方式1: 手動指定平台
        System.out.println("=== 手動指定平台 ===");
        testPlatform("windows");
        testPlatform("macos");
        testPlatform("linux");
        
        // 方式2: 自動檢測平台
        System.out.println("\n=== 自動檢測平台 ===");
        GUIFactory autoFactory = GUIFactoryRegistry.detectPlatform();
        Application autoApp = new Application(autoFactory);
        autoApp.createUI();
        autoApp.simulateUserInteraction();
    }
    
    private static void testPlatform(String platform) {
        System.out.println("\n--- 測試 " + platform.toUpperCase() + " 平台 ---");
        GUIFactory factory = GUIFactoryRegistry.getFactory(platform);
        Application app = new Application(factory);
        app.createUI();
        app.simulateUserInteraction();
    }
}
```

## 4. 現代 Java Factory Pattern 實現

### 使用 Lambda 表達式和函數式接口

```java
import java.util.function.Supplier;
import java.util.function.Function;

// 函數式工廠接口
@FunctionalInterface
public interface VehicleSupplier extends Supplier<Vehicle> {
}

// 函數式工廠實現
public class FunctionalVehicleFactory {
    private static final Map<VehicleType, Function<String, Vehicle>> factoryMap = Map.of(
        VehicleType.CAR, Car::new,
        VehicleType.MOTORCYCLE, Motorcycle::new,
        VehicleType.TRUCK, brand -> new Truck(brand, 5)
    );
    
    public static Vehicle createVehicle(VehicleType type, String brand) {
        Function<String, Vehicle> factory = factoryMap.get(type);
        if (factory == null) {
            throw new IllegalArgumentException("不支援的車輛類型: " + type);
        }
        return factory.apply(brand);
    }
    
    // 使用 Supplier 的工廠方法
    public static Vehicle createVehicle(VehicleSupplier supplier) {
        return supplier.get();
    }
}

// 使用範例
public class FunctionalFactoryDemo {
    public static void main(String[] args) {
        // 使用 Map-based 工廠
        Vehicle car = FunctionalVehicleFactory.createVehicle(VehicleType.CAR, "Tesla");
        
        // 使用 Lambda 表達式
        Vehicle motorcycle = FunctionalVehicleFactory.createVehicle(() -> new Motorcycle("Yamaha"));
        
        // 使用方法引用
        Vehicle truck = FunctionalVehicleFactory.createVehicle(() -> new Truck("Mercedes", 15));
        
        // 測試車輛
        Stream.of(car, motorcycle, truck)
              .forEach(vehicle -> {
                  vehicle.start();
                  vehicle.accelerate();
                  vehicle.stop();
                  System.out.println("---");
              });
    }
}
```

### 使用 Enum 的工廠模式

```java
// 增強的枚舉工廠
public enum VehicleFactoryEnum {
    CAR("汽車") {
        @Override
        public Vehicle create(String brand, Object... params) {
            return new Car(brand);
        }
    },
    
    MOTORCYCLE("機車") {
        @Override
        public Vehicle create(String brand, Object... params) {
            return new Motorcycle(brand);
        }
    },
    
    TRUCK("卡車") {
        @Override
        public Vehicle create(String brand, Object... params) {
            if (params.length > 0 && params[0] instanceof Integer) {
                return new Truck(brand, (Integer) params[0]);
            }
            return new Truck(brand, 5); // 預設載重
        }
    };
    
    private final String description;
    
    VehicleFactoryEnum(String description) {
        this.description = description;
    }
    
    public abstract Vehicle create(String brand, Object... params);
    
    public String getDescription() {
        return description;
    }
    
    // 靜態工廠方法
    public static Vehicle createVehicle(String type, String brand, Object... params) {
        try {
            VehicleFactoryEnum factory = VehicleFactoryEnum.valueOf(type.toUpperCase());
            return factory.create(brand, params);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("不支援的車輛類型: " + type);
        }
    }
}
```

## 5. JDK / Spring 真實案例

JDK 內建大量工廠方法，理解它們有助於掌握模式的本質：

- **`Calendar.getInstance()`** — 根據 locale 回傳 `JapaneseImperialCalendar` 或 `GregorianCalendar`，呼叫端不感知具體型別。
- **`NumberFormat.getInstance()`** — 同樣根據 locale 返回對應的 NumberFormat 實作，多態透明。
- **Spring `BeanFactory.getBean()`** — 本質上是工廠方法：client 傳入 type 或 name，容器決定回傳哪個實例，與 GoF 工廠方法如出一轍。

## 5b. Spring Boot 中的 Factory Pattern

### Spring Configuration Factory

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.context.properties.ConfigurationProperties;

// 配置屬性
@ConfigurationProperties(prefix = "app.notification")
public class NotificationProperties {
    private String provider = "email";
    private String apiKey;
    private String baseUrl;
    
    // getters and setters
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
}

// 通知服務接口
public interface NotificationService {
    void sendNotification(String recipient, String message);
    boolean isAvailable();
}

// 具體實現
@Component
public class EmailNotificationService implements NotificationService {
    private final String apiKey;
    
    public EmailNotificationService(@Value("${app.notification.api-key}") String apiKey) {
        this.apiKey = apiKey;
    }
    
    @Override
    public void sendNotification(String recipient, String message) {
        System.out.println("發送郵件到 " + recipient + ": " + message);
        // 實際郵件發送邏輯
    }
    
    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty();
    }
}

@Component
public class SmsNotificationService implements NotificationService {
    private final String apiKey;
    
    public SmsNotificationService(@Value("${app.notification.api-key}") String apiKey) {
        this.apiKey = apiKey;
    }
    
    @Override
    public void sendNotification(String recipient, String message) {
        System.out.println("發送短信到 " + recipient + ": " + message);
        // 實際短信發送邏輯
    }
    
    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty();
    }
}

@Component
public class PushNotificationService implements NotificationService {
    private final String baseUrl;
    
    public PushNotificationService(@Value("${app.notification.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    @Override
    public void sendNotification(String recipient, String message) {
        System.out.println("發送推送通知到 " + recipient + ": " + message);
        // 實際推送通知邏輯
    }
    
    @Override
    public boolean isAvailable() {
        return baseUrl != null && !baseUrl.isEmpty();
    }
}
```

### Spring Factory Configuration

```java
// 通知工廠接口
public interface NotificationFactory {
    NotificationService createNotificationService(String type);
    List<NotificationService> getAllAvailableServices();
}

// Spring 管理的工廠實現
@Component
public class SpringNotificationFactory implements NotificationFactory {
    
    private final Map<String, NotificationService> services;
    
    public SpringNotificationFactory(List<NotificationService> notificationServices) {
        this.services = notificationServices.stream()
            .collect(Collectors.toMap(
                service -> service.getClass().getSimpleName().toLowerCase().replace("notificationservice", ""),
                Function.identity()
            ));
    }
    
    @Override
    public NotificationService createNotificationService(String type) {
        NotificationService service = services.get(type.toLowerCase());
        if (service == null) {
            throw new IllegalArgumentException("不支援的通知類型: " + type);
        }
        if (!service.isAvailable()) {
            throw new IllegalStateException("通知服務不可用: " + type);
        }
        return service;
    }
    
    @Override
    public List<NotificationService> getAllAvailableServices() {
        return services.values().stream()
            .filter(NotificationService::isAvailable)
            .collect(Collectors.toList());
    }
}

// 配置類
@Configuration
@EnableConfigurationProperties(NotificationProperties.class)
public class NotificationConfig {
    
    @Bean
    @Primary
    public NotificationService primaryNotificationService(
            NotificationProperties properties,
            NotificationFactory factory) {
        return factory.createNotificationService(properties.getProvider());
    }
    
    @Bean
    @Profile("development")
    public NotificationService devNotificationService() {
        return new NotificationService() {
            @Override
            public void sendNotification(String recipient, String message) {
                System.out.println("[DEV] 模擬通知 - 收件人: " + recipient + ", 消息: " + message);
            }
            
            @Override
            public boolean isAvailable() {
                return true;
            }
        };
    }
}
```

### Spring Boot Factory 服務

```java
// 通知管理器服務
@Service
public class NotificationManager {
    private final NotificationFactory notificationFactory;
    private final NotificationProperties properties;
    
    public NotificationManager(NotificationFactory notificationFactory, 
                             NotificationProperties properties) {
        this.notificationFactory = notificationFactory;
        this.properties = properties;
    }
    
    public void sendNotification(String type, String recipient, String message) {
        try {
            NotificationService service = notificationFactory.createNotificationService(type);
            service.sendNotification(recipient, message);
        } catch (Exception e) {
            // 降級到主要通知服務
            NotificationService fallbackService = 
                notificationFactory.createNotificationService(properties.getProvider());
            fallbackService.sendNotification(recipient, 
                "原通知失敗，改用 " + properties.getProvider() + ": " + message);
        }
    }
    
    public void sendBroadcast(String message) {
        List<NotificationService> availableServices = 
            notificationFactory.getAllAvailableServices();
        
        availableServices.parallelStream()
            .forEach(service -> {
                try {
                    service.sendNotification("broadcast", message);
                } catch (Exception e) {
                    System.err.println("廣播通知失敗: " + e.getMessage());
                }
            });
    }
}

// 控制器使用範例
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationManager notificationManager;
    
    public NotificationController(NotificationManager notificationManager) {
        this.notificationManager = notificationManager;
    }
    
    @PostMapping("/send")
    public ResponseEntity<String> sendNotification(
            @RequestParam String type,
            @RequestParam String recipient,
            @RequestParam String message) {
        try {
            notificationManager.sendNotification(type, recipient, message);
            return ResponseEntity.ok("通知發送成功");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("通知發送失敗: " + e.getMessage());
        }
    }
    
    @PostMapping("/broadcast")
    public ResponseEntity<String> broadcast(@RequestParam String message) {
        notificationManager.sendBroadcast(message);
        return ResponseEntity.ok("廣播通知已發送");
    }
}
```

## 6. 企業級 Factory Pattern 實現

### 數據源工廠

```java
// 數據源類型
public enum DataSourceType {
    MYSQL("MySQL 數據庫"),
    POSTGRESQL("PostgreSQL 數據庫"),
    ORACLE("Oracle 數據庫"),
    MONGODB("MongoDB 數據庫"),
    REDIS("Redis 緩存");
    
    private final String description;
    
    DataSourceType(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}

// 數據源配置
public class DataSourceConfig {
    private String url;
    private String username;
    private String password;
    private String driverClassName;
    private int maxPoolSize = 20;
    private int minPoolSize = 5;
    private long connectionTimeout = 30000;
    
    // 建構器模式
    public static class Builder {
        private final DataSourceConfig config = new DataSourceConfig();
        
        public Builder url(String url) {
            config.url = url;
            return this;
        }
        
        public Builder username(String username) {
            config.username = username;
            return this;
        }
        
        public Builder password(String password) {
            config.password = password;
            return this;
        }
        
        public Builder driverClassName(String driverClassName) {
            config.driverClassName = driverClassName;
            return this;
        }
        
        public Builder maxPoolSize(int maxPoolSize) {
            config.maxPoolSize = maxPoolSize;
            return this;
        }
        
        public Builder minPoolSize(int minPoolSize) {
            config.minPoolSize = minPoolSize;
            return this;
        }
        
        public Builder connectionTimeout(long connectionTimeout) {
            config.connectionTimeout = connectionTimeout;
            return this;
        }
        
        public DataSourceConfig build() {
            if (config.url == null) {
                throw new IllegalArgumentException("數據源 URL 不能為空");
            }
            return config;
        }
    }
    
    // getters
    public String getUrl() { return url; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getDriverClassName() { return driverClassName; }
    public int getMaxPoolSize() { return maxPoolSize; }
    public int getMinPoolSize() { return minPoolSize; }
    public long getConnectionTimeout() { return connectionTimeout; }
}

// 抽象數據源工廠
public abstract class DataSourceFactory {
    protected final DataSourceConfig config;
    
    public DataSourceFactory(DataSourceConfig config) {
        this.config = config;
    }
    
    public abstract DataSource createDataSource();
    public abstract boolean testConnection();
    
    // 模板方法
    public DataSource createAndTestDataSource() {
        DataSource dataSource = createDataSource();
        if (!testConnection()) {
            throw new RuntimeException("數據源連接測試失敗");
        }
        return dataSource;
    }
}

// 具體數據源工廠實現
public class MySQLDataSourceFactory extends DataSourceFactory {
    public MySQLDataSourceFactory(DataSourceConfig config) {
        super(config);
    }
    
    @Override
    public DataSource createDataSource() {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(config.getUrl());
        hikariConfig.setUsername(config.getUsername());
        hikariConfig.setPassword(config.getPassword());
        hikariConfig.setDriverClassName("com.mysql.cj.jdbc.Driver");
        hikariConfig.setMaximumPoolSize(config.getMaxPoolSize());
        hikariConfig.setMinimumIdle(config.getMinPoolSize());
        hikariConfig.setConnectionTimeout(config.getConnectionTimeout());
        
        return new HikariDataSource(hikariConfig);
    }
    
    @Override
    public boolean testConnection() {
        try (Connection conn = createDataSource().getConnection()) {
            return conn.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }
}

public class PostgreSQLDataSourceFactory extends DataSourceFactory {
    public PostgreSQLDataSourceFactory(DataSourceConfig config) {
        super(config);
    }
    
    @Override
    public DataSource createDataSource() {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(config.getUrl());
        hikariConfig.setUsername(config.getUsername());
        hikariConfig.setPassword(config.getPassword());
        hikariConfig.setDriverClassName("org.postgresql.Driver");
        hikariConfig.setMaximumPoolSize(config.getMaxPoolSize());
        hikariConfig.setMinimumIdle(config.getMinPoolSize());
        hikariConfig.setConnectionTimeout(config.getConnectionTimeout());
        
        return new HikariDataSource(hikariConfig);
    }
    
    @Override
    public boolean testConnection() {
        try (Connection conn = createDataSource().getConnection()) {
            return conn.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }
}
```

### 企業級工廠管理器

```java
// 數據源工廠管理器
@Component
public class DataSourceFactoryManager {
    private static final Map<DataSourceType, Class<? extends DataSourceFactory>> factoryRegistry = 
        Map.of(
            DataSourceType.MYSQL, MySQLDataSourceFactory.class,
            DataSourceType.POSTGRESQL, PostgreSQLDataSourceFactory.class
        );
    
    private final ApplicationContext applicationContext;
    
    public DataSourceFactoryManager(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }
    
    public DataSourceFactory createFactory(DataSourceType type, DataSourceConfig config) {
        Class<? extends DataSourceFactory> factoryClass = factoryRegistry.get(type);
        if (factoryClass == null) {
            throw new IllegalArgumentException("不支援的數據源類型: " + type);
        }
        
        try {
            Constructor<? extends DataSourceFactory> constructor = 
                factoryClass.getConstructor(DataSourceConfig.class);
            return constructor.newInstance(config);
        } catch (Exception e) {
            throw new RuntimeException("創建數據源工廠失敗", e);
        }
    }
    
    @Cacheable("dataSources")
    public DataSource getDataSource(DataSourceType type, DataSourceConfig config) {
        DataSourceFactory factory = createFactory(type, config);
        return factory.createAndTestDataSource();
    }
}
```

## 7. 工廠模式的最佳實踐

### 錯誤處理和驗證

```java
// 增強的工廠實現，包含完整的錯誤處理
public class RobustVehicleFactory {
    private static final Logger logger = LoggerFactory.getLogger(RobustVehicleFactory.class);
    
    // 產品驗證器
    private static final Map<VehicleType, Predicate<String>> validators = Map.of(
        VehicleType.CAR, brand -> brand != null && brand.length() > 2,
        VehicleType.MOTORCYCLE, brand -> brand != null && brand.length() > 1,
        VehicleType.TRUCK, brand -> brand != null && brand.length() > 3
    );
    
    public static Vehicle createVehicle(VehicleType type, String brand) {
        return createVehicle(type, brand, null);
    }
    
    public static Vehicle createVehicle(VehicleType type, String brand, Integer capacity) {
        // 輸入驗證
        validateInputs(type, brand, capacity);
        
        try {
            Vehicle vehicle = createVehicleInternal(type, brand, capacity);
            logger.info("成功創建車輛: {} - {}", type, brand);
            return vehicle;
        } catch (Exception e) {
            logger.error("創建車輛失敗: {} - {}", type, brand, e);
            throw new VehicleCreationException("創建車輛失敗: " + e.getMessage(), e);
        }
    }
    
    private static void validateInputs(VehicleType type, String brand, Integer capacity) {
        if (type == null) {
            throw new IllegalArgumentException("車輛類型不能為空");
        }
        
        Predicate<String> validator = validators.get(type);
        if (validator != null && !validator.test(brand)) {
            throw new IllegalArgumentException("品牌名稱不符合要求: " + brand);
        }
        
        if (type == VehicleType.TRUCK && (capacity == null || capacity <= 0)) {
            throw new IllegalArgumentException("卡車必須指定有效的載重容量");
        }
    }
    
    private static Vehicle createVehicleInternal(VehicleType type, String brand, Integer capacity) {
        switch (type) {
            case CAR:
                return new Car(brand);
            case MOTORCYCLE:
                return new Motorcycle(brand);
            case TRUCK:
                return new Truck(brand, capacity != null ? capacity : 5);
            default:
                throw new UnsupportedOperationException("不支援的車輛類型: " + type);
        }
    }
}

// 自定義異常
public class VehicleCreationException extends RuntimeException {
    public VehicleCreationException(String message) {
        super(message);
    }
    
    public VehicleCreationException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### 工廠模式性能優化

```java
// 緩存優化的工廠
public class CachedVehicleFactory {
    private static final Cache<String, Vehicle> vehicleCache = 
        Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(1, TimeUnit.HOURS)
                .build();
    
    public static Vehicle createVehicle(VehicleType type, String brand) {
        String cacheKey = type + ":" + brand;
        
        return vehicleCache.get(cacheKey, key -> {
            // 只有當緩存中沒有時才創建新實例
            return RobustVehicleFactory.createVehicle(type, brand);
        });
    }
    
    // 原型模式結合 - 用於昂貴對象
    public static Vehicle createVehicleWithPrototype(VehicleType type, String brand) {
        Vehicle prototype = createVehicle(type, brand);
        try {
            return (Vehicle) prototype.clone(); // 需要實現 Cloneable
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException("克隆車輛失敗", e);
        }
    }
    
    // 清理緩存
    public static void clearCache() {
        vehicleCache.invalidateAll();
    }
    
    // 獲取緩存統計
    public static void printCacheStats() {
        CacheStats stats = vehicleCache.stats();
        System.out.printf("緩存統計 - 命中率: %.2f%%, 命中次數: %d, 未命中次數: %d%n",
            stats.hitRate() * 100, stats.hitCount(), stats.missCount());
    }
}
```

## 8. 工廠模式的反模式和注意事項

### 常見反模式

```java
// ❌ 反模式 1: 工廠類過於龐大
public class BadGiantFactory {
    // 違背了單一職責原則
    public Object createAnything(String type, String subType, Map<String, Object> params) {
        if ("vehicle".equals(type)) {
            if ("car".equals(subType)) {
                // 100 行車輛創建邏輯
            } else if ("motorcycle".equals(subType)) {
                // 80 行機車創建邏輯
            }
        } else if ("document".equals(type)) {
            if ("word".equals(subType)) {
                // 120 行文檔創建邏輯
            }
        }
        // ... 更多類型
        return null;
    }
}

// ✅ 正確做法: 按職責分離工廠
public interface SpecializedFactory<T> {
    T create(String type, Map<String, Object> params);
}

public class VehicleFactory implements SpecializedFactory<Vehicle> {
    @Override
    public Vehicle create(String type, Map<String, Object> params) {
        // 專注於車輛創建
        return null;
    }
}

public class DocumentFactory implements SpecializedFactory<Document> {
    @Override
    public Document create(String type, Map<String, Object> params) {
        // 專注於文檔創建
        return null;
    }
}
```

```java
// ❌ 反模式 2: 直接在工廠中硬編碼依賴
public class BadDependencyFactory {
    public UserService createUserService() {
        // 硬編碼依賴，難以測試和擴展
        UserRepository repo = new DatabaseUserRepository();
        EmailService email = new SmtpEmailService();
        return new UserService(repo, email);
    }
}

// ✅ 正確做法: 使用依賴注入
@Component
public class UserServiceFactory {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    public UserServiceFactory(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    
    public UserService createUserService() {
        return new UserService(userRepository, emailService);
    }
}
```

### 最佳實踐總結

1. **單一職責**: 每個工廠只負責創建一類相關的對象
2. **開閉原則**: 對擴展開放，對修改關閉
3. **依賴注入**: 在 Spring 環境中優先使用依賴注入
4. **異常處理**: 提供清晰的錯誤信息和恢復機制
5. **性能考慮**: 對於昂貴對象使用緩存或對象池
6. **類型安全**: 使用枚舉和泛型提高類型安全
7. **可測試性**: 設計時考慮單元測試的便利性

### 現代 Java 做法：Map 注入取代繼承工廠

Java 現代做法：`Map<String, Strategy> beans` 注入（Spring 自動把所有 `Strategy` 實作 bean 放入 Map，key 是 bean name）取代繼承工廠：

```java
@Service
public class NotificationService {
    private final Map<String, NotificationSender> senders;  // Spring 自動注入

    public NotificationService(Map<String, NotificationSender> senders) {
        this.senders = senders;
    }

    public void send(String type, String message) {
        senders.getOrDefault(type, senders.get("email")).send(message);
    }
}
```

這個做法不需要工廠類別，新增一個 `NotificationSender` 實作並標注 `@Component` 即可自動納入 Map，完全符合開閉原則。

## 9. 工廠模式 vs 其他創建型模式

### Factory vs Builder

```java
// Factory: 適合簡單對象創建
Vehicle car = VehicleFactory.createVehicle(VehicleType.CAR, "BMW");

// Builder: 適合複雜對象創建
Car complexCar = new Car.Builder()
    .brand("BMW")
    .model("X5")
    .year(2023)
    .color("Black")
    .engine(new Engine("V8", 400))
    .transmission("Automatic")
    .build();
```

### Factory vs Singleton

```java
// Factory: 每次調用創建新實例
public class VehicleFactory {
    public static Vehicle createVehicle() {
        return new Car("Default"); // 新實例
    }
}

// Singleton: 確保只有一個實例
public class ConfigurationManager {
    private static ConfigurationManager instance;
    
    public static ConfigurationManager getInstance() {
        if (instance == null) {
            synchronized (ConfigurationManager.class) {
                if (instance == null) {
                    instance = new ConfigurationManager();
                }
            }
        }
        return instance; // 相同實例
    }
}
```

## 10. 測試策略

### 工廠模式單元測試

```java
@ExtendWith(MockitoExtension.class)
class VehicleFactoryTest {
    
    @Test
    void should_create_car_when_type_is_car() {
        // Given
        VehicleType type = VehicleType.CAR;
        String brand = "BMW";
        
        // When
        Vehicle vehicle = VehicleFactory.createVehicle(type, brand);
        
        // Then
        assertThat(vehicle).isInstanceOf(Car.class);
        assertThat(vehicle.getType()).contains("BMW");
    }
    
    @Test
    void should_create_truck_with_capacity() {
        // Given
        VehicleType type = VehicleType.TRUCK;
        String brand = "Volvo";
        int capacity = 10;
        
        // When
        Vehicle vehicle = VehicleFactory.createVehicle(type, brand, capacity);
        
        // Then
        assertThat(vehicle).isInstanceOf(Truck.class);
        assertThat(vehicle.getType()).contains("10t");
    }
    
    @Test
    void should_throw_exception_when_invalid_type() {
        // Given
        String invalidType = "invalid";
        String brand = "BMW";
        
        // When & Then
        assertThatThrownBy(() -> VehicleFactory.createVehicle(invalidType, brand))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("不支援的車輛類型");
    }
    
    @Test
    void should_throw_exception_when_truck_without_capacity() {
        // Given
        VehicleType type = VehicleType.TRUCK;
        String brand = "Volvo";
        
        // When & Then
        assertThatThrownBy(() -> VehicleFactory.createVehicle(type, brand))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("卡車必須指定載重容量");
    }
}

// Spring Boot 集成測試
@SpringBootTest
class NotificationFactoryIntegrationTest {
    
    @Autowired
    private NotificationFactory notificationFactory;
    
    @Test
    void should_create_email_service_when_configured() {
        // When
        NotificationService service = notificationFactory.createNotificationService("email");
        
        // Then
        assertThat(service).isInstanceOf(EmailNotificationService.class);
        assertThat(service.isAvailable()).isTrue();
    }
    
    @Test
    void should_return_all_available_services() {
        // When
        List<NotificationService> services = notificationFactory.getAllAvailableServices();
        
        // Then
        assertThat(services).isNotEmpty();
        assertThat(services).allMatch(NotificationService::isAvailable);
    }
}
```

## 11. 總結

### 適用場景

1. **簡單工廠模式**:
   - 產品類較少且相對穩定
   - 客戶端只需要知道傳入工廠類的參數
   - 不需要頻繁擴展產品類

2. **工廠方法模式**:
   - 需要靈活的產品創建機制
   - 產品類可能會頻繁擴展
   - 需要遵循開閉原則

3. **抽象工廠模式**:
   - 需要創建一系列相關的產品
   - 系統需要在多個產品族中切換
   - 需要確保產品族的一致性

### 關鍵要點

- **職責分離**: 將對象創建邏輯與業務邏輯分離
- **擴展性**: 新增產品類型時不需要修改現有代碼
- **一致性**: 通過工廠確保對象創建的一致性
- **可測試性**: 便於進行單元測試和模擬

### Spring Boot 集成優勢

- **依賴注入**: 自動管理工廠和產品的依賴關係
- **配置驅動**: 通過配置文件動態選擇實現
- **AOP 支持**: 可以在對象創建過程中添加橫切關注點
- **自動配置**: 基於條件自動配置合適的工廠實現

工廠模式是企業級應用開發中最重要的設計模式之一，合理使用可以大大提高代碼的可維護性、可擴展性和可測試性。在 Spring Boot 環境中，結合依賴注入和自動配置，可以構建出更加靈活和強大的應用系統。