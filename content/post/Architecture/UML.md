---
title: "UML 統一建模語言完整指南：軟體設計與架構建模最佳實踐"
author: Bill.Lin
date: 2021-07-12T23:33:14+08:00
draft: false
tags: ["UML", "Unified Modeling Language", "Software Design", "Architecture", "Class Diagram", "Sequence Diagram", "Use Case Diagram", "Design Patterns", "Object-Oriented Design", "Software Modeling", "Enterprise Architecture", "System Design"]
Description: "深入探討 UML 統一建模語言的完整指南，包含類別圖、序列圖、使用案例圖、設計模式建模與企業級軟體架構建模最佳實踐"
Categories: ["Architecture"]
DisableComments: false
---

## UML 統一建模語言完整指南

### 概述

UML（Unified Modeling Language，統一建模語言）是一種標準化的建模語言，用於軟體系統的視覺化、規範、建構和文檔化。UML 提供了多種圖形表示法，幫助開發人員理解系統結構、行為和互動關係。

### UML 圖形分類

#### 結構圖（Structure Diagrams）
- **類別圖（Class Diagram）**：展示類別及其關係
- **物件圖（Object Diagram）**：展示特定時刻的物件實例
- **封裝圖（Package Diagram）**：展示套件及其依賴關係
- **部署圖（Deployment Diagram）**：展示系統部署結構

#### 行為圖（Behavior Diagrams）
- **使用案例圖（Use Case Diagram）**：展示系統功能和用戶互動
- **活動圖（Activity Diagram）**：展示工作流程和業務邏輯
- **狀態圖（State Diagram）**：展示物件狀態變化

#### 互動圖（Interaction Diagrams）
- **序列圖（Sequence Diagram）**：展示物件間的時間順序互動
- **協作圖（Collaboration Diagram）**：展示物件間的協作關係
- **時序圖（Timing Diagram）**：展示物件在時間軸上的狀態變化

## 類別圖關係詳解

### 1. 依賴關係（Dependency）

**符號：** 虛線箭頭 `A -----> B`

**意義：** A 類別使用 B 類別，通常是臨時性的使用關係，如方法參數、局部變數或靜態方法調用。

**Java 實現範例：**

```java
// 依賴關係示例
public class OrderService {
    
    // 方法參數依賴
    public void processOrder(Order order, PaymentProcessor processor) {
        // OrderService 依賴 PaymentProcessor
        processor.processPayment(order.getAmount());
    }
    
    // 靜態方法依賴
    public void validateOrder(Order order) {
        // OrderService 依賴 OrderValidator
        if (!OrderValidator.validate(order)) {
            throw new ValidationException("無效的訂單");
        }
    }
    
    // 局部變數依賴
    public void sendNotification(Order order) {
        // OrderService 依賴 EmailService
        EmailService emailService = new EmailService();
        emailService.sendOrderConfirmation(order);
    }
}

// 被依賴的類
public class PaymentProcessor {
    public void processPayment(BigDecimal amount) {
        // 處理付款邏輯
    }
}

public class OrderValidator {
    public static boolean validate(Order order) {
        return order != null && order.getAmount() != null;
    }
}

public class EmailService {
    public void sendOrderConfirmation(Order order) {
        // 發送確認郵件
    }
}
```

### 2. 關聯關係（Association）

**符號：** 實線箭頭 `A -----> B`

**意義：** 長期的結構性關係，一個類別知道另一個類別的存在。

**Java 實現範例：**

```java
// 單向關聯
public class Customer {
    private String name;
    private String email;
    
    // Customer 關聯到 Order
    private List<Order> orders = new ArrayList<>();
    
    public void addOrder(Order order) {
        orders.add(order);
    }
    
    public List<Order> getOrders() {
        return new ArrayList<>(orders);
    }
}

// 雙向關聯
public class Order {
    private String orderId;
    private BigDecimal amount;
    
    // Order 關聯到 Customer
    private Customer customer;
    
    public Order(Customer customer) {
        this.customer = customer;
        customer.addOrder(this);
    }
    
    public Customer getCustomer() {
        return customer;
    }
}

// 多對多關聯
public class Student {
    private String name;
    private List<Course> courses = new ArrayList<>();
    
    public void enrollCourse(Course course) {
        courses.add(course);
        course.addStudent(this);
    }
}

public class Course {
    private String name;
    private List<Student> students = new ArrayList<>();
    
    public void addStudent(Student student) {
        students.add(student);
    }
}
```

### 3. 聚合關係（Aggregation）

**符號：** 空心菱形 `A ◇-----> B`

**意義：** "has-a" 關係，整體包含部分，但部分可以獨立存在。

**Java 實現範例：**

```java
// 聚合關係示例
public class Department {
    private String name;
    private List<Employee> employees = new ArrayList<>();
    
    public Department(String name) {
        this.name = name;
    }
    
    // 聚合：部門包含員工，但員工可以獨立存在
    public void addEmployee(Employee employee) {
        employees.add(employee);
    }
    
    public void removeEmployee(Employee employee) {
        employees.remove(employee);
    }
    
    public List<Employee> getEmployees() {
        return new ArrayList<>(employees);
    }
}

public class Employee {
    private String name;
    private String position;
    
    public Employee(String name, String position) {
        this.name = name;
        this.position = position;
    }
    
    // 員工可以獨立存在，不依賴於部門
    public void work() {
        System.out.println(name + " 正在工作");
    }
}

// 使用範例
public class CompanyExample {
    public static void main(String[] args) {
        Department itDepartment = new Department("IT部門");
        
        Employee emp1 = new Employee("張三", "軟體工程師");
        Employee emp2 = new Employee("李四", "系統分析師");
        
        itDepartment.addEmployee(emp1);
        itDepartment.addEmployee(emp2);
        
        // 員工可以離開部門，但仍然存在
        itDepartment.removeEmployee(emp1);
        emp1.work(); // 員工依然可以工作
    }
}
```

### 4. 組合關係（Composition）

**符號：** 實心菱形 `A ◆-----> B`

**意義：** 強聚合關係，整體和部分的生命週期相同，部分不能獨立存在。

**Java 實現範例：**

```java
// 組合關係示例
public class House {
    private String address;
    private List<Room> rooms = new ArrayList<>();
    
    public House(String address) {
        this.address = address;
        // 組合：房子創建時，房間也被創建
        initializeRooms();
    }
    
    private void initializeRooms() {
        rooms.add(new Room("客廳", 30));
        rooms.add(new Room("臥室", 20));
        rooms.add(new Room("廚房", 15));
    }
    
    public void addRoom(String name, int area) {
        rooms.add(new Room(name, area));
    }
    
    public List<Room> getRooms() {
        return new ArrayList<>(rooms);
    }
    
    // 房子銷毀時，房間也隨之銷毀
    public void demolish() {
        rooms.clear();
        System.out.println("房子被拆毀，所有房間也消失了");
    }
    
    // 內部類，生命週期與外部類相同
    private class Room {
        private String name;
        private int area;
        
        public Room(String name, int area) {
            this.name = name;
            this.area = area;
        }
        
        public String getName() { return name; }
        public int getArea() { return area; }
    }
}

// 另一個組合關係示例
public class Car {
    private String brand;
    private Engine engine;
    private List<Wheel> wheels = new ArrayList<>();
    
    public Car(String brand) {
        this.brand = brand;
        // 組合：汽車創建時，引擎和車輪也被創建
        this.engine = new Engine(2000);
        initializeWheels();
    }
    
    private void initializeWheels() {
        for (int i = 0; i < 4; i++) {
            wheels.add(new Wheel(16));
        }
    }
    
    public void start() {
        engine.start();
        System.out.println(brand + " 汽車啟動");
    }
    
    // 汽車銷毀時，引擎和車輪也隨之銷毀
    public void destroy() {
        engine.stop();
        wheels.clear();
        System.out.println(brand + " 汽車被銷毀");
    }
    
    // 內部類，體現組合關係
    private class Engine {
        private int displacement;
        
        public Engine(int displacement) {
            this.displacement = displacement;
        }
        
        public void start() {
            System.out.println("引擎啟動：" + displacement + "cc");
        }
        
        public void stop() {
            System.out.println("引擎停止");
        }
    }
    
    private class Wheel {
        private int size;
        
        public Wheel(int size) {
            this.size = size;
        }
        
        public int getSize() { return size; }
    }
}
```

### 5. 實現關係（Implementation）

**符號：** 虛線三角箭頭 `A ----▷ B`

**意義：** 類別實現介面或抽象類別。

**Java 實現範例：**

```java
// 介面定義
public interface PaymentProcessor {
    void processPayment(BigDecimal amount);
    boolean validatePayment(PaymentRequest request);
}

// 具體實現類
public class CreditCardProcessor implements PaymentProcessor {
    
    @Override
    public void processPayment(BigDecimal amount) {
        System.out.println("使用信用卡處理付款: " + amount);
    }
    
    @Override
    public boolean validatePayment(PaymentRequest request) {
        return request.getCreditCardNumber() != null && 
               request.getExpiryDate() != null &&
               request.getCvv() != null;
    }
}

public class PayPalProcessor implements PaymentProcessor {
    
    @Override
    public void processPayment(BigDecimal amount) {
        System.out.println("使用 PayPal 處理付款: " + amount);
    }
    
    @Override
    public boolean validatePayment(PaymentRequest request) {
        return request.getPaypalEmail() != null && 
               request.getPassword() != null;
    }
}

// 抽象類別實現
public abstract class AbstractVehicle {
    protected String brand;
    protected String model;
    
    public AbstractVehicle(String brand, String model) {
        this.brand = brand;
        this.model = model;
    }
    
    public abstract void start();
    public abstract void stop();
    
    public void displayInfo() {
        System.out.println("品牌: " + brand + ", 型號: " + model);
    }
}

public class Motorcycle extends AbstractVehicle {
    
    public Motorcycle(String brand, String model) {
        super(brand, model);
    }
    
    @Override
    public void start() {
        System.out.println("機車啟動");
    }
    
    @Override
    public void stop() {
        System.out.println("機車停止");
    }
}
```

### 6. 繼承關係（Inheritance）

**符號：** 實線三角箭頭 `A ----▷ B`

**意義：** "is-a" 關係，子類別繼承父類別的屬性和方法。

**Java 實現範例：**

```java
// 父類別
public class Animal {
    protected String name;
    protected int age;
    
    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public void eat() {
        System.out.println(name + " 正在吃食物");
    }
    
    public void sleep() {
        System.out.println(name + " 正在睡覺");
    }
    
    public void makeSound() {
        System.out.println(name + " 發出聲音");
    }
}

// 子類別 - 繼承 Animal
public class Dog extends Animal {
    private String breed;
    
    public Dog(String name, int age, String breed) {
        super(name, age);
        this.breed = breed;
    }
    
    @Override
    public void makeSound() {
        System.out.println(name + " 汪汪叫");
    }
    
    public void fetch() {
        System.out.println(name + " 正在撿球");
    }
}

public class Cat extends Animal {
    private boolean isIndoor;
    
    public Cat(String name, int age, boolean isIndoor) {
        super(name, age);
        this.isIndoor = isIndoor;
    }
    
    @Override
    public void makeSound() {
        System.out.println(name + " 喵喵叫");
    }
    
    public void climb() {
        System.out.println(name + " 正在爬樹");
    }
}

// 多層繼承
public class WorkingDog extends Dog {
    private String jobType;
    
    public WorkingDog(String name, int age, String breed, String jobType) {
        super(name, age, breed);
        this.jobType = jobType;
    }
    
    public void work() {
        System.out.println(name + " 正在執行 " + jobType + " 工作");
    }
}
```

## 設計模式的 UML 表示

### 1. 單例模式（Singleton Pattern）

```java
/**
 * UML 類別圖:
 * 
 * ┌─────────────────────┐
 * │     Singleton       │
 * ├─────────────────────┤
 * │ - instance: Singleton │
 * ├─────────────────────┤
 * │ - Singleton()       │
 * │ + getInstance(): Singleton │
 * │ + doSomething(): void │
 * └─────────────────────┘
 */
public class Singleton {
    private static volatile Singleton instance;
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
    
    public void doSomething() {
        System.out.println("執行業務邏輯");
    }
}
```

### 2. 工廠模式（Factory Pattern）

```java
/**
 * UML 類別圖:
 * 
 * ┌─────────────────┐         ┌─────────────────┐
 * │    Product      │◄────────│  ProductFactory │
 * │   <<interface>> │         │                 │
 * └─────────────────┘         └─────────────────┘
 *          △                           │
 *          │                           │
 *   ┌─────────────────┐                │
 *   │ ConcreteProduct │                │
 *   │                 │                │
 *   └─────────────────┘                │
 *                                      │
 *                              ┌─────────────────┐
 *                              │ConcreteFactory  │
 *                              │                 │
 *                              └─────────────────┘
 */

public interface Product {
    void use();
}

public class ConcreteProductA implements Product {
    @Override
    public void use() {
        System.out.println("使用產品 A");
    }
}

public class ConcreteProductB implements Product {
    @Override
    public void use() {
        System.out.println("使用產品 B");
    }
}

public class ProductFactory {
    public static Product createProduct(String type) {
        switch (type.toLowerCase()) {
            case "a":
                return new ConcreteProductA();
            case "b":
                return new ConcreteProductB();
            default:
                throw new IllegalArgumentException("未知的產品類型: " + type);
        }
    }
}
```

### 3. 觀察者模式（Observer Pattern）

```java
/**
 * UML 類別圖:
 * 
 * ┌─────────────────┐         ┌─────────────────┐
 * │    Subject      │◄────────│    Observer     │
 * │   <<interface>> │         │   <<interface>> │
 * │                 │         │                 │
 * │+ attach(Observer)│         │+ update()       │
 * │+ detach(Observer)│         │                 │
 * │+ notifyObservers()│        └─────────────────┘
 * └─────────────────┘                  △
 *          △                           │
 *          │                           │
 * ┌─────────────────┐         ┌─────────────────┐
 * │ConcreteSubject  │         │ConcreteObserver │
 * │                 │         │                 │
 * │- observers: List│         │- subject: Subject│
 * │- state: String  │         │                 │
 * └─────────────────┘         └─────────────────┘
 */

public interface Subject {
    void attach(Observer observer);
    void detach(Observer observer);
    void notifyObservers();
}

public interface Observer {
    void update(String message);
}

public class ConcreteSubject implements Subject {
    private List<Observer> observers = new ArrayList<>();
    private String state;
    
    @Override
    public void attach(Observer observer) {
        observers.add(observer);
    }
    
    @Override
    public void detach(Observer observer) {
        observers.remove(observer);
    }
    
    @Override
    public void notifyObservers() {
        for (Observer observer : observers) {
            observer.update(state);
        }
    }
    
    public void setState(String state) {
        this.state = state;
        notifyObservers();
    }
}

public class ConcreteObserver implements Observer {
    private String name;
    
    public ConcreteObserver(String name) {
        this.name = name;
    }
    
    @Override
    public void update(String message) {
        System.out.println(name + " 收到更新: " + message);
    }
}
```

## 序列圖（Sequence Diagram）

### 基本概念

序列圖展示物件之間的時間順序互動，包含：
- **參與者（Actor）**：外部用戶或系統
- **物件（Object）**：系統中的物件實例
- **生命線（Lifeline）**：垂直虛線，表示物件的生命週期
- **訊息（Message）**：物件間的互動

### 序列圖範例：訂單處理流程

```java
/**
 * 序列圖表示:
 * 
 * 用戶    訂單服務    庫存服務    付款服務    郵件服務
 *  │        │          │          │          │
 *  │───────►│          │          │          │  1. 創建訂單
 *  │        │─────────►│          │          │  2. 檢查庫存
 *  │        │◄─────────│          │          │  3. 庫存確認
 *  │        │──────────────────►│          │  4. 處理付款
 *  │        │◄──────────────────│          │  5. 付款確認
 *  │        │───────────────────────────►│  6. 發送確認郵件
 *  │        │◄───────────────────────────│  7. 郵件發送成功
 *  │◄───────│          │          │          │  8. 返回訂單確認
 *  │        │          │          │          │
 */

// 對應的 Java 實現
@Service
public class OrderService {
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final EmailService emailService;
    
    public OrderService(InventoryService inventoryService,
                       PaymentService paymentService,
                       EmailService emailService) {
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
        this.emailService = emailService;
    }
    
    public OrderResult createOrder(OrderRequest request) {
        // 1. 創建訂單
        Order order = new Order(request);
        
        // 2-3. 檢查庫存
        if (!inventoryService.checkStock(order.getItems())) {
            return OrderResult.failure("庫存不足");
        }
        
        // 4-5. 處理付款
        PaymentResult paymentResult = paymentService.processPayment(order.getAmount());
        if (!paymentResult.isSuccess()) {
            return OrderResult.failure("付款失敗");
        }
        
        // 6-7. 發送確認郵件
        emailService.sendOrderConfirmation(order);
        
        // 8. 返回訂單確認
        return OrderResult.success(order);
    }
}
```

## 使用案例圖（Use Case Diagram）

### 基本概念

使用案例圖展示系統功能和用戶之間的關係：
- **參與者（Actor）**：與系統互動的外部實體
- **使用案例（Use Case）**：系統提供的功能
- **關係（Relationship）**：參與者和使用案例之間的關係

### 使用案例圖範例：電商系統

```java
/**
 * 使用案例圖表示:
 * 
 *     顧客                        管理員
 *      │                           │
 *      │                           │
 *   ┌─────────────┐           ┌─────────────┐
 *   │  瀏覽商品    │           │  管理商品    │
 *   └─────────────┘           └─────────────┘
 *      │                           │
 *   ┌─────────────┐           ┌─────────────┐
 *   │  添加到購物車 │           │  查看訂單    │
 *   └─────────────┘           └─────────────┘
 *      │                           │
 *   ┌─────────────┐           ┌─────────────┐
 *   │  結帳付款    │           │  管理用戶    │
 *   └─────────────┘           └─────────────┘
 *      │
 *   ┌─────────────┐
 *   │  查看訂單狀態 │
 *   └─────────────┘
 */

// 對應的 Java 實現
@RestController
@RequestMapping("/api")
public class ECommerceController {
    
    private final ProductService productService;
    private final CartService cartService;
    private final OrderService orderService;
    
    // 顧客功能
    @GetMapping("/products")
    public List<Product> browseProducts() {
        return productService.getAllProducts();
    }
    
    @PostMapping("/cart/add")
    public ResponseEntity<Void> addToCart(@RequestBody CartItem item) {
        cartService.addItem(item);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/checkout")
    public ResponseEntity<Order> checkout(@RequestBody CheckoutRequest request) {
        Order order = orderService.processOrder(request);
        return ResponseEntity.ok(order);
    }
    
    @GetMapping("/orders/{id}")
    public ResponseEntity<Order> getOrderStatus(@PathVariable Long id) {
        Order order = orderService.findById(id);
        return ResponseEntity.ok(order);
    }
}

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    
    private final ProductService productService;
    private final OrderService orderService;
    private final UserService userService;
    
    // 管理員功能
    @PostMapping("/products")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product created = productService.createProduct(product);
        return ResponseEntity.ok(created);
    }
    
    @GetMapping("/orders")
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }
    
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }
}
```

## 活動圖（Activity Diagram）

### 基本概念

活動圖展示工作流程和業務邏輯：
- **開始節點**：流程開始
- **結束節點**：流程結束
- **活動（Activity）**：執行的動作
- **決策節點**：條件判斷
- **分支和合併**：並行處理

### 活動圖範例：用戶註冊流程

```java
/**
 * 活動圖表示:
 * 
 *     ●（開始）
 *     │
 *  ┌─────────────┐
 *  │  輸入用戶信息 │
 *  └─────────────┘
 *     │
 *  ┌─────────────┐
 *  │  驗證輸入    │
 *  └─────────────┘
 *     │
 *    ◇（決策）
 *   ╱ ╲
 *  ╱   ╲
 * ╱有效？╲
 * ╲     ╱
 *  ╲   ╱
 *   ╲ ╱
 *    │
 *   是│     否
 *    │      │
 *    │   ┌─────────────┐
 *    │   │  顯示錯誤    │
 *    │   └─────────────┘
 *    │      │
 *    │      │（回到輸入）
 *    │      │
 *  ┌─────────────┐
 *  │  創建用戶    │
 *  └─────────────┘
 *     │
 *  ┌─────────────┐
 *  │  發送歡迎郵件 │
 *  └─────────────┘
 *     │
 *     ●（結束）
 */

// 對應的 Java 實現
@Service
public class UserRegistrationService {
    
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final UserValidator validator;
    
    public UserRegistrationService(UserRepository userRepository,
                                 EmailService emailService,
                                 UserValidator validator) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.validator = validator;
    }
    
    public RegistrationResult registerUser(UserRegistrationRequest request) {
        // 1. 輸入用戶信息（由前端提供）
        
        // 2. 驗證輸入
        ValidationResult validationResult = validator.validate(request);
        
        // 3. 決策：是否有效
        if (!validationResult.isValid()) {
            // 否：顯示錯誤
            return RegistrationResult.failure(validationResult.getErrors());
        }
        
        // 是：創建用戶
        User user = new User(request.getUsername(), request.getEmail());
        User savedUser = userRepository.save(user);
        
        // 發送歡迎郵件
        emailService.sendWelcomeEmail(savedUser);
        
        return RegistrationResult.success(savedUser);
    }
}
```

## 狀態圖（State Diagram）

### 基本概念

狀態圖展示物件在不同狀態之間的轉換：
- **狀態（State）**：物件的特定條件
- **轉換（Transition）**：從一個狀態到另一個狀態的變化
- **事件（Event）**：觸發轉換的條件
- **動作（Action）**：轉換時執行的操作

### 狀態圖範例：訂單狀態管理

```java
/**
 * 狀態圖表示:
 * 
 *     ●（初始）
 *     │
 *     │ 創建訂單
 *     ▼
 *  ┌─────────────┐
 *  │   PENDING   │
 *  │  (待處理)    │
 *  └─────────────┘
 *     │       │
 *     │確認    │取消
 *     ▼       ▼
 *  ┌─────────────┐  ┌─────────────┐
 *  │ CONFIRMED   │  │ CANCELLED   │
 *  │  (已確認)    │  │  (已取消)    │
 *  └─────────────┘  └─────────────┘
 *     │                    │
 *     │發貨                │
 *     ▼                    ▼
 *  ┌─────────────┐        ●（結束）
 *  │  SHIPPED    │
 *  │  (已發貨)    │
 *  └─────────────┘
 *     │
 *     │完成
 *     ▼
 *  ┌─────────────┐
 *  │ DELIVERED   │
 *  │  (已送達)    │
 *  └─────────────┘
 *     │
 *     ▼
 *    ●（結束）
 */

// 對應的 Java 實現
public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}

@Entity
public class Order {
    @Id
    private String id;
    
    @Enumerated(EnumType.STRING)
    private OrderStatus status;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public Order() {
        this.status = OrderStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // 狀態轉換方法
    public void confirm() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("只有待處理的訂單可以確認");
        }
        this.status = OrderStatus.CONFIRMED;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void cancel() {
        if (status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("已發貨或已送達的訂單不能取消");
        }
        this.status = OrderStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void ship() {
        if (status != OrderStatus.CONFIRMED) {
            throw new IllegalStateException("只有已確認的訂單可以發貨");
        }
        this.status = OrderStatus.SHIPPED;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void deliver() {
        if (status != OrderStatus.SHIPPED) {
            throw new IllegalStateException("只有已發貨的訂單可以標記為送達");
        }
        this.status = OrderStatus.DELIVERED;
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public OrderStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

@Service
public class OrderStateService {
    
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    public OrderStateService(OrderRepository orderRepository,
                           ApplicationEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public void confirmOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("訂單不存在: " + orderId));
        
        order.confirm();
        orderRepository.save(order);
        
        eventPublisher.publishEvent(new OrderConfirmedEvent(order));
    }
    
    @Transactional
    public void cancelOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("訂單不存在: " + orderId));
        
        order.cancel();
        orderRepository.save(order);
        
        eventPublisher.publishEvent(new OrderCancelledEvent(order));
    }
    
    @Transactional
    public void shipOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("訂單不存在: " + orderId));
        
        order.ship();
        orderRepository.save(order);
        
        eventPublisher.publishEvent(new OrderShippedEvent(order));
    }
    
    @Transactional
    public void deliverOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("訂單不存在: " + orderId));
        
        order.deliver();
        orderRepository.save(order);
        
        eventPublisher.publishEvent(new OrderDeliveredEvent(order));
    }
}
```

## 企業級應用：微服務架構 UML 設計

### 系統架構圖

```java
/**
 * 微服務架構部署圖:
 * 
 *  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 *  │  用戶服務     │    │  訂單服務     │    │  商品服務     │
 *  │ User Service │    │Order Service│    │Product Service│
 *  │   :8081      │    │   :8082     │    │   :8083      │
 *  └─────────────┘    └─────────────┘    └─────────────┘
 *         │                   │                   │
 *         └───────────────────┼───────────────────┘
 *                             │
 *                    ┌─────────────┐
 *                    │  API Gateway │
 *                    │   :8080     │
 *                    └─────────────┘
 *                             │
 *                    ┌─────────────┐
 *                    │  前端應用     │
 *                    │   :3000     │
 *                    └─────────────┘
 */

// API Gateway 配置
@Configuration
@EnableZuulProxy
public class GatewayConfig {
    
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("user-service", r -> r.path("/api/users/**")
                .uri("lb://user-service"))
            .route("order-service", r -> r.path("/api/orders/**")
                .uri("lb://order-service"))
            .route("product-service", r -> r.path("/api/products/**")
                .uri("lb://product-service"))
            .build();
    }
}

// 服務間通信接口
@FeignClient(name = "user-service")
public interface UserServiceClient {
    
    @GetMapping("/api/users/{id}")
    User getUserById(@PathVariable Long id);
    
    @PostMapping("/api/users")
    User createUser(@RequestBody CreateUserRequest request);
}

@FeignClient(name = "product-service")
public interface ProductServiceClient {
    
    @GetMapping("/api/products/{id}")
    Product getProductById(@PathVariable Long id);
    
    @PostMapping("/api/products/reserve")
    ReservationResult reserveProducts(@RequestBody List<ProductReservation> reservations);
}

// 訂單服務實現
@Service
public class OrderService {
    
    private final UserServiceClient userServiceClient;
    private final ProductServiceClient productServiceClient;
    private final OrderRepository orderRepository;
    
    public OrderService(UserServiceClient userServiceClient,
                       ProductServiceClient productServiceClient,
                       OrderRepository orderRepository) {
        this.userServiceClient = userServiceClient;
        this.productServiceClient = productServiceClient;
        this.orderRepository = orderRepository;
    }
    
    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        // 驗證用戶
        User user = userServiceClient.getUserById(request.getUserId());
        if (user == null) {
            throw new UserNotFoundException("用戶不存在");
        }
        
        // 預留商品
        List<ProductReservation> reservations = request.getItems().stream()
            .map(item -> new ProductReservation(item.getProductId(), item.getQuantity()))
            .collect(Collectors.toList());
        
        ReservationResult result = productServiceClient.reserveProducts(reservations);
        if (!result.isSuccess()) {
            throw new ProductReservationException("商品預留失敗");
        }
        
        // 創建訂單
        Order order = new Order(user.getId(), request.getItems());
        return orderRepository.save(order);
    }
}
```

## UML 建模最佳實踐

### 1. 模型一致性

```java
// 保持模型與代碼的一致性
public class Customer {
    private String customerId;
    private String name;
    private String email;
    private List<Order> orders;
    
    // 構造函數
    public Customer(String customerId, String name, String email) {
        this.customerId = customerId;
        this.name = name;
        this.email = email;
        this.orders = new ArrayList<>();
    }
    
    // UML 中定義的方法
    public void addOrder(Order order) {
        orders.add(order);
        order.setCustomer(this);
    }
    
    public List<Order> getOrders() {
        return Collections.unmodifiableList(orders);
    }
}
```

### 2. 適當的抽象級別

```java
// 高層設計 - 顯示主要組件
public interface PaymentService {
    PaymentResult processPayment(PaymentRequest request);
}

// 詳細設計 - 顯示具體實現
@Service
public class CreditCardPaymentService implements PaymentService {
    
    private final CreditCardValidator validator;
    private final PaymentGateway gateway;
    private final TransactionLogger logger;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // 詳細實現邏輯
        if (!validator.validate(request)) {
            return PaymentResult.failure("驗證失敗");
        }
        
        GatewayResponse response = gateway.charge(request);
        logger.log(request, response);
        
        return response.isSuccess() ? 
            PaymentResult.success(response.getTransactionId()) :
            PaymentResult.failure(response.getErrorMessage());
    }
}
```

### 3. 文檔化標準

```java
/**
 * 類別文檔模板
 * 
 * 類別名稱: OrderProcessor
 * 職責: 處理訂單相關的業務邏輯
 * 協作者: OrderRepository, PaymentService, InventoryService
 * 
 * 生命週期:
 * - 創建: 通過 Spring 容器自動創建
 * - 銷毀: 應用程式關閉時自動銷毀
 * 
 * 狀態: 無狀態服務
 * 
 * 異常: 
 * - OrderNotFoundException: 訂單不存在
 * - PaymentException: 付款處理異常
 * - InventoryException: 庫存不足
 */
@Service
public class OrderProcessor {
    
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    
    public OrderProcessor(OrderRepository orderRepository,
                         PaymentService paymentService,
                         InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }
    
    /**
     * 處理訂單
     * 
     * 前置條件:
     * - 訂單必須存在
     * - 商品庫存充足
     * - 付款信息有效
     * 
     * 後置條件:
     * - 訂單狀態更新
     * - 庫存數量減少
     * - 付款記錄創建
     * 
     * @param orderId 訂單ID
     * @return 處理結果
     * @throws OrderNotFoundException 訂單不存在
     * @throws PaymentException 付款失敗
     * @throws InventoryException 庫存不足
     */
    @Transactional
    public OrderResult processOrder(String orderId) {
        // 實現邏輯
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("訂單不存在: " + orderId));
        
        // 檢查庫存
        if (!inventoryService.checkStock(order.getItems())) {
            throw new InventoryException("庫存不足");
        }
        
        // 處理付款
        PaymentResult paymentResult = paymentService.processPayment(order.getPaymentInfo());
        if (!paymentResult.isSuccess()) {
            throw new PaymentException("付款失敗: " + paymentResult.getErrorMessage());
        }
        
        // 更新訂單狀態
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        
        return OrderResult.success(order);
    }
}
```

## 總結

UML 統一建模語言是軟體開發中的重要工具：

### 關鍵優勢

1. **視覺化溝通**：提供清晰的視覺表示，促進團隊溝通
2. **設計驗證**：在編碼前驗證設計的正確性
3. **文檔化**：為系統提供完整的文檔
4. **標準化**：統一的符號和語義，便於理解

### 最佳實踐

1. **適當的細節層次**：根據目標受眾選擇合適的抽象級別
2. **模型一致性**：確保 UML 模型與實際代碼保持一致
3. **迭代改進**：隨著系統演進不斷更新 UML 模型
4. **工具支援**：使用專業的 UML 建模工具提高效率

### 現代應用

在現代軟體開發中，UML 特別適用於：
- 微服務架構設計
- 領域驅動設計（DDD）
- 企業級應用架構
- 系統整合設計

通過正確使用 UML，可以大幅提升軟體設計的品質和團隊協作效率。

## 參考資料

- [UML 2.5 官方規範](https://www.omg.org/spec/UML/2.5.1/)
- [Martin Fowler - UML Distilled](https://martinfowler.com/books/uml.html)
- [Object-Oriented Analysis and Design with Applications](https://www.amazon.com/Object-Oriented-Analysis-Design-Applications-3rd/dp/020189551X)
- [Spring Boot 官方文檔](https://spring.io/projects/spring-boot)