---
title: "DesignPattern - Structural - Proxy"
author: Bill.Lin
date: 2018-08-07T12:15:41+08:00
draft: false
tags: ["Design Pattern", "Structural", "Proxy", "AOP", "Spring", "Caching"]
Description: "Comprehensive guide to Proxy Pattern with modern implementations, Spring AOP integration, caching proxies, and enterprise patterns"
Categories: ["Architecture"]
DisableComments: false
---

# Proxy Pattern

## 概述

Proxy Pattern 是一種結構型設計模式，它為另一個對象提供一個代理或占位符，以控制對它的訪問。代理對象與原始對象具有相同的接口，因此客戶端可以透明地使用代理而無需知道它們正在與代理交互。

## 核心概念

### 關鍵特性

1. **訪問控制**: 控制對原始對象的訪問
2. **懶加載**: 延遲對象的創建直到真正需要時
3. **緩存**: 緩存結果以提高性能
4. **日誌記錄**: 記錄方法調用和結果
5. **權限檢查**: 在訪問前進行安全檢查

### 代理類型

1. **虛擬代理**: 控制對昂貴對象的訪問
2. **遠程代理**: 控制對遠程對象的訪問
3. **保護代理**: 控制對敏感對象的訪問
4. **智能代理**: 提供額外功能如引用計數、緩存等

### 結構組件

- **Subject**: 定義代理和真實對象的共同接口
- **RealSubject**: 真實對象，實現實際的業務邏輯
- **Proxy**: 代理對象，控制對真實對象的訪問

## 基本實現

### 1. 經典代理實現

```java
// 主題接口
public interface Subject {
    void request();
    String getData();
}

// 真實對象
public class RealSubject implements Subject {
    private String data;
    
    public RealSubject() {
        // 模擬昂貴的初始化過程
        System.out.println("RealSubject: Initializing...");
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        this.data = "Important data";
        System.out.println("RealSubject: Initialized");
    }
    
    @Override
    public void request() {
        System.out.println("RealSubject: Handling request");
    }
    
    @Override
    public String getData() {
        return data;
    }
}

// 代理對象
public class Proxy implements Subject {
    private RealSubject realSubject;
    private String cachedData;
    private boolean accessGranted;
    
    public Proxy(boolean accessGranted) {
        this.accessGranted = accessGranted;
    }
    
    @Override
    public void request() {
        if (!accessGranted) {
            System.out.println("Proxy: Access denied");
            return;
        }
        
        System.out.println("Proxy: Checking access before request");
        
        if (realSubject == null) {
            realSubject = new RealSubject();
        }
        
        System.out.println("Proxy: Logging request");
        realSubject.request();
        System.out.println("Proxy: Request completed");
    }
    
    @Override
    public String getData() {
        if (!accessGranted) {
            return "Access denied";
        }
        
        // 緩存實現
        if (cachedData != null) {
            System.out.println("Proxy: Returning cached data");
            return cachedData;
        }
        
        if (realSubject == null) {
            realSubject = new RealSubject();
        }
        
        cachedData = realSubject.getData();
        System.out.println("Proxy: Data cached");
        return cachedData;
    }
}
```

### 2. 測試示例

```java
public class ProxyPatternDemo {
    public static void main(String[] args) {
        System.out.println("=== Testing with access granted ===");
        Subject proxy1 = new Proxy(true);
        proxy1.request();
        
        System.out.println("\n=== Testing caching ===");
        String data1 = proxy1.getData();
        String data2 = proxy1.getData(); // 應該返回緩存數據
        
        System.out.println("\n=== Testing with access denied ===");
        Subject proxy2 = new Proxy(false);
        proxy2.request();
        String data3 = proxy2.getData();
        
        System.out.println("Data1: " + data1);
        System.out.println("Data2: " + data2);
        System.out.println("Data3: " + data3);
    }
}
```

## 動態代理實現

### 1. Java 動態代理

```java
// 業務接口
public interface UserService {
    User findById(Long id);
    User save(User user);
    void deleteById(Long id);
    List<User> findAll();
}

// 業務實現
public class UserServiceImpl implements UserService {
    private final Map<Long, User> users = new ConcurrentHashMap<>();
    
    @Override
    public User findById(Long id) {
        System.out.println("UserServiceImpl: Finding user with id " + id);
        return users.get(id);
    }
    
    @Override
    public User save(User user) {
        System.out.println("UserServiceImpl: Saving user " + user.getName());
        users.put(user.getId(), user);
        return user;
    }
    
    @Override
    public void deleteById(Long id) {
        System.out.println("UserServiceImpl: Deleting user with id " + id);
        users.remove(id);
    }
    
    @Override
    public List<User> findAll() {
        System.out.println("UserServiceImpl: Finding all users");
        return new ArrayList<>(users.values());
    }
}

// 動態代理處理器
public class ServiceInvocationHandler implements InvocationHandler {
    private final Object target;
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final Set<String> cacheableMethods = Set.of("findById", "findAll");
    
    public ServiceInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        String methodName = method.getName();
        
        // 日誌記錄
        System.out.println("Proxy: Before method " + methodName);
        long startTime = System.currentTimeMillis();
        
        try {
            // 緩存邏輯
            if (cacheableMethods.contains(methodName)) {
                String cacheKey = generateCacheKey(methodName, args);
                Object cachedResult = cache.get(cacheKey);
                if (cachedResult != null) {
                    System.out.println("Proxy: Returning cached result for " + methodName);
                    return cachedResult;
                }
                
                Object result = method.invoke(target, args);
                cache.put(cacheKey, result);
                System.out.println("Proxy: Result cached for " + methodName);
                return result;
            }
            
            // 清除緩存邏輯
            if (methodName.startsWith("save") || methodName.startsWith("delete")) {
                cache.clear();
                System.out.println("Proxy: Cache cleared due to " + methodName);
            }
            
            return method.invoke(target, args);
        } catch (Exception e) {
            System.out.println("Proxy: Exception in method " + methodName + ": " + e.getMessage());
            throw e;
        } finally {
            long endTime = System.currentTimeMillis();
            System.out.println("Proxy: Method " + methodName + " completed in " + (endTime - startTime) + "ms");
        }
    }
    
    private String generateCacheKey(String methodName, Object[] args) {
        return methodName + ":" + Arrays.toString(args);
    }
}

// 代理工廠
public class ProxyFactory {
    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target, Class<T> interfaceClass) {
        return (T) Proxy.newProxyInstance(
            interfaceClass.getClassLoader(),
            new Class[]{interfaceClass},
            new ServiceInvocationHandler(target)
        );
    }
}
```

### 2. 使用示例

```java
public class DynamicProxyDemo {
    public static void main(String[] args) {
        UserService userService = new UserServiceImpl();
        UserService proxy = ProxyFactory.createProxy(userService, UserService.class);
        
        // 測試緩存
        User user = new User(1L, "John Doe");
        proxy.save(user);
        
        // 第一次查詢
        User found1 = proxy.findById(1L);
        // 第二次查詢（應該從緩存獲取）
        User found2 = proxy.findById(1L);
        
        // 修改數據（應該清除緩存）
        proxy.save(new User(2L, "Jane Smith"));
        
        // 再次查詢（應該重新執行）
        User found3 = proxy.findById(1L);
    }
}
```

## Spring AOP 代理

### 1. Spring AOP 註解

```java
// 自定義註解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Cacheable {
    String value() default "";
    int ttl() default 300;
    boolean condition() default true;
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
    int value() default 10; // requests per second
    String key() default "";
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String value() default "";
    AuditLevel level() default AuditLevel.INFO;
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Secured {
    String[] roles() default {};
    String[] permissions() default {};
}

// 審計級別
public enum AuditLevel {
    INFO, WARN, ERROR
}
```

### 2. Spring AOP 切面實現

```java
@Aspect
@Component
public class CachingAspect {
    
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
        
        String key = generateCacheKey(joinPoint);
        Cache.ValueWrapper cachedValue = cache.get(key);
        
        if (cachedValue != null) {
            return cachedValue.get();
        }
        
        Object result = joinPoint.proceed();
        cache.put(key, result);
        
        return result;
    }
    
    private String generateCacheKey(ProceedingJoinPoint joinPoint) {
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
public class RateLimitingAspect {
    
    private final Map<String, RateLimiter> rateLimiters = new ConcurrentHashMap<>();
    
    @Before("@annotation(rateLimited)")
    public void checkRateLimit(JoinPoint joinPoint, RateLimited rateLimited) {
        String key = rateLimited.key().isEmpty() ? 
                    joinPoint.getSignature().toShortString() : 
                    rateLimited.key();
        
        RateLimiter rateLimiter = rateLimiters.computeIfAbsent(key, 
            k -> RateLimiter.create(rateLimited.value()));
        
        if (!rateLimiter.tryAcquire()) {
            throw new RateLimitExceededException("Rate limit exceeded for " + key);
        }
    }
}

@Aspect
@Component
public class AuditingAspect {
    
    private static final Logger logger = LoggerFactory.getLogger(AuditingAspect.class);
    
    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String auditMessage = audited.value().isEmpty() ? methodName : audited.value();
        
        logger.info("Audit: Starting method {} with args: {}", 
                   methodName, Arrays.toString(joinPoint.getArgs()));
        
        long startTime = System.currentTimeMillis();
        try {
            Object result = joinPoint.proceed();
            long endTime = System.currentTimeMillis();
            
            logger.info("Audit: Method {} completed successfully in {}ms", 
                       methodName, endTime - startTime);
            
            return result;
        } catch (Exception e) {
            logger.error("Audit: Method {} failed with exception: {}", 
                        methodName, e.getMessage());
            throw e;
        }
    }
}

@Aspect
@Component
public class SecurityAspect {
    
    @Autowired
    private SecurityService securityService;
    
    @Before("@annotation(secured)")
    public void checkSecurity(JoinPoint joinPoint, Secured secured) {
        String[] requiredRoles = secured.roles();
        String[] requiredPermissions = secured.permissions();
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("User not authenticated");
        }
        
        if (requiredRoles.length > 0) {
            for (String role : requiredRoles) {
                if (!securityService.hasRole(authentication, role)) {
                    throw new SecurityException("Insufficient role: " + role);
                }
            }
        }
        
        if (requiredPermissions.length > 0) {
            for (String permission : requiredPermissions) {
                if (!securityService.hasPermission(authentication, permission)) {
                    throw new SecurityException("Insufficient permission: " + permission);
                }
            }
        }
    }
}
```

### 3. 使用 AOP 代理的服務

```java
@Service
@Transactional
public class EnhancedUserService implements UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    @Cacheable(value = "users", ttl = 600)
    @RateLimited(value = 20)
    @Audited("Finding user by ID")
    @Secured(permissions = {"USER_READ"})
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @Override
    @RateLimited(value = 5)
    @Audited("Saving user")
    @Secured(permissions = {"USER_WRITE"})
    public User save(User user) {
        return userRepository.save(user);
    }
    
    @Override
    @RateLimited(value = 2)
    @Audited(value = "Deleting user", level = AuditLevel.WARN)
    @Secured(permissions = {"USER_DELETE"})
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }
    
    @Override
    @Cacheable(value = "users", ttl = 300)
    @RateLimited(value = 10)
    @Audited("Finding all users")
    @Secured(permissions = {"USER_READ"})
    public List<User> findAll() {
        return userRepository.findAll();
    }
}
```

## 企業級代理模式

### 1. 數據庫連接池代理

```java
// 數據庫連接接口
public interface DatabaseConnection {
    ResultSet executeQuery(String sql);
    int executeUpdate(String sql);
    void close();
    boolean isClosed();
}

// 真實連接實現
public class RealDatabaseConnection implements DatabaseConnection {
    private final Connection connection;
    
    public RealDatabaseConnection(String url, String username, String password) throws SQLException {
        this.connection = DriverManager.getConnection(url, username, password);
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
    
    @Override
    public boolean isClosed() {
        try {
            return connection.isClosed();
        } catch (SQLException e) {
            return true;
        }
    }
}

// 連接池代理
public class ConnectionPoolProxy implements DatabaseConnection {
    private final DatabaseConnection realConnection;
    private final ConnectionPool pool;
    private boolean closed = false;
    
    public ConnectionPoolProxy(DatabaseConnection realConnection, ConnectionPool pool) {
        this.realConnection = realConnection;
        this.pool = pool;
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        if (closed) {
            throw new IllegalStateException("Connection is closed");
        }
        return realConnection.executeQuery(sql);
    }
    
    @Override
    public int executeUpdate(String sql) {
        if (closed) {
            throw new IllegalStateException("Connection is closed");
        }
        return realConnection.executeUpdate(sql);
    }
    
    @Override
    public void close() {
        if (!closed) {
            closed = true;
            pool.returnConnection(realConnection);
        }
    }
    
    @Override
    public boolean isClosed() {
        return closed;
    }
}

// 連接池實現
@Component
public class ConnectionPool {
    private final Queue<DatabaseConnection> availableConnections = new ConcurrentLinkedQueue<>();
    private final Set<DatabaseConnection> usedConnections = ConcurrentHashMap.newKeySet();
    private final String url;
    private final String username;
    private final String password;
    private final int maxPoolSize;
    
    public ConnectionPool(@Value("${db.url}") String url, 
                         @Value("${db.username}") String username,
                         @Value("${db.password}") String password,
                         @Value("${db.pool.maxSize:10}") int maxPoolSize) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.maxPoolSize = maxPoolSize;
        
        // 初始化連接池
        initializePool();
    }
    
    private void initializePool() {
        for (int i = 0; i < maxPoolSize / 2; i++) {
            try {
                availableConnections.offer(new RealDatabaseConnection(url, username, password));
            } catch (SQLException e) {
                throw new RuntimeException("Failed to initialize connection pool", e);
            }
        }
    }
    
    public DatabaseConnection getConnection() {
        DatabaseConnection connection = availableConnections.poll();
        if (connection == null) {
            if (usedConnections.size() < maxPoolSize) {
                try {
                    connection = new RealDatabaseConnection(url, username, password);
                } catch (SQLException e) {
                    throw new RuntimeException("Failed to create new connection", e);
                }
            } else {
                throw new RuntimeException("Connection pool exhausted");
            }
        }
        
        usedConnections.add(connection);
        return new ConnectionPoolProxy(connection, this);
    }
    
    public void returnConnection(DatabaseConnection connection) {
        if (usedConnections.remove(connection)) {
            if (!connection.isClosed()) {
                availableConnections.offer(connection);
            }
        }
    }
}
```

### 2. 微服務代理

```java
// 微服務客戶端接口
public interface OrderService {
    Order createOrder(Order order);
    Order getOrder(Long orderId);
    List<Order> getOrdersByUserId(Long userId);
    void cancelOrder(Long orderId);
}

// 遠程服務代理
@Component
public class OrderServiceProxy implements OrderService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${order.service.url}")
    private String orderServiceUrl;
    
    private final CircuitBreaker circuitBreaker;
    private final Cache cache;
    
    public OrderServiceProxy(CircuitBreaker circuitBreaker, Cache cache) {
        this.circuitBreaker = circuitBreaker;
        this.cache = cache;
    }
    
    @Override
    @Retryable(value = {Exception.class}, maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public Order createOrder(Order order) {
        return circuitBreaker.executeSupplier(() -> {
            String url = orderServiceUrl + "/orders";
            return restTemplate.postForObject(url, order, Order.class);
        });
    }
    
    @Override
    public Order getOrder(Long orderId) {
        String cacheKey = "order:" + orderId;
        Order cachedOrder = cache.get(cacheKey, Order.class);
        
        if (cachedOrder != null) {
            return cachedOrder;
        }
        
        Order order = circuitBreaker.executeSupplier(() -> {
            String url = orderServiceUrl + "/orders/" + orderId;
            return restTemplate.getForObject(url, Order.class);
        });
        
        if (order != null) {
            cache.put(cacheKey, order);
        }
        
        return order;
    }
    
    @Override
    public List<Order> getOrdersByUserId(Long userId) {
        String cacheKey = "orders:user:" + userId;
        List<Order> cachedOrders = cache.get(cacheKey, List.class);
        
        if (cachedOrders != null) {
            return cachedOrders;
        }
        
        List<Order> orders = circuitBreaker.executeSupplier(() -> {
            String url = orderServiceUrl + "/orders?userId=" + userId;
            return Arrays.asList(restTemplate.getForObject(url, Order[].class));
        });
        
        if (orders != null) {
            cache.put(cacheKey, orders);
        }
        
        return orders;
    }
    
    @Override
    public void cancelOrder(Long orderId) {
        circuitBreaker.executeSupplier(() -> {
            String url = orderServiceUrl + "/orders/" + orderId + "/cancel";
            restTemplate.put(url, null);
            
            // 清除相關緩存
            cache.evict("order:" + orderId);
            
            return null;
        });
    }
}
```

### 3. 緩存代理實現

```java
// 多級緩存代理
@Component
public class MultiLevelCacheProxy<T> {
    private final Cache l1Cache; // 本地緩存
    private final Cache l2Cache; // 分布式緩存
    private final int l1Ttl;
    private final int l2Ttl;
    
    public MultiLevelCacheProxy(@Qualifier("l1Cache") Cache l1Cache,
                               @Qualifier("l2Cache") Cache l2Cache,
                               @Value("${cache.l1.ttl:300}") int l1Ttl,
                               @Value("${cache.l2.ttl:3600}") int l2Ttl) {
        this.l1Cache = l1Cache;
        this.l2Cache = l2Cache;
        this.l1Ttl = l1Ttl;
        this.l2Ttl = l2Ttl;
    }
    
    public T get(String key, Class<T> type, Supplier<T> dataLoader) {
        // 先查 L1 緩存
        T value = l1Cache.get(key, type);
        if (value != null) {
            return value;
        }
        
        // 再查 L2 緩存
        value = l2Cache.get(key, type);
        if (value != null) {
            // 回寫到 L1 緩存
            l1Cache.put(key, value);
            return value;
        }
        
        // 從數據源加載
        value = dataLoader.get();
        if (value != null) {
            // 寫入 L2 緩存
            l2Cache.put(key, value);
            // 寫入 L1 緩存
            l1Cache.put(key, value);
        }
        
        return value;
    }
    
    public void put(String key, T value) {
        l1Cache.put(key, value);
        l2Cache.put(key, value);
    }
    
    public void evict(String key) {
        l1Cache.evict(key);
        l2Cache.evict(key);
    }
}

// 智能緩存代理
@Component
public class SmartCacheProxy {
    private final RedisTemplate<String, Object> redisTemplate;
    private final Map<String, LocalDateTime> accessTimes = new ConcurrentHashMap<>();
    private final Map<String, Integer> hitCounts = new ConcurrentHashMap<>();
    
    public SmartCacheProxy(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    public <T> T get(String key, Class<T> type, Supplier<T> dataLoader) {
        // 記錄訪問時間
        accessTimes.put(key, LocalDateTime.now());
        
        // 嘗試從緩存獲取
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            // 增加命中次數
            hitCounts.merge(key, 1, Integer::sum);
            return type.cast(cached);
        }
        
        // 從數據源加載
        T value = dataLoader.get();
        if (value != null) {
            // 動態 TTL 策略
            int ttl = calculateTtl(key);
            redisTemplate.opsForValue().set(key, value, ttl, TimeUnit.SECONDS);
        }
        
        return value;
    }
    
    private int calculateTtl(String key) {
        int baseTime = 300; // 5分鐘
        int hitCount = hitCounts.getOrDefault(key, 0);
        
        // 熱點數據延長緩存時間
        if (hitCount > 100) {
            return baseTime * 4; // 20分鐘
        } else if (hitCount > 50) {
            return baseTime * 2; // 10分鐘
        }
        
        return baseTime;
    }
}
```

## Spring Boot 集成

### 1. 自動配置

```java
@Configuration
@EnableAspectJAutoProxy
@EnableConfigurationProperties(ProxyProperties.class)
public class ProxyAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public CachingAspect cachingAspect(CacheManager cacheManager) {
        return new CachingAspect();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public RateLimitingAspect rateLimitingAspect() {
        return new RateLimitingAspect();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public AuditingAspect auditingAspect() {
        return new AuditingAspect();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public SecurityAspect securityAspect() {
        return new SecurityAspect();
    }
    
    @Bean
    @ConditionalOnProperty(prefix = "proxy.connection-pool", name = "enabled", havingValue = "true")
    public ConnectionPool connectionPool(ProxyProperties properties) {
        ProxyProperties.ConnectionPool poolConfig = properties.getConnectionPool();
        return new ConnectionPool(
            poolConfig.getUrl(),
            poolConfig.getUsername(),
            poolConfig.getPassword(),
            poolConfig.getMaxSize()
        );
    }
}

// 配置屬性
@ConfigurationProperties(prefix = "proxy")
@Data
public class ProxyProperties {
    private Cache cache = new Cache();
    private RateLimit rateLimit = new RateLimit();
    private ConnectionPool connectionPool = new ConnectionPool();
    
    @Data
    public static class Cache {
        private boolean enabled = true;
        private int defaultTtl = 300;
        private String[] cacheNames = {"default"};
    }
    
    @Data
    public static class RateLimit {
        private boolean enabled = true;
        private int defaultRate = 10;
        private TimeUnit timeUnit = TimeUnit.SECONDS;
    }
    
    @Data
    public static class ConnectionPool {
        private boolean enabled = false;
        private String url;
        private String username;
        private String password;
        private int maxSize = 10;
        private int minSize = 2;
    }
}
```

### 2. 使用配置

```yaml
# application.yml
proxy:
  cache:
    enabled: true
    default-ttl: 600
    cache-names:
      - users
      - orders
      - products
  rate-limit:
    enabled: true
    default-rate: 20
    time-unit: SECONDS
  connection-pool:
    enabled: true
    url: jdbc:mysql://localhost:3306/mydb
    username: user
    password: password
    max-size: 20
    min-size: 5

spring:
  cache:
    type: redis
  redis:
    host: localhost
    port: 6379
```

## 性能監控和測試

### 1. 性能監控代理

```java
@Component
public class PerformanceMonitoringProxy {
    private final MeterRegistry meterRegistry;
    private final Map<String, Timer> timers = new ConcurrentHashMap<>();
    
    public PerformanceMonitoringProxy(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public <T> T monitor(String operationName, Supplier<T> operation) {
        Timer timer = timers.computeIfAbsent(operationName, 
            name -> Timer.builder(name)
                        .description("Operation performance timer")
                        .register(meterRegistry));
        
        return timer.recordCallable(() -> {
            Counter.builder("operation.calls")
                   .tag("operation", operationName)
                   .register(meterRegistry)
                   .increment();
            
            try {
                T result = operation.get();
                
                Counter.builder("operation.success")
                       .tag("operation", operationName)
                       .register(meterRegistry)
                       .increment();
                
                return result;
            } catch (Exception e) {
                Counter.builder("operation.error")
                       .tag("operation", operationName)
                       .tag("error", e.getClass().getSimpleName())
                       .register(meterRegistry)
                       .increment();
                throw e;
            }
        });
    }
}
```

### 2. 測試策略

```java
@ExtendWith(MockitoExtension.class)
class ProxyPatternTest {
    
    @Mock
    private UserService mockUserService;
    
    @Mock
    private CacheManager mockCacheManager;
    
    @Mock
    private Cache mockCache;
    
    @Test
    void testCachingProxy() {
        // 準備測試數據
        User user = new User(1L, "John Doe");
        when(mockUserService.findById(1L)).thenReturn(user);
        when(mockCacheManager.getCache("users")).thenReturn(mockCache);
        when(mockCache.get("findById:1")).thenReturn(null, new SimpleValueWrapper(user));
        
        // 創建代理
        UserService proxy = ProxyFactory.createProxy(mockUserService, UserService.class);
        
        // 第一次調用
        User result1 = proxy.findById(1L);
        assertEquals(user, result1);
        
        // 第二次調用應該從緩存獲取
        User result2 = proxy.findById(1L);
        assertEquals(user, result2);
        
        // 驗證只調用了一次實際服務
        verify(mockUserService, times(1)).findById(1L);
    }
    
    @Test
    void testRateLimitingProxy() throws InterruptedException {
        RateLimiter rateLimiter = RateLimiter.create(1.0); // 1 request per second
        
        // 第一次調用應該成功
        assertTrue(rateLimiter.tryAcquire());
        
        // 立即第二次調用應該失敗
        assertFalse(rateLimiter.tryAcquire());
        
        // 等待一秒後應該可以再次調用
        Thread.sleep(1100);
        assertTrue(rateLimiter.tryAcquire());
    }
}

@SpringBootTest
class ProxyIntegrationTest {
    
    @Autowired
    private UserService userService;
    
    @MockBean
    private UserRepository userRepository;
    
    @Test
    void testAopProxy() {
        User user = new User(1L, "John Doe");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        
        // 測試緩存
        User result1 = userService.findById(1L);
        User result2 = userService.findById(1L);
        
        assertEquals(user, result1);
        assertEquals(user, result2);
        
        // 由於緩存，只應該調用一次
        verify(userRepository, times(1)).findById(1L);
    }
}
```

## 最佳實踐

### 1. 設計原則

- **透明性**: 代理應該對客戶端透明
- **單一職責**: 每個代理只處理一個關注點
- **性能**: 避免不必要的代理層
- **線程安全**: 確保代理是線程安全的

### 2. 實現建議

- 使用接口而不是具體類
- 考慮使用組合而非繼承
- 實現適當的錯誤處理
- 提供配置選項

### 3. 性能考慮

- 避免過度代理
- 使用合適的緩存策略
- 監控代理性能
- 考慮異步處理

### 4. 常見陷阱

- 避免無限遞歸
- 注意內存洩漏
- 正確處理異常
- 考慮並發問題

## 適用場景

### 何時使用

1. **訪問控制**: 需要控制對對象的訪問
2. **懶加載**: 延遲對象的創建
3. **緩存**: 緩存昂貴的操作結果
4. **遠程訪問**: 訪問遠程對象
5. **日誌記錄**: 記錄方法調用

### 何時避免

1. **簡單場景**: 當代理沒有提供額外價值時
2. **性能關鍵**: 當代理會顯著影響性能時
3. **過度複雜**: 當代理層次過多時

## 總結

Proxy Pattern 是一個非常強大和靈活的設計模式，特別是在企業級應用中。通過與 Spring AOP 的結合，我們可以創建出非常優雅和功能豐富的代理實現。

現代 Java 的動態代理機制為我們提供了強大的工具來實現各種代理模式，而 Spring Boot 的自動配置功能使得集成變得非常簡單。

關鍵是要理解不同類型的代理模式，以及如何根據具體需求選擇合適的實現方式。通過合理使用代理模式，我們可以構建出既高效又易於維護的企業級應用系統。