---
title: "SOLID 設計原則完整指南：物件導向程式設計的五大核心原則"
author: Bill.Lin
date: 2021-07-08T21:20:39+08:00
draft: false
tags: ["SOLID", "Design Principles", "OOP", "Software Architecture", "Clean Code", "Best Practices"]
Description: "深入解析 SOLID 五大設計原則，包含單一職責、開閉原則、里氏替換、介面隔離與依賴反轉的理論基礎與實戰應用"
Categories: ["Architecture"]
DisableComments: false
---

## 概述

SOLID 是物件導向程式設計和軟體架構設計中五個核心設計原則的縮寫，由 Robert C. Martin（Uncle Bob）在 21 世紀初期提出。這些原則旨在讓軟體設計更加容易理解、靈活且可維護。

SOLID 原則不僅適用於物件導向程式設計，也是現代軟體架構的基石，從微服務設計到 Clean Architecture 都深受其影響。

## SOLID 原則概覽

| 首字母 | 英文原則名稱 | 中文名稱 | 核心概念 |
|--------|--------------|-----------|----------|
| **S** | Single Responsibility Principle | 單一職責原則 | 一個類別應該只有一個改變的理由 |
| **O** | Open/Closed Principle | 開閉原則 | 對擴展開放，對修改封閉 |
| **L** | Liskov Substitution Principle | 里氏替換原則 | 子類別應該能完全替換父類別 |
| **I** | Interface Segregation Principle | 介面隔離原則 | 客戶端不應該依賴它不需要的介面 |
| **D** | Dependency Inversion Principle | 依賴反轉原則 | 依賴於抽象而非具體實作 |

## 1. Single Responsibility Principle (SRP) - 單一職責原則

### 定義
> 一個類別應該只有一個引起它變化的原因

### 核心概念
- **高內聚性**：類別內部的方法和屬性應該為同一個目標服務
- **低耦合性**：減少類別之間的依賴關係
- **明確責任**：每個類別都應該有明確且單一的職責

### 違反 SRP 的範例

```java
// ❌ 違反 SRP：一個類別承擔多種職責
public class User {
    private String name;
    private String email;
    
    // 用戶資料驗證職責
    public boolean validateEmail(String email) {
        return email.contains("@") && email.contains(".");
    }
    
    // 用戶持久化職責
    public void saveToDatabase() {
        // 資料庫存儲邏輯
        System.out.println("儲存用戶到資料庫");
    }
    
    // 用戶通知職責
    public void sendWelcomeEmail() {
        // 郵件發送邏輯
        System.out.println("發送歡迎郵件");
    }
    
    // 用戶報表職責
    public String generateUserReport() {
        return "用戶報表: " + name + " - " + email;
    }
}
```

### 遵循 SRP 的重構範例

```java
// ✅ 遵循 SRP：職責分離
// 1. 用戶實體類別（僅負責用戶資料）
public class User {
    private String name;
    private String email;
    
    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }
    
    // Getter and Setter methods
    public String getName() { return name; }
    public String getEmail() { return email; }
    public void setName(String name) { this.name = name; }
    public void setEmail(String email) { this.email = email; }
}

// 2. 用戶驗證服務（僅負責驗證邏輯）
@Service
public class UserValidator {
    
    public boolean validateEmail(String email) {
        return email != null && 
               email.contains("@") && 
               email.contains(".") &&
               email.length() > 5;
    }
    
    public boolean validateName(String name) {
        return name != null && 
               name.trim().length() > 0 && 
               name.length() <= 50;
    }
    
    public ValidationResult validateUser(User user) {
        ValidationResult result = new ValidationResult();
        
        if (!validateName(user.getName())) {
            result.addError("用戶名格式無效");
        }
        
        if (!validateEmail(user.getEmail())) {
            result.addError("郵箱格式無效");
        }
        
        return result;
    }
}

// 3. 用戶持久化服務（僅負責資料存取）
@Repository
public class UserRepository {
    
    public void save(User user) {
        // 資料庫存儲邏輯
        System.out.println("儲存用戶到資料庫: " + user.getName());
    }
    
    public User findByEmail(String email) {
        // 查詢邏輯
        return new User("找到的用戶", email);
    }
    
    public List<User> findAll() {
        // 查詢所有用戶
        return Arrays.asList(new User("用戶1", "user1@example.com"));
    }
}

// 4. 用戶通知服務（僅負責通知邏輯）
@Service
public class UserNotificationService {
    
    public void sendWelcomeEmail(User user) {
        System.out.println("發送歡迎郵件給: " + user.getEmail());
    }
    
    public void sendPasswordResetEmail(User user) {
        System.out.println("發送密碼重設郵件給: " + user.getEmail());
    }
    
    public void sendAccountActivationEmail(User user) {
        System.out.println("發送帳戶啟用郵件給: " + user.getEmail());
    }
}

// 5. 用戶報表服務（僅負責報表生成）
@Service
public class UserReportService {
    
    public String generateUserReport(User user) {
        return String.format("用戶報表\n姓名: %s\n郵箱: %s\n生成時間: %s", 
                           user.getName(), 
                           user.getEmail(), 
                           LocalDateTime.now());
    }
    
    public String generateUsersListReport(List<User> users) {
        StringBuilder report = new StringBuilder("用戶列表報表\n");
        users.forEach(user -> 
            report.append(String.format("- %s (%s)\n", user.getName(), user.getEmail()))
        );
        return report.toString();
    }
}

// 6. 用戶服務協調器（組合各種服務）
@Service
public class UserService {
    
    private final UserValidator userValidator;
    private final UserRepository userRepository;
    private final UserNotificationService notificationService;
    
    public UserService(UserValidator userValidator, 
                      UserRepository userRepository,
                      UserNotificationService notificationService) {
        this.userValidator = userValidator;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }
    
    public Result<User> createUser(String name, String email) {
        User user = new User(name, email);
        
        // 驗證用戶資料
        ValidationResult validation = userValidator.validateUser(user);
        if (!validation.isValid()) {
            return Result.failure("驗證失敗: " + validation.getErrors());
        }
        
        // 儲存用戶
        userRepository.save(user);
        
        // 發送歡迎郵件
        notificationService.sendWelcomeEmail(user);
        
        return Result.success(user);
    }
}
```

### SRP 的好處

1. **降低複雜度**：每個類別的責任明確，易於理解
2. **提高可讀性**：程式碼結構清晰，功能劃分明確
3. **增強可維護性**：修改某個功能時，只需要關注特定的類別
4. **提升可測試性**：職責單一的類別更容易進行單元測試
5. **促進重用性**：功能獨立的類別可以在不同場景中重複使用

## 2. Open/Closed Principle (OCP) - 開閉原則

### 定義
> 軟體實體（類別、模組、函數等）應該對擴展開放，對修改封閉

### 核心概念
- **對擴展開放**：可以透過新增程式碼來擴展功能
- **對修改封閉**：不應該修改現有的程式碼
- **策略模式**：透過抽象介面實現不同的實作策略

### 違反 OCP 的範例

```java
// ❌ 違反 OCP：每次新增形狀都需要修改計算器類別
public class AreaCalculator {
    
    public double calculateArea(Object shape) {
        if (shape instanceof Rectangle) {
            Rectangle rectangle = (Rectangle) shape;
            return rectangle.getWidth() * rectangle.getHeight();
        } else if (shape instanceof Circle) {
            Circle circle = (Circle) shape;
            return Math.PI * circle.getRadius() * circle.getRadius();
        } else if (shape instanceof Triangle) {  // 新增三角形需要修改此方法
            Triangle triangle = (Triangle) shape;
            return 0.5 * triangle.getBase() * triangle.getHeight();
        }
        // 每次新增新形狀都需要修改這裡
        throw new IllegalArgumentException("不支援的形狀類型");
    }
}
```

### 遵循 OCP 的重構範例

```java
// ✅ 遵循 OCP：定義抽象介面
public interface Shape {
    double calculateArea();
    String getShapeType();
}

// 具體實作 - 矩形
public class Rectangle implements Shape {
    private double width;
    private double height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double calculateArea() {
        return width * height;
    }
    
    @Override
    public String getShapeType() {
        return "矩形";
    }
    
    // Getter methods
    public double getWidth() { return width; }
    public double getHeight() { return height; }
}

// 具體實作 - 圓形
public class Circle implements Shape {
    private double radius;
    
    public Circle(double radius) {
        this.radius = radius;
    }
    
    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public String getShapeType() {
        return "圓形";
    }
    
    public double getRadius() { return radius; }
}

// 具體實作 - 三角形（新增時無需修改現有程式碼）
public class Triangle implements Shape {
    private double base;
    private double height;
    
    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }
    
    @Override
    public double calculateArea() {
        return 0.5 * base * height;
    }
    
    @Override
    public String getShapeType() {
        return "三角形";
    }
    
    public double getBase() { return base; }
    public double getHeight() { return height; }
}

// 新增多邊形（無需修改現有程式碼）
public class Polygon implements Shape {
    private List<Point> vertices;
    
    public Polygon(List<Point> vertices) {
        this.vertices = vertices;
    }
    
    @Override
    public double calculateArea() {
        // 使用鞋帶公式計算多邊形面積
        double area = 0;
        int n = vertices.size();
        
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            area += vertices.get(i).getX() * vertices.get(j).getY();
            area -= vertices.get(j).getX() * vertices.get(i).getY();
        }
        
        return Math.abs(area) / 2.0;
    }
    
    @Override
    public String getShapeType() {
        return "多邊形";
    }
}

// 面積計算器（無需修改，支援所有 Shape 實作）
@Service
public class AreaCalculator {
    
    public double calculateArea(Shape shape) {
        return shape.calculateArea();
    }
    
    public List<AreaReport> calculateMultipleAreas(List<Shape> shapes) {
        return shapes.stream()
                .map(shape -> new AreaReport(
                    shape.getShapeType(),
                    shape.calculateArea()
                ))
                .collect(Collectors.toList());
    }
    
    public double calculateTotalArea(List<Shape> shapes) {
        return shapes.stream()
                .mapToDouble(Shape::calculateArea)
                .sum();
    }
}

// 形狀工廠（支援擴展新形狀）
@Component
public class ShapeFactory {
    
    public Shape createRectangle(double width, double height) {
        return new Rectangle(width, height);
    }
    
    public Shape createCircle(double radius) {
        return new Circle(radius);
    }
    
    public Shape createTriangle(double base, double height) {
        return new Triangle(base, height);
    }
    
    public Shape createPolygon(List<Point> vertices) {
        return new Polygon(vertices);
    }
}

// 使用範例
@RestController
@RequestMapping("/shapes")
public class ShapeController {
    
    private final AreaCalculator areaCalculator;
    private final ShapeFactory shapeFactory;
    
    public ShapeController(AreaCalculator areaCalculator, ShapeFactory shapeFactory) {
        this.areaCalculator = areaCalculator;
        this.shapeFactory = shapeFactory;
    }
    
    @PostMapping("/rectangle/area")
    public AreaResponse calculateRectangleArea(@RequestBody RectangleRequest request) {
        Shape rectangle = shapeFactory.createRectangle(request.getWidth(), request.getHeight());
        double area = areaCalculator.calculateArea(rectangle);
        return new AreaResponse(rectangle.getShapeType(), area);
    }
    
    @PostMapping("/circle/area")
    public AreaResponse calculateCircleArea(@RequestBody CircleRequest request) {
        Shape circle = shapeFactory.createCircle(request.getRadius());
        double area = areaCalculator.calculateArea(circle);
        return new AreaResponse(circle.getShapeType(), area);
    }
}
```

### 進階應用：策略模式與工廠模式結合

```java
// 折扣策略介面
public interface DiscountStrategy {
    double calculateDiscount(double originalPrice);
    String getStrategyName();
}

// 具體折扣策略
@Component("regular")
public class RegularCustomerDiscount implements DiscountStrategy {
    @Override
    public double calculateDiscount(double originalPrice) {
        return originalPrice * 0.05; // 5% 折扣
    }
    
    @Override
    public String getStrategyName() {
        return "一般客戶折扣";
    }
}

@Component("vip")
public class VipCustomerDiscount implements DiscountStrategy {
    @Override
    public double calculateDiscount(double originalPrice) {
        return originalPrice * 0.15; // 15% 折扣
    }
    
    @Override
    public String getStrategyName() {
        return "VIP 客戶折扣";
    }
}

@Component("premium")
public class PremiumCustomerDiscount implements DiscountStrategy {
    @Override
    public double calculateDiscount(double originalPrice) {
        return originalPrice * 0.25; // 25% 折扣
    }
    
    @Override
    public String getStrategyName() {
        return "尊享客戶折扣";
    }
}

// 折扣計算器（對修改封閉，對擴展開放）
@Service
public class DiscountCalculator {
    
    private final Map<String, DiscountStrategy> strategies;
    
    public DiscountCalculator(Map<String, DiscountStrategy> strategies) {
        this.strategies = strategies;
    }
    
    public DiscountResult calculateDiscount(String customerType, double originalPrice) {
        DiscountStrategy strategy = strategies.get(customerType);
        
        if (strategy == null) {
            throw new IllegalArgumentException("不支援的客戶類型: " + customerType);
        }
        
        double discountAmount = strategy.calculateDiscount(originalPrice);
        double finalPrice = originalPrice - discountAmount;
        
        return new DiscountResult(
            strategy.getStrategyName(),
            originalPrice,
            discountAmount,
            finalPrice
        );
    }
}
```

## 3. Liskov Substitution Principle (LSP) - 里氏替換原則

### 定義
> 子類別必須能夠替換其父類別，而不會改變程式的正確性

### 核心概念
- **行為相容性**：子類別的行為應該與父類別一致
- **契約保持**：子類別不能違反父類別建立的契約
- **強化前置條件**：子類別不能強化前置條件
- **弱化後置條件**：子類別不能弱化後置條件

### 違反 LSP 的範例

```java
// ❌ 違反 LSP：正方形修改了矩形的行為契約
public class Rectangle {
    protected double width;
    protected double height;
    
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    
    public void setWidth(double width) {
        this.width = width;
    }
    
    public void setHeight(double height) {
        this.height = height;
    }
    
    public double getWidth() { return width; }
    public double getHeight() { return height; }
    
    public double getArea() {
        return width * height;
    }
}

// ❌ 正方形繼承矩形，但違反了里氏替換原則
public class Square extends Rectangle {
    
    public Square(double side) {
        super(side, side);
    }
    
    // 違反LSP：改變了父類別的行為契約
    @Override
    public void setWidth(double width) {
        this.width = width;
        this.height = width; // 強制保持正方形性質
    }
    
    @Override
    public void setHeight(double height) {
        this.width = height;  // 強制保持正方形性質
        this.height = height;
    }
}

// 測試程式碼展示問題
public class GeometryTest {
    
    public static void testRectangle(Rectangle rectangle) {
        rectangle.setWidth(4);
        rectangle.setHeight(5);
        
        // 期望面積是 20，但如果傳入 Square 物件，面積會是 25
        double expectedArea = 20;
        double actualArea = rectangle.getArea();
        
        System.out.println("期望面積: " + expectedArea);
        System.out.println("實際面積: " + actualArea);
        System.out.println("測試結果: " + (expectedArea == actualArea ? "通過" : "失敗"));
    }
    
    public static void main(String[] args) {
        Rectangle rectangle = new Rectangle(0, 0);
        testRectangle(rectangle); // 通過
        
        Rectangle square = new Square(0);
        testRectangle(square); // 失敗！違反了 LSP
    }
}
```

### 遵循 LSP 的重構範例

```java
// ✅ 遵循 LSP：重新設計繼承階層
// 抽象基礎類別
public abstract class Shape {
    public abstract double getArea();
    public abstract double getPerimeter();
    public abstract String getShapeType();
    
    // 模板方法
    public String getShapeInfo() {
        return String.format("%s - 面積: %.2f, 周長: %.2f", 
                           getShapeType(), getArea(), getPerimeter());
    }
}

// 矩形實作
public class Rectangle extends Shape {
    private double width;
    private double height;
    
    public Rectangle(double width, double height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("長度和寬度必須大於 0");
        }
        this.width = width;
        this.height = height;
    }
    
    @Override
    public double getArea() {
        return width * height;
    }
    
    @Override
    public double getPerimeter() {
        return 2 * (width + height);
    }
    
    @Override
    public String getShapeType() {
        return "矩形";
    }
    
    // 只提供安全的修改方法
    public Rectangle resize(double newWidth, double newHeight) {
        return new Rectangle(newWidth, newHeight);
    }
    
    public double getWidth() { return width; }
    public double getHeight() { return height; }
}

// 正方形實作（不繼承矩形）
public class Square extends Shape {
    private double side;
    
    public Square(double side) {
        if (side <= 0) {
            throw new IllegalArgumentException("邊長必須大於 0");
        }
        this.side = side;
    }
    
    @Override
    public double getArea() {
        return side * side;
    }
    
    @Override
    public double getPerimeter() {
        return 4 * side;
    }
    
    @Override
    public String getShapeType() {
        return "正方形";
    }
    
    public Square resize(double newSide) {
        return new Square(newSide);
    }
    
    public double getSide() { return side; }
}

// 圓形實作
public class Circle extends Shape {
    private double radius;
    
    public Circle(double radius) {
        if (radius <= 0) {
            throw new IllegalArgumentException("半徑必須大於 0");
        }
        this.radius = radius;
    }
    
    @Override
    public double getArea() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public double getPerimeter() {
        return 2 * Math.PI * radius;
    }
    
    @Override
    public String getShapeType() {
        return "圓形";
    }
    
    public Circle resize(double newRadius) {
        return new Circle(newRadius);
    }
    
    public double getRadius() { return radius; }
}

// 幾何計算器（可以安全地使用任何 Shape 子類別）
@Service
public class GeometryCalculator {
    
    // 可以安全地接受任何 Shape 子類別
    public double calculateArea(Shape shape) {
        return shape.getArea();
    }
    
    public double calculatePerimeter(Shape shape) {
        return shape.getPerimeter();
    }
    
    public List<ShapeReport> generateShapeReports(List<Shape> shapes) {
        return shapes.stream()
                .map(shape -> new ShapeReport(
                    shape.getShapeType(),
                    shape.getArea(),
                    shape.getPerimeter()
                ))
                .collect(Collectors.toList());
    }
    
    public Shape findLargestShape(List<Shape> shapes) {
        return shapes.stream()
                .max(Comparator.comparing(Shape::getArea))
                .orElseThrow(() -> new IllegalArgumentException("形狀列表不能為空"));
    }
}

// 測試證明 LSP 合規性
@Component
public class GeometryTestService {
    
    private final GeometryCalculator calculator;
    
    public GeometryTestService(GeometryCalculator calculator) {
        this.calculator = calculator;
    }
    
    public void testShapePolymorphism() {
        List<Shape> shapes = Arrays.asList(
            new Rectangle(4, 5),    // 面積: 20
            new Square(4),          // 面積: 16
            new Circle(3)           // 面積: ~28.27
        );
        
        // 所有形狀都可以安全地使用相同的方法
        shapes.forEach(shape -> {
            System.out.println(shape.getShapeInfo());
        });
        
        // 找出最大面積的形狀
        Shape largest = calculator.findLargestShape(shapes);
        System.out.println("最大形狀: " + largest.getShapeInfo());
    }
}
```

### LSP 的進階應用：契約設計

```java
// 定義清楚的契約
public abstract class Bird {
    protected String name;
    protected double weight;
    
    public Bird(String name, double weight) {
        this.name = name;
        this.weight = weight;
    }
    
    // 契約：所有鳥類都可以吃
    public abstract void eat(String food);
    
    // 契約：所有鳥類都可以移動
    public abstract void move();
    
    public String getName() { return name; }
    public double getWeight() { return weight; }
}

// 可飛行的鳥類介面
public interface Flyable {
    void fly();
    double getMaxFlightHeight();
}

// 可游泳的鳥類介面
public interface Swimmable {
    void swim();
    double getMaxDivingDepth();
}

// 具體實作 - 老鷹（可飛行）
public class Eagle extends Bird implements Flyable {
    
    public Eagle(String name, double weight) {
        super(name, weight);
    }
    
    @Override
    public void eat(String food) {
        System.out.println(name + " 正在吃 " + food);
    }
    
    @Override
    public void move() {
        fly(); // 老鷹主要透過飛行移動
    }
    
    @Override
    public void fly() {
        System.out.println(name + " 正在高空飛翔");
    }
    
    @Override
    public double getMaxFlightHeight() {
        return 3000; // 3000公尺
    }
}

// 具體實作 - 企鵝（可游泳，不能飛行）
public class Penguin extends Bird implements Swimmable {
    
    public Penguin(String name, double weight) {
        super(name, weight);
    }
    
    @Override
    public void eat(String food) {
        System.out.println(name + " 正在吃 " + food);
    }
    
    @Override
    public void move() {
        swim(); // 企鵝主要透過游泳移動
    }
    
    @Override
    public void swim() {
        System.out.println(name + " 正在水中游泳");
    }
    
    @Override
    public double getMaxDivingDepth() {
        return 200; // 200公尺
    }
}

// 鳥類管理服務（完全遵循 LSP）
@Service
public class BirdManagementService {
    
    // 可以安全地處理任何 Bird 子類別
    public void feedBird(Bird bird, String food) {
        bird.eat(food);
    }
    
    public void moveBird(Bird bird) {
        bird.move();
    }
    
    // 專門處理可飛行的鳥類
    public void makeFly(Flyable flyableBird) {
        flyableBird.fly();
        System.out.println("最大飛行高度: " + flyableBird.getMaxFlightHeight() + " 公尺");
    }
    
    // 專門處理可游泳的鳥類
    public void makeSwim(Swimmable swimmableBird) {
        swimmableBird.swim();
        System.out.println("最大潛水深度: " + swimmableBird.getMaxDivingDepth() + " 公尺");
    }
}
```

## 4. Interface Segregation Principle (ISP) - 介面隔離原則

### 定義
> 不應該強迫客戶端依賴它們不使用的介面方法

### 核心概念
- **介面最小化**：介面應該只包含客戶端需要的方法
- **職責分離**：大介面應該拆分成多個小介面
- **依賴最小化**：降低介面之間的耦合度

### 違反 ISP 的範例

```java
// ❌ 違反 ISP：萬能介面，強迫實作不需要的方法
public interface MediaPlayer {
    void playAudio(String audioFile);
    void playVideo(String videoFile);
    void displaySubtitles(String subtitleFile);
    void adjustVolume(int volume);
    void adjustBrightness(int brightness);
    void recordAudio();
    void recordVideo();
    void takeScreenshot();
    void applyAudioFilter(String filter);
    void applyVideoFilter(String filter);
}

// ❌ 音頻播放器被迫實作不需要的視頻相關方法
public class AudioPlayer implements MediaPlayer {
    
    @Override
    public void playAudio(String audioFile) {
        System.out.println("播放音頻: " + audioFile);
    }
    
    @Override
    public void adjustVolume(int volume) {
        System.out.println("調整音量到: " + volume);
    }
    
    @Override
    public void applyAudioFilter(String filter) {
        System.out.println("應用音頻濾鏡: " + filter);
    }
    
    // 被迫實作不需要的方法
    @Override
    public void playVideo(String videoFile) {
        throw new UnsupportedOperationException("音頻播放器不支援視頻播放");
    }
    
    @Override
    public void displaySubtitles(String subtitleFile) {
        throw new UnsupportedOperationException("音頻播放器不支援字幕");
    }
    
    @Override
    public void adjustBrightness(int brightness) {
        throw new UnsupportedOperationException("音頻播放器不支援亮度調整");
    }
    
    @Override
    public void recordAudio() {
        throw new UnsupportedOperationException("此音頻播放器不支援錄音");
    }
    
    @Override
    public void recordVideo() {
        throw new UnsupportedOperationException("音頻播放器不支援視頻錄製");
    }
    
    @Override
    public void takeScreenshot() {
        throw new UnsupportedOperationException("音頻播放器不支援截圖");
    }
    
    @Override
    public void applyVideoFilter(String filter) {
        throw new UnsupportedOperationException("音頻播放器不支援視頻濾鏡");
    }
}
```

### 遵循 ISP 的重構範例

```java
// ✅ 遵循 ISP：將大介面拆分成多個職責明確的小介面

// 基礎播放介面
public interface Playable {
    void play(String file);
    void pause();
    void stop();
    void seek(long position);
}

// 音頻相關介面
public interface AudioPlayable extends Playable {
    void adjustVolume(int volume);
    int getVolume();
}

// 視頻相關介面
public interface VideoPlayable extends Playable {
    void adjustBrightness(int brightness);
    void adjustContrast(int contrast);
    int getBrightness();
    int getContrast();
}

// 字幕支援介面
public interface SubtitleSupport {
    void loadSubtitles(String subtitleFile);
    void showSubtitles(boolean show);
    void adjustSubtitleSize(int size);
}

// 錄音介面
public interface AudioRecordable {
    void startAudioRecording(String outputFile);
    void stopAudioRecording();
    boolean isRecording();
}

// 錄影介面
public interface VideoRecordable {
    void startVideoRecording(String outputFile);
    void stopVideoRecording();
    void takeScreenshot(String outputFile);
}

// 濾鏡支援介面
public interface AudioFilterSupport {
    void applyAudioFilter(AudioFilter filter);
    void removeAudioFilter();
    List<AudioFilter> getAvailableAudioFilters();
}

public interface VideoFilterSupport {
    void applyVideoFilter(VideoFilter filter);
    void removeVideoFilter();
    List<VideoFilter> getAvailableVideoFilters();
}

// 音頻播放器實作（只實作需要的介面）
@Component
public class SimpleAudioPlayer implements AudioPlayable, AudioFilterSupport {
    
    private int volume = 50;
    private boolean isPlaying = false;
    private AudioFilter currentFilter;
    
    @Override
    public void play(String file) {
        System.out.println("播放音頻檔案: " + file);
        isPlaying = true;
    }
    
    @Override
    public void pause() {
        System.out.println("暫停播放");
        isPlaying = false;
    }
    
    @Override
    public void stop() {
        System.out.println("停止播放");
        isPlaying = false;
    }
    
    @Override
    public void seek(long position) {
        System.out.println("跳轉到位置: " + position + " 秒");
    }
    
    @Override
    public void adjustVolume(int volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        System.out.println("音量調整為: " + this.volume);
    }
    
    @Override
    public int getVolume() {
        return volume;
    }
    
    @Override
    public void applyAudioFilter(AudioFilter filter) {
        this.currentFilter = filter;
        System.out.println("應用音頻濾鏡: " + filter.getName());
    }
    
    @Override
    public void removeAudioFilter() {
        this.currentFilter = null;
        System.out.println("移除音頻濾鏡");
    }
    
    @Override
    public List<AudioFilter> getAvailableAudioFilters() {
        return Arrays.asList(
            new AudioFilter("回音", "echo"),
            new AudioFilter("降噪", "noise_reduction"),
            new AudioFilter("等化器", "equalizer")
        );
    }
}

// 專業錄音機實作（實作錄音相關介面）
@Component
public class ProfessionalAudioRecorder implements AudioPlayable, AudioRecordable, AudioFilterSupport {
    
    private int volume = 50;
    private boolean isPlaying = false;
    private boolean isRecording = false;
    private String currentRecordingFile;
    
    // 實作播放功能
    @Override
    public void play(String file) {
        if (!isRecording) {
            System.out.println("播放音頻檔案: " + file);
            isPlaying = true;
        } else {
            System.out.println("錄音中，無法播放");
        }
    }
    
    @Override
    public void pause() {
        System.out.println("暫停播放");
        isPlaying = false;
    }
    
    @Override
    public void stop() {
        System.out.println("停止播放");
        isPlaying = false;
    }
    
    @Override
    public void seek(long position) {
        System.out.println("跳轉到位置: " + position + " 秒");
    }
    
    @Override
    public void adjustVolume(int volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        System.out.println("音量調整為: " + this.volume);
    }
    
    @Override
    public int getVolume() {
        return volume;
    }
    
    // 實作錄音功能
    @Override
    public void startAudioRecording(String outputFile) {
        if (!isPlaying) {
            this.currentRecordingFile = outputFile;
            this.isRecording = true;
            System.out.println("開始錄音到: " + outputFile);
        } else {
            System.out.println("播放中，無法錄音");
        }
    }
    
    @Override
    public void stopAudioRecording() {
        if (isRecording) {
            this.isRecording = false;
            System.out.println("錄音完成: " + currentRecordingFile);
            this.currentRecordingFile = null;
        }
    }
    
    @Override
    public boolean isRecording() {
        return isRecording;
    }
    
    // 實作濾鏡功能
    @Override
    public void applyAudioFilter(AudioFilter filter) {
        System.out.println("應用專業音頻濾鏡: " + filter.getName());
    }
    
    @Override
    public void removeAudioFilter() {
        System.out.println("移除音頻濾鏡");
    }
    
    @Override
    public List<AudioFilter> getAvailableAudioFilters() {
        return Arrays.asList(
            new AudioFilter("回音", "echo"),
            new AudioFilter("降噪", "noise_reduction"),
            new AudioFilter("等化器", "equalizer"),
            new AudioFilter("壓縮器", "compressor"),
            new AudioFilter("限制器", "limiter")
        );
    }
}

// 視頻播放器實作（實作視頻相關介面）
@Component
public class VideoPlayer implements VideoPlayable, SubtitleSupport, VideoFilterSupport {
    
    private int brightness = 50;
    private int contrast = 50;
    private boolean subtitlesVisible = false;
    private String currentSubtitleFile;
    
    @Override
    public void play(String file) {
        System.out.println("播放視頻檔案: " + file);
    }
    
    @Override
    public void pause() {
        System.out.println("暫停視頻");
    }
    
    @Override
    public void stop() {
        System.out.println("停止視頻");
    }
    
    @Override
    public void seek(long position) {
        System.out.println("跳轉到視頻位置: " + position + " 秒");
    }
    
    @Override
    public void adjustBrightness(int brightness) {
        this.brightness = Math.max(0, Math.min(100, brightness));
        System.out.println("亮度調整為: " + this.brightness);
    }
    
    @Override
    public void adjustContrast(int contrast) {
        this.contrast = Math.max(0, Math.min(100, contrast));
        System.out.println("對比度調整為: " + this.contrast);
    }
    
    @Override
    public int getBrightness() {
        return brightness;
    }
    
    @Override
    public int getContrast() {
        return contrast;
    }
    
    // 字幕支援
    @Override
    public void loadSubtitles(String subtitleFile) {
        this.currentSubtitleFile = subtitleFile;
        System.out.println("載入字幕檔案: " + subtitleFile);
    }
    
    @Override
    public void showSubtitles(boolean show) {
        this.subtitlesVisible = show;
        System.out.println("字幕顯示: " + (show ? "開啟" : "關閉"));
    }
    
    @Override
    public void adjustSubtitleSize(int size) {
        System.out.println("字幕大小調整為: " + size);
    }
    
    // 視頻濾鏡支援
    @Override
    public void applyVideoFilter(VideoFilter filter) {
        System.out.println("應用視頻濾鏡: " + filter.getName());
    }
    
    @Override
    public void removeVideoFilter() {
        System.out.println("移除視頻濾鏡");
    }
    
    @Override
    public List<VideoFilter> getAvailableVideoFilters() {
        return Arrays.asList(
            new VideoFilter("模糊", "blur"),
            new VideoFilter("銳化", "sharpen"),
            new VideoFilter("色彩增強", "color_enhance")
        );
    }
}

// 媒體管理服務（使用介面隔離的好處）
@Service
public class MediaManagementService {
    
    // 只處理播放功能
    public void playMedia(Playable player, String file) {
        player.play(file);
    }
    
    // 只處理音頻播放
    public void playAudioWithVolume(AudioPlayable audioPlayer, String file, int volume) {
        audioPlayer.adjustVolume(volume);
        audioPlayer.play(file);
    }
    
    // 只處理錄音功能
    public void recordAudio(AudioRecordable recorder, String outputFile) {
        if (!recorder.isRecording()) {
            recorder.startAudioRecording(outputFile);
        }
    }
    
    // 只處理字幕功能
    public void setupSubtitles(SubtitleSupport player, String subtitleFile) {
        player.loadSubtitles(subtitleFile);
        player.showSubtitles(true);
    }
}
```

## 5. Dependency Inversion Principle (DIP) - 依賴反轉原則

### 定義
> 高層模組不應該依賴低層模組，兩者都應該依賴於抽象。抽象不應該依賴於細節，細節應該依賴於抽象。

### 核心概念
- **依賴注入**：透過外部注入依賴而非內部創建
- **控制反轉**：將依賴關係的控制權交給外部容器
- **抽象依賴**：依賴於介面而非具體實作

### 違反 DIP 的範例

```java
// ❌ 違反 DIP：高層模組直接依賴低層模組的具體實作
public class MySQLDatabase {
    public void save(String data) {
        System.out.println("儲存資料到 MySQL: " + data);
    }
    
    public String load(String id) {
        return "從 MySQL 載入資料: " + id;
    }
}

public class EmailService {
    public void sendEmail(String to, String subject, String body) {
        System.out.println("發送郵件到: " + to);
        System.out.println("主題: " + subject);
        System.out.println("內容: " + body);
    }
}

// ❌ UserService 直接依賴具體實作，難以測試和擴展
public class UserService {
    
    private MySQLDatabase database; // 直接依賴具體實作
    private EmailService emailService; // 直接依賴具體實作
    
    public UserService() {
        this.database = new MySQLDatabase(); // 在構造函數中創建依賴
        this.emailService = new EmailService(); // 硬編碼依賴
    }
    
    public void createUser(String username, String email) {
        // 驗證邏輯
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("用戶名不能為空");
        }
        
        // 儲存用戶（依賴具體的 MySQL 實作）
        String userData = "User: " + username + ", Email: " + email;
        database.save(userData);
        
        // 發送歡迎郵件（依賴具體的郵件服務實作）
        emailService.sendEmail(email, "歡迎", "歡迎加入我們的平台！");
    }
    
    public String getUser(String userId) {
        return database.load(userId);
    }
}
```

### 遵循 DIP 的重構範例

```java
// ✅ 遵循 DIP：定義抽象介面

// 資料庫抽象介面
public interface UserRepository {
    void save(User user);
    Optional<User> findById(String id);
    Optional<User> findByEmail(String email);
    List<User> findAll();
    void delete(String id);
}

// 通知服務抽象介面
public interface NotificationService {
    void sendWelcomeNotification(User user);
    void sendPasswordResetNotification(User user, String resetToken);
    void sendAccountActivationNotification(User user, String activationToken);
}

// 用戶驗證抽象介面
public interface UserValidator {
    ValidationResult validate(User user);
    boolean isEmailUnique(String email);
    boolean isUsernameValid(String username);
}

// 具體實作 - MySQL 資料庫
@Repository
public class MySQLUserRepository implements UserRepository {
    
    @Override
    public void save(User user) {
        System.out.println("儲存用戶到 MySQL: " + user.getUsername());
        // 實際的資料庫操作邏輯
    }
    
    @Override
    public Optional<User> findById(String id) {
        System.out.println("從 MySQL 查找用戶: " + id);
        // 實際的查詢邏輯
        return Optional.of(new User(id, "user@example.com"));
    }
    
    @Override
    public Optional<User> findByEmail(String email) {
        System.out.println("從 MySQL 根據郵箱查找用戶: " + email);
        return Optional.empty();
    }
    
    @Override
    public List<User> findAll() {
        System.out.println("從 MySQL 查找所有用戶");
        return Arrays.asList(new User("1", "user1@example.com"));
    }
    
    @Override
    public void delete(String id) {
        System.out.println("從 MySQL 刪除用戶: " + id);
    }
}

// 具體實作 - MongoDB 資料庫（可替換實作）
@Repository
@Profile("mongodb")
public class MongoUserRepository implements UserRepository {
    
    @Override
    public void save(User user) {
        System.out.println("儲存用戶到 MongoDB: " + user.getUsername());
    }
    
    @Override
    public Optional<User> findById(String id) {
        System.out.println("從 MongoDB 查找用戶: " + id);
        return Optional.of(new User(id, "user@example.com"));
    }
    
    @Override
    public Optional<User> findByEmail(String email) {
        System.out.println("從 MongoDB 根據郵箱查找用戶: " + email);
        return Optional.empty();
    }
    
    @Override
    public List<User> findAll() {
        System.out.println("從 MongoDB 查找所有用戶");
        return Arrays.asList(new User("1", "user1@example.com"));
    }
    
    @Override
    public void delete(String id) {
        System.out.println("從 MongoDB 刪除用戶: " + id);
    }
}

// 具體實作 - 郵件通知服務
@Service
public class EmailNotificationService implements NotificationService {
    
    @Override
    public void sendWelcomeNotification(User user) {
        System.out.println("發送歡迎郵件到: " + user.getEmail());
        // 實際的郵件發送邏輯
    }
    
    @Override
    public void sendPasswordResetNotification(User user, String resetToken) {
        System.out.println("發送密碼重設郵件到: " + user.getEmail());
        System.out.println("重設令牌: " + resetToken);
    }
    
    @Override
    public void sendAccountActivationNotification(User user, String activationToken) {
        System.out.println("發送帳戶啟用郵件到: " + user.getEmail());
        System.out.println("啟用令牌: " + activationToken);
    }
}

// 具體實作 - SMS 通知服務（可替換實作）
@Service
@Profile("sms")
public class SMSNotificationService implements NotificationService {
    
    @Override
    public void sendWelcomeNotification(User user) {
        System.out.println("發送歡迎 SMS 到: " + user.getPhoneNumber());
    }
    
    @Override
    public void sendPasswordResetNotification(User user, String resetToken) {
        System.out.println("發送密碼重設 SMS 到: " + user.getPhoneNumber());
        System.out.println("重設代碼: " + resetToken);
    }
    
    @Override
    public void sendAccountActivationNotification(User user, String activationToken) {
        System.out.println("發送帳戶啟用 SMS 到: " + user.getPhoneNumber());
        System.out.println("啟用代碼: " + activationToken);
    }
}

// 具體實作 - 用戶驗證器
@Component
public class DefaultUserValidator implements UserValidator {
    
    private final UserRepository userRepository;
    
    public DefaultUserValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public ValidationResult validate(User user) {
        ValidationResult result = new ValidationResult();
        
        if (!isUsernameValid(user.getUsername())) {
            result.addError("用戶名格式無效");
        }
        
        if (!isEmailValid(user.getEmail())) {
            result.addError("郵箱格式無效");
        }
        
        if (!isEmailUnique(user.getEmail())) {
            result.addError("郵箱已被使用");
        }
        
        return result;
    }
    
    @Override
    public boolean isEmailUnique(String email) {
        return userRepository.findByEmail(email).isEmpty();
    }
    
    @Override
    public boolean isUsernameValid(String username) {
        return username != null && 
               username.trim().length() >= 3 && 
               username.trim().length() <= 50 &&
               username.matches("^[a-zA-Z0-9_]+$");
    }
    
    private boolean isEmailValid(String email) {
        return email != null && 
               email.contains("@") && 
               email.contains(".") &&
               email.length() > 5;
    }
}

// 高層模組 - 用戶服務（依賴於抽象）
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final UserValidator userValidator;
    
    // 依賴注入：透過構造函數注入依賴
    public UserService(UserRepository userRepository,
                      NotificationService notificationService,
                      UserValidator userValidator) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.userValidator = userValidator;
    }
    
    public Result<User> createUser(String username, String email) {
        User user = new User(username, email);
        
        // 驗證用戶資料
        ValidationResult validation = userValidator.validate(user);
        if (!validation.isValid()) {
            return Result.failure("驗證失敗: " + validation.getErrors());
        }
        
        try {
            // 儲存用戶
            userRepository.save(user);
            
            // 發送通知
            notificationService.sendWelcomeNotification(user);
            
            return Result.success(user);
            
        } catch (Exception e) {
            return Result.failure("創建用戶失敗: " + e.getMessage());
        }
    }
    
    public Result<User> getUserById(String id) {
        Optional<User> user = userRepository.findById(id);
        
        if (user.isPresent()) {
            return Result.success(user.get());
        } else {
            return Result.failure("用戶不存在");
        }
    }
    
    public Result<Void> resetPassword(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            return Result.failure("用戶不存在");
        }
        
        User user = userOpt.get();
        String resetToken = generateResetToken();
        
        // 儲存重設令牌（實際應該儲存到資料庫）
        // userRepository.saveResetToken(user.getId(), resetToken);
        
        // 發送重設通知
        notificationService.sendPasswordResetNotification(user, resetToken);
        
        return Result.success(null);
    }
    
    private String generateResetToken() {
        return "RESET-" + UUID.randomUUID().toString();
    }
}

// 配置類別（控制依賴注入）
@Configuration
public class UserServiceConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mysql", matchIfMissing = true)
    public UserRepository mysqlUserRepository() {
        return new MySQLUserRepository();
    }
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mongodb")
    public UserRepository mongoUserRepository() {
        return new MongoUserRepository();
    }
    
    @Bean
    @ConditionalOnProperty(name = "notification.type", havingValue = "email", matchIfMissing = true)
    public NotificationService emailNotificationService() {
        return new EmailNotificationService();
    }
    
    @Bean
    @ConditionalOnProperty(name = "notification.type", havingValue = "sms")
    public NotificationService smsNotificationService() {
        return new SMSNotificationService();
    }
}
```

### DIP 的進階應用：工廠模式與策略模式結合

```java
// 報表生成策略介面
public interface ReportGenerator {
    String generateReport(List<User> users);
    String getReportFormat();
}

// CSV 報表生成器
@Component("csvReportGenerator")
public class CSVReportGenerator implements ReportGenerator {
    
    @Override
    public String generateReport(List<User> users) {
        StringBuilder csv = new StringBuilder();
        csv.append("用戶名,郵箱,創建時間\n");
        
        users.forEach(user -> 
            csv.append(String.format("%s,%s,%s\n", 
                user.getUsername(), 
                user.getEmail(), 
                user.getCreatedAt()))
        );
        
        return csv.toString();
    }
    
    @Override
    public String getReportFormat() {
        return "CSV";
    }
}

// JSON 報表生成器
@Component("jsonReportGenerator")
public class JSONReportGenerator implements ReportGenerator {
    
    private final ObjectMapper objectMapper;
    
    public JSONReportGenerator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Override
    public String generateReport(List<User> users) {
        try {
            Map<String, Object> report = new HashMap<>();
            report.put("totalUsers", users.size());
            report.put("generatedAt", LocalDateTime.now());
            report.put("users", users);
            
            return objectMapper.writeValueAsString(report);
        } catch (Exception e) {
            throw new RuntimeException("JSON 報表生成失敗", e);
        }
    }
    
    @Override
    public String getReportFormat() {
        return "JSON";
    }
}

// 報表工廠
@Service
public class ReportGeneratorFactory {
    
    private final Map<String, ReportGenerator> generators;
    
    public ReportGeneratorFactory(Map<String, ReportGenerator> generators) {
        this.generators = generators;
    }
    
    public ReportGenerator getGenerator(String format) {
        ReportGenerator generator = generators.get(format.toLowerCase() + "ReportGenerator");
        
        if (generator == null) {
            throw new IllegalArgumentException("不支援的報表格式: " + format);
        }
        
        return generator;
    }
    
    public List<String> getSupportedFormats() {
        return generators.values().stream()
                .map(ReportGenerator::getReportFormat)
                .collect(Collectors.toList());
    }
}

// 報表服務（高層模組，依賴於抽象）
@Service
public class UserReportService {
    
    private final UserRepository userRepository;
    private final ReportGeneratorFactory reportGeneratorFactory;
    
    public UserReportService(UserRepository userRepository,
                           ReportGeneratorFactory reportGeneratorFactory) {
        this.userRepository = userRepository;
        this.reportGeneratorFactory = reportGeneratorFactory;
    }
    
    public String generateUserReport(String format) {
        List<User> users = userRepository.findAll();
        ReportGenerator generator = reportGeneratorFactory.getGenerator(format);
        
        return generator.generateReport(users);
    }
    
    public List<String> getSupportedReportFormats() {
        return reportGeneratorFactory.getSupportedFormats();
    }
}
```

## 總結

SOLID 原則是軟體設計的基石，它們相互補充，共同促進程式碼的品質：

### 核心價值

1. **可維護性**：每個原則都有助於降低程式碼修改的複雜度
2. **可擴展性**：支援新功能的增加而不破壞現有功能
3. **可測試性**：依賴注入和介面隔離使單元測試更容易
4. **可重用性**：職責明確的類別可以在不同場景中重複使用

### 實踐建議

1. **從小處開始**：在新專案中逐步應用 SOLID 原則
2. **重構現有程式碼**：識別違反 SOLID 原則的程式碼並逐步改進
3. **使用現代框架**：Spring、依賴注入容器等工具有助於實踐 SOLID 原則
4. **程式碼審查**：在團隊中推廣 SOLID 原則的理解和應用
5. **持續學習**：SOLID 原則是軟體架構的基礎，需要在實踐中不斷深化理解

### 常見陷阱

1. **過度設計**：不要為了遵循原則而增加不必要的複雜性
2. **教條主義**：原則是指導而非絕對規則，需要根據具體情況靈活應用
3. **忽略性能**：在追求設計原則的同時要考慮性能影響
4. **缺乏漸進性**：不要試圖一次性重構整個系統，要採用漸進式改進

SOLID 原則不僅適用於物件導向程式設計，在微服務架構、函數式程式設計等現代軟體架構中同樣具有指導意義。掌握這些原則將顯著提升你的軟體設計能力。

## 參考資料

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350884)
- [Agile Software Development, Principles, Patterns, and Practices](https://www.amazon.com/Software-Development-Principles-Patterns-Practices/dp/0135974445)
- [SOLID Principles of Object Oriented Design](https://web.archive.org/web/20150906155800/http://www.objectmentor.com/resources/articles/Principles_and_Patterns.pdf)
- [Spring Framework Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/)