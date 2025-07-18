---
title: "原型模式 (Prototype Pattern) 完整實作指南：深淺拷貝、Spring Prototype Scope 與企業級對象創建最佳實踐"
author: Bill.Lin
date: 2018-08-07T02:27:13+08:00
draft: false
tags: ["Design Pattern", "Prototype Pattern", "Creational Pattern", "Object Cloning", "Deep Copy", "Shallow Copy", "Spring Prototype", "Bean Scope", "Java", "Spring Boot", "Enterprise Architecture", "Object Creation", "Memory Management", "Performance Optimization", "Serialization", "Copy Constructor", "Best Practices"]
Description: "深入探討原型模式的完整實作指南，包含深淺拷貝技術、Spring prototype scope 配置與企業級對象創建模式最佳實踐"
Categories: ["Architecture"]
DisableComments: false
---

## 原型模式 (Prototype Pattern) 完整實作指南

### 模式概述

原型模式是一種創建型設計模式，它允許通過複製現有的實例來創建新對象，而不需要知道具體創建過程的細節。這個模式特別適用於創建成本高昂或複雜的對象，通過克隆已存在的原型實例來避免重複的初始化過程。

### 核心概念

#### 1. 原型模式解決的問題

- **昂貴的對象創建**：避免重複執行耗時的初始化操作
- **複雜的對象構造**：簡化具有多個參數或複雜狀態的對象創建
- **運行時對象創建**：在運行時動態決定要創建的對象類型
- **框架級對象管理**：如 Spring 容器中的 prototype scope beans

#### 2. 淺拷貝 vs 深拷貝

```java
/**
 * 示範淺拷貝和深拷貝的差異
 */
public class CopyExample {
    
    public static class Address {
        private String street;
        private String city;
        
        public Address(String street, String city) {
            this.street = street;
            this.city = city;
        }
        
        // Copy constructor for deep copy
        public Address(Address address) {
            this.street = address.street;
            this.city = address.city;
        }
        
        // Getters and setters
        public String getStreet() { return street; }
        public void setStreet(String street) { this.street = street; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        
        @Override
        public String toString() {
            return String.format("Address{street='%s', city='%s'}", street, city);
        }
    }
    
    public static class Person implements Cloneable {
        private String name;
        private int age;
        private Address address; // Reference type
        
        public Person(String name, int age, Address address) {
            this.name = name;
            this.age = age;
            this.address = address;
        }
        
        /**
         * 淺拷貝 - 只複製基本類型和引用地址
         */
        @Override
        public Person clone() throws CloneNotSupportedException {
            return (Person) super.clone(); // 淺拷貝
        }
        
        /**
         * 深拷貝 - 遞歸複製所有引用對象
         */
        public Person deepClone() {
            Address newAddress = new Address(this.address);
            return new Person(this.name, this.age, newAddress);
        }
        
        // Getters and setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public int getAge() { return age; }
        public void setAge(int age) { this.age = age; }
        public Address getAddress() { return address; }
        public void setAddress(Address address) { this.address = address; }
        
        @Override
        public String toString() {
            return String.format("Person{name='%s', age=%d, address=%s}", 
                               name, age, address);
        }
    }
    
    public static void main(String[] args) throws CloneNotSupportedException {
        // 原始對象
        Address originalAddress = new Address("123 Main St", "台北市");
        Person originalPerson = new Person("John", 30, originalAddress);
        
        // 淺拷貝測試
        Person shallowCopy = originalPerson.clone();
        System.out.println("=== 淺拷貝測試 ===");
        System.out.println("原始: " + originalPerson);
        System.out.println("淺拷貝: " + shallowCopy);
        
        // 修改淺拷貝的地址
        shallowCopy.getAddress().setStreet("456 Oak Ave");
        System.out.println("修改淺拷貝地址後:");
        System.out.println("原始: " + originalPerson); // 也被改變！
        System.out.println("淺拷貝: " + shallowCopy);
        
        // 深拷貝測試
        originalAddress.setStreet("123 Main St"); // 重置
        Person deepCopy = originalPerson.deepClone();
        System.out.println("\n=== 深拷貝測試 ===");
        System.out.println("原始: " + originalPerson);
        System.out.println("深拷貝: " + deepCopy);
        
        // 修改深拷貝的地址
        deepCopy.getAddress().setStreet("789 Pine Rd");
        System.out.println("修改深拷貝地址後:");
        System.out.println("原始: " + originalPerson); // 不受影響
        System.out.println("深拷貝: " + deepCopy);
    }
}
```

## 基礎實作範例

### 1. 原型接口設計

```java
/**
 * 通用原型接口
 */
public interface Prototype<T> {
    T clone();
    T deepClone();
}

/**
 * 可序列化的深拷貝接口
 */
public interface SerializablePrototype<T> extends Prototype<T>, Serializable {
    
    /**
     * 使用序列化實現深拷貝
     */
    @SuppressWarnings("unchecked")
    default T deepCloneViaSerialization() {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ObjectOutputStream out = new ObjectOutputStream(bos)) {
            
            out.writeObject(this);
            
            try (ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
                 ObjectInputStream in = new ObjectInputStream(bis)) {
                
                return (T) in.readObject();
            }
        } catch (IOException | ClassNotFoundException e) {
            throw new RuntimeException("深拷貝失敗", e);
        }
    }
}
```

### 2. 企業級原型管理器

```java
/**
 * 原型管理器 - 管理和創建各種原型實例
 */
@Component
public class PrototypeManager {
    
    private final Map<String, Prototype<?>> prototypes = new ConcurrentHashMap<>();
    private final Logger logger = LoggerFactory.getLogger(PrototypeManager.class);
    
    /**
     * 註冊原型
     */
    public <T> void registerPrototype(String key, Prototype<T> prototype) {
        prototypes.put(key, prototype);
        logger.info("註冊原型: {} -> {}", key, prototype.getClass().getSimpleName());
    }
    
    /**
     * 獲取原型的淺拷貝
     */
    @SuppressWarnings("unchecked")
    public <T> T getClone(String key) {
        Prototype<T> prototype = (Prototype<T>) prototypes.get(key);
        if (prototype == null) {
            throw new IllegalArgumentException("找不到原型: " + key);
        }
        
        T clone = prototype.clone();
        logger.debug("創建淺拷貝: {} -> {}", key, clone.getClass().getSimpleName());
        return clone;
    }
    
    /**
     * 獲取原型的深拷貝
     */
    @SuppressWarnings("unchecked")
    public <T> T getDeepClone(String key) {
        Prototype<T> prototype = (Prototype<T>) prototypes.get(key);
        if (prototype == null) {
            throw new IllegalArgumentException("找不到原型: " + key);
        }
        
        T deepClone = prototype.deepClone();
        logger.debug("創建深拷貝: {} -> {}", key, deepClone.getClass().getSimpleName());
        return deepClone;
    }
    
    /**
     * 列出所有可用的原型
     */
    public Set<String> getAvailablePrototypes() {
        return Collections.unmodifiableSet(prototypes.keySet());
    }
    
    /**
     * 清除所有原型
     */
    public void clearPrototypes() {
        prototypes.clear();
        logger.info("清除所有原型");
    }
}
```

### 3. 複雜對象原型實現

```java
/**
 * 企業級用戶配置原型
 */
public class UserProfile implements SerializablePrototype<UserProfile> {
    
    private String userId;
    private String username;
    private String email;
    private List<String> roles;
    private Map<String, Object> preferences;
    private UserSettings settings;
    private LocalDateTime createdAt;
    private LocalDateTime lastModified;
    
    public UserProfile() {
        this.roles = new ArrayList<>();
        this.preferences = new HashMap<>();
        this.settings = new UserSettings();
        this.createdAt = LocalDateTime.now();
        this.lastModified = LocalDateTime.now();
    }
    
    public UserProfile(String userId, String username, String email) {
        this();
        this.userId = userId;
        this.username = username;
        this.email = email;
    }
    
    /**
     * 淺拷貝實現
     */
    @Override
    public UserProfile clone() {
        try {
            return (UserProfile) super.clone();
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException("克隆失敗", e);
        }
    }
    
    /**
     * 深拷貝實現
     */
    @Override
    public UserProfile deepClone() {
        UserProfile cloned = new UserProfile();
        cloned.userId = this.userId;
        cloned.username = this.username;
        cloned.email = this.email;
        cloned.roles = new ArrayList<>(this.roles);
        cloned.preferences = new HashMap<>(this.preferences);
        cloned.settings = this.settings.deepClone();
        cloned.createdAt = this.createdAt;
        cloned.lastModified = LocalDateTime.now();
        
        return cloned;
    }
    
    /**
     * 用戶設置內部類
     */
    public static class UserSettings implements Serializable {
        private String theme;
        private String language;
        private boolean emailNotifications;
        private Map<String, String> customSettings;
        
        public UserSettings() {
            this.theme = "default";
            this.language = "zh-TW";
            this.emailNotifications = true;
            this.customSettings = new HashMap<>();
        }
        
        public UserSettings deepClone() {
            UserSettings cloned = new UserSettings();
            cloned.theme = this.theme;
            cloned.language = this.language;
            cloned.emailNotifications = this.emailNotifications;
            cloned.customSettings = new HashMap<>(this.customSettings);
            return cloned;
        }
        
        // Getters and setters
        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
        public boolean isEmailNotifications() { return emailNotifications; }
        public void setEmailNotifications(boolean emailNotifications) { this.emailNotifications = emailNotifications; }
        public Map<String, String> getCustomSettings() { return customSettings; }
        public void setCustomSettings(Map<String, String> customSettings) { this.customSettings = customSettings; }
    }
    
    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
    public Map<String, Object> getPreferences() { return preferences; }
    public void setPreferences(Map<String, Object> preferences) { this.preferences = preferences; }
    public UserSettings getSettings() { return settings; }
    public void setSettings(UserSettings settings) { this.settings = settings; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastModified() { return lastModified; }
    public void setLastModified(LocalDateTime lastModified) { this.lastModified = lastModified; }
    
    @Override
    public String toString() {
        return String.format("UserProfile{userId='%s', username='%s', email='%s', roles=%s}", 
                           userId, username, email, roles);
    }
}
```

## Spring Boot 整合

### 1. Spring Prototype Scope 配置

```java
/**
 * Spring Prototype Scope 配置
 */
@Configuration
public class PrototypePatternConfig {
    
    /**
     * Prototype scope bean - 每次注入時創建新實例
     */
    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    public UserProfile prototypeUserProfile() {
        UserProfile profile = new UserProfile();
        profile.setUsername("prototype-user");
        profile.setEmail("prototype@example.com");
        profile.getRoles().add("USER");
        return profile;
    }
    
    /**
     * 使用 @Lookup 方法注入 prototype bean
     */
    @Component
    public static abstract class UserProfileFactory {
        
        @Lookup
        public abstract UserProfile createUserProfile();
        
        /**
         * 創建自定義用戶配置
         */
        public UserProfile createCustomUserProfile(String userId, String username, String email) {
            UserProfile profile = createUserProfile();
            profile.setUserId(userId);
            profile.setUsername(username);
            profile.setEmail(email);
            return profile;
        }
    }
    
    /**
     * 原型管理器配置
     */
    @Bean
    public PrototypeManager prototypeManager() {
        PrototypeManager manager = new PrototypeManager();
        
        // 註冊預設原型
        manager.registerPrototype("admin-user", createAdminUserProfile());
        manager.registerPrototype("guest-user", createGuestUserProfile());
        manager.registerPrototype("vip-user", createVipUserProfile());
        
        return manager;
    }
    
    private UserProfile createAdminUserProfile() {
        UserProfile admin = new UserProfile("admin", "Administrator", "admin@company.com");
        admin.getRoles().addAll(Arrays.asList("ADMIN", "USER", "MODERATOR"));
        admin.getPreferences().put("theme", "dark");
        admin.getPreferences().put("language", "en-US");
        return admin;
    }
    
    private UserProfile createGuestUserProfile() {
        UserProfile guest = new UserProfile("guest", "Guest User", "guest@example.com");
        guest.getRoles().add("GUEST");
        guest.getPreferences().put("theme", "light");
        guest.getPreferences().put("language", "zh-TW");
        return guest;
    }
    
    private UserProfile createVipUserProfile() {
        UserProfile vip = new UserProfile("vip", "VIP User", "vip@company.com");
        vip.getRoles().addAll(Arrays.asList("VIP", "USER"));
        vip.getPreferences().put("theme", "premium");
        vip.getPreferences().put("notifications", "immediate");
        return vip;
    }
}
```

### 2. Spring Boot 服務層整合

```java
/**
 * 用戶配置服務
 */
@Service
@Transactional
public class UserProfileService {
    
    private final PrototypeManager prototypeManager;
    private final UserProfileFactory userProfileFactory;
    private final ApplicationEventPublisher eventPublisher;
    private final Logger logger = LoggerFactory.getLogger(UserProfileService.class);
    
    public UserProfileService(PrototypeManager prototypeManager,
                            UserProfileFactory userProfileFactory,
                            ApplicationEventPublisher eventPublisher) {
        this.prototypeManager = prototypeManager;
        this.userProfileFactory = userProfileFactory;
        this.eventPublisher = eventPublisher;
    }
    
    /**
     * 基於原型創建用戶配置
     */
    public UserProfile createUserProfileFromPrototype(String prototypeKey, String userId) {
        try {
            UserProfile template = prototypeManager.getDeepClone(prototypeKey);
            template.setUserId(userId);
            template.setLastModified(LocalDateTime.now());
            
            logger.info("基於原型 {} 創建用戶配置: {}", prototypeKey, userId);
            eventPublisher.publishEvent(new UserProfileCreatedEvent(template, prototypeKey));
            
            return template;
            
        } catch (Exception e) {
            logger.error("創建用戶配置失敗: prototype={}, userId={}", prototypeKey, userId, e);
            throw new UserProfileCreationException("無法創建用戶配置", e);
        }
    }
    
    /**
     * 批量創建用戶配置
     */
    public List<UserProfile> createBatchUserProfiles(String prototypeKey, List<String> userIds) {
        return userIds.stream()
            .map(userId -> createUserProfileFromPrototype(prototypeKey, userId))
            .collect(Collectors.toList());
    }
    
    /**
     * 從 Spring prototype scope 創建配置
     */
    public UserProfile createUserProfileFromSpringPrototype(String userId, String username, String email) {
        UserProfile profile = userProfileFactory.createCustomUserProfile(userId, username, email);
        
        logger.info("從 Spring prototype 創建用戶配置: {}", userId);
        eventPublisher.publishEvent(new UserProfileCreatedEvent(profile, "spring-prototype"));
        
        return profile;
    }
    
    /**
     * 複製現有用戶配置
     */
    public UserProfile cloneUserProfile(UserProfile source, String newUserId, boolean deepCopy) {
        UserProfile cloned = deepCopy ? source.deepClone() : source.clone();
        cloned.setUserId(newUserId);
        cloned.setCreatedAt(LocalDateTime.now());
        cloned.setLastModified(LocalDateTime.now());
        
        String copyType = deepCopy ? "深拷貝" : "淺拷貝";
        logger.info("{}用戶配置: {} -> {}", copyType, source.getUserId(), newUserId);
        
        return cloned;
    }
}

/**
 * 用戶配置創建事件
 */
public class UserProfileCreatedEvent {
    private final UserProfile userProfile;
    private final String sourceType;
    private final LocalDateTime timestamp;
    
    public UserProfileCreatedEvent(UserProfile userProfile, String sourceType) {
        this.userProfile = userProfile;
        this.sourceType = sourceType;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters
    public UserProfile getUserProfile() { return userProfile; }
    public String getSourceType() { return sourceType; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

/**
 * 自定義異常
 */
public class UserProfileCreationException extends RuntimeException {
    public UserProfileCreationException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### 3. REST API 控制器

```java
/**
 * 用戶配置 REST API
 */
@RestController
@RequestMapping("/api/user-profiles")
@Validated
public class UserProfileController {
    
    private final UserProfileService userProfileService;
    private final PrototypeManager prototypeManager;
    
    public UserProfileController(UserProfileService userProfileService,
                               PrototypeManager prototypeManager) {
        this.userProfileService = userProfileService;
        this.prototypeManager = prototypeManager;
    }
    
    /**
     * 基於原型創建用戶配置
     */
    @PostMapping("/create/{prototypeKey}")
    public ResponseEntity<UserProfileResponse> createFromPrototype(
            @PathVariable String prototypeKey,
            @RequestParam String userId) {
        
        try {
            UserProfile profile = userProfileService.createUserProfileFromPrototype(prototypeKey, userId);
            return ResponseEntity.ok(UserProfileResponse.success(profile));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(UserProfileResponse.error("無效的原型: " + prototypeKey));
                
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserProfileResponse.error("創建失敗: " + e.getMessage()));
        }
    }
    
    /**
     * 批量創建用戶配置
     */
    @PostMapping("/batch/{prototypeKey}")
    public ResponseEntity<BatchUserProfileResponse> createBatch(
            @PathVariable String prototypeKey,
            @RequestBody @Valid BatchCreateRequest request) {
        
        try {
            List<UserProfile> profiles = userProfileService.createBatchUserProfiles(
                prototypeKey, request.getUserIds());
            
            return ResponseEntity.ok(BatchUserProfileResponse.success(profiles));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(BatchUserProfileResponse.error("批量創建失敗: " + e.getMessage()));
        }
    }
    
    /**
     * 複製用戶配置
     */
    @PostMapping("/clone")
    public ResponseEntity<UserProfileResponse> cloneProfile(
            @RequestBody @Valid CloneProfileRequest request) {
        
        // 這裡簡化為從原型克隆，實際應用中可能從現有用戶配置克隆
        UserProfile source = userProfileService.createUserProfileFromPrototype(
            request.getSourcePrototype(), "temp");
        
        UserProfile cloned = userProfileService.cloneUserProfile(
            source, request.getNewUserId(), request.isDeepCopy());
        
        return ResponseEntity.ok(UserProfileResponse.success(cloned));
    }
    
    /**
     * 獲取可用的原型
     */
    @GetMapping("/prototypes")
    public ResponseEntity<Set<String>> getAvailablePrototypes() {
        Set<String> prototypes = prototypeManager.getAvailablePrototypes();
        return ResponseEntity.ok(prototypes);
    }
}

/**
 * 請求 DTO
 */
public static class BatchCreateRequest {
    @NotEmpty
    private List<String> userIds;
    
    public List<String> getUserIds() { return userIds; }
    public void setUserIds(List<String> userIds) { this.userIds = userIds; }
}

public static class CloneProfileRequest {
    @NotBlank
    private String sourcePrototype;
    
    @NotBlank
    private String newUserId;
    
    private boolean deepCopy = true;
    
    public String getSourcePrototype() { return sourcePrototype; }
    public void setSourcePrototype(String sourcePrototype) { this.sourcePrototype = sourcePrototype; }
    public String getNewUserId() { return newUserId; }
    public void setNewUserId(String newUserId) { this.newUserId = newUserId; }
    public boolean isDeepCopy() { return deepCopy; }
    public void setDeepCopy(boolean deepCopy) { this.deepCopy = deepCopy; }
}

/**
 * 回應 DTO
 */
public static class UserProfileResponse {
    private boolean success;
    private String message;
    private UserProfile data;
    private LocalDateTime timestamp;
    
    private UserProfileResponse(boolean success, String message, UserProfile data) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }
    
    public static UserProfileResponse success(UserProfile profile) {
        return new UserProfileResponse(true, "操作成功", profile);
    }
    
    public static UserProfileResponse error(String message) {
        return new UserProfileResponse(false, message, null);
    }
    
    // Getters
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public UserProfile getData() { return data; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

public static class BatchUserProfileResponse {
    private boolean success;
    private String message;
    private List<UserProfile> data;
    private int totalCount;
    private LocalDateTime timestamp;
    
    private BatchUserProfileResponse(boolean success, String message, List<UserProfile> data) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.totalCount = data != null ? data.size() : 0;
        this.timestamp = LocalDateTime.now();
    }
    
    public static BatchUserProfileResponse success(List<UserProfile> profiles) {
        return new BatchUserProfileResponse(true, "批量操作成功", profiles);
    }
    
    public static BatchUserProfileResponse error(String message) {
        return new BatchUserProfileResponse(false, message, null);
    }
    
    // Getters
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public List<UserProfile> getData() { return data; }
    public int getTotalCount() { return totalCount; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
```

## 進階主題

### 1. 效能優化策略

```java
/**
 * 高效能原型管理器
 */
@Component
public class OptimizedPrototypeManager extends PrototypeManager {
    
    private final Cache<String, Object> prototypeCache;
    private final ExecutorService executorService;
    private final AtomicLong cloneCounter = new AtomicLong(0);
    
    public OptimizedPrototypeManager() {
        this.prototypeCache = Caffeine.newBuilder()
            .maximumSize(500)
            .expireAfterAccess(30, TimeUnit.MINUTES)
            .recordStats()
            .build();
            
        this.executorService = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors());
    }
    
    /**
     * 異步批量克隆
     */
    public <T> CompletableFuture<List<T>> asyncBatchClone(String prototypeKey, int count) {
        return CompletableFuture.supplyAsync(() -> {
            List<T> results = new ArrayList<>(count);
            for (int i = 0; i < count; i++) {
                results.add(getDeepClone(prototypeKey));
            }
            cloneCounter.addAndGet(count);
            return results;
        }, executorService);
    }
    
    /**
     * 帶快取的克隆
     */
    @SuppressWarnings("unchecked")
    public <T> T getCachedClone(String key, Duration cacheDuration) {
        String cacheKey = key + "_cached";
        
        return (T) prototypeCache.get(cacheKey, k -> {
            T clone = getDeepClone(key);
            // 設定快取過期時間（簡化實現）
            return clone;
        });
    }
    
    /**
     * 效能統計
     */
    public PrototypeManagerStats getStats() {
        CacheStats cacheStats = prototypeCache.stats();
        return new PrototypeManagerStats(
            cloneCounter.get(),
            cacheStats.hitRate(),
            cacheStats.missRate(),
            cacheStats.evictionCount()
        );
    }
    
    public static class PrototypeManagerStats {
        private final long totalClones;
        private final double cacheHitRate;
        private final double cacheMissRate;
        private final long cacheEvictions;
        
        public PrototypeManagerStats(long totalClones, double cacheHitRate, 
                                   double cacheMissRate, long cacheEvictions) {
            this.totalClones = totalClones;
            this.cacheHitRate = cacheHitRate;
            this.cacheMissRate = cacheMissRate;
            this.cacheEvictions = cacheEvictions;
        }
        
        // Getters
        public long getTotalClones() { return totalClones; }
        public double getCacheHitRate() { return cacheHitRate; }
        public double getCacheMissRate() { return cacheMissRate; }
        public long getCacheEvictions() { return cacheEvictions; }
        
        @Override
        public String toString() {
            return String.format("PrototypeManagerStats{totalClones=%d, hitRate=%.2f%%, missRate=%.2f%%, evictions=%d}", 
                               totalClones, cacheHitRate * 100, cacheMissRate * 100, cacheEvictions);
        }
    }
}
```

### 2. 測試策略

```java
/**
 * 原型模式單元測試
 */
@ExtendWith(MockitoExtension.class)
class PrototypePatternTest {
    
    @InjectMocks
    private PrototypeManager prototypeManager;
    
    @Test
    void testShallowVsDeepCopy() {
        // Given
        UserProfile original = createTestUserProfile();
        
        // When - 淺拷貝
        UserProfile shallowCopy = original.clone();
        shallowCopy.getSettings().setTheme("dark");
        
        // Then - 原始對象也被修改
        assertThat(original.getSettings().getTheme()).isEqualTo("dark");
        
        // When - 深拷貝
        UserProfile deepCopy = original.deepClone();
        deepCopy.getSettings().setTheme("blue");
        
        // Then - 原始對象不受影響
        assertThat(original.getSettings().getTheme()).isEqualTo("dark");
        assertThat(deepCopy.getSettings().getTheme()).isEqualTo("blue");
    }
    
    @Test
    void testPrototypeManagerRegistration() {
        // Given
        UserProfile adminPrototype = createAdminUserProfile();
        
        // When
        prototypeManager.registerPrototype("admin", adminPrototype);
        
        // Then
        assertThat(prototypeManager.getAvailablePrototypes()).contains("admin");
        
        UserProfile cloned = prototypeManager.getDeepClone("admin");
        assertThat(cloned).isNotSameAs(adminPrototype);
        assertThat(cloned.getUsername()).isEqualTo(adminPrototype.getUsername());
    }
    
    @Test
    void testSerializationDeepCopy() {
        // Given
        UserProfile original = createTestUserProfile();
        
        // When
        UserProfile serializedCopy = original.deepCloneViaSerialization();
        
        // Then
        assertThat(serializedCopy).isNotSameAs(original);
        assertThat(serializedCopy.getSettings()).isNotSameAs(original.getSettings());
        assertThat(serializedCopy.getUsername()).isEqualTo(original.getUsername());
    }
    
    @Test
    void testPrototypeNotFound() {
        // When & Then
        assertThatThrownBy(() -> prototypeManager.getClone("non-existent"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("找不到原型");
    }
    
    private UserProfile createTestUserProfile() {
        UserProfile profile = new UserProfile("test-001", "testuser", "test@example.com");
        profile.getRoles().add("USER");
        profile.getPreferences().put("language", "zh-TW");
        return profile;
    }
    
    private UserProfile createAdminUserProfile() {
        UserProfile admin = new UserProfile("admin-001", "admin", "admin@company.com");
        admin.getRoles().addAll(Arrays.asList("ADMIN", "USER"));
        admin.getPreferences().put("theme", "admin");
        return admin;
    }
}

/**
 * Spring Boot 整合測試
 */
@SpringBootTest
@TestPropertySource(properties = {
    "logging.level.com.example.prototype=DEBUG"
})
class PrototypePatternIntegrationTest {
    
    @Autowired
    private UserProfileService userProfileService;
    
    @Autowired
    private PrototypeManager prototypeManager;
    
    @Test
    void testSpringPrototypeScopeCreation() {
        // When
        UserProfile profile1 = userProfileService.createUserProfileFromSpringPrototype(
            "user1", "testuser1", "test1@example.com");
        UserProfile profile2 = userProfileService.createUserProfileFromSpringPrototype(
            "user2", "testuser2", "test2@example.com");
        
        // Then
        assertThat(profile1).isNotSameAs(profile2);
        assertThat(profile1.getUserId()).isEqualTo("user1");
        assertThat(profile2.getUserId()).isEqualTo("user2");
    }
    
    @Test
    void testPrototypeManagerIntegration() {
        // Given
        Set<String> availablePrototypes = prototypeManager.getAvailablePrototypes();
        assertThat(availablePrototypes).isNotEmpty();
        
        // When
        String prototypeKey = availablePrototypes.iterator().next();
        UserProfile profile = userProfileService.createUserProfileFromPrototype(prototypeKey, "integration-test");
        
        // Then
        assertThat(profile).isNotNull();
        assertThat(profile.getUserId()).isEqualTo("integration-test");
    }
    
    @Test
    void testBatchUserProfileCreation() {
        // Given
        List<String> userIds = Arrays.asList("batch1", "batch2", "batch3");
        
        // When
        List<UserProfile> profiles = userProfileService.createBatchUserProfiles("guest-user", userIds);
        
        // Then
        assertThat(profiles).hasSize(3);
        assertThat(profiles.stream().map(UserProfile::getUserId))
            .containsExactlyInAnyOrder("batch1", "batch2", "batch3");
    }
}
```

## 最佳實踐與建議

### 1. 設計原則

- **明確拷貝語義**：清楚定義何時使用淺拷貝，何時使用深拷貝
- **異常處理**：確保克隆過程中的異常得到適當處理
- **效能考量**：對於頻繁克隆的對象考慮使用對象池或快取

### 2. 常見陷阱

#### 避免在拷貝過程中修改狀態
```java
// ❌ 錯誤的設計 - 在克隆中修改狀態
public UserProfile clone() {
    UserProfile cloned = (UserProfile) super.clone();
    cloned.setLastModified(LocalDateTime.now()); // 可能導致併發問題
    return cloned;
}

// ✅ 正確的設計 - 在克隆後設定狀態
public UserProfile clone() {
    UserProfile cloned = (UserProfile) super.clone();
    return cloned;
}
```

#### 正確處理序列化版本
```java
// ✅ 添加 serialVersionUID 確保序列化兼容性
public class UserProfile implements SerializablePrototype<UserProfile> {
    private static final long serialVersionUID = 1L;
    // ...
}
```

### 3. 使用建議

1. **適用場景**：昂貴對象創建、複雜狀態初始化、動態對象類型選擇
2. **Spring 整合**：善用 prototype scope 和 @Lookup 方法注入
3. **效能優化**：考慮使用對象池、快取和異步處理

## 總結

原型模式通過複製現有對象來創建新實例，避免了重複的初始化過程，特別適合創建成本高昂或狀態複雜的對象。在企業級應用中，結合 Spring 框架的 prototype scope 和依賴注入機制，可以實現靈活且高效的對象創建策略。

### 主要優點
- **效能提升**：避免昂貴的對象創建過程
- **簡化創建**：隱藏複雜的對象構造邏輯  
- **動態類型**：運行時決定創建的對象類型
- **狀態保持**：保持原型對象的初始狀態

### 主要缺點
- **深拷貝複雜性**：處理循環引用和深層嵌套對象
- **克隆實現要求**：每個類都需要實現克隆邏輯
- **內存使用**：可能增加內存佔用

正確使用原型模式可以有效提升對象創建的效率和靈活性，是企業級應用開發中重要的創建型設計模式。