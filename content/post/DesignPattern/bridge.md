---
title: "橋接模式 (Bridge Pattern) 完整實作指南：抽象與實現分離的架構設計最佳實踐"
author: Bill.Lin
date: 2018-08-07T12:16:14+08:00
draft: false
tags: ["Design Pattern", "Bridge Pattern", "Structural Pattern", "Abstraction", "Implementation", "Decoupling", "Architecture", "Java", "Spring Boot", "Best Practices", "Enterprise Development", "SOLID Principles", "Software Design"]
Description: "深入探討橋接模式的完整實作指南，包含抽象與實現分離機制、多維度變化處理、企業級應用場景與架構設計最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
aliases:
  - /post/DesignPattern/Bridge/

---

## 橋接模式 (Bridge Pattern) 完整實作指南

### 模式概述

橋接模式是一種結構型設計模式，它將抽象部分與實現部分分離，使它們都可以獨立地變化。橋接模式通過組合建立抽象和實現之間的橋梁，而不是使用繼承將它們結合在一起。

### 核心思想

橋接模式的核心思想是**「組合優於繼承」**，它解決了在多個維度上變化的問題，避免了類爆炸的問題。

### 模式結構

```java
// 抽象 (Abstraction)
public abstract class Shape {
    protected Color color;
    
    public Shape(Color color) {
        this.color = color;
    }
    
    public abstract void draw();
    public abstract double getArea();
}

// 實現介面 (Implementor)
public interface Color {
    void fill();
}

// 具體實現 (Concrete Implementor)
public class Red implements Color {
    @Override
    public void fill() {
        System.out.println("填充紅色");
    }
}

public class Blue implements Color {
    @Override
    public void fill() {
        System.out.println("填充藍色");
    }
}

// 細化抽象 (Refined Abstraction)
public class Circle extends Shape {
    private double radius;
    
    public Circle(Color color, double radius) {
        super(color);
        this.radius = radius;
    }
    
    @Override
    public void draw() {
        System.out.print("畫圓形，半徑：" + radius + "，");
        color.fill();
    }
    
    @Override
    public double getArea() {
        return Math.PI * radius * radius;
    }
}

public class Rectangle extends Shape {
    private double width;
    private double height;
    
    public Rectangle(Color color, double width, double height) {
        super(color);
        this.width = width;
        this.height = height;
    }
    
    @Override
    public void draw() {
        System.out.print("畫矩形，寬：" + width + "，高：" + height + "，");
        color.fill();
    }
    
    @Override
    public double getArea() {
        return width * height;
    }
}
```

### 企業級應用場景

#### 1. 數據庫抽象層

```java
// 數據庫操作抽象
public abstract class DatabaseOperation {
    protected DatabaseDriver driver;
    
    public DatabaseOperation(DatabaseDriver driver) {
        this.driver = driver;
    }
    
    public abstract void execute(String sql);
    public abstract ResultSet query(String sql);
    public abstract boolean update(String sql);
    
    protected void logOperation(String operation) {
        System.out.println("執行數據庫操作: " + operation);
    }
}

// 數據庫驅動介面
public interface DatabaseDriver {
    Connection getConnection();
    void closeConnection(Connection connection);
    PreparedStatement prepareStatement(String sql);
    boolean supportsTransaction();
    void beginTransaction();
    void commit();
    void rollback();
}

// MySQL驅動實現
@Component
public class MySQLDriver implements DatabaseDriver {
    private static final String DRIVER_NAME = "com.mysql.cj.jdbc.Driver";
    private final String connectionUrl;
    private final String username;
    private final String password;
    
    public MySQLDriver(@Value("${database.mysql.url}") String connectionUrl,
                      @Value("${database.mysql.username}") String username,
                      @Value("${database.mysql.password}") String password) {
        this.connectionUrl = connectionUrl;
        this.username = username;
        this.password = password;
    }
    
    @Override
    public Connection getConnection() {
        try {
            Class.forName(DRIVER_NAME);
            return DriverManager.getConnection(connectionUrl, username, password);
        } catch (ClassNotFoundException | SQLException e) {
            throw new DatabaseConnectionException("無法連接到MySQL數據庫", e);
        }
    }
    
    @Override
    public void closeConnection(Connection connection) {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
            }
        } catch (SQLException e) {
            throw new DatabaseConnectionException("關閉MySQL連接失敗", e);
        }
    }
    
    @Override
    public PreparedStatement prepareStatement(String sql) {
        try {
            Connection connection = getConnection();
            return connection.prepareStatement(sql);
        } catch (SQLException e) {
            throw new DatabaseOperationException("創建MySQL PreparedStatement失敗", e);
        }
    }
    
    @Override
    public boolean supportsTransaction() {
        return true;
    }
    
    @Override
    public void beginTransaction() {
        try {
            Connection connection = getConnection();
            connection.setAutoCommit(false);
        } catch (SQLException e) {
            throw new DatabaseOperationException("開始MySQL事務失敗", e);
        }
    }
    
    @Override
    public void commit() {
        try {
            Connection connection = getConnection();
            connection.commit();
        } catch (SQLException e) {
            throw new DatabaseOperationException("提交MySQL事務失敗", e);
        }
    }
    
    @Override
    public void rollback() {
        try {
            Connection connection = getConnection();
            connection.rollback();
        } catch (SQLException e) {
            throw new DatabaseOperationException("回滾MySQL事務失敗", e);
        }
    }
}

// PostgreSQL驅動實現
@Component
public class PostgreSQLDriver implements DatabaseDriver {
    private static final String DRIVER_NAME = "org.postgresql.Driver";
    private final String connectionUrl;
    private final String username;
    private final String password;
    
    public PostgreSQLDriver(@Value("${database.postgresql.url}") String connectionUrl,
                           @Value("${database.postgresql.username}") String username,
                           @Value("${database.postgresql.password}") String password) {
        this.connectionUrl = connectionUrl;
        this.username = username;
        this.password = password;
    }
    
    @Override
    public Connection getConnection() {
        try {
            Class.forName(DRIVER_NAME);
            return DriverManager.getConnection(connectionUrl, username, password);
        } catch (ClassNotFoundException | SQLException e) {
            throw new DatabaseConnectionException("無法連接到PostgreSQL數據庫", e);
        }
    }
    
    @Override
    public void closeConnection(Connection connection) {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
            }
        } catch (SQLException e) {
            throw new DatabaseConnectionException("關閉PostgreSQL連接失敗", e);
        }
    }
    
    @Override
    public PreparedStatement prepareStatement(String sql) {
        try {
            Connection connection = getConnection();
            return connection.prepareStatement(sql);
        } catch (SQLException e) {
            throw new DatabaseOperationException("創建PostgreSQL PreparedStatement失敗", e);
        }
    }
    
    @Override
    public boolean supportsTransaction() {
        return true;
    }
    
    @Override
    public void beginTransaction() {
        try {
            Connection connection = getConnection();
            connection.setAutoCommit(false);
        } catch (SQLException e) {
            throw new DatabaseOperationException("開始PostgreSQL事務失敗", e);
        }
    }
    
    @Override
    public void commit() {
        try {
            Connection connection = getConnection();
            connection.commit();
        } catch (SQLException e) {
            throw new DatabaseOperationException("提交PostgreSQL事務失敗", e);
        }
    }
    
    @Override
    public void rollback() {
        try {
            Connection connection = getConnection();
            connection.rollback();
        } catch (SQLException e) {
            throw new DatabaseOperationException("回滾PostgreSQL事務失敗", e);
        }
    }
}

// 用戶數據操作
@Repository
public class UserDatabaseOperation extends DatabaseOperation {
    
    public UserDatabaseOperation(DatabaseDriver driver) {
        super(driver);
    }
    
    @Override
    public void execute(String sql) {
        Connection connection = null;
        PreparedStatement statement = null;
        
        try {
            connection = driver.getConnection();
            statement = connection.prepareStatement(sql);
            statement.execute();
            logOperation("執行用戶相關SQL: " + sql);
        } catch (SQLException e) {
            throw new DatabaseOperationException("執行用戶SQL失敗", e);
        } finally {
            closeResources(statement, connection);
        }
    }
    
    @Override
    public ResultSet query(String sql) {
        try {
            Connection connection = driver.getConnection();
            PreparedStatement statement = connection.prepareStatement(sql);
            ResultSet resultSet = statement.executeQuery();
            logOperation("查詢用戶數據: " + sql);
            return resultSet;
        } catch (SQLException e) {
            throw new DatabaseOperationException("查詢用戶數據失敗", e);
        }
    }
    
    @Override
    public boolean update(String sql) {
        Connection connection = null;
        PreparedStatement statement = null;
        
        try {
            connection = driver.getConnection();
            statement = connection.prepareStatement(sql);
            int affectedRows = statement.executeUpdate();
            logOperation("更新用戶數據: " + sql + ", 影響行數: " + affectedRows);
            return affectedRows > 0;
        } catch (SQLException e) {
            throw new DatabaseOperationException("更新用戶數據失敗", e);
        } finally {
            closeResources(statement, connection);
        }
    }
    
    public User findUserById(Long id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        try (Connection connection = driver.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            
            statement.setLong(1, id);
            ResultSet resultSet = statement.executeQuery();
            
            if (resultSet.next()) {
                return mapResultSetToUser(resultSet);
            }
            return null;
        } catch (SQLException e) {
            throw new DatabaseOperationException("根據ID查詢用戶失敗", e);
        }
    }
    
    public void createUser(User user) {
        String sql = "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)";
        try (Connection connection = driver.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            
            statement.setString(1, user.getName());
            statement.setString(2, user.getEmail());
            statement.setTimestamp(3, Timestamp.valueOf(user.getCreatedAt()));
            
            statement.executeUpdate();
            logOperation("創建用戶: " + user.getName());
        } catch (SQLException e) {
            throw new DatabaseOperationException("創建用戶失敗", e);
        }
    }
    
    public void updateUser(User user) {
        if (!driver.supportsTransaction()) {
            throw new UnsupportedOperationException("當前數據庫不支持事務操作");
        }
        
        String sql = "UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?";
        Connection connection = null;
        PreparedStatement statement = null;
        
        try {
            connection = driver.getConnection();
            driver.beginTransaction();
            
            statement = connection.prepareStatement(sql);
            statement.setString(1, user.getName());
            statement.setString(2, user.getEmail());
            statement.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
            statement.setLong(4, user.getId());
            
            int affectedRows = statement.executeUpdate();
            if (affectedRows == 0) {
                throw new DatabaseOperationException("未找到要更新的用戶");
            }
            
            driver.commit();
            logOperation("更新用戶: " + user.getName());
        } catch (SQLException e) {
            driver.rollback();
            throw new DatabaseOperationException("更新用戶失敗", e);
        } finally {
            closeResources(statement, connection);
        }
    }
    
    private User mapResultSetToUser(ResultSet resultSet) throws SQLException {
        return User.builder()
            .id(resultSet.getLong("id"))
            .name(resultSet.getString("name"))
            .email(resultSet.getString("email"))
            .createdAt(resultSet.getTimestamp("created_at").toLocalDateTime())
            .build();
    }
    
    private void closeResources(PreparedStatement statement, Connection connection) {
        try {
            if (statement != null) {
                statement.close();
            }
        } catch (SQLException e) {
            // 記錄日誌但不拋出異常
        }
        
        driver.closeConnection(connection);
    }
}
```

#### 2. 消息發送系統

```java
// 消息抽象
public abstract class Message {
    protected MessageSender sender;
    protected String content;
    protected String recipient;
    protected LocalDateTime timestamp;
    
    public Message(MessageSender sender, String content, String recipient) {
        this.sender = sender;
        this.content = content;
        this.recipient = recipient;
        this.timestamp = LocalDateTime.now();
    }
    
    public abstract void send();
    public abstract boolean isDelivered();
    public abstract void resend();
    
    protected void logMessage(String action) {
        System.out.println(String.format("[%s] %s - 收件人: %s", 
            timestamp.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), 
            action, recipient));
    }
}

// 消息發送者介面
public interface MessageSender {
    void sendMessage(String recipient, String content);
    boolean isAvailable();
    String getSenderType();
    void configure(Map<String, Object> configuration);
    DeliveryStatus getDeliveryStatus(String messageId);
}

// 電子郵件發送器
@Component
public class EmailSender implements MessageSender {
    private final JavaMailSender mailSender;
    private final EmailConfiguration emailConfig;
    
    public EmailSender(JavaMailSender mailSender, EmailConfiguration emailConfig) {
        this.mailSender = mailSender;
        this.emailConfig = emailConfig;
    }
    
    @Override
    public void sendMessage(String recipient, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(emailConfig.getFromAddress());
            message.setTo(recipient);
            message.setSubject(emailConfig.getDefaultSubject());
            message.setText(content);
            
            mailSender.send(message);
        } catch (Exception e) {
            throw new MessageSendException("發送電子郵件失敗", e);
        }
    }
    
    @Override
    public boolean isAvailable() {
        try {
            return mailSender != null && emailConfig.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    public String getSenderType() {
        return "EMAIL";
    }
    
    @Override
    public void configure(Map<String, Object> configuration) {
        if (configuration.containsKey("subject")) {
            emailConfig.setDefaultSubject((String) configuration.get("subject"));
        }
        if (configuration.containsKey("fromAddress")) {
            emailConfig.setFromAddress((String) configuration.get("fromAddress"));
        }
    }
    
    @Override
    public DeliveryStatus getDeliveryStatus(String messageId) {
        // 實際實現需要與郵件服務器API整合
        return DeliveryStatus.DELIVERED;
    }
}

// SMS發送器
@Component
public class SMSSender implements MessageSender {
    private final SmsClient smsClient;
    private final SmsConfiguration smsConfig;
    
    public SMSSender(SmsClient smsClient, SmsConfiguration smsConfig) {
        this.smsClient = smsClient;
        this.smsConfig = smsConfig;
    }
    
    @Override
    public void sendMessage(String recipient, String content) {
        try {
            SmsRequest request = SmsRequest.builder()
                .phoneNumber(recipient)
                .message(content)
                .apiKey(smsConfig.getApiKey())
                .build();
            
            SmsResponse response = smsClient.sendSms(request);
            
            if (!response.isSuccess()) {
                throw new MessageSendException("SMS發送失敗: " + response.getErrorMessage());
            }
        } catch (Exception e) {
            throw new MessageSendException("發送SMS失敗", e);
        }
    }
    
    @Override
    public boolean isAvailable() {
        return smsClient != null && smsConfig.isEnabled() && smsConfig.getApiKey() != null;
    }
    
    @Override
    public String getSenderType() {
        return "SMS";
    }
    
    @Override
    public void configure(Map<String, Object> configuration) {
        if (configuration.containsKey("apiKey")) {
            smsConfig.setApiKey((String) configuration.get("apiKey"));
        }
    }
    
    @Override
    public DeliveryStatus getDeliveryStatus(String messageId) {
        try {
            return smsClient.getDeliveryStatus(messageId);
        } catch (Exception e) {
            return DeliveryStatus.UNKNOWN;
        }
    }
}

// 推送通知發送器
@Component
public class PushNotificationSender implements MessageSender {
    private final PushNotificationService pushService;
    private final PushConfiguration pushConfig;
    
    public PushNotificationSender(PushNotificationService pushService, PushConfiguration pushConfig) {
        this.pushService = pushService;
        this.pushConfig = pushConfig;
    }
    
    @Override
    public void sendMessage(String recipient, String content) {
        try {
            PushNotification notification = PushNotification.builder()
                .deviceToken(recipient)
                .message(content)
                .badge(1)
                .sound("default")
                .build();
            
            pushService.send(notification);
        } catch (Exception e) {
            throw new MessageSendException("發送推送通知失敗", e);
        }
    }
    
    @Override
    public boolean isAvailable() {
        return pushService != null && pushConfig.isEnabled();
    }
    
    @Override
    public String getSenderType() {
        return "PUSH";
    }
    
    @Override
    public void configure(Map<String, Object> configuration) {
        if (configuration.containsKey("appId")) {
            pushConfig.setAppId((String) configuration.get("appId"));
        }
    }
    
    @Override
    public DeliveryStatus getDeliveryStatus(String messageId) {
        try {
            return pushService.getDeliveryStatus(messageId);
        } catch (Exception e) {
            return DeliveryStatus.UNKNOWN;
        }
    }
}

// 通知消息
public class NotificationMessage extends Message {
    private String messageId;
    private int retryCount;
    private final int maxRetries;
    
    public NotificationMessage(MessageSender sender, String content, String recipient) {
        super(sender, content, recipient);
        this.messageId = generateMessageId();
        this.retryCount = 0;
        this.maxRetries = 3;
    }
    
    @Override
    public void send() {
        if (!sender.isAvailable()) {
            throw new MessageSendException("消息發送器不可用: " + sender.getSenderType());
        }
        
        try {
            sender.sendMessage(recipient, content);
            logMessage("通知已發送 - " + sender.getSenderType());
        } catch (Exception e) {
            logMessage("通知發送失敗 - " + sender.getSenderType());
            throw e;
        }
    }
    
    @Override
    public boolean isDelivered() {
        try {
            DeliveryStatus status = sender.getDeliveryStatus(messageId);
            return status == DeliveryStatus.DELIVERED;
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    public void resend() {
        if (retryCount >= maxRetries) {
            throw new MessageSendException("已達到最大重試次數");
        }
        
        retryCount++;
        logMessage("重新發送通知 (第" + retryCount + "次) - " + sender.getSenderType());
        send();
    }
    
    private String generateMessageId() {
        return UUID.randomUUID().toString();
    }
}

// 營銷消息
public class MarketingMessage extends Message {
    private String campaignId;
    private Map<String, Object> personalizationData;
    
    public MarketingMessage(MessageSender sender, String content, String recipient, 
                          String campaignId, Map<String, Object> personalizationData) {
        super(sender, content, recipient);
        this.campaignId = campaignId;
        this.personalizationData = personalizationData;
    }
    
    @Override
    public void send() {
        if (!sender.isAvailable()) {
            throw new MessageSendException("消息發送器不可用: " + sender.getSenderType());
        }
        
        String personalizedContent = personalizeContent();
        
        try {
            sender.sendMessage(recipient, personalizedContent);
            logMessage("營銷消息已發送 - 活動ID: " + campaignId + " - " + sender.getSenderType());
        } catch (Exception e) {
            logMessage("營銷消息發送失敗 - 活動ID: " + campaignId + " - " + sender.getSenderType());
            throw e;
        }
    }
    
    @Override
    public boolean isDelivered() {
        try {
            DeliveryStatus status = sender.getDeliveryStatus(campaignId);
            return status == DeliveryStatus.DELIVERED;
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    public void resend() {
        logMessage("重新發送營銷消息 - 活動ID: " + campaignId + " - " + sender.getSenderType());
        send();
    }
    
    private String personalizeContent() {
        String personalizedContent = content;
        
        if (personalizationData != null) {
            for (Map.Entry<String, Object> entry : personalizationData.entrySet()) {
                String placeholder = "{{" + entry.getKey() + "}}";
                personalizedContent = personalizedContent.replace(placeholder, entry.getValue().toString());
            }
        }
        
        return personalizedContent;
    }
}
```

#### 3. 報告生成系統

```java
// 報告抽象
public abstract class Report {
    protected ReportGenerator generator;
    protected String title;
    protected LocalDateTime generatedAt;
    protected Map<String, Object> data;
    
    public Report(ReportGenerator generator, String title, Map<String, Object> data) {
        this.generator = generator;
        this.title = title;
        this.data = data;
        this.generatedAt = LocalDateTime.now();
    }
    
    public abstract void generate();
    public abstract void export(String filePath);
    public abstract String getContent();
    
    protected void logReportActivity(String activity) {
        System.out.println(String.format("[%s] %s - 報告: %s", 
            generatedAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), 
            activity, title));
    }
}

// 報告生成器介面
public interface ReportGenerator {
    String generateContent(String title, Map<String, Object> data);
    void exportToFile(String content, String filePath);
    String getFormat();
    boolean supportsCharts();
    void setTemplate(String template);
}

// PDF報告生成器
@Component
public class PDFReportGenerator implements ReportGenerator {
    private final PDFService pdfService;
    private String template;
    
    public PDFReportGenerator(PDFService pdfService) {
        this.pdfService = pdfService;
    }
    
    @Override
    public String generateContent(String title, Map<String, Object> data) {
        try {
            PDFDocument document = new PDFDocument();
            
            // 添加標題
            document.addTitle(title);
            document.addGeneratedDate(LocalDateTime.now());
            
            // 添加數據內容
            if (data.containsKey("summary")) {
                document.addSection("摘要", data.get("summary").toString());
            }
            
            if (data.containsKey("tableData")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> tableData = (List<Map<String, Object>>) data.get("tableData");
                document.addTable(tableData);
            }
            
            if (data.containsKey("chartData") && supportsCharts()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> chartData = (Map<String, Object>) data.get("chartData");
                document.addChart(chartData);
            }
            
            return document.build();
        } catch (Exception e) {
            throw new ReportGenerationException("生成PDF報告內容失敗", e);
        }
    }
    
    @Override
    public void exportToFile(String content, String filePath) {
        try {
            pdfService.saveToPDF(content, filePath);
        } catch (Exception e) {
            throw new ReportGenerationException("導出PDF報告失敗", e);
        }
    }
    
    @Override
    public String getFormat() {
        return "PDF";
    }
    
    @Override
    public boolean supportsCharts() {
        return true;
    }
    
    @Override
    public void setTemplate(String template) {
        this.template = template;
    }
}

// Excel報告生成器
@Component
public class ExcelReportGenerator implements ReportGenerator {
    private final ExcelService excelService;
    private String template;
    
    public ExcelReportGenerator(ExcelService excelService) {
        this.excelService = excelService;
    }
    
    @Override
    public String generateContent(String title, Map<String, Object> data) {
        try {
            Workbook workbook = new XSSFWorkbook();
            Sheet sheet = workbook.createSheet(title);
            
            int rowIndex = 0;
            
            // 添加標題行
            Row titleRow = sheet.createRow(rowIndex++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(title);
            
            // 添加生成時間
            Row dateRow = sheet.createRow(rowIndex++);
            Cell dateCell = dateRow.createCell(0);
            dateCell.setCellValue("生成時間: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            
            // 空行
            rowIndex++;
            
            // 添加數據表格
            if (data.containsKey("tableData")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> tableData = (List<Map<String, Object>>) data.get("tableData");
                
                if (!tableData.isEmpty()) {
                    // 添加表頭
                    Row headerRow = sheet.createRow(rowIndex++);
                    Set<String> headers = tableData.get(0).keySet();
                    int colIndex = 0;
                    for (String header : headers) {
                        Cell headerCell = headerRow.createCell(colIndex++);
                        headerCell.setCellValue(header);
                    }
                    
                    // 添加數據行
                    for (Map<String, Object> row : tableData) {
                        Row dataRow = sheet.createRow(rowIndex++);
                        colIndex = 0;
                        for (String header : headers) {
                            Cell dataCell = dataRow.createCell(colIndex++);
                            Object value = row.get(header);
                            if (value != null) {
                                dataCell.setCellValue(value.toString());
                            }
                        }
                    }
                }
            }
            
            // 自動調整列寬
            for (int i = 0; i < sheet.getRow(0).getLastCellNum(); i++) {
                sheet.autoSizeColumn(i);
            }
            
            return workbook.toString(); // 實際實現需要序列化workbook
        } catch (Exception e) {
            throw new ReportGenerationException("生成Excel報告內容失敗", e);
        }
    }
    
    @Override
    public void exportToFile(String content, String filePath) {
        try {
            excelService.saveToExcel(content, filePath);
        } catch (Exception e) {
            throw new ReportGenerationException("導出Excel報告失敗", e);
        }
    }
    
    @Override
    public String getFormat() {
        return "EXCEL";
    }
    
    @Override
    public boolean supportsCharts() {
        return true;
    }
    
    @Override
    public void setTemplate(String template) {
        this.template = template;
    }
}

// HTML報告生成器
@Component
public class HTMLReportGenerator implements ReportGenerator {
    private final TemplateEngine templateEngine;
    private String template;
    
    public HTMLReportGenerator(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }
    
    @Override
    public String generateContent(String title, Map<String, Object> data) {
        try {
            Map<String, Object> templateData = new HashMap<>();
            templateData.put("title", title);
            templateData.put("generatedAt", LocalDateTime.now());
            templateData.putAll(data);
            
            if (template != null) {
                return templateEngine.process(template, templateData);
            } else {
                return generateDefaultHTML(title, data);
            }
        } catch (Exception e) {
            throw new ReportGenerationException("生成HTML報告內容失敗", e);
        }
    }
    
    @Override
    public void exportToFile(String content, String filePath) {
        try (FileWriter writer = new FileWriter(filePath)) {
            writer.write(content);
        } catch (IOException e) {
            throw new ReportGenerationException("導出HTML報告失敗", e);
        }
    }
    
    @Override
    public String getFormat() {
        return "HTML";
    }
    
    @Override
    public boolean supportsCharts() {
        return true; // 支持JavaScript圖表
    }
    
    @Override
    public void setTemplate(String template) {
        this.template = template;
    }
    
    private String generateDefaultHTML(String title, Map<String, Object> data) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>")
            .append("<html>")
            .append("<head>")
            .append("<title>").append(title).append("</title>")
            .append("<style>")
            .append("body { font-family: Arial, sans-serif; margin: 20px; }")
            .append("table { border-collapse: collapse; width: 100%; }")
            .append("th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }")
            .append("th { background-color: #f2f2f2; }")
            .append("</style>")
            .append("</head>")
            .append("<body>")
            .append("<h1>").append(title).append("</h1>")
            .append("<p>生成時間: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("</p>");
        
        if (data.containsKey("summary")) {
            html.append("<h2>摘要</h2>")
                .append("<p>").append(data.get("summary")).append("</p>");
        }
        
        if (data.containsKey("tableData")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tableData = (List<Map<String, Object>>) data.get("tableData");
            
            if (!tableData.isEmpty()) {
                html.append("<h2>數據表格</h2>")
                    .append("<table>");
                
                // 表頭
                Set<String> headers = tableData.get(0).keySet();
                html.append("<tr>");
                for (String header : headers) {
                    html.append("<th>").append(header).append("</th>");
                }
                html.append("</tr>");
                
                // 數據行
                for (Map<String, Object> row : tableData) {
                    html.append("<tr>");
                    for (String header : headers) {
                        Object value = row.get(header);
                        html.append("<td>").append(value != null ? value.toString() : "").append("</td>");
                    }
                    html.append("</tr>");
                }
                
                html.append("</table>");
            }
        }
        
        html.append("</body>")
            .append("</html>");
        
        return html.toString();
    }
}

// 銷售報告
public class SalesReport extends Report {
    private String period;
    
    public SalesReport(ReportGenerator generator, String title, Map<String, Object> data, String period) {
        super(generator, title, data);
        this.period = period;
    }
    
    @Override
    public void generate() {
        logReportActivity("開始生成銷售報告 - 期間: " + period);
        
        // 準備銷售數據
        prepareSalesData();
        
        // 生成報告內容
        String content = generator.generateContent(title, data);
        
        logReportActivity("銷售報告生成完成 - 格式: " + generator.getFormat());
    }
    
    @Override
    public void export(String filePath) {
        String content = getContent();
        generator.exportToFile(content, filePath);
        logReportActivity("銷售報告已導出 - 文件: " + filePath);
    }
    
    @Override
    public String getContent() {
        return generator.generateContent(title, data);
    }
    
    private void prepareSalesData() {
        // 準備銷售摘要
        data.put("summary", "本報告展示了" + period + "期間的銷售業績和趨勢分析");
        
        // 準備銷售數據表格
        List<Map<String, Object>> salesData = new ArrayList<>();
        salesData.add(Map.of("產品", "產品A", "銷售額", 10000, "數量", 100));
        salesData.add(Map.of("產品", "產品B", "銷售額", 15000, "數量", 150));
        salesData.add(Map.of("產品", "產品C", "銷售額", 8000, "數量", 80));
        data.put("tableData", salesData);
        
        // 準備圖表數據
        if (generator.supportsCharts()) {
            Map<String, Object> chartData = new HashMap<>();
            chartData.put("type", "bar");
            chartData.put("labels", List.of("產品A", "產品B", "產品C"));
            chartData.put("values", List.of(10000, 15000, 8000));
            data.put("chartData", chartData);
        }
    }
}

// 用戶報告
public class UserReport extends Report {
    private String userSegment;
    
    public UserReport(ReportGenerator generator, String title, Map<String, Object> data, String userSegment) {
        super(generator, title, data);
        this.userSegment = userSegment;
    }
    
    @Override
    public void generate() {
        logReportActivity("開始生成用戶報告 - 用戶群: " + userSegment);
        
        // 準備用戶數據
        prepareUserData();
        
        // 生成報告內容
        String content = generator.generateContent(title, data);
        
        logReportActivity("用戶報告生成完成 - 格式: " + generator.getFormat());
    }
    
    @Override
    public void export(String filePath) {
        String content = getContent();
        generator.exportToFile(content, filePath);
        logReportActivity("用戶報告已導出 - 文件: " + filePath);
    }
    
    @Override
    public String getContent() {
        return generator.generateContent(title, data);
    }
    
    private void prepareUserData() {
        // 準備用戶分析摘要
        data.put("summary", "本報告分析了" + userSegment + "用戶群的行為模式和特徵");
        
        // 準備用戶數據表格
        List<Map<String, Object>> userData = new ArrayList<>();
        userData.add(Map.of("用戶ID", "U001", "姓名", "張三", "活躍度", "高", "消費金額", 5000));
        userData.add(Map.of("用戶ID", "U002", "姓名", "李四", "活躍度", "中", "消費金額", 3000));
        userData.add(Map.of("用戶ID", "U003", "姓名", "王五", "活躍度", "低", "消費金額", 1000));
        data.put("tableData", userData);
        
        // 準備圖表數據
        if (generator.supportsCharts()) {
            Map<String, Object> chartData = new HashMap<>();
            chartData.put("type", "pie");
            chartData.put("labels", List.of("高活躍度", "中活躍度", "低活躍度"));
            chartData.put("values", List.of(1, 1, 1));
            data.put("chartData", chartData);
        }
    }
}
```

### 配置和管理

#### 1. Spring Boot配置

```java
@Configuration
@EnableConfigurationProperties({DatabaseProperties.class, MessageProperties.class})
public class BridgePatternConfig {
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mysql")
    public DatabaseDriver mysqlDriver(DatabaseProperties properties) {
        return new MySQLDriver(
            properties.getMysql().getUrl(),
            properties.getMysql().getUsername(),
            properties.getMysql().getPassword()
        );
    }
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "postgresql")
    public DatabaseDriver postgresqlDriver(DatabaseProperties properties) {
        return new PostgreSQLDriver(
            properties.getPostgresql().getUrl(),
            properties.getPostgresql().getUsername(),
            properties.getPostgresql().getPassword()
        );
    }
    
    @Bean
    @ConditionalOnProperty(name = "messaging.email.enabled", havingValue = "true")
    public MessageSender emailSender(JavaMailSender mailSender, EmailConfiguration emailConfig) {
        return new EmailSender(mailSender, emailConfig);
    }
    
    @Bean
    @ConditionalOnProperty(name = "messaging.sms.enabled", havingValue = "true")
    public MessageSender smsSender(SmsClient smsClient, SmsConfiguration smsConfig) {
        return new SMSSender(smsClient, smsConfig);
    }
    
    @Bean
    @ConditionalOnProperty(name = "messaging.push.enabled", havingValue = "true")
    public MessageSender pushSender(PushNotificationService pushService, PushConfiguration pushConfig) {
        return new PushNotificationSender(pushService, pushConfig);
    }
    
    @Bean
    @ConditionalOnProperty(name = "reports.pdf.enabled", havingValue = "true")
    public ReportGenerator pdfGenerator(PDFService pdfService) {
        return new PDFReportGenerator(pdfService);
    }
    
    @Bean
    @ConditionalOnProperty(name = "reports.excel.enabled", havingValue = "true")
    public ReportGenerator excelGenerator(ExcelService excelService) {
        return new ExcelReportGenerator(excelService);
    }
    
    @Bean
    @ConditionalOnProperty(name = "reports.html.enabled", havingValue = "true")
    public ReportGenerator htmlGenerator(TemplateEngine templateEngine) {
        return new HTMLReportGenerator(templateEngine);
    }
}
```

#### 2. 統一服務管理

```java
@Service
public class BridgePatternService {
    private final List<DatabaseDriver> databaseDrivers;
    private final List<MessageSender> messageSenders;
    private final List<ReportGenerator> reportGenerators;
    
    public BridgePatternService(List<DatabaseDriver> databaseDrivers,
                               List<MessageSender> messageSenders,
                               List<ReportGenerator> reportGenerators) {
        this.databaseDrivers = databaseDrivers;
        this.messageSenders = messageSenders;
        this.reportGenerators = reportGenerators;
    }
    
    public void processUserData(User user) {
        // 使用適當的數據庫驅動
        DatabaseDriver driver = selectDatabaseDriver();
        UserDatabaseOperation operation = new UserDatabaseOperation(driver);
        operation.createUser(user);
        
        // 發送通知
        MessageSender sender = selectMessageSender("EMAIL");
        if (sender != null) {
            NotificationMessage message = new NotificationMessage(
                sender, 
                "歡迎加入我們的服務！", 
                user.getEmail()
            );
            message.send();
        }
        
        // 生成用戶報告
        ReportGenerator generator = selectReportGenerator("PDF");
        if (generator != null) {
            Map<String, Object> data = new HashMap<>();
            data.put("user", user);
            
            UserReport report = new UserReport(generator, "新用戶報告", data, "新用戶");
            report.generate();
            report.export("/reports/user_" + user.getId() + ".pdf");
        }
    }
    
    private DatabaseDriver selectDatabaseDriver() {
        return databaseDrivers.stream()
            .findFirst()
            .orElseThrow(() -> new RuntimeException("沒有可用的數據庫驅動"));
    }
    
    private MessageSender selectMessageSender(String type) {
        return messageSenders.stream()
            .filter(sender -> sender.getSenderType().equals(type))
            .filter(MessageSender::isAvailable)
            .findFirst()
            .orElse(null);
    }
    
    private ReportGenerator selectReportGenerator(String format) {
        return reportGenerators.stream()
            .filter(generator -> generator.getFormat().equals(format))
            .findFirst()
            .orElse(null);
    }
}
```

### 測試策略

```java
@ExtendWith(MockitoExtension.class)
class BridgePatternTest {
    
    @Mock
    private DatabaseDriver mockDatabaseDriver;
    
    @Mock
    private MessageSender mockMessageSender;
    
    @Mock
    private ReportGenerator mockReportGenerator;
    
    @Test
    void testUserDatabaseOperation() {
        // Given
        Connection mockConnection = mock(Connection.class);
        PreparedStatement mockStatement = mock(PreparedStatement.class);
        
        when(mockDatabaseDriver.getConnection()).thenReturn(mockConnection);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        
        UserDatabaseOperation operation = new UserDatabaseOperation(mockDatabaseDriver);
        User user = User.builder()
            .name("測試用戶")
            .email("test@example.com")
            .createdAt(LocalDateTime.now())
            .build();
        
        // When
        operation.createUser(user);
        
        // Then
        verify(mockDatabaseDriver).getConnection();
        verify(mockStatement).setString(1, "測試用戶");
        verify(mockStatement).setString(2, "test@example.com");
        verify(mockStatement).executeUpdate();
    }
    
    @Test
    void testNotificationMessage() {
        // Given
        when(mockMessageSender.isAvailable()).thenReturn(true);
        when(mockMessageSender.getSenderType()).thenReturn("EMAIL");
        
        NotificationMessage message = new NotificationMessage(
            mockMessageSender, 
            "測試消息", 
            "test@example.com"
        );
        
        // When
        message.send();
        
        // Then
        verify(mockMessageSender).sendMessage("test@example.com", "測試消息");
    }
    
    @Test
    void testSalesReport() {
        // Given
        when(mockReportGenerator.getFormat()).thenReturn("PDF");
        when(mockReportGenerator.supportsCharts()).thenReturn(true);
        when(mockReportGenerator.generateContent(anyString(), any())).thenReturn("PDF內容");
        
        SalesReport report = new SalesReport(
            mockReportGenerator, 
            "銷售報告", 
            new HashMap<>(), 
            "2023年第一季度"
        );
        
        // When
        report.generate();
        
        // Then
        verify(mockReportGenerator).generateContent(eq("銷售報告"), any());
    }
}
```

### 性能優化與最佳實踐

#### 1. 連接池管理

```java
@Component
public class DatabaseConnectionPool {
    private final Map<String, HikariDataSource> dataSources = new ConcurrentHashMap<>();
    
    public Connection getConnection(String driverType) {
        HikariDataSource dataSource = dataSources.computeIfAbsent(driverType, this::createDataSource);
        try {
            return dataSource.getConnection();
        } catch (SQLException e) {
            throw new DatabaseConnectionException("無法從連接池獲取連接", e);
        }
    }
    
    private HikariDataSource createDataSource(String driverType) {
        HikariConfig config = new HikariConfig();
        // 根據驅動類型配置連接池
        return new HikariDataSource(config);
    }
}
```

#### 2. 異步消息處理

```java
@Component
public class AsyncMessageProcessor {
    private final TaskExecutor taskExecutor;
    
    public AsyncMessageProcessor(TaskExecutor taskExecutor) {
        this.taskExecutor = taskExecutor;
    }
    
    public CompletableFuture<Void> sendMessageAsync(Message message) {
        return CompletableFuture.runAsync(() -> {
            try {
                message.send();
            } catch (Exception e) {
                // 記錄錯誤並進行重試
                handleMessageError(message, e);
            }
        }, taskExecutor);
    }
    
    private void handleMessageError(Message message, Exception e) {
        // 錯誤處理邏輯
    }
}
```

### 監控與診斷

```java
@Component
public class BridgePatternMonitor {
    private final MeterRegistry meterRegistry;
    
    public BridgePatternMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public void recordDatabaseOperation(String operation, String driver, boolean success) {
        Counter.builder("bridge.database.operations")
            .tag("operation", operation)
            .tag("driver", driver)
            .tag("success", String.valueOf(success))
            .register(meterRegistry)
            .increment();
    }
    
    public void recordMessageSent(String senderType, boolean success) {
        Counter.builder("bridge.message.sent")
            .tag("sender", senderType)
            .tag("success", String.valueOf(success))
            .register(meterRegistry)
            .increment();
    }
    
    public void recordReportGenerated(String format, long durationMs) {
        Timer.builder("bridge.report.generation")
            .tag("format", format)
            .register(meterRegistry)
            .record(durationMs, TimeUnit.MILLISECONDS);
    }
}
```

### 總結

橋接模式是一種強大的結構型設計模式，特別適用於：

1. **多維度變化**：當系統需要在多個維度上變化時
2. **抽象與實現分離**：需要將抽象和實現解耦
3. **運行時切換**：需要在運行時動態切換實現
4. **避免類爆炸**：減少繼承層次結構的複雜性

#### 關鍵最佳實踐

1. **明確職責分離**：清楚區分抽象和實現的職責
2. **介面設計**：設計穩定的實現者介面
3. **依賴注入**：使用依賴注入管理實現者
4. **配置驅動**：通過配置選擇適當的實現
5. **監控診斷**：追蹤橋接模式的使用情況

橋接模式讓抽象和實現可以獨立變化，是構建靈活、可擴展系統的重要工具。正確使用橋接模式可以大幅提升系統的維護性和擴展性。