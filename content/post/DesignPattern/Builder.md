---
title: "建造者模式 (Builder Pattern) 完整實作指南：複雜對象構造的最佳實踐"
author: Bill.Lin
date: 2018-08-07T02:16:32+08:00
draft: false
tags: ["Design Pattern", "Builder Pattern", "Creational Pattern", "Object Construction", "Fluent Interface", "Method Chaining", "Java", "Spring Boot", "Best Practices", "Enterprise Development", "Complex Objects", "Configuration Management", "API Design"]
Description: "深入探討建造者模式的完整實作指南，包含複雜對象構造機制、流式介面設計、企業級應用場景與最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 建造者模式 (Builder Pattern) 完整實作指南

### 模式概述

建造者模式是一種創建型設計模式，它將複雜對象的構造與其表示分離，使得同樣的構造過程可以創建不同的表示。該模式特別適用於構造參數眾多、配置複雜的對象。

### 核心概念

建造者模式解決的核心問題：
- **複雜對象構造**：當對象有多個可選參數時，避免構造函數參數過多
- **步驟化構造**：將對象構造過程分解為多個步驟
- **不變性保證**：確保構造完成的對象是不可變的
- **可讀性提升**：提供清晰、直觀的對象構造方式

### 傳統建造者模式實現

#### 1. 基本結構

```java
// 產品類 - 要構造的複雜對象
public class Computer {
    private String cpu;
    private String memory;
    private String storage;
    private String graphics;
    private String motherboard;
    private String powerSupply;
    private String coolingSystem;
    private boolean isOverclocked;
    
    // 私有構造函數，只能通過Builder創建
    private Computer(Builder builder) {
        this.cpu = builder.cpu;
        this.memory = builder.memory;
        this.storage = builder.storage;
        this.graphics = builder.graphics;
        this.motherboard = builder.motherboard;
        this.powerSupply = builder.powerSupply;
        this.coolingSystem = builder.coolingSystem;
        this.isOverclocked = builder.isOverclocked;
    }
    
    // 抽象建造者接口
    public interface ComputerBuilder {
        ComputerBuilder setCpu(String cpu);
        ComputerBuilder setMemory(String memory);
        ComputerBuilder setStorage(String storage);
        ComputerBuilder setGraphics(String graphics);
        ComputerBuilder setMotherboard(String motherboard);
        ComputerBuilder setPowerSupply(String powerSupply);
        ComputerBuilder setCoolingSystem(String coolingSystem);
        ComputerBuilder setOverclocked(boolean overclocked);
        Computer build();
    }
    
    // 具體建造者實現
    public static class Builder implements ComputerBuilder {
        private String cpu;
        private String memory;
        private String storage;
        private String graphics;
        private String motherboard;
        private String powerSupply;
        private String coolingSystem;
        private boolean isOverclocked;
        
        @Override
        public Builder setCpu(String cpu) {
            this.cpu = cpu;
            return this;
        }
        
        @Override
        public Builder setMemory(String memory) {
            this.memory = memory;
            return this;
        }
        
        @Override
        public Builder setStorage(String storage) {
            this.storage = storage;
            return this;
        }
        
        @Override
        public Builder setGraphics(String graphics) {
            this.graphics = graphics;
            return this;
        }
        
        @Override
        public Builder setMotherboard(String motherboard) {
            this.motherboard = motherboard;
            return this;
        }
        
        @Override
        public Builder setPowerSupply(String powerSupply) {
            this.powerSupply = powerSupply;
            return this;
        }
        
        @Override
        public Builder setCoolingSystem(String coolingSystem) {
            this.coolingSystem = coolingSystem;
            return this;
        }
        
        @Override
        public Builder setOverclocked(boolean overclocked) {
            this.isOverclocked = overclocked;
            return this;
        }
        
        @Override
        public Computer build() {
            validateConfiguration();
            return new Computer(this);
        }
        
        private void validateConfiguration() {
            if (cpu == null) {
                throw new IllegalStateException("CPU 是必需的組件");
            }
            if (memory == null) {
                throw new IllegalStateException("記憶體是必需的組件");
            }
            if (storage == null) {
                throw new IllegalStateException("儲存設備是必需的組件");
            }
            if (isOverclocked && coolingSystem == null) {
                throw new IllegalStateException("超頻配置需要冷卻系統");
            }
        }
    }
    
    // 指導者類 - 定義構造步驟
    public static class Director {
        public Computer buildGamingComputer() {
            return new Builder()
                .setCpu("Intel i9-13900K")
                .setMemory("32GB DDR5")
                .setStorage("1TB NVMe SSD")
                .setGraphics("RTX 4080")
                .setMotherboard("ASUS ROG Maximus")
                .setPowerSupply("850W 80+ Gold")
                .setCoolingSystem("AIO 240mm")
                .setOverclocked(true)
                .build();
        }
        
        public Computer buildOfficeComputer() {
            return new Builder()
                .setCpu("Intel i5-13400")
                .setMemory("16GB DDR4")
                .setStorage("512GB SATA SSD")
                .setGraphics("Intel UHD Graphics")
                .setMotherboard("MSI B660")
                .setPowerSupply("500W 80+ Bronze")
                .build();
        }
        
        public Computer buildWorkstationComputer() {
            return new Builder()
                .setCpu("AMD Ryzen 9 7950X")
                .setMemory("64GB DDR5")
                .setStorage("2TB NVMe SSD")
                .setGraphics("RTX 4090")
                .setMotherboard("ASUS ProArt")
                .setPowerSupply("1000W 80+ Platinum")
                .setCoolingSystem("Custom Loop")
                .build();
        }
    }
    
    // Getter 方法
    public String getCpu() { return cpu; }
    public String getMemory() { return memory; }
    public String getStorage() { return storage; }
    public String getGraphics() { return graphics; }
    public String getMotherboard() { return motherboard; }
    public String getPowerSupply() { return powerSupply; }
    public String getCoolingSystem() { return coolingSystem; }
    public boolean isOverclocked() { return isOverclocked; }
    
    @Override
    public String toString() {
        return "Computer{" +
               "cpu='" + cpu + '\'' +
               ", memory='" + memory + '\'' +
               ", storage='" + storage + '\'' +
               ", graphics='" + graphics + '\'' +
               ", motherboard='" + motherboard + '\'' +
               ", powerSupply='" + powerSupply + '\'' +
               ", coolingSystem='" + coolingSystem + '\'' +
               ", isOverclocked=" + isOverclocked +
               '}';
    }
}
```

#### 2. 使用示例

```java
public class BuilderPatternExample {
    public static void main(String[] args) {
        // 使用 Director 構造預定義配置
        Computer.Director director = new Computer.Director();
        
        Computer gamingPC = director.buildGamingComputer();
        System.out.println("遊戲電腦: " + gamingPC);
        
        Computer officePC = director.buildOfficeComputer();
        System.out.println("辦公電腦: " + officePC);
        
        // 直接使用 Builder 自定義配置
        Computer customPC = new Computer.Builder()
            .setCpu("AMD Ryzen 7 7800X3D")
            .setMemory("32GB DDR5")
            .setStorage("1TB NVMe SSD")
            .setGraphics("RTX 4070")
            .setMotherboard("MSI MAG X670E")
            .setPowerSupply("750W 80+ Gold")
            .setCoolingSystem("Air Cooler")
            .build();
        
        System.out.println("自定義電腦: " + customPC);
    }
}
```

### 現代建造者模式實現

#### 1. 流式介面建造者

```java
// 現代化的建造者模式實現
public class DatabaseConfiguration {
    private final String host;
    private final int port;
    private final String database;
    private final String username;
    private final String password;
    private final int connectionPoolSize;
    private final int connectionTimeout;
    private final boolean useSSL;
    private final boolean autoReconnect;
    private final Map<String, String> properties;
    
    private DatabaseConfiguration(Builder builder) {
        this.host = builder.host;
        this.port = builder.port;
        this.database = builder.database;
        this.username = builder.username;
        this.password = builder.password;
        this.connectionPoolSize = builder.connectionPoolSize;
        this.connectionTimeout = builder.connectionTimeout;
        this.useSSL = builder.useSSL;
        this.autoReconnect = builder.autoReconnect;
        this.properties = Collections.unmodifiableMap(new HashMap<>(builder.properties));
    }
    
    public static class Builder {
        // 必需參數
        private String host;
        private int port;
        private String database;
        private String username;
        private String password;
        
        // 可選參數，提供默認值
        private int connectionPoolSize = 10;
        private int connectionTimeout = 30000;
        private boolean useSSL = false;
        private boolean autoReconnect = true;
        private Map<String, String> properties = new HashMap<>();
        
        // 必需參數的構造函數
        public Builder(String host, int port, String database, String username, String password) {
            this.host = requireNonNull(host, "Host 不能為空");
            this.port = requireValidPort(port);
            this.database = requireNonNull(database, "Database 不能為空");
            this.username = requireNonNull(username, "Username 不能為空");
            this.password = requireNonNull(password, "Password 不能為空");
        }
        
        public Builder connectionPoolSize(int size) {
            if (size <= 0) {
                throw new IllegalArgumentException("連接池大小必須大於0");
            }
            this.connectionPoolSize = size;
            return this;
        }
        
        public Builder connectionTimeout(int timeout) {
            if (timeout < 0) {
                throw new IllegalArgumentException("連接超時不能為負數");
            }
            this.connectionTimeout = timeout;
            return this;
        }
        
        public Builder useSSL(boolean useSSL) {
            this.useSSL = useSSL;
            return this;
        }
        
        public Builder autoReconnect(boolean autoReconnect) {
            this.autoReconnect = autoReconnect;
            return this;
        }
        
        public Builder property(String key, String value) {
            this.properties.put(requireNonNull(key), requireNonNull(value));
            return this;
        }
        
        public Builder properties(Map<String, String> properties) {
            this.properties.putAll(requireNonNull(properties));
            return this;
        }
        
        public DatabaseConfiguration build() {
            validateConfiguration();
            return new DatabaseConfiguration(this);
        }
        
        private void validateConfiguration() {
            if (useSSL && port == 3306) {
                throw new IllegalStateException("SSL 連接建議使用非標準端口");
            }
            if (connectionPoolSize > 100) {
                throw new IllegalStateException("連接池大小過大，建議不超過100");
            }
        }
        
        private String requireNonNull(String value, String message) {
            if (value == null || value.trim().isEmpty()) {
                throw new IllegalArgumentException(message);
            }
            return value;
        }
        
        private String requireNonNull(String value) {
            return requireNonNull(value, "值不能為空");
        }
        
        private int requireValidPort(int port) {
            if (port < 1 || port > 65535) {
                throw new IllegalArgumentException("端口必須在1-65535之間");
            }
            return port;
        }
    }
    
    // Getter 方法
    public String getHost() { return host; }
    public int getPort() { return port; }
    public String getDatabase() { return database; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public int getConnectionPoolSize() { return connectionPoolSize; }
    public int getConnectionTimeout() { return connectionTimeout; }
    public boolean isUseSSL() { return useSSL; }
    public boolean isAutoReconnect() { return autoReconnect; }
    public Map<String, String> getProperties() { return properties; }
    
    @Override
    public String toString() {
        return "DatabaseConfiguration{" +
               "host='" + host + '\'' +
               ", port=" + port +
               ", database='" + database + '\'' +
               ", username='" + username + '\'' +
               ", connectionPoolSize=" + connectionPoolSize +
               ", connectionTimeout=" + connectionTimeout +
               ", useSSL=" + useSSL +
               ", autoReconnect=" + autoReconnect +
               ", properties=" + properties +
               '}';
    }
}
```

#### 2. 泛型建造者

```java
// 泛型建造者基類
public abstract class GenericBuilder<T> {
    protected abstract T build();
    
    protected void validate() {
        // 子類可以重寫此方法進行驗證
    }
}

// HTTP 客戶端配置建造者
public class HttpClientConfig {
    private final String baseUrl;
    private final int connectionTimeout;
    private final int readTimeout;
    private final Map<String, String> headers;
    private final boolean followRedirects;
    private final ProxyConfig proxy;
    private final SSLConfig sslConfig;
    
    private HttpClientConfig(Builder builder) {
        this.baseUrl = builder.baseUrl;
        this.connectionTimeout = builder.connectionTimeout;
        this.readTimeout = builder.readTimeout;
        this.headers = Collections.unmodifiableMap(builder.headers);
        this.followRedirects = builder.followRedirects;
        this.proxy = builder.proxy;
        this.sslConfig = builder.sslConfig;
    }
    
    public static class Builder extends GenericBuilder<HttpClientConfig> {
        private String baseUrl;
        private int connectionTimeout = 5000;
        private int readTimeout = 10000;
        private Map<String, String> headers = new HashMap<>();
        private boolean followRedirects = true;
        private ProxyConfig proxy;
        private SSLConfig sslConfig;
        
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }
        
        public Builder connectionTimeout(int timeout) {
            this.connectionTimeout = timeout;
            return this;
        }
        
        public Builder readTimeout(int timeout) {
            this.readTimeout = timeout;
            return this;
        }
        
        public Builder header(String name, String value) {
            this.headers.put(name, value);
            return this;
        }
        
        public Builder headers(Map<String, String> headers) {
            this.headers.putAll(headers);
            return this;
        }
        
        public Builder followRedirects(boolean follow) {
            this.followRedirects = follow;
            return this;
        }
        
        public Builder proxy(ProxyConfig proxy) {
            this.proxy = proxy;
            return this;
        }
        
        public Builder sslConfig(SSLConfig sslConfig) {
            this.sslConfig = sslConfig;
            return this;
        }
        
        @Override
        protected void validate() {
            if (baseUrl == null || baseUrl.trim().isEmpty()) {
                throw new IllegalStateException("BaseUrl 不能為空");
            }
            if (connectionTimeout < 0) {
                throw new IllegalStateException("連接超時不能為負數");
            }
            if (readTimeout < 0) {
                throw new IllegalStateException("讀取超時不能為負數");
            }
        }
        
        @Override
        protected HttpClientConfig build() {
            validate();
            return new HttpClientConfig(this);
        }
    }
    
    // Getter 方法
    public String getBaseUrl() { return baseUrl; }
    public int getConnectionTimeout() { return connectionTimeout; }
    public int getReadTimeout() { return readTimeout; }
    public Map<String, String> getHeaders() { return headers; }
    public boolean isFollowRedirects() { return followRedirects; }
    public ProxyConfig getProxy() { return proxy; }
    public SSLConfig getSslConfig() { return sslConfig; }
    
    // 輔助類
    public static class ProxyConfig {
        private final String host;
        private final int port;
        private final String username;
        private final String password;
        
        public ProxyConfig(String host, int port, String username, String password) {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
        }
        
        // Getter 方法
        public String getHost() { return host; }
        public int getPort() { return port; }
        public String getUsername() { return username; }
        public String getPassword() { return password; }
    }
    
    public static class SSLConfig {
        private final boolean verifyHostname;
        private final String trustStore;
        private final String trustStorePassword;
        
        public SSLConfig(boolean verifyHostname, String trustStore, String trustStorePassword) {
            this.verifyHostname = verifyHostname;
            this.trustStore = trustStore;
            this.trustStorePassword = trustStorePassword;
        }
        
        // Getter 方法
        public boolean isVerifyHostname() { return verifyHostname; }
        public String getTrustStore() { return trustStore; }
        public String getTrustStorePassword() { return trustStorePassword; }
    }
}
```

### 企業級應用場景

#### 1. 複雜 API 響應構造

```java
// API 響應建造者
public class ApiResponse<T> {
    private final boolean success;
    private final String message;
    private final T data;
    private final List<String> errors;
    private final Map<String, Object> metadata;
    private final long timestamp;
    private final String traceId;
    
    private ApiResponse(Builder<T> builder) {
        this.success = builder.success;
        this.message = builder.message;
        this.data = builder.data;
        this.errors = builder.errors != null ? 
            Collections.unmodifiableList(new ArrayList<>(builder.errors)) : 
            Collections.emptyList();
        this.metadata = builder.metadata != null ? 
            Collections.unmodifiableMap(new HashMap<>(builder.metadata)) : 
            Collections.emptyMap();
        this.timestamp = builder.timestamp;
        this.traceId = builder.traceId;
    }
    
    public static class Builder<T> {
        private boolean success = true;
        private String message;
        private T data;
        private List<String> errors;
        private Map<String, Object> metadata;
        private long timestamp = System.currentTimeMillis();
        private String traceId = generateTraceId();
        
        public Builder<T> success(boolean success) {
            this.success = success;
            return this;
        }
        
        public Builder<T> message(String message) {
            this.message = message;
            return this;
        }
        
        public Builder<T> data(T data) {
            this.data = data;
            return this;
        }
        
        public Builder<T> error(String error) {
            if (this.errors == null) {
                this.errors = new ArrayList<>();
            }
            this.errors.add(error);
            this.success = false;
            return this;
        }
        
        public Builder<T> errors(List<String> errors) {
            this.errors = errors;
            this.success = false;
            return this;
        }
        
        public Builder<T> metadata(String key, Object value) {
            if (this.metadata == null) {
                this.metadata = new HashMap<>();
            }
            this.metadata.put(key, value);
            return this;
        }
        
        public Builder<T> metadata(Map<String, Object> metadata) {
            if (this.metadata == null) {
                this.metadata = new HashMap<>();
            }
            this.metadata.putAll(metadata);
            return this;
        }
        
        public Builder<T> timestamp(long timestamp) {
            this.timestamp = timestamp;
            return this;
        }
        
        public Builder<T> traceId(String traceId) {
            this.traceId = traceId;
            return this;
        }
        
        public ApiResponse<T> build() {
            return new ApiResponse<>(this);
        }
        
        private String generateTraceId() {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
    
    // 靜態工廠方法
    public static <T> Builder<T> success() {
        return new Builder<T>().success(true);
    }
    
    public static <T> Builder<T> success(T data) {
        return new Builder<T>().success(true).data(data);
    }
    
    public static <T> Builder<T> failure(String message) {
        return new Builder<T>().success(false).message(message);
    }
    
    public static <T> Builder<T> failure(List<String> errors) {
        return new Builder<T>().errors(errors);
    }
    
    // Getter 方法
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public T getData() { return data; }
    public List<String> getErrors() { return errors; }
    public Map<String, Object> getMetadata() { return metadata; }
    public long getTimestamp() { return timestamp; }
    public String getTraceId() { return traceId; }
}

// 使用示例
@RestController
public class UserController {
    
    @GetMapping("/users/{id}")
    public ApiResponse<User> getUser(@PathVariable Long id) {
        try {
            User user = userService.findById(id);
            return ApiResponse.success(user)
                .message("用戶查詢成功")
                .metadata("query_time", System.currentTimeMillis())
                .build();
        } catch (UserNotFoundException e) {
            return ApiResponse.<User>failure("用戶不存在")
                .metadata("user_id", id)
                .build();
        }
    }
    
    @PostMapping("/users")
    public ApiResponse<User> createUser(@RequestBody @Valid CreateUserRequest request) {
        try {
            User user = userService.create(request);
            return ApiResponse.success(user)
                .message("用戶創建成功")
                .metadata("created_at", user.getCreatedAt())
                .build();
        } catch (ValidationException e) {
            return ApiResponse.<User>failure(e.getErrors())
                .metadata("validation_failed", true)
                .build();
        }
    }
}
```

#### 2. 查詢條件建造者

```java
// 複雜查詢條件建造者
public class SearchCriteria {
    private final String keyword;
    private final List<String> categories;
    private final DateRange dateRange;
    private final PriceRange priceRange;
    private final SortOptions sortOptions;
    private final PaginationOptions paginationOptions;
    private final List<Filter> filters;
    private final boolean includeDeleted;
    private final boolean fuzzySearch;
    
    private SearchCriteria(Builder builder) {
        this.keyword = builder.keyword;
        this.categories = builder.categories != null ? 
            Collections.unmodifiableList(new ArrayList<>(builder.categories)) : 
            Collections.emptyList();
        this.dateRange = builder.dateRange;
        this.priceRange = builder.priceRange;
        this.sortOptions = builder.sortOptions;
        this.paginationOptions = builder.paginationOptions;
        this.filters = builder.filters != null ? 
            Collections.unmodifiableList(new ArrayList<>(builder.filters)) : 
            Collections.emptyList();
        this.includeDeleted = builder.includeDeleted;
        this.fuzzySearch = builder.fuzzySearch;
    }
    
    public static class Builder {
        private String keyword;
        private List<String> categories;
        private DateRange dateRange;
        private PriceRange priceRange;
        private SortOptions sortOptions;
        private PaginationOptions paginationOptions;
        private List<Filter> filters;
        private boolean includeDeleted = false;
        private boolean fuzzySearch = true;
        
        public Builder keyword(String keyword) {
            this.keyword = keyword;
            return this;
        }
        
        public Builder category(String category) {
            if (this.categories == null) {
                this.categories = new ArrayList<>();
            }
            this.categories.add(category);
            return this;
        }
        
        public Builder categories(List<String> categories) {
            this.categories = categories;
            return this;
        }
        
        public Builder dateRange(LocalDate startDate, LocalDate endDate) {
            this.dateRange = new DateRange(startDate, endDate);
            return this;
        }
        
        public Builder priceRange(BigDecimal minPrice, BigDecimal maxPrice) {
            this.priceRange = new PriceRange(minPrice, maxPrice);
            return this;
        }
        
        public Builder sortBy(String field, SortDirection direction) {
            this.sortOptions = new SortOptions(field, direction);
            return this;
        }
        
        public Builder page(int page, int size) {
            this.paginationOptions = new PaginationOptions(page, size);
            return this;
        }
        
        public Builder filter(String field, FilterOperator operator, Object value) {
            if (this.filters == null) {
                this.filters = new ArrayList<>();
            }
            this.filters.add(new Filter(field, operator, value));
            return this;
        }
        
        public Builder includeDeleted(boolean includeDeleted) {
            this.includeDeleted = includeDeleted;
            return this;
        }
        
        public Builder fuzzySearch(boolean fuzzySearch) {
            this.fuzzySearch = fuzzySearch;
            return this;
        }
        
        public SearchCriteria build() {
            validateCriteria();
            return new SearchCriteria(this);
        }
        
        private void validateCriteria() {
            if (keyword != null && keyword.trim().isEmpty()) {
                throw new IllegalArgumentException("關鍵字不能為空字符串");
            }
            if (dateRange != null && !dateRange.isValid()) {
                throw new IllegalArgumentException("日期範圍無效");
            }
            if (priceRange != null && !priceRange.isValid()) {
                throw new IllegalArgumentException("價格範圍無效");
            }
            if (paginationOptions != null && !paginationOptions.isValid()) {
                throw new IllegalArgumentException("分頁參數無效");
            }
        }
    }
    
    // Getter 方法
    public String getKeyword() { return keyword; }
    public List<String> getCategories() { return categories; }
    public DateRange getDateRange() { return dateRange; }
    public PriceRange getPriceRange() { return priceRange; }
    public SortOptions getSortOptions() { return sortOptions; }
    public PaginationOptions getPaginationOptions() { return paginationOptions; }
    public List<Filter> getFilters() { return filters; }
    public boolean isIncludeDeleted() { return includeDeleted; }
    public boolean isFuzzySearch() { return fuzzySearch; }
    
    // 輔助類
    public static class DateRange {
        private final LocalDate startDate;
        private final LocalDate endDate;
        
        public DateRange(LocalDate startDate, LocalDate endDate) {
            this.startDate = startDate;
            this.endDate = endDate;
        }
        
        public boolean isValid() {
            return startDate != null && endDate != null && 
                   !startDate.isAfter(endDate);
        }
        
        public LocalDate getStartDate() { return startDate; }
        public LocalDate getEndDate() { return endDate; }
    }
    
    public static class PriceRange {
        private final BigDecimal minPrice;
        private final BigDecimal maxPrice;
        
        public PriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
        }
        
        public boolean isValid() {
            return minPrice != null && maxPrice != null && 
                   minPrice.compareTo(maxPrice) <= 0 &&
                   minPrice.compareTo(BigDecimal.ZERO) >= 0;
        }
        
        public BigDecimal getMinPrice() { return minPrice; }
        public BigDecimal getMaxPrice() { return maxPrice; }
    }
    
    public static class SortOptions {
        private final String field;
        private final SortDirection direction;
        
        public SortOptions(String field, SortDirection direction) {
            this.field = field;
            this.direction = direction;
        }
        
        public String getField() { return field; }
        public SortDirection getDirection() { return direction; }
    }
    
    public static class PaginationOptions {
        private final int page;
        private final int size;
        
        public PaginationOptions(int page, int size) {
            this.page = page;
            this.size = size;
        }
        
        public boolean isValid() {
            return page >= 0 && size > 0 && size <= 1000;
        }
        
        public int getPage() { return page; }
        public int getSize() { return size; }
    }
    
    public static class Filter {
        private final String field;
        private final FilterOperator operator;
        private final Object value;
        
        public Filter(String field, FilterOperator operator, Object value) {
            this.field = field;
            this.operator = operator;
            this.value = value;
        }
        
        public String getField() { return field; }
        public FilterOperator getOperator() { return operator; }
        public Object getValue() { return value; }
    }
    
    public enum SortDirection {
        ASC, DESC
    }
    
    public enum FilterOperator {
        EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, 
        GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, 
        CONTAINS, NOT_CONTAINS, IN, NOT_IN
    }
}

// 使用示例
@Service
public class ProductSearchService {
    
    public Page<Product> searchProducts(SearchCriteria criteria) {
        return productRepository.search(criteria);
    }
    
    public void demonstrateUsage() {
        // 複雜查詢構造
        SearchCriteria criteria = new SearchCriteria.Builder()
            .keyword("智能手機")
            .category("電子產品")
            .category("手機")
            .priceRange(new BigDecimal("1000"), new BigDecimal("5000"))
            .dateRange(LocalDate.now().minusMonths(3), LocalDate.now())
            .sortBy("price", SearchCriteria.SortDirection.ASC)
            .page(0, 20)
            .filter("brand", SearchCriteria.FilterOperator.IN, 
                   Arrays.asList("Apple", "Samsung", "Huawei"))
            .filter("rating", SearchCriteria.FilterOperator.GREATER_THAN_OR_EQUAL, 4.0)
            .fuzzySearch(true)
            .build();
        
        Page<Product> results = searchProducts(criteria);
        System.out.println("找到 " + results.getTotalElements() + " 個產品");
    }
}
```

#### 3. 配置文件建造者

```java
// 應用配置建造者
public class ApplicationConfig {
    private final String applicationName;
    private final String version;
    private final ServerConfig serverConfig;
    private final DatabaseConfig databaseConfig;
    private final CacheConfig cacheConfig;
    private final SecurityConfig securityConfig;
    private final LoggingConfig loggingConfig;
    private final Map<String, String> customProperties;
    
    private ApplicationConfig(Builder builder) {
        this.applicationName = builder.applicationName;
        this.version = builder.version;
        this.serverConfig = builder.serverConfig;
        this.databaseConfig = builder.databaseConfig;
        this.cacheConfig = builder.cacheConfig;
        this.securityConfig = builder.securityConfig;
        this.loggingConfig = builder.loggingConfig;
        this.customProperties = builder.customProperties != null ? 
            Collections.unmodifiableMap(new HashMap<>(builder.customProperties)) : 
            Collections.emptyMap();
    }
    
    public static class Builder {
        private String applicationName;
        private String version;
        private ServerConfig serverConfig;
        private DatabaseConfig databaseConfig;
        private CacheConfig cacheConfig;
        private SecurityConfig securityConfig;
        private LoggingConfig loggingConfig;
        private Map<String, String> customProperties;
        
        public Builder applicationName(String name) {
            this.applicationName = name;
            return this;
        }
        
        public Builder version(String version) {
            this.version = version;
            return this;
        }
        
        public Builder server(Consumer<ServerConfig.Builder> configurer) {
            ServerConfig.Builder builder = new ServerConfig.Builder();
            configurer.accept(builder);
            this.serverConfig = builder.build();
            return this;
        }
        
        public Builder database(Consumer<DatabaseConfig.Builder> configurer) {
            DatabaseConfig.Builder builder = new DatabaseConfig.Builder();
            configurer.accept(builder);
            this.databaseConfig = builder.build();
            return this;
        }
        
        public Builder cache(Consumer<CacheConfig.Builder> configurer) {
            CacheConfig.Builder builder = new CacheConfig.Builder();
            configurer.accept(builder);
            this.cacheConfig = builder.build();
            return this;
        }
        
        public Builder security(Consumer<SecurityConfig.Builder> configurer) {
            SecurityConfig.Builder builder = new SecurityConfig.Builder();
            configurer.accept(builder);
            this.securityConfig = builder.build();
            return this;
        }
        
        public Builder logging(Consumer<LoggingConfig.Builder> configurer) {
            LoggingConfig.Builder builder = new LoggingConfig.Builder();
            configurer.accept(builder);
            this.loggingConfig = builder.build();
            return this;
        }
        
        public Builder property(String key, String value) {
            if (this.customProperties == null) {
                this.customProperties = new HashMap<>();
            }
            this.customProperties.put(key, value);
            return this;
        }
        
        public ApplicationConfig build() {
            validateConfiguration();
            return new ApplicationConfig(this);
        }
        
        private void validateConfiguration() {
            if (applicationName == null || applicationName.trim().isEmpty()) {
                throw new IllegalStateException("應用名稱不能為空");
            }
            if (version == null || version.trim().isEmpty()) {
                throw new IllegalStateException("版本號不能為空");
            }
        }
    }
    
    // Getter 方法
    public String getApplicationName() { return applicationName; }
    public String getVersion() { return version; }
    public ServerConfig getServerConfig() { return serverConfig; }
    public DatabaseConfig getDatabaseConfig() { return databaseConfig; }
    public CacheConfig getCacheConfig() { return cacheConfig; }
    public SecurityConfig getSecurityConfig() { return securityConfig; }
    public LoggingConfig getLoggingConfig() { return loggingConfig; }
    public Map<String, String> getCustomProperties() { return customProperties; }
    
    // 嵌套配置類
    public static class ServerConfig {
        private final int port;
        private final String contextPath;
        private final boolean enableCompression;
        private final int maxConnections;
        
        private ServerConfig(Builder builder) {
            this.port = builder.port;
            this.contextPath = builder.contextPath;
            this.enableCompression = builder.enableCompression;
            this.maxConnections = builder.maxConnections;
        }
        
        public static class Builder {
            private int port = 8080;
            private String contextPath = "/";
            private boolean enableCompression = true;
            private int maxConnections = 200;
            
            public Builder port(int port) {
                this.port = port;
                return this;
            }
            
            public Builder contextPath(String contextPath) {
                this.contextPath = contextPath;
                return this;
            }
            
            public Builder enableCompression(boolean enable) {
                this.enableCompression = enable;
                return this;
            }
            
            public Builder maxConnections(int maxConnections) {
                this.maxConnections = maxConnections;
                return this;
            }
            
            public ServerConfig build() {
                return new ServerConfig(this);
            }
        }
        
        // Getter 方法
        public int getPort() { return port; }
        public String getContextPath() { return contextPath; }
        public boolean isEnableCompression() { return enableCompression; }
        public int getMaxConnections() { return maxConnections; }
    }
    
    public static class DatabaseConfig {
        private final String url;
        private final String username;
        private final String password;
        private final int maxPoolSize;
        private final int minPoolSize;
        
        private DatabaseConfig(Builder builder) {
            this.url = builder.url;
            this.username = builder.username;
            this.password = builder.password;
            this.maxPoolSize = builder.maxPoolSize;
            this.minPoolSize = builder.minPoolSize;
        }
        
        public static class Builder {
            private String url;
            private String username;
            private String password;
            private int maxPoolSize = 10;
            private int minPoolSize = 5;
            
            public Builder url(String url) {
                this.url = url;
                return this;
            }
            
            public Builder username(String username) {
                this.username = username;
                return this;
            }
            
            public Builder password(String password) {
                this.password = password;
                return this;
            }
            
            public Builder maxPoolSize(int maxPoolSize) {
                this.maxPoolSize = maxPoolSize;
                return this;
            }
            
            public Builder minPoolSize(int minPoolSize) {
                this.minPoolSize = minPoolSize;
                return this;
            }
            
            public DatabaseConfig build() {
                return new DatabaseConfig(this);
            }
        }
        
        // Getter 方法
        public String getUrl() { return url; }
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public int getMaxPoolSize() { return maxPoolSize; }
        public int getMinPoolSize() { return minPoolSize; }
    }
    
    public static class CacheConfig {
        private final String type;
        private final int maxSize;
        private final int ttlMinutes;
        
        private CacheConfig(Builder builder) {
            this.type = builder.type;
            this.maxSize = builder.maxSize;
            this.ttlMinutes = builder.ttlMinutes;
        }
        
        public static class Builder {
            private String type = "redis";
            private int maxSize = 1000;
            private int ttlMinutes = 60;
            
            public Builder type(String type) {
                this.type = type;
                return this;
            }
            
            public Builder maxSize(int maxSize) {
                this.maxSize = maxSize;
                return this;
            }
            
            public Builder ttlMinutes(int ttlMinutes) {
                this.ttlMinutes = ttlMinutes;
                return this;
            }
            
            public CacheConfig build() {
                return new CacheConfig(this);
            }
        }
        
        // Getter 方法
        public String getType() { return type; }
        public int getMaxSize() { return maxSize; }
        public int getTtlMinutes() { return ttlMinutes; }
    }
    
    public static class SecurityConfig {
        private final boolean enableSecurity;
        private final String jwtSecret;
        private final int jwtExpirationHours;
        
        private SecurityConfig(Builder builder) {
            this.enableSecurity = builder.enableSecurity;
            this.jwtSecret = builder.jwtSecret;
            this.jwtExpirationHours = builder.jwtExpirationHours;
        }
        
        public static class Builder {
            private boolean enableSecurity = true;
            private String jwtSecret;
            private int jwtExpirationHours = 24;
            
            public Builder enableSecurity(boolean enable) {
                this.enableSecurity = enable;
                return this;
            }
            
            public Builder jwtSecret(String secret) {
                this.jwtSecret = secret;
                return this;
            }
            
            public Builder jwtExpirationHours(int hours) {
                this.jwtExpirationHours = hours;
                return this;
            }
            
            public SecurityConfig build() {
                return new SecurityConfig(this);
            }
        }
        
        // Getter 方法
        public boolean isEnableSecurity() { return enableSecurity; }
        public String getJwtSecret() { return jwtSecret; }
        public int getJwtExpirationHours() { return jwtExpirationHours; }
    }
    
    public static class LoggingConfig {
        private final String level;
        private final String pattern;
        private final boolean enableFileOutput;
        
        private LoggingConfig(Builder builder) {
            this.level = builder.level;
            this.pattern = builder.pattern;
            this.enableFileOutput = builder.enableFileOutput;
        }
        
        public static class Builder {
            private String level = "INFO";
            private String pattern = "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n";
            private boolean enableFileOutput = false;
            
            public Builder level(String level) {
                this.level = level;
                return this;
            }
            
            public Builder pattern(String pattern) {
                this.pattern = pattern;
                return this;
            }
            
            public Builder enableFileOutput(boolean enable) {
                this.enableFileOutput = enable;
                return this;
            }
            
            public LoggingConfig build() {
                return new LoggingConfig(this);
            }
        }
        
        // Getter 方法
        public String getLevel() { return level; }
        public String getPattern() { return pattern; }
        public boolean isEnableFileOutput() { return enableFileOutput; }
    }
}

// 使用示例
public class ApplicationConfigExample {
    public static void main(String[] args) {
        ApplicationConfig config = new ApplicationConfig.Builder()
            .applicationName("電商系統")
            .version("1.0.0")
            .server(server -> server
                .port(8080)
                .contextPath("/api")
                .enableCompression(true)
                .maxConnections(500))
            .database(db -> db
                .url("jdbc:mysql://localhost:3306/ecommerce")
                .username("root")
                .password("password")
                .maxPoolSize(20)
                .minPoolSize(5))
            .cache(cache -> cache
                .type("redis")
                .maxSize(10000)
                .ttlMinutes(30))
            .security(security -> security
                .enableSecurity(true)
                .jwtSecret("mySecretKey")
                .jwtExpirationHours(24))
            .logging(logging -> logging
                .level("INFO")
                .enableFileOutput(true))
            .property("custom.feature.enabled", "true")
            .property("custom.timeout", "5000")
            .build();
        
        System.out.println("配置創建成功：" + config.getApplicationName());
    }
}
```

### Spring Boot 整合

#### 1. 配置類建造者

```java
@Configuration
public class BuilderPatternConfig {
    
    @Bean
    @ConfigurationProperties(prefix = "app.database")
    public DatabaseConfiguration databaseConfiguration() {
        return new DatabaseConfiguration.Builder(
            "localhost",
            3306,
            "myapp",
            "user",
            "password"
        ).build();
    }
    
    @Bean
    @ConditionalOnProperty(name = "app.http.client.enabled", havingValue = "true")
    public HttpClientConfig httpClientConfig(
            @Value("${app.http.client.base-url}") String baseUrl,
            @Value("${app.http.client.timeout:5000}") int timeout) {
        
        return new HttpClientConfig.Builder()
            .baseUrl(baseUrl)
            .connectionTimeout(timeout)
            .readTimeout(timeout * 2)
            .header("User-Agent", "MyApp/1.0")
            .header("Accept", "application/json")
            .followRedirects(true)
            .build();
    }
}

@RestController
public class SearchController {
    
    @PostMapping("/search")
    public ApiResponse<Page<Product>> search(@RequestBody SearchRequest request) {
        try {
            SearchCriteria criteria = new SearchCriteria.Builder()
                .keyword(request.getKeyword())
                .categories(request.getCategories())
                .priceRange(request.getMinPrice(), request.getMaxPrice())
                .sortBy(request.getSortField(), request.getSortDirection())
                .page(request.getPage(), request.getSize())
                .fuzzySearch(request.isFuzzySearch())
                .build();
            
            Page<Product> results = productService.search(criteria);
            
            return ApiResponse.<Page<Product>>success(results)
                .message("搜索成功")
                .metadata("total", results.getTotalElements())
                .metadata("pages", results.getTotalPages())
                .build();
                
        } catch (Exception e) {
            return ApiResponse.<Page<Product>>failure("搜索失敗")
                .error(e.getMessage())
                .build();
        }
    }
}
```

#### 2. 測試建造者

```java
@ExtendWith(MockitoExtension.class)
class BuilderPatternTest {
    
    @Test
    void testComputerBuilder_GamingConfiguration() {
        // Given
        Computer.Director director = new Computer.Director();
        
        // When
        Computer gamingPC = director.buildGamingComputer();
        
        // Then
        assertThat(gamingPC.getCpu()).isEqualTo("Intel i9-13900K");
        assertThat(gamingPC.getMemory()).isEqualTo("32GB DDR5");
        assertThat(gamingPC.getGraphics()).isEqualTo("RTX 4080");
        assertThat(gamingPC.isOverclocked()).isTrue();
        assertThat(gamingPC.getCoolingSystem()).isNotNull();
    }
    
    @Test
    void testDatabaseConfigurationBuilder_ValidConfiguration() {
        // When
        DatabaseConfiguration config = new DatabaseConfiguration.Builder(
            "localhost", 3306, "testdb", "user", "pass"
        )
        .connectionPoolSize(20)
        .connectionTimeout(5000)
        .useSSL(true)
        .property("charset", "utf8mb4")
        .build();
        
        // Then
        assertThat(config.getHost()).isEqualTo("localhost");
        assertThat(config.getPort()).isEqualTo(3306);
        assertThat(config.getConnectionPoolSize()).isEqualTo(20);
        assertThat(config.isUseSSL()).isTrue();
        assertThat(config.getProperties()).containsEntry("charset", "utf8mb4");
    }
    
    @Test
    void testApiResponseBuilder_SuccessResponse() {
        // Given
        User user = new User("testUser", "test@example.com");
        
        // When
        ApiResponse<User> response = ApiResponse.success(user)
            .message("用戶獲取成功")
            .metadata("cached", true)
            .build();
        
        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo(user);
        assertThat(response.getMessage()).isEqualTo("用戶獲取成功");
        assertThat(response.getMetadata()).containsEntry("cached", true);
        assertThat(response.getTraceId()).isNotNull();
        assertThat(response.getErrors()).isEmpty();
    }
    
    @Test
    void testApiResponseBuilder_FailureResponse() {
        // Given
        List<String> errors = Arrays.asList("用戶不存在", "請求參數無效");
        
        // When
        ApiResponse<User> response = ApiResponse.<User>failure(errors)
            .metadata("error_code", "USER_NOT_FOUND")
            .build();
        
        // Then
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).isNull();
        assertThat(response.getErrors()).hasSize(2);
        assertThat(response.getErrors()).contains("用戶不存在", "請求參數無效");
        assertThat(response.getMetadata()).containsEntry("error_code", "USER_NOT_FOUND");
    }
    
    @Test
    void testSearchCriteriaBuilder_ComplexQuery() {
        // Given
        LocalDate startDate = LocalDate.now().minusMonths(1);
        LocalDate endDate = LocalDate.now();
        
        // When
        SearchCriteria criteria = new SearchCriteria.Builder()
            .keyword("智能手機")
            .category("電子產品")
            .dateRange(startDate, endDate)
            .priceRange(new BigDecimal("1000"), new BigDecimal("5000"))
            .sortBy("price", SearchCriteria.SortDirection.ASC)
            .page(0, 20)
            .filter("brand", SearchCriteria.FilterOperator.IN, 
                   Arrays.asList("Apple", "Samsung"))
            .fuzzySearch(true)
            .build();
        
        // Then
        assertThat(criteria.getKeyword()).isEqualTo("智能手機");
        assertThat(criteria.getCategories()).contains("電子產品");
        assertThat(criteria.getDateRange().getStartDate()).isEqualTo(startDate);
        assertThat(criteria.getDateRange().getEndDate()).isEqualTo(endDate);
        assertThat(criteria.getPriceRange().getMinPrice()).isEqualTo(new BigDecimal("1000"));
        assertThat(criteria.isFuzzySearch()).isTrue();
        assertThat(criteria.getFilters()).hasSize(1);
    }
    
    @Test
    void testBuilderValidation_ThrowsException() {
        // When & Then
        assertThatThrownBy(() -> 
            new DatabaseConfiguration.Builder(null, 3306, "db", "user", "pass").build()
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessage("Host 不能為空");
        
        assertThatThrownBy(() -> 
            new Computer.Builder()
                .setMemory("16GB")
                .setStorage("1TB SSD")
                .setOverclocked(true)
                .build()
        ).isInstanceOf(IllegalStateException.class)
         .hasMessage("超頻配置需要冷卻系統");
    }
}

@SpringBootTest
class BuilderPatternIntegrationTest {
    
    @Autowired
    private DatabaseConfiguration databaseConfig;
    
    @Autowired
    private HttpClientConfig httpClientConfig;
    
    @Test
    void testConfigurationBeans_LoadedCorrectly() {
        assertThat(databaseConfig).isNotNull();
        assertThat(databaseConfig.getHost()).isNotNull();
        assertThat(databaseConfig.getPort()).isPositive();
        
        assertThat(httpClientConfig).isNotNull();
        assertThat(httpClientConfig.getBaseUrl()).isNotNull();
        assertThat(httpClientConfig.getConnectionTimeout()).isPositive();
    }
}
```

### 性能優化與最佳實踐

#### 1. 建造者對象池

```java
// 建造者對象池
public class BuilderPool<T extends GenericBuilder<?>> {
    private final Queue<T> pool = new ConcurrentLinkedQueue<>();
    private final Supplier<T> builderFactory;
    private final int maxPoolSize;
    
    public BuilderPool(Supplier<T> builderFactory, int maxPoolSize) {
        this.builderFactory = builderFactory;
        this.maxPoolSize = maxPoolSize;
    }
    
    public T acquire() {
        T builder = pool.poll();
        if (builder == null) {
            builder = builderFactory.get();
        }
        return builder;
    }
    
    public void release(T builder) {
        if (pool.size() < maxPoolSize) {
            // 重置建造者狀態
            if (builder instanceof Resettable) {
                ((Resettable) builder).reset();
            }
            pool.offer(builder);
        }
    }
}

// 可重置接口
public interface Resettable {
    void reset();
}

// 實現可重置的建造者
public class PooledApiResponseBuilder<T> extends ApiResponse.Builder<T> implements Resettable {
    
    @Override
    public void reset() {
        this.success(true)
            .message(null)
            .data(null)
            .timestamp(System.currentTimeMillis())
            .traceId(generateTraceId());
        
        if (this.errors != null) {
            this.errors.clear();
        }
        if (this.metadata != null) {
            this.metadata.clear();
        }
    }
}
```

#### 2. 建造者快取

```java
// 建造者結果快取
@Component
public class CachedBuilderService {
    private final Cache<String, Object> builderCache;
    
    public CachedBuilderService() {
        this.builderCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30))
            .build();
    }
    
    public <T> T getOrBuild(String key, Supplier<T> builderSupplier) {
        return (T) builderCache.get(key, k -> builderSupplier.get());
    }
    
    public void invalidate(String key) {
        builderCache.invalidate(key);
    }
    
    public void invalidateAll() {
        builderCache.invalidateAll();
    }
}
```

### 監控與診斷

```java
// 建造者監控
@Component
public class BuilderMonitor {
    private final MeterRegistry meterRegistry;
    private final Counter builderUsageCounter;
    private final Timer builderBuildTimer;
    
    public BuilderMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.builderUsageCounter = Counter.builder("builder.usage")
            .description("Number of builder usages")
            .register(meterRegistry);
        this.builderBuildTimer = Timer.builder("builder.build.time")
            .description("Time spent building objects")
            .register(meterRegistry);
    }
    
    public <T> T monitorBuild(String builderType, Supplier<T> buildSupplier) {
        builderUsageCounter.increment(Tags.of("type", builderType));
        
        return Timer.Sample.start(meterRegistry)
            .stop(builderBuildTimer.withTag("type", builderType))
            .recordCallable(() -> buildSupplier.get());
    }
}
```

### 總結

建造者模式是一種強大的創建型設計模式，特別適用於：

1. **複雜對象構造**：當對象有多個可選參數時
2. **步驟化構造**：需要按特定順序構造對象時
3. **不變性保證**：確保構造完成的對象不可變
4. **可讀性提升**：提供清晰的對象構造方式

#### 關鍵最佳實踐

1. **參數驗證**：在 build() 方法中進行完整的參數驗證
2. **不變性**：確保構造的對象是不可變的
3. **流式介面**：提供鏈式調用的流式介面
4. **預設值**：為可選參數提供合理的預設值
5. **異常處理**：提供清晰的錯誤消息和異常處理
6. **性能優化**：適當使用對象池和快取機制

建造者模式讓複雜對象的構造變得簡單、直觀且安全，是企業級應用中不可或缺的設計模式。正確使用建造者模式可以大幅提升代碼的可讀性和維護性。