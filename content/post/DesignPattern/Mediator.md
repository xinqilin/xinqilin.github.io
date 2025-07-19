---
title: "DesignPattern - Behavioral - Mediator"
author: Bill.Lin
date: 2018-08-07T22:36:43+08:00
draft: false
tags: ["Design Pattern", "Behavioral Pattern", "Mediator", "Spring Events", "Message Broker", "Enterprise Communication"]
Description: "深入探討 Mediator 模式：從基本實現到企業級應用，包含 Spring Events、消息代理、事件驅動架構等現代化通信模式"
Categories: ["DesignPattern"]
DisableComments: false
---

# Mediator 模式 - 企業級通信與事件驅動架構

## 模式概述

Mediator（中介者）模式是一種行為型設計模式，用於定義對象之間的交互方式。它透過引入一個中介者對象來封裝一系列對象之間的交互，使得這些對象不需要顯式地相互引用，從而實現鬆散耦合。

### 核心概念

**中介者（Mediator）**：
- 定義對象之間的交互介面
- 封裝對象間的交互邏輯
- 維護各個對象的引用

**同事類（Colleague）**：
- 業務邏輯的實際執行者
- 透過中介者與其他對象交互
- 不直接引用其他同事對象

## 使用場景

### 適用條件
- 對象之間存在複雜的交互關係
- 需要減少對象間的直接耦合
- 系統需要集中管理對象間的通信
- 行為分佈在多個類中且需要可定制

### 實際應用場景
- 用戶界面組件間的交互
- 微服務間的通信協調
- 工作流程管理系統
- 事件驅動架構
- 聊天室系統

## 基本實現

### 1. 中介者介面

```java
/**
 * 中介者介面定義了同事對象之間的通信契約
 */
public interface Mediator {
    /**
     * 註冊同事對象
     * @param colleague 同事對象
     */
    void registerColleague(Colleague colleague);
    
    /**
     * 處理同事對象的請求
     * @param colleague 發起請求的同事對象
     * @param message 請求消息
     */
    void handleRequest(Colleague colleague, String message);
    
    /**
     * 廣播消息給所有註冊的同事對象
     * @param message 廣播消息
     * @param sender 發送者（可選，用於排除自己）
     */
    void broadcast(String message, Colleague sender);
}
```

### 2. 抽象同事類

```java
/**
 * 抽象同事類定義了與中介者交互的基本行為
 */
public abstract class Colleague {
    protected Mediator mediator;
    protected String name;
    
    public Colleague(Mediator mediator, String name) {
        this.mediator = mediator;
        this.name = name;
        mediator.registerColleague(this);
    }
    
    /**
     * 發送消息給中介者
     * @param message 消息內容
     */
    public void sendMessage(String message) {
        mediator.handleRequest(this, message);
    }
    
    /**
     * 接收來自中介者的消息
     * @param message 消息內容
     */
    public abstract void receiveMessage(String message);
    
    /**
     * 執行特定業務邏輯
     */
    public abstract void doWork();
    
    public String getName() {
        return name;
    }
}
```

### 3. 具體中介者實現

```java
/**
 * 具體中介者實現
 */
public class ConcreteMediator implements Mediator {
    private final List<Colleague> colleagues = new CopyOnWriteArrayList<>();
    private final Map<String, List<Colleague>> topicSubscribers = new ConcurrentHashMap<>();
    private final AtomicLong messageId = new AtomicLong(0);
    
    @Override
    public void registerColleague(Colleague colleague) {
        colleagues.add(colleague);
        System.out.println("註冊同事: " + colleague.getName());
    }
    
    @Override
    public void handleRequest(Colleague colleague, String message) {
        long id = messageId.incrementAndGet();
        System.out.println("中介者處理請求 [" + id + "] 來自 " + colleague.getName() + ": " + message);
        
        // 根據消息類型進行路由
        if (message.startsWith("BROADCAST:")) {
            String content = message.substring("BROADCAST:".length());
            broadcast(content, colleague);
        } else if (message.startsWith("TOPIC:")) {
            handleTopicMessage(message, colleague);
        } else {
            // 默認處理邏輯
            processDefaultMessage(colleague, message);
        }
    }
    
    @Override
    public void broadcast(String message, Colleague sender) {
        System.out.println("廣播消息: " + message);
        colleagues.parallelStream()
                  .filter(colleague -> colleague != sender)
                  .forEach(colleague -> {
                      try {
                          colleague.receiveMessage(message);
                      } catch (Exception e) {
                          System.err.println("發送消息到 " + colleague.getName() + " 失敗: " + e.getMessage());
                      }
                  });
    }
    
    private void handleTopicMessage(String message, Colleague sender) {
        // 解析主題消息：TOPIC:topicName:content
        String[] parts = message.split(":", 3);
        if (parts.length >= 3) {
            String topic = parts[1];
            String content = parts[2];
            
            List<Colleague> subscribers = topicSubscribers.get(topic);
            if (subscribers != null) {
                subscribers.parallelStream()
                          .filter(colleague -> colleague != sender)
                          .forEach(colleague -> colleague.receiveMessage(content));
            }
        }
    }
    
    private void processDefaultMessage(Colleague sender, String message) {
        // 預設處理邏輯：轉發給所有其他同事
        broadcast(message, sender);
    }
    
    public void subscribe(String topic, Colleague colleague) {
        topicSubscribers.computeIfAbsent(topic, k -> new CopyOnWriteArrayList<>()).add(colleague);
        System.out.println(colleague.getName() + " 訂閱主題: " + topic);
    }
    
    public void unsubscribe(String topic, Colleague colleague) {
        List<Colleague> subscribers = topicSubscribers.get(topic);
        if (subscribers != null) {
            subscribers.remove(colleague);
            System.out.println(colleague.getName() + " 取消訂閱主題: " + topic);
        }
    }
    
    public void printStatistics() {
        System.out.println("\n=== 中介者統計 ===");
        System.out.println("註冊同事數量: " + colleagues.size());
        System.out.println("處理消息數量: " + messageId.get());
        System.out.println("主題訂閱數量: " + topicSubscribers.size());
        topicSubscribers.forEach((topic, subscribers) -> 
            System.out.println("  主題 " + topic + ": " + subscribers.size() + " 個訂閱者"));
    }
}
```

### 4. 具體同事類實現

```java
/**
 * 用戶同事類
 */
public class UserColleague extends Colleague {
    private final String role;
    
    public UserColleague(Mediator mediator, String name, String role) {
        super(mediator, name);
        this.role = role;
    }
    
    @Override
    public void receiveMessage(String message) {
        System.out.println("[" + role + "] " + name + " 收到消息: " + message);
    }
    
    @Override
    public void doWork() {
        String workMessage = "執行 " + role + " 工作";
        System.out.println(name + " 開始工作: " + workMessage);
        sendMessage(workMessage);
    }
    
    public void sendBroadcast(String message) {
        sendMessage("BROADCAST:" + message);
    }
    
    public void sendTopicMessage(String topic, String message) {
        sendMessage("TOPIC:" + topic + ":" + message);
    }
}

/**
 * 服務同事類
 */
public class ServiceColleague extends Colleague {
    private final String serviceType;
    
    public ServiceColleague(Mediator mediator, String name, String serviceType) {
        super(mediator, name);
        this.serviceType = serviceType;
    }
    
    @Override
    public void receiveMessage(String message) {
        System.out.println("[" + serviceType + " 服務] " + name + " 處理: " + message);
        
        // 模擬服務處理邏輯
        if (message.contains("請求")) {
            sendMessage("回應: " + message + " 已處理");
        }
    }
    
    @Override
    public void doWork() {
        String serviceMessage = "提供 " + serviceType + " 服務";
        System.out.println(name + " 啟動服務: " + serviceMessage);
        sendMessage(serviceMessage);
    }
}
```

### 5. 使用示例

```java
/**
 * 中介者模式使用示例
 */
public class MediatorExample {
    
    public static void main(String[] args) {
        // 創建中介者
        ConcreteMediator mediator = new ConcreteMediator();
        
        // 創建同事對象
        UserColleague admin = new UserColleague(mediator, "Admin", "管理員");
        UserColleague user1 = new UserColleague(mediator, "User1", "一般用戶");
        UserColleague user2 = new UserColleague(mediator, "User2", "VIP用戶");
        ServiceColleague authService = new ServiceColleague(mediator, "AuthService", "認證");
        ServiceColleague logService = new ServiceColleague(mediator, "LogService", "日誌");
        
        // 主題訂閱
        mediator.subscribe("系統通知", admin);
        mediator.subscribe("系統通知", user1);
        mediator.subscribe("認證事件", authService);
        mediator.subscribe("認證事件", logService);
        
        System.out.println("\n=== 開始通信示例 ===");
        
        // 1. 廣播消息
        admin.sendBroadcast("系統維護通知：明天凌晨 2:00-4:00 進行系統維護");
        
        // 2. 主題消息
        user1.sendTopicMessage("系統通知", "用戶登錄");
        authService.sendTopicMessage("認證事件", "用戶認證成功");
        
        // 3. 一般消息
        user2.sendMessage("請求查看個人資料");
        
        // 4. 執行工作
        admin.doWork();
        authService.doWork();
        
        // 5. 顯示統計
        mediator.printStatistics();
    }
}
```

## Spring Events 整合

### 1. Spring 事件驅動中介者

```java
/**
 * Spring 事件驅動中介者
 */
@Component
public class SpringEventMediator implements Mediator, ApplicationEventPublisherAware {
    private ApplicationEventPublisher eventPublisher;
    private final List<Colleague> colleagues = new CopyOnWriteArrayList<>();
    
    @Override
    public void setApplicationEventPublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }
    
    @Override
    public void registerColleague(Colleague colleague) {
        colleagues.add(colleague);
        // 發布註冊事件
        eventPublisher.publishEvent(new ColleagueRegisteredEvent(colleague));
    }
    
    @Override
    public void handleRequest(Colleague colleague, String message) {
        // 創建並發布消息事件
        MessageEvent event = new MessageEvent(colleague, message);
        eventPublisher.publishEvent(event);
    }
    
    @Override
    public void broadcast(String message, Colleague sender) {
        // 發布廣播事件
        BroadcastEvent event = new BroadcastEvent(sender, message);
        eventPublisher.publishEvent(event);
    }
    
    @EventListener
    public void handleColleagueRegistered(ColleagueRegisteredEvent event) {
        System.out.println("Spring 事件：同事註冊 - " + event.getColleague().getName());
    }
    
    @EventListener
    @Async
    public void handleMessageEvent(MessageEvent event) {
        System.out.println("Spring 事件：處理消息 - " + 
                          event.getSender().getName() + ": " + event.getMessage());
        
        // 處理特定類型的消息
        if (event.getMessage().startsWith("URGENT:")) {
            handleUrgentMessage(event);
        } else if (event.getMessage().startsWith("AUDIT:")) {
            handleAuditMessage(event);
        }
    }
    
    @EventListener
    @Async
    public void handleBroadcastEvent(BroadcastEvent event) {
        System.out.println("Spring 事件：廣播消息 - " + event.getMessage());
        
        colleagues.parallelStream()
                  .filter(colleague -> colleague != event.getSender())
                  .forEach(colleague -> {
                      try {
                          colleague.receiveMessage(event.getMessage());
                      } catch (Exception e) {
                          System.err.println("廣播失敗: " + e.getMessage());
                      }
                  });
    }
    
    private void handleUrgentMessage(MessageEvent event) {
        // 處理緊急消息
        String urgentContent = event.getMessage().substring("URGENT:".length());
        eventPublisher.publishEvent(new UrgentMessageEvent(event.getSender(), urgentContent));
    }
    
    private void handleAuditMessage(MessageEvent event) {
        // 處理審計消息
        String auditContent = event.getMessage().substring("AUDIT:".length());
        eventPublisher.publishEvent(new AuditEvent(event.getSender(), auditContent));
    }
}
```

### 2. Spring 事件定義

```java
/**
 * 基礎消息事件
 */
public class MessageEvent extends ApplicationEvent {
    private final Colleague sender;
    private final String message;
    private final LocalDateTime timestamp;
    
    public MessageEvent(Colleague sender, String message) {
        super(sender);
        this.sender = sender;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
    
    public Colleague getSender() { return sender; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

/**
 * 廣播事件
 */
public class BroadcastEvent extends ApplicationEvent {
    private final Colleague sender;
    private final String message;
    
    public BroadcastEvent(Colleague sender, String message) {
        super(sender);
        this.sender = sender;
        this.message = message;
    }
    
    public Colleague getSender() { return sender; }
    public String getMessage() { return message; }
}

/**
 * 同事註冊事件
 */
public class ColleagueRegisteredEvent extends ApplicationEvent {
    private final Colleague colleague;
    
    public ColleagueRegisteredEvent(Colleague colleague) {
        super(colleague);
        this.colleague = colleague;
    }
    
    public Colleague getColleague() { return colleague; }
}

/**
 * 緊急消息事件
 */
public class UrgentMessageEvent extends ApplicationEvent {
    private final Colleague sender;
    private final String message;
    private final int priority;
    
    public UrgentMessageEvent(Colleague sender, String message) {
        super(sender);
        this.sender = sender;
        this.message = message;
        this.priority = 1; // 最高優先級
    }
    
    public Colleague getSender() { return sender; }
    public String getMessage() { return message; }
    public int getPriority() { return priority; }
}

/**
 * 審計事件
 */
public class AuditEvent extends ApplicationEvent {
    private final Colleague sender;
    private final String action;
    private final LocalDateTime timestamp;
    
    public AuditEvent(Colleague sender, String action) {
        super(sender);
        this.sender = sender;
        this.action = action;
        this.timestamp = LocalDateTime.now();
    }
    
    public Colleague getSender() { return sender; }
    public String getAction() { return action; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
```

### 3. Spring 事件監聽器

```java
/**
 * 審計事件監聽器
 */
@Component
public class AuditEventListener {
    
    @EventListener
    @Async
    public void handleAuditEvent(AuditEvent event) {
        System.out.println("審計日誌: " + event.getTimestamp() + 
                          " - " + event.getSender().getName() + 
                          " 執行: " + event.getAction());
        
        // 保存到審計資料庫
        saveAuditLog(event);
    }
    
    private void saveAuditLog(AuditEvent event) {
        // 模擬保存審計日誌
        System.out.println("保存審計日誌到資料庫...");
    }
}

/**
 * 緊急消息監聽器
 */
@Component
public class UrgentMessageListener {
    
    @EventListener
    @Order(1) // 高優先級處理
    public void handleUrgentMessage(UrgentMessageEvent event) {
        System.out.println("🚨 緊急消息處理: " + event.getMessage());
        
        // 發送通知
        sendNotification(event);
        
        // 記錄緊急事件
        logUrgentEvent(event);
    }
    
    private void sendNotification(UrgentMessageEvent event) {
        // 模擬發送通知（短信、郵件等）
        System.out.println("發送緊急通知: " + event.getMessage());
    }
    
    private void logUrgentEvent(UrgentMessageEvent event) {
        // 記錄緊急事件
        System.out.println("記錄緊急事件: " + event.getSender().getName() + " - " + event.getMessage());
    }
}
```

### 4. Spring Boot 配置

```java
/**
 * Spring Boot 異步配置
 */
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mediator-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}

/**
 * 中介者配置
 */
@Configuration
public class MediatorConfig {
    
    @Bean
    public Mediator mediator() {
        return new SpringEventMediator();
    }
    
    @Bean
    @ConditionalOnProperty(name = "mediator.metrics.enabled", havingValue = "true")
    public MediatorMetrics mediatorMetrics() {
        return new MediatorMetrics();
    }
}
```

## 消息代理模式

### 1. RabbitMQ 中介者實現

```java
/**
 * RabbitMQ 中介者配置
 */
@Configuration
@EnableRabbit
public class RabbitMediatorConfig {
    
    public static final String MEDIATOR_EXCHANGE = "mediator.exchange";
    public static final String BROADCAST_QUEUE = "broadcast.queue";
    public static final String TOPIC_QUEUE = "topic.queue";
    public static final String URGENT_QUEUE = "urgent.queue";
    public static final String AUDIT_QUEUE = "audit.queue";
    
    @Bean
    public TopicExchange mediatorExchange() {
        return new TopicExchange(MEDIATOR_EXCHANGE);
    }
    
    @Bean
    public Queue broadcastQueue() {
        return QueueBuilder.durable(BROADCAST_QUEUE).build();
    }
    
    @Bean
    public Queue topicQueue() {
        return QueueBuilder.durable(TOPIC_QUEUE).build();
    }
    
    @Bean
    public Queue urgentQueue() {
        return QueueBuilder.durable(URGENT_QUEUE)
                          .withArgument("x-message-ttl", 5000) // 5秒 TTL
                          .build();
    }
    
    @Bean
    public Queue auditQueue() {
        return QueueBuilder.durable(AUDIT_QUEUE)
                          .withArgument("x-dead-letter-exchange", "dlx.exchange")
                          .build();
    }
    
    @Bean
    public Binding broadcastBinding() {
        return BindingBuilder.bind(broadcastQueue())
                           .to(mediatorExchange())
                           .with("broadcast.*");
    }
    
    @Bean
    public Binding topicBinding() {
        return BindingBuilder.bind(topicQueue())
                           .to(mediatorExchange())
                           .with("topic.*");
    }
    
    @Bean
    public Binding urgentBinding() {
        return BindingBuilder.bind(urgentQueue())
                           .to(mediatorExchange())
                           .with("urgent.*");
    }
    
    @Bean
    public Binding auditBinding() {
        return BindingBuilder.bind(auditQueue())
                           .to(mediatorExchange())
                           .with("audit.*");
    }
    
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (ack) {
                System.out.println("消息發送成功: " + correlationData);
            } else {
                System.err.println("消息發送失敗: " + cause);
            }
        });
        return template;
    }
}
```

### 2. RabbitMQ 中介者實現

```java
/**
 * RabbitMQ 中介者實現
 */
@Component
public class RabbitMqMediator implements Mediator {
    private final RabbitTemplate rabbitTemplate;
    private final List<Colleague> colleagues = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper;
    
    public RabbitMqMediator(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = new ObjectMapper();
    }
    
    @Override
    public void registerColleague(Colleague colleague) {
        colleagues.add(colleague);
        
        // 發布註冊事件到 RabbitMQ
        MediatorMessage message = new MediatorMessage(
            colleague.getName(),
            "REGISTER",
            "同事註冊: " + colleague.getName(),
            LocalDateTime.now()
        );
        
        rabbitTemplate.convertAndSend(
            RabbitMediatorConfig.MEDIATOR_EXCHANGE,
            "audit.register",
            message
        );
        
        System.out.println("註冊同事到 RabbitMQ: " + colleague.getName());
    }
    
    @Override
    public void handleRequest(Colleague colleague, String message) {
        MediatorMessage mediatorMessage = new MediatorMessage(
            colleague.getName(),
            "REQUEST",
            message,
            LocalDateTime.now()
        );
        
        // 根據消息類型路由到不同的隊列
        String routingKey = determineRoutingKey(message);
        
        rabbitTemplate.convertAndSend(
            RabbitMediatorConfig.MEDIATOR_EXCHANGE,
            routingKey,
            mediatorMessage
        );
        
        System.out.println("發送消息到 RabbitMQ: " + routingKey + " - " + message);
    }
    
    @Override
    public void broadcast(String message, Colleague sender) {
        MediatorMessage mediatorMessage = new MediatorMessage(
            sender.getName(),
            "BROADCAST",
            message,
            LocalDateTime.now()
        );
        
        rabbitTemplate.convertAndSend(
            RabbitMediatorConfig.MEDIATOR_EXCHANGE,
            "broadcast.all",
            mediatorMessage
        );
        
        System.out.println("廣播消息到 RabbitMQ: " + message);
    }
    
    private String determineRoutingKey(String message) {
        if (message.startsWith("URGENT:")) {
            return "urgent.high";
        } else if (message.startsWith("AUDIT:")) {
            return "audit.log";
        } else if (message.startsWith("TOPIC:")) {
            return "topic.message";
        } else if (message.startsWith("BROADCAST:")) {
            return "broadcast.all";
        }
        return "topic.default";
    }
}
```

### 3. 消息處理器

```java
/**
 * RabbitMQ 消息監聽器
 */
@Component
public class RabbitMqMessageListener {
    
    @RabbitListener(queues = RabbitMediatorConfig.BROADCAST_QUEUE)
    public void handleBroadcastMessage(MediatorMessage message) {
        System.out.println("處理廣播消息: " + message.getContent());
        
        // 廣播給所有本地註冊的同事
        broadcastToLocalColleagues(message);
    }
    
    @RabbitListener(queues = RabbitMediatorConfig.TOPIC_QUEUE)
    public void handleTopicMessage(MediatorMessage message) {
        System.out.println("處理主題消息: " + message.getContent());
        
        // 根據主題路由消息
        routeTopicMessage(message);
    }
    
    @RabbitListener(queues = RabbitMediatorConfig.URGENT_QUEUE)
    public void handleUrgentMessage(MediatorMessage message) {
        System.out.println("🚨 處理緊急消息: " + message.getContent());
        
        // 立即處理緊急消息
        processUrgentMessage(message);
    }
    
    @RabbitListener(queues = RabbitMediatorConfig.AUDIT_QUEUE)
    public void handleAuditMessage(MediatorMessage message) {
        System.out.println("📝 處理審計消息: " + message.getContent());
        
        // 記錄審計日誌
        saveAuditLog(message);
    }
    
    private void broadcastToLocalColleagues(MediatorMessage message) {
        // 實現廣播邏輯
        System.out.println("廣播到本地同事: " + message.getContent());
    }
    
    private void routeTopicMessage(MediatorMessage message) {
        // 實現主題路由邏輯
        System.out.println("主題路由: " + message.getContent());
    }
    
    private void processUrgentMessage(MediatorMessage message) {
        // 實現緊急消息處理邏輯
        System.out.println("緊急處理: " + message.getContent());
    }
    
    private void saveAuditLog(MediatorMessage message) {
        // 實現審計日誌保存邏輯
        System.out.println("保存審計日誌: " + message.getContent());
    }
}
```

### 4. 消息模型

```java
/**
 * 中介者消息模型
 */
public class MediatorMessage {
    private String sender;
    private String type;
    private String content;
    private LocalDateTime timestamp;
    private Map<String, Object> metadata;
    
    public MediatorMessage() {
        this.metadata = new HashMap<>();
    }
    
    public MediatorMessage(String sender, String type, String content, LocalDateTime timestamp) {
        this.sender = sender;
        this.type = type;
        this.content = content;
        this.timestamp = timestamp;
        this.metadata = new HashMap<>();
    }
    
    // Getters and setters
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    
    public void addMetadata(String key, Object value) {
        this.metadata.put(key, value);
    }
}
```

## 微服務通信模式

### 1. 微服務中介者

```java
/**
 * 微服務中介者實現
 */
@Component
public class MicroserviceMediator {
    private final RestTemplate restTemplate;
    private final LoadBalancerClient loadBalancer;
    private final CircuitBreaker circuitBreaker;
    private final ServiceRegistry serviceRegistry;
    
    public MicroserviceMediator(RestTemplate restTemplate,
                               LoadBalancerClient loadBalancer,
                               CircuitBreaker circuitBreaker,
                               ServiceRegistry serviceRegistry) {
        this.restTemplate = restTemplate;
        this.loadBalancer = loadBalancer;
        this.circuitBreaker = circuitBreaker;
        this.serviceRegistry = serviceRegistry;
    }
    
    /**
     * 服務間通信
     */
    public <T> T callService(String serviceName, String endpoint, Object request, Class<T> responseType) {
        return circuitBreaker.executeSupplier(() -> {
            ServiceInstance instance = loadBalancer.choose(serviceName);
            if (instance == null) {
                throw new ServiceUnavailableException("服務不可用: " + serviceName);
            }
            
            String url = instance.getUri() + endpoint;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Object> entity = new HttpEntity<>(request, headers);
            ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.POST, entity, responseType);
            
            return response.getBody();
        });
    }
    
    /**
     * 異步服務調用
     */
    @Async
    public CompletableFuture<String> callServiceAsync(String serviceName, String endpoint, Object request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return callService(serviceName, endpoint, request, String.class);
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        });
    }
    
    /**
     * 廣播到所有服務
     */
    public void broadcastToAllServices(String message) {
        List<String> services = serviceRegistry.getServices();
        
        services.parallelStream().forEach(serviceName -> {
            try {
                callServiceAsync(serviceName, "/api/broadcast", message);
            } catch (Exception e) {
                System.err.println("廣播到服務 " + serviceName + " 失敗: " + e.getMessage());
            }
        });
    }
    
    /**
     * 服務健康檢查
     */
    public Map<String, ServiceHealth> checkServicesHealth() {
        List<String> services = serviceRegistry.getServices();
        Map<String, ServiceHealth> healthMap = new ConcurrentHashMap<>();
        
        services.parallelStream().forEach(serviceName -> {
            try {
                ServiceHealth health = callService(serviceName, "/actuator/health", null, ServiceHealth.class);
                healthMap.put(serviceName, health);
            } catch (Exception e) {
                healthMap.put(serviceName, new ServiceHealth("DOWN", e.getMessage()));
            }
        });
        
        return healthMap;
    }
}
```

### 2. 服務註冊介面

```java
/**
 * 服務註冊介面
 */
public interface ServiceRegistry {
    /**
     * 註冊服務
     */
    void registerService(String serviceName, String serviceUrl);
    
    /**
     * 取消註冊服務
     */
    void unregisterService(String serviceName);
    
    /**
     * 獲取所有服務
     */
    List<String> getServices();
    
    /**
     * 獲取服務實例
     */
    List<ServiceInstance> getInstances(String serviceName);
}

/**
 * 服務註冊實現
 */
@Component
public class InMemoryServiceRegistry implements ServiceRegistry {
    private final Map<String, List<ServiceInstance>> serviceMap = new ConcurrentHashMap<>();
    
    @Override
    public void registerService(String serviceName, String serviceUrl) {
        serviceMap.computeIfAbsent(serviceName, k -> new ArrayList<>())
                 .add(new ServiceInstance(serviceName, serviceUrl));
        
        System.out.println("註冊服務: " + serviceName + " -> " + serviceUrl);
    }
    
    @Override
    public void unregisterService(String serviceName) {
        serviceMap.remove(serviceName);
        System.out.println("取消註冊服務: " + serviceName);
    }
    
    @Override
    public List<String> getServices() {
        return new ArrayList<>(serviceMap.keySet());
    }
    
    @Override
    public List<ServiceInstance> getInstances(String serviceName) {
        return serviceMap.getOrDefault(serviceName, Collections.emptyList());
    }
}
```

### 3. 服務健康模型

```java
/**
 * 服務健康狀態
 */
public class ServiceHealth {
    private String status;
    private String message;
    private Map<String, Object> details;
    
    public ServiceHealth() {
        this.details = new HashMap<>();
    }
    
    public ServiceHealth(String status, String message) {
        this.status = status;
        this.message = message;
        this.details = new HashMap<>();
    }
    
    // Getters and setters
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }
}

/**
 * 服務實例
 */
public class ServiceInstance {
    private String serviceName;
    private String serviceUrl;
    private LocalDateTime registrationTime;
    private ServiceHealth health;
    
    public ServiceInstance(String serviceName, String serviceUrl) {
        this.serviceName = serviceName;
        this.serviceUrl = serviceUrl;
        this.registrationTime = LocalDateTime.now();
        this.health = new ServiceHealth("UP", "服務運行正常");
    }
    
    // Getters and setters
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    
    public String getServiceUrl() { return serviceUrl; }
    public void setServiceUrl(String serviceUrl) { this.serviceUrl = serviceUrl; }
    
    public LocalDateTime getRegistrationTime() { return registrationTime; }
    public void setRegistrationTime(LocalDateTime registrationTime) { this.registrationTime = registrationTime; }
    
    public ServiceHealth getHealth() { return health; }
    public void setHealth(ServiceHealth health) { this.health = health; }
}
```

## 企業級通信模式

### 1. 企業服務匯流排（ESB）

```java
/**
 * 企業服務匯流排實現
 */
@Component
public class EnterpriseServiceBus {
    private final Map<String, MessageChannel> channels = new ConcurrentHashMap<>();
    private final Map<String, List<MessageHandler>> handlers = new ConcurrentHashMap<>();
    private final MessageConverter messageConverter;
    private final MessageRouter messageRouter;
    
    public EnterpriseServiceBus(MessageConverter messageConverter, MessageRouter messageRouter) {
        this.messageConverter = messageConverter;
        this.messageRouter = messageRouter;
    }
    
    /**
     * 註冊消息通道
     */
    public void registerChannel(String channelName, MessageChannel channel) {
        channels.put(channelName, channel);
        System.out.println("註冊消息通道: " + channelName);
    }
    
    /**
     * 註冊消息處理器
     */
    public void registerHandler(String messageType, MessageHandler handler) {
        handlers.computeIfAbsent(messageType, k -> new ArrayList<>()).add(handler);
        System.out.println("註冊消息處理器: " + messageType);
    }
    
    /**
     * 發送消息
     */
    public void sendMessage(String channelName, Object message) {
        MessageChannel channel = channels.get(channelName);
        if (channel == null) {
            throw new IllegalArgumentException("消息通道不存在: " + channelName);
        }
        
        // 轉換消息
        Message<?> convertedMessage = messageConverter.convert(message);
        
        // 路由消息
        List<String> targetChannels = messageRouter.route(convertedMessage);
        
        // 發送到目標通道
        targetChannels.forEach(targetChannel -> {
            MessageChannel target = channels.get(targetChannel);
            if (target != null) {
                target.send(convertedMessage);
            }
        });
    }
    
    /**
     * 處理消息
     */
    public void handleMessage(Message<?> message) {
        String messageType = (String) message.getHeaders().get("messageType");
        List<MessageHandler> messageHandlers = handlers.get(messageType);
        
        if (messageHandlers != null) {
            messageHandlers.parallelStream().forEach(handler -> {
                try {
                    handler.handle(message);
                } catch (Exception e) {
                    System.err.println("消息處理失敗: " + e.getMessage());
                }
            });
        }
    }
}
```

### 2. 消息路由器

```java
/**
 * 消息路由器
 */
@Component
public class MessageRouter {
    private final Map<String, List<String>> routingRules = new ConcurrentHashMap<>();
    
    public void addRoutingRule(String messageType, String targetChannel) {
        routingRules.computeIfAbsent(messageType, k -> new ArrayList<>()).add(targetChannel);
    }
    
    public List<String> route(Message<?> message) {
        String messageType = (String) message.getHeaders().get("messageType");
        return routingRules.getOrDefault(messageType, Collections.emptyList());
    }
}

/**
 * 消息轉換器
 */
@Component
public class MessageConverter {
    private final ObjectMapper objectMapper;
    
    public MessageConverter() {
        this.objectMapper = new ObjectMapper();
    }
    
    public Message<?> convert(Object payload) {
        MessageHeaders headers = new MessageHeaders(Map.of(
            "messageType", payload.getClass().getSimpleName(),
            "timestamp", LocalDateTime.now(),
            "messageId", UUID.randomUUID().toString()
        ));
        
        return new GenericMessage<>(payload, headers);
    }
}

/**
 * 消息處理器介面
 */
@FunctionalInterface
public interface MessageHandler {
    void handle(Message<?> message);
}
```

### 3. 工作流程協調器

```java
/**
 * 工作流程協調器
 */
@Component
public class WorkflowCoordinator {
    private final Map<String, WorkflowDefinition> workflows = new ConcurrentHashMap<>();
    private final Map<String, WorkflowInstance> activeInstances = new ConcurrentHashMap<>();
    
    /**
     * 註冊工作流程
     */
    public void registerWorkflow(WorkflowDefinition definition) {
        workflows.put(definition.getName(), definition);
        System.out.println("註冊工作流程: " + definition.getName());
    }
    
    /**
     * 啟動工作流程
     */
    public String startWorkflow(String workflowName, Map<String, Object> parameters) {
        WorkflowDefinition definition = workflows.get(workflowName);
        if (definition == null) {
            throw new IllegalArgumentException("工作流程不存在: " + workflowName);
        }
        
        String instanceId = UUID.randomUUID().toString();
        WorkflowInstance instance = new WorkflowInstance(instanceId, definition, parameters);
        activeInstances.put(instanceId, instance);
        
        // 執行第一個步驟
        executeNextStep(instance);
        
        return instanceId;
    }
    
    /**
     * 執行下一步驟
     */
    private void executeNextStep(WorkflowInstance instance) {
        WorkflowStep currentStep = instance.getCurrentStep();
        if (currentStep != null) {
            try {
                currentStep.execute(instance.getContext());
                instance.moveToNextStep();
                
                if (instance.isCompleted()) {
                    completeWorkflow(instance);
                } else {
                    executeNextStep(instance);
                }
            } catch (Exception e) {
                instance.setStatus(WorkflowStatus.FAILED);
                System.err.println("工作流程步驟執行失敗: " + e.getMessage());
            }
        }
    }
    
    /**
     * 完成工作流程
     */
    private void completeWorkflow(WorkflowInstance instance) {
        instance.setStatus(WorkflowStatus.COMPLETED);
        activeInstances.remove(instance.getInstanceId());
        System.out.println("工作流程完成: " + instance.getInstanceId());
    }
    
    /**
     * 獲取工作流程狀態
     */
    public WorkflowStatus getWorkflowStatus(String instanceId) {
        WorkflowInstance instance = activeInstances.get(instanceId);
        return instance != null ? instance.getStatus() : WorkflowStatus.NOT_FOUND;
    }
}
```

### 4. 工作流程模型

```java
/**
 * 工作流程定義
 */
public class WorkflowDefinition {
    private String name;
    private String description;
    private List<WorkflowStep> steps;
    
    public WorkflowDefinition(String name, String description) {
        this.name = name;
        this.description = description;
        this.steps = new ArrayList<>();
    }
    
    public void addStep(WorkflowStep step) {
        steps.add(step);
    }
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public List<WorkflowStep> getSteps() { return steps; }
    public void setSteps(List<WorkflowStep> steps) { this.steps = steps; }
}

/**
 * 工作流程實例
 */
public class WorkflowInstance {
    private String instanceId;
    private WorkflowDefinition definition;
    private Map<String, Object> context;
    private int currentStepIndex;
    private WorkflowStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    
    public WorkflowInstance(String instanceId, WorkflowDefinition definition, Map<String, Object> parameters) {
        this.instanceId = instanceId;
        this.definition = definition;
        this.context = new HashMap<>(parameters);
        this.currentStepIndex = 0;
        this.status = WorkflowStatus.RUNNING;
        this.startTime = LocalDateTime.now();
    }
    
    public WorkflowStep getCurrentStep() {
        if (currentStepIndex < definition.getSteps().size()) {
            return definition.getSteps().get(currentStepIndex);
        }
        return null;
    }
    
    public void moveToNextStep() {
        currentStepIndex++;
    }
    
    public boolean isCompleted() {
        return currentStepIndex >= definition.getSteps().size();
    }
    
    // Getters and setters
    public String getInstanceId() { return instanceId; }
    public WorkflowDefinition getDefinition() { return definition; }
    public Map<String, Object> getContext() { return context; }
    public WorkflowStatus getStatus() { return status; }
    public void setStatus(WorkflowStatus status) { this.status = status; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
}

/**
 * 工作流程步驟
 */
@FunctionalInterface
public interface WorkflowStep {
    void execute(Map<String, Object> context) throws Exception;
}

/**
 * 工作流程狀態
 */
public enum WorkflowStatus {
    RUNNING, COMPLETED, FAILED, PAUSED, NOT_FOUND
}
```

## 效能監控與指標

### 1. 中介者效能監控

```java
/**
 * 中介者效能監控器
 */
@Component
public class MediatorMetrics {
    private final MeterRegistry meterRegistry;
    private final Counter messageCounter;
    private final Counter registrationCounter;
    private final Counter broadcastCounter;
    private final Timer messageProcessingTimer;
    private final Gauge activeColleaguesGauge;
    private final AtomicInteger activeColleagues = new AtomicInteger(0);
    
    public MediatorMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.messageCounter = Counter.builder("mediator.messages.total")
                                    .description("處理的消息總數")
                                    .register(meterRegistry);
        this.registrationCounter = Counter.builder("mediator.registrations.total")
                                         .description("註冊的同事總數")
                                         .register(meterRegistry);
        this.broadcastCounter = Counter.builder("mediator.broadcasts.total")
                                      .description("廣播消息總數")
                                      .register(meterRegistry);
        this.messageProcessingTimer = Timer.builder("mediator.message.processing.time")
                                          .description("消息處理時間")
                                          .register(meterRegistry);
        this.activeColleaguesGauge = Gauge.builder("mediator.colleagues.active")
                                         .description("活躍同事數量")
                                         .register(meterRegistry, activeColleagues, AtomicInteger::get);
    }
    
    public void recordMessage(String messageType) {
        messageCounter.increment(Tags.of("type", messageType));
    }
    
    public void recordRegistration() {
        registrationCounter.increment();
        activeColleagues.incrementAndGet();
    }
    
    public void recordUnregistration() {
        activeColleagues.decrementAndGet();
    }
    
    public void recordBroadcast() {
        broadcastCounter.increment();
    }
    
    public Timer.Sample startMessageProcessing() {
        return Timer.start(meterRegistry);
    }
    
    public void endMessageProcessing(Timer.Sample sample, String messageType) {
        sample.stop(Timer.builder("mediator.message.processing.time")
                         .tag("type", messageType)
                         .register(meterRegistry));
    }
    
    public void printStatistics() {
        System.out.println("\n=== 中介者效能指標 ===");
        System.out.println("處理消息總數: " + messageCounter.count());
        System.out.println("註冊同事總數: " + registrationCounter.count());
        System.out.println("廣播消息總數: " + broadcastCounter.count());
        System.out.println("活躍同事數量: " + activeColleagues.get());
        System.out.println("平均處理時間: " + messageProcessingTimer.mean(TimeUnit.MILLISECONDS) + "ms");
    }
}
```

### 2. 監控中介者實現

```java
/**
 * 監控中介者實現
 */
@Component
public class MonitoredMediator implements Mediator {
    private final List<Colleague> colleagues = new CopyOnWriteArrayList<>();
    private final MediatorMetrics metrics;
    private final ApplicationEventPublisher eventPublisher;
    
    public MonitoredMediator(MediatorMetrics metrics, ApplicationEventPublisher eventPublisher) {
        this.metrics = metrics;
        this.eventPublisher = eventPublisher;
    }
    
    @Override
    public void registerColleague(Colleague colleague) {
        Timer.Sample sample = metrics.startMessageProcessing();
        try {
            colleagues.add(colleague);
            metrics.recordRegistration();
            
            // 發布註冊事件
            eventPublisher.publishEvent(new ColleagueRegisteredEvent(colleague));
            
            System.out.println("註冊同事 [監控]: " + colleague.getName());
        } finally {
            metrics.endMessageProcessing(sample, "REGISTER");
        }
    }
    
    @Override
    public void handleRequest(Colleague colleague, String message) {
        Timer.Sample sample = metrics.startMessageProcessing();
        String messageType = extractMessageType(message);
        
        try {
            metrics.recordMessage(messageType);
            
            // 處理消息邏輯
            processMessage(colleague, message, messageType);
            
            // 發布消息事件
            eventPublisher.publishEvent(new MessageEvent(colleague, message));
            
            System.out.println("處理請求 [監控]: " + colleague.getName() + " -> " + message);
        } finally {
            metrics.endMessageProcessing(sample, messageType);
        }
    }
    
    @Override
    public void broadcast(String message, Colleague sender) {
        Timer.Sample sample = metrics.startMessageProcessing();
        try {
            metrics.recordBroadcast();
            
            // 並行廣播
            colleagues.parallelStream()
                     .filter(colleague -> colleague != sender)
                     .forEach(colleague -> {
                         try {
                             colleague.receiveMessage(message);
                         } catch (Exception e) {
                             System.err.println("廣播失敗到 " + colleague.getName() + ": " + e.getMessage());
                         }
                     });
            
            // 發布廣播事件
            eventPublisher.publishEvent(new BroadcastEvent(sender, message));
            
            System.out.println("廣播消息 [監控]: " + message);
        } finally {
            metrics.endMessageProcessing(sample, "BROADCAST");
        }
    }
    
    private String extractMessageType(String message) {
        if (message.startsWith("URGENT:")) return "URGENT";
        if (message.startsWith("AUDIT:")) return "AUDIT";
        if (message.startsWith("BROADCAST:")) return "BROADCAST";
        if (message.startsWith("TOPIC:")) return "TOPIC";
        return "DEFAULT";
    }
    
    private void processMessage(Colleague colleague, String message, String messageType) {
        switch (messageType) {
            case "URGENT":
                processUrgentMessage(colleague, message);
                break;
            case "AUDIT":
                processAuditMessage(colleague, message);
                break;
            case "BROADCAST":
                String content = message.substring("BROADCAST:".length());
                broadcast(content, colleague);
                break;
            case "TOPIC":
                processTopicMessage(colleague, message);
                break;
            default:
                processDefaultMessage(colleague, message);
        }
    }
    
    private void processUrgentMessage(Colleague colleague, String message) {
        String urgentContent = message.substring("URGENT:".length());
        System.out.println("🚨 緊急處理: " + urgentContent);
        // 緊急處理邏輯
    }
    
    private void processAuditMessage(Colleague colleague, String message) {
        String auditContent = message.substring("AUDIT:".length());
        System.out.println("📝 審計記錄: " + auditContent);
        // 審計處理邏輯
    }
    
    private void processTopicMessage(Colleague colleague, String message) {
        String[] parts = message.split(":", 3);
        if (parts.length >= 3) {
            String topic = parts[1];
            String content = parts[2];
            System.out.println("📢 主題 [" + topic + "]: " + content);
            // 主題處理邏輯
        }
    }
    
    private void processDefaultMessage(Colleague colleague, String message) {
        System.out.println("💬 一般消息: " + message);
        // 默認處理邏輯
    }
    
    public void printStatistics() {
        metrics.printStatistics();
    }
}
```

### 3. 健康檢查

```java
/**
 * 中介者健康檢查
 */
@Component
public class MediatorHealthIndicator implements HealthIndicator {
    private final MonitoredMediator mediator;
    private final MediatorMetrics metrics;
    
    public MediatorHealthIndicator(MonitoredMediator mediator, MediatorMetrics metrics) {
        this.mediator = mediator;
        this.metrics = metrics;
    }
    
    @Override
    public Health health() {
        Health.Builder builder = new Health.Builder();
        
        try {
            // 檢查基本狀態
            int activeColleagues = metrics.activeColleagues.get();
            double messageProcessingTime = metrics.messageProcessingTimer.mean(TimeUnit.MILLISECONDS);
            
            Map<String, Object> details = new HashMap<>();
            details.put("activeColleagues", activeColleagues);
            details.put("averageProcessingTime", messageProcessingTime + "ms");
            details.put("totalMessages", metrics.messageCounter.count());
            details.put("totalBroadcasts", metrics.broadcastCounter.count());
            
            if (messageProcessingTime < 100 && activeColleagues > 0) {
                builder.up()
                       .withDetail("status", "健康")
                       .withDetails(details);
            } else if (messageProcessingTime < 500) {
                builder.status("WARNING")
                       .withDetail("status", "警告")
                       .withDetail("message", "處理時間較長")
                       .withDetails(details);
            } else {
                builder.down()
                       .withDetail("status", "異常")
                       .withDetail("message", "處理時間過長")
                       .withDetails(details);
            }
            
        } catch (Exception e) {
            builder.down()
                   .withDetail("error", e.getMessage());
        }
        
        return builder.build();
    }
}
```

## 現代化 Java 特性

### 1. Record 型別同事

```java
/**
 * 使用 Record 實現的輕量級同事
 */
public record SimpleColleague(String name, String type, Mediator mediator) {
    
    public SimpleColleague {
        mediator.registerColleague(new Colleague(mediator, name) {
            @Override
            public void receiveMessage(String message) {
                System.out.println("[" + type + "] " + name + " 收到: " + message);
            }
            
            @Override
            public void doWork() {
                sendMessage("執行 " + type + " 工作");
            }
        });
    }
    
    public void sendMessage(String message) {
        mediator.handleRequest(new Colleague(mediator, name) {
            @Override
            public void receiveMessage(String msg) {}
            
            @Override
            public void doWork() {}
        }, message);
    }
}
```

### 2. 函數式中介者

```java
/**
 * 函數式中介者實現
 */
@Component
public class FunctionalMediator {
    private final Map<String, Function<String, String>> messageProcessors = new ConcurrentHashMap<>();
    private final Map<String, Consumer<String>> messageHandlers = new ConcurrentHashMap<>();
    private final List<Function<String, Boolean>> messageFilters = new ArrayList<>();
    
    public void registerProcessor(String messageType, Function<String, String> processor) {
        messageProcessors.put(messageType, processor);
    }
    
    public void registerHandler(String handlerName, Consumer<String> handler) {
        messageHandlers.put(handlerName, handler);
    }
    
    public void addMessageFilter(Function<String, Boolean> filter) {
        messageFilters.add(filter);
    }
    
    public void processMessage(String message) {
        // 應用過濾器
        boolean shouldProcess = messageFilters.stream()
                                            .allMatch(filter -> filter.apply(message));
        
        if (!shouldProcess) {
            System.out.println("消息被過濾: " + message);
            return;
        }
        
        // 確定消息類型
        String messageType = determineMessageType(message);
        
        // 處理消息
        String processedMessage = messageProcessors.getOrDefault(messageType, Function.identity())
                                                  .apply(message);
        
        // 發送到處理器
        messageHandlers.values().parallelStream()
                      .forEach(handler -> handler.accept(processedMessage));
    }
    
    private String determineMessageType(String message) {
        return message.split(":")[0].toUpperCase();
    }
}
```

### 3. 反應式中介者

```java
/**
 * 反應式中介者實現
 */
@Component
public class ReactiveMediator {
    private final FluxProcessor<MediatorMessage, MediatorMessage> messageProcessor;
    private final FluxSink<MediatorMessage> messageSink;
    
    public ReactiveMediator() {
        this.messageProcessor = DirectProcessor.<MediatorMessage>create().serialize();
        this.messageSink = messageProcessor.sink();
        
        // 設置消息處理流
        setupMessageProcessing();
    }
    
    private void setupMessageProcessing() {
        messageProcessor
            .groupBy(MediatorMessage::getType)
            .flatMap(group -> {
                String messageType = group.key();
                return group
                    .buffer(Duration.ofMillis(100)) // 批次處理
                    .filter(messages -> !messages.isEmpty())
                    .flatMap(messages -> processMessageBatch(messageType, messages));
            })
            .subscribe(
                result -> System.out.println("處理結果: " + result),
                error -> System.err.println("處理錯誤: " + error.getMessage()),
                () -> System.out.println("處理完成")
            );
    }
    
    private Flux<String> processMessageBatch(String messageType, List<MediatorMessage> messages) {
        return Flux.fromIterable(messages)
                  .map(message -> processMessage(messageType, message))
                  .onErrorResume(error -> {
                      System.err.println("批次處理錯誤: " + error.getMessage());
                      return Flux.empty();
                  });
    }
    
    private String processMessage(String messageType, MediatorMessage message) {
        return switch (messageType) {
            case "URGENT" -> processUrgentMessage(message);
            case "AUDIT" -> processAuditMessage(message);
            case "BROADCAST" -> processBroadcastMessage(message);
            default -> processDefaultMessage(message);
        };
    }
    
    private String processUrgentMessage(MediatorMessage message) {
        System.out.println("🚨 反應式緊急處理: " + message.getContent());
        return "URGENT_PROCESSED";
    }
    
    private String processAuditMessage(MediatorMessage message) {
        System.out.println("📝 反應式審計處理: " + message.getContent());
        return "AUDIT_PROCESSED";
    }
    
    private String processBroadcastMessage(MediatorMessage message) {
        System.out.println("📢 反應式廣播處理: " + message.getContent());
        return "BROADCAST_PROCESSED";
    }
    
    private String processDefaultMessage(MediatorMessage message) {
        System.out.println("💬 反應式默認處理: " + message.getContent());
        return "DEFAULT_PROCESSED";
    }
    
    public void sendMessage(MediatorMessage message) {
        messageSink.next(message);
    }
    
    public void shutdown() {
        messageSink.complete();
    }
}
```

## 最佳實踐與反模式

### 1. 最佳實踐

```java
/**
 * 中介者最佳實踐示例
 */
public class MediatorBestPractices {
    
    // ✅ 正確：使用介面定義中介者契約
    public interface TypedMediator<T> {
        void registerColleague(TypedColleague<T> colleague);
        void handleRequest(TypedColleague<T> sender, T message);
        void broadcast(T message, TypedColleague<T> sender);
    }
    
    // ✅ 正確：使用泛型提供類型安全
    public abstract class TypedColleague<T> {
        protected final TypedMediator<T> mediator;
        protected final String name;
        
        public TypedColleague(TypedMediator<T> mediator, String name) {
            this.mediator = mediator;
            this.name = name;
            mediator.registerColleague(this);
        }
        
        public void sendMessage(T message) {
            mediator.handleRequest(this, message);
        }
        
        public abstract void receiveMessage(T message);
    }
    
    // ✅ 正確：實現執行緒安全
    @Component
    public class ThreadSafeMediator implements TypedMediator<String> {
        private final ConcurrentHashMap<String, TypedColleague<String>> colleagues = new ConcurrentHashMap<>();
        private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
        
        @Override
        public void registerColleague(TypedColleague<String> colleague) {
            lock.writeLock().lock();
            try {
                colleagues.put(colleague.name, colleague);
            } finally {
                lock.writeLock().unlock();
            }
        }
        
        @Override
        public void handleRequest(TypedColleague<String> sender, String message) {
            lock.readLock().lock();
            try {
                // 處理邏輯
                processMessage(sender, message);
            } finally {
                lock.readLock().unlock();
            }
        }
        
        @Override
        public void broadcast(String message, TypedColleague<String> sender) {
            lock.readLock().lock();
            try {
                colleagues.values().parallelStream()
                         .filter(colleague -> colleague != sender)
                         .forEach(colleague -> colleague.receiveMessage(message));
            } finally {
                lock.readLock().unlock();
            }
        }
        
        private void processMessage(TypedColleague<String> sender, String message) {
            // 安全的消息處理邏輯
            System.out.println("執行緒安全處理: " + sender.name + " -> " + message);
        }
    }
    
    // ✅ 正確：使用建造者模式配置中介者
    public static class MediatorBuilder {
        private boolean enableMetrics = false;
        private boolean enableAsync = false;
        private int maxThreads = 10;
        private Duration timeout = Duration.ofSeconds(30);
        
        public MediatorBuilder enableMetrics() {
            this.enableMetrics = true;
            return this;
        }
        
        public MediatorBuilder enableAsync() {
            this.enableAsync = true;
            return this;
        }
        
        public MediatorBuilder maxThreads(int maxThreads) {
            this.maxThreads = maxThreads;
            return this;
        }
        
        public MediatorBuilder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }
        
        public Mediator build() {
            if (enableMetrics && enableAsync) {
                return new MonitoredAsyncMediator(maxThreads, timeout);
            } else if (enableMetrics) {
                return new MonitoredMediator(null, null);
            } else if (enableAsync) {
                return new AsyncMediator(maxThreads, timeout);
            } else {
                return new ConcreteMediator();
            }
        }
    }
}
```

### 2. 反模式警告

```java
/**
 * 中介者反模式警告
 */
public class MediatorAntiPatterns {
    
    // ❌ 錯誤：中介者變成上帝對象
    public class GodMediatorBad implements Mediator {
        private final List<Colleague> colleagues = new ArrayList<>();
        private final UserService userService;
        private final PaymentService paymentService;
        private final EmailService emailService;
        private final SmsService smsService;
        private final LogService logService;
        // ... 更多服務依賴
        
        // 中介者承擔過多職責
        public void handleUserRegistration(User user) {
            // 直接處理業務邏輯，而非協調
            userService.save(user);
            emailService.sendWelcomeEmail(user);
            logService.log("用戶註冊: " + user.getName());
        }
    }
    
    // ❌ 錯誤：同事對象直接相互引用
    public class DirectCouplingBad extends Colleague {
        private ColleagueB colleagueB;  // 直接引用其他同事
        
        public DirectCouplingBad(Mediator mediator, String name, ColleagueB colleagueB) {
            super(mediator, name);
            this.colleagueB = colleagueB;  // 違反中介者模式原則
        }
        
        @Override
        public void receiveMessage(String message) {
            // 直接調用其他同事，而非通過中介者
            colleagueB.receiveMessage("直接消息");
        }
    }
    
    // ❌ 錯誤：中介者缺乏抽象
    public class ConcreteMediatorBad {  // 沒有實現介面
        private final List<Colleague> colleagues = new ArrayList<>();
        
        // 硬編碼的方法，難以擴展
        public void handleUserMessage(UserColleague user, String message) {
            // 特定類型的處理邏輯
        }
        
        public void handleServiceMessage(ServiceColleague service, String message) {
            // 特定類型的處理邏輯
        }
    }
    
    // ❌ 錯誤：沒有考慮執行緒安全
    public class UnsafeMediatorBad implements Mediator {
        private final List<Colleague> colleagues = new ArrayList<>();  // 非執行緒安全
        
        @Override
        public void registerColleague(Colleague colleague) {
            colleagues.add(colleague);  // 併發修改可能導致問題
        }
        
        @Override
        public void broadcast(String message, Colleague sender) {
            for (Colleague colleague : colleagues) {  // 併發修改可能導致 ConcurrentModificationException
                if (colleague != sender) {
                    colleague.receiveMessage(message);
                }
            }
        }
    }
}
```

## 總結

### 優勢
1. **鬆散耦合**：對象之間不直接依賴，通過中介者交互
2. **集中控制**：交互邏輯集中管理，易於維護
3. **可擴展性**：新增同事類型無需修改現有代碼
4. **複用性**：中介者可以在不同場景中重用

### 劣勢
1. **複雜性**：中介者可能變得過於複雜
2. **效能開銷**：額外的間接層可能影響效能
3. **單點故障**：中介者故障會影響整個系統
4. **上帝對象**：中介者容易承擔過多職責

### 使用建議
1. **適合場景**：複雜的對象間交互、需要集中管理的通信
2. **設計原則**：保持中介者簡單、專注於協調而非業務邏輯
3. **實現要點**：執行緒安全、錯誤處理、效能監控
4. **現代化整合**：Spring Events、消息代理、反應式編程

### 企業級應用
1. **事件驅動架構**：使用 Spring Events 實現鬆散耦合
2. **微服務通信**：服務間協調和編排
3. **消息代理整合**：RabbitMQ、Kafka 等消息中間件
4. **工作流程管理**：業務流程的協調和控制

Mediator 模式在現代企業應用中具有重要地位，特別是在構建大型、複雜的分散式系統時。透過合理的設計和現代化的實現方式，可以有效地管理系統中各組件之間的交互，提高系統的可維護性和可擴展性。

---

*Mediator 模式完整重構完成 - 從基礎實現到企業級應用，涵蓋 Spring Events、消息代理、微服務通信等現代化通信模式*