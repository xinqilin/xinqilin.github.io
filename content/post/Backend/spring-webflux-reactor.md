---
title: "Reactive Programming 完整指南：Spring WebFlux 與 Project Reactor"
author: Bill.Lin
date: 2021-12-01T22:13:40+08:00
draft: false
tags: ["Java", "Spring", "WebFlux", "Reactor", "Reactive", "Async", "Mono", "Flux"]
Description: "深入探討 Reactive Programming 概念，包含 Mono、Flux 操作符詳解與 Spring WebFlux 實戰應用"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/ReactiveJava/

---

## 概述

Reactive Programming（響應式程式設計）是一種基於資料流和變化傳播的程式設計模式。在 Java 生態系統中，Project Reactor 是實現響應式程式設計的核心函式庫，而 Spring WebFlux 則建立在其之上，提供非阻塞式的 Web 應用程式開發能力。

## 核心概念

### 什麼是 Reactive Programming？

響應式程式設計的核心特徵：

- **非阻塞（Non-blocking）**：執行緒不會被 I/O 操作阻塞
- **事件驅動（Event-driven）**：基於事件流處理資料
- **背壓支援（Backpressure）**：自動處理生產者和消費者之間的速度差異
- **彈性（Resilient）**：具備錯誤處理和恢復能力
- **響應性（Responsive）**：快速回應使用者請求

### Reactive Streams 規範

Reactive Streams 定義了四個核心介面：

```java
public interface Publisher<T> {
    void subscribe(Subscriber<? super T> s);
}

public interface Subscriber<T> {
    void onSubscribe(Subscription s);
    void onNext(T t);
    void onError(Throwable t);
    void onComplete();
}

public interface Subscription {
    void request(long n);
    void cancel();
}

public interface Processor<T, R> extends Subscriber<T>, Publisher<R> {
}
```

## Project Reactor 基礎

### Mono 與 Flux

Project Reactor 提供兩個核心類型：

- **Mono<T>**：發出 0 或 1 個元素的響應式流
- **Flux<T>**：發出 0 到 N 個元素的響應式流

### 創建響應式流

#### Mono 創建方式

```java
// 創建包含單一值的 Mono
Mono<String> mono1 = Mono.just("Hello Reactive");

// 創建空的 Mono
Mono<String> empty = Mono.empty();

// 從 Optional 創建
Mono<String> mono2 = Mono.justOrEmpty(Optional.of("Optional Value"));

// 延遲創建
Mono<String> lazy = Mono.fromSupplier(() -> {
    // 複雜的計算邏輯
    return "Computed Value";
});

// 從 Callable 創建
Mono<String> callable = Mono.fromCallable(() -> {
    Thread.sleep(1000); // 模擬耗時操作
    return "Delayed Value";
});

// 錯誤 Mono
Mono<String> error = Mono.error(new RuntimeException("Something went wrong"));
```

#### Flux 創建方式

```java
// 從可變參數創建
Flux<String> flux1 = Flux.just("A", "B", "C", "D");

// 從集合創建
List<String> list = Arrays.asList("Apple", "Banana", "Cherry");
Flux<String> flux2 = Flux.fromIterable(list);

// 創建數字範圍
Flux<Integer> range = Flux.range(1, 10); // 1 到 10

// 定時發射
Flux<Long> interval = Flux.interval(Duration.ofSeconds(1)); // 每秒發射一個遞增數字

// 從陣列創建
String[] array = {"X", "Y", "Z"};
Flux<String> flux3 = Flux.fromArray(array);

// 從 Stream 創建
Flux<String> flux4 = Flux.fromStream(Stream.of("Stream1", "Stream2"));
```

### 訂閱與消費

```java
// 基本訂閱
Flux<Integer> numbers = Flux.range(1, 5);

// 只處理數據
numbers.subscribe(System.out::println);

// 處理數據和錯誤
numbers.subscribe(
    data -> System.out.println("Data: " + data),
    error -> System.err.println("Error: " + error)
);

// 完整的訂閱處理
numbers.subscribe(
    data -> System.out.println("Next: " + data),      // onNext
    error -> System.err.println("Error: " + error),   // onError
    () -> System.out.println("Completed!")            // onComplete
);

// 使用自訂 Subscriber
numbers.subscribe(new BaseSubscriber<Integer>() {
    @Override
    protected void hookOnSubscribe(Subscription subscription) {
        System.out.println("Subscribed");
        request(1); // 請求第一個元素
    }
    
    @Override
    protected void hookOnNext(Integer value) {
        System.out.println("Value: " + value);
        if (value < 3) {
            request(1); // 繼續請求下一個
        } else {
            cancel(); // 取消訂閱
        }
    }
});
```

## 核心操作符詳解

### 轉換操作符

#### map - 元素轉換

```java
Flux<String> names = Flux.just("alice", "bob", "charlie");

// 轉換為大寫
Flux<String> upperNames = names.map(String::toUpperCase);
upperNames.subscribe(System.out::println); // ALICE, BOB, CHARLIE

// 轉換為長度
Flux<Integer> lengths = names.map(String::length);
lengths.subscribe(System.out::println); // 5, 3, 7
```

#### flatMap - 扁平化處理

```java
Flux<String> sentences = Flux.just("Hello World", "Reactive Programming");

// 將每個句子拆分為單詞
Flux<String> words = sentences.flatMap(sentence -> 
    Flux.fromArray(sentence.split(" "))
);
words.subscribe(System.out::println); // Hello, World, Reactive, Programming

// 非同步處理
Flux<String> urls = Flux.just("url1", "url2", "url3");
Flux<String> responses = urls.flatMap(url -> 
    Mono.fromCallable(() -> {
        // 模擬 HTTP 請求
        Thread.sleep(100);
        return "Response from " + url;
    }).subscribeOn(Schedulers.boundedElastic())
);
```

#### concatMap - 順序處理

```java
// 與 flatMap 不同，concatMap 保持順序
Flux<String> ordered = urls.concatMap(url -> 
    Mono.fromCallable(() -> "Response from " + url)
        .subscribeOn(Schedulers.boundedElastic())
);
```

### 過濾操作符

```java
Flux<Integer> numbers = Flux.range(1, 10);

// 過濾偶數
Flux<Integer> evenNumbers = numbers.filter(n -> n % 2 == 0);

// 取前 3 個元素
Flux<Integer> first3 = numbers.take(3);

// 跳過前 5 個元素
Flux<Integer> skip5 = numbers.skip(5);

// 去重
Flux<String> duplicates = Flux.just("A", "B", "A", "C", "B");
Flux<String> distinct = duplicates.distinct();

// 取不重複元素直到遇到重複
Flux<String> distinctUntilChanged = Flux.just("A", "A", "B", "B", "C")
    .distinctUntilChanged();
```

### 組合操作符

#### merge - 合併多個流

```java
Flux<String> flux1 = Flux.just("A", "B").delayElements(Duration.ofMillis(100));
Flux<String> flux2 = Flux.just("C", "D").delayElements(Duration.ofMillis(150));

// 合併（順序不保證）
Flux<String> merged = Flux.merge(flux1, flux2);
merged.subscribe(System.out::println); // 可能輸出: A, C, B, D

// 使用 mergeWith
Flux<String> merged2 = flux1.mergeWith(flux2);
```

#### concat - 連接流

```java
// 連接（保持順序）
Flux<String> concatenated = Flux.concat(flux1, flux2);
concatenated.subscribe(System.out::println); // 輸出: A, B, C, D

// 使用 concatWith
Flux<String> concatenated2 = flux1.concatWith(flux2);
```

#### zip - 配對元素

```java
Flux<String> names = Flux.just("Alice", "Bob", "Charlie");
Flux<Integer> ages = Flux.just(25, 30, 35);

// 配對元素
Flux<String> people = Flux.zip(names, ages, (name, age) -> 
    name + " is " + age + " years old"
);
people.subscribe(System.out::println);
// Alice is 25 years old
// Bob is 30 years old  
// Charlie is 35 years old
```

### 錯誤處理

```java
Flux<String> source = Flux.just("A", "B", "C")
    .map(s -> {
        if ("B".equals(s)) {
            throw new RuntimeException("Error on B");
        }
        return s;
    });

// 提供預設值
Flux<String> withDefault = source.onErrorReturn("DEFAULT");

// 繼續其他流
Flux<String> fallback = source.onErrorResume(error -> 
    Flux.just("FALLBACK1", "FALLBACK2")
);

// 重試
Flux<String> withRetry = source.retry(3);

// 重試且延遲
Flux<String> withRetryDelay = source.retryWhen(
    Retry.backoff(3, Duration.ofSeconds(1))
);

// 捕獲錯誤並繼續
Flux<String> continueOnError = source.onErrorContinue((error, item) -> {
    System.err.println("Error on item " + item + ": " + error.getMessage());
});
```

## 背壓（Backpressure）處理

背壓是響應式程式設計中的重要概念，用於處理生產者速度超過消費者處理能力的情況：

```java
// 背壓策略示例
Flux<Integer> fastProducer = Flux.range(1, 1000)
    .delayElements(Duration.ofMillis(1));

// 消費者處理較慢
fastProducer
    .onBackpressureBuffer(10) // 緩衝區大小為 10
    .subscribe(new BaseSubscriber<Integer>() {
        @Override
        protected void hookOnSubscribe(Subscription subscription) {
            request(1);
        }
        
        @Override
        protected void hookOnNext(Integer value) {
            try {
                Thread.sleep(100); // 模擬慢處理
                System.out.println("Processed: " + value);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            request(1);
        }
    });

// 其他背壓策略
Flux<Integer> dropped = fastProducer.onBackpressureDrop();
Flux<Integer> latest = fastProducer.onBackpressureLatest();
Flux<Integer> error = fastProducer.onBackpressureError();
```

## 排程器（Scheduler）

Reactor 提供多種排程器來控制執行上下文：

```java
// 不同類型的排程器
Scheduler single = Schedulers.single();              // 單執行緒
Scheduler parallel = Schedulers.parallel();          // 並行處理（CPU 密集）
Scheduler boundedElastic = Schedulers.boundedElastic(); // 彈性執行緒池（I/O 密集）
Scheduler immediate = Schedulers.immediate();        // 當前執行緒

// 使用排程器
Flux<String> source = Flux.just("A", "B", "C");

// 在指定排程器上發布
Flux<String> published = source.publishOn(Schedulers.parallel());

// 在指定排程器上訂閱
Flux<String> subscribed = source.subscribeOn(Schedulers.boundedElastic());

// 組合使用
source
    .subscribeOn(Schedulers.boundedElastic()) // 訂閱在彈性執行緒池
    .map(s -> s.toLowerCase())                // 轉換操作
    .publishOn(Schedulers.parallel())         // 後續操作在並行排程器
    .map(s -> s.toUpperCase())
    .subscribe(System.out::println);
```

## Spring WebFlux 實戰

### 依賴配置

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-r2dbc</artifactId>
    </dependency>
</dependencies>
```

### 響應式 REST Controller

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping
    public Flux<User> getAllUsers() {
        return userService.findAll();
    }
    
    @GetMapping("/{id}")
    public Mono<ResponseEntity<User>> getUserById(@PathVariable String id) {
        return userService.findById(id)
            .map(user -> ResponseEntity.ok(user))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public Mono<User> createUser(@RequestBody User user) {
        return userService.save(user);
    }
    
    @PutMapping("/{id}")
    public Mono<ResponseEntity<User>> updateUser(@PathVariable String id, @RequestBody User user) {
        return userService.update(id, user)
            .map(updatedUser -> ResponseEntity.ok(updatedUser))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteUser(@PathVariable String id) {
        return userService.deleteById(id)
            .then(Mono.just(ResponseEntity.noContent().<Void>build()))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    // 串流端點
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<User> getUserStream() {
        return userService.findAll()
            .delayElements(Duration.ofSeconds(1)); // 每秒發送一個用戶
    }
}
```

### 響應式 Service 層

```java
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final WebClient webClient;
    
    public UserService(UserRepository userRepository, WebClient.Builder webClientBuilder) {
        this.userRepository = userRepository;
        this.webClient = webClientBuilder.baseUrl("https://api.external.com").build();
    }
    
    public Flux<User> findAll() {
        return userRepository.findAll();
    }
    
    public Mono<User> findById(String id) {
        return userRepository.findById(id);
    }
    
    public Mono<User> save(User user) {
        return userRepository.save(user);
    }
    
    public Mono<User> update(String id, User user) {
        return userRepository.findById(id)
            .flatMap(existingUser -> {
                existingUser.setName(user.getName());
                existingUser.setEmail(user.getEmail());
                return userRepository.save(existingUser);
            });
    }
    
    public Mono<Void> deleteById(String id) {
        return userRepository.deleteById(id);
    }
    
    // 組合多個非同步操作
    public Mono<UserProfile> getUserProfile(String userId) {
        Mono<User> userMono = findById(userId);
        Mono<List<Order>> ordersMono = getOrdersByUserId(userId);
        Mono<UserPreferences> preferencesMono = getUserPreferences(userId);
        
        return Mono.zip(userMono, ordersMono, preferencesMono)
            .map(tuple -> new UserProfile(
                tuple.getT1(), // User
                tuple.getT2(), // Orders
                tuple.getT3()  // Preferences
            ));
    }
    
    // 外部 API 呼叫
    private Mono<List<Order>> getOrdersByUserId(String userId) {
        return webClient.get()
            .uri("/orders?userId={userId}", userId)
            .retrieve()
            .bodyToFlux(Order.class)
            .collectList()
            .timeout(Duration.ofSeconds(5)) // 5 秒逾時
            .onErrorReturn(Collections.emptyList()); // 錯誤時返回空列表
    }
    
    private Mono<UserPreferences> getUserPreferences(String userId) {
        return webClient.get()
            .uri("/preferences/{userId}", userId)
            .retrieve()
            .bodyToMono(UserPreferences.class)
            .onErrorReturn(new UserPreferences()); // 預設偏好設定
    }
}
```

### 響應式資料庫存取

```java
// R2DBC Repository
@Repository
public interface UserRepository extends ReactiveCrudRepository<User, String> {
    
    Flux<User> findByNameContaining(String name);
    
    Flux<User> findByEmailDomain(String domain);
    
    @Query("SELECT * FROM users WHERE created_at > :date")
    Flux<User> findUsersCreatedAfter(LocalDateTime date);
    
    @Modifying
    @Query("UPDATE users SET last_login = :loginTime WHERE id = :userId")
    Mono<Integer> updateLastLogin(String userId, LocalDateTime loginTime);
}

// 自訂 Repository 實作
@Component
public class CustomUserRepository {
    
    private final DatabaseClient databaseClient;
    
    public CustomUserRepository(DatabaseClient databaseClient) {
        this.databaseClient = databaseClient;
    }
    
    public Flux<User> findUsersByComplexCriteria(UserSearchCriteria criteria) {
        return databaseClient.sql("""
            SELECT * FROM users 
            WHERE (:name IS NULL OR name LIKE :name)
            AND (:email IS NULL OR email = :email)
            AND (:minAge IS NULL OR age >= :minAge)
            ORDER BY created_at DESC
            """)
            .bind("name", criteria.getName() != null ? "%" + criteria.getName() + "%" : null)
            .bind("email", criteria.getEmail())
            .bind("minAge", criteria.getMinAge())
            .map((row, metadata) -> User.builder()
                .id(row.get("id", String.class))
                .name(row.get("name", String.class))
                .email(row.get("email", String.class))
                .age(row.get("age", Integer.class))
                .createdAt(row.get("created_at", LocalDateTime.class))
                .build())
            .all();
    }
}
```

### WebClient 使用

```java
@Component
public class ExternalApiClient {
    
    private final WebClient webClient;
    
    public ExternalApiClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
            .baseUrl("https://jsonplaceholder.typicode.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }
    
    // GET 請求
    public Mono<Post> getPost(Long id) {
        return webClient.get()
            .uri("/posts/{id}", id)
            .retrieve()
            .onStatus(HttpStatus::is4xxClientError, response -> 
                Mono.error(new NotFoundException("Post not found")))
            .onStatus(HttpStatus::is5xxServerError, response -> 
                Mono.error(new ServiceException("Server error")))
            .bodyToMono(Post.class)
            .timeout(Duration.ofSeconds(10))
            .retry(3);
    }
    
    // POST 請求
    public Mono<Post> createPost(Post post) {
        return webClient.post()
            .uri("/posts")
            .bodyValue(post)
            .retrieve()
            .bodyToMono(Post.class);
    }
    
    // 批量請求
    public Flux<Post> getAllPosts() {
        return webClient.get()
            .uri("/posts")
            .retrieve()
            .bodyToFlux(Post.class)
            .onBackpressureBuffer(100); // 緩衝處理
    }
    
    // 並行請求
    public Mono<List<PostWithComments>> getPostsWithComments(List<Long> postIds) {
        return Flux.fromIterable(postIds)
            .flatMap(this::getPostWithComments, 5) // 最多 5 個並行請求
            .collectList();
    }
    
    private Mono<PostWithComments> getPostWithComments(Long postId) {
        Mono<Post> postMono = getPost(postId);
        Mono<List<Comment>> commentsMono = getCommentsByPostId(postId);
        
        return Mono.zip(postMono, commentsMono, PostWithComments::new);
    }
    
    private Mono<List<Comment>> getCommentsByPostId(Long postId) {
        return webClient.get()
            .uri("/posts/{postId}/comments", postId)
            .retrieve()
            .bodyToFlux(Comment.class)
            .collectList();
    }
}
```

## 測試響應式程式碼

### 測試配置

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private WebClient webClient;
    
    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;
    
    @Mock
    private WebClient.ResponseSpec responseSpec;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void testFindById() {
        // Given
        String userId = "123";
        User expectedUser = new User(userId, "John", "john@example.com");
        when(userRepository.findById(userId)).thenReturn(Mono.just(expectedUser));
        
        // When
        Mono<User> result = userService.findById(userId);
        
        // Then
        StepVerifier.create(result)
            .expectNext(expectedUser)
            .verifyComplete();
        
        verify(userRepository).findById(userId);
    }
    
    @Test
    void testFindByIdNotFound() {
        // Given
        String userId = "999";
        when(userRepository.findById(userId)).thenReturn(Mono.empty());
        
        // When
        Mono<User> result = userService.findById(userId);
        
        // Then
        StepVerifier.create(result)
            .verifyComplete(); // 期望空結果
    }
    
    @Test
    void testGetAllUsers() {
        // Given
        List<User> users = Arrays.asList(
            new User("1", "John", "john@example.com"),
            new User("2", "Jane", "jane@example.com")
        );
        when(userRepository.findAll()).thenReturn(Flux.fromIterable(users));
        
        // When
        Flux<User> result = userService.findAll();
        
        // Then
        StepVerifier.create(result)
            .expectNext(users.get(0))
            .expectNext(users.get(1))
            .verifyComplete();
    }
    
    @Test
    void testSaveUser() {
        // Given
        User userToSave = new User(null, "New User", "new@example.com");
        User savedUser = new User("123", "New User", "new@example.com");
        when(userRepository.save(userToSave)).thenReturn(Mono.just(savedUser));
        
        // When
        Mono<User> result = userService.save(userToSave);
        
        // Then
        StepVerifier.create(result)
            .expectNext(savedUser)
            .verifyComplete();
    }
    
    @Test
    void testErrorHandling() {
        // Given
        String userId = "123";
        when(userRepository.findById(userId))
            .thenReturn(Mono.error(new RuntimeException("Database error")));
        
        // When
        Mono<User> result = userService.findById(userId);
        
        // Then
        StepVerifier.create(result)
            .expectError(RuntimeException.class)
            .verify();
    }
}
```

### 整合測試

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIntegrationTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private UserService userService;
    
    @Test
    void testGetAllUsers() {
        // Given
        List<User> users = Arrays.asList(
            new User("1", "John", "john@example.com"),
            new User("2", "Jane", "jane@example.com")
        );
        when(userService.findAll()).thenReturn(Flux.fromIterable(users));
        
        // When & Then
        webTestClient.get()
            .uri("/api/users")
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(User.class)
            .hasSize(2)
            .contains(users.toArray(new User[0]));
    }
    
    @Test
    void testGetUserById() {
        // Given
        String userId = "123";
        User user = new User(userId, "John", "john@example.com");
        when(userService.findById(userId)).thenReturn(Mono.just(user));
        
        // When & Then
        webTestClient.get()
            .uri("/api/users/{id}", userId)
            .exchange()
            .expectStatus().isOk()
            .expectBody(User.class)
            .isEqualTo(user);
    }
    
    @Test
    void testGetUserByIdNotFound() {
        // Given
        String userId = "999";
        when(userService.findById(userId)).thenReturn(Mono.empty());
        
        // When & Then
        webTestClient.get()
            .uri("/api/users/{id}", userId)
            .exchange()
            .expectStatus().isNotFound();
    }
    
    @Test
    void testCreateUser() {
        // Given
        User userToCreate = new User(null, "New User", "new@example.com");
        User createdUser = new User("123", "New User", "new@example.com");
        when(userService.save(any(User.class))).thenReturn(Mono.just(createdUser));
        
        // When & Then
        webTestClient.post()
            .uri("/api/users")
            .bodyValue(userToCreate)
            .exchange()
            .expectStatus().isOk()
            .expectBody(User.class)
            .isEqualTo(createdUser);
    }
}
```

## 效能優化與最佳實踐

### 1. 適當的背壓策略

```java
// 根據情況選擇合適的背壓策略
public Flux<ProcessedData> processLargeDataset(Flux<RawData> input) {
    return input
        .onBackpressureBuffer(1000) // 適度緩衝
        .flatMap(this::processData, 10) // 限制並行度
        .onErrorContinue((error, item) -> {
            log.warn("處理項目 {} 時發生錯誤: {}", item, error.getMessage());
        });
}
```

### 2. 合理使用排程器

```java
@Service
public class OptimizedService {
    
    // CPU 密集型操作使用 parallel()
    public Mono<String> cpuIntensiveTask(String input) {
        return Mono.fromCallable(() -> {
            // 複雜計算
            return performComplexCalculation(input);
        }).subscribeOn(Schedulers.parallel());
    }
    
    // I/O 操作使用 boundedElastic()
    public Mono<String> ioTask(String filename) {
        return Mono.fromCallable(() -> {
            // 檔案讀取
            return readFromFile(filename);
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
```

### 3. 資源管理

```java
// 使用 using() 確保資源正確釋放
public Mono<String> processFileWithProperCleanup(String filename) {
    return Mono.using(
        () -> Files.newBufferedReader(Paths.get(filename)), // 資源供應商
        reader -> Mono.fromCallable(() -> {
            // 使用資源
            return reader.lines().collect(Collectors.joining("\n"));
        }).subscribeOn(Schedulers.boundedElastic()),
        reader -> {
            // 清理資源
            try {
                reader.close();
            } catch (IOException e) {
                log.warn("關閉檔案時發生錯誤", e);
            }
        }
    );
}
```

### 4. 快取策略

```java
@Service
public class CachedUserService {
    
    private final Cache<String, User> userCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(Duration.ofMinutes(10))
        .build();
    
    public Mono<User> getUserWithCache(String userId) {
        User cachedUser = userCache.getIfPresent(userId);
        if (cachedUser != null) {
            return Mono.just(cachedUser);
        }
        
        return userRepository.findById(userId)
            .doOnNext(user -> userCache.put(userId, user))
            .cache(Duration.ofMinutes(5)); // Reactor 層級快取
    }
}
```

## 監控與除錯

### 1. 日誌記錄

```java
public Flux<User> processUsers() {
    return userRepository.findAll()
        .doOnSubscribe(subscription -> log.info("開始處理用戶"))
        .doOnNext(user -> log.debug("處理用戶: {}", user.getId()))
        .doOnError(error -> log.error("處理過程中發生錯誤", error))
        .doOnComplete(() -> log.info("用戶處理完成"))
        .doFinally(signalType -> log.info("處理結束，信號類型: {}", signalType));
}
```

### 2. 度量收集

```java
@Component
public class MetricsService {
    
    private final MeterRegistry meterRegistry;
    private final Counter userProcessedCounter;
    private final Timer userProcessingTimer;
    
    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.userProcessedCounter = Counter.builder("users.processed")
            .description("處理的用戶數量")
            .register(meterRegistry);
        this.userProcessingTimer = Timer.builder("users.processing.time")
            .description("用戶處理時間")
            .register(meterRegistry);
    }
    
    public Mono<User> processUserWithMetrics(User user) {
        return Mono.fromCallable(() -> {
            // 處理邏輯
            return processUser(user);
        })
        .doOnNext(u -> userProcessedCounter.increment())
        .doOnSuccess(u -> userProcessingTimer.recordCallable(() -> {
            // 計時邏輯
            return u;
        }))
        .subscribeOn(Schedulers.boundedElastic());
    }
}
```

## 總結

Reactive Programming 為 Java 開發者提供了處理非同步、非阻塞程式設計的強大工具。透過 Project Reactor 和 Spring WebFlux，我們可以：

### 核心優勢

1. **高效能**：非阻塞 I/O 提升系統吞吐量
2. **可擴展性**：更好地利用系統資源
3. **彈性**：內建錯誤處理和恢復機制
4. **組合性**：豐富的操作符支援複雜的資料流處理

### 最佳實踐要點

1. **適當場景**：I/O 密集型應用程式最適合
2. **操作符選擇**：理解不同操作符的特性和適用場景
3. **錯誤處理**：設計完善的錯誤處理策略
4. **測試**：使用 StepVerifier 進行完整測試
5. **監控**：建立適當的日誌和度量機制

響應式程式設計雖然學習曲線較陡，但掌握後能顯著提升應用程式的效能和可維護性，特別適合現代微服務架構和雲端環境。

## 參考資料

- [Project Reactor 官方文檔](https://projectreactor.io/docs)
- [Spring WebFlux 參考指南](https://docs.spring.io/spring-framework/docs/current/reference/html/web-reactive.html)
- [Reactive Streams 規範](https://www.reactive-streams.org/)
- [R2DBC 響應式資料庫存取](https://r2dbc.io/)
- [Reactor 3 Reference Guide](https://projectreactor.io/docs/core/release/reference/)