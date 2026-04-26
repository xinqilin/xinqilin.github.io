---
title: "迭代器模式 (Iterator Pattern) 現代化完整指南：Java 8+ Stream API、Spring Data 分頁與企業級迭代器實作最佳實踐"
author: Bill.Lin
date: 2018-08-07T22:38:21+08:00
draft: false
tags: ["Design Pattern", "Iterator Pattern", "Behavioral Pattern", "Java Iterator", "Stream API", "Spring Data", "Pagination", "Custom Iterator", "Java 8+", "Spring Boot", "Enterprise Architecture", "Collection Traversal", "Lazy Loading", "Performance Optimization", "Functional Programming", "Lambda Expressions", "Best Practices"]
Description: "深入探討迭代器模式的現代化實作指南，包含 Java 8+ Stream API 整合、Spring Data 分頁機制與企業級自定義迭代器實作最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 迭代器模式 (Iterator Pattern) 現代化完整指南

### 模式概述

迭代器模式是一種行為設計模式，它提供一種統一的方式來遍歷聚合對象中的元素，而不需要暴露聚合對象的內部結構。在現代 Java 開發中，迭代器模式不僅包含傳統的 Iterator 接口實現，更擴展到 Stream API、Spring Data 分頁和企業級數據處理場景。

### 核心概念

#### 1. 迭代器模式解決的問題

- **統一遍歷接口**：為不同類型的聚合對象提供一致的遍歷方式
- **封裝內部結構**：隱藏集合內部實現細節
- **支持多種遍歷**：同時支持多個迭代器並行遍歷
- **延遲加載**：支持大數據集的分批處理和延遲加載
- **函數式編程**：整合現代 Java 函數式編程特性

#### 2. 現代迭代器架構

```java
/**
 * 現代化迭代器接口設計
 */
public interface ModernIterator<T> extends Iterator<T> {
    
    /**
     * 傳統的下一個元素檢查
     */
    @Override
    boolean hasNext();
    
    /**
     * 獲取下一個元素
     */
    @Override
    T next();
    
    /**
     * 可選的移除操作
     */
    @Override
    default void remove() {
        throw new UnsupportedOperationException("Remove not supported");
    }
    
    /**
     * 批量獲取元素
     */
    default List<T> nextBatch(int size) {
        List<T> batch = new ArrayList<>(size);
        for (int i = 0; i < size && hasNext(); i++) {
            batch.add(next());
        }
        return batch;
    }
    
    /**
     * 轉換為 Stream
     */
    default Stream<T> asStream() {
        return StreamSupport.stream(
            Spliterators.spliteratorUnknownSize(this, Spliterator.ORDERED),
            false
        );
    }
    
    /**
     * 帶過濾的迭代
     */
    default ModernIterator<T> filter(Predicate<T> predicate) {
        return new FilteringIterator<>(this, predicate);
    }
    
    /**
     * 元素轉換
     */
    default <R> ModernIterator<R> map(Function<T, R> mapper) {
        return new MappingIterator<>(this, mapper);
    }
}

/**
 * 過濾迭代器實現
 */
class FilteringIterator<T> implements ModernIterator<T> {
    private final ModernIterator<T> source;
    private final Predicate<T> predicate;
    private T nextElement;
    private boolean hasNextElement;
    
    public FilteringIterator(ModernIterator<T> source, Predicate<T> predicate) {
        this.source = source;
        this.predicate = predicate;
        advance();
    }
    
    private void advance() {
        hasNextElement = false;
        while (source.hasNext()) {
            T element = source.next();
            if (predicate.test(element)) {
                nextElement = element;
                hasNextElement = true;
                break;
            }
        }
    }
    
    @Override
    public boolean hasNext() {
        return hasNextElement;
    }
    
    @Override
    public T next() {
        if (!hasNextElement) {
            throw new NoSuchElementException();
        }
        T result = nextElement;
        advance();
        return result;
    }
}

/**
 * 映射迭代器實現
 */
class MappingIterator<T, R> implements ModernIterator<R> {
    private final ModernIterator<T> source;
    private final Function<T, R> mapper;
    
    public MappingIterator(ModernIterator<T> source, Function<T, R> mapper) {
        this.source = source;
        this.mapper = mapper;
    }
    
    @Override
    public boolean hasNext() {
        return source.hasNext();
    }
    
    @Override
    public R next() {
        return mapper.apply(source.next());
    }
}
```

## 基礎實作範例

### 1. 企業級客戶資料迭代器

```java
/**
 * 客戶資料模型
 */
public class Customer {
    private String customerId;
    private String name;
    private String email;
    private CustomerType type;
    private BigDecimal totalOrderAmount;
    private LocalDateTime createdAt;
    private boolean active;
    
    public Customer(String customerId, String name, String email, CustomerType type) {
        this.customerId = customerId;
        this.name = name;
        this.email = email;
        this.type = type;
        this.totalOrderAmount = BigDecimal.ZERO;
        this.createdAt = LocalDateTime.now();
        this.active = true;
    }
    
    // Getters and setters
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public CustomerType getType() { return type; }
    public void setType(CustomerType type) { this.type = type; }
    public BigDecimal getTotalOrderAmount() { return totalOrderAmount; }
    public void setTotalOrderAmount(BigDecimal totalOrderAmount) { this.totalOrderAmount = totalOrderAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    
    @Override
    public String toString() {
        return String.format("Customer{id='%s', name='%s', type=%s, amount=%s}", 
                           customerId, name, type, totalOrderAmount);
    }
}

/**
 * 客戶類型枚舉
 */
public enum CustomerType {
    REGULAR("一般客戶"),
    VIP("VIP客戶"), 
    ENTERPRISE("企業客戶"),
    PREMIUM("高級客戶");
    
    private final String description;
    
    CustomerType(String description) {
        this.description = description;
    }
    
    public String getDescription() { return description; }
}

/**
 * 分頁客戶迭代器
 */
public class PagedCustomerIterator implements ModernIterator<Customer> {
    private final CustomerRepository customerRepository;
    private final Pageable pageable;
    private final CustomerCriteria criteria;
    
    private Page<Customer> currentPage;
    private Iterator<Customer> currentPageIterator;
    private int currentPageNumber = 0;
    
    public PagedCustomerIterator(CustomerRepository customerRepository, 
                               CustomerCriteria criteria, 
                               int pageSize) {
        this.customerRepository = customerRepository;
        this.criteria = criteria;
        this.pageable = PageRequest.of(0, pageSize, Sort.by("createdAt").descending());
        loadNextPage();
    }
    
    private void loadNextPage() {
        Pageable pageRequest = PageRequest.of(currentPageNumber, pageable.getPageSize(), pageable.getSort());
        currentPage = customerRepository.findByCriteria(criteria, pageRequest);
        currentPageIterator = currentPage.getContent().iterator();
    }
    
    @Override
    public boolean hasNext() {
        if (currentPageIterator.hasNext()) {
            return true;
        }
        
        // 檢查是否有下一頁
        if (currentPage.hasNext()) {
            currentPageNumber++;
            loadNextPage();
            return currentPageIterator.hasNext();
        }
        
        return false;
    }
    
    @Override
    public Customer next() {
        if (!hasNext()) {
            throw new NoSuchElementException("No more customers");
        }
        return currentPageIterator.next();
    }
    
    /**
     * 獲取總數量
     */
    public long getTotalElements() {
        return currentPage.getTotalElements();
    }
    
    /**
     * 獲取總頁數
     */
    public int getTotalPages() {
        return currentPage.getTotalPages();
    }
}

/**
 * 客戶查詢條件
 */
public class CustomerCriteria {
    private CustomerType type;
    private BigDecimal minOrderAmount;
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private Boolean active;
    private String namePattern;
    
    public CustomerCriteria() {}
    
    // Builder pattern
    public static CustomerCriteria builder() {
        return new CustomerCriteria();
    }
    
    public CustomerCriteria withType(CustomerType type) {
        this.type = type;
        return this;
    }
    
    public CustomerCriteria withMinOrderAmount(BigDecimal amount) {
        this.minOrderAmount = amount;
        return this;
    }
    
    public CustomerCriteria withCreatedAfter(LocalDateTime date) {
        this.createdAfter = date;
        return this;
    }
    
    public CustomerCriteria withCreatedBefore(LocalDateTime date) {
        this.createdBefore = date;
        return this;
    }
    
    public CustomerCriteria withActiveStatus(Boolean active) {
        this.active = active;
        return this;
    }
    
    public CustomerCriteria withNamePattern(String pattern) {
        this.namePattern = pattern;
        return this;
    }
    
    // Getters
    public CustomerType getType() { return type; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public LocalDateTime getCreatedAfter() { return createdAfter; }
    public LocalDateTime getCreatedBefore() { return createdBefore; }
    public Boolean getActive() { return active; }
    public String getNamePattern() { return namePattern; }
}
```

### 2. 複合集合迭代器

```java
/**
 * 複合集合迭代器 - 將多個集合統一迭代
 */
public class CompositeIterator<T> implements ModernIterator<T> {
    private final List<ModernIterator<T>> iterators;
    private int currentIteratorIndex = 0;
    
    @SafeVarargs
    public CompositeIterator(ModernIterator<T>... iterators) {
        this.iterators = Arrays.asList(iterators);
    }
    
    public CompositeIterator(List<ModernIterator<T>> iterators) {
        this.iterators = new ArrayList<>(iterators);
    }
    
    @Override
    public boolean hasNext() {
        while (currentIteratorIndex < iterators.size()) {
            if (iterators.get(currentIteratorIndex).hasNext()) {
                return true;
            }
            currentIteratorIndex++;
        }
        return false;
    }
    
    @Override
    public T next() {
        if (!hasNext()) {
            throw new NoSuchElementException();
        }
        return iterators.get(currentIteratorIndex).next();
    }
    
    /**
     * 獲取當前迭代器索引
     */
    public int getCurrentIteratorIndex() {
        return currentIteratorIndex;
    }
    
    /**
     * 獲取迭代器總數
     */
    public int getIteratorCount() {
        return iterators.size();
    }
}

/**
 * 延遲加載迭代器
 */
public class LazyLoadingIterator<T> implements ModernIterator<T> {
    private final Supplier<List<T>> dataProvider;
    private final int batchSize;
    
    private Iterator<T> currentBatch;
    private boolean dataLoaded = false;
    
    public LazyLoadingIterator(Supplier<List<T>> dataProvider, int batchSize) {
        this.dataProvider = dataProvider;
        this.batchSize = batchSize;
    }
    
    private void ensureDataLoaded() {
        if (!dataLoaded) {
            List<T> data = dataProvider.get();
            currentBatch = data.iterator();
            dataLoaded = true;
        }
    }
    
    @Override
    public boolean hasNext() {
        ensureDataLoaded();
        return currentBatch.hasNext();
    }
    
    @Override
    public T next() {
        ensureDataLoaded();
        return currentBatch.next();
    }
}
```

### 3. 使用範例

```java
/**
 * 迭代器使用範例
 */
public class IteratorUsageExample {
    
    public static void main(String[] args) {
        // 創建測試數據
        List<Customer> customers = createTestCustomers();
        
        // 1. 基本迭代器使用
        System.out.println("=== 基本迭代器使用 ===");
        demonstrateBasicIteration(customers);
        
        // 2. 過濾和轉換
        System.out.println("\n=== 過濾和轉換 ===");
        demonstrateFilteringAndMapping(customers);
        
        // 3. 復合迭代器
        System.out.println("\n=== 復合迭代器 ===");
        demonstrateCompositeIterator(customers);
        
        // 4. Stream API 整合
        System.out.println("\n=== Stream API 整合 ===");
        demonstrateStreamIntegration(customers);
    }
    
    private static void demonstrateBasicIteration(List<Customer> customers) {
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        int count = 0;
        while (iterator.hasNext() && count < 3) {
            Customer customer = iterator.next();
            System.out.println("客戶: " + customer);
            count++;
        }
    }
    
    private static void demonstrateFilteringAndMapping(List<Customer> customers) {
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        // 過濾 VIP 客戶並轉換為郵件地址
        ModernIterator<String> emailIterator = iterator
            .filter(customer -> customer.getType() == CustomerType.VIP)
            .map(Customer::getEmail);
        
        System.out.println("VIP 客戶郵件地址:");
        while (emailIterator.hasNext()) {
            System.out.println("- " + emailIterator.next());
        }
    }
    
    private static void demonstrateCompositeIterator(List<Customer> customers) {
        // 將客戶按類型分組
        List<Customer> regularCustomers = customers.stream()
            .filter(c -> c.getType() == CustomerType.REGULAR)
            .collect(Collectors.toList());
            
        List<Customer> vipCustomers = customers.stream()
            .filter(c -> c.getType() == CustomerType.VIP)
            .collect(Collectors.toList());
        
        // 創建復合迭代器
        CompositeIterator<Customer> compositeIterator = new CompositeIterator<>(
            new ListIteratorAdapter<>(regularCustomers),
            new ListIteratorAdapter<>(vipCustomers)
        );
        
        System.out.println("復合迭代器遍歷:");
        while (compositeIterator.hasNext()) {
            Customer customer = compositeIterator.next();
            System.out.println(String.format("迭代器 %d: %s", 
                compositeIterator.getCurrentIteratorIndex(), customer.getName()));
        }
    }
    
    private static void demonstrateStreamIntegration(List<Customer> customers) {
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        // 轉換為 Stream 並進行複雜操作
        Map<CustomerType, BigDecimal> totalByType = iterator.asStream()
            .collect(Collectors.groupingBy(
                Customer::getType,
                Collectors.reducing(BigDecimal.ZERO, Customer::getTotalOrderAmount, BigDecimal::add)
            ));
        
        System.out.println("各類型客戶總訂單金額:");
        totalByType.forEach((type, total) -> 
            System.out.println(String.format("%s: $%s", type.getDescription(), total)));
    }
    
    private static List<Customer> createTestCustomers() {
        List<Customer> customers = new ArrayList<>();
        
        Customer customer1 = new Customer("C001", "張三", "zhangsan@example.com", CustomerType.REGULAR);
        customer1.setTotalOrderAmount(new BigDecimal("1500.00"));
        
        Customer customer2 = new Customer("C002", "李四", "lisi@example.com", CustomerType.VIP);
        customer2.setTotalOrderAmount(new BigDecimal("5000.00"));
        
        Customer customer3 = new Customer("C003", "王五", "wangwu@example.com", CustomerType.ENTERPRISE);
        customer3.setTotalOrderAmount(new BigDecimal("25000.00"));
        
        Customer customer4 = new Customer("C004", "趙六", "zhaoliu@example.com", CustomerType.VIP);
        customer4.setTotalOrderAmount(new BigDecimal("8000.00"));
        
        customers.addAll(Arrays.asList(customer1, customer2, customer3, customer4));
        return customers;
    }
}

/**
 * List 適配器
 */
class ListIteratorAdapter<T> implements ModernIterator<T> {
    private final Iterator<T> iterator;
    
    public ListIteratorAdapter(List<T> list) {
        this.iterator = list.iterator();
    }
    
    @Override
    public boolean hasNext() {
        return iterator.hasNext();
    }
    
    @Override
    public T next() {
        return iterator.next();
    }
}
```

## Spring Boot 整合

### 1. Spring Data 分頁迭代器

```java
/**
 * Spring Data Repository
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, String> {
    
    /**
     * 根據條件分頁查詢
     */
    @Query("SELECT c FROM Customer c WHERE " +
           "(:#{#criteria.type} IS NULL OR c.type = :#{#criteria.type}) AND " +
           "(:#{#criteria.minOrderAmount} IS NULL OR c.totalOrderAmount >= :#{#criteria.minOrderAmount}) AND " +
           "(:#{#criteria.active} IS NULL OR c.active = :#{#criteria.active}) AND " +
           "(:#{#criteria.namePattern} IS NULL OR c.name LIKE %:#{#criteria.namePattern}%) AND " +
           "(:#{#criteria.createdAfter} IS NULL OR c.createdAt >= :#{#criteria.createdAfter}) AND " +
           "(:#{#criteria.createdBefore} IS NULL OR c.createdAt <= :#{#criteria.createdBefore})")
    Page<Customer> findByCriteria(@Param("criteria") CustomerCriteria criteria, Pageable pageable);
    
    /**
     * 流式查詢 - 適合大數據量處理
     */
    @Query("SELECT c FROM Customer c WHERE c.active = true")
    Stream<Customer> findAllActiveCustomersAsStream();
    
    /**
     * 按類型查詢
     */
    Page<Customer> findByType(CustomerType type, Pageable pageable);
    
    /**
     * 查詢訂單金額範圍內的客戶
     */
    Page<Customer> findByTotalOrderAmountBetween(BigDecimal min, BigDecimal max, Pageable pageable);
}

/**
 * Spring Boot 迭代器服務
 */
@Service
@Transactional(readOnly = true)
public class CustomerIteratorService {
    
    private final CustomerRepository customerRepository;
    private final Logger logger = LoggerFactory.getLogger(CustomerIteratorService.class);
    
    public CustomerIteratorService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }
    
    /**
     * 創建分頁客戶迭代器
     */
    public PagedCustomerIterator createPagedIterator(CustomerCriteria criteria, int pageSize) {
        logger.info("創建分頁迭代器: criteria={}, pageSize={}", criteria, pageSize);
        return new PagedCustomerIterator(customerRepository, criteria, pageSize);
    }
    
    /**
     * 創建流式迭代器
     */
    public Stream<Customer> createStreamIterator() {
        logger.info("創建流式迭代器");
        return customerRepository.findAllActiveCustomersAsStream();
    }
    
    /**
     * 批量處理客戶數據
     */
    public void processBatchCustomers(CustomerCriteria criteria, 
                                    int batchSize, 
                                    Consumer<List<Customer>> processor) {
        PagedCustomerIterator iterator = createPagedIterator(criteria, batchSize);
        
        while (iterator.hasNext()) {
            List<Customer> batch = iterator.nextBatch(batchSize);
            processor.accept(batch);
            
            logger.debug("處理批次: {} 客戶", batch.size());
        }
        
        logger.info("批次處理完成，總客戶數: {}", iterator.getTotalElements());
    }
    
    /**
     * 異步迭代處理
     */
    @Async
    public CompletableFuture<ProcessingResult> processCustomersAsync(CustomerCriteria criteria, 
                                                                   Function<Customer, String> processor) {
        return CompletableFuture.supplyAsync(() -> {
            PagedCustomerIterator iterator = createPagedIterator(criteria, 100);
            List<String> results = new ArrayList<>();
            int processedCount = 0;
            
            while (iterator.hasNext()) {
                Customer customer = iterator.next();
                String result = processor.apply(customer);
                results.add(result);
                processedCount++;
                
                if (processedCount % 100 == 0) {
                    logger.info("已處理 {} 客戶", processedCount);
                }
            }
            
            return new ProcessingResult(processedCount, results);
        });
    }
    
    /**
     * 按類型並行處理
     */
    public Map<CustomerType, Long> countCustomersByTypeParallel() {
        return Arrays.stream(CustomerType.values())
            .parallel()
            .collect(Collectors.toMap(
                type -> type,
                type -> {
                    PagedCustomerIterator iterator = createPagedIterator(
                        CustomerCriteria.builder().withType(type), 1000);
                    return iterator.getTotalElements();
                }
            ));
    }
}

/**
 * 處理結果
 */
public class ProcessingResult {
    private final int processedCount;
    private final List<String> results;
    private final LocalDateTime timestamp;
    
    public ProcessingResult(int processedCount, List<String> results) {
        this.processedCount = processedCount;
        this.results = results;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters
    public int getProcessedCount() { return processedCount; }
    public List<String> getResults() { return results; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    @Override
    public String toString() {
        return String.format("ProcessingResult{processedCount=%d, resultsSize=%d, timestamp=%s}", 
                           processedCount, results.size(), timestamp);
    }
}
```

### 2. Spring Boot 配置

```java
/**
 * 迭代器模式配置
 */
@Configuration
@EnableAsync
@EnableConfigurationProperties(IteratorProperties.class)
public class IteratorPatternConfig {
    
    /**
     * 異步執行器配置
     */
    @Bean(name = "customerProcessingExecutor")
    public TaskExecutor customerProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("customer-processing-");
        executor.initialize();
        return executor;
    }
    
    /**
     * 分頁配置
     */
    @Bean
    public PageableExecutionUtils pageableExecutionUtils() {
        return new PageableExecutionUtils();
    }
}

/**
 * 迭代器配置屬性
 */
@ConfigurationProperties(prefix = "app.iterator")
@Data
public class IteratorProperties {
    
    /**
     * 預設分頁大小
     */
    private int defaultPageSize = 50;
    
    /**
     * 最大分頁大小
     */
    private int maxPageSize = 1000;
    
    /**
     * 批次處理大小
     */
    private int batchSize = 100;
    
    /**
     * 是否啟用快取
     */
    private boolean cacheEnabled = true;
    
    /**
     * 快取過期時間（分鐘）
     */
    private int cacheExpirationMinutes = 30;
}
```

### 3. REST API 控制器

```java
/**
 * 客戶迭代器 REST API
 */
@RestController
@RequestMapping("/api/customers")
@Validated
public class CustomerIteratorController {
    
    private final CustomerIteratorService customerIteratorService;
    private final IteratorProperties iteratorProperties;
    
    public CustomerIteratorController(CustomerIteratorService customerIteratorService,
                                    IteratorProperties iteratorProperties) {
        this.customerIteratorService = customerIteratorService;
        this.iteratorProperties = iteratorProperties;
    }
    
    /**
     * 分頁查詢客戶
     */
    @GetMapping("/paged")
    public ResponseEntity<PagedCustomerResponse> getPagedCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String minAmount,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String namePattern) {
        
        // 建構查詢條件
        CustomerCriteria criteria = CustomerCriteria.builder();
        
        if (type != null) {
            criteria.withType(CustomerType.valueOf(type.toUpperCase()));
        }
        if (minAmount != null) {
            criteria.withMinOrderAmount(new BigDecimal(minAmount));
        }
        if (active != null) {
            criteria.withActiveStatus(active);
        }
        if (namePattern != null) {
            criteria.withNamePattern(namePattern);
        }
        
        int pageSize = size != null ? 
            Math.min(size, iteratorProperties.getMaxPageSize()) : 
            iteratorProperties.getDefaultPageSize();
        
        PagedCustomerIterator iterator = customerIteratorService.createPagedIterator(criteria, pageSize);
        
        // 獲取當前頁面數據
        List<Customer> customers = new ArrayList<>();
        int currentPage = 0;
        
        // 跳到指定頁面
        while (currentPage < page && iterator.hasNext()) {
            iterator.nextBatch(pageSize);
            currentPage++;
        }
        
        // 獲取當前頁面數據
        if (iterator.hasNext()) {
            customers = iterator.nextBatch(pageSize);
        }
        
        PagedCustomerResponse response = new PagedCustomerResponse(
            customers, page, pageSize, iterator.getTotalElements(), iterator.getTotalPages());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 批次處理客戶
     */
    @PostMapping("/batch-process")
    public ResponseEntity<BatchProcessResponse> batchProcessCustomers(
            @RequestBody @Valid BatchProcessRequest request) {
        
        CustomerCriteria criteria = buildCriteriaFromRequest(request);
        AtomicInteger processedCount = new AtomicInteger(0);
        List<String> results = new ArrayList<>();
        
        customerIteratorService.processBatchCustomers(criteria, request.getBatchSize(), batch -> {
            batch.forEach(customer -> {
                // 執行處理邏輯
                String result = processCustomer(customer, request.getProcessingType());
                results.add(result);
                processedCount.incrementAndGet();
            });
        });
        
        return ResponseEntity.ok(new BatchProcessResponse(processedCount.get(), results));
    }
    
    /**
     * 異步處理客戶
     */
    @PostMapping("/async-process")
    public ResponseEntity<AsyncProcessResponse> asyncProcessCustomers(
            @RequestBody @Valid AsyncProcessRequest request) {
        
        CustomerCriteria criteria = buildCriteriaFromRequest(request);
        
        CompletableFuture<ProcessingResult> future = customerIteratorService.processCustomersAsync(
            criteria, customer -> processCustomer(customer, request.getProcessingType()));
        
        // 返回處理 ID 供客戶端查詢進度
        String processId = UUID.randomUUID().toString();
        // 這裡應該將 future 存儲起來以供後續查詢
        
        return ResponseEntity.accepted().body(new AsyncProcessResponse(processId, "處理已開始"));
    }
    
    /**
     * 獲取統計信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<CustomerStatistics> getCustomerStatistics() {
        Map<CustomerType, Long> countsByType = customerIteratorService.countCustomersByTypeParallel();
        
        CustomerStatistics statistics = new CustomerStatistics(countsByType);
        return ResponseEntity.ok(statistics);
    }
    
    private CustomerCriteria buildCriteriaFromRequest(Object request) {
        // 簡化實現，實際應根據請求類型構建條件
        return CustomerCriteria.builder();
    }
    
    private String processCustomer(Customer customer, String processingType) {
        // 根據處理類型執行不同邏輯
        switch (processingType.toUpperCase()) {
            case "EMAIL_NOTIFICATION":
                return "已發送郵件通知給: " + customer.getEmail();
            case "LOYALTY_POINTS":
                return "已計算忠誠度積分: " + customer.getCustomerId();
            case "DATA_EXPORT":
                return "已匯出數據: " + customer.toString();
            default:
                return "已處理客戶: " + customer.getCustomerId();
        }
    }
}

/**
 * 請求和回應 DTO
 */
@Data
public class BatchProcessRequest {
    @NotNull
    private String processingType;
    
    @Min(1) @Max(1000)
    private int batchSize = 100;
    
    private String customerType;
    private String minOrderAmount;
    private Boolean active;
    private String namePattern;
}

@Data
public class AsyncProcessRequest {
    @NotNull
    private String processingType;
    
    private String customerType;
    private String minOrderAmount;
    private Boolean active;
    private String namePattern;
}

@Data
public class PagedCustomerResponse {
    private List<Customer> customers;
    private int currentPage;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private LocalDateTime timestamp;
    
    public PagedCustomerResponse(List<Customer> customers, int currentPage, int pageSize, 
                               long totalElements, int totalPages) {
        this.customers = customers;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.timestamp = LocalDateTime.now();
    }
}

@Data
public class BatchProcessResponse {
    private int processedCount;
    private List<String> results;
    private LocalDateTime timestamp;
    
    public BatchProcessResponse(int processedCount, List<String> results) {
        this.processedCount = processedCount;
        this.results = results;
        this.timestamp = LocalDateTime.now();
    }
}

@Data
public class AsyncProcessResponse {
    private String processId;
    private String message;
    private LocalDateTime timestamp;
    
    public AsyncProcessResponse(String processId, String message) {
        this.processId = processId;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}

@Data
public class CustomerStatistics {
    private Map<CustomerType, Long> countsByType;
    private long totalCustomers;
    private LocalDateTime timestamp;
    
    public CustomerStatistics(Map<CustomerType, Long> countsByType) {
        this.countsByType = countsByType;
        this.totalCustomers = countsByType.values().stream().mapToLong(Long::longValue).sum();
        this.timestamp = LocalDateTime.now();
    }
}
```

## 進階主題

### 1. 效能優化策略

```java
/**
 * 高效能迭代器實現
 */
@Component
public class OptimizedIteratorService {
    
    private final Cache<String, List<Customer>> iteratorCache;
    private final ExecutorService executorService;
    
    public OptimizedIteratorService() {
        this.iteratorCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .recordStats()
            .build();
            
        this.executorService = ForkJoinPool.commonPool();
    }
    
    /**
     * 帶快取的分頁迭代器
     */
    public ModernIterator<Customer> createCachedIterator(CustomerCriteria criteria, int pageSize) {
        String cacheKey = generateCacheKey(criteria, pageSize);
        
        List<Customer> cachedData = iteratorCache.getIfPresent(cacheKey);
        if (cachedData != null) {
            return new ListIteratorAdapter<>(cachedData);
        }
        
        return new CachingIterator<>(criteria, pageSize, iteratorCache, cacheKey);
    }
    
    /**
     * 並行處理迭代器
     */
    public <R> CompletableFuture<List<R>> processInParallel(ModernIterator<Customer> iterator,
                                                          Function<Customer, R> processor,
                                                          int parallelism) {
        return CompletableFuture.supplyAsync(() -> {
            List<Customer> customers = new ArrayList<>();
            while (iterator.hasNext()) {
                customers.add(iterator.next());
            }
            
            return customers.parallelStream()
                .map(processor)
                .collect(Collectors.toList());
        }, executorService);
    }
    
    /**
     * 批次處理優化
     */
    public void processInBatchesOptimized(ModernIterator<Customer> iterator,
                                        Consumer<List<Customer>> processor,
                                        int batchSize) {
        List<Customer> batch = new ArrayList<>(batchSize);
        
        while (iterator.hasNext()) {
            batch.add(iterator.next());
            
            if (batch.size() >= batchSize) {
                processor.accept(new ArrayList<>(batch));
                batch.clear();
            }
        }
        
        // 處理剩餘元素
        if (!batch.isEmpty()) {
            processor.accept(batch);
        }
    }
    
    private String generateCacheKey(CustomerCriteria criteria, int pageSize) {
        return String.format("customers_%s_%d", criteria.hashCode(), pageSize);
    }
}

/**
 * 快取迭代器實現
 */
class CachingIterator<T> implements ModernIterator<T> {
    private final Iterator<T> delegate;
    private final List<T> cache = new ArrayList<>();
    private final Cache<String, List<T>> globalCache;
    private final String cacheKey;
    
    public CachingIterator(CustomerCriteria criteria, int pageSize, 
                         Cache<String, List<T>> globalCache, String cacheKey) {
        this.globalCache = globalCache;
        this.cacheKey = cacheKey;
        
        // 實際從數據庫加載數據的邏輯
        List<T> data = loadDataFromDatabase(criteria, pageSize);
        this.delegate = data.iterator();
    }
    
    @Override
    public boolean hasNext() {
        return delegate.hasNext();
    }
    
    @Override
    public T next() {
        T element = delegate.next();
        cache.add(element);
        
        // 當迭代完成時，將數據加入快取
        if (!delegate.hasNext()) {
            globalCache.put(cacheKey, new ArrayList<>(cache));
        }
        
        return element;
    }
    
    @SuppressWarnings("unchecked")
    private List<T> loadDataFromDatabase(CustomerCriteria criteria, int pageSize) {
        // 簡化實現，實際應該調用數據庫服務
        return (List<T>) new ArrayList<Customer>();
    }
}
```

### 2. 測試策略

```java
/**
 * 迭代器模式測試
 */
@ExtendWith(MockitoExtension.class)
class IteratorPatternTest {
    
    @Mock
    private CustomerRepository customerRepository;
    
    @InjectMocks
    private CustomerIteratorService customerIteratorService;
    
    @Test
    void testPagedIteratorBasicFunctionality() {
        // Given
        CustomerCriteria criteria = CustomerCriteria.builder().withType(CustomerType.VIP);
        List<Customer> customers = createTestCustomers();
        Page<Customer> page = new PageImpl<>(customers);
        
        when(customerRepository.findByCriteria(eq(criteria), any(Pageable.class)))
            .thenReturn(page);
        
        // When
        PagedCustomerIterator iterator = customerIteratorService.createPagedIterator(criteria, 2);
        
        // Then
        assertThat(iterator.hasNext()).isTrue();
        Customer first = iterator.next();
        assertThat(first).isNotNull();
        assertThat(iterator.getTotalElements()).isEqualTo(customers.size());
    }
    
    @Test
    void testModernIteratorFiltering() {
        // Given
        List<Customer> customers = createTestCustomers();
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        // When
        ModernIterator<Customer> filteredIterator = iterator.filter(
            customer -> customer.getType() == CustomerType.VIP);
        
        // Then
        List<Customer> result = new ArrayList<>();
        while (filteredIterator.hasNext()) {
            result.add(filteredIterator.next());
        }
        
        assertThat(result).allMatch(customer -> customer.getType() == CustomerType.VIP);
    }
    
    @Test
    void testModernIteratorMapping() {
        // Given
        List<Customer> customers = createTestCustomers();
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        // When
        ModernIterator<String> emailIterator = iterator.map(Customer::getEmail);
        
        // Then
        List<String> emails = new ArrayList<>();
        while (emailIterator.hasNext()) {
            emails.add(emailIterator.next());
        }
        
        assertThat(emails).hasSize(customers.size());
        assertThat(emails).allMatch(email -> email.contains("@"));
    }
    
    @Test
    void testCompositeIterator() {
        // Given
        List<Customer> batch1 = createTestCustomers().subList(0, 2);
        List<Customer> batch2 = createTestCustomers().subList(2, 4);
        
        CompositeIterator<Customer> compositeIterator = new CompositeIterator<>(
            new ListIteratorAdapter<>(batch1),
            new ListIteratorAdapter<>(batch2)
        );
        
        // When
        List<Customer> result = new ArrayList<>();
        while (compositeIterator.hasNext()) {
            result.add(compositeIterator.next());
        }
        
        // Then
        assertThat(result).hasSize(4);
    }
    
    @Test
    void testStreamIntegration() {
        // Given
        List<Customer> customers = createTestCustomers();
        ModernIterator<Customer> iterator = new ListIteratorAdapter<>(customers);
        
        // When
        long vipCount = iterator.asStream()
            .filter(customer -> customer.getType() == CustomerType.VIP)
            .count();
        
        // Then
        long expectedVipCount = customers.stream()
            .filter(customer -> customer.getType() == CustomerType.VIP)
            .count();
        assertThat(vipCount).isEqualTo(expectedVipCount);
    }
    
    private List<Customer> createTestCustomers() {
        return Arrays.asList(
            new Customer("C001", "測試1", "test1@example.com", CustomerType.REGULAR),
            new Customer("C002", "測試2", "test2@example.com", CustomerType.VIP),
            new Customer("C003", "測試3", "test3@example.com", CustomerType.ENTERPRISE),
            new Customer("C004", "測試4", "test4@example.com", CustomerType.VIP)
        );
    }
}

/**
 * Spring Boot 整合測試
 */
@SpringBootTest
@TestPropertySource(properties = {
    "app.iterator.default-page-size=10",
    "app.iterator.max-page-size=100"
})
class IteratorPatternIntegrationTest {
    
    @Autowired
    private CustomerIteratorService customerIteratorService;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @Test
    @Transactional
    void testPaginatedIteratorWithDatabase() {
        // Given
        saveTestCustomers();
        CustomerCriteria criteria = CustomerCriteria.builder();
        
        // When
        PagedCustomerIterator iterator = customerIteratorService.createPagedIterator(criteria, 2);
        
        // Then
        assertThat(iterator.hasNext()).isTrue();
        assertThat(iterator.getTotalElements()).isGreaterThan(0);
        
        List<Customer> firstBatch = iterator.nextBatch(2);
        assertThat(firstBatch).hasSizeLessThanOrEqualTo(2);
    }
    
    @Test
    void testBatchProcessing() {
        // Given
        saveTestCustomers();
        CustomerCriteria criteria = CustomerCriteria.builder().withActiveStatus(true);
        AtomicInteger processedCount = new AtomicInteger(0);
        
        // When
        customerIteratorService.processBatchCustomers(criteria, 5, batch -> {
            processedCount.addAndGet(batch.size());
        });
        
        // Then
        assertThat(processedCount.get()).isGreaterThan(0);
    }
    
    private void saveTestCustomers() {
        List<Customer> customers = createTestCustomers();
        customerRepository.saveAll(customers);
    }
    
    private List<Customer> createTestCustomers() {
        return Arrays.asList(
            new Customer("IT001", "整合測試1", "integration1@example.com", CustomerType.REGULAR),
            new Customer("IT002", "整合測試2", "integration2@example.com", CustomerType.VIP),
            new Customer("IT003", "整合測試3", "integration3@example.com", CustomerType.ENTERPRISE)
        );
    }
}
```

## 最佳實踐與建議

### 1. 設計原則

- **責任分離**：將迭代邏輯與業務邏輯分離
- **延遲加載**：對大數據集採用分頁或流式處理
- **記憶體效率**：避免一次加載所有數據到記憶體
- **異常安全**：確保迭代過程中的異常得到適當處理

### 2. 常見陷阱

#### fail-fast iterator 的限制

Java 集合的 fail-fast iterator 在 for-each loop 中不能呼叫 `list.remove(item)` — 這會拋出 `ConcurrentModificationException`。必須使用 `Iterator.remove()` 或 `removeIf()`：

```java
// ❌ 錯誤 - for-each 中直接呼叫 list.remove()
for (String s : list) {
    if (s.startsWith("A")) list.remove(s); // ConcurrentModificationException
}

// ✅ 方法一：Iterator.remove()
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().startsWith("A")) it.remove();
}

// ✅ 方法二：removeIf()（Java 8+，最簡潔）
list.removeIf(s -> s.startsWith("A"));
```

#### 避免在迭代過程中修改集合
```java
// ❌ 錯誤的設計 - 在迭代中修改集合
List<Customer> customers = getCustomers();
for (Customer customer : customers) {
    if (customer.isInactive()) {
        customers.remove(customer); // ConcurrentModificationException
    }
}

// ✅ 正確的設計 - 使用 Iterator.remove() 或收集後批量處理
Iterator<Customer> iterator = customers.iterator();
while (iterator.hasNext()) {
    Customer customer = iterator.next();
    if (customer.isInactive()) {
        iterator.remove();
    }
}
```

#### 正確處理資源釋放
```java
// ✅ 使用 try-with-resources 確保資源釋放
try (Stream<Customer> customerStream = customerRepository.findAllActiveCustomersAsStream()) {
    customerStream
        .filter(customer -> customer.getType() == CustomerType.VIP)
        .forEach(this::processVipCustomer);
}
```

### 3. 使用建議

1. **適用場景**：大數據集遍歷、分頁處理、流式數據處理
2. **Spring Data 整合**：善用 Page、Slice 和 Stream 查詢
3. **效能優化**：考慮使用快取、異步處理和並行流

### 現代 Java 取代方案

`Stream` API 提供更豐富的管道操作，本質上是 Iterator 的函數式版本：

```java
// 傳統 Iterator
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().startsWith("A")) it.remove();
}

// 現代做法
list.removeIf(s -> s.startsWith("A"));
```

`Stream` 是 lazy Iterator，支援 `filter`/`map`/`collect` 管道；`Spliterator` 是並行版本（`parallelStream()` 的底層）。注意 Spring Data 的 `Stream<T>` 查詢回傳的是一個 JDBC cursor，使用後必須在 `try-with-resources` 中關閉，否則會洩漏資料庫連線。

## 總結

現代化的迭代器模式不僅包含傳統的遍歷功能，更整合了 Java 8+ 的 Stream API、Spring Data 的分頁機制，以及企業級的批量處理能力。通過合理運用這些現代特性，可以構建高效、可擴展的數據處理系統。

### 主要優點
- **統一接口**：提供一致的遍歷方式
- **記憶體效率**：支持大數據集的分批處理
- **函數式整合**：與現代 Java 函數式編程無縫整合
- **企業級特性**：支持分頁、快取、異步處理

### 主要缺點
- **複雜性增加**：現代化功能增加了實現複雜度
- **效能開銷**：某些高級功能可能帶來額外開銷
- **依賴性**：與特定框架（如 Spring Data）耦合

正確使用現代化迭代器模式可以大幅提升數據處理的效率和可維護性，是企業級應用開發中不可或缺的重要模式。