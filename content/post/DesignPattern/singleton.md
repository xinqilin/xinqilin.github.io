---
title: "Singleton 設計模式完整指南：單例實作與現代化最佳實踐"
author: Bill.Lin
date: 2018-08-06T23:05:44+08:00
draft: false
tags: ["Design Pattern", "Singleton", "Java", "Thread Safety", "Best Practices", "Creational Pattern"]
Description: "深入解析 Singleton 設計模式的各種實作方式，包含執行緒安全、反射攻擊防護與現代化最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 概述

Singleton（單例模式）是最常見的創建型設計模式之一，它確保一個類別在整個應用程式生命週期中只有一個實例存在，並提供全域訪問點。這個模式廣泛應用於資料庫連線池、日志記錄器、快取管理器、設定管理器等場景。

### 單例模式的核心特徵

1. **唯一實例**：確保類別只有一個實例
2. **全域訪問**：提供全域訪問該實例的方法
3. **自我實例化**：類別自己負責創建和管理實例
4. **延遲初始化**：通常在首次需要時才創建實例

## 傳統實作方式

### 1. 餓漢式（Eager Initialization）

```java
/**
 * 餓漢式單例 - 類別載入時立即創建實例
 * 優點：執行緒安全、實作簡單
 * 缺點：不管是否使用都會創建實例，可能造成資源浪費
 */
public class EagerSingleton {
    
    // 在類別載入時就創建實例
    private static final EagerSingleton INSTANCE = new EagerSingleton();
    
    // 私有建構子防止外部實例化
    private EagerSingleton() {
        // 防止反射攻擊
        if (INSTANCE != null) {
            throw new IllegalStateException("單例已存在，不能創建新實例");
        }
        System.out.println("EagerSingleton 實例創建");
    }
    
    public static EagerSingleton getInstance() {
        return INSTANCE;
    }
    
    // 業務方法範例
    public void doSomething() {
        System.out.println("執行 EagerSingleton 業務邏輯");
    }
    
    // 防止克隆攻擊
    @Override
    protected Object clone() throws CloneNotSupportedException {
        throw new CloneNotSupportedException("單例不支援克隆");
    }
    
    // 防止序列化攻擊
    private Object readResolve() {
        return INSTANCE;
    }
}
```

### 2. 懶漢式（Lazy Initialization）

```java
/**
 * 懶漢式單例 - 延遲創建實例
 * 問題：執行緒不安全
 */
public class LazySingleton {
    
    private static LazySingleton instance;
    
    private LazySingleton() {
        System.out.println("LazySingleton 實例創建");
    }
    
    // ❌ 執行緒不安全的實作
    public static LazySingleton getInstance() {
        if (instance == null) {
            instance = new LazySingleton();
        }
        return instance;
    }
}
```

### 3. 執行緒安全的懶漢式

```java
/**
 * 執行緒安全的懶漢式單例
 * 優點：執行緒安全、延遲初始化
 * 缺點：性能開銷大（每次訪問都需要同步）
 */
public class ThreadSafeLazySingleton {
    
    private static ThreadSafeLazySingleton instance;
    
    private ThreadSafeLazySingleton() {
        System.out.println("ThreadSafeLazySingleton 實例創建");
    }
    
    // ❌ 性能較差的同步方法
    public static synchronized ThreadSafeLazySingleton getInstance() {
        if (instance == null) {
            instance = new ThreadSafeLazySingleton();
        }
        return instance;
    }
}
```

## 推薦的現代化實作方式

### 1. Double-Checked Locking（雙重檢查鎖定）

```java
/**
 * 雙重檢查鎖定單例
 * 優點：執行緒安全、性能好、延遲初始化
 * 推薦：現代 Java 應用的標準實作
 */
public class DoubleCheckedSingleton {
    
    // volatile 關鍵字確保可見性和禁止指令重排序
    private static volatile DoubleCheckedSingleton instance;
    
    private DoubleCheckedSingleton() {
        // 防止反射攻擊
        if (instance != null) {
            throw new IllegalStateException("單例已存在，不能創建新實例");
        }
        
        // 模擬複雜的初始化過程
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        System.out.println("DoubleCheckedSingleton 實例創建");
    }
    
    public static DoubleCheckedSingleton getInstance() {
        // 第一次檢查：避免不必要的同步
        if (instance == null) {
            synchronized (DoubleCheckedSingleton.class) {
                // 第二次檢查：確保只創建一個實例
                if (instance == null) {
                    instance = new DoubleCheckedSingleton();
                }
            }
        }
        return instance;
    }
    
    public void performOperation() {
        System.out.println("執行 DoubleCheckedSingleton 操作");
    }
    
    // 防止克隆攻擊
    @Override
    protected Object clone() throws CloneNotSupportedException {
        throw new CloneNotSupportedException("單例不支援克隆");
    }
    
    // 防止序列化攻擊
    private Object readResolve() {
        return instance;
    }
}
```

### 2. 靜態內部類別（Initialization-on-demand Holder）

```java
/**
 * 靜態內部類別單例
 * 優點：執行緒安全、延遲初始化、性能最佳、程式碼簡潔
 * 推薦：最優雅的實作方式
 */
public class StaticHolderSingleton {
    
    private StaticHolderSingleton() {
        System.out.println("StaticHolderSingleton 實例創建");
    }
    
    // 靜態內部類別，只有在被引用時才會載入
    private static class SingletonHolder {
        private static final StaticHolderSingleton INSTANCE = new StaticHolderSingleton();
    }
    
    public static StaticHolderSingleton getInstance() {
        return SingletonHolder.INSTANCE;
    }
    
    public void executeTask() {
        System.out.println("執行 StaticHolderSingleton 任務");
    }
}
```

### 3. 枚舉單例（推薦）

```java
/**
 * 枚舉單例
 * 優點：執行緒安全、防止反射和序列化攻擊、程式碼最簡潔
 * 推薦：Joshua Bloch 推薦的最佳實作方式
 */
public enum EnumSingleton {
    
    INSTANCE;
    
    // 實例變數
    private String data;
    
    // 建構子（枚舉的建構子總是私有的）
    EnumSingleton() {
        this.data = "EnumSingleton 初始化資料";
        System.out.println("EnumSingleton 實例創建");
    }
    
    // 業務方法
    public void setData(String data) {
        this.data = data;
    }
    
    public String getData() {
        return data;
    }
    
    public void processData() {
        System.out.println("處理資料: " + data);
    }
    
    // 可以實作介面
    public void performAction() {
        System.out.println("執行 EnumSingleton 動作");
    }
}

// 使用範例
class EnumSingletonExample {
    public static void main(String[] args) {
        EnumSingleton singleton = EnumSingleton.INSTANCE;
        singleton.setData("更新的資料");
        singleton.processData();
    }
}
```

## 實際應用範例

### 1. 資料庫連線管理器

```java
/**
 * 資料庫連線管理器單例
 * 使用靜態內部類別實作
 */
public class DatabaseManager {
    
    private final HikariDataSource dataSource;
    
    private DatabaseManager() {
        // 初始化連線池配置
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        config.setUsername("user");
        config.setPassword("password");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        
        this.dataSource = new HikariDataSource(config);
        System.out.println("資料庫連線池初始化完成");
    }
    
    private static class Holder {
        private static final DatabaseManager INSTANCE = new DatabaseManager();
    }
    
    public static DatabaseManager getInstance() {
        return Holder.INSTANCE;
    }
    
    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
    
    public void closeDataSource() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            System.out.println("資料庫連線池已關閉");
        }
    }
    
    // JVM 關閉時清理資源
    static {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            DatabaseManager.getInstance().closeDataSource();
        }));
    }
}
```

### 2. 應用程式設定管理器

```java
/**
 * 應用程式設定管理器
 * 使用枚舉實作，支援動態設定更新
 */
public enum ConfigurationManager {
    
    INSTANCE;
    
    private final Properties properties;
    private final Map<String, Object> runtimeConfig;
    private final ReadWriteLock lock;
    
    ConfigurationManager() {
        this.properties = new Properties();
        this.runtimeConfig = new ConcurrentHashMap<>();
        this.lock = new ReentrantReadWriteLock();
        loadConfiguration();
    }
    
    private void loadConfiguration() {
        try (InputStream input = getClass().getClassLoader()
                .getResourceAsStream("application.properties")) {
            
            if (input != null) {
                properties.load(input);
                System.out.println("設定檔載入完成");
            } else {
                System.out.println("找不到設定檔，使用預設設定");
                loadDefaultConfiguration();
            }
            
        } catch (IOException e) {
            System.err.println("載入設定檔失敗: " + e.getMessage());
            loadDefaultConfiguration();
        }
    }
    
    private void loadDefaultConfiguration() {
        properties.setProperty("app.name", "MyApplication");
        properties.setProperty("app.version", "1.0.0");
        properties.setProperty("app.environment", "development");
        properties.setProperty("database.pool.max", "20");
        properties.setProperty("cache.ttl", "3600");
    }
    
    public String getProperty(String key) {
        lock.readLock().lock();
        try {
            return properties.getProperty(key);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    public String getProperty(String key, String defaultValue) {
        lock.readLock().lock();
        try {
            return properties.getProperty(key, defaultValue);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    public void setProperty(String key, String value) {
        lock.writeLock().lock();
        try {
            properties.setProperty(key, value);
            System.out.println("設定已更新: " + key + " = " + value);
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    public int getIntProperty(String key, int defaultValue) {
        try {
            String value = getProperty(key);
            return value != null ? Integer.parseInt(value) : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
    
    public boolean getBooleanProperty(String key, boolean defaultValue) {
        String value = getProperty(key);
        return value != null ? Boolean.parseBoolean(value) : defaultValue;
    }
    
    // 執行時設定（不會持久化）
    public void setRuntimeConfig(String key, Object value) {
        runtimeConfig.put(key, value);
    }
    
    @SuppressWarnings("unchecked")
    public <T> T getRuntimeConfig(String key, Class<T> type, T defaultValue) {
        Object value = runtimeConfig.get(key);
        return type.isInstance(value) ? (T) value : defaultValue;
    }
    
    public void reloadConfiguration() {
        lock.writeLock().lock();
        try {
            properties.clear();
            loadConfiguration();
            System.out.println("設定已重新載入");
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    public Map<String, String> getAllProperties() {
        lock.readLock().lock();
        try {
            Map<String, String> result = new HashMap<>();
            for (String key : properties.stringPropertyNames()) {
                result.put(key, properties.getProperty(key));
            }
            return result;
        } finally {
            lock.readLock().unlock();
        }
    }
}
```

### 3. 日志管理器

```java
/**
 * 自訂日志管理器單例
 * 使用雙重檢查鎖定實作
 */
public class LoggerManager {
    
    private static volatile LoggerManager instance;
    private final Map<String, Logger> loggers;
    private final String logLevel;
    private final boolean enableConsoleOutput;
    private final String logFilePath;
    
    private LoggerManager() {
        this.loggers = new ConcurrentHashMap<>();
        
        // 從設定管理器獲取設定
        ConfigurationManager config = ConfigurationManager.INSTANCE;
        this.logLevel = config.getProperty("log.level", "INFO");
        this.enableConsoleOutput = config.getBooleanProperty("log.console.enabled", true);
        this.logFilePath = config.getProperty("log.file.path", "logs/application.log");
        
        initializeLoggers();
        System.out.println("日志管理器初始化完成");
    }
    
    public static LoggerManager getInstance() {
        if (instance == null) {
            synchronized (LoggerManager.class) {
                if (instance == null) {
                    instance = new LoggerManager();
                }
            }
        }
        return instance;
    }
    
    private void initializeLoggers() {
        // 初始化預設日志記錄器
        createLogger("DEFAULT");
        createLogger("DATABASE");
        createLogger("SECURITY");
        createLogger("PERFORMANCE");
    }
    
    public Logger getLogger(String name) {
        return loggers.computeIfAbsent(name, this::createLogger);
    }
    
    private Logger createLogger(String name) {
        Logger logger = LoggerFactory.getLogger(name);
        
        // 這裡可以根據需要配置 logger 的 appender 和 level
        // 實際應用中通常使用 logback.xml 或 log4j2.xml 配置
        
        System.out.println("創建 Logger: " + name);
        return logger;
    }
    
    public void logInfo(String loggerName, String message) {
        getLogger(loggerName).info(message);
    }
    
    public void logError(String loggerName, String message, Throwable throwable) {
        getLogger(loggerName).error(message, throwable);
    }
    
    public void logDebug(String loggerName, String message) {
        getLogger(loggerName).debug(message);
    }
    
    public void logWarn(String loggerName, String message) {
        getLogger(loggerName).warn(message);
    }
    
    // 獲取所有 logger 的統計資訊
    public Map<String, String> getLoggerStats() {
        Map<String, String> stats = new HashMap<>();
        stats.put("totalLoggers", String.valueOf(loggers.size()));
        stats.put("logLevel", logLevel);
        stats.put("consoleOutput", String.valueOf(enableConsoleOutput));
        stats.put("logFilePath", logFilePath);
        return stats;
    }
}
```

## Spring 框架中的單例模式

### 1. Spring Bean 的單例作用域

```java
/**
 * Spring 中的單例 Bean
 * Spring 預設使用單例作用域管理 Bean
 */
@Component
@Scope(ConfigurableBeanFactory.SCOPE_SINGLETON) // 預設值，可省略
public class SpringSingletonService {
    
    private final String instanceId;
    private final LocalDateTime createdAt;
    
    public SpringSingletonService() {
        this.instanceId = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
        System.out.println("SpringSingletonService 實例創建: " + instanceId);
    }
    
    public String getInstanceInfo() {
        return String.format("實例ID: %s, 創建時間: %s", instanceId, createdAt);
    }
    
    @PostConstruct
    private void init() {
        System.out.println("SpringSingletonService 初始化完成");
    }
    
    @PreDestroy
    private void destroy() {
        System.out.println("SpringSingletonService 銷毀: " + instanceId);
    }
}

/**
 * 使用 @Configuration 和 @Bean 註解創建單例
 */
@Configuration
public class SingletonBeanConfiguration {
    
    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "products", "orders");
    }
    
    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("App-");
        executor.initialize();
        return executor;
    }
}
```

### 2. Spring Boot 中的單例服務

```java
/**
 * Spring Boot 中的單例服務範例
 */
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final CacheManager cacheManager;
    private final String serviceId;
    
    public UserService(UserRepository userRepository, CacheManager cacheManager) {
        this.userRepository = userRepository;
        this.cacheManager = cacheManager;
        this.serviceId = UUID.randomUUID().toString();
        System.out.println("UserService 單例創建: " + serviceId);
    }
    
    @Cacheable("users")
    public User findById(Long id) {
        System.out.println("從資料庫載入用戶: " + id);
        return userRepository.findById(id).orElse(null);
    }
    
    @CacheEvict(value = "users", key = "#user.id")
    public User save(User user) {
        return userRepository.save(user);
    }
    
    public String getServiceInfo() {
        return "UserService 實例ID: " + serviceId;
    }
}
```

## 單例模式的潛在問題與解決方案

### 1. 反射攻擊防護

```java
/**
 * 防範反射攻擊的單例實作
 */
public class ReflectionSafeSingleton {
    
    private static volatile ReflectionSafeSingleton instance;
    private static boolean instanceCreated = false;
    
    private ReflectionSafeSingleton() {
        synchronized (ReflectionSafeSingleton.class) {
            if (instanceCreated) {
                throw new IllegalStateException("單例已存在，禁止透過反射創建新實例");
            }
            instanceCreated = true;
        }
        System.out.println("ReflectionSafeSingleton 實例創建");
    }
    
    public static ReflectionSafeSingleton getInstance() {
        if (instance == null) {
            synchronized (ReflectionSafeSingleton.class) {
                if (instance == null) {
                    instance = new ReflectionSafeSingleton();
                }
            }
        }
        return instance;
    }
}

// 測試反射攻擊
class ReflectionAttackTest {
    public static void main(String[] args) {
        try {
            ReflectionSafeSingleton singleton1 = ReflectionSafeSingleton.getInstance();
            
            Constructor<ReflectionSafeSingleton> constructor = 
                ReflectionSafeSingleton.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            
            // 這裡會拋出 IllegalStateException
            ReflectionSafeSingleton singleton2 = constructor.newInstance();
            
        } catch (Exception e) {
            System.out.println("反射攻擊被阻止: " + e.getMessage());
        }
    }
}
```

### 2. 序列化攻擊防護

```java
/**
 * 防範序列化攻擊的單例實作
 */
public class SerializationSafeSingleton implements Serializable {
    
    private static final long serialVersionUID = 1L;
    private static volatile SerializationSafeSingleton instance;
    
    private SerializationSafeSingleton() {
        System.out.println("SerializationSafeSingleton 實例創建");
    }
    
    public static SerializationSafeSingleton getInstance() {
        if (instance == null) {
            synchronized (SerializationSafeSingleton.class) {
                if (instance == null) {
                    instance = new SerializationSafeSingleton();
                }
            }
        }
        return instance;
    }
    
    // 防止序列化攻擊的關鍵方法
    private Object readResolve() {
        return getInstance();
    }
    
    // 可選：自訂序列化邏輯
    private void writeObject(ObjectOutputStream out) throws IOException {
        out.defaultWriteObject();
    }
    
    private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        in.defaultReadObject();
    }
}
```

### 3. 多執行緒測試

```java
/**
 * 多執行緒環境下的單例測試
 */
public class SingletonThreadTest {
    
    public static void main(String[] args) throws InterruptedException {
        final int threadCount = 1000;
        final CountDownLatch startLatch = new CountDownLatch(1);
        final CountDownLatch endLatch = new CountDownLatch(threadCount);
        final Set<Integer> instanceHashCodes = ConcurrentHashMap.newKeySet();
        
        // 創建多個執行緒同時獲取單例
        for (int i = 0; i < threadCount; i++) {
            new Thread(() -> {
                try {
                    startLatch.await(); // 等待開始信號
                    
                    // 測試不同的單例實作
                    DoubleCheckedSingleton instance1 = DoubleCheckedSingleton.getInstance();
                    StaticHolderSingleton instance2 = StaticHolderSingleton.getInstance();
                    EnumSingleton instance3 = EnumSingleton.INSTANCE;
                    
                    instanceHashCodes.add(System.identityHashCode(instance1));
                    instanceHashCodes.add(System.identityHashCode(instance2));
                    instanceHashCodes.add(System.identityHashCode(instance3));
                    
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    endLatch.countDown();
                }
            }).start();
        }
        
        System.out.println("開始多執行緒單例測試...");
        startLatch.countDown(); // 發出開始信號
        endLatch.await(); // 等待所有執行緒完成
        
        System.out.println("測試完成");
        System.out.println("DoubleCheckedSingleton 不同實例數量: " + 
            (instanceHashCodes.size() >= 3 ? "3 個（正常）" : "異常"));
    }
}
```

## 單例模式的效能比較

```java
/**
 * 不同單例實作的效能測試
 */
public class SingletonPerformanceTest {
    
    private static final int ITERATIONS = 10_000_000;
    
    public static void main(String[] args) {
        // 預熱 JVM
        warmUp();
        
        // 測試不同實作的效能
        testEagerSingleton();
        testDoubleCheckedSingleton();
        testStaticHolderSingleton();
        testEnumSingleton();
    }
    
    private static void warmUp() {
        for (int i = 0; i < 100_000; i++) {
            EagerSingleton.getInstance();
            DoubleCheckedSingleton.getInstance();
            StaticHolderSingleton.getInstance();
            EnumSingleton.INSTANCE.getData();
        }
    }
    
    private static void testEagerSingleton() {
        long startTime = System.nanoTime();
        for (int i = 0; i < ITERATIONS; i++) {
            EagerSingleton.getInstance();
        }
        long endTime = System.nanoTime();
        System.out.printf("EagerSingleton: %.2f ms%n", (endTime - startTime) / 1_000_000.0);
    }
    
    private static void testDoubleCheckedSingleton() {
        long startTime = System.nanoTime();
        for (int i = 0; i < ITERATIONS; i++) {
            DoubleCheckedSingleton.getInstance();
        }
        long endTime = System.nanoTime();
        System.out.printf("DoubleCheckedSingleton: %.2f ms%n", (endTime - startTime) / 1_000_000.0);
    }
    
    private static void testStaticHolderSingleton() {
        long startTime = System.nanoTime();
        for (int i = 0; i < ITERATIONS; i++) {
            StaticHolderSingleton.getInstance();
        }
        long endTime = System.nanoTime();
        System.out.printf("StaticHolderSingleton: %.2f ms%n", (endTime - startTime) / 1_000_000.0);
    }
    
    private static void testEnumSingleton() {
        long startTime = System.nanoTime();
        for (int i = 0; i < ITERATIONS; i++) {
            EnumSingleton.INSTANCE.getData();
        }
        long endTime = System.nanoTime();
        System.out.printf("EnumSingleton: %.2f ms%n", (endTime - startTime) / 1_000_000.0);
    }
}
```

## 總結與最佳實踐

### 推薦的實作方式

1. **枚舉單例**：適合大多數情況，最安全、最簡潔
2. **靜態內部類別**：適合需要延遲初始化的場景
3. **雙重檢查鎖定**：適合複雜初始化邏輯的場景

### 選擇指南

| 場景 | 推薦實作 | 原因 |
|------|----------|------|
| **一般用途** | 枚舉單例 | 最安全、最簡潔 |
| **Spring 應用** | Spring Bean | 框架管理生命週期 |
| **延遲初始化** | 靜態內部類別 | 性能最佳、執行緒安全 |
| **複雜初始化** | 雙重檢查鎖定 | 靈活性高 |
| **簡單場景** | 餓漢式 | 實作簡單 |

### 注意事項

1. **避免過度使用**：單例會增加程式碼的耦合度
2. **考慮測試性**：單例可能影響單元測試的獨立性
3. **執行緒安全**：確保在多執行緒環境下的正確性
4. **資源清理**：適當時候釋放單例持有的資源
5. **序列化考慮**：實作 `readResolve()` 方法防止序列化攻擊

### 何時別用

- **Spring 應用**：Spring Bean 本身就是 singleton scope 的容器管理物件，不需要在 class 層面實作 GoF Singleton。在 class 上手工實作 `getInstance()` 只會讓 Spring context 無法管理生命週期，也無法透過 `@MockBean` 替換測試。
- **多執行緒環境中持有可變狀態**：singleton 持有的可變欄位（例如 `Map`、計數器）在並發存取下會造成 race condition，需要額外的同步機制，此時應考慮其他設計。

### 現代替代方案

Spring 應用中，直接讓 Spring 管理 bean 生命週期是比 GoF Singleton 更好的選擇——Spring container 的 singleton scope 已提供同等保證，且支援測試替換。

若需要跨 JVM 的唯一實例，應考慮分散式鎖或外部協調（如 ZooKeeper），而非依賴 class-level singleton。

在現代應用開發中，可以考慮以下替代方案：

- **依賴注入容器**：如 Spring IoC 容器
- **靜態工廠方法**：提供更好的測試性
- **Builder 模式**：適合複雜對象的創建
- **Registry 模式**：管理多個相關的單例

單例模式雖然簡單，但在實際應用中需要謹慎考慮其適用性和實作方式。選擇合適的實作方案能夠確保程式碼的健壯性和可維護性。

## 參考資料

- [Effective Java by Joshua Bloch](https://www.amazon.com/Effective-Java-Joshua-Bloch/dp/0134685997)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612)
- [Java Concurrency in Practice](https://www.amazon.com/Java-Concurrency-Practice-Brian-Goetz/dp/0321349601)
- [Spring Framework Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/)