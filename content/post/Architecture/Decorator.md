---
title: "DesignPattern - Structural - Decorator"
author: Bill.Lin
date: 2018-08-07T12:16:24+08:00
draft: false
tags: ["Design Pattern", "Structural", "Decorator", "AOP", "Spring"]
Description: "Comprehensive guide to Decorator Pattern with modern Java implementations, Spring AOP integration, and enterprise patterns"
Categories: ["Architecture"]
DisableComments: false
---

# Decorator Pattern

## 概述

Decorator Pattern 是一種結構型設計模式，它允許在運行時動態地為對象添加新功能，而無需修改其原始類。通過創建包裝器對象，Decorator 提供了一種靈活的替代繼承的方法來擴展對象的行為。

## 核心概念

### 關鍵特性

1. **動態擴展**: 在運行時添加或移除功能
2. **透明性**: 裝飾器與原始對象具有相同的接口
3. **組合優於繼承**: 避免複雜的繼承層次結構
4. **責任鏈**: 可以堆疊多個裝飾器

### 結構組件

- **Component**: 定義原始對象和裝飾器的通用接口
- **ConcreteComponent**: 具體的原始對象
- **BaseDecorator**: 抽象裝飾器基類
- **ConcreteDecorator**: 具體的裝飾器實現

## 基本實現

### 1. 經典 Decorator 實現

```java
// 組件接口
public interface Coffee {
    String getDescription();
    double getCost();
}

// 具體組件
public class SimpleCoffee implements Coffee {
    @Override
    public String getDescription() {
        return "Simple Coffee";
    }
    
    @Override
    public double getCost() {
        return 2.0;
    }
}

// 抽象裝飾器
public abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    
    public CoffeeDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
    
    @Override
    public String getDescription() {
        return coffee.getDescription();
    }
    
    @Override
    public double getCost() {
        return coffee.getCost();
    }
}

// 具體裝飾器
public class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) {
        super(coffee);
    }
    
    @Override
    public String getDescription() {
        return coffee.getDescription() + " + Milk";
    }
    
    @Override
    public double getCost() {
        return coffee.getCost() + 0.5;
    }
}

public class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) {
        super(coffee);
    }
    
    @Override
    public String getDescription() {
        return coffee.getDescription() + " + Sugar";
    }
    
    @Override
    public double getCost() {
        return coffee.getCost() + 0.3;
    }
}

public class WhippedCreamDecorator extends CoffeeDecorator {
    public WhippedCreamDecorator(Coffee coffee) {
        super(coffee);
    }
    
    @Override
    public String getDescription() {
        return coffee.getDescription() + " + Whipped Cream";
    }
    
    @Override
    public double getCost() {
        return coffee.getCost() + 0.8;
    }
}
```

### 2. 測試示例

```java
public class DecoratorPatternDemo {
    public static void main(String[] args) {
        // 基本咖啡
        Coffee coffee = new SimpleCoffee();
        System.out.println(coffee.getDescription() + " - $" + coffee.getCost());
        
        // 添加牛奶
        coffee = new MilkDecorator(coffee);
        System.out.println(coffee.getDescription() + " - $" + coffee.getCost());
        
        // 添加糖
        coffee = new SugarDecorator(coffee);
        System.out.println(coffee.getDescription() + " - $" + coffee.getCost());
        
        // 添加鮮奶油
        coffee = new WhippedCreamDecorator(coffee);
        System.out.println(coffee.getDescription() + " - $" + coffee.getCost());
        
        // 輸出:
        // Simple Coffee - $2.0
        // Simple Coffee + Milk - $2.5
        // Simple Coffee + Milk + Sugar - $2.8
        // Simple Coffee + Milk + Sugar + Whipped Cream - $3.6
    }
}
```

## 現代 Java 實現

### 1. 使用 Java 8+ 功能式接口

```java
// 使用函數式接口
@FunctionalInterface
public interface DataProcessor {
    String process(String data);
}

// 基本處理器
public class BaseProcessor implements DataProcessor {
    @Override
    public String process(String data) {
        return data;
    }
}

// 函數式裝飾器
public class FunctionalDecorator {
    
    public static DataProcessor withLogging(DataProcessor processor) {
        return data -> {
            System.out.println("Processing: " + data);
            String result = processor.process(data);
            System.out.println("Result: " + result);
            return result;
        };
    }
    
    public static DataProcessor withUpperCase(DataProcessor processor) {
        return data -> processor.process(data).toUpperCase();
    }
    
    public static DataProcessor withTrimming(DataProcessor processor) {
        return data -> processor.process(data.trim());
    }
    
    public static DataProcessor withTimestamp(DataProcessor processor) {
        return data -> {
            String timestamp = LocalDateTime.now().toString();
            return "[" + timestamp + "] " + processor.process(data);
        };
    }
}

// 使用示例
public class FunctionalDecoratorDemo {
    public static void main(String[] args) {
        DataProcessor processor = new BaseProcessor();
        
        // 組合多個裝飾器
        DataProcessor decoratedProcessor = FunctionalDecorator.withLogging(
            FunctionalDecorator.withTimestamp(
                FunctionalDecorator.withUpperCase(
                    FunctionalDecorator.withTrimming(processor)
                )
            )
        );
        
        String result = decoratedProcessor.process("  hello world  ");
        System.out.println("Final result: " + result);
    }
}
```

### 2. 使用 Builder 模式的裝飾器

```java
public class DecoratorBuilder<T> {
    private T component;
    private List<Function<T, T>> decorators = new ArrayList<>();
    
    public DecoratorBuilder(T component) {
        this.component = component;
    }
    
    public DecoratorBuilder<T> addDecorator(Function<T, T> decorator) {
        decorators.add(decorator);
        return this;
    }
    
    public T build() {
        return decorators.stream()
                .reduce(Function.identity(), Function::compose)
                .apply(component);
    }
}

// 使用示例
public class BuilderDecoratorDemo {
    public static void main(String[] args) {
        DataProcessor processor = new DecoratorBuilder<>(new BaseProcessor())
            .addDecorator(FunctionalDecorator::withTrimming)
            .addDecorator(FunctionalDecorator::withUpperCase)
            .addDecorator(FunctionalDecorator::withTimestamp)
            .addDecorator(FunctionalDecorator::withLogging)
            .build();
        
        String result = processor.process("  hello world  ");
    }
}
```

## 企業級應用模式

### 1. 日誌裝飾器

```java
// 日誌裝飾器
public class LoggingDecorator<T> {
    private final T target;
    private final Logger logger;
    
    public LoggingDecorator(T target, Logger logger) {
        this.target = target;
        this.logger = logger;
    }
    
    public T getTarget() {
        return target;
    }
    
    // 通過反射創建代理
    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target, Logger logger) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new LoggingInvocationHandler<>(target, logger)
        );
    }
    
    private static class LoggingInvocationHandler<T> implements InvocationHandler {
        private final T target;
        private final Logger logger;
        
        public LoggingInvocationHandler(T target, Logger logger) {
            this.target = target;
            this.logger = logger;
        }
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();
            logger.info("Calling method: {} with args: {}", methodName, Arrays.toString(args));
            
            long startTime = System.currentTimeMillis();
            try {
                Object result = method.invoke(target, args);
                long endTime = System.currentTimeMillis();
                logger.info("Method {} completed in {} ms with result: {}", 
                           methodName, endTime - startTime, result);
                return result;
            } catch (Exception e) {
                logger.error("Method {} threw exception: {}", methodName, e.getMessage());
                throw e;
            }
        }
    }
}

// 業務服務接口
public interface UserService {
    User findById(Long id);
    User save(User user);
    void deleteById(Long id);
}

// 具體服務實現
@Service
public class UserServiceImpl implements UserService {
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @Override
    public User save(User user) {
        return userRepository.save(user);
    }
    
    @Override
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
}

// 使用示例
@Configuration
public class ServiceConfiguration {
    
    @Bean
    public UserService userService(UserServiceImpl userServiceImpl) {
        Logger logger = LoggerFactory.getLogger(UserService.class);
        return LoggingDecorator.createProxy(userServiceImpl, logger);
    }
}
```

### 2. 緩存裝飾器

```java
// 緩存裝飾器
public class CacheDecorator<T> {
    private final T target;
    private final Cache cache;
    private final Set<String> cacheableMethods;
    
    public CacheDecorator(T target, Cache cache, Set<String> cacheableMethods) {
        this.target = target;
        this.cache = cache;
        this.cacheableMethods = cacheableMethods;
    }
    
    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target, Cache cache, Set<String> cacheableMethods) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new CacheInvocationHandler<>(target, cache, cacheableMethods)
        );
    }
    
    private static class CacheInvocationHandler<T> implements InvocationHandler {
        private final T target;
        private final Cache cache;
        private final Set<String> cacheableMethods;
        
        public CacheInvocationHandler(T target, Cache cache, Set<String> cacheableMethods) {
            this.target = target;
            this.cache = cache;
            this.cacheableMethods = cacheableMethods;
        }
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();
            
            if (cacheableMethods.contains(methodName)) {
                String cacheKey = generateCacheKey(methodName, args);
                
                // 嘗試從緩存獲取
                Object cachedResult = cache.get(cacheKey);
                if (cachedResult != null) {
                    return cachedResult;
                }
                
                // 調用原始方法
                Object result = method.invoke(target, args);
                
                // 放入緩存
                cache.put(cacheKey, result);
                return result;
            }
            
            return method.invoke(target, args);
        }
        
        private String generateCacheKey(String methodName, Object[] args) {
            return methodName + ":" + Arrays.toString(args);
        }
    }
}

// 簡單緩存實現
public class SimpleCache implements Cache {
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    
    @Override
    public Object get(String key) {
        return cache.get(key);
    }
    
    @Override
    public void put(String key, Object value) {
        cache.put(key, value);
    }
    
    @Override
    public void evict(String key) {
        cache.remove(key);
    }
    
    @Override
    public void clear() {
        cache.clear();
    }
}

// 使用示例
@Configuration
public class CacheConfiguration {
    
    @Bean
    public Cache userCache() {
        return new SimpleCache();
    }
    
    @Bean
    public UserService cachedUserService(UserServiceImpl userServiceImpl, Cache userCache) {
        Set<String> cacheableMethods = Set.of("findById", "findByUsername");
        return CacheDecorator.createProxy(userServiceImpl, userCache, cacheableMethods);
    }
}
```

### 3. 安全裝飾器

```java
// 安全裝飾器
public class SecurityDecorator<T> {
    private final T target;
    private final SecurityContext securityContext;
    private final Map<String, Set<String>> methodPermissions;
    
    public SecurityDecorator(T target, SecurityContext securityContext, 
                           Map<String, Set<String>> methodPermissions) {
        this.target = target;
        this.securityContext = securityContext;
        this.methodPermissions = methodPermissions;
    }
    
    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target, SecurityContext securityContext, 
                                  Map<String, Set<String>> methodPermissions) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new SecurityInvocationHandler<>(target, securityContext, methodPermissions)
        );
    }
    
    private static class SecurityInvocationHandler<T> implements InvocationHandler {
        private final T target;
        private final SecurityContext securityContext;
        private final Map<String, Set<String>> methodPermissions;
        
        public SecurityInvocationHandler(T target, SecurityContext securityContext, 
                                       Map<String, Set<String>> methodPermissions) {
            this.target = target;
            this.securityContext = securityContext;
            this.methodPermissions = methodPermissions;
        }
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();
            
            // 檢查方法權限
            if (methodPermissions.containsKey(methodName)) {
                Set<String> requiredPermissions = methodPermissions.get(methodName);
                if (!securityContext.hasPermissions(requiredPermissions)) {
                    throw new SecurityException("Access denied: insufficient permissions for method " + methodName);
                }
            }
            
            return method.invoke(target, args);
        }
    }
}

// 安全上下文
public class SecurityContext {
    private final Set<String> userPermissions;
    
    public SecurityContext(Set<String> userPermissions) {
        this.userPermissions = userPermissions;
    }
    
    public boolean hasPermission(String permission) {
        return userPermissions.contains(permission);
    }
    
    public boolean hasPermissions(Set<String> permissions) {
        return userPermissions.containsAll(permissions);
    }
}

// 使用示例
@Configuration
public class SecurityConfiguration {
    
    @Bean
    public UserService securedUserService(UserServiceImpl userServiceImpl, 
                                        SecurityContext securityContext) {
        Map<String, Set<String>> methodPermissions = Map.of(
            "save", Set.of("USER_WRITE"),
            "deleteById", Set.of("USER_DELETE"),
            "findById", Set.of("USER_READ")
        );
        
        return SecurityDecorator.createProxy(userServiceImpl, securityContext, methodPermissions);
    }
}
```

## Spring AOP 集成

### 1. 基於註解的 AOP 裝飾器

```java
// 自定義註解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Loggable {
    String value() default "";
    boolean logParameters() default true;
    boolean logResult() default true;
    boolean logExecutionTime() default true;
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Cacheable {
    String value() default "";
    int ttl() default 300; // seconds
    String keyGenerator() default "";
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Secured {
    String[] permissions() default {};
    String role() default "";
}

// AOP 切面
@Aspect
@Component
public class LoggingAspect {
    private static final Logger logger = LoggerFactory.getLogger(LoggingAspect.class);
    
    @Around("@annotation(loggable)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint, Loggable loggable) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        
        if (loggable.logParameters()) {
            logger.info("Entering method: {} with parameters: {}", 
                       methodName, Arrays.toString(joinPoint.getArgs()));
        }
        
        long startTime = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            long endTime = System.currentTimeMillis();
            
            if (loggable.logExecutionTime()) {
                logger.info("Method {} executed in {} ms", methodName, endTime - startTime);
            }
            
            if (loggable.logResult()) {
                logger.info("Method {} returned: {}", methodName, result);
            }
            
            return result;
        } catch (Exception e) {
            logger.error("Method {} threw exception: {}", methodName, e.getMessage());
            throw e;
        }
    }
}

@Aspect
@Component
public class CacheAspect {
    
    @Autowired
    private CacheManager cacheManager;
    
    @Around("@annotation(cacheable)")
    public Object cacheResult(ProceedingJoinPoint joinPoint, Cacheable cacheable) throws Throwable {
        String cacheName = cacheable.value().isEmpty() ? 
                          joinPoint.getSignature().getDeclaringType().getSimpleName() : 
                          cacheable.value();
        
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return joinPoint.proceed();
        }
        
        String key = generateKey(joinPoint);
        Cache.ValueWrapper cachedValue = cache.get(key);
        
        if (cachedValue != null) {
            return cachedValue.get();
        }
        
        Object result = joinPoint.proceed();
        cache.put(key, result);
        
        return result;
    }
    
    private String generateKey(ProceedingJoinPoint joinPoint) {
        StringBuilder keyBuilder = new StringBuilder();
        keyBuilder.append(joinPoint.getSignature().getName());
        
        for (Object arg : joinPoint.getArgs()) {
            keyBuilder.append(":").append(arg);
        }
        
        return keyBuilder.toString();
    }
}

@Aspect
@Component
public class SecurityAspect {
    
    @Autowired
    private SecurityContext securityContext;
    
    @Before("@annotation(secured)")
    public void checkSecurity(JoinPoint joinPoint, Secured secured) {
        String[] requiredPermissions = secured.permissions();
        String requiredRole = secured.role();
        
        if (requiredPermissions.length > 0) {
            if (!securityContext.hasPermissions(Set.of(requiredPermissions))) {
                throw new SecurityException("Access denied: insufficient permissions");
            }
        }
        
        if (!requiredRole.isEmpty()) {
            if (!securityContext.hasRole(requiredRole)) {
                throw new SecurityException("Access denied: insufficient role");
            }
        }
    }
}
```

### 2. 使用 AOP 註解的服務

```java
@Service
public class EnhancedUserService implements UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    @Loggable(logParameters = true, logResult = true, logExecutionTime = true)
    @Cacheable(value = "users", ttl = 600)
    @Secured(permissions = {"USER_READ"})
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @Override
    @Loggable(logParameters = true, logResult = false)
    @Secured(permissions = {"USER_WRITE"})
    public User save(User user) {
        return userRepository.save(user);
    }
    
    @Override
    @Loggable(logParameters = true)
    @Secured(permissions = {"USER_DELETE"})
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
    
    @Loggable
    @Cacheable(value = "users", ttl = 300)
    @Secured(permissions = {"USER_READ"})
    public List<User> findByRole(String role) {
        return userRepository.findByRole(role);
    }
}
```

### 3. Spring Boot 自動配置

```java
@Configuration
@EnableAspectJAutoProxy
public class AopConfiguration {
    
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "roles", "permissions");
    }
    
    @Bean
    public SecurityContext securityContext() {
        // 在實際應用中，這會從 Spring Security 獲取
        Set<String> permissions = Set.of("USER_READ", "USER_WRITE", "USER_DELETE");
        return new SecurityContext(permissions);
    }
}

// 自動配置類
@Configuration
@ConditionalOnClass(ProceedingJoinPoint.class)
@EnableConfigurationProperties(DecoratorProperties.class)
public class DecoratorAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public LoggingAspect loggingAspect() {
        return new LoggingAspect();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public CacheAspect cacheAspect() {
        return new CacheAspect();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public SecurityAspect securityAspect() {
        return new SecurityAspect();
    }
}

// 配置屬性
@ConfigurationProperties(prefix = "app.decorator")
public class DecoratorProperties {
    private boolean loggingEnabled = true;
    private boolean cachingEnabled = true;
    private boolean securityEnabled = true;
    private LoggingProperties logging = new LoggingProperties();
    private CachingProperties caching = new CachingProperties();
    
    // Getters and setters
    
    public static class LoggingProperties {
        private boolean logParameters = true;
        private boolean logResult = true;
        private boolean logExecutionTime = true;
        
        // Getters and setters
    }
    
    public static class CachingProperties {
        private int defaultTtl = 300;
        private String[] cacheNames = {"default"};
        
        // Getters and setters
    }
}
```

## 實際應用場景

### 1. HTTP 客戶端裝飾器

```java
// HTTP 客戶端接口
public interface HttpClient {
    HttpResponse get(String url);
    HttpResponse post(String url, String body);
    HttpResponse put(String url, String body);
    HttpResponse delete(String url);
}

// 基本實現
public class BasicHttpClient implements HttpClient {
    @Override
    public HttpResponse get(String url) {
        // 基本 HTTP GET 實現
        return new HttpResponse(200, "GET response from " + url);
    }
    
    @Override
    public HttpResponse post(String url, String body) {
        // 基本 HTTP POST 實現
        return new HttpResponse(201, "POST response from " + url);
    }
    
    @Override
    public HttpResponse put(String url, String body) {
        // 基本 HTTP PUT 實現
        return new HttpResponse(200, "PUT response from " + url);
    }
    
    @Override
    public HttpResponse delete(String url) {
        // 基本 HTTP DELETE 實現
        return new HttpResponse(204, "DELETE response from " + url);
    }
}

// 重試裝飾器
public class RetryHttpClient implements HttpClient {
    private final HttpClient httpClient;
    private final int maxRetries;
    private final long retryDelay;
    
    public RetryHttpClient(HttpClient httpClient, int maxRetries, long retryDelay) {
        this.httpClient = httpClient;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }
    
    @Override
    public HttpResponse get(String url) {
        return executeWithRetry(() -> httpClient.get(url));
    }
    
    @Override
    public HttpResponse post(String url, String body) {
        return executeWithRetry(() -> httpClient.post(url, body));
    }
    
    @Override
    public HttpResponse put(String url, String body) {
        return executeWithRetry(() -> httpClient.put(url, body));
    }
    
    @Override
    public HttpResponse delete(String url) {
        return executeWithRetry(() -> httpClient.delete(url));
    }
    
    private HttpResponse executeWithRetry(Supplier<HttpResponse> operation) {
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                HttpResponse response = operation.get();
                if (response.isSuccess()) {
                    return response;
                }
                if (attempt < maxRetries - 1) {
                    Thread.sleep(retryDelay);
                }
            } catch (Exception e) {
                if (attempt == maxRetries - 1) {
                    throw new RuntimeException("Max retries exceeded", e);
                }
                try {
                    Thread.sleep(retryDelay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during retry", ie);
                }
            }
        }
        throw new RuntimeException("Max retries exceeded");
    }
}

// 限流裝飾器
public class RateLimitedHttpClient implements HttpClient {
    private final HttpClient httpClient;
    private final RateLimiter rateLimiter;
    
    public RateLimitedHttpClient(HttpClient httpClient, int requestsPerSecond) {
        this.httpClient = httpClient;
        this.rateLimiter = RateLimiter.create(requestsPerSecond);
    }
    
    @Override
    public HttpResponse get(String url) {
        rateLimiter.acquire();
        return httpClient.get(url);
    }
    
    @Override
    public HttpResponse post(String url, String body) {
        rateLimiter.acquire();
        return httpClient.post(url, body);
    }
    
    @Override
    public HttpResponse put(String url, String body) {
        rateLimiter.acquire();
        return httpClient.put(url, body);
    }
    
    @Override
    public HttpResponse delete(String url) {
        rateLimiter.acquire();
        return httpClient.delete(url);
    }
}

// 使用示例
@Service
public class HttpClientService {
    
    @Bean
    public HttpClient httpClient() {
        HttpClient basicClient = new BasicHttpClient();
        
        // 添加重試功能
        HttpClient retryClient = new RetryHttpClient(basicClient, 3, 1000);
        
        // 添加限流功能
        HttpClient rateLimitedClient = new RateLimitedHttpClient(retryClient, 10);
        
        // 添加日誌功能
        return LoggingDecorator.createProxy(rateLimitedClient, 
                                          LoggerFactory.getLogger(HttpClient.class));
    }
}
```

### 2. 數據庫連接裝飾器

```java
// 數據庫連接接口
public interface DatabaseConnection {
    ResultSet executeQuery(String sql);
    int executeUpdate(String sql);
    void close();
}

// 基本實現
public class BasicDatabaseConnection implements DatabaseConnection {
    private final Connection connection;
    
    public BasicDatabaseConnection(Connection connection) {
        this.connection = connection;
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        try {
            return connection.createStatement().executeQuery(sql);
        } catch (SQLException e) {
            throw new RuntimeException("Query execution failed", e);
        }
    }
    
    @Override
    public int executeUpdate(String sql) {
        try {
            return connection.createStatement().executeUpdate(sql);
        } catch (SQLException e) {
            throw new RuntimeException("Update execution failed", e);
        }
    }
    
    @Override
    public void close() {
        try {
            connection.close();
        } catch (SQLException e) {
            throw new RuntimeException("Connection close failed", e);
        }
    }
}

// 事務裝飾器
public class TransactionalDatabaseConnection implements DatabaseConnection {
    private final DatabaseConnection connection;
    private boolean inTransaction = false;
    
    public TransactionalDatabaseConnection(DatabaseConnection connection) {
        this.connection = connection;
    }
    
    public void beginTransaction() {
        inTransaction = true;
    }
    
    public void commit() {
        inTransaction = false;
    }
    
    public void rollback() {
        inTransaction = false;
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        return connection.executeQuery(sql);
    }
    
    @Override
    public int executeUpdate(String sql) {
        return connection.executeUpdate(sql);
    }
    
    @Override
    public void close() {
        if (inTransaction) {
            rollback();
        }
        connection.close();
    }
}

// 連接池裝飾器
public class PooledDatabaseConnection implements DatabaseConnection {
    private final DatabaseConnection connection;
    private final ConnectionPool pool;
    
    public PooledDatabaseConnection(DatabaseConnection connection, ConnectionPool pool) {
        this.connection = connection;
        this.pool = pool;
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        return connection.executeQuery(sql);
    }
    
    @Override
    public int executeUpdate(String sql) {
        return connection.executeUpdate(sql);
    }
    
    @Override
    public void close() {
        pool.returnConnection(connection);
    }
}
```

## 性能優化和最佳實踐

### 1. 性能監控裝飾器

```java
// 性能監控裝飾器
public class PerformanceMonitoringDecorator<T> {
    private final T target;
    private final MeterRegistry meterRegistry;
    private final String serviceName;
    
    public PerformanceMonitoringDecorator(T target, MeterRegistry meterRegistry, String serviceName) {
        this.target = target;
        this.meterRegistry = meterRegistry;
        this.serviceName = serviceName;
    }
    
    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target, MeterRegistry meterRegistry, String serviceName) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new PerformanceInvocationHandler<>(target, meterRegistry, serviceName)
        );
    }
    
    private static class PerformanceInvocationHandler<T> implements InvocationHandler {
        private final T target;
        private final MeterRegistry meterRegistry;
        private final String serviceName;
        
        public PerformanceInvocationHandler(T target, MeterRegistry meterRegistry, String serviceName) {
            this.target = target;
            this.meterRegistry = meterRegistry;
            this.serviceName = serviceName;
        }
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();
            Timer.Sample sample = Timer.start(meterRegistry);
            
            try {
                Object result = method.invoke(target, args);
                
                // 記錄成功指標
                Counter.builder("method.calls")
                    .tag("service", serviceName)
                    .tag("method", methodName)
                    .tag("status", "success")
                    .register(meterRegistry)
                    .increment();
                
                return result;
            } catch (Exception e) {
                // 記錄失敗指標
                Counter.builder("method.calls")
                    .tag("service", serviceName)
                    .tag("method", methodName)
                    .tag("status", "error")
                    .register(meterRegistry)
                    .increment();
                
                throw e;
            } finally {
                // 記錄執行時間
                sample.stop(Timer.builder("method.execution.time")
                    .tag("service", serviceName)
                    .tag("method", methodName)
                    .register(meterRegistry));
            }
        }
    }
}
```

### 2. 批量操作優化

```java
// 批量操作裝飾器
public class BatchingDecorator<T> {
    private final T target;
    private final int batchSize;
    private final Map<String, List<Object[]>> batchQueue = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler;
    
    public BatchingDecorator(T target, int batchSize, long flushInterval) {
        this.target = target;
        this.batchSize = batchSize;
        this.scheduler = Executors.newScheduledThreadPool(1);
        
        // 定期刷新批量操作
        scheduler.scheduleAtFixedRate(this::flushBatches, flushInterval, flushInterval, TimeUnit.MILLISECONDS);
    }
    
    private void flushBatches() {
        for (Map.Entry<String, List<Object[]>> entry : batchQueue.entrySet()) {
            String methodName = entry.getKey();
            List<Object[]> batch = entry.getValue();
            
            if (!batch.isEmpty()) {
                processBatch(methodName, batch);
                batch.clear();
            }
        }
    }
    
    private void processBatch(String methodName, List<Object[]> batch) {
        try {
            Method method = target.getClass().getMethod("batch" + methodName, List.class);
            method.invoke(target, batch);
        } catch (Exception e) {
            // 處理批量操作失敗
        }
    }
    
    public void addToBatch(String methodName, Object[] args) {
        batchQueue.computeIfAbsent(methodName, k -> new CopyOnWriteArrayList<>()).add(args);
        
        List<Object[]> batch = batchQueue.get(methodName);
        if (batch.size() >= batchSize) {
            processBatch(methodName, batch);
            batch.clear();
        }
    }
}
```

## 測試策略

### 1. 裝飾器測試

```java
@ExtendWith(MockitoExtension.class)
class DecoratorPatternTest {
    
    @Mock
    private UserService mockUserService;
    
    @Mock
    private Logger mockLogger;
    
    @Test
    void testLoggingDecorator() {
        User user = new User(1L, "testUser");
        when(mockUserService.findById(1L)).thenReturn(user);
        
        UserService loggingService = LoggingDecorator.createProxy(mockUserService, mockLogger);
        
        User result = loggingService.findById(1L);
        
        assertEquals(user, result);
        verify(mockUserService).findById(1L);
        // 驗證日誌記錄
    }
    
    @Test
    void testCacheDecorator() {
        Cache cache = new SimpleCache();
        Set<String> cacheableMethods = Set.of("findById");
        
        User user = new User(1L, "testUser");
        when(mockUserService.findById(1L)).thenReturn(user);
        
        UserService cachedService = CacheDecorator.createProxy(mockUserService, cache, cacheableMethods);
        
        // 第一次調用
        User result1 = cachedService.findById(1L);
        assertEquals(user, result1);
        
        // 第二次調用應該從緩存獲取
        User result2 = cachedService.findById(1L);
        assertEquals(user, result2);
        
        // 只應該調用一次實際方法
        verify(mockUserService, times(1)).findById(1L);
    }
    
    @Test
    void testSecurityDecorator() {
        SecurityContext securityContext = new SecurityContext(Set.of("USER_READ"));
        Map<String, Set<String>> methodPermissions = Map.of(
            "findById", Set.of("USER_READ"),
            "save", Set.of("USER_WRITE")
        );
        
        UserService securedService = SecurityDecorator.createProxy(
            mockUserService, securityContext, methodPermissions);
        
        // 應該允許讀取操作
        assertDoesNotThrow(() -> securedService.findById(1L));
        
        // 應該拒絕寫入操作
        assertThrows(SecurityException.class, () -> securedService.save(new User()));
    }
}
```

### 2. AOP 測試

```java
@SpringBootTest
@EnableAspectJAutoProxy
class AopDecoratorTest {
    
    @Autowired
    private UserService userService;
    
    @MockBean
    private UserRepository userRepository;
    
    @Test
    void testLoggingAspect() {
        User user = new User(1L, "testUser");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        
        User result = userService.findById(1L);
        
        assertEquals(user, result);
        // 驗證日誌輸出
    }
    
    @Test
    void testCacheAspect() {
        User user = new User(1L, "testUser");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        
        // 第一次調用
        User result1 = userService.findById(1L);
        assertEquals(user, result1);
        
        // 第二次調用應該從緩存獲取
        User result2 = userService.findById(1L);
        assertEquals(user, result2);
        
        // 只應該調用一次數據庫
        verify(userRepository, times(1)).findById(1L);
    }
}
```

## 最佳實踐

### 1. 設計原則

- **單一職責**: 每個裝飾器只處理一個橫切關注點
- **開放封閉**: 易於添加新裝飾器而不修改現有代碼
- **組合優於繼承**: 使用組合來擴展行為
- **接口隔離**: 定義清晰的接口契約

### 2. 實現建議

- 使用不可變對象提高線程安全性
- 考慮裝飾器的順序，特別是在鏈式調用中
- 實現適當的異常處理
- 提供配置選項來控制裝飾器行為

### 3. 性能考慮

- 避免過度裝飾導致性能下降
- 使用緩存來提高重複操作的性能
- 考慮異步處理來減少阻塞
- 監控裝飾器的性能影響

### 4. 常見陷阱

- 避免裝飾器鏈過長
- 注意循環依賴問題
- 正確處理異常傳播
- 考慮線程安全性

## 適用場景

### 何時使用

1. **橫切關注點**: 需要添加日誌、安全、緩存等橫切功能
2. **動態行為**: 需要在運行時動態添加或移除功能
3. **避免繼承**: 當繼承會導致類爆炸時
4. **透明擴展**: 需要透明地擴展對象功能

### 何時避免

1. **簡單場景**: 當功能擴展很簡單時
2. **性能關鍵**: 當性能是關鍵因素時
3. **過度使用**: 當裝飾器層次過多時
4. **類型安全**: 當需要強類型檢查時

## 總結

Decorator Pattern 是一個強大的結構型設計模式，特別適合在企業級應用中處理橫切關注點。通過與 Spring AOP 的結合使用，我們可以創建出非常靈活和可維護的系統。

現代 Java 的函數式編程特性為 Decorator Pattern 提供了新的實現方式，使得代碼更加簡潔和易讀。在實際應用中，關鍵是要理解何時使用這個模式，以及如何正確地組合多個裝飾器來達到所需的效果。

通過合理使用 Decorator Pattern，我們可以構建出既靈活又可維護的企業級應用，同時保持代碼的清晰性和可測試性。