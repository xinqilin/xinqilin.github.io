---
title: "DesignPattern - Behavioral - Observer Pattern"
author: Bill.Lin
date: 2018-08-07T22:37:21+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
aliases:
  - /post/DesignPattern/Observer/

---

# Observer Pattern 觀察者模式

Observer Pattern 是行為型設計模式之一，它定義了一種一對多的依賴關係，當一個對象的狀態發生改變時，所有依賴於它的對象都會得到通知並被自動更新。

## 核心概念

觀察者模式建立了一種「發布-訂閱」(Publisher-Subscriber) 的關係，讓觀察者(Observer)能夠監聽主題(Subject)的狀態變化。當主題狀態發生改變時，它會自動通知所有註冊的觀察者。

### 主要組成部分

1. **Subject (主題)**: 維護觀察者列表，提供註冊/取消註冊介面
2. **Observer (觀察者)**: 定義接收通知的介面
3. **ConcreteSubject (具體主題)**: 實現主題介面，儲存狀態並通知觀察者
4. **ConcreteObserver (具體觀察者)**: 實現觀察者介面，處理通知

### 主要優勢

- **鬆耦合**: 主題和觀察者之間保持鬆耦合關係
- **動態關係**: 可以在運行時動態添加或移除觀察者
- **廣播通信**: 一個主題可以同時通知多個觀察者
- **開閉原則**: 新增觀察者類型無需修改現有代碼

## 1. 傳統 Observer 模式實現

### 基礎觀察者模式

```java
// 主題接口
public interface Subject<T> {
    void registerObserver(Observer<T> observer);
    void unregisterObserver(Observer<T> observer);
    void notifyObservers();
    void notifyObservers(T data);
}

// 觀察者接口
public interface Observer<T> {
    void update(T data);
    void update(Subject<T> subject);
}

// 抽象主題實現
public abstract class AbstractSubject<T> implements Subject<T> {
    private final List<Observer<T>> observers = new CopyOnWriteArrayList<>();
    private final Object lock = new Object();
    
    @Override
    public void registerObserver(Observer<T> observer) {
        if (observer == null) {
            throw new IllegalArgumentException("Observer cannot be null");
        }
        synchronized (lock) {
            if (!observers.contains(observer)) {
                observers.add(observer);
            }
        }
    }
    
    @Override
    public void unregisterObserver(Observer<T> observer) {
        synchronized (lock) {
            observers.remove(observer);
        }
    }
    
    @Override
    public void notifyObservers() {
        List<Observer<T>> currentObservers;
        synchronized (lock) {
            currentObservers = new ArrayList<>(observers);
        }
        
        for (Observer<T> observer : currentObservers) {
            try {
                observer.update(this);
            } catch (Exception e) {
                System.err.println("Observer notification failed: " + e.getMessage());
            }
        }
    }
    
    @Override
    public void notifyObservers(T data) {
        List<Observer<T>> currentObservers;
        synchronized (lock) {
            currentObservers = new ArrayList<>(observers);
        }
        
        for (Observer<T> observer : currentObservers) {
            try {
                observer.update(data);
            } catch (Exception e) {
                System.err.println("Observer notification failed: " + e.getMessage());
            }
        }
    }
    
    public int getObserverCount() {
        synchronized (lock) {
            return observers.size();
        }
    }
}
```

### 具體實現範例

```java
// 股票模型
public class Stock {
    private final String symbol;
    private BigDecimal price;
    private BigDecimal change;
    private LocalDateTime timestamp;
    
    public Stock(String symbol, BigDecimal price) {
        this.symbol = symbol;
        this.price = price;
        this.change = BigDecimal.ZERO;
        this.timestamp = LocalDateTime.now();
    }
    
    // getters and setters
    public String getSymbol() { return symbol; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getChange() { return change; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    public void updatePrice(BigDecimal newPrice) {
        this.change = newPrice.subtract(this.price);
        this.price = newPrice;
        this.timestamp = LocalDateTime.now();
    }
    
    @Override
    public String toString() {
        return String.format("Stock{symbol='%s', price=%s, change=%s, timestamp=%s}", 
            symbol, price, change, timestamp);
    }
}

// 股票價格主題
public class StockPrice extends AbstractSubject<Stock> {
    private Stock stock;
    
    public StockPrice(String symbol, BigDecimal initialPrice) {
        this.stock = new Stock(symbol, initialPrice);
    }
    
    public void updatePrice(BigDecimal newPrice) {
        stock.updatePrice(newPrice);
        notifyObservers(stock);
    }
    
    public Stock getStock() {
        return stock;
    }
}

// 股票顯示觀察者
public class StockDisplay implements Observer<Stock> {
    private final String displayName;
    
    public StockDisplay(String displayName) {
        this.displayName = displayName;
    }
    
    @Override
    public void update(Stock stock) {
        System.out.printf("[%s] 股票更新: %s%n", displayName, stock);
    }
    
    @Override
    public void update(Subject<Stock> subject) {
        if (subject instanceof StockPrice) {
            StockPrice stockPrice = (StockPrice) subject;
            update(stockPrice.getStock());
        }
    }
}

// 股票警報觀察者
public class StockAlert implements Observer<Stock> {
    private final BigDecimal threshold;
    private final String alertType;
    
    public StockAlert(BigDecimal threshold, String alertType) {
        this.threshold = threshold;
        this.alertType = alertType;
    }
    
    @Override
    public void update(Stock stock) {
        if ("HIGH".equals(alertType) && stock.getPrice().compareTo(threshold) > 0) {
            System.out.printf("🚨 高價警報: %s 超過 %s%n", stock.getSymbol(), threshold);
        } else if ("LOW".equals(alertType) && stock.getPrice().compareTo(threshold) < 0) {
            System.out.printf("🚨 低價警報: %s 低於 %s%n", stock.getSymbol(), threshold);
        }
    }
    
    @Override
    public void update(Subject<Stock> subject) {
        if (subject instanceof StockPrice) {
            StockPrice stockPrice = (StockPrice) subject;
            update(stockPrice.getStock());
        }
    }
}
```

### 基礎使用範例

```java
public class BasicObserverDemo {
    public static void main(String[] args) {
        // 創建股票價格主題
        StockPrice appleStock = new StockPrice("AAPL", BigDecimal.valueOf(150.00));
        
        // 創建觀察者
        StockDisplay mobileDisplay = new StockDisplay("手機應用");
        StockDisplay webDisplay = new StockDisplay("網頁版");
        StockAlert highAlert = new StockAlert(BigDecimal.valueOf(160.00), "HIGH");
        StockAlert lowAlert = new StockAlert(BigDecimal.valueOf(140.00), "LOW");
        
        // 註冊觀察者
        appleStock.registerObserver(mobileDisplay);
        appleStock.registerObserver(webDisplay);
        appleStock.registerObserver(highAlert);
        appleStock.registerObserver(lowAlert);
        
        System.out.println("=== 初始狀態 ===");
        System.out.println("觀察者數量: " + appleStock.getObserverCount());
        
        // 更新股票價格
        System.out.println("\n=== 價格上漲 ===");
        appleStock.updatePrice(BigDecimal.valueOf(155.50));
        
        System.out.println("\n=== 價格下跌 ===");
        appleStock.updatePrice(BigDecimal.valueOf(135.00));
        
        System.out.println("\n=== 價格大幅上漲 ===");
        appleStock.updatePrice(BigDecimal.valueOf(165.00));
        
        // 移除觀察者
        appleStock.unregisterObserver(webDisplay);
        System.out.println("\n=== 移除網頁顯示觀察者後 ===");
        appleStock.updatePrice(BigDecimal.valueOf(170.00));
    }
}
```

## 2. 現代 Java 觀察者模式

### 使用 Java 內建 Observable

```java
import java.util.Observable;
import java.util.Observer;

// 使用 Java 內建 Observable (已棄用，但仍可學習)
public class NewsAgency extends Observable {
    private String news;
    
    public void setNews(String news) {
        this.news = news;
        setChanged();
        notifyObservers(news);
    }
    
    public String getNews() {
        return news;
    }
}

// 使用 PropertyChangeSupport 的現代實現
public class ModernNewsAgency {
    private String news;
    private final PropertyChangeSupport support;
    
    public ModernNewsAgency() {
        this.support = new PropertyChangeSupport(this);
    }
    
    public void addPropertyChangeListener(PropertyChangeListener listener) {
        support.addPropertyChangeListener(listener);
    }
    
    public void removePropertyChangeListener(PropertyChangeListener listener) {
        support.removePropertyChangeListener(listener);
    }
    
    public void setNews(String news) {
        String oldNews = this.news;
        this.news = news;
        support.firePropertyChange("news", oldNews, news);
    }
    
    public String getNews() {
        return news;
    }
}
```

### 函數式觀察者模式

```java
// 函數式觀察者接口
@FunctionalInterface
public interface EventListener<T> {
    void onEvent(T event);
}

// 事件發布器
public class EventPublisher<T> {
    private final List<EventListener<T>> listeners = new CopyOnWriteArrayList<>();
    
    public void subscribe(EventListener<T> listener) {
        listeners.add(listener);
    }
    
    public void unsubscribe(EventListener<T> listener) {
        listeners.remove(listener);
    }
    
    public void publish(T event) {
        listeners.parallelStream().forEach(listener -> {
            try {
                listener.onEvent(event);
            } catch (Exception e) {
                System.err.println("Event listener failed: " + e.getMessage());
            }
        });
    }
}

// 使用範例
public class FunctionalObserverDemo {
    public static void main(String[] args) {
        EventPublisher<String> publisher = new EventPublisher<>();
        
        // 使用 Lambda 表達式
        publisher.subscribe(message -> System.out.println("電子郵件: " + message));
        publisher.subscribe(message -> System.out.println("簡訊: " + message));
        
        // 使用方法引用
        publisher.subscribe(System.out::println);
        
        // 發布事件
        publisher.publish("新文章發布!");
    }
}
```

## 3. Spring Boot 事件驅動架構

### Spring Events 基礎

```java
// 自定義事件
public class UserRegisteredEvent extends ApplicationEvent {
    private final User user;
    
    public UserRegisteredEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
    
    public User getUser() {
        return user;
    }
}

// 用戶模型
public class User {
    private final String id;
    private final String email;
    private final String name;
    private final LocalDateTime registeredAt;
    
    public User(String id, String email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.registeredAt = LocalDateTime.now();
    }
    
    // getters
    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public LocalDateTime getRegisteredAt() { return registeredAt; }
}

// 事件發布服務
@Service
public class UserService {
    private final ApplicationEventPublisher eventPublisher;
    
    public UserService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }
    
    public void registerUser(String email, String name) {
        // 用戶註冊邏輯
        String userId = UUID.randomUUID().toString();
        User user = new User(userId, email, name);
        
        // 保存用戶到數據庫
        saveUser(user);
        
        // 發布事件
        eventPublisher.publishEvent(new UserRegisteredEvent(this, user));
    }
    
    private void saveUser(User user) {
        // 模擬數據庫保存
        System.out.println("用戶已保存: " + user.getName());
    }
}
```

### Spring Event Listeners

```java
// 郵件服務事件監聽器
@Component
public class EmailNotificationListener {
    
    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        User user = event.getUser();
        sendWelcomeEmail(user);
    }
    
    @Async
    @EventListener
    public void handleUserRegisteredAsync(UserRegisteredEvent event) {
        User user = event.getUser();
        sendPromotionalEmail(user);
    }
    
    private void sendWelcomeEmail(User user) {
        System.out.println("發送歡迎郵件給: " + user.getEmail());
        // 實際郵件發送邏輯
    }
    
    private void sendPromotionalEmail(User user) {
        System.out.println("發送促銷郵件給: " + user.getEmail());
        // 實際郵件發送邏輯
    }
}

// 審計服務事件監聽器
@Component
public class AuditListener {
    
    @EventListener
    @Order(1) // 確保審計優先執行
    public void handleUserRegistered(UserRegisteredEvent event) {
        User user = event.getUser();
        logUserRegistration(user);
    }
    
    private void logUserRegistration(User user) {
        System.out.println("審計日誌 - 用戶註冊: " + user.getId() + 
                          " at " + user.getRegisteredAt());
    }
}

// 統計服務事件監聽器
@Component
public class StatisticsListener {
    private final AtomicLong registrationCount = new AtomicLong(0);
    
    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        long count = registrationCount.incrementAndGet();
        System.out.println("註冊用戶總數: " + count);
        
        // 更新統計數據
        updateRegistrationStats(event.getUser());
    }
    
    private void updateRegistrationStats(User user) {
        // 更新統計數據庫
        System.out.println("更新統計數據");
    }
}
```

### 條件事件監聽

```java
// 條件事件監聽器
@Component
public class ConditionalEventListener {
    
    @EventListener(condition = "#event.user.email.contains('admin')")
    public void handleAdminUserRegistered(UserRegisteredEvent event) {
        User user = event.getUser();
        System.out.println("管理員用戶註冊: " + user.getEmail());
        notifyAdminTeam(user);
    }
    
    @EventListener(condition = "#event.user.email.endsWith('.com')")
    public void handleComEmailRegistered(UserRegisteredEvent event) {
        User user = event.getUser();
        System.out.println("商業用戶註冊: " + user.getEmail());
    }
    
    private void notifyAdminTeam(User user) {
        System.out.println("通知管理員團隊: 新管理員用戶 " + user.getName());
    }
}
```

## 4. 響應式編程觀察者模式

### RxJava 響應式觀察者

```java
// 使用 RxJava 的響應式觀察者
public class RxObserverDemo {
    public static void main(String[] args) {
        // 創建 Observable
        Observable<String> newsObservable = Observable.create(emitter -> {
            // 模擬新聞發布
            emitter.onNext("突發新聞: 股市大漲");
            emitter.onNext("體育新聞: 世界杯開幕");
            emitter.onNext("科技新聞: 新 AI 技術發布");
            emitter.onComplete();
        });
        
        // 創建觀察者
        Observer<String> newsObserver = new Observer<String>() {
            @Override
            public void onSubscribe(Disposable d) {
                System.out.println("訂閱新聞服務");
            }
            
            @Override
            public void onNext(String news) {
                System.out.println("接收新聞: " + news);
            }
            
            @Override
            public void onError(Throwable e) {
                System.err.println("新聞接收錯誤: " + e.getMessage());
            }
            
            @Override
            public void onComplete() {
                System.out.println("新聞接收完成");
            }
        };
        
        // 訂閱
        newsObservable.subscribe(newsObserver);
        
        // 使用操作符進行轉換和過濾
        newsObservable
            .filter(news -> news.contains("股市"))
            .map(news -> news.toUpperCase())
            .subscribe(news -> System.out.println("股市新聞: " + news));
    }
}
```

### Project Reactor 響應式流

```java
// 使用 Project Reactor 的響應式流
@Service
public class ReactiveStockService {
    private final Flux<Stock> stockStream;
    
    public ReactiveStockService() {
        this.stockStream = Flux.interval(Duration.ofSeconds(1))
            .map(i -> generateRandomStock())
            .share(); // 共享流
    }
    
    private Stock generateRandomStock() {
        String[] symbols = {"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"};
        String symbol = symbols[new Random().nextInt(symbols.length)];
        BigDecimal price = BigDecimal.valueOf(100 + new Random().nextDouble() * 100);
        return new Stock(symbol, price);
    }
    
    public Flux<Stock> getStockStream() {
        return stockStream;
    }
    
    public Flux<Stock> getStockStream(String symbol) {
        return stockStream.filter(stock -> stock.getSymbol().equals(symbol));
    }
}

// 響應式控制器
@RestController
public class ReactiveStockController {
    private final ReactiveStockService stockService;
    
    public ReactiveStockController(ReactiveStockService stockService) {
        this.stockService = stockService;
    }
    
    @GetMapping(value = "/stocks/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Stock> streamStocks() {
        return stockService.getStockStream();
    }
    
    @GetMapping(value = "/stocks/{symbol}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Stock> streamStock(@PathVariable String symbol) {
        return stockService.getStockStream(symbol);
    }
}
```

## 5. 異步觀察者模式

### CompletableFuture 異步通知

```java
// 異步觀察者模式實現
public class AsyncObserverPattern {
    
    public static class AsyncSubject<T> {
        private final List<Function<T, CompletableFuture<Void>>> observers = new CopyOnWriteArrayList<>();
        private final Executor executor;
        
        public AsyncSubject(Executor executor) {
            this.executor = executor;
        }
        
        public void subscribe(Function<T, CompletableFuture<Void>> observer) {
            observers.add(observer);
        }
        
        public void unsubscribe(Function<T, CompletableFuture<Void>> observer) {
            observers.remove(observer);
        }
        
        public CompletableFuture<Void> notifyObservers(T data) {
            List<CompletableFuture<Void>> futures = observers.stream()
                .map(observer -> observer.apply(data))
                .collect(Collectors.toList());
            
            return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
        }
    }
    
    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(4);
        AsyncSubject<String> subject = new AsyncSubject<>(executor);
        
        // 註冊異步觀察者
        subject.subscribe(message -> 
            CompletableFuture.runAsync(() -> {
                System.out.println("觀察者 1 處理: " + message);
                try { Thread.sleep(1000); } catch (InterruptedException e) {}
                System.out.println("觀察者 1 完成");
            }, executor)
        );
        
        subject.subscribe(message -> 
            CompletableFuture.runAsync(() -> {
                System.out.println("觀察者 2 處理: " + message);
                try { Thread.sleep(500); } catch (InterruptedException e) {}
                System.out.println("觀察者 2 完成");
            }, executor)
        );
        
        // 發送通知
        subject.notifyObservers("異步消息")
            .thenRun(() -> System.out.println("所有觀察者處理完成"))
            .join();
        
        executor.shutdown();
    }
}
```

### 消息隊列觀察者模式

```java
// 使用消息隊列的觀察者模式
@Component
public class MessageQueueObserver {
    
    @RabbitListener(queues = "user.registered")
    public void handleUserRegistered(UserRegisteredEvent event) {
        System.out.println("從消息隊列接收用戶註冊事件: " + event.getUser().getName());
        
        // 處理業務邏輯
        processUserRegistration(event.getUser());
    }
    
    @RabbitListener(queues = "order.created")
    public void handleOrderCreated(OrderCreatedEvent event) {
        System.out.println("從消息隊列接收訂單創建事件: " + event.getOrderId());
        
        // 處理訂單邏輯
        processOrderCreation(event);
    }
    
    private void processUserRegistration(User user) {
        // 發送歡迎郵件
        // 更新統計數據
        // 觸發其他業務流程
    }
    
    private void processOrderCreation(OrderCreatedEvent event) {
        // 更新庫存
        // 發送確認郵件
        // 觸發配送流程
    }
}

// 訂單創建事件
public class OrderCreatedEvent {
    private final String orderId;
    private final String userId;
    private final BigDecimal amount;
    private final LocalDateTime createdAt;
    
    public OrderCreatedEvent(String orderId, String userId, BigDecimal amount) {
        this.orderId = orderId;
        this.userId = userId;
        this.amount = amount;
        this.createdAt = LocalDateTime.now();
    }
    
    // getters
    public String getOrderId() { return orderId; }
    public String getUserId() { return userId; }
    public BigDecimal getAmount() { return amount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

## 6. 事件溯源 (Event Sourcing)

### 事件溯源模式實現

```java
// 領域事件基類
public abstract class DomainEvent {
    private final String eventId;
    private final LocalDateTime occurredAt;
    private final String aggregateId;
    private final int version;
    
    public DomainEvent(String aggregateId, int version) {
        this.eventId = UUID.randomUUID().toString();
        this.occurredAt = LocalDateTime.now();
        this.aggregateId = aggregateId;
        this.version = version;
    }
    
    // getters
    public String getEventId() { return eventId; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public String getAggregateId() { return aggregateId; }
    public int getVersion() { return version; }
}

// 賬戶相關事件
public class AccountCreatedEvent extends DomainEvent {
    private final String accountHolderName;
    private final BigDecimal initialBalance;
    
    public AccountCreatedEvent(String aggregateId, int version, 
                             String accountHolderName, BigDecimal initialBalance) {
        super(aggregateId, version);
        this.accountHolderName = accountHolderName;
        this.initialBalance = initialBalance;
    }
    
    // getters
    public String getAccountHolderName() { return accountHolderName; }
    public BigDecimal getInitialBalance() { return initialBalance; }
}

public class MoneyDepositedEvent extends DomainEvent {
    private final BigDecimal amount;
    private final String description;
    
    public MoneyDepositedEvent(String aggregateId, int version, 
                             BigDecimal amount, String description) {
        super(aggregateId, version);
        this.amount = amount;
        this.description = description;
    }
    
    // getters
    public BigDecimal getAmount() { return amount; }
    public String getDescription() { return description; }
}

public class MoneyWithdrawnEvent extends DomainEvent {
    private final BigDecimal amount;
    private final String description;
    
    public MoneyWithdrawnEvent(String aggregateId, int version, 
                             BigDecimal amount, String description) {
        super(aggregateId, version);
        this.amount = amount;
        this.description = description;
    }
    
    // getters
    public BigDecimal getAmount() { return amount; }
    public String getDescription() { return description; }
}
```

### 事件存儲和重放

```java
// 事件存儲接口
public interface EventStore {
    void saveEvents(String aggregateId, List<DomainEvent> events, int expectedVersion);
    List<DomainEvent> getEventsForAggregate(String aggregateId);
}

// 內存事件存儲實現
@Component
public class InMemoryEventStore implements EventStore {
    private final Map<String, List<DomainEvent>> eventStore = new ConcurrentHashMap<>();
    
    @Override
    public void saveEvents(String aggregateId, List<DomainEvent> events, int expectedVersion) {
        List<DomainEvent> existingEvents = eventStore.computeIfAbsent(aggregateId, k -> new ArrayList<>());
        
        // 檢查版本衝突
        if (existingEvents.size() != expectedVersion) {
            throw new ConcurrencyException("Expected version " + expectedVersion + 
                                         " but was " + existingEvents.size());
        }
        
        existingEvents.addAll(events);
    }
    
    @Override
    public List<DomainEvent> getEventsForAggregate(String aggregateId) {
        return eventStore.getOrDefault(aggregateId, Collections.emptyList());
    }
}

// 賬戶聚合根
public class Account {
    private String accountId;
    private String accountHolderName;
    private BigDecimal balance;
    private int version;
    private List<DomainEvent> changes = new ArrayList<>();
    
    public Account() {}
    
    public Account(String accountId, String accountHolderName, BigDecimal initialBalance) {
        this.accountId = accountId;
        applyChange(new AccountCreatedEvent(accountId, 0, accountHolderName, initialBalance));
    }
    
    public void deposit(BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("存款金額必須大於零");
        }
        applyChange(new MoneyDepositedEvent(accountId, version, amount, description));
    }
    
    public void withdraw(BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("提款金額必須大於零");
        }
        if (balance.compareTo(amount) < 0) {
            throw new IllegalStateException("餘額不足");
        }
        applyChange(new MoneyWithdrawnEvent(accountId, version, amount, description));
    }
    
    private void applyChange(DomainEvent event) {
        applyChange(event, true);
    }
    
    private void applyChange(DomainEvent event, boolean isNew) {
        // 應用事件到聚合狀態
        if (event instanceof AccountCreatedEvent) {
            AccountCreatedEvent e = (AccountCreatedEvent) event;
            this.accountHolderName = e.getAccountHolderName();
            this.balance = e.getInitialBalance();
        } else if (event instanceof MoneyDepositedEvent) {
            MoneyDepositedEvent e = (MoneyDepositedEvent) event;
            this.balance = this.balance.add(e.getAmount());
        } else if (event instanceof MoneyWithdrawnEvent) {
            MoneyWithdrawnEvent e = (MoneyWithdrawnEvent) event;
            this.balance = this.balance.subtract(e.getAmount());
        }
        
        this.version = event.getVersion();
        
        if (isNew) {
            changes.add(event);
        }
    }
    
    public void loadFromHistory(List<DomainEvent> events) {
        for (DomainEvent event : events) {
            applyChange(event, false);
        }
    }
    
    public List<DomainEvent> getUncommittedChanges() {
        return new ArrayList<>(changes);
    }
    
    public void markChangesAsCommitted() {
        changes.clear();
    }
    
    // getters
    public String getAccountId() { return accountId; }
    public String getAccountHolderName() { return accountHolderName; }
    public BigDecimal getBalance() { return balance; }
    public int getVersion() { return version; }
}
```

### 事件處理器和投影

```java
// 事件處理器
@Component
public class AccountEventHandler {
    
    @EventListener
    public void handle(AccountCreatedEvent event) {
        System.out.println("帳戶已創建: " + event.getAccountHolderName() + 
                          ", 初始餘額: " + event.getInitialBalance());
        
        // 更新讀取模型
        updateAccountProjection(event);
    }
    
    @EventListener
    public void handle(MoneyDepositedEvent event) {
        System.out.println("存款: " + event.getAmount() + 
                          ", 描述: " + event.getDescription());
        
        // 更新讀取模型
        updateBalanceProjection(event);
    }
    
    @EventListener
    public void handle(MoneyWithdrawnEvent event) {
        System.out.println("提款: " + event.getAmount() + 
                          ", 描述: " + event.getDescription());
        
        // 更新讀取模型
        updateBalanceProjection(event);
    }
    
    private void updateAccountProjection(AccountCreatedEvent event) {
        // 更新帳戶投影表
        System.out.println("更新帳戶投影: " + event.getAggregateId());
    }
    
    private void updateBalanceProjection(DomainEvent event) {
        // 更新餘額投影表
        System.out.println("更新餘額投影: " + event.getAggregateId());
    }
}

// 自定義併發異常
public class ConcurrencyException extends RuntimeException {
    public ConcurrencyException(String message) {
        super(message);
    }
}
```

## 7. 企業級觀察者模式

### 分散式事件系統

```java
// 分散式事件發布器
@Component
public class DistributedEventPublisher {
    private final RabbitTemplate rabbitTemplate;
    private final ApplicationEventPublisher localEventPublisher;
    
    public DistributedEventPublisher(RabbitTemplate rabbitTemplate, 
                                   ApplicationEventPublisher localEventPublisher) {
        this.rabbitTemplate = rabbitTemplate;
        this.localEventPublisher = localEventPublisher;
    }
    
    public void publishEvent(DomainEvent event) {
        // 本地事件發布
        localEventPublisher.publishEvent(event);
        
        // 分散式事件發布
        publishToMessageQueue(event);
    }
    
    private void publishToMessageQueue(DomainEvent event) {
        try {
            String routingKey = event.getClass().getSimpleName();
            rabbitTemplate.convertAndSend("domain.events", routingKey, event);
        } catch (Exception e) {
            System.err.println("分散式事件發布失敗: " + e.getMessage());
        }
    }
}

// 事件總線配置
@Configuration
@EnableRabbit
public class EventBusConfiguration {
    
    @Bean
    public TopicExchange domainEventsExchange() {
        return new TopicExchange("domain.events");
    }
    
    @Bean
    public Queue userEventsQueue() {
        return QueueBuilder.durable("user.events").build();
    }
    
    @Bean
    public Queue orderEventsQueue() {
        return QueueBuilder.durable("order.events").build();
    }
    
    @Bean
    public Binding userEventsBinding() {
        return BindingBuilder.bind(userEventsQueue())
                           .to(domainEventsExchange())
                           .with("User*");
    }
    
    @Bean
    public Binding orderEventsBinding() {
        return BindingBuilder.bind(orderEventsQueue())
                           .to(domainEventsExchange())
                           .with("Order*");
    }
}
```

### 事件重試和錯誤處理

```java
// 可靠事件處理器
@Component
public class ReliableEventHandler {
    private final RetryTemplate retryTemplate;
    
    public ReliableEventHandler() {
        this.retryTemplate = RetryTemplate.builder()
            .maxAttempts(3)
            .fixedBackoff(1000)
            .retryOn(Exception.class)
            .build();
    }
    
    @RabbitListener(queues = "user.events")
    public void handleUserEvent(UserRegisteredEvent event) {
        retryTemplate.execute(context -> {
            processUserEvent(event);
            return null;
        });
    }
    
    @Retryable(value = Exception.class, maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void processUserEvent(UserRegisteredEvent event) {
        // 模擬可能失敗的操作
        if (Math.random() < 0.3) {
            throw new RuntimeException("處理失敗");
        }
        
        System.out.println("成功處理用戶事件: " + event.getUser().getName());
    }
    
    @Recover
    public void recover(Exception e, UserRegisteredEvent event) {
        System.err.println("用戶事件處理最終失敗: " + e.getMessage());
        // 將失敗事件送到死信隊列或記錄到錯誤日誌
        handleFailedEvent(event, e);
    }
    
    private void handleFailedEvent(UserRegisteredEvent event, Exception e) {
        // 記錄失敗事件
        System.err.println("記錄失敗事件: " + event.getUser().getName());
    }
}
```

## 8. 觀察者模式的最佳實踐

### 性能優化

```java
// 高性能觀察者模式實現
public class HighPerformanceObserver {
    
    // 使用 Disruptor 的高性能事件處理
    public static class DisruptorEventPublisher {
        private final RingBuffer<EventWrapper> ringBuffer;
        private final Disruptor<EventWrapper> disruptor;
        
        public DisruptorEventPublisher() {
            this.disruptor = new Disruptor<>(EventWrapper::new, 1024, 
                                           Executors.defaultThreadFactory());
            this.ringBuffer = disruptor.getRingBuffer();
            
            // 註冊事件處理器
            disruptor.handleEventsWith(new EventHandler<EventWrapper>() {
                @Override
                public void onEvent(EventWrapper event, long sequence, boolean endOfBatch) {
                    // 處理事件
                    System.out.println("處理事件: " + event.getData());
                }
            });
            
            disruptor.start();
        }
        
        public void publishEvent(String data) {
            long sequence = ringBuffer.next();
            try {
                EventWrapper event = ringBuffer.get(sequence);
                event.setData(data);
            } finally {
                ringBuffer.publish(sequence);
            }
        }
        
        public void shutdown() {
            disruptor.shutdown();
        }
    }
    
    public static class EventWrapper {
        private String data;
        
        public String getData() { return data; }
        public void setData(String data) { this.data = data; }
    }
}
```

### 測試策略

```java
@ExtendWith(MockitoExtension.class)
class ObserverPatternTest {
    
    @Test
    void shouldNotifyAllObservers() {
        // Given
        StockPrice stockPrice = new StockPrice("AAPL", BigDecimal.valueOf(150.00));
        StockDisplay display1 = mock(StockDisplay.class);
        StockDisplay display2 = mock(StockDisplay.class);
        
        stockPrice.registerObserver(display1);
        stockPrice.registerObserver(display2);
        
        // When
        stockPrice.updatePrice(BigDecimal.valueOf(155.00));
        
        // Then
        verify(display1).update(any(Stock.class));
        verify(display2).update(any(Stock.class));
    }
    
    @Test
    void shouldHandleObserverExceptions() {
        // Given
        StockPrice stockPrice = new StockPrice("AAPL", BigDecimal.valueOf(150.00));
        Observer<Stock> faultyObserver = mock(Observer.class);
        Observer<Stock> normalObserver = mock(Observer.class);
        
        doThrow(new RuntimeException("Observer failed")).when(faultyObserver).update(any(Stock.class));
        
        stockPrice.registerObserver(faultyObserver);
        stockPrice.registerObserver(normalObserver);
        
        // When
        stockPrice.updatePrice(BigDecimal.valueOf(155.00));
        
        // Then
        verify(faultyObserver).update(any(Stock.class));
        verify(normalObserver).update(any(Stock.class)); // 應該仍然被調用
    }
}

// Spring Boot 集成測試
@SpringBootTest
@TestPropertySource(properties = {
    "spring.rabbitmq.host=localhost",
    "spring.rabbitmq.port=5672"
})
class SpringEventIntegrationTest {
    
    @Autowired
    private UserService userService;
    
    @MockBean
    private EmailNotificationListener emailListener;
    
    @Test
    void shouldPublishUserRegisteredEvent() {
        // When
        userService.registerUser("test@example.com", "Test User");
        
        // Then
        verify(emailListener, timeout(1000)).handleUserRegistered(any(UserRegisteredEvent.class));
    }
}
```

## 9. 總結

### 適用場景

1. **狀態變化通知**: 當對象狀態改變需要通知多個依賴對象
2. **事件驅動架構**: 構建鬆耦合的事件驅動系統
3. **發布-訂閱模式**: 實現消息的發布和訂閱機制
4. **模型-視圖分離**: 在 MVC 架構中分離模型和視圖

### 關鍵要點

- **鬆耦合**: 主題和觀察者之間保持鬆耦合
- **動態訂閱**: 支持運行時動態添加和移除觀察者
- **廣播通信**: 一對多的通信機制
- **異常處理**: 確保單個觀察者異常不影響其他觀察者

### 現代實踐

- **Spring Events**: 利用 Spring 框架的事件機制
- **響應式編程**: 使用 RxJava 或 Project Reactor
- **消息隊列**: 通過 RabbitMQ、Kafka 等實現分散式觀察者
- **事件溯源**: 構建基於事件的系統架構

### 性能考慮

- **並發安全**: 使用線程安全的觀察者列表
- **異步處理**: 避免阻塞主線程
- **批量處理**: 對大量事件進行批量處理
- **錯誤隔離**: 確保單個觀察者異常不影響系統

觀察者模式是構建現代企業級應用的重要設計模式，特別是在微服務架構和事件驅動系統中。結合 Spring Boot 和響應式編程，可以構建出高度可擴展和maintainable的系統。