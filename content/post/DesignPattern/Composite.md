---
title: "DesignPattern - Structural - Composite"
author: Bill.Lin
date: 2018-08-07T12:15:31+08:00
draft: false
tags: ["Design Pattern", "Structural", "Composite", "Tree Structure"]
Description: "Comprehensive guide to Composite Pattern with modern Java implementations, Spring Boot integration, and real-world examples"
Categories: ["DesignPattern"]
DisableComments: false
---

# Composite Pattern

## 概述

Composite Pattern 讓客戶端可以統一處理單個對象和對象的組合。它將對象組織成樹狀結構，使得客戶端能夠以一致的方式處理個別對象和組合對象。

## 核心概念

### 結構組件

- **Component**: 所有組合對象的通用接口，定義了葉子和組合節點的共同操作
- **Leaf**: 葉子節點，實現 Component 接口，不包含子節點
- **Composite**: 組合節點，包含子節點（可以是葉子或其他組合節點）

### 關鍵特性

1. **統一操作**: 對葉子和組合節點執行相同的操作
2. **樹狀結構**: 支持遞歸組合
3. **透明性**: 客戶端不需要區分葉子和組合節點

## 基本實現

### 1. 員工層次結構示例

```java
// Component 接口
public interface Employee {
    void add(Employee employee);
    void remove(Employee employee);
    Employee getChild(int index);
    String getName();
    double getSalary();
    void print();
    void printStructure(String indent);
}

// Leaf 實現 - 開發者
public class Developer implements Employee {
    private String name;
    private double salary;
    private String position;
    
    public Developer(String name, double salary, String position) {
        this.name = name;
        this.salary = salary;
        this.position = position;
    }
    
    @Override
    public void add(Employee employee) {
        throw new UnsupportedOperationException("Developer cannot add employees");
    }
    
    @Override
    public void remove(Employee employee) {
        throw new UnsupportedOperationException("Developer cannot remove employees");
    }
    
    @Override
    public Employee getChild(int index) {
        throw new UnsupportedOperationException("Developer has no children");
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public double getSalary() {
        return salary;
    }
    
    @Override
    public void print() {
        System.out.println("Developer: " + name + ", Salary: " + salary + ", Position: " + position);
    }
    
    @Override
    public void printStructure(String indent) {
        System.out.println(indent + "└── " + name + " (" + position + ")");
    }
}

// Composite 實現 - 管理者
public class Manager implements Employee {
    private String name;
    private double salary;
    private String department;
    private List<Employee> subordinates = new ArrayList<>();
    
    public Manager(String name, double salary, String department) {
        this.name = name;
        this.salary = salary;
        this.department = department;
    }
    
    @Override
    public void add(Employee employee) {
        subordinates.add(employee);
    }
    
    @Override
    public void remove(Employee employee) {
        subordinates.remove(employee);
    }
    
    @Override
    public Employee getChild(int index) {
        return subordinates.get(index);
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public double getSalary() {
        return salary;
    }
    
    @Override
    public void print() {
        System.out.println("Manager: " + name + ", Salary: " + salary + ", Department: " + department);
        System.out.println("Subordinates:");
        for (Employee emp : subordinates) {
            emp.print();
        }
    }
    
    @Override
    public void printStructure(String indent) {
        System.out.println(indent + "├── " + name + " (" + department + " Manager)");
        for (int i = 0; i < subordinates.size(); i++) {
            String newIndent = indent + "│   ";
            if (i == subordinates.size() - 1) {
                newIndent = indent + "    ";
            }
            subordinates.get(i).printStructure(newIndent);
        }
    }
    
    public double getTotalSalary() {
        double total = salary;
        for (Employee emp : subordinates) {
            total += emp.getSalary();
            if (emp instanceof Manager) {
                total += ((Manager) emp).getTotalSalary() - emp.getSalary();
            }
        }
        return total;
    }
}
```

### 2. 測試示例

```java
public class CompositePatternDemo {
    public static void main(String[] args) {
        // 創建開發者
        Employee dev1 = new Developer("Alice", 80000, "Senior Java Developer");
        Employee dev2 = new Developer("Bob", 70000, "Frontend Developer");
        Employee dev3 = new Developer("Charlie", 85000, "Full Stack Developer");
        
        // 創建團隊經理
        Manager teamLead = new Manager("David", 100000, "Development Team");
        teamLead.add(dev1);
        teamLead.add(dev2);
        
        // 創建技術經理
        Manager techManager = new Manager("Eve", 120000, "Technology");
        techManager.add(dev3);
        techManager.add(teamLead);
        
        // 創建部門經理
        Manager deptManager = new Manager("Frank", 150000, "Engineering");
        deptManager.add(techManager);
        
        // 打印組織結構
        System.out.println("=== Organization Structure ===");
        deptManager.printStructure("");
        
        System.out.println("\n=== Total Department Salary: " + deptManager.getTotalSalary() + " ===");
    }
}
```

## 現代 Java 實現

### 1. 使用 Java 8+ 特性

```java
// 使用 Optional 和 Stream API
public interface ModernComponent {
    String getName();
    double getValue();
    Optional<List<ModernComponent>> getChildren();
    
    default void process() {
        System.out.println("Processing: " + getName());
        getChildren().ifPresent(children ->
            children.forEach(ModernComponent::process)
        );
    }
    
    default double getTotalValue() {
        return getValue() + 
               getChildren().orElse(Collections.emptyList())
                          .stream()
                          .mapToDouble(ModernComponent::getTotalValue)
                          .sum();
    }
    
    default long countElements() {
        return 1 + getChildren().orElse(Collections.emptyList())
                                .stream()
                                .mapToLong(ModernComponent::countElements)
                                .sum();
    }
}

// 葉子節點實現
public class ModernLeaf implements ModernComponent {
    private final String name;
    private final double value;
    
    public ModernLeaf(String name, double value) {
        this.name = name;
        this.value = value;
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public double getValue() {
        return value;
    }
    
    @Override
    public Optional<List<ModernComponent>> getChildren() {
        return Optional.empty();
    }
}

// 組合節點實現
public class ModernComposite implements ModernComponent {
    private final String name;
    private final double value;
    private final List<ModernComponent> children = new CopyOnWriteArrayList<>();
    
    public ModernComposite(String name, double value) {
        this.name = name;
        this.value = value;
    }
    
    public void add(ModernComponent component) {
        children.add(component);
    }
    
    public void remove(ModernComponent component) {
        children.remove(component);
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public double getValue() {
        return value;
    }
    
    @Override
    public Optional<List<ModernComponent>> getChildren() {
        return Optional.of(Collections.unmodifiableList(children));
    }
}
```

### 2. 函數式編程版本

```java
// 使用函數式接口
@FunctionalInterface
public interface ComponentProcessor<T> {
    void process(T item);
}

// 通用的組合模式操作
public class FunctionalComposite<T> {
    private final T value;
    private final List<FunctionalComposite<T>> children = new ArrayList<>();
    
    public FunctionalComposite(T value) {
        this.value = value;
    }
    
    public void add(FunctionalComposite<T> child) {
        children.add(child);
    }
    
    public void forEach(ComponentProcessor<T> processor) {
        processor.process(value);
        children.forEach(child -> child.forEach(processor));
    }
    
    public <R> R reduce(R identity, BinaryOperator<R> accumulator, Function<T, R> mapper) {
        R result = accumulator.apply(identity, mapper.apply(value));
        for (FunctionalComposite<T> child : children) {
            result = accumulator.apply(result, child.reduce(identity, accumulator, mapper));
        }
        return result;
    }
    
    public Stream<T> stream() {
        return Stream.concat(
            Stream.of(value),
            children.stream().flatMap(FunctionalComposite::stream)
        );
    }
}
```

## Spring Boot 集成

### 1. 服務層組合模式

```java
// 抽象服務組件
public abstract class ServiceComponent {
    protected String name;
    protected boolean enabled;
    
    public ServiceComponent(String name) {
        this.name = name;
        this.enabled = true;
    }
    
    public abstract void execute();
    public abstract List<ServiceComponent> getChildren();
    
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
    
    public boolean isEnabled() {
        return enabled;
    }
    
    public String getName() {
        return name;
    }
}

// 葉子服務
@Component
public class EmailService extends ServiceComponent {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    public EmailService() {
        super("Email Service");
    }
    
    @Override
    public void execute() {
        if (enabled) {
            logger.info("Executing email service...");
            // Email sending logic
        }
    }
    
    @Override
    public List<ServiceComponent> getChildren() {
        return Collections.emptyList();
    }
}

// 組合服務
@Component
public class NotificationService extends ServiceComponent {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private final List<ServiceComponent> services = new ArrayList<>();
    
    public NotificationService() {
        super("Notification Service");
    }
    
    @Autowired
    public void setServices(List<ServiceComponent> services) {
        this.services.addAll(services.stream()
            .filter(service -> !service.equals(this))
            .collect(Collectors.toList()));
    }
    
    @Override
    public void execute() {
        if (enabled) {
            logger.info("Executing notification service...");
            services.forEach(ServiceComponent::execute);
        }
    }
    
    @Override
    public List<ServiceComponent> getChildren() {
        return Collections.unmodifiableList(services);
    }
}

// 服務編排器
@Service
public class ServiceOrchestrator {
    private final List<ServiceComponent> rootServices;
    
    public ServiceOrchestrator(List<ServiceComponent> services) {
        this.rootServices = services.stream()
            .filter(service -> service instanceof NotificationService)
            .collect(Collectors.toList());
    }
    
    public void executeAll() {
        rootServices.forEach(ServiceComponent::execute);
    }
    
    public void executeService(String serviceName) {
        findService(serviceName).ifPresent(ServiceComponent::execute);
    }
    
    private Optional<ServiceComponent> findService(String name) {
        return rootServices.stream()
            .filter(service -> service.getName().equals(name))
            .findFirst();
    }
}
```

### 2. 配置管理組合模式

```java
@Configuration
@ConfigurationProperties(prefix = "app")
public class CompositeConfiguration {
    
    @Component
    public static class ConfigNode {
        private String name;
        private String value;
        private List<ConfigNode> children = new ArrayList<>();
        
        public void addChild(ConfigNode child) {
            children.add(child);
        }
        
        public Optional<String> getValue(String path) {
            if (path.equals(name)) {
                return Optional.ofNullable(value);
            }
            
            return children.stream()
                .map(child -> child.getValue(path))
                .filter(Optional::isPresent)
                .findFirst()
                .orElse(Optional.empty());
        }
        
        // Getters and setters
    }
    
    @Bean
    public ConfigNode rootConfig() {
        ConfigNode root = new ConfigNode();
        root.setName("application");
        
        ConfigNode database = new ConfigNode();
        database.setName("database");
        database.setValue("mysql://localhost:3306/app");
        
        ConfigNode cache = new ConfigNode();
        cache.setName("cache");
        cache.setValue("redis://localhost:6379");
        
        root.addChild(database);
        root.addChild(cache);
        
        return root;
    }
}
```

## 實際應用場景

### 1. 文件系統

```java
// 文件系統組合模式
public abstract class FileSystemNode {
    protected String name;
    protected long size;
    protected Date lastModified;
    
    public FileSystemNode(String name) {
        this.name = name;
        this.lastModified = new Date();
    }
    
    public abstract long getSize();
    public abstract void display(String indent);
    public abstract List<FileSystemNode> getChildren();
    
    public String getName() {
        return name;
    }
}

public class File extends FileSystemNode {
    private long fileSize;
    
    public File(String name, long size) {
        super(name);
        this.fileSize = size;
    }
    
    @Override
    public long getSize() {
        return fileSize;
    }
    
    @Override
    public void display(String indent) {
        System.out.println(indent + "📄 " + name + " (" + fileSize + " bytes)");
    }
    
    @Override
    public List<FileSystemNode> getChildren() {
        return Collections.emptyList();
    }
}

public class Directory extends FileSystemNode {
    private List<FileSystemNode> contents = new ArrayList<>();
    
    public Directory(String name) {
        super(name);
    }
    
    public void add(FileSystemNode node) {
        contents.add(node);
    }
    
    @Override
    public long getSize() {
        return contents.stream()
            .mapToLong(FileSystemNode::getSize)
            .sum();
    }
    
    @Override
    public void display(String indent) {
        System.out.println(indent + "📁 " + name + "/");
        contents.forEach(node -> node.display(indent + "  "));
    }
    
    @Override
    public List<FileSystemNode> getChildren() {
        return Collections.unmodifiableList(contents);
    }
}
```

### 2. GUI 組件

```java
// GUI 組合模式
public abstract class UIComponent {
    protected String name;
    protected boolean visible = true;
    
    public UIComponent(String name) {
        this.name = name;
    }
    
    public abstract void render();
    public abstract void addChild(UIComponent child);
    public abstract void removeChild(UIComponent child);
    public abstract List<UIComponent> getChildren();
    
    public void setVisible(boolean visible) {
        this.visible = visible;
    }
    
    public boolean isVisible() {
        return visible;
    }
}

public class Button extends UIComponent {
    private String text;
    
    public Button(String name, String text) {
        super(name);
        this.text = text;
    }
    
    @Override
    public void render() {
        if (visible) {
            System.out.println("Rendering button: " + text);
        }
    }
    
    @Override
    public void addChild(UIComponent child) {
        throw new UnsupportedOperationException("Button cannot have children");
    }
    
    @Override
    public void removeChild(UIComponent child) {
        throw new UnsupportedOperationException("Button cannot have children");
    }
    
    @Override
    public List<UIComponent> getChildren() {
        return Collections.emptyList();
    }
}

public class Panel extends UIComponent {
    private List<UIComponent> children = new ArrayList<>();
    
    public Panel(String name) {
        super(name);
    }
    
    @Override
    public void render() {
        if (visible) {
            System.out.println("Rendering panel: " + name);
            children.forEach(UIComponent::render);
        }
    }
    
    @Override
    public void addChild(UIComponent child) {
        children.add(child);
    }
    
    @Override
    public void removeChild(UIComponent child) {
        children.remove(child);
    }
    
    @Override
    public List<UIComponent> getChildren() {
        return Collections.unmodifiableList(children);
    }
}
```

## 性能優化

### 1. 懶加載和緩存

```java
public class OptimizedComposite {
    private final String name;
    private final Supplier<List<OptimizedComposite>> childrenSupplier;
    private List<OptimizedComposite> cachedChildren;
    private final Map<String, Object> computedValues = new ConcurrentHashMap<>();
    
    public OptimizedComposite(String name, Supplier<List<OptimizedComposite>> childrenSupplier) {
        this.name = name;
        this.childrenSupplier = childrenSupplier;
    }
    
    public List<OptimizedComposite> getChildren() {
        if (cachedChildren == null) {
            cachedChildren = childrenSupplier.get();
        }
        return cachedChildren;
    }
    
    @SuppressWarnings("unchecked")
    public <T> T computeIfAbsent(String key, Function<OptimizedComposite, T> computer) {
        return (T) computedValues.computeIfAbsent(key, k -> computer.apply(this));
    }
    
    public void invalidateCache() {
        cachedChildren = null;
        computedValues.clear();
    }
}
```

### 2. 並行處理

```java
public class ParallelComposite {
    private final String name;
    private final List<ParallelComposite> children = new CopyOnWriteArrayList<>();
    private final ForkJoinPool customThreadPool;
    
    public ParallelComposite(String name, int parallelism) {
        this.name = name;
        this.customThreadPool = new ForkJoinPool(parallelism);
    }
    
    public void processParallel(Consumer<String> processor) {
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        // 處理當前節點
        futures.add(CompletableFuture.runAsync(() -> processor.accept(name), customThreadPool));
        
        // 並行處理子節點
        for (ParallelComposite child : children) {
            futures.add(CompletableFuture.runAsync(() -> child.processParallel(processor), customThreadPool));
        }
        
        // 等待所有任務完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
}
```

## 測試策略

### 1. 單元測試

```java
@ExtendWith(MockitoExtension.class)
class CompositePatternTest {
    
    @Test
    void testLeafNode() {
        Employee developer = new Developer("John", 80000, "Java Developer");
        
        assertEquals("John", developer.getName());
        assertEquals(80000, developer.getSalary());
        
        assertThrows(UnsupportedOperationException.class, () -> developer.add(null));
        assertThrows(UnsupportedOperationException.class, () -> developer.remove(null));
        assertThrows(UnsupportedOperationException.class, () -> developer.getChild(0));
    }
    
    @Test
    void testCompositeNode() {
        Manager manager = new Manager("Alice", 120000, "Engineering");
        Employee dev1 = new Developer("Bob", 80000, "Senior Developer");
        Employee dev2 = new Developer("Charlie", 70000, "Junior Developer");
        
        manager.add(dev1);
        manager.add(dev2);
        
        assertEquals("Alice", manager.getName());
        assertEquals(120000, manager.getSalary());
        assertEquals(270000, manager.getTotalSalary()); // 120000 + 80000 + 70000
        assertEquals(dev1, manager.getChild(0));
        assertEquals(dev2, manager.getChild(1));
    }
    
    @Test
    void testHierarchicalStructure() {
        Employee dev = new Developer("John", 80000, "Developer");
        Manager teamLead = new Manager("Alice", 100000, "Team Lead");
        Manager director = new Manager("Bob", 150000, "Director");
        
        teamLead.add(dev);
        director.add(teamLead);
        
        assertEquals(330000, director.getTotalSalary());
    }
}
```

### 2. 集成測試

```java
@SpringBootTest
class CompositeServiceTest {
    
    @Autowired
    private ServiceOrchestrator orchestrator;
    
    @Test
    void testServiceExecution() {
        // 測試服務編排器是否正確執行所有服務
        assertDoesNotThrow(() -> orchestrator.executeAll());
    }
    
    @Test
    void testSpecificServiceExecution() {
        // 測試特定服務的執行
        assertDoesNotThrow(() -> orchestrator.executeService("Notification Service"));
    }
}
```

## 最佳實踐

### 1. 設計原則

- **統一接口**: 確保葉子和組合節點實現相同的接口
- **透明性**: 客戶端不需要知道處理的是葉子還是組合節點
- **安全性**: 在不適當的操作上拋出異常
- **性能**: 考慮懶加載和緩存機制

### 2. 實現建議

- 使用不可變對象提高線程安全性
- 實現 `equals()` 和 `hashCode()` 方法
- 提供便利的工廠方法
- 考慮使用 Builder 模式構建複雜結構

### 3. 常見陷阱

- 避免循環引用
- 注意內存洩漏（特別是在大型樹結構中）
- 正確處理併發訪問
- 避免過度使用（當結構簡單時）

## 適用場景

### 何時使用

1. **層次結構**: 需要表示部分-整體的層次結構
2. **統一處理**: 希望統一處理個別對象和組合對象
3. **樹狀組織**: 數據自然形成樹狀結構
4. **遞歸操作**: 需要對結構進行遞歸操作

### 何時避免

1. **簡單結構**: 當結構過於簡單時會增加不必要的複雜性
2. **類型安全**: 當需要強類型檢查時
3. **性能關鍵**: 當性能是關鍵因素且結構頻繁變化時

## 總結

Composite Pattern 是一個強大的結構型設計模式，它能夠優雅地處理樹狀結構的數據。通過統一的接口，它讓客戶端能夠透明地處理單個對象和對象組合，大大簡化了代碼的複雜性。在現代 Java 開發中，結合 Stream API、Optional 和 Spring Boot，我們可以創建更加靈活、高效和易於維護的組合模式實現。

關鍵是要理解何時使用這個模式，並根據具體的業務需求選擇合適的實現方式。無論是簡單的組織結構還是複雜的企業級應用，Composite Pattern 都能提供清晰、可擴展的解決方案。