---
title: "責任鏈模式 (Chain of Responsibility Pattern) 完整實作指南：請求處理的動態流程控制"
author: Bill.Lin
date: 2018-08-07T22:37:08+08:00
draft: false
tags: ["Design Pattern", "Chain of Responsibility", "Behavioral Pattern", "Request Processing", "Loose Coupling", "Flow Control", "Java", "Spring Boot", "Enterprise Architecture", "Handler Chain", "Middleware", "Pipeline Pattern", "Request Response"]
Description: "深入探討責任鏈模式的完整實作指南，包含請求處理流程、動態責任分配、企業級中介軟體應用與最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 責任鏈模式 (Chain of Responsibility Pattern) 完整實作指南

### 模式概述

責任鏈模式是一種行為設計模式，它允許你將請求沿著處理者鏈傳遞，直到其中一個處理者處理該請求。該模式讓多個對象都有機會處理請求，從而避免了請求的發送者和接收者之間的耦合關係。

### 核心概念

責任鏈模式解決的核心問題：

- **請求與處理者解耦**：發送者不需要知道具體的處理者
- **動態處理流程**：可以動態地組合和重排處理者
- **請求路由**：請求會自動流向合適的處理者
- **擴展性**：易於添加新的處理者，不影響現有代碼

### 基本架構

#### 1. 傳統責任鏈實現

```java
// 請求基類
public abstract class Request {
    private String requestId;
    private RequestType type;
    private Object data;
    private LocalDateTime timestamp;
    
    public Request(RequestType type, Object data) {
        this.requestId = UUID.randomUUID().toString();
        this.type = type;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getter 和 Setter 方法
    public String getRequestId() { return requestId; }
    public RequestType getType() { return type; }
    public Object getData() { return data; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

// 請求類型枚舉
public enum RequestType {
    AUTHENTICATION, AUTHORIZATION, VALIDATION, PROCESSING, LOGGING
}

// 處理者抽象類
public abstract class Handler {
    protected Handler nextHandler;
    
    public void setNext(Handler handler) {
        this.nextHandler = handler;
    }
    
    public Handler getNext() {
        return nextHandler;
    }
    
    public abstract boolean canHandle(Request request);
    public abstract void handle(Request request);
    
    // 處理請求的公共方法
    public void processRequest(Request request) {
        if (canHandle(request)) {
            handle(request);
        } else if (nextHandler != null) {
            nextHandler.processRequest(request);
        } else {
            handleUnprocessedRequest(request);
        }
    }
    
    protected void handleUnprocessedRequest(Request request) {
        System.out.println("請求無法處理: " + request.getRequestId());
    }
}
```

#### 2. 具體處理者實現

```java
// 認證處理者
public class AuthenticationHandler extends Handler {
    private AuthenticationService authService;
    
    public AuthenticationHandler(AuthenticationService authService) {
        this.authService = authService;
    }
    
    @Override
    public boolean canHandle(Request request) {
        return request.getType() == RequestType.AUTHENTICATION;
    }
    
    @Override
    public void handle(Request request) {
        System.out.println("處理認證請求: " + request.getRequestId());
        
        if (request.getData() instanceof AuthenticationRequest) {
            AuthenticationRequest authRequest = (AuthenticationRequest) request.getData();
            
            try {
                boolean isValid = authService.authenticate(authRequest.getUsername(), authRequest.getPassword());
                
                if (isValid) {
                    System.out.println("認證成功: " + authRequest.getUsername());
                    // 創建下一個處理階段的請求
                    AuthorizationRequest authzRequest = new AuthorizationRequest(
                        authRequest.getUsername(), 
                        authRequest.getResource()
                    );
                    Request nextRequest = new Request(RequestType.AUTHORIZATION, authzRequest);
                    
                    if (nextHandler != null) {
                        nextHandler.processRequest(nextRequest);
                    }
                } else {
                    System.out.println("認證失敗: " + authRequest.getUsername());
                }
            } catch (Exception e) {
                System.err.println("認證處理出錯: " + e.getMessage());
            }
        }
    }
}

// 授權處理者
public class AuthorizationHandler extends Handler {
    private AuthorizationService authzService;
    
    public AuthorizationHandler(AuthorizationService authzService) {
        this.authzService = authzService;
    }
    
    @Override
    public boolean canHandle(Request request) {
        return request.getType() == RequestType.AUTHORIZATION;
    }
    
    @Override
    public void handle(Request request) {
        System.out.println("處理授權請求: " + request.getRequestId());
        
        if (request.getData() instanceof AuthorizationRequest) {
            AuthorizationRequest authzRequest = (AuthorizationRequest) request.getData();
            
            try {
                boolean hasPermission = authzService.authorize(
                    authzRequest.getUsername(), 
                    authzRequest.getResource()
                );
                
                if (hasPermission) {
                    System.out.println("授權成功: " + authzRequest.getUsername() + 
                                     " 訪問 " + authzRequest.getResource());
                    
                    // 創建驗證請求
                    ValidationRequest validationRequest = new ValidationRequest(
                        authzRequest.getUsername(), 
                        authzRequest.getResource()
                    );
                    Request nextRequest = new Request(RequestType.VALIDATION, validationRequest);
                    
                    if (nextHandler != null) {
                        nextHandler.processRequest(nextRequest);
                    }
                } else {
                    System.out.println("授權失敗: " + authzRequest.getUsername() + 
                                     " 無權訪問 " + authzRequest.getResource());
                }
            } catch (Exception e) {
                System.err.println("授權處理出錯: " + e.getMessage());
            }
        }
    }
}

// 驗證處理者
public class ValidationHandler extends Handler {
    private ValidationService validationService;
    
    public ValidationHandler(ValidationService validationService) {
        this.validationService = validationService;
    }
    
    @Override
    public boolean canHandle(Request request) {
        return request.getType() == RequestType.VALIDATION;
    }
    
    @Override
    public void handle(Request request) {
        System.out.println("處理驗證請求: " + request.getRequestId());
        
        if (request.getData() instanceof ValidationRequest) {
            ValidationRequest validationRequest = (ValidationRequest) request.getData();
            
            try {
                ValidationResult result = validationService.validate(validationRequest);
                
                if (result.isValid()) {
                    System.out.println("驗證成功: " + validationRequest.getUsername());
                    
                    // 創建處理請求
                    ProcessingRequest processingRequest = new ProcessingRequest(
                        validationRequest.getUsername(), 
                        validationRequest.getResource(),
                        result.getValidatedData()
                    );
                    Request nextRequest = new Request(RequestType.PROCESSING, processingRequest);
                    
                    if (nextHandler != null) {
                        nextHandler.processRequest(nextRequest);
                    }
                } else {
                    System.out.println("驗證失敗: " + result.getErrorMessage());
                }
            } catch (Exception e) {
                System.err.println("驗證處理出錯: " + e.getMessage());
            }
        }
    }
}

// 業務處理者
public class ProcessingHandler extends Handler {
    private BusinessService businessService;
    
    public ProcessingHandler(BusinessService businessService) {
        this.businessService = businessService;
    }
    
    @Override
    public boolean canHandle(Request request) {
        return request.getType() == RequestType.PROCESSING;
    }
    
    @Override
    public void handle(Request request) {
        System.out.println("處理業務請求: " + request.getRequestId());
        
        if (request.getData() instanceof ProcessingRequest) {
            ProcessingRequest processingRequest = (ProcessingRequest) request.getData();
            
            try {
                BusinessResult result = businessService.process(processingRequest);
                
                if (result.isSuccess()) {
                    System.out.println("業務處理成功: " + result.getMessage());
                    
                    // 創建日誌請求
                    LoggingRequest loggingRequest = new LoggingRequest(
                        processingRequest.getUsername(),
                        "業務處理成功",
                        result
                    );
                    Request nextRequest = new Request(RequestType.LOGGING, loggingRequest);
                    
                    if (nextHandler != null) {
                        nextHandler.processRequest(nextRequest);
                    }
                } else {
                    System.out.println("業務處理失敗: " + result.getErrorMessage());
                }
            } catch (Exception e) {
                System.err.println("業務處理出錯: " + e.getMessage());
            }
        }
    }
}

// 日誌處理者
public class LoggingHandler extends Handler {
    private LoggingService loggingService;
    
    public LoggingHandler(LoggingService loggingService) {
        this.loggingService = loggingService;
    }
    
    @Override
    public boolean canHandle(Request request) {
        return request.getType() == RequestType.LOGGING;
    }
    
    @Override
    public void handle(Request request) {
        System.out.println("處理日誌請求: " + request.getRequestId());
        
        if (request.getData() instanceof LoggingRequest) {
            LoggingRequest loggingRequest = (LoggingRequest) request.getData();
            
            try {
                loggingService.log(
                    loggingRequest.getUsername(),
                    loggingRequest.getMessage(),
                    loggingRequest.getData()
                );
                
                System.out.println("日誌記錄完成: " + loggingRequest.getMessage());
            } catch (Exception e) {
                System.err.println("日誌處理出錯: " + e.getMessage());
            }
        }
    }
}
```

#### 3. 請求數據類

```java
// 認證請求
public class AuthenticationRequest {
    private String username;
    private String password;
    private String resource;
    
    public AuthenticationRequest(String username, String password, String resource) {
        this.username = username;
        this.password = password;
        this.resource = resource;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getResource() { return resource; }
}

// 授權請求
public class AuthorizationRequest {
    private String username;
    private String resource;
    
    public AuthorizationRequest(String username, String resource) {
        this.username = username;
        this.resource = resource;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public String getResource() { return resource; }
}

// 驗證請求
public class ValidationRequest {
    private String username;
    private String resource;
    private Map<String, Object> parameters;
    
    public ValidationRequest(String username, String resource) {
        this.username = username;
        this.resource = resource;
        this.parameters = new HashMap<>();
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public String getResource() { return resource; }
    public Map<String, Object> getParameters() { return parameters; }
    public void addParameter(String key, Object value) { parameters.put(key, value); }
}

// 處理請求
public class ProcessingRequest {
    private String username;
    private String resource;
    private Object validatedData;
    
    public ProcessingRequest(String username, String resource, Object validatedData) {
        this.username = username;
        this.resource = resource;
        this.validatedData = validatedData;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public String getResource() { return resource; }
    public Object getValidatedData() { return validatedData; }
}

// 日誌請求
public class LoggingRequest {
    private String username;
    private String message;
    private Object data;
    
    public LoggingRequest(String username, String message, Object data) {
        this.username = username;
        this.message = message;
        this.data = data;
    }
    
    // Getter 和 Setter 方法
    public String getUsername() { return username; }
    public String getMessage() { return message; }
    public Object getData() { return data; }
}
```

### 現代責任鏈實現

#### 1. 流式處理器鏈

```java
// 處理器函數接口
@FunctionalInterface
public interface RequestProcessor<T> {
    ProcessingResult<T> process(T request);
}

// 處理結果
public class ProcessingResult<T> {
    private boolean processed;
    private T result;
    private String message;
    private Exception error;
    
    private ProcessingResult(boolean processed, T result, String message, Exception error) {
        this.processed = processed;
        this.result = result;
        this.message = message;
        this.error = error;
    }
    
    public static <T> ProcessingResult<T> processed(T result) {
        return new ProcessingResult<>(true, result, null, null);
    }
    
    public static <T> ProcessingResult<T> processed(T result, String message) {
        return new ProcessingResult<>(true, result, message, null);
    }
    
    public static <T> ProcessingResult<T> notProcessed() {
        return new ProcessingResult<>(false, null, null, null);
    }
    
    public static <T> ProcessingResult<T> error(Exception error) {
        return new ProcessingResult<>(false, null, null, error);
    }
    
    // Getter 方法
    public boolean isProcessed() { return processed; }
    public T getResult() { return result; }
    public String getMessage() { return message; }
    public Exception getError() { return error; }
    public boolean hasError() { return error != null; }
}

// 現代責任鏈實現
public class ProcessorChain<T> {
    private final List<RequestProcessor<T>> processors;
    
    public ProcessorChain() {
        this.processors = new ArrayList<>();
    }
    
    public ProcessorChain<T> addProcessor(RequestProcessor<T> processor) {
        processors.add(processor);
        return this;
    }
    
    public ProcessorChain<T> addProcessor(Predicate<T> condition, RequestProcessor<T> processor) {
        processors.add(request -> {
            if (condition.test(request)) {
                return processor.process(request);
            }
            return ProcessingResult.notProcessed();
        });
        return this;
    }
    
    public ProcessingResult<T> process(T request) {
        for (RequestProcessor<T> processor : processors) {
            try {
                ProcessingResult<T> result = processor.process(request);
                if (result.isProcessed()) {
                    return result;
                }
                if (result.hasError()) {
                    return result;
                }
            } catch (Exception e) {
                return ProcessingResult.error(e);
            }
        }
        return ProcessingResult.notProcessed();
    }
}
```

#### 2. 中介軟體模式

```java
// 中介軟體接口
@FunctionalInterface
public interface Middleware<T> {
    void process(T request, MiddlewareChain<T> chain);
}

// 中介軟體鏈
public class MiddlewareChain<T> {
    private final List<Middleware<T>> middlewares;
    private int currentIndex = 0;
    
    public MiddlewareChain(List<Middleware<T>> middlewares) {
        this.middlewares = new ArrayList<>(middlewares);
    }
    
    public void next(T request) {
        if (currentIndex < middlewares.size()) {
            Middleware<T> middleware = middlewares.get(currentIndex++);
            middleware.process(request, this);
        }
    }
    
    public void reset() {
        currentIndex = 0;
    }
}

// 中介軟體管理器
public class MiddlewareManager<T> {
    private final List<Middleware<T>> middlewares;
    
    public MiddlewareManager() {
        this.middlewares = new ArrayList<>();
    }
    
    public MiddlewareManager<T> use(Middleware<T> middleware) {
        middlewares.add(middleware);
        return this;
    }
    
    public void process(T request) {
        MiddlewareChain<T> chain = new MiddlewareChain<>(middlewares);
        chain.next(request);
    }
}
```

### 企業級應用場景

#### 1. HTTP 請求處理管道

```java
// HTTP 請求對象
public class HttpRequestContext {
    private String method;
    private String path;
    private Map<String, String> headers;
    private Map<String, String> parameters;
    private Object body;
    private String userAgent;
    private String clientIp;
    private LocalDateTime timestamp;
    
    public HttpRequestContext(String method, String path) {
        this.method = method;
        this.path = path;
        this.headers = new HashMap<>();
        this.parameters = new HashMap<>();
        this.timestamp = LocalDateTime.now();
    }
    
    // Getter 和 Setter 方法
    public String getMethod() { return method; }
    public String getPath() { return path; }
    public Map<String, String> getHeaders() { return headers; }
    public Map<String, String> getParameters() { return parameters; }
    public Object getBody() { return body; }
    public void setBody(Object body) { this.body = body; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getClientIp() { return clientIp; }
    public void setClientIp(String clientIp) { this.clientIp = clientIp; }
    public LocalDateTime getTimestamp() { return timestamp; }
    
    public void addHeader(String key, String value) { headers.put(key, value); }
    public void addParameter(String key, String value) { parameters.put(key, value); }
}

// 安全檢查中介軟體
public class SecurityMiddleware implements Middleware<HttpRequestContext> {
    private final SecurityService securityService;
    
    public SecurityMiddleware(SecurityService securityService) {
        this.securityService = securityService;
    }
    
    @Override
    public void process(HttpRequestContext request, MiddlewareChain<HttpRequestContext> chain) {
        System.out.println("執行安全檢查中介軟體");
        
        // 檢查 IP 白名單
        if (!securityService.isAllowedIp(request.getClientIp())) {
            System.out.println("IP 地址被拒絕: " + request.getClientIp());
            return;
        }
        
        // 檢查 User-Agent
        if (!securityService.isValidUserAgent(request.getUserAgent())) {
            System.out.println("無效的 User-Agent: " + request.getUserAgent());
            return;
        }
        
        // 檢查請求頻率
        if (!securityService.checkRateLimit(request.getClientIp())) {
            System.out.println("請求頻率過高: " + request.getClientIp());
            return;
        }
        
        System.out.println("安全檢查通過");
        chain.next(request);
    }
}

// 認證中介軟體
public class AuthenticationMiddleware implements Middleware<HttpRequestContext> {
    private final AuthenticationService authService;
    
    public AuthenticationMiddleware(AuthenticationService authService) {
        this.authService = authService;
    }
    
    @Override
    public void process(HttpRequestContext request, MiddlewareChain<HttpRequestContext> chain) {
        System.out.println("執行認證中介軟體");
        
        String authHeader = request.getHeaders().get("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("缺少認證令牌");
            return;
        }
        
        String token = authHeader.substring(7);
        try {
            UserInfo userInfo = authService.validateToken(token);
            if (userInfo != null) {
                request.addParameter("userId", userInfo.getUserId());
                request.addParameter("username", userInfo.getUsername());
                System.out.println("認證成功: " + userInfo.getUsername());
                chain.next(request);
            } else {
                System.out.println("無效的認證令牌");
            }
        } catch (Exception e) {
            System.out.println("認證失敗: " + e.getMessage());
        }
    }
}

// 授權中介軟體
public class AuthorizationMiddleware implements Middleware<HttpRequestContext> {
    private final AuthorizationService authzService;
    
    public AuthorizationMiddleware(AuthorizationService authzService) {
        this.authzService = authzService;
    }
    
    @Override
    public void process(HttpRequestContext request, MiddlewareChain<HttpRequestContext> chain) {
        System.out.println("執行授權中介軟體");
        
        String userId = request.getParameters().get("userId");
        if (userId == null) {
            System.out.println("用戶未認證");
            return;
        }
        
        try {
            boolean hasPermission = authzService.hasPermission(userId, request.getPath(), request.getMethod());
            if (hasPermission) {
                System.out.println("授權成功: " + userId + " 訪問 " + request.getPath());
                chain.next(request);
            } else {
                System.out.println("授權失敗: 用戶 " + userId + " 無權訪問 " + request.getPath());
            }
        } catch (Exception e) {
            System.out.println("授權檢查失敗: " + e.getMessage());
        }
    }
}

// 日誌中介軟體
public class LoggingMiddleware implements Middleware<HttpRequestContext> {
    private final LoggingService loggingService;
    
    public LoggingMiddleware(LoggingService loggingService) {
        this.loggingService = loggingService;
    }
    
    @Override
    public void process(HttpRequestContext request, MiddlewareChain<HttpRequestContext> chain) {
        long startTime = System.currentTimeMillis();
        
        System.out.println("請求開始: " + request.getMethod() + " " + request.getPath());
        
        try {
            chain.next(request);
        } finally {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            LogEntry logEntry = new LogEntry(
                request.getMethod(),
                request.getPath(),
                request.getClientIp(),
                request.getParameters().get("userId"),
                duration,
                request.getTimestamp()
            );
            
            loggingService.log(logEntry);
            System.out.println("請求完成: " + request.getMethod() + " " + request.getPath() + 
                             " 耗時: " + duration + "ms");
        }
    }
}

// 業務處理中介軟體
public class BusinessProcessingMiddleware implements Middleware<HttpRequestContext> {
    private final BusinessService businessService;
    
    public BusinessProcessingMiddleware(BusinessService businessService) {
        this.businessService = businessService;
    }
    
    @Override
    public void process(HttpRequestContext request, MiddlewareChain<HttpRequestContext> chain) {
        System.out.println("執行業務處理中介軟體");
        
        try {
            BusinessResult result = businessService.processRequest(request);
            
            if (result.isSuccess()) {
                System.out.println("業務處理成功: " + result.getMessage());
                request.addParameter("result", result.getData());
            } else {
                System.out.println("業務處理失敗: " + result.getErrorMessage());
            }
        } catch (Exception e) {
            System.out.println("業務處理異常: " + e.getMessage());
        }
    }
}
```

#### 2. 工作流程處理系統

```java
// 工作流程請求
public class WorkflowRequest {
    private String workflowId;
    private String requestId;
    private String initiator;
    private WorkflowType type;
    private Map<String, Object> data;
    private WorkflowStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public WorkflowRequest(String workflowId, String initiator, WorkflowType type) {
        this.workflowId = workflowId;
        this.requestId = UUID.randomUUID().toString();
        this.initiator = initiator;
        this.type = type;
        this.data = new HashMap<>();
        this.status = WorkflowStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getter 和 Setter 方法
    public String getWorkflowId() { return workflowId; }
    public String getRequestId() { return requestId; }
    public String getInitiator() { return initiator; }
    public WorkflowType getType() { return type; }
    public Map<String, Object> getData() { return data; }
    public WorkflowStatus getStatus() { return status; }
    public void setStatus(WorkflowStatus status) { 
        this.status = status; 
        this.updatedAt = LocalDateTime.now();
    }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    
    public void addData(String key, Object value) { data.put(key, value); }
    public Object getData(String key) { return data.get(key); }
}

// 工作流程類型
public enum WorkflowType {
    LEAVE_REQUEST, EXPENSE_REPORT, PURCHASE_ORDER, DOCUMENT_APPROVAL
}

// 工作流程狀態
public enum WorkflowStatus {
    PENDING, IN_PROGRESS, APPROVED, REJECTED, CANCELLED
}

// 工作流程步驟處理者
public abstract class WorkflowStepHandler {
    protected WorkflowStepHandler nextHandler;
    protected String stepName;
    
    public WorkflowStepHandler(String stepName) {
        this.stepName = stepName;
    }
    
    public void setNext(WorkflowStepHandler handler) {
        this.nextHandler = handler;
    }
    
    public abstract boolean canHandle(WorkflowRequest request);
    public abstract StepResult handle(WorkflowRequest request);
    
    public StepResult process(WorkflowRequest request) {
        if (canHandle(request)) {
            System.out.println("執行步驟: " + stepName);
            StepResult result = handle(request);
            
            if (result.isSuccess() && nextHandler != null) {
                return nextHandler.process(request);
            }
            return result;
        } else if (nextHandler != null) {
            return nextHandler.process(request);
        } else {
            return StepResult.failure("沒有適當的處理者處理此請求");
        }
    }
}

// 步驟結果
public class StepResult {
    private boolean success;
    private String message;
    private Object data;
    
    private StepResult(boolean success, String message, Object data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    public static StepResult success(String message) {
        return new StepResult(true, message, null);
    }
    
    public static StepResult success(String message, Object data) {
        return new StepResult(true, message, data);
    }
    
    public static StepResult failure(String message) {
        return new StepResult(false, message, null);
    }
    
    // Getter 方法
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public Object getData() { return data; }
}

// 請假申請初始檢查處理者
public class LeaveRequestInitialCheckHandler extends WorkflowStepHandler {
    private final LeaveService leaveService;
    
    public LeaveRequestInitialCheckHandler(LeaveService leaveService) {
        super("請假申請初始檢查");
        this.leaveService = leaveService;
    }
    
    @Override
    public boolean canHandle(WorkflowRequest request) {
        return request.getType() == WorkflowType.LEAVE_REQUEST &&
               request.getStatus() == WorkflowStatus.PENDING;
    }
    
    @Override
    public StepResult handle(WorkflowRequest request) {
        try {
            // 檢查基本信息
            String employeeId = (String) request.getData("employeeId");
            LocalDate startDate = (LocalDate) request.getData("startDate");
            LocalDate endDate = (LocalDate) request.getData("endDate");
            String reason = (String) request.getData("reason");
            
            if (employeeId == null || startDate == null || endDate == null || reason == null) {
                return StepResult.failure("缺少必要的請假信息");
            }
            
            // 檢查日期有效性
            if (startDate.isAfter(endDate)) {
                return StepResult.failure("開始日期不能晚於結束日期");
            }
            
            if (startDate.isBefore(LocalDate.now())) {
                return StepResult.failure("不能申請過去的日期");
            }
            
            // 檢查請假天數
            long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
            if (days > 30) {
                return StepResult.failure("單次請假不能超過30天");
            }
            
            // 檢查剩餘假期
            int remainingDays = leaveService.getRemainingLeaveDays(employeeId);
            if (days > remainingDays) {
                return StepResult.failure("請假天數超過剩餘假期");
            }
            
            request.setStatus(WorkflowStatus.IN_PROGRESS);
            request.addData("leaveDays", days);
            request.addData("checkTime", LocalDateTime.now());
            
            return StepResult.success("初始檢查通過");
            
        } catch (Exception e) {
            return StepResult.failure("初始檢查失敗: " + e.getMessage());
        }
    }
}

// 主管審批處理者
public class ManagerApprovalHandler extends WorkflowStepHandler {
    private final ManagerService managerService;
    
    public ManagerApprovalHandler(ManagerService managerService) {
        super("主管審批");
        this.managerService = managerService;
    }
    
    @Override
    public boolean canHandle(WorkflowRequest request) {
        return request.getType() == WorkflowType.LEAVE_REQUEST &&
               request.getStatus() == WorkflowStatus.IN_PROGRESS &&
               request.getData("managerApproval") == null;
    }
    
    @Override
    public StepResult handle(WorkflowRequest request) {
        try {
            String employeeId = (String) request.getData("employeeId");
            Long leaveDays = (Long) request.getData("leaveDays");
            
            // 獲取員工的直屬主管
            String managerId = managerService.getDirectManager(employeeId);
            if (managerId == null) {
                return StepResult.failure("無法找到直屬主管");
            }
            
            // 模擬主管審批流程
            ApprovalResult approval = managerService.requestApproval(
                managerId, request.getRequestId(), leaveDays
            );
            
            if (approval.isApproved()) {
                request.addData("managerApproval", true);
                request.addData("managerId", managerId);
                request.addData("managerApprovalTime", LocalDateTime.now());
                return StepResult.success("主管審批通過");
            } else {
                request.setStatus(WorkflowStatus.REJECTED);
                request.addData("managerApproval", false);
                request.addData("rejectionReason", approval.getReason());
                return StepResult.failure("主管審批拒絕: " + approval.getReason());
            }
            
        } catch (Exception e) {
            return StepResult.failure("主管審批失敗: " + e.getMessage());
        }
    }
}

// HR 審批處理者
public class HrApprovalHandler extends WorkflowStepHandler {
    private final HrService hrService;
    
    public HrApprovalHandler(HrService hrService) {
        super("HR 審批");
        this.hrService = hrService;
    }
    
    @Override
    public boolean canHandle(WorkflowRequest request) {
        return request.getType() == WorkflowType.LEAVE_REQUEST &&
               request.getStatus() == WorkflowStatus.IN_PROGRESS &&
               Boolean.TRUE.equals(request.getData("managerApproval")) &&
               request.getData("hrApproval") == null;
    }
    
    @Override
    public StepResult handle(WorkflowRequest request) {
        try {
            String employeeId = (String) request.getData("employeeId");
            Long leaveDays = (Long) request.getData("leaveDays");
            
            // 長期請假需要 HR 審批
            if (leaveDays > 5) {
                ApprovalResult approval = hrService.requestApproval(
                    request.getRequestId(), employeeId, leaveDays
                );
                
                if (approval.isApproved()) {
                    request.addData("hrApproval", true);
                    request.addData("hrApprovalTime", LocalDateTime.now());
                    return StepResult.success("HR 審批通過");
                } else {
                    request.setStatus(WorkflowStatus.REJECTED);
                    request.addData("hrApproval", false);
                    request.addData("rejectionReason", approval.getReason());
                    return StepResult.failure("HR 審批拒絕: " + approval.getReason());
                }
            } else {
                // 短期請假自動通過
                request.addData("hrApproval", true);
                request.addData("hrApprovalTime", LocalDateTime.now());
                return StepResult.success("HR 審批自動通過");
            }
            
        } catch (Exception e) {
            return StepResult.failure("HR 審批失敗: " + e.getMessage());
        }
    }
}

// 最終處理者
public class FinalProcessingHandler extends WorkflowStepHandler {
    private final LeaveService leaveService;
    private final NotificationService notificationService;
    
    public FinalProcessingHandler(LeaveService leaveService, NotificationService notificationService) {
        super("最終處理");
        this.leaveService = leaveService;
        this.notificationService = notificationService;
    }
    
    @Override
    public boolean canHandle(WorkflowRequest request) {
        return request.getType() == WorkflowType.LEAVE_REQUEST &&
               request.getStatus() == WorkflowStatus.IN_PROGRESS &&
               Boolean.TRUE.equals(request.getData("managerApproval")) &&
               Boolean.TRUE.equals(request.getData("hrApproval"));
    }
    
    @Override
    public StepResult handle(WorkflowRequest request) {
        try {
            String employeeId = (String) request.getData("employeeId");
            LocalDate startDate = (LocalDate) request.getData("startDate");
            LocalDate endDate = (LocalDate) request.getData("endDate");
            Long leaveDays = (Long) request.getData("leaveDays");
            
            // 創建請假記錄
            LeaveRecord record = leaveService.createLeaveRecord(
                employeeId, startDate, endDate, leaveDays.intValue()
            );
            
            // 更新請假餘額
            leaveService.updateLeaveBalance(employeeId, -leaveDays.intValue());
            
            // 發送通知
            notificationService.sendLeaveApprovalNotification(
                employeeId, record.getLeaveId(), startDate, endDate
            );
            
            request.setStatus(WorkflowStatus.APPROVED);
            request.addData("leaveRecordId", record.getLeaveId());
            request.addData("completedTime", LocalDateTime.now());
            
            return StepResult.success("請假申請處理完成");
            
        } catch (Exception e) {
            return StepResult.failure("最終處理失敗: " + e.getMessage());
        }
    }
}
```

### Spring Boot 整合

#### 1. 配置類

```java
@Configuration
@EnableAsync
public class ChainOfResponsibilityConfig {
    
    @Bean
    public AuthenticationService authenticationService() {
        return new AuthenticationService();
    }
    
    @Bean
    public AuthorizationService authorizationService() {
        return new AuthorizationService();
    }
    
    @Bean
    public SecurityService securityService() {
        return new SecurityService();
    }
    
    @Bean
    public LoggingService loggingService() {
        return new LoggingService();
    }
    
    @Bean
    public BusinessService businessService() {
        return new BusinessService();
    }
    
    @Bean
    public MiddlewareManager<HttpRequestContext> httpMiddlewareManager(
            SecurityService securityService,
            AuthenticationService authenticationService,
            AuthorizationService authorizationService,
            LoggingService loggingService,
            BusinessService businessService) {
        
        return new MiddlewareManager<HttpRequestContext>()
            .use(new LoggingMiddleware(loggingService))
            .use(new SecurityMiddleware(securityService))
            .use(new AuthenticationMiddleware(authenticationService))
            .use(new AuthorizationMiddleware(authorizationService))
            .use(new BusinessProcessingMiddleware(businessService));
    }
    
    @Bean
    public WorkflowStepHandler workflowChain(
            LeaveService leaveService,
            ManagerService managerService,
            HrService hrService,
            NotificationService notificationService) {
        
        WorkflowStepHandler initialCheck = new LeaveRequestInitialCheckHandler(leaveService);
        WorkflowStepHandler managerApproval = new ManagerApprovalHandler(managerService);
        WorkflowStepHandler hrApproval = new HrApprovalHandler(hrService);
        WorkflowStepHandler finalProcessing = new FinalProcessingHandler(leaveService, notificationService);
        
        initialCheck.setNext(managerApproval);
        managerApproval.setNext(hrApproval);
        hrApproval.setNext(finalProcessing);
        
        return initialCheck;
    }
}
```

#### 2. 控制器實現

```java
@RestController
@RequestMapping("/api/requests")
public class RequestController {
    
    private final MiddlewareManager<HttpRequestContext> middlewareManager;
    
    public RequestController(MiddlewareManager<HttpRequestContext> middlewareManager) {
        this.middlewareManager = middlewareManager;
    }
    
    @GetMapping("/secure-data")
    public ResponseEntity<ApiResponse<Object>> getSecureData(
            HttpServletRequest servletRequest,
            @RequestParam String resource) {
        
        HttpRequestContext context = createRequestContext(servletRequest, resource);
        
        try {
            middlewareManager.process(context);
            
            Object result = context.getParameters().get("result");
            if (result != null) {
                return ResponseEntity.ok(ApiResponse.success(result)
                    .message("數據獲取成功")
                    .build());
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.failure("請求被拒絕").build());
            }
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("處理請求時出錯").build());
        }
    }
    
    private HttpRequestContext createRequestContext(HttpServletRequest servletRequest, String resource) {
        HttpRequestContext context = new HttpRequestContext(
            servletRequest.getMethod(),
            servletRequest.getRequestURI()
        );
        
        // 復制請求頭
        Enumeration<String> headerNames = servletRequest.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            context.addHeader(headerName, servletRequest.getHeader(headerName));
        }
        
        // 設置客戶端信息
        context.setClientIp(getClientIp(servletRequest));
        context.setUserAgent(servletRequest.getHeader("User-Agent"));
        
        // 添加資源參數
        context.addParameter("resource", resource);
        
        return context;
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}

@RestController
@RequestMapping("/api/workflow")
public class WorkflowController {
    
    private final WorkflowStepHandler workflowChain;
    
    public WorkflowController(WorkflowStepHandler workflowChain) {
        this.workflowChain = workflowChain;
    }
    
    @PostMapping("/leave-request")
    public ResponseEntity<ApiResponse<String>> submitLeaveRequest(
            @RequestBody @Valid LeaveRequestDto requestDto) {
        
        try {
            WorkflowRequest workflowRequest = new WorkflowRequest(
                "leave-workflow",
                requestDto.getEmployeeId(),
                WorkflowType.LEAVE_REQUEST
            );
            
            workflowRequest.addData("employeeId", requestDto.getEmployeeId());
            workflowRequest.addData("startDate", requestDto.getStartDate());
            workflowRequest.addData("endDate", requestDto.getEndDate());
            workflowRequest.addData("reason", requestDto.getReason());
            
            StepResult result = workflowChain.process(workflowRequest);
            
            if (result.isSuccess()) {
                return ResponseEntity.ok(ApiResponse.success(workflowRequest.getRequestId())
                    .message("請假申請提交成功")
                    .build());
            } else {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.<String>failure("請假申請被拒絕")
                        .error(result.getMessage())
                        .build());
            }
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<String>failure("處理請假申請時出錯")
                    .error(e.getMessage())
                    .build());
        }
    }
}

// 請假申請 DTO
public class LeaveRequestDto {
    @NotBlank(message = "員工 ID 不能為空")
    private String employeeId;
    
    @NotNull(message = "開始日期不能為空")
    @Future(message = "開始日期必須是將來日期")
    private LocalDate startDate;
    
    @NotNull(message = "結束日期不能為空")
    @Future(message = "結束日期必須是將來日期")
    private LocalDate endDate;
    
    @NotBlank(message = "請假原因不能為空")
    @Size(max = 500, message = "請假原因不能超過500字")
    private String reason;
    
    // 構造函數、getter、setter 略
}
```

#### 3. 測試實現

```java
@SpringBootTest
class ChainOfResponsibilityTest {
    
    @Test
    void testMiddlewareChain() {
        // Given
        SecurityService securityService = new SecurityService();
        AuthenticationService authService = new AuthenticationService();
        AuthorizationService authzService = new AuthorizationService();
        LoggingService loggingService = new LoggingService();
        BusinessService businessService = new BusinessService();
        
        MiddlewareManager<HttpRequestContext> manager = new MiddlewareManager<HttpRequestContext>()
            .use(new LoggingMiddleware(loggingService))
            .use(new SecurityMiddleware(securityService))
            .use(new AuthenticationMiddleware(authService))
            .use(new AuthorizationMiddleware(authzService))
            .use(new BusinessProcessingMiddleware(businessService));
        
        HttpRequestContext context = new HttpRequestContext("GET", "/api/secure-data");
        context.setClientIp("192.168.1.100");
        context.setUserAgent("TestClient/1.0");
        context.addHeader("Authorization", "Bearer valid-token");
        
        // When
        manager.process(context);
        
        // Then
        assertThat(context.getParameters()).containsKey("userId");
        assertThat(context.getParameters()).containsKey("result");
    }
    
    @Test
    void testWorkflowChain() {
        // Given
        LeaveService leaveService = mock(LeaveService.class);
        ManagerService managerService = mock(ManagerService.class);
        HrService hrService = mock(HrService.class);
        NotificationService notificationService = mock(NotificationService.class);
        
        when(leaveService.getRemainingLeaveDays("EMP001")).thenReturn(10);
        when(managerService.getDirectManager("EMP001")).thenReturn("MGR001");
        when(managerService.requestApproval(any(), any(), any()))
            .thenReturn(new ApprovalResult(true, "批准"));
        when(hrService.requestApproval(any(), any(), any()))
            .thenReturn(new ApprovalResult(true, "批准"));
        
        WorkflowStepHandler initialCheck = new LeaveRequestInitialCheckHandler(leaveService);
        WorkflowStepHandler managerApproval = new ManagerApprovalHandler(managerService);
        WorkflowStepHandler hrApproval = new HrApprovalHandler(hrService);
        WorkflowStepHandler finalProcessing = new FinalProcessingHandler(leaveService, notificationService);
        
        initialCheck.setNext(managerApproval);
        managerApproval.setNext(hrApproval);
        hrApproval.setNext(finalProcessing);
        
        WorkflowRequest request = new WorkflowRequest("leave-workflow", "EMP001", WorkflowType.LEAVE_REQUEST);
        request.addData("employeeId", "EMP001");
        request.addData("startDate", LocalDate.now().plusDays(1));
        request.addData("endDate", LocalDate.now().plusDays(3));
        request.addData("reason", "個人事務");
        
        // When
        StepResult result = initialCheck.process(request);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(request.getStatus()).isEqualTo(WorkflowStatus.APPROVED);
        verify(leaveService).createLeaveRecord(any(), any(), any(), anyInt());
        verify(notificationService).sendLeaveApprovalNotification(any(), any(), any(), any());
    }
    
    @Test
    void testProcessorChain() {
        // Given
        ProcessorChain<String> chain = new ProcessorChain<String>()
            .addProcessor(request -> request.startsWith("A") ? 
                ProcessingResult.processed("處理A: " + request) : 
                ProcessingResult.notProcessed())
            .addProcessor(request -> request.startsWith("B") ? 
                ProcessingResult.processed("處理B: " + request) : 
                ProcessingResult.notProcessed())
            .addProcessor(request -> ProcessingResult.processed("默認處理: " + request));
        
        // When & Then
        ProcessingResult<String> result1 = chain.process("A123");
        assertThat(result1.isProcessed()).isTrue();
        assertThat(result1.getResult()).isEqualTo("處理A: A123");
        
        ProcessingResult<String> result2 = chain.process("B456");
        assertThat(result2.isProcessed()).isTrue();
        assertThat(result2.getResult()).isEqualTo("處理B: B456");
        
        ProcessingResult<String> result3 = chain.process("C789");
        assertThat(result3.isProcessed()).isTrue();
        assertThat(result3.getResult()).isEqualTo("默認處理: C789");
    }
}
```

### 性能優化與最佳實踐

#### 1. 異步處理

```java
// 異步責任鏈
@Component
public class AsyncChainProcessor {
    private final ThreadPoolTaskExecutor executor;
    
    public AsyncChainProcessor() {
        this.executor = new ThreadPoolTaskExecutor();
        this.executor.setCorePoolSize(5);
        this.executor.setMaxPoolSize(20);
        this.executor.setQueueCapacity(100);
        this.executor.setThreadNamePrefix("async-chain-");
        this.executor.initialize();
    }
    
    public <T> CompletableFuture<ProcessingResult<T>> processAsync(
            ProcessorChain<T> chain, T request) {
        return CompletableFuture.supplyAsync(() -> chain.process(request), executor);
    }
    
    public <T> void processAsync(MiddlewareManager<T> manager, T request) {
        executor.submit(() -> manager.process(request));
    }
}

// 批量處理
@Component
public class BatchChainProcessor {
    private final AsyncChainProcessor asyncProcessor;
    
    public BatchChainProcessor(AsyncChainProcessor asyncProcessor) {
        this.asyncProcessor = asyncProcessor;
    }
    
    public <T> CompletableFuture<List<ProcessingResult<T>>> processBatch(
            ProcessorChain<T> chain, List<T> requests) {
        
        List<CompletableFuture<ProcessingResult<T>>> futures = requests.stream()
            .map(request -> asyncProcessor.processAsync(chain, request))
            .collect(Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList()));
    }
}
```

#### 2. 緩存優化

```java
// 處理結果緩存
@Component
public class CachedChainProcessor {
    private final Cache<String, ProcessingResult<?>> cache;
    
    public CachedChainProcessor() {
        this.cache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(15))
            .build();
    }
    
    @SuppressWarnings("unchecked")
    public <T> ProcessingResult<T> processWithCache(
            ProcessorChain<T> chain, T request, String cacheKey) {
        
        return (ProcessingResult<T>) cache.get(cacheKey, key -> chain.process(request));
    }
    
    public void invalidateCache(String cacheKey) {
        cache.invalidate(cacheKey);
    }
    
    public void invalidateAll() {
        cache.invalidateAll();
    }
}
```

### 監控與診斷

```java
// 責任鏈監控
@Component
public class ChainMonitor {
    private final MeterRegistry meterRegistry;
    private final Counter requestCounter;
    private final Counter processedCounter;
    private final Timer processingTimer;
    
    public ChainMonitor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.requestCounter = Counter.builder("chain.requests")
            .description("Total number of requests processed by chain")
            .register(meterRegistry);
        this.processedCounter = Counter.builder("chain.processed")
            .description("Number of successfully processed requests")
            .register(meterRegistry);
        this.processingTimer = Timer.builder("chain.processing.time")
            .description("Time spent processing requests")
            .register(meterRegistry);
    }
    
    public <T> ProcessingResult<T> monitorProcess(
            ProcessorChain<T> chain, T request, String chainName) {
        
        requestCounter.increment(Tags.of("chain", chainName));
        
        return processingTimer.recordCallable(() -> {
            ProcessingResult<T> result = chain.process(request);
            if (result.isProcessed()) {
                processedCounter.increment(Tags.of("chain", chainName));
            }
            return result;
        });
    }
}
```

### 總結

責任鏈模式適用於：

1. **請求處理管道**：HTTP 請求、消息處理、工作流程
2. **動態責任分配**：根據請求類型動態選擇處理者
3. **中介軟體系統**：Web 框架、API 網關、企業服務總線
4. **擴展性需求**：易於添加新的處理者，不影響現有代碼

#### 關鍵最佳實踐

1. **處理者解耦**：每個處理者只關注自己的職責
2. **鏈式組合**：靈活組合不同的處理者
3. **錯誤處理**：每個處理者都要處理異常情況
4. **性能優化**：使用緩存、異步處理、批量操作
5. **監控診斷**：記錄處理流程和性能指標
6. **測試策略**：單元測試每個處理者，集成測試整個鏈