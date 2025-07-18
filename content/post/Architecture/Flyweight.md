---
title: "DesignPattern - Structural - Flyweight"
author: Bill.Lin
date: 2018-08-07T12:15:57+08:00
draft: false
tags: ["Design Pattern", "Structural Pattern", "Flyweight", "Memory Optimization", "Object Pooling"]
Description: "深入探討 Flyweight 模式：從基本概念到企業級實現，包含物件池、Spring 快取、記憶體優化等現代化應用"
Categories: ["Architecture"]
DisableComments: false
---

# Flyweight 模式 - 記憶體優化與物件池管理

## 模式概述

Flyweight 模式是一種結構型設計模式，主要用於減少創建大量相似物件時的記憶體開銷。該模式透過共享技術來支援大量細粒度的物件，避免為每個物件儲存所有狀態，而是將狀態分為**內部狀態（Intrinsic State）**和**外部狀態（Extrinsic State）**。

### 核心概念

**內部狀態（Intrinsic State）**：
- 儲存在 flyweight 內部
- 可以被多個物件共享
- 不會隨著環境改變而改變

**外部狀態（Extrinsic State）**：
- 在使用時由客戶端傳入
- 隨著環境改變而改變
- 不可共享

## 使用場景

### 適用條件
- 應用程序需要創建大量相似物件
- 物件創建開銷很大（記憶體或時間）
- 物件的大部分狀態可以外部化
- 物件群組可以用較少的共享物件取代

### 實際應用場景
- 文字編輯器中的字符渲染
- 遊戲中的粒子系統
- 圖形應用中的圖標管理
- 企業系統中的配置物件
- 緩存系統中的資料物件

## 基本實現

### 1. Flyweight 介面

```java
/**
 * Flyweight 介面定義了具體享元和非享元物件的共同介面
 */
public interface Flyweight {
    /**
     * 執行操作，外部狀態透過參數傳入
     * @param extrinsicState 外部狀態
     */
    void operate(String extrinsicState);
}
```

### 2. 具體 Flyweight 實現

```java
/**
 * 具體享元物件，儲存內部狀態
 */
public class ConcreteFlyweight implements Flyweight {
    private final String intrinsicState;
    
    public ConcreteFlyweight(String intrinsicState) {
        this.intrinsicState = intrinsicState;
        System.out.println("創建享元物件: " + intrinsicState);
    }
    
    @Override
    public void operate(String extrinsicState) {
        System.out.println("內部狀態: " + intrinsicState + 
                          ", 外部狀態: " + extrinsicState);
    }
    
    public String getIntrinsicState() {
        return intrinsicState;
    }
}
```

### 3. 享元工廠

```java
/**
 * 享元工廠，負責創建和管理享元物件
 */
public class FlyweightFactory {
    private static final Map<String, Flyweight> flyweights = new ConcurrentHashMap<>();
    private static final AtomicInteger creationCount = new AtomicInteger(0);
    
    /**
     * 獲取享元物件，如果不存在則創建
     * @param key 享元物件的標識
     * @return 享元物件
     */
    public static Flyweight getFlyweight(String key) {
        return flyweights.computeIfAbsent(key, k -> {
            creationCount.incrementAndGet();
            return new ConcreteFlyweight(k);
        });
    }
    
    /**
     * 獲取當前池中的物件數量
     * @return 物件數量
     */
    public static int getPoolSize() {
        return flyweights.size();
    }
    
    /**
     * 獲取總創建次數
     * @return 創建次數
     */
    public static int getCreationCount() {
        return creationCount.get();
    }
    
    /**
     * 清空享元池
     */
    public static void clear() {
        flyweights.clear();
        creationCount.set(0);
    }
}
```

### 4. 客戶端使用

```java
/**
 * 客戶端代碼示例
 */
public class FlyweightClient {
    
    public static void main(String[] args) {
        // 模擬創建多個物件
        for (int i = 0; i < 10; i++) {
            Flyweight flyweight = FlyweightFactory.getFlyweight("Type" + (i % 3));
            flyweight.operate("External-" + i);
        }
        
        System.out.println("池中物件數量: " + FlyweightFactory.getPoolSize());
        System.out.println("總創建次數: " + FlyweightFactory.getCreationCount());
    }
}
```

## 進階實現：文字編輯器範例

### 1. 字符享元

```java
/**
 * 字符享元實現
 */
public class CharacterFlyweight implements Flyweight {
    private final char character;  // 內部狀態
    private final String fontFamily;
    private final int fontSize;
    
    public CharacterFlyweight(char character, String fontFamily, int fontSize) {
        this.character = character;
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
    }
    
    @Override
    public void operate(String extrinsicState) {
        // 解析外部狀態
        String[] parts = extrinsicState.split(",");
        int x = Integer.parseInt(parts[0]);
        int y = Integer.parseInt(parts[1]);
        String color = parts[2];
        
        render(x, y, color);
    }
    
    private void render(int x, int y, String color) {
        System.out.printf("渲染字符 '%c' 於位置 (%d, %d)，" +
                         "字體: %s, 大小: %d, 顏色: %s%n",
                         character, x, y, fontFamily, fontSize, color);
    }
}
```

### 2. 字符工廠

```java
/**
 * 字符享元工廠
 */
public class CharacterFactory {
    private static final Map<String, CharacterFlyweight> characters = new ConcurrentHashMap<>();
    
    public static CharacterFlyweight getCharacter(char c, String fontFamily, int fontSize) {
        String key = c + "_" + fontFamily + "_" + fontSize;
        return characters.computeIfAbsent(key, k -> {
            System.out.println("創建新的字符享元: " + key);
            return new CharacterFlyweight(c, fontFamily, fontSize);
        });
    }
    
    public static void printStatistics() {
        System.out.println("字符享元池統計:");
        System.out.println("總共享元數量: " + characters.size());
        characters.forEach((key, flyweight) -> 
            System.out.println("  " + key));
    }
}
```

### 3. 文件類

```java
/**
 * 文件類，管理字符集合
 */
public class Document {
    private final List<CharacterContext> characters = new ArrayList<>();
    
    public void addCharacter(char c, String fontFamily, int fontSize, 
                           int x, int y, String color) {
        CharacterFlyweight flyweight = CharacterFactory.getCharacter(c, fontFamily, fontSize);
        characters.add(new CharacterContext(flyweight, x, y, color));
    }
    
    public void render() {
        System.out.println("渲染文件:");
        characters.forEach(context -> context.render());
    }
    
    private static class CharacterContext {
        private final CharacterFlyweight flyweight;
        private final int x, y;
        private final String color;
        
        public CharacterContext(CharacterFlyweight flyweight, int x, int y, String color) {
            this.flyweight = flyweight;
            this.x = x;
            this.y = y;
            this.color = color;
        }
        
        public void render() {
            flyweight.operate(x + "," + y + "," + color);
        }
    }
}
```

## 記憶體優化分析

### 1. 記憶體使用比較

```java
/**
 * 記憶體使用比較工具
 */
public class MemoryAnalyzer {
    
    public static void analyzeMemoryUsage() {
        Runtime runtime = Runtime.getRuntime();
        
        // 不使用享元模式
        long beforeTraditional = getUsedMemory(runtime);
        createTraditionalObjects();
        long afterTraditional = getUsedMemory(runtime);
        
        System.gc();
        
        // 使用享元模式
        long beforeFlyweight = getUsedMemory(runtime);
        createFlyweightObjects();
        long afterFlyweight = getUsedMemory(runtime);
        
        System.out.println("=== 記憶體使用比較 ===");
        System.out.println("傳統模式記憶體使用: " + (afterTraditional - beforeTraditional) + " bytes");
        System.out.println("享元模式記憶體使用: " + (afterFlyweight - beforeFlyweight) + " bytes");
        System.out.println("節省記憶體: " + 
                          (afterTraditional - beforeTraditional - afterFlyweight + beforeFlyweight) + " bytes");
    }
    
    private static long getUsedMemory(Runtime runtime) {
        return runtime.totalMemory() - runtime.freeMemory();
    }
    
    private static void createTraditionalObjects() {
        // 創建 1000 個傳統物件
        for (int i = 0; i < 1000; i++) {
            new TraditionalCharacter('A' + (i % 26), "Arial", 12, i, i, "Black");
        }
    }
    
    private static void createFlyweightObjects() {
        Document document = new Document();
        // 創建 1000 個字符，但只有 26 個享元物件
        for (int i = 0; i < 1000; i++) {
            document.addCharacter((char)('A' + (i % 26)), "Arial", 12, i, i, "Black");
        }
    }
}
```

### 2. 傳統實現對比

```java
/**
 * 傳統字符實現（不使用享元模式）
 */
public class TraditionalCharacter {
    private final char character;
    private final String fontFamily;
    private final int fontSize;
    private final int x, y;
    private final String color;
    
    public TraditionalCharacter(char character, String fontFamily, int fontSize, 
                               int x, int y, String color) {
        this.character = character;
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.x = x;
        this.y = y;
        this.color = color;
    }
    
    public void render() {
        System.out.printf("渲染字符 '%c' 於位置 (%d, %d)，" +
                         "字體: %s, 大小: %d, 顏色: %s%n",
                         character, x, y, fontFamily, fontSize, color);
    }
}
```

### 3. 效能測試

```java
/**
 * 效能測試工具
 */
public class PerformanceTest {
    
    public static void main(String[] args) {
        testCreationPerformance();
        testRenderingPerformance();
        MemoryAnalyzer.analyzeMemoryUsage();
    }
    
    private static void testCreationPerformance() {
        System.out.println("=== 創建效能測試 ===");
        
        long start = System.nanoTime();
        for (int i = 0; i < 10000; i++) {
            new TraditionalCharacter('A' + (i % 26), "Arial", 12, i, i, "Black");
        }
        long traditional = System.nanoTime() - start;
        
        start = System.nanoTime();
        Document document = new Document();
        for (int i = 0; i < 10000; i++) {
            document.addCharacter((char)('A' + (i % 26)), "Arial", 12, i, i, "Black");
        }
        long flyweight = System.nanoTime() - start;
        
        System.out.println("傳統模式創建時間: " + traditional / 1_000_000 + " ms");
        System.out.println("享元模式創建時間: " + flyweight / 1_000_000 + " ms");
        System.out.println("效能提升: " + (traditional - flyweight) / 1_000_000 + " ms");
    }
    
    private static void testRenderingPerformance() {
        System.out.println("\n=== 渲染效能測試 ===");
        
        // 創建測試資料
        Document document = new Document();
        for (int i = 0; i < 1000; i++) {
            document.addCharacter((char)('A' + (i % 26)), "Arial", 12, i, i, "Black");
        }
        
        long start = System.nanoTime();
        // 模擬渲染（不實際輸出）
        for (int i = 0; i < 100; i++) {
            // document.render();
        }
        long renderTime = System.nanoTime() - start;
        
        System.out.println("渲染時間: " + renderTime / 1_000_000 + " ms");
        CharacterFactory.printStatistics();
    }
}
```

## Spring 整合實現

### 1. Spring Boot 配置物件享元

```java
/**
 * 配置享元介面
 */
public interface ConfigurationFlyweight {
    void applyConfiguration(String context);
    String getConfigurationType();
}

/**
 * 資料庫配置享元
 */
@Component
public class DatabaseConfigFlyweight implements ConfigurationFlyweight {
    private final String driver;
    private final String dialect;
    private final int maxPoolSize;
    
    public DatabaseConfigFlyweight() {
        this.driver = "com.mysql.cj.jdbc.Driver";
        this.dialect = "org.hibernate.dialect.MySQL8Dialect";
        this.maxPoolSize = 20;
        System.out.println("創建資料庫配置享元");
    }
    
    @Override
    public void applyConfiguration(String context) {
        // 解析外部狀態
        String[] parts = context.split(",");
        String url = parts[0];
        String username = parts[1];
        String password = parts[2];
        
        System.out.println("應用資料庫配置:");
        System.out.println("  URL: " + url);
        System.out.println("  Driver: " + driver);
        System.out.println("  Dialect: " + dialect);
        System.out.println("  Max Pool Size: " + maxPoolSize);
    }
    
    @Override
    public String getConfigurationType() {
        return "database";
    }
}

/**
 * 快取配置享元
 */
@Component
public class CacheConfigFlyweight implements ConfigurationFlyweight {
    private final String provider;
    private final long defaultTtl;
    private final int maxSize;
    
    public CacheConfigFlyweight() {
        this.provider = "Redis";
        this.defaultTtl = 3600L;
        this.maxSize = 1000;
        System.out.println("創建快取配置享元");
    }
    
    @Override
    public void applyConfiguration(String context) {
        String[] parts = context.split(",");
        String host = parts[0];
        String port = parts[1];
        String namespace = parts[2];
        
        System.out.println("應用快取配置:");
        System.out.println("  Host: " + host);
        System.out.println("  Port: " + port);
        System.out.println("  Namespace: " + namespace);
        System.out.println("  Provider: " + provider);
        System.out.println("  Default TTL: " + defaultTtl);
    }
    
    @Override
    public String getConfigurationType() {
        return "cache";
    }
}
```

### 2. Spring 享元工廠

```java
/**
 * Spring 享元工廠
 */
@Component
public class SpringFlyweightFactory {
    private final Map<String, ConfigurationFlyweight> flyweights = new ConcurrentHashMap<>();
    private final ApplicationContext applicationContext;
    
    public SpringFlyweightFactory(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
        initializeFlyweights();
    }
    
    private void initializeFlyweights() {
        // 自動註冊所有配置享元
        applicationContext.getBeansOfType(ConfigurationFlyweight.class)
                         .values()
                         .forEach(flyweight -> 
                             flyweights.put(flyweight.getConfigurationType(), flyweight));
        
        System.out.println("註冊了 " + flyweights.size() + " 個配置享元");
    }
    
    public ConfigurationFlyweight getFlyweight(String type) {
        return flyweights.get(type);
    }
    
    public void printRegisteredFlyweights() {
        System.out.println("已註冊的享元:");
        flyweights.keySet().forEach(type -> 
            System.out.println("  " + type));
    }
}
```

### 3. Spring 環境管理器

```java
/**
 * Spring 環境管理器
 */
@Service
public class EnvironmentManager {
    private final SpringFlyweightFactory flyweightFactory;
    private final List<EnvironmentContext> environments = new ArrayList<>();
    
    public EnvironmentManager(SpringFlyweightFactory flyweightFactory) {
        this.flyweightFactory = flyweightFactory;
    }
    
    public void addEnvironment(String name, String type, String configuration) {
        ConfigurationFlyweight flyweight = flyweightFactory.getFlyweight(type);
        if (flyweight != null) {
            environments.add(new EnvironmentContext(name, flyweight, configuration));
        }
    }
    
    public void deployAllEnvironments() {
        System.out.println("部署所有環境:");
        environments.forEach(env -> env.deploy());
    }
    
    private static class EnvironmentContext {
        private final String name;
        private final ConfigurationFlyweight flyweight;
        private final String configuration;
        
        public EnvironmentContext(String name, ConfigurationFlyweight flyweight, String configuration) {
            this.name = name;
            this.flyweight = flyweight;
            this.configuration = configuration;
        }
        
        public void deploy() {
            System.out.println("\n部署環境: " + name);
            flyweight.applyConfiguration(configuration);
        }
    }
}
```

### 4. Spring Boot 主應用

```java
/**
 * Spring Boot 主應用
 */
@SpringBootApplication
public class FlyweightApplication {
    
    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(FlyweightApplication.class, args);
        
        EnvironmentManager manager = context.getBean(EnvironmentManager.class);
        
        // 添加多個環境
        manager.addEnvironment("development", "database", 
                              "jdbc:mysql://localhost:3306/dev_db,dev_user,dev_pass");
        manager.addEnvironment("testing", "database", 
                              "jdbc:mysql://test-server:3306/test_db,test_user,test_pass");
        manager.addEnvironment("production", "database", 
                              "jdbc:mysql://prod-server:3306/prod_db,prod_user,prod_pass");
        
        manager.addEnvironment("dev-cache", "cache", 
                              "localhost,6379,dev");
        manager.addEnvironment("prod-cache", "cache", 
                              "cache-cluster,6379,prod");
        
        // 部署所有環境
        manager.deployAllEnvironments();
        
        // 顯示享元使用情況
        context.getBean(SpringFlyweightFactory.class).printRegisteredFlyweights();
    }
}
```

## Spring 快取整合

### 1. 快取享元配置

```java
/**
 * 快取享元配置
 */
@Configuration
@EnableCaching
public class CacheFlyweightConfig {
    
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("flyweights", "user-data", "config-data");
    }
    
    @Bean
    public CacheResolver cacheResolver() {
        return new SimpleCacheResolver(cacheManager());
    }
}
```

### 2. 快取享元服務

```java
/**
 * 快取享元服務
 */
@Service
public class CacheFlyweightService {
    private final Map<String, UserDataFlyweight> flyweights = new ConcurrentHashMap<>();
    
    @Cacheable(value = "flyweights", key = "#userType")
    public UserDataFlyweight getUserDataFlyweight(String userType) {
        return flyweights.computeIfAbsent(userType, type -> {
            System.out.println("創建並快取用戶資料享元: " + type);
            return new UserDataFlyweight(type);
        });
    }
    
    @CacheEvict(value = "flyweights", key = "#userType")
    public void evictUserDataFlyweight(String userType) {
        flyweights.remove(userType);
        System.out.println("清除用戶資料享元: " + userType);
    }
    
    @CacheEvict(value = "flyweights", allEntries = true)
    public void evictAllFlyweights() {
        flyweights.clear();
        System.out.println("清除所有享元");
    }
}
```

### 3. 用戶資料享元

```java
/**
 * 用戶資料享元
 */
public class UserDataFlyweight {
    private final String userType;
    private final Set<String> permissions;
    private final Map<String, String> defaultSettings;
    
    public UserDataFlyweight(String userType) {
        this.userType = userType;
        this.permissions = initializePermissions(userType);
        this.defaultSettings = initializeDefaultSettings(userType);
    }
    
    private Set<String> initializePermissions(String userType) {
        return switch (userType) {
            case "ADMIN" -> Set.of("READ", "WRITE", "DELETE", "ADMIN");
            case "USER" -> Set.of("READ", "WRITE");
            case "GUEST" -> Set.of("READ");
            default -> Set.of();
        };
    }
    
    private Map<String, String> initializeDefaultSettings(String userType) {
        Map<String, String> settings = new HashMap<>();
        settings.put("theme", "light");
        settings.put("language", "zh-TW");
        settings.put("timezone", "Asia/Taipei");
        
        if ("ADMIN".equals(userType)) {
            settings.put("dashboard", "admin");
            settings.put("notifications", "all");
        } else if ("USER".equals(userType)) {
            settings.put("dashboard", "user");
            settings.put("notifications", "important");
        }
        
        return settings;
    }
    
    public void processUserAction(String userId, String action, String target) {
        System.out.println("處理用戶動作:");
        System.out.println("  用戶ID: " + userId);
        System.out.println("  用戶類型: " + userType);
        System.out.println("  動作: " + action);
        System.out.println("  目標: " + target);
        System.out.println("  權限: " + permissions);
        System.out.println("  是否允許: " + permissions.contains(action.toUpperCase()));
    }
    
    public Map<String, String> getSettingsForUser(String userId) {
        Map<String, String> userSettings = new HashMap<>(defaultSettings);
        userSettings.put("userId", userId);
        return userSettings;
    }
}
```

### 4. 用戶操作控制器

```java
/**
 * 用戶操作控制器
 */
@RestController
@RequestMapping("/api/users")
public class UserActionController {
    private final CacheFlyweightService flyweightService;
    
    public UserActionController(CacheFlyweightService flyweightService) {
        this.flyweightService = flyweightService;
    }
    
    @PostMapping("/{userId}/action")
    public ResponseEntity<String> processUserAction(
            @PathVariable String userId,
            @RequestParam String userType,
            @RequestParam String action,
            @RequestParam String target) {
        
        UserDataFlyweight flyweight = flyweightService.getUserDataFlyweight(userType);
        flyweight.processUserAction(userId, action, target);
        
        return ResponseEntity.ok("動作已處理");
    }
    
    @GetMapping("/{userId}/settings")
    public ResponseEntity<Map<String, String>> getUserSettings(
            @PathVariable String userId,
            @RequestParam String userType) {
        
        UserDataFlyweight flyweight = flyweightService.getUserDataFlyweight(userType);
        Map<String, String> settings = flyweight.getSettingsForUser(userId);
        
        return ResponseEntity.ok(settings);
    }
    
    @DeleteMapping("/cache/{userType}")
    public ResponseEntity<String> evictUserTypeCache(@PathVariable String userType) {
        flyweightService.evictUserDataFlyweight(userType);
        return ResponseEntity.ok("快取已清除");
    }
    
    @DeleteMapping("/cache")
    public ResponseEntity<String> evictAllCache() {
        flyweightService.evictAllFlyweights();
        return ResponseEntity.ok("所有快取已清除");
    }
}
```

## 企業級物件池實現

### 1. 通用物件池

```java
/**
 * 通用物件池實現
 */
public class GenericObjectPool<T> {
    private final Queue<T> pool = new ConcurrentLinkedQueue<>();
    private final AtomicInteger activeCount = new AtomicInteger(0);
    private final int maxPoolSize;
    private final int maxActiveSize;
    private final Supplier<T> objectFactory;
    private final Consumer<T> objectValidator;
    private final Consumer<T> objectDestroyer;
    
    public GenericObjectPool(int maxPoolSize, int maxActiveSize, 
                            Supplier<T> objectFactory,
                            Consumer<T> objectValidator,
                            Consumer<T> objectDestroyer) {
        this.maxPoolSize = maxPoolSize;
        this.maxActiveSize = maxActiveSize;
        this.objectFactory = objectFactory;
        this.objectValidator = objectValidator;
        this.objectDestroyer = objectDestroyer;
    }
    
    public T borrowObject() {
        T object = pool.poll();
        if (object == null) {
            if (activeCount.get() < maxActiveSize) {
                object = objectFactory.get();
                activeCount.incrementAndGet();
                System.out.println("創建新物件，活躍數量: " + activeCount.get());
            } else {
                throw new IllegalStateException("已達到最大活躍物件數量");
            }
        } else {
            objectValidator.accept(object);
            System.out.println("從池中獲取物件，池大小: " + pool.size());
        }
        return object;
    }
    
    public void returnObject(T object) {
        if (object != null) {
            if (pool.size() < maxPoolSize) {
                pool.offer(object);
                System.out.println("物件歸還至池，池大小: " + pool.size());
            } else {
                objectDestroyer.accept(object);
                activeCount.decrementAndGet();
                System.out.println("銷毀多餘物件，活躍數量: " + activeCount.get());
            }
        }
    }
    
    public void shutdown() {
        System.out.println("關閉物件池，銷毀所有物件");
        T object;
        while ((object = pool.poll()) != null) {
            objectDestroyer.accept(object);
            activeCount.decrementAndGet();
        }
    }
    
    public PoolStatistics getStatistics() {
        return new PoolStatistics(pool.size(), activeCount.get(), maxPoolSize, maxActiveSize);
    }
    
    public static class PoolStatistics {
        private final int poolSize;
        private final int activeCount;
        private final int maxPoolSize;
        private final int maxActiveSize;
        
        public PoolStatistics(int poolSize, int activeCount, int maxPoolSize, int maxActiveSize) {
            this.poolSize = poolSize;
            this.activeCount = activeCount;
            this.maxPoolSize = maxPoolSize;
            this.maxActiveSize = maxActiveSize;
        }
        
        @Override
        public String toString() {
            return String.format("Pool[size=%d, active=%d, maxPool=%d, maxActive=%d]",
                               poolSize, activeCount, maxPoolSize, maxActiveSize);
        }
    }
}
```

### 2. 資料庫連接池享元

```java
/**
 * 資料庫連接享元
 */
public class DatabaseConnectionFlyweight {
    private final String jdbcUrl;
    private final String driver;
    private final Properties connectionProperties;
    
    public DatabaseConnectionFlyweight(String jdbcUrl, String driver) {
        this.jdbcUrl = jdbcUrl;
        this.driver = driver;
        this.connectionProperties = new Properties();
        initializeConnectionProperties();
        System.out.println("創建資料庫連接享元: " + jdbcUrl);
    }
    
    private void initializeConnectionProperties() {
        connectionProperties.setProperty("autoCommit", "true");
        connectionProperties.setProperty("readOnly", "false");
        connectionProperties.setProperty("transactionIsolation", "TRANSACTION_READ_COMMITTED");
        connectionProperties.setProperty("fetchSize", "1000");
    }
    
    public Connection createConnection(String username, String password) {
        try {
            Class.forName(driver);
            Properties props = new Properties(connectionProperties);
            props.setProperty("user", username);
            props.setProperty("password", password);
            
            Connection connection = DriverManager.getConnection(jdbcUrl, props);
            System.out.println("創建資料庫連接: " + username + "@" + jdbcUrl);
            return connection;
        } catch (Exception e) {
            throw new RuntimeException("無法創建資料庫連接", e);
        }
    }
    
    public void configureConnection(Connection connection, String sessionConfig) {
        try {
            String[] configs = sessionConfig.split(",");
            for (String config : configs) {
                String[] keyValue = config.split("=");
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim();
                    String value = keyValue[1].trim();
                    
                    switch (key) {
                        case "autoCommit":
                            connection.setAutoCommit(Boolean.parseBoolean(value));
                            break;
                        case "readOnly":
                            connection.setReadOnly(Boolean.parseBoolean(value));
                            break;
                        case "transactionIsolation":
                            connection.setTransactionIsolation(Integer.parseInt(value));
                            break;
                    }
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("配置連接失敗", e);
        }
    }
}
```

### 3. 連接池管理器

```java
/**
 * 連接池管理器
 */
@Component
public class ConnectionPoolManager {
    private final Map<String, DatabaseConnectionFlyweight> flyweights = new ConcurrentHashMap<>();
    private final Map<String, GenericObjectPool<Connection>> connectionPools = new ConcurrentHashMap<>();
    
    public void createConnectionPool(String poolName, String jdbcUrl, String driver,
                                   String username, String password,
                                   int maxPoolSize, int maxActiveSize) {
        
        DatabaseConnectionFlyweight flyweight = flyweights.computeIfAbsent(
            jdbcUrl + ":" + driver, 
            key -> new DatabaseConnectionFlyweight(jdbcUrl, driver));
        
        GenericObjectPool<Connection> pool = new GenericObjectPool<>(
            maxPoolSize, maxActiveSize,
            () -> flyweight.createConnection(username, password),
            connection -> validateConnection(connection),
            connection -> closeConnection(connection)
        );
        
        connectionPools.put(poolName, pool);
        System.out.println("創建連接池: " + poolName);
    }
    
    public Connection getConnection(String poolName) {
        GenericObjectPool<Connection> pool = connectionPools.get(poolName);
        if (pool == null) {
            throw new IllegalArgumentException("連接池不存在: " + poolName);
        }
        return pool.borrowObject();
    }
    
    public void returnConnection(String poolName, Connection connection) {
        GenericObjectPool<Connection> pool = connectionPools.get(poolName);
        if (pool != null) {
            pool.returnObject(connection);
        }
    }
    
    private void validateConnection(Connection connection) {
        try {
            if (connection.isClosed() || !connection.isValid(5)) {
                throw new SQLException("連接無效");
            }
        } catch (SQLException e) {
            throw new RuntimeException("連接驗證失敗", e);
        }
    }
    
    private void closeConnection(Connection connection) {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
            }
        } catch (SQLException e) {
            System.err.println("關閉連接失敗: " + e.getMessage());
        }
    }
    
    public void printPoolStatistics() {
        System.out.println("\n=== 連接池統計 ===");
        connectionPools.forEach((name, pool) -> 
            System.out.println(name + ": " + pool.getStatistics()));
    }
    
    @PreDestroy
    public void shutdown() {
        System.out.println("關閉所有連接池");
        connectionPools.values().forEach(GenericObjectPool::shutdown);
    }
}
```

## 現代化 Java 實現

### 1. Record 型別享元

```java
/**
 * 使用 Record 實現輕量級享元
 */
public record ImmutableConfigFlyweight(
        String configType,
        Map<String, String> defaultValues,
        Set<String> validationRules) implements Flyweight {
    
    public ImmutableConfigFlyweight {
        // 確保不可變性
        defaultValues = Map.copyOf(defaultValues);
        validationRules = Set.copyOf(validationRules);
    }
    
    @Override
    public void operate(String extrinsicState) {
        String[] parts = extrinsicState.split(";");
        String environment = parts[0];
        Map<String, String> customValues = parseCustomValues(parts[1]);
        
        System.out.println("應用配置類型: " + configType);
        System.out.println("環境: " + environment);
        System.out.println("預設值: " + defaultValues);
        System.out.println("自定義值: " + customValues);
        
        // 執行驗證
        validateConfiguration(customValues);
    }
    
    private Map<String, String> parseCustomValues(String customConfig) {
        return Arrays.stream(customConfig.split(","))
                    .map(kv -> kv.split("="))
                    .filter(kv -> kv.length == 2)
                    .collect(Collectors.toMap(
                        kv -> kv[0].trim(),
                        kv -> kv[1].trim()));
    }
    
    private void validateConfiguration(Map<String, String> customValues) {
        customValues.forEach((key, value) -> {
            if (validationRules.contains(key)) {
                System.out.println("驗證 " + key + ": " + value + " - 通過");
            } else {
                System.out.println("警告: " + key + " 不在驗證規則中");
            }
        });
    }
}
```

### 2. Virtual Threads 享元處理

```java
/**
 * 使用 Virtual Threads 的享元處理器
 */
public class VirtualThreadFlyweightProcessor {
    private final ExecutorService virtualThreadExecutor;
    private final FlyweightFactory factory;
    
    public VirtualThreadFlyweightProcessor() {
        this.virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
        this.factory = new FlyweightFactory();
    }
    
    public CompletableFuture<String> processAsync(String flyweightKey, String extrinsicState) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(100); // 模擬 I/O 操作
                
                Flyweight flyweight = factory.getFlyweight(flyweightKey);
                flyweight.operate(extrinsicState);
                
                return "處理完成: " + flyweightKey + " with " + extrinsicState;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "處理中斷: " + flyweightKey;
            }
        }, virtualThreadExecutor);
    }
    
    public void processBatch(List<ProcessingRequest> requests) {
        List<CompletableFuture<String>> futures = requests.stream()
                .map(request -> processAsync(request.flyweightKey(), request.extrinsicState()))
                .toList();
        
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                         .thenRun(() -> System.out.println("批次處理完成"))
                         .join();
    }
    
    public void shutdown() {
        virtualThreadExecutor.shutdown();
    }
    
    public record ProcessingRequest(String flyweightKey, String extrinsicState) {}
}
```

### 3. 函數式享元工廠

```java
/**
 * 函數式享元工廠
 */
public class FunctionalFlyweightFactory {
    private final Map<String, Function<String, Flyweight>> flyweightCreators = new ConcurrentHashMap<>();
    private final Map<String, Flyweight> flyweights = new ConcurrentHashMap<>();
    
    public FunctionalFlyweightFactory() {
        initializeCreators();
    }
    
    private void initializeCreators() {
        flyweightCreators.put("config", this::createConfigFlyweight);
        flyweightCreators.put("user", this::createUserFlyweight);
        flyweightCreators.put("system", this::createSystemFlyweight);
    }
    
    public Flyweight getFlyweight(String type, String subType) {
        String key = type + ":" + subType;
        return flyweights.computeIfAbsent(key, k -> {
            Function<String, Flyweight> creator = flyweightCreators.get(type);
            if (creator == null) {
                throw new IllegalArgumentException("不支援的享元類型: " + type);
            }
            return creator.apply(subType);
        });
    }
    
    private Flyweight createConfigFlyweight(String subType) {
        return switch (subType) {
            case "database" -> new ImmutableConfigFlyweight(
                "database",
                Map.of("driver", "mysql", "timeout", "30"),
                Set.of("url", "username", "password")
            );
            case "cache" -> new ImmutableConfigFlyweight(
                "cache",
                Map.of("provider", "redis", "ttl", "3600"),
                Set.of("host", "port", "database")
            );
            default -> throw new IllegalArgumentException("不支援的配置子類型: " + subType);
        };
    }
    
    private Flyweight createUserFlyweight(String subType) {
        return new ConcreteFlyweight("user:" + subType);
    }
    
    private Flyweight createSystemFlyweight(String subType) {
        return new ConcreteFlyweight("system:" + subType);
    }
    
    public void printStatistics() {
        System.out.println("=== 函數式享元統計 ===");
        System.out.println("支援的類型: " + flyweightCreators.keySet());
        System.out.println("已創建的享元: " + flyweights.size());
        flyweights.keySet().forEach(key -> System.out.println("  " + key));
    }
}
```

### 4. Stream API 整合

```java
/**
 * Stream API 享元處理
 */
public class StreamFlyweightProcessor {
    private final FunctionalFlyweightFactory factory;
    
    public StreamFlyweightProcessor() {
        this.factory = new FunctionalFlyweightFactory();
    }
    
    public void processDataStream(Stream<DataRecord> dataStream) {
        Map<String, List<DataRecord>> groupedData = dataStream
                .collect(Collectors.groupingBy(DataRecord::type));
        
        groupedData.entrySet().parallelStream()
                  .forEach(entry -> {
                      String type = entry.getKey();
                      List<DataRecord> records = entry.getValue();
                      
                      Flyweight flyweight = factory.getFlyweight(type, "default");
                      
                      records.forEach(record -> 
                          flyweight.operate(record.extrinsicState()));
                  });
    }
    
    public Map<String, Long> analyzeDataDistribution(Stream<DataRecord> dataStream) {
        return dataStream
                .collect(Collectors.groupingBy(
                    DataRecord::type,
                    Collectors.counting()
                ));
    }
    
    public record DataRecord(String type, String extrinsicState) {}
}
```

## 效能監控與指標

### 1. 效能監控器

```java
/**
 * 享元效能監控器
 */
@Component
public class FlyweightMetrics {
    private final MeterRegistry meterRegistry;
    private final Counter creationCounter;
    private final Counter hitCounter;
    private final Counter missCounter;
    private final Timer operationTimer;
    private final Gauge poolSizeGauge;
    
    public FlyweightMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.creationCounter = Counter.builder("flyweight.creation")
                                     .description("享元創建次數")
                                     .register(meterRegistry);
        this.hitCounter = Counter.builder("flyweight.hit")
                                .description("享元命中次數")
                                .register(meterRegistry);
        this.missCounter = Counter.builder("flyweight.miss")
                                 .description("享元錯失次數")
                                 .register(meterRegistry);
        this.operationTimer = Timer.builder("flyweight.operation")
                                  .description("享元操作耗時")
                                  .register(meterRegistry);
        this.poolSizeGauge = Gauge.builder("flyweight.pool.size")
                                 .description("享元池大小")
                                 .register(meterRegistry, this, FlyweightMetrics::getCurrentPoolSize);
    }
    
    public void recordCreation() {
        creationCounter.increment();
    }
    
    public void recordHit() {
        hitCounter.increment();
    }
    
    public void recordMiss() {
        missCounter.increment();
    }
    
    public Timer.Sample startOperationTimer() {
        return Timer.start(meterRegistry);
    }
    
    public void stopOperationTimer(Timer.Sample sample) {
        sample.stop(operationTimer);
    }
    
    private double getCurrentPoolSize() {
        // 實際應該從享元工廠獲取
        return FlyweightFactory.getPoolSize();
    }
    
    public void printMetrics() {
        System.out.println("=== 享元效能指標 ===");
        System.out.println("創建次數: " + creationCounter.count());
        System.out.println("命中次數: " + hitCounter.count());
        System.out.println("錯失次數: " + missCounter.count());
        System.out.println("命中率: " + calculateHitRate() + "%");
        System.out.println("操作平均耗時: " + operationTimer.mean(TimeUnit.MILLISECONDS) + "ms");
        System.out.println("池大小: " + getCurrentPoolSize());
    }
    
    private double calculateHitRate() {
        double totalRequests = hitCounter.count() + missCounter.count();
        return totalRequests > 0 ? (hitCounter.count() / totalRequests) * 100 : 0;
    }
}
```

### 2. 監控享元工廠

```java
/**
 * 監控享元工廠
 */
@Component
public class MonitoredFlyweightFactory {
    private final Map<String, Flyweight> flyweights = new ConcurrentHashMap<>();
    private final FlyweightMetrics metrics;
    
    public MonitoredFlyweightFactory(FlyweightMetrics metrics) {
        this.metrics = metrics;
    }
    
    public Flyweight getFlyweight(String key) {
        Timer.Sample sample = metrics.startOperationTimer();
        try {
            if (flyweights.containsKey(key)) {
                metrics.recordHit();
                return flyweights.get(key);
            } else {
                metrics.recordMiss();
                Flyweight flyweight = createFlyweight(key);
                flyweights.put(key, flyweight);
                metrics.recordCreation();
                return flyweight;
            }
        } finally {
            metrics.stopOperationTimer(sample);
        }
    }
    
    private Flyweight createFlyweight(String key) {
        // 模擬創建耗時
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return new ConcreteFlyweight(key);
    }
    
    public int getPoolSize() {
        return flyweights.size();
    }
    
    public void clearPool() {
        flyweights.clear();
    }
}
```

### 3. 健康檢查

```java
/**
 * 享元健康檢查
 */
@Component
public class FlyweightHealthIndicator implements HealthIndicator {
    private final MonitoredFlyweightFactory factory;
    private final FlyweightMetrics metrics;
    
    public FlyweightHealthIndicator(MonitoredFlyweightFactory factory, FlyweightMetrics metrics) {
        this.factory = factory;
        this.metrics = metrics;
    }
    
    @Override
    public Health health() {
        Health.Builder builder = new Health.Builder();
        
        try {
            int poolSize = factory.getPoolSize();
            double hitRate = calculateHitRate();
            
            if (hitRate > 80 && poolSize < 1000) {
                builder.up()
                       .withDetail("status", "健康")
                       .withDetail("poolSize", poolSize)
                       .withDetail("hitRate", hitRate + "%");
            } else if (hitRate > 60 && poolSize < 2000) {
                builder.status("WARNING")
                       .withDetail("status", "警告")
                       .withDetail("poolSize", poolSize)
                       .withDetail("hitRate", hitRate + "%")
                       .withDetail("message", "效能可能需要調整");
            } else {
                builder.down()
                       .withDetail("status", "異常")
                       .withDetail("poolSize", poolSize)
                       .withDetail("hitRate", hitRate + "%")
                       .withDetail("message", "效能需要立即調整");
            }
            
        } catch (Exception e) {
            builder.down()
                   .withDetail("error", e.getMessage());
        }
        
        return builder.build();
    }
    
    private double calculateHitRate() {
        // 實際實現會從 metrics 獲取
        return 85.0;
    }
}
```

## 最佳實踐與反模式

### 1. 最佳實踐

```java
/**
 * 享元最佳實踐示例
 */
public class FlyweightBestPractices {
    
    // ✅ 正確：使用不可變物件作為享元
    public static final class ImmutableTextStyle implements Flyweight {
        private final String fontFamily;
        private final int fontSize;
        private final boolean bold;
        private final boolean italic;
        
        public ImmutableTextStyle(String fontFamily, int fontSize, boolean bold, boolean italic) {
            this.fontFamily = fontFamily;
            this.fontSize = fontSize;
            this.bold = bold;
            this.italic = italic;
        }
        
        @Override
        public void operate(String extrinsicState) {
            String[] parts = extrinsicState.split(",");
            int x = Integer.parseInt(parts[0]);
            int y = Integer.parseInt(parts[1]);
            String text = parts[2];
            
            renderText(text, x, y);
        }
        
        private void renderText(String text, int x, int y) {
            // 渲染邏輯
            System.out.printf("渲染文字 '%s' 於 (%d, %d)，樣式: %s %dpx%s%s%n",
                text, x, y, fontFamily, fontSize,
                bold ? " 粗體" : "", italic ? " 斜體" : "");
        }
    }
    
    // ✅ 正確：使用工廠方法控制享元創建
    public static class TextStyleFactory {
        private static final Map<String, ImmutableTextStyle> styles = new ConcurrentHashMap<>();
        
        public static ImmutableTextStyle getStyle(String fontFamily, int fontSize, 
                                                 boolean bold, boolean italic) {
            String key = fontFamily + "_" + fontSize + "_" + bold + "_" + italic;
            return styles.computeIfAbsent(key, k -> 
                new ImmutableTextStyle(fontFamily, fontSize, bold, italic));
        }
    }
    
    // ✅ 正確：享元工廠限制池大小
    public static class BoundedFlyweightFactory {
        private final Map<String, Flyweight> flyweights = new ConcurrentHashMap<>();
        private final int maxPoolSize;
        
        public BoundedFlyweightFactory(int maxPoolSize) {
            this.maxPoolSize = maxPoolSize;
        }
        
        public Flyweight getFlyweight(String key) {
            if (flyweights.size() >= maxPoolSize && !flyweights.containsKey(key)) {
                throw new IllegalStateException("享元池已滿，無法創建新的享元");
            }
            return flyweights.computeIfAbsent(key, ConcreteFlyweight::new);
        }
    }
}
```

### 2. 反模式警告

```java
/**
 * 享元反模式警告
 */
public class FlyweightAntiPatterns {
    
    // ❌ 錯誤：享元包含可變狀態
    public static class MutableFlyweightBad implements Flyweight {
        private String mutableState;  // 這會導致享元不安全
        
        public void setMutableState(String state) {
            this.mutableState = state;  // 危險！會影響所有使用此享元的物件
        }
        
        @Override
        public void operate(String extrinsicState) {
            // 使用可變狀態的邏輯
        }
    }
    
    // ❌ 錯誤：直接創建享元而非使用工廠
    public static class DirectCreationBad {
        public void badUsage() {
            // 錯誤：直接創建享元
            Flyweight flyweight1 = new ConcreteFlyweight("type1");
            Flyweight flyweight2 = new ConcreteFlyweight("type1");
            // flyweight1 和 flyweight2 是不同的實例，失去了享元的意義
        }
    }
    
    // ❌ 錯誤：享元工廠沒有限制
    public static class UnboundedFactoryBad {
        private final Map<String, Flyweight> flyweights = new ConcurrentHashMap<>();
        
        public Flyweight getFlyweight(String key) {
            // 危險：沒有限制池大小，可能導致記憶體洩漏
            return flyweights.computeIfAbsent(key, ConcreteFlyweight::new);
        }
    }
    
    // ❌ 錯誤：在享元中儲存外部狀態
    public static class ExtrinsicStateInFlyweightBad implements Flyweight {
        private final String intrinsicState;
        private String extrinsicState;  // 錯誤：外部狀態不應儲存在享元中
        
        public ExtrinsicStateInFlyweightBad(String intrinsicState) {
            this.intrinsicState = intrinsicState;
        }
        
        @Override
        public void operate(String extrinsicState) {
            this.extrinsicState = extrinsicState;  // 危險！
        }
    }
}
```

## 總結

### 優勢
1. **記憶體效率**：大幅減少記憶體使用量
2. **效能提升**：減少物件創建開銷
3. **資源共享**：有效利用系統資源
4. **擴展性**：支援大量細粒度物件

### 劣勢
1. **複雜性增加**：需要仔細設計內外部狀態
2. **執行時開銷**：需要額外的狀態管理
3. **同步問題**：多執行緒環境下的安全性考慮

### 使用建議
1. **適合場景**：大量相似物件、記憶體限制、高頻創建
2. **設計原則**：確保享元不可變、外部狀態無關性
3. **實現要點**：工廠管理、池大小限制、效能監控
4. **Spring 整合**：利用快取、依賴注入、健康檢查

Flyweight 模式在現代企業應用中仍然具有重要價值，特別是在處理大量資料、優化記憶體使用和提升系統效能方面。結合 Spring Boot 的強大功能和現代 Java 特性，可以構建出高效、可維護的享元系統。

---

*Flyweight 模式完整重構完成 - 從基礎概念到企業級實現，涵蓋記憶體優化、Spring 整合、效能監控等現代化應用*