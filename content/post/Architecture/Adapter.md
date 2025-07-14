---
title: "適配器模式 (Adapter Pattern) 完整實作指南：介面轉換與系統整合最佳實踐"
author: Bill.Lin
date: 2018-08-07T12:12:36+08:00
draft: false
tags: ["Design Pattern", "Adapter Pattern", "Structural Pattern", "Interface Conversion", "System Integration", "Legacy System", "Third-party API", "Java", "Spring Boot", "Best Practices", "Enterprise Architecture"]
Description: "深入探討適配器模式的完整實作指南，包含介面轉換機制、系統整合應用、第三方API整合、遺留系統改造與企業級開發最佳實踐"
Categories: ["Architecture"]
DisableComments: false
---

## 適配器模式 (Adapter Pattern) 完整實作指南

### 模式概述

適配器模式是一種結構型設計模式，它允許原本由於介面不相容而不能一起工作的類別協同工作。適配器模式就像現實生活中的電源適配器，它能夠將一個類別的介面轉換成客戶端所期望的另一個介面。

### 模式結構

```java
// 目標介面 - 客戶端所期望的介面
public interface Target {
    void request();
}

// 適配者 - 需要被適配的現有類別
public class Adaptee {
    public void specificRequest() {
        System.out.println("執行特定請求");
    }
}

// 適配器 - 將 Adaptee 轉換為 Target 介面
public class Adapter implements Target {
    private Adaptee adaptee;
    
    public Adapter(Adaptee adaptee) {
        this.adaptee = adaptee;
    }
    
    @Override
    public void request() {
        adaptee.specificRequest();
    }
}

// 客戶端
public class Client {
    public void makeRequest(Target target) {
        target.request();
    }
}
```

### 適配器模式的兩種實現方式

#### 1. 對象適配器 (Object Adapter) - 使用組合

```java
// 支付介面
public interface PaymentProcessor {
    PaymentResult processPayment(double amount, String currency);
}

// 第三方支付SDK
public class ThirdPartyPaymentSDK {
    public boolean makePayment(String amount, String currencyCode, Map<String, String> metadata) {
        System.out.println("使用第三方SDK處理支付: " + amount + " " + currencyCode);
        // 模擬支付處理
        return Math.random() > 0.1; // 90%成功率
    }
    
    public String getTransactionId() {
        return "TXN_" + System.currentTimeMillis();
    }
}

// 對象適配器
public class ThirdPartyPaymentAdapter implements PaymentProcessor {
    private ThirdPartyPaymentSDK thirdPartySDK;
    
    public ThirdPartyPaymentAdapter(ThirdPartyPaymentSDK thirdPartySDK) {
        this.thirdPartySDK = thirdPartySDK;
    }
    
    @Override
    public PaymentResult processPayment(double amount, String currency) {
        try {
            // 轉換參數格式
            String amountStr = String.valueOf(amount);
            Map<String, String> metadata = new HashMap<>();
            metadata.put("source", "adapter");
            metadata.put("timestamp", String.valueOf(System.currentTimeMillis()));
            
            // 調用第三方SDK
            boolean success = thirdPartySDK.makePayment(amountStr, currency, metadata);
            
            // 轉換返回結果
            return new PaymentResult(
                success,
                success ? "支付成功" : "支付失敗",
                thirdPartySDK.getTransactionId(),
                amount,
                currency
            );
        } catch (Exception e) {
            return new PaymentResult(false, "支付異常: " + e.getMessage(), null, amount, currency);
        }
    }
}

// 結果類
public class PaymentResult {
    private boolean success;
    private String message;
    private String transactionId;
    private double amount;
    private String currency;
    
    public PaymentResult(boolean success, String message, String transactionId, double amount, String currency) {
        this.success = success;
        this.message = message;
        this.transactionId = transactionId;
        this.amount = amount;
        this.currency = currency;
    }
    
    // getters and setters
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public String getTransactionId() { return transactionId; }
    public double getAmount() { return amount; }
    public String getCurrency() { return currency; }
}
```

#### 2. 類適配器 (Class Adapter) - 使用繼承

```java
// 遺留系統的日誌類別
public class LegacyLogger {
    public void writeLog(String level, String message) {
        System.out.println("[" + level + "] " + new Date() + " - " + message);
    }
}

// 現代日誌介面
public interface ModernLogger {
    void info(String message);
    void warn(String message);
    void error(String message);
    void debug(String message);
}

// 類適配器
public class LegacyLoggerAdapter extends LegacyLogger implements ModernLogger {
    
    @Override
    public void info(String message) {
        writeLog("INFO", message);
    }
    
    @Override
    public void warn(String message) {
        writeLog("WARN", message);
    }
    
    @Override
    public void error(String message) {
        writeLog("ERROR", message);
    }
    
    @Override
    public void debug(String message) {
        writeLog("DEBUG", message);
    }
}
```

### 企業級應用場景

#### 1. 數據源適配器

```java
// 統一數據源介面
public interface DataSource {
    List<Record> fetchData(QueryParameters params);
    void saveData(List<Record> records);
}

// 數據庫數據源
public class DatabaseDataSource implements DataSource {
    private JdbcTemplate jdbcTemplate;
    
    public DatabaseDataSource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    
    @Override
    public List<Record> fetchData(QueryParameters params) {
        String sql = buildSqlQuery(params);
        return jdbcTemplate.query(sql, new RecordRowMapper());
    }
    
    @Override
    public void saveData(List<Record> records) {
        String sql = "INSERT INTO records (id, name, value) VALUES (?, ?, ?)";
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                Record record = records.get(i);
                ps.setString(1, record.getId());
                ps.setString(2, record.getName());
                ps.setString(3, record.getValue());
            }
            
            @Override
            public int getBatchSize() {
                return records.size();
            }
        });
    }
    
    private String buildSqlQuery(QueryParameters params) {
        StringBuilder sql = new StringBuilder("SELECT * FROM records WHERE 1=1");
        if (params.getName() != null) {
            sql.append(" AND name = '").append(params.getName()).append("'");
        }
        if (params.getDateRange() != null) {
            sql.append(" AND created_date BETWEEN '")
               .append(params.getDateRange().getStart())
               .append("' AND '")
               .append(params.getDateRange().getEnd())
               .append("'");
        }
        return sql.toString();
    }
}

// REST API 數據源適配器
public class RestApiDataSourceAdapter implements DataSource {
    private RestTemplate restTemplate;
    private String baseUrl;
    
    public RestApiDataSourceAdapter(RestTemplate restTemplate, String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }
    
    @Override
    public List<Record> fetchData(QueryParameters params) {
        String url = baseUrl + "/api/records";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // 轉換查詢參數
        Map<String, Object> requestBody = new HashMap<>();
        if (params.getName() != null) {
            requestBody.put("name", params.getName());
        }
        if (params.getDateRange() != null) {
            requestBody.put("startDate", params.getDateRange().getStart());
            requestBody.put("endDate", params.getDateRange().getEnd());
        }
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<ApiResponse> response = restTemplate.postForEntity(url, request, ApiResponse.class);
            return convertApiResponseToRecords(response.getBody());
        } catch (RestClientException e) {
            throw new DataSourceException("無法從REST API獲取數據", e);
        }
    }
    
    @Override
    public void saveData(List<Record> records) {
        String url = baseUrl + "/api/records/batch";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        List<Map<String, Object>> apiRecords = records.stream()
            .map(this::convertRecordToApiFormat)
            .collect(Collectors.toList());
        
        HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(apiRecords, headers);
        
        try {
            restTemplate.postForObject(url, request, ApiResponse.class);
        } catch (RestClientException e) {
            throw new DataSourceException("無法保存數據到REST API", e);
        }
    }
    
    private List<Record> convertApiResponseToRecords(ApiResponse response) {
        return response.getData().stream()
            .map(item -> new Record(
                item.get("id").toString(),
                item.get("name").toString(),
                item.get("value").toString()
            ))
            .collect(Collectors.toList());
    }
    
    private Map<String, Object> convertRecordToApiFormat(Record record) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", record.getId());
        map.put("name", record.getName());
        map.put("value", record.getValue());
        return map;
    }
}

// 文件數據源適配器
public class FileDataSourceAdapter implements DataSource {
    private String filePath;
    private ObjectMapper objectMapper;
    
    public FileDataSourceAdapter(String filePath) {
        this.filePath = filePath;
        this.objectMapper = new ObjectMapper();
    }
    
    @Override
    public List<Record> fetchData(QueryParameters params) {
        try {
            List<Record> allRecords = readRecordsFromFile();
            return filterRecords(allRecords, params);
        } catch (IOException e) {
            throw new DataSourceException("無法讀取文件數據", e);
        }
    }
    
    @Override
    public void saveData(List<Record> records) {
        try {
            writeRecordsToFile(records);
        } catch (IOException e) {
            throw new DataSourceException("無法保存數據到文件", e);
        }
    }
    
    private List<Record> readRecordsFromFile() throws IOException {
        File file = new File(filePath);
        if (!file.exists()) {
            return new ArrayList<>();
        }
        
        TypeReference<List<Record>> typeRef = new TypeReference<List<Record>>() {};
        return objectMapper.readValue(file, typeRef);
    }
    
    private void writeRecordsToFile(List<Record> records) throws IOException {
        File file = new File(filePath);
        objectMapper.writeValue(file, records);
    }
    
    private List<Record> filterRecords(List<Record> records, QueryParameters params) {
        return records.stream()
            .filter(record -> {
                if (params.getName() != null && !params.getName().equals(record.getName())) {
                    return false;
                }
                // 添加其他過濾條件
                return true;
            })
            .collect(Collectors.toList());
    }
}
```

#### 2. 消息系統適配器

```java
// 統一消息發送介面
public interface MessageSender {
    void sendMessage(String recipient, String subject, String content);
    void sendBroadcast(String subject, String content);
    boolean isAvailable();
}

// 郵件服務適配器
public class EmailServiceAdapter implements MessageSender {
    private JavaMailSender mailSender;
    private String fromAddress;
    
    public EmailServiceAdapter(JavaMailSender mailSender, String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }
    
    @Override
    public void sendMessage(String recipient, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(content);
            
            mailSender.send(message);
        } catch (Exception e) {
            throw new MessageSendException("郵件發送失敗", e);
        }
    }
    
    @Override
    public void sendBroadcast(String subject, String content) {
        // 實現群發邏輯
        List<String> recipients = getSubscriberEmails();
        for (String recipient : recipients) {
            sendMessage(recipient, subject, content);
        }
    }
    
    @Override
    public boolean isAvailable() {
        try {
            // 檢查郵件服務是否可用
            return mailSender != null;
        } catch (Exception e) {
            return false;
        }
    }
    
    private List<String> getSubscriberEmails() {
        // 獲取訂閱者郵箱列表
        return Arrays.asList("user1@example.com", "user2@example.com");
    }
}

// SMS 服務適配器
public class SmsServiceAdapter implements MessageSender {
    private SmsClient smsClient;
    private String apiKey;
    
    public SmsServiceAdapter(SmsClient smsClient, String apiKey) {
        this.smsClient = smsClient;
        this.apiKey = apiKey;
    }
    
    @Override
    public void sendMessage(String recipient, String subject, String content) {
        try {
            // SMS通常不支持主題，將主題併入內容
            String fullContent = subject + ": " + content;
            
            SmsRequest request = new SmsRequest();
            request.setApiKey(apiKey);
            request.setPhoneNumber(recipient);
            request.setMessage(fullContent);
            
            SmsResponse response = smsClient.sendSms(request);
            if (!response.isSuccess()) {
                throw new MessageSendException("SMS發送失敗: " + response.getErrorMessage());
            }
        } catch (Exception e) {
            throw new MessageSendException("SMS發送異常", e);
        }
    }
    
    @Override
    public void sendBroadcast(String subject, String content) {
        List<String> phoneNumbers = getSubscriberPhoneNumbers();
        for (String phoneNumber : phoneNumbers) {
            sendMessage(phoneNumber, subject, content);
        }
    }
    
    @Override
    public boolean isAvailable() {
        try {
            return smsClient.checkConnection();
        } catch (Exception e) {
            return false;
        }
    }
    
    private List<String> getSubscriberPhoneNumbers() {
        // 獲取訂閱者手機號碼列表
        return Arrays.asList("+1234567890", "+0987654321");
    }
}

// 推送通知適配器
public class PushNotificationAdapter implements MessageSender {
    private PushNotificationService pushService;
    
    public PushNotificationAdapter(PushNotificationService pushService) {
        this.pushService = pushService;
    }
    
    @Override
    public void sendMessage(String recipient, String subject, String content) {
        try {
            PushNotification notification = new PushNotification();
            notification.setDeviceToken(recipient);
            notification.setTitle(subject);
            notification.setBody(content);
            notification.setBadge(1);
            
            pushService.send(notification);
        } catch (Exception e) {
            throw new MessageSendException("推送通知發送失敗", e);
        }
    }
    
    @Override
    public void sendBroadcast(String subject, String content) {
        try {
            BroadcastNotification broadcast = new BroadcastNotification();
            broadcast.setTitle(subject);
            broadcast.setBody(content);
            broadcast.setTopic("all_users");
            
            pushService.sendBroadcast(broadcast);
        } catch (Exception e) {
            throw new MessageSendException("廣播推送發送失敗", e);
        }
    }
    
    @Override
    public boolean isAvailable() {
        return pushService.isConnected();
    }
}
```

#### 3. 多通道消息管理器

```java
@Service
public class MessageManager {
    private final Map<String, MessageSender> messageSenders;
    private final MessageSender defaultSender;
    
    public MessageManager(@Qualifier("emailSender") MessageSender emailSender,
                         @Qualifier("smsSender") MessageSender smsSender,
                         @Qualifier("pushSender") MessageSender pushSender) {
        this.messageSenders = new HashMap<>();
        this.messageSenders.put("email", emailSender);
        this.messageSenders.put("sms", smsSender);
        this.messageSenders.put("push", pushSender);
        this.defaultSender = emailSender;
    }
    
    public void sendMessage(String channel, String recipient, String subject, String content) {
        MessageSender sender = messageSenders.getOrDefault(channel, defaultSender);
        
        if (!sender.isAvailable()) {
            // 嘗試使用備用通道
            sender = findAvailableSender();
            if (sender == null) {
                throw new MessageSendException("所有消息通道均不可用");
            }
        }
        
        sender.sendMessage(recipient, subject, content);
    }
    
    public void sendMultiChannelMessage(List<String> channels, String recipient, String subject, String content) {
        List<Exception> exceptions = new ArrayList<>();
        
        for (String channel : channels) {
            try {
                sendMessage(channel, recipient, subject, content);
            } catch (Exception e) {
                exceptions.add(e);
            }
        }
        
        if (exceptions.size() == channels.size()) {
            throw new MessageSendException("所有通道發送失敗", exceptions.get(0));
        }
    }
    
    private MessageSender findAvailableSender() {
        return messageSenders.values().stream()
            .filter(MessageSender::isAvailable)
            .findFirst()
            .orElse(null);
    }
}
```

### 緩存系統適配器

```java
// 統一緩存介面
public interface CacheService {
    void put(String key, Object value, Duration ttl);
    <T> T get(String key, Class<T> type);
    void remove(String key);
    void clear();
    boolean exists(String key);
}

// Redis 緩存適配器
@Service
public class RedisCacheAdapter implements CacheService {
    private final RedisTemplate<String, Object> redisTemplate;
    
    public RedisCacheAdapter(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @Override
    public void put(String key, Object value, Duration ttl) {
        redisTemplate.opsForValue().set(key, value, ttl);
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> type) {
        Object value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return null;
        }
        
        if (type.isAssignableFrom(value.getClass())) {
            return (T) value;
        }
        
        throw new ClassCastException("無法將緩存值轉換為 " + type.getName());
    }
    
    @Override
    public void remove(String key) {
        redisTemplate.delete(key);
    }
    
    @Override
    public void clear() {
        Set<String> keys = redisTemplate.keys("*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
    
    @Override
    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}

// 內存緩存適配器
@Service
public class MemoryCacheAdapter implements CacheService {
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    
    public MemoryCacheAdapter() {
        // 定期清理過期項目
        scheduler.scheduleAtFixedRate(this::cleanupExpiredEntries, 1, 1, TimeUnit.MINUTES);
    }
    
    @Override
    public void put(String key, Object value, Duration ttl) {
        long expirationTime = System.currentTimeMillis() + ttl.toMillis();
        cache.put(key, new CacheEntry(value, expirationTime));
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> type) {
        CacheEntry entry = cache.get(key);
        if (entry == null || entry.isExpired()) {
            cache.remove(key);
            return null;
        }
        
        Object value = entry.getValue();
        if (type.isAssignableFrom(value.getClass())) {
            return (T) value;
        }
        
        throw new ClassCastException("無法將緩存值轉換為 " + type.getName());
    }
    
    @Override
    public void remove(String key) {
        cache.remove(key);
    }
    
    @Override
    public void clear() {
        cache.clear();
    }
    
    @Override
    public boolean exists(String key) {
        CacheEntry entry = cache.get(key);
        return entry != null && !entry.isExpired();
    }
    
    private void cleanupExpiredEntries() {
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    
    private static class CacheEntry {
        private final Object value;
        private final long expirationTime;
        
        public CacheEntry(Object value, long expirationTime) {
            this.value = value;
            this.expirationTime = expirationTime;
        }
        
        public Object getValue() {
            return value;
        }
        
        public boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
    }
}
```

### 統一服務管理

```java
// 統一服務管理器
@Service
public class UnifiedServiceManager {
    private final DataSource dataSource;
    private final MessageSender messageSender;
    private final CacheService cacheService;
    
    public UnifiedServiceManager(
            @Qualifier("selectedDataSource") DataSource dataSource,
            @Qualifier("selectedMessageSender") MessageSender messageSender,
            @Qualifier("selectedCacheService") CacheService cacheService) {
        this.dataSource = dataSource;
        this.messageSender = messageSender;
        this.cacheService = cacheService;
    }
    
    public void processBusinessLogic(String userId, String action) {
        // 從緩存獲取用戶信息
        String cacheKey = "user:" + userId;
        User user = cacheService.get(cacheKey, User.class);
        
        if (user == null) {
            // 緩存未命中，從數據源獲取
            QueryParameters params = new QueryParameters();
            params.setName(userId);
            List<Record> records = dataSource.fetchData(params);
            
            if (!records.isEmpty()) {
                user = convertRecordToUser(records.get(0));
                cacheService.put(cacheKey, user, Duration.ofMinutes(30));
            }
        }
        
        if (user != null) {
            // 處理業務邏輯
            processAction(user, action);
            
            // 發送通知
            messageSender.sendMessage(
                user.getEmail(),
                "操作通知",
                "您的操作 " + action + " 已完成"
            );
        }
    }
    
    private User convertRecordToUser(Record record) {
        return new User(record.getId(), record.getName(), record.getValue());
    }
    
    private void processAction(User user, String action) {
        // 具體的業務邏輯處理
        System.out.println("處理用戶 " + user.getName() + " 的操作: " + action);
    }
}
```

### Spring Boot 配置

```java
@Configuration
public class AdapterPatternConfig {
    
    @Bean
    @Primary
    @Qualifier("selectedDataSource")
    public DataSource dataSource(
            @Value("${app.datasource.type:database}") String type,
            JdbcTemplate jdbcTemplate,
            RestTemplate restTemplate,
            @Value("${app.api.base-url}") String apiBaseUrl,
            @Value("${app.file.data-path}") String filePath) {
        
        switch (type.toLowerCase()) {
            case "api":
                return new RestApiDataSourceAdapter(restTemplate, apiBaseUrl);
            case "file":
                return new FileDataSourceAdapter(filePath);
            case "database":
            default:
                return new DatabaseDataSource(jdbcTemplate);
        }
    }
    
    @Bean
    @Qualifier("selectedMessageSender")
    public MessageSender messageSender(
            @Value("${app.messaging.type:email}") String type,
            JavaMailSender mailSender,
            @Value("${app.email.from}") String fromAddress,
            SmsClient smsClient,
            @Value("${app.sms.api-key}") String smsApiKey,
            PushNotificationService pushService) {
        
        switch (type.toLowerCase()) {
            case "sms":
                return new SmsServiceAdapter(smsClient, smsApiKey);
            case "push":
                return new PushNotificationAdapter(pushService);
            case "email":
            default:
                return new EmailServiceAdapter(mailSender, fromAddress);
        }
    }
    
    @Bean
    @Qualifier("selectedCacheService")
    public CacheService cacheService(
            @Value("${app.cache.type:redis}") String type,
            RedisTemplate<String, Object> redisTemplate) {
        
        switch (type.toLowerCase()) {
            case "memory":
                return new MemoryCacheAdapter();
            case "redis":
            default:
                return new RedisCacheAdapter(redisTemplate);
        }
    }
}
```

### 測試策略

```java
@ExtendWith(MockitoExtension.class)
class AdapterPatternTest {
    
    @Mock
    private ThirdPartyPaymentSDK mockPaymentSDK;
    
    @Mock
    private JavaMailSender mockMailSender;
    
    @InjectMocks
    private ThirdPartyPaymentAdapter paymentAdapter;
    
    @InjectMocks
    private EmailServiceAdapter emailAdapter;
    
    @Test
    void testPaymentAdapter_Success() {
        // Given
        when(mockPaymentSDK.makePayment(anyString(), anyString(), anyMap()))
            .thenReturn(true);
        when(mockPaymentSDK.getTransactionId())
            .thenReturn("TXN_12345");
        
        // When
        PaymentResult result = paymentAdapter.processPayment(100.0, "USD");
        
        // Then
        assertTrue(result.isSuccess());
        assertEquals("支付成功", result.getMessage());
        assertEquals("TXN_12345", result.getTransactionId());
        assertEquals(100.0, result.getAmount());
        assertEquals("USD", result.getCurrency());
        
        verify(mockPaymentSDK).makePayment("100.0", "USD", anyMap());
        verify(mockPaymentSDK).getTransactionId();
    }
    
    @Test
    void testPaymentAdapter_Failure() {
        // Given
        when(mockPaymentSDK.makePayment(anyString(), anyString(), anyMap()))
            .thenReturn(false);
        
        // When
        PaymentResult result = paymentAdapter.processPayment(100.0, "USD");
        
        // Then
        assertFalse(result.isSuccess());
        assertEquals("支付失敗", result.getMessage());
        assertNull(result.getTransactionId());
    }
    
    @Test
    void testEmailAdapter_SendMessage() {
        // Given
        doNothing().when(mockMailSender).send(any(SimpleMailMessage.class));
        
        // When
        emailAdapter.sendMessage("test@example.com", "測試主題", "測試內容");
        
        // Then
        verify(mockMailSender).send(any(SimpleMailMessage.class));
    }
    
    @Test
    void testEmailAdapter_SendMessageException() {
        // Given
        doThrow(new RuntimeException("郵件服務不可用"))
            .when(mockMailSender).send(any(SimpleMailMessage.class));
        
        // When & Then
        assertThrows(MessageSendException.class, () -> 
            emailAdapter.sendMessage("test@example.com", "測試主題", "測試內容"));
    }
}

@SpringBootTest
class AdapterPatternIntegrationTest {
    
    @Autowired
    private UnifiedServiceManager serviceManager;
    
    @Test
    void testUnifiedServiceManager_ProcessBusinessLogic() {
        // Given
        String userId = "testUser";
        String action = "login";
        
        // When
        serviceManager.processBusinessLogic(userId, action);
        
        // Then
        // 驗證業務邏輯是否正確執行
        // 這裡可以檢查日誌、數據庫狀態等
    }
}
```

### 性能優化與最佳實踐

#### 1. 適配器快取

```java
public class CachedAdapterWrapper<T> implements DataSource {
    private final T originalAdapter;
    private final CacheService cacheService;
    private final Duration cacheTtl;
    
    public CachedAdapterWrapper(T originalAdapter, CacheService cacheService, Duration cacheTtl) {
        this.originalAdapter = originalAdapter;
        this.cacheService = cacheService;
        this.cacheTtl = cacheTtl;
    }
    
    @Override
    public List<Record> fetchData(QueryParameters params) {
        String cacheKey = generateCacheKey(params);
        
        List<Record> cachedResult = cacheService.get(cacheKey, List.class);
        if (cachedResult != null) {
            return cachedResult;
        }
        
        List<Record> result = ((DataSource) originalAdapter).fetchData(params);
        cacheService.put(cacheKey, result, cacheTtl);
        
        return result;
    }
    
    private String generateCacheKey(QueryParameters params) {
        return "query:" + params.hashCode();
    }
}
```

#### 2. 異步適配器

```java
@Service
public class AsyncMessageAdapter implements MessageSender {
    private final MessageSender originalSender;
    private final TaskExecutor taskExecutor;
    
    public AsyncMessageAdapter(MessageSender originalSender, TaskExecutor taskExecutor) {
        this.originalSender = originalSender;
        this.taskExecutor = taskExecutor;
    }
    
    @Override
    public void sendMessage(String recipient, String subject, String content) {
        taskExecutor.execute(() -> {
            try {
                originalSender.sendMessage(recipient, subject, content);
            } catch (Exception e) {
                // 記錄錯誤，可能需要重試機制
                log.error("異步消息發送失敗", e);
            }
        });
    }
    
    @Override
    public void sendBroadcast(String subject, String content) {
        taskExecutor.execute(() -> {
            try {
                originalSender.sendBroadcast(subject, content);
            } catch (Exception e) {
                log.error("異步廣播發送失敗", e);
            }
        });
    }
    
    @Override
    public boolean isAvailable() {
        return originalSender.isAvailable();
    }
}
```

### 監控與診斷

```java
@Component
public class AdapterMonitor {
    private final MeterRegistry meterRegistry;
    private final Counter adaptationCounter;
    private final Timer adaptationTimer;
    
    public AdapterMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.adaptationCounter = Counter.builder("adapter.invocations")
            .description("Number of adapter invocations")
            .register(meterRegistry);
        this.adaptationTimer = Timer.builder("adapter.duration")
            .description("Time spent in adapter methods")
            .register(meterRegistry);
    }
    
    public <T> T monitorAdapterCall(String adapterName, String methodName, Supplier<T> supplier) {
        return Timer.Sample.start(meterRegistry)
            .stop(adaptationTimer.withTag("adapter", adapterName).withTag("method", methodName))
            .recordCallable(() -> {
                adaptationCounter.increment(Tags.of("adapter", adapterName, "method", methodName));
                return supplier.get();
            });
    }
}
```

### 總結

適配器模式是一種強大的結構型設計模式，特別適用於：

1. **遺留系統整合**：將舊系統介面適配到新系統
2. **第三方API整合**：統一不同第三方服務的介面
3. **多資料源支援**：提供統一的數據存取介面
4. **系統解耦**：減少系統間的直接依賴

#### 關鍵最佳實踐

1. **單一職責**：每個適配器只負責一種介面轉換
2. **介面統一**：設計清晰、一致的目標介面
3. **錯誤處理**：妥善處理適配過程中的異常
4. **性能考量**：適當使用快取和異步處理
5. **監控診斷**：追蹤適配器的使用情況和性能

適配器模式讓不相容的介面能夠協同工作，是企業級應用中不可或缺的設計模式。正確使用適配器模式可以大幅提升系統的可維護性和擴展性。