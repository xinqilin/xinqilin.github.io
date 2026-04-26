---
title: "六角形架構（Ports & Adapters）實戰"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "以 Spring Boot 為例，實作六角形架構的 Domain、Application、Infrastructure 三層分離，解釋為何要分開 JPA Entity 與 Domain Entity"
categories: ["Architecture"]
tags: ["Architecture", "Hexagonal", "Clean Architecture", "DDD", "Spring Boot"]
---

## 核心概念

六角形架構（Hexagonal Architecture），又稱 Ports & Adapters，由 Alistair Cockburn 提出。

**核心原則**：應用程式核心（Domain + Application）不依賴任何基礎設施細節。資料庫、HTTP、Kafka 等都是「外部細節」，透過 Port（介面）與核心溝通。

```
               ┌─────────────────────────────────┐
  HTTP ───────►│  Input Adapter (Controller)     │
  Kafka ──────►│                                 │
               │  ┌───────────────────────────┐  │
               │  │  Application (Use Cases)  │  │
               │  │  ┌─────────────────────┐  │  │
               │  │  │    Domain           │  │  │
               │  │  │  (Pure Java)        │  │  │
               │  │  └─────────────────────┘  │  │
               │  └───────────────────────────┘  │
               │                                 │
               │  Output Adapter (Repository)    │───► MySQL
               │  Output Adapter (EventPublisher)│───► Kafka
               └─────────────────────────────────┘
```

依賴方向：**Adapters → Application → Domain**。Domain 不認識任何 Adapter。

---

## 三層職責

### Domain Layer

- 純 Java 類別，**不引入任何框架 annotation**
- 包含：Entity、Value Object、Domain Service、Repository Interface（Output Port）
- 這裡的 Entity 是領域概念，與 JPA Entity 完全無關

```java
// domain/User.java — 純 Java，無 @Entity
public class User {

    private final Long id;
    private final String email;
    private final String name;

    public User(Long id, String email, String name) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email: " + email);
        }
        this.id = id;
        this.email = email;
        this.name = name;
    }

    public User withName(String newName) {
        return new User(this.id, this.email, newName);
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
}
```

```java
// domain/UserRepository.java — Output Port（介面在 Domain 層）
public interface UserRepository {
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
    User save(User user);
}
```

### Application Layer（Use Cases）

- 編排 Domain 物件，定義業務流程
- 依賴 Domain 層的介面，不依賴 Infrastructure

```java
// application/CreateUserUseCase.java
public class CreateUserUseCase {

    private final UserRepository userRepository;
    private final UserEventPublisher eventPublisher;

    public CreateUserUseCase(UserRepository userRepository, UserEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    public User execute(CreateUserCommand command) {
        userRepository.findByEmail(command.email()).ifPresent(existing -> {
            throw new DuplicateEmailException(command.email());
        });
        User user = new User(null, command.email(), command.name());
        User saved = userRepository.save(user);
        eventPublisher.publish(new UserCreatedEvent(saved.getId(), saved.getEmail()));
        return saved;
    }
}
```

```java
// application/CreateUserCommand.java — Input DTO（record，不可變）
public record CreateUserCommand(String email, String name) {}
```

```java
// application/UserEventPublisher.java — Output Port
public interface UserEventPublisher {
    void publish(UserCreatedEvent event);
}
```

### Infrastructure Layer（Adapters）

依賴 Application 層定義的 Port，提供具體實作。

**Input Adapter（Controller）**：

```java
// infrastructure/web/UserController.java
@RestController
@RequestMapping("/users")
public class UserController {

    private final CreateUserUseCase createUserUseCase;

    public UserController(CreateUserUseCase createUserUseCase) {
        this.createUserUseCase = createUserUseCase;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponseDto create(@RequestBody @Valid UserRequestDto request) {
        CreateUserCommand command = new CreateUserCommand(request.email(), request.name());
        User user = createUserUseCase.execute(command);
        return new UserResponseDto(user.getId(), user.getEmail(), user.getName());
    }
}
```

**Output Adapter（Repository）**：

```java
// infrastructure/persistence/UserJpaEntity.java — JPA Entity，有 @Entity
@Entity
@Table(name = "users")
public class UserJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    // JPA 需要 no-arg constructor
    protected UserJpaEntity() {}

    public UserJpaEntity(Long id, String email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
    }

    // getters...
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
}
```

```java
// infrastructure/persistence/SpringDataUserRepository.java
@Repository
interface SpringDataUserRepository extends JpaRepository<UserJpaEntity, Long> {
    Optional<UserJpaEntity> findByEmail(String email);
}
```

```java
// infrastructure/persistence/UserRepositoryAdapter.java — 實作 Domain Port
@Component
public class UserRepositoryAdapter implements UserRepository {

    private final SpringDataUserRepository jpaRepository;

    public UserRepositoryAdapter(SpringDataUserRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<User> findById(Long id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(this::toDomain);
    }

    @Override
    public User save(User user) {
        UserJpaEntity entity = toJpa(user);
        UserJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    private User toDomain(UserJpaEntity entity) {
        return new User(entity.getId(), entity.getEmail(), entity.getName());
    }

    private UserJpaEntity toJpa(User user) {
        return new UserJpaEntity(user.getId(), user.getEmail(), user.getName());
    }
}
```

---

## 套件結構

```
com.example/
├── domain/
│   ├── User.java
│   ├── UserRepository.java          (Output Port — interface)
│   ├── UserEventPublisher.java      (Output Port — interface)
│   └── exception/
│       └── DuplicateEmailException.java
├── application/
│   ├── CreateUserUseCase.java
│   ├── UpdateUserUseCase.java
│   ├── CreateUserCommand.java       (record)
│   └── event/
│       └── UserCreatedEvent.java    (record)
└── infrastructure/
    ├── persistence/
    │   ├── UserJpaEntity.java
    │   ├── SpringDataUserRepository.java
    │   └── UserRepositoryAdapter.java
    ├── messaging/
    │   └── KafkaUserEventPublisher.java
    └── web/
        ├── UserController.java
        ├── UserRequestDto.java      (record)
        └── UserResponseDto.java     (record)
```

Spring Bean 組裝在 `infrastructure` 層（加 `@Configuration`），`application` 層的 Use Case 不需要 `@Service`，由 Spring 配置類注入。

---

## 為什麼要分開 JPA Entity 與 Domain Entity

JPA Entity 有以下污染 Domain 的需求：

| JPA 要求 | 對 Domain 的衝擊 |
|---------|----------------|
| `@Entity`, `@Table`, `@Column` | 引入 ORM 框架依賴 |
| 無參數建構子（protected/public）| Domain Entity 可能需要強制驗證欄位 |
| 可變欄位（Hibernate 需要 setter 或 field access）| 破壞不可變設計 |
| `@GeneratedValue` | ID 生成邏輯滲入 Domain |

將兩者分開，Domain Entity 可以是完全不可變的純 Java 物件，業務規則集中在一處，不受持久化框架影響。代價是需要 Mapper（`toDomain` / `toJpa`），對大型系統而言值得，對小型 CRUD 應用則可能過度。

---

## 與分層架構（3-tier）的差異

```
傳統三層架構依賴方向：
Controller → Service → Repository → DB

六角形架構依賴方向：
Controller ──┐
             ▼
           Use Case
             │
             ▼
           Domain (Port interface)
             ▲
             │
       Repository Adapter → DB
```

三層架構中，`Service` 直接依賴 `JpaRepository`，測試時必須 mock JPA。六角形架構中，Use Case 依賴的是純 Java 介面，測試可以用簡單的 in-memory 實作，完全不需要 Spring context。

```java
// Use Case 單元測試：不需要 Spring、不需要 DB
class CreateUserUseCaseTest {

    private final UserRepository userRepository = new InMemoryUserRepository();
    private final UserEventPublisher eventPublisher = new FakeUserEventPublisher();
    private final CreateUserUseCase useCase = new CreateUserUseCase(userRepository, eventPublisher);

    @Test
    void should_createUser_when_emailNotExists() {
        CreateUserCommand command = new CreateUserCommand("alice@example.com", "Alice");
        User result = useCase.execute(command);
        assertThat(result.getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void should_throwException_when_emailDuplicated() {
        userRepository.save(new User(null, "alice@example.com", "Alice"));
        CreateUserCommand command = new CreateUserCommand("alice@example.com", "Alice2");
        assertThatThrownBy(() -> useCase.execute(command))
            .isInstanceOf(DuplicateEmailException.class);
    }
}
```

---

## 取捨分析

| 面向 | 傳統三層 | 六角形架構 |
|------|---------|---------|
| 程式碼量 | 少 | 多（多了 Mapper、Adapter） |
| Domain 測試速度 | 慢（需 Spring context）| 快（純 Java unit test）|
| 技術細節污染 Domain | 有 | 無 |
| 適合規模 | 小型 CRUD | 中大型、複雜業務邏輯 |
| 學習曲線 | 低 | 中等 |

六角形架構的主要成本是 Mapper boilerplate，可用 MapStruct 自動生成，降低維護負擔。
