---
title: "Spring RestTemplate 完整實戰指南：HTTP 客戶端最佳實踐"
author: Bill.Lin
date: 2021-06-30T19:39:44+08:00
draft: false
tags: ["Spring", "RestTemplate", "HTTP Client", "WebClient", "REST API", "Microservices", "Error Handling", "Testing", "Performance"]
Description: "深入解析 Spring RestTemplate 的完整使用方法，包含配置優化、錯誤處理、攔截器、測試策略與現代化替代方案"
Categories: ["Backend"]
DisableComments: false
---

## 概述

RestTemplate 是 Spring Framework 提供的同步 HTTP 客戶端，用於簡化 RESTful Web 服務的調用。雖然在 Spring 5.0 之後被標記為維護模式（推薦使用 WebClient），但在許多現有項目中仍廣泛使用。本文將深入介紹 RestTemplate 的完整使用方法和最佳實踐。

### 核心特性

- **簡化 HTTP 操作**：提供便捷的 GET、POST、PUT、DELETE 等方法
- **自動序列化**：支援 JSON、XML 等格式的自動轉換
- **異常處理**：統一的異常處理機制
- **攔截器支援**：請求和響應攔截器
- **靈活配置**：連接池、超時、重試等配置

### 適用場景

1. **微服務通信**：服務間的 HTTP 調用
2. **第三方 API 整合**：調用外部 REST API
3. **資料同步**：不同系統間的資料交換
4. **輕量級 HTTP 客戶端**：簡單的 HTTP 請求需求

## 基礎配置與設定

### 1. 依賴配置

```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Apache HttpClient（可選，提供更好的連接池支援） -->
    <dependency>
        <groupId>org.apache.httpcomponents</groupId>
        <artifactId>httpclient</artifactId>
    </dependency>
    
    <!-- OkHttp（可選，現代化的 HTTP 客戶端） -->
    <dependency>
        <groupId>com.squareup.okhttp3</groupId>
        <artifactId>okhttp</artifactId>
    </dependency>
    
    <!-- Jackson（JSON 處理） -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    
    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 2. 基礎配置類

```java
package com.example.resttemplate.config;

import org.apache.http.client.HttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Arrays;

@Configuration
public class RestTemplateConfig {
    
    /**
     * 基礎 RestTemplate 配置
     */
    @Bean("basicRestTemplate")
    public RestTemplate basicRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 連接超時 5 秒
        factory.setReadTimeout(10000);    // 讀取超時 10 秒
        
        RestTemplate restTemplate = new RestTemplate(factory);
        
        // 添加 JSON 消息轉換器
        restTemplate.getMessageConverters().add(new MappingJackson2HttpMessageConverter());
        
        return restTemplate;
    }
    
    /**
     * 使用 RestTemplateBuilder 構建（推薦方式）
     */
    @Bean("standardRestTemplate")
    public RestTemplate standardRestTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .additionalMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }
    
    /**
     * 高性能 RestTemplate（使用 Apache HttpClient）
     */
    @Bean("highPerformanceRestTemplate")
    public RestTemplate highPerformanceRestTemplate() {
        // 連接池管理器
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(200);          // 最大連接數
        connectionManager.setDefaultMaxPerRoute(50); // 每個路由的最大連接數
        
        // HttpClient 配置
        HttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setConnectionManagerShared(true)
                .build();
        
        // 請求工廠
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        
        return new RestTemplate(factory);
    }
    
    /**
     * 帶有自訂配置的 RestTemplate
     */
    @Bean("customRestTemplate")
    public RestTemplate customRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        
        // 添加攔截器
        restTemplate.setInterceptors(Arrays.asList(
                new LoggingInterceptor(),
                new AuthenticationInterceptor(),
                new RetryInterceptor()
        ));
        
        // 設置錯誤處理器
        restTemplate.setErrorHandler(new CustomResponseErrorHandler());
        
        return restTemplate;
    }
}
```

### 3. 屬性配置

```yaml
# application.yml
rest-client:
  connection:
    timeout: 5000
    read-timeout: 10000
    max-connections: 200
    max-connections-per-route: 50
  retry:
    max-attempts: 3
    delay: 1000
  base-urls:
    user-service: "http://localhost:8081"
    order-service: "http://localhost:8082"
    payment-service: "http://localhost:8083"
```

```java
@ConfigurationProperties(prefix = "rest-client")
@Component
public class RestClientProperties {
    
    private Connection connection = new Connection();
    private Retry retry = new Retry();
    private Map<String, String> baseUrls = new HashMap<>();
    
    // getter 和 setter 方法
    
    public static class Connection {
        private int timeout = 5000;
        private int readTimeout = 10000;
        private int maxConnections = 200;
        private int maxConnectionsPerRoute = 50;
        
        // getter 和 setter 方法
    }
    
    public static class Retry {
        private int maxAttempts = 3;
        private long delay = 1000;
        
        // getter 和 setter 方法
    }
}
```

## 基礎 HTTP 操作

### 1. GET 請求

```java
package com.example.resttemplate.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RestClientService {
    
    private final RestTemplate restTemplate;
    
    public RestClientService(@Qualifier("standardRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * 基礎 GET 請求
     */
    public User getUserById(Long userId) {
        String url = "https://api.example.com/users/{id}";
        return restTemplate.getForObject(url, User.class, userId);
    }
    
    /**
     * 帶有查詢參數的 GET 請求
     */
    public List<User> getUsersByDepartment(String department, int page, int size) {
        String url = "https://api.example.com/users";
        
        URI uri = UriComponentsBuilder.fromUriString(url)
                .queryParam("department", department)
                .queryParam("page", page)
                .queryParam("size", size)
                .build()
                .toUri();
        
        ResponseEntity<List<User>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<User>>() {}
        );
        
        return response.getBody();
    }
    
    /**
     * 使用 Map 作為 URI 變數
     */
    public User getUserWithMap(Long userId) {
        String url = "https://api.example.com/users/{id}/profile/{section}";
        
        Map<String, Object> uriVariables = new HashMap<>();
        uriVariables.put("id", userId);
        uriVariables.put("section", "basic");
        
        return restTemplate.getForObject(url, User.class, uriVariables);
    }
    
    /**
     * 帶有請求頭的 GET 請求
     */
    public User getUserWithHeaders(Long userId, String authToken) {
        String url = "https://api.example.com/users/{id}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + authToken);
        headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);
        
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<User> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                User.class,
                userId
        );
        
        return response.getBody();
    }
    
    /**
     * 獲取完整的響應資訊
     */
    public ResponseEntity<User> getUserWithFullResponse(Long userId) {
        String url = "https://api.example.com/users/{id}";
        
        ResponseEntity<User> response = restTemplate.getForEntity(url, User.class, userId);
        
        // 可以獲取狀態碼、頭部、主體等資訊
        HttpStatus statusCode = response.getStatusCode();
        HttpHeaders responseHeaders = response.getHeaders();
        User user = response.getBody();
        
        return response;
    }
}
```

### 2. POST 請求

```java
/**
 * POST 請求範例
 */
@Service
public class PostRequestService {
    
    private final RestTemplate restTemplate;
    
    public PostRequestService(@Qualifier("standardRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * 基礎 POST 請求
     */
    public User createUser(User newUser) {
        String url = "https://api.example.com/users";
        return restTemplate.postForObject(url, newUser, User.class);
    }
    
    /**
     * 帶有請求頭的 POST 請求
     */
    public ResponseEntity<User> createUserWithHeaders(User newUser, String authToken) {
        String url = "https://api.example.com/users";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + authToken);
        
        HttpEntity<User> request = new HttpEntity<>(newUser, headers);
        
        return restTemplate.postForEntity(url, request, User.class);
    }
    
    /**
     * 表單數據 POST 請求
     */
    public String submitForm(String email, String password) {
        String url = "https://api.example.com/login";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("email", email);
        formData.add("password", password);
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(formData, headers);
        
        return restTemplate.postForObject(url, request, String.class);
    }
    
    /**
     * JSON 數據 POST 請求
     */
    public ApiResponse<User> createUserWithResponse(CreateUserRequest request) {
        String url = "https://api.example.com/users";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Request-ID", generateRequestId());
        
        HttpEntity<CreateUserRequest> httpEntity = new HttpEntity<>(request, headers);
        
        ResponseEntity<ApiResponse<User>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                httpEntity,
                new ParameterizedTypeReference<ApiResponse<User>>() {}
        );
        
        return response.getBody();
    }
    
    /**
     * 文件上傳 POST 請求
     */
    public String uploadFile(MultipartFile file, String description) {
        String url = "https://api.example.com/files/upload";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        
        MultiValueMap<String, Object> formData = new LinkedMultiValueMap<>();
        formData.add("file", file.getResource());
        formData.add("description", description);
        
        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(formData, headers);
        
        return restTemplate.postForObject(url, request, String.class);
    }
    
    private String generateRequestId() {
        return UUID.randomUUID().toString();
    }
}
```

### 3. PUT 和 DELETE 請求

```java
/**
 * PUT 和 DELETE 請求範例
 */
@Service
public class UpdateDeleteService {
    
    private final RestTemplate restTemplate;
    
    public UpdateDeleteService(@Qualifier("standardRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * PUT 更新請求
     */
    public User updateUser(Long userId, User updatedUser) {
        String url = "https://api.example.com/users/{id}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<User> request = new HttpEntity<>(updatedUser, headers);
        
        ResponseEntity<User> response = restTemplate.exchange(
                url,
                HttpMethod.PUT,
                request,
                User.class,
                userId
        );
        
        return response.getBody();
    }
    
    /**
     * PATCH 部分更新請求
     */
    public User partialUpdateUser(Long userId, Map<String, Object> updates) {
        String url = "https://api.example.com/users/{id}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(updates, headers);
        
        ResponseEntity<User> response = restTemplate.exchange(
                url,
                HttpMethod.PATCH,
                request,
                User.class,
                userId
        );
        
        return response.getBody();
    }
    
    /**
     * DELETE 刪除請求
     */
    public void deleteUser(Long userId) {
        String url = "https://api.example.com/users/{id}";
        restTemplate.delete(url, userId);
    }
    
    /**
     * 帶有響應的 DELETE 請求
     */
    public ApiResponse<Void> deleteUserWithResponse(Long userId, String authToken) {
        String url = "https://api.example.com/users/{id}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + authToken);
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        ResponseEntity<ApiResponse<Void>> response = restTemplate.exchange(
                url,
                HttpMethod.DELETE,
                request,
                new ParameterizedTypeReference<ApiResponse<Void>>() {},
                userId
        );
        
        return response.getBody();
    }
    
    /**
     * 批量刪除請求
     */
    public void deleteUsers(List<Long> userIds) {
        String url = "https://api.example.com/users/batch";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        DeleteBatchRequest request = new DeleteBatchRequest(userIds);
        HttpEntity<DeleteBatchRequest> httpEntity = new HttpEntity<>(request, headers);
        
        restTemplate.exchange(
                url,
                HttpMethod.DELETE,
                httpEntity,
                Void.class
        );
    }
}
```

## 高級功能與自訂

### 1. 攔截器實作

```java
/**
 * 日誌攔截器
 */
@Component
public class LoggingInterceptor implements ClientHttpRequestInterceptor {
    
    private static final Logger logger = LoggerFactory.getLogger(LoggingInterceptor.class);
    
    @Override
    public ClientHttpResponse intercept(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        logRequest(request, body);
        
        long startTime = System.currentTimeMillis();
        ClientHttpResponse response = execution.execute(request, body);
        long duration = System.currentTimeMillis() - startTime;
        
        logResponse(response, duration);
        
        return response;
    }
    
    private void logRequest(HttpRequest request, byte[] body) {
        logger.info("===========================request begin================================================");
        logger.info("URI         : {}", request.getURI());
        logger.info("Method      : {}", request.getMethod());
        logger.info("Headers     : {}", request.getHeaders());
        logger.info("Request body: {}", new String(body, StandardCharsets.UTF_8));
        logger.info("==========================request end================================================");
    }
    
    private void logResponse(ClientHttpResponse response, long duration) throws IOException {
        logger.info("============================response begin==========================================");
        logger.info("Status code  : {}", response.getStatusCode());
        logger.info("Status text  : {}", response.getStatusText());
        logger.info("Headers      : {}", response.getHeaders());
        logger.info("Duration     : {} ms", duration);
        logger.info("=======================response end=================================================");
    }
}

/**
 * 認證攔截器
 */
@Component
public class AuthenticationInterceptor implements ClientHttpRequestInterceptor {
    
    private final TokenService tokenService;
    
    public AuthenticationInterceptor(TokenService tokenService) {
        this.tokenService = tokenService;
    }
    
    @Override
    public ClientHttpResponse intercept(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        // 獲取並設置認證 token
        String token = tokenService.getCurrentToken();
        if (token != null) {
            request.getHeaders().set("Authorization", "Bearer " + token);
        }
        
        return execution.execute(request, body);
    }
}

/**
 * 重試攔截器
 */
@Component
public class RetryInterceptor implements ClientHttpRequestInterceptor {
    
    private static final Logger logger = LoggerFactory.getLogger(RetryInterceptor.class);
    
    private final int maxRetries;
    private final long retryDelay;
    
    public RetryInterceptor(@Value("${rest-client.retry.max-attempts:3}") int maxRetries,
                           @Value("${rest-client.retry.delay:1000}") long retryDelay) {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }
    
    @Override
    public ClientHttpResponse intercept(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        
        IOException lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                ClientHttpResponse response = execution.execute(request, body);
                
                // 檢查是否需要重試（例如：5xx 錯誤）
                if (shouldRetry(response) && attempt < maxRetries) {
                    logger.warn("Request failed with status {}, retrying... (attempt {}/{})",
                               response.getStatusCode(), attempt, maxRetries);
                    
                    // 等待後重試
                    try {
                        Thread.sleep(retryDelay * attempt); // 指數退避
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Interrupted during retry delay", e);
                    }
                    continue;
                }
                
                return response;
                
            } catch (IOException e) {
                lastException = e;
                
                if (attempt < maxRetries) {
                    logger.warn("Request failed, retrying... (attempt {}/{}) - {}", 
                               attempt, maxRetries, e.getMessage());
                    
                    try {
                        Thread.sleep(retryDelay * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Interrupted during retry delay", ie);
                    }
                } else {
                    logger.error("Request failed after {} attempts", maxRetries, e);
                }
            }
        }
        
        throw lastException;
    }
    
    private boolean shouldRetry(ClientHttpResponse response) throws IOException {
        HttpStatus status = response.getStatusCode();
        return status.is5xxServerError() || status == HttpStatus.REQUEST_TIMEOUT;
    }
}
```

### 2. 自訂錯誤處理器

```java
/**
 * 自訂響應錯誤處理器
 */
@Component
public class CustomResponseErrorHandler implements ResponseErrorHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(CustomResponseErrorHandler.class);
    
    @Override
    public boolean hasError(ClientHttpResponse response) throws IOException {
        HttpStatus status = response.getStatusCode();
        return status.series() == HttpStatus.Series.CLIENT_ERROR ||
               status.series() == HttpStatus.Series.SERVER_ERROR;
    }
    
    @Override
    public void handleError(ClientHttpResponse response) throws IOException {
        HttpStatus status = response.getStatusCode();
        String responseBody = getResponseBody(response);
        
        logger.error("HTTP Error: {} - {}, Response: {}", 
                    status.value(), status.getReasonPhrase(), responseBody);
        
        switch (status.series()) {
            case CLIENT_ERROR:
                handleClientError(status, responseBody);
                break;
            case SERVER_ERROR:
                handleServerError(status, responseBody);
                break;
            default:
                throw new RestClientException("Unknown HTTP error: " + status);
        }
    }
    
    private void handleClientError(HttpStatus status, String responseBody) {
        switch (status) {
            case BAD_REQUEST:
                throw new BadRequestException("Invalid request: " + responseBody);
            case UNAUTHORIZED:
                throw new UnauthorizedException("Authentication required");
            case FORBIDDEN:
                throw new ForbiddenException("Access denied");
            case NOT_FOUND:
                throw new NotFoundException("Resource not found");
            case CONFLICT:
                throw new ConflictException("Resource conflict: " + responseBody);
            case TOO_MANY_REQUESTS:
                throw new RateLimitException("Rate limit exceeded");
            default:
                throw new ClientErrorException("Client error: " + status + " - " + responseBody);
        }
    }
    
    private void handleServerError(HttpStatus status, String responseBody) {
        switch (status) {
            case INTERNAL_SERVER_ERROR:
                throw new ServerErrorException("Internal server error: " + responseBody);
            case BAD_GATEWAY:
                throw new BadGatewayException("Bad gateway");
            case SERVICE_UNAVAILABLE:
                throw new ServiceUnavailableException("Service unavailable");
            case GATEWAY_TIMEOUT:
                throw new GatewayTimeoutException("Gateway timeout");
            default:
                throw new ServerErrorException("Server error: " + status + " - " + responseBody);
        }
    }
    
    private String getResponseBody(ClientHttpResponse response) {
        try (InputStream inputStream = response.getBody()) {
            return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
        } catch (IOException e) {
            logger.warn("Failed to read response body", e);
            return "Unable to read response body";
        }
    }
}
```

### 3. 自訂異常類別

```java
// 基礎異常類別
public abstract class RestClientException extends RuntimeException {
    public RestClientException(String message) {
        super(message);
    }
    
    public RestClientException(String message, Throwable cause) {
        super(message, cause);
    }
}

// 客戶端錯誤異常
public class ClientErrorException extends RestClientException {
    public ClientErrorException(String message) {
        super(message);
    }
}

public class BadRequestException extends ClientErrorException {
    public BadRequestException(String message) {
        super(message);
    }
}

public class UnauthorizedException extends ClientErrorException {
    public UnauthorizedException(String message) {
        super(message);
    }
}

public class ForbiddenException extends ClientErrorException {
    public ForbiddenException(String message) {
        super(message);
    }
}

public class NotFoundException extends ClientErrorException {
    public NotFoundException(String message) {
        super(message);
    }
}

public class ConflictException extends ClientErrorException {
    public ConflictException(String message) {
        super(message);
    }
}

public class RateLimitException extends ClientErrorException {
    public RateLimitException(String message) {
        super(message);
    }
}

// 服務器錯誤異常
public class ServerErrorException extends RestClientException {
    public ServerErrorException(String message) {
        super(message);
    }
}

public class BadGatewayException extends ServerErrorException {
    public BadGatewayException(String message) {
        super(message);
    }
}

public class ServiceUnavailableException extends ServerErrorException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}

public class GatewayTimeoutException extends ServerErrorException {
    public GatewayTimeoutException(String message) {
        super(message);
    }
}
```

## 實際應用場景

### 1. 微服務通信

```java
/**
 * 用戶服務客戶端
 */
@Service
public class UserServiceClient {
    
    private final RestTemplate restTemplate;
    private final RestClientProperties properties;
    
    public UserServiceClient(@Qualifier("highPerformanceRestTemplate") RestTemplate restTemplate,
                            RestClientProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }
    
    /**
     * 獲取用戶資訊
     */
    public Optional<User> getUserById(Long userId) {
        String url = properties.getBaseUrls().get("user-service") + "/api/users/{id}";
        
        try {
            User user = restTemplate.getForObject(url, User.class, userId);
            return Optional.ofNullable(user);
        } catch (NotFoundException e) {
            return Optional.empty();
        }
    }
    
    /**
     * 批量獲取用戶資訊
     */
    public List<User> getUsersByIds(List<Long> userIds) {
        String url = properties.getBaseUrls().get("user-service") + "/api/users/batch";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<List<Long>> request = new HttpEntity<>(userIds, headers);
        
        ResponseEntity<List<User>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<List<User>>() {}
        );
        
        return response.getBody();
    }
    
    /**
     * 創建用戶
     */
    public User createUser(CreateUserRequest request) {
        String url = properties.getBaseUrls().get("user-service") + "/api/users";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<CreateUserRequest> httpEntity = new HttpEntity<>(request, headers);
        
        return restTemplate.postForObject(url, httpEntity, User.class);
    }
    
    /**
     * 更新用戶狀態
     */
    public void updateUserStatus(Long userId, UserStatus status) {
        String url = properties.getBaseUrls().get("user-service") + "/api/users/{id}/status";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        UpdateStatusRequest request = new UpdateStatusRequest(status);
        HttpEntity<UpdateStatusRequest> httpEntity = new HttpEntity<>(request, headers);
        
        restTemplate.exchange(url, HttpMethod.PUT, httpEntity, Void.class, userId);
    }
}

/**
 * 訂單服務客戶端
 */
@Service
public class OrderServiceClient {
    
    private final RestTemplate restTemplate;
    private final RestClientProperties properties;
    
    public OrderServiceClient(@Qualifier("highPerformanceRestTemplate") RestTemplate restTemplate,
                             RestClientProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }
    
    /**
     * 創建訂單
     */
    public Order createOrder(CreateOrderRequest request) {
        String url = properties.getBaseUrls().get("order-service") + "/api/orders";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Request-ID", UUID.randomUUID().toString());
        
        HttpEntity<CreateOrderRequest> httpEntity = new HttpEntity<>(request, headers);
        
        ResponseEntity<Order> response = restTemplate.postForEntity(url, httpEntity, Order.class);
        
        if (response.getStatusCode() == HttpStatus.CREATED) {
            return response.getBody();
        } else {
            throw new RuntimeException("Failed to create order: " + response.getStatusCode());
        }
    }
    
    /**
     * 獲取用戶訂單列表
     */
    public PagedResponse<Order> getUserOrders(Long userId, int page, int size) {
        String url = properties.getBaseUrls().get("order-service") + "/api/users/{userId}/orders";
        
        URI uri = UriComponentsBuilder.fromUriString(url)
                .queryParam("page", page)
                .queryParam("size", size)
                .build(userId);
        
        ResponseEntity<PagedResponse<Order>> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<PagedResponse<Order>>() {}
        );
        
        return response.getBody();
    }
    
    /**
     * 取消訂單
     */
    public void cancelOrder(Long orderId, String reason) {
        String url = properties.getBaseUrls().get("order-service") + "/api/orders/{id}/cancel";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        CancelOrderRequest request = new CancelOrderRequest(reason);
        HttpEntity<CancelOrderRequest> httpEntity = new HttpEntity<>(request, headers);
        
        restTemplate.exchange(url, HttpMethod.POST, httpEntity, Void.class, orderId);
    }
}
```

### 2. 第三方 API 整合

```java
/**
 * 第三方支付服務整合
 */
@Service
public class PaymentGatewayClient {
    
    private final RestTemplate restTemplate;
    private final PaymentConfig paymentConfig;
    
    public PaymentGatewayClient(@Qualifier("customRestTemplate") RestTemplate restTemplate,
                               PaymentConfig paymentConfig) {
        this.restTemplate = restTemplate;
        this.paymentConfig = paymentConfig;
    }
    
    /**
     * 創建支付訂單
     */
    public PaymentResponse createPayment(PaymentRequest paymentRequest) {
        String url = paymentConfig.getBaseUrl() + "/api/v1/payments";
        
        HttpHeaders headers = createAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<PaymentRequest> request = new HttpEntity<>(paymentRequest, headers);
        
        try {
            ResponseEntity<PaymentResponse> response = restTemplate.postForEntity(
                    url, request, PaymentResponse.class);
            
            return response.getBody();
        } catch (Exception e) {
            throw new PaymentException("Failed to create payment", e);
        }
    }
    
    /**
     * 查詢支付狀態
     */
    public PaymentStatus queryPaymentStatus(String paymentId) {
        String url = paymentConfig.getBaseUrl() + "/api/v1/payments/{paymentId}/status";
        
        HttpHeaders headers = createAuthHeaders();
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<PaymentStatusResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, PaymentStatusResponse.class, paymentId);
            
            return response.getBody().getStatus();
        } catch (NotFoundException e) {
            throw new PaymentNotFoundException("Payment not found: " + paymentId);
        }
    }
    
    /**
     * 退款請求
     */
    public RefundResponse processRefund(String paymentId, RefundRequest refundRequest) {
        String url = paymentConfig.getBaseUrl() + "/api/v1/payments/{paymentId}/refund";
        
        HttpHeaders headers = createAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<RefundRequest> request = new HttpEntity<>(refundRequest, headers);
        
        try {
            ResponseEntity<RefundResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, request, RefundResponse.class, paymentId);
            
            return response.getBody();
        } catch (Exception e) {
            throw new RefundException("Failed to process refund", e);
        }
    }
    
    /**
     * 創建認證頭
     */
    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        
        String auth = paymentConfig.getApiKey() + ":" + paymentConfig.getApiSecret();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
        
        headers.set("Authorization", "Basic " + encodedAuth);
        headers.set("X-API-Version", paymentConfig.getApiVersion());
        
        return headers;
    }
}

/**
 * 外部資料同步服務
 */
@Service
public class DataSyncService {
    
    private final RestTemplate restTemplate;
    private final DataSyncConfig config;
    
    public DataSyncService(@Qualifier("standardRestTemplate") RestTemplate restTemplate,
                          DataSyncConfig config) {
        this.restTemplate = restTemplate;
        this.config = config;
    }
    
    /**
     * 同步用戶資料
     */
    @Async
    public CompletableFuture<SyncResult> syncUserData() {
        String url = config.getExternalApiUrl() + "/users/export";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + config.getAccessToken());
        headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<List<ExternalUser>> response = restTemplate.exchange(
                    url, 
                    HttpMethod.GET, 
                    request, 
                    new ParameterizedTypeReference<List<ExternalUser>>() {}
            );
            
            List<ExternalUser> externalUsers = response.getBody();
            
            // 處理同步邏輯
            int syncedCount = processSyncData(externalUsers);
            
            return CompletableFuture.completedFuture(
                    new SyncResult(true, syncedCount, "Sync completed successfully"));
            
        } catch (Exception e) {
            return CompletableFuture.completedFuture(
                    new SyncResult(false, 0, "Sync failed: " + e.getMessage()));
        }
    }
    
    private int processSyncData(List<ExternalUser> externalUsers) {
        // 同步處理邏輯
        return externalUsers != null ? externalUsers.size() : 0;
    }
}
```

## 效能優化與監控

### 1. 連接池優化

```java
/**
 * 高效能 RestTemplate 配置
 */
@Configuration
public class HighPerformanceRestTemplateConfig {
    
    @Bean("pooledRestTemplate")
    public RestTemplate pooledRestTemplate() {
        // 連接池管理器配置
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(300);              // 最大連接數
        connectionManager.setDefaultMaxPerRoute(100);    // 每個路由的最大連接數
        connectionManager.setValidateAfterInactivity(2000); // 連接空閒檢查時間
        
        // 連接池清理策略
        connectionManager.closeExpiredConnections();
        connectionManager.closeIdleConnections(30, TimeUnit.SECONDS);
        
        // 請求配置
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(5000)    // 從連接池獲取連接的超時時間
                .setConnectTimeout(5000)              // 連接超時時間
                .setSocketTimeout(30000)              // 讀取超時時間
                .build();
        
        // HttpClient 配置
        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .setRetryHandler(new DefaultHttpRequestRetryHandler(3, true))
                .setKeepAliveStrategy((response, context) -> 30 * 1000) // 30 秒 keep-alive
                .build();
        
        // 請求工廠
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return new RestTemplate(factory);
    }
    
    /**
     * 連接池監控
     */
    @Component
    public class ConnectionPoolMonitor {
        
        private final PoolingHttpClientConnectionManager connectionManager;
        private final MeterRegistry meterRegistry;
        
        public ConnectionPoolMonitor(PoolingHttpClientConnectionManager connectionManager,
                                   MeterRegistry meterRegistry) {
            this.connectionManager = connectionManager;
            this.meterRegistry = meterRegistry;
            
            // 註冊連接池指標
            Gauge.builder("http.connections.total")
                    .description("Total connections in pool")
                    .register(meterRegistry, this, monitor -> monitor.connectionManager.getTotalStats().getMax());
            
            Gauge.builder("http.connections.available")
                    .description("Available connections in pool")
                    .register(meterRegistry, this, monitor -> monitor.connectionManager.getTotalStats().getAvailable());
            
            Gauge.builder("http.connections.leased")
                    .description("Leased connections in pool")
                    .register(meterRegistry, this, monitor -> monitor.connectionManager.getTotalStats().getLeased());
        }
        
        @EventListener
        @Async
        public void logConnectionPoolStats(ApplicationReadyEvent event) {
            ScheduledExecutorService executor = Executors.newScheduledThreadPool(1);
            executor.scheduleAtFixedRate(this::logStats, 0, 30, TimeUnit.SECONDS);
        }
        
        private void logStats() {
            PoolStats totalStats = connectionManager.getTotalStats();
            logger.info("Connection Pool Stats - Total: {}, Available: {}, Leased: {}, Pending: {}",
                       totalStats.getMax(), totalStats.getAvailable(), 
                       totalStats.getLeased(), totalStats.getPending());
        }
    }
}
```

### 2. 響應時間監控

```java
/**
 * HTTP 請求監控攔截器
 */
@Component
public class MetricsInterceptor implements ClientHttpRequestInterceptor {
    
    private final MeterRegistry meterRegistry;
    private final Timer.Builder timerBuilder;
    
    public MetricsInterceptor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.timerBuilder = Timer.builder("http.client.requests")
                .description("HTTP client request duration");
    }
    
    @Override
    public ClientHttpResponse intercept(
            HttpRequest request, 
            byte[] body, 
            ClientHttpRequestExecution execution) throws IOException {
        
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            ClientHttpResponse response = execution.execute(request, body);
            
            // 記錄成功請求指標
            sample.stop(timerBuilder
                    .tag("method", request.getMethod().name())
                    .tag("uri", getUriTemplate(request.getURI()))
                    .tag("status", String.valueOf(response.getStatusCode().value()))
                    .tag("outcome", getOutcome(response))
                    .register(meterRegistry));
            
            return response;
            
        } catch (IOException e) {
            // 記錄失敗請求指標
            sample.stop(timerBuilder
                    .tag("method", request.getMethod().name())
                    .tag("uri", getUriTemplate(request.getURI()))
                    .tag("status", "IO_ERROR")
                    .tag("outcome", "ERROR")
                    .register(meterRegistry));
            
            throw e;
        }
    }
    
    private String getUriTemplate(URI uri) {
        String path = uri.getPath();
        // 簡化路徑模板（移除具體 ID）
        return path.replaceAll("/\\d+", "/{id}");
    }
    
    private String getOutcome(ClientHttpResponse response) throws IOException {
        HttpStatus status = response.getStatusCode();
        if (status.is2xxSuccessful()) {
            return "SUCCESS";
        } else if (status.is4xxClientError()) {
            return "CLIENT_ERROR";
        } else if (status.is5xxServerError()) {
            return "SERVER_ERROR";
        } else {
            return "UNKNOWN";
        }
    }
}
```

### 3. 快取策略

```java
/**
 * 帶快取的 REST 客戶端
 */
@Service
public class CachedRestClientService {
    
    private final RestTemplate restTemplate;
    private final CacheManager cacheManager;
    
    public CachedRestClientService(@Qualifier("standardRestTemplate") RestTemplate restTemplate,
                                  CacheManager cacheManager) {
        this.restTemplate = restTemplate;
        this.cacheManager = cacheManager;
    }
    
    /**
     * 帶快取的用戶查詢
     */
    @Cacheable(value = "users", key = "#userId", unless = "#result == null")
    public User getUserById(Long userId) {
        String url = "https://api.example.com/users/{id}";
        return restTemplate.getForObject(url, User.class, userId);
    }
    
    /**
     * 快取失效更新
     */
    @CacheEvict(value = "users", key = "#userId")
    public User updateUser(Long userId, User updatedUser) {
        String url = "https://api.example.com/users/{id}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<User> request = new HttpEntity<>(updatedUser, headers);
        
        ResponseEntity<User> response = restTemplate.exchange(
                url, HttpMethod.PUT, request, User.class, userId);
        
        return response.getBody();
    }
    
    /**
     * 條件快取：基於響應頭的快取策略
     */
    public User getUserWithConditionalCache(Long userId) {
        String url = "https://api.example.com/users/{id}";
        
        // 檢查快取
        Cache cache = cacheManager.getCache("users");
        Cache.ValueWrapper cachedValue = cache.get(userId);
        
        HttpHeaders headers = new HttpHeaders();
        
        if (cachedValue != null) {
            CachedUser cachedUser = (CachedUser) cachedValue.get();
            // 添加 If-None-Match 頭
            headers.set("If-None-Match", cachedUser.getEtag());
        }
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<User> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, User.class, userId);
            
            // 更新快取
            String etag = response.getHeaders().getETag();
            if (etag != null) {
                CachedUser cachedUser = new CachedUser(response.getBody(), etag);
                cache.put(userId, cachedUser);
            }
            
            return response.getBody();
            
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_MODIFIED && cachedValue != null) {
                // 返回快取的值
                return ((CachedUser) cachedValue.get()).getUser();
            }
            throw e;
        }
    }
    
    private static class CachedUser {
        private final User user;
        private final String etag;
        
        public CachedUser(User user, String etag) {
            this.user = user;
            this.etag = etag;
        }
        
        public User getUser() { return user; }
        public String getEtag() { return etag; }
    }
}
```

## 測試策略

### 1. 單元測試

```java
/**
 * RestTemplate 單元測試
 */
@ExtendWith(MockitoExtension.class)
class RestClientServiceTest {
    
    @Mock
    private RestTemplate restTemplate;
    
    @InjectMocks
    private RestClientService restClientService;
    
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() {
        mockServer = MockRestServiceServer.createServer(restTemplate);
        objectMapper = new ObjectMapper();
    }
    
    @Test
    @DisplayName("成功獲取用戶資訊")
    void testGetUserById_Success() throws JsonProcessingException {
        // Given
        Long userId = 1L;
        User expectedUser = new User(userId, "john@example.com", "John", "Doe");
        String expectedJson = objectMapper.writeValueAsString(expectedUser);
        
        mockServer.expect(requestTo("https://api.example.com/users/1"))
                  .andExpect(method(HttpMethod.GET))
                  .andRespond(withSuccess(expectedJson, MediaType.APPLICATION_JSON));
        
        // When
        User actualUser = restClientService.getUserById(userId);
        
        // Then
        mockServer.verify();
        assertThat(actualUser).isNotNull();
        assertThat(actualUser.getId()).isEqualTo(userId);
        assertThat(actualUser.getEmail()).isEqualTo("john@example.com");
    }
    
    @Test
    @DisplayName("用戶不存在時拋出異常")
    void testGetUserById_NotFound() {
        // Given
        Long userId = 999L;
        
        mockServer.expect(requestTo("https://api.example.com/users/999"))
                  .andExpect(method(HttpMethod.GET))
                  .andRespond(withStatus(HttpStatus.NOT_FOUND));
        
        // When & Then
        assertThatThrownBy(() -> restClientService.getUserById(userId))
                .isInstanceOf(NotFoundException.class);
        
        mockServer.verify();
    }
    
    @Test
    @DisplayName("帶有查詢參數的 GET 請求")
    void testGetUsersByDepartment() throws JsonProcessingException {
        // Given
        String department = "IT";
        int page = 0;
        int size = 10;
        List<User> expectedUsers = Arrays.asList(
                new User(1L, "john@example.com", "John", "Doe"),
                new User(2L, "jane@example.com", "Jane", "Smith")
        );
        String expectedJson = objectMapper.writeValueAsString(expectedUsers);
        
        mockServer.expect(requestTo(containsString("https://api.example.com/users")))
                  .andExpect(queryParam("department", "IT"))
                  .andExpect(queryParam("page", "0"))
                  .andExpect(queryParam("size", "10"))
                  .andExpect(method(HttpMethod.GET))
                  .andRespond(withSuccess(expectedJson, MediaType.APPLICATION_JSON));
        
        // When
        List<User> actualUsers = restClientService.getUsersByDepartment(department, page, size);
        
        // Then
        mockServer.verify();
        assertThat(actualUsers).hasSize(2);
    }
    
    @Test
    @DisplayName("POST 請求創建用戶")
    void testCreateUser() throws JsonProcessingException {
        // Given
        User newUser = new User(null, "bob@example.com", "Bob", "Johnson");
        User createdUser = new User(3L, "bob@example.com", "Bob", "Johnson");
        String requestJson = objectMapper.writeValueAsString(newUser);
        String responseJson = objectMapper.writeValueAsString(createdUser);
        
        mockServer.expect(requestTo("https://api.example.com/users"))
                  .andExpect(method(HttpMethod.POST))
                  .andExpect(content().json(requestJson))
                  .andExpected(header("Content-Type", "application/json"))
                  .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));
        
        // When
        User actualUser = restClientService.createUser(newUser);
        
        // Then
        mockServer.verify();
        assertThat(actualUser.getId()).isEqualTo(3L);
        assertThat(actualUser.getEmail()).isEqualTo("bob@example.com");
    }
    
    @Test
    @DisplayName("服務器錯誤時的重試機制")
    void testRetryOnServerError() {
        // Given
        Long userId = 1L;
        
        mockServer.expect(times(3), requestTo("https://api.example.com/users/1"))
                  .andExpect(method(HttpMethod.GET))
                  .andRespond(withServerError());
        
        // When & Then
        assertThatThrownBy(() -> restClientService.getUserById(userId))
                .isInstanceOf(ServerErrorException.class);
        
        mockServer.verify();
    }
}
```

### 2. 整合測試

```java
/**
 * RestTemplate 整合測試
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-integration-test.properties")
class RestClientIntegrationTest {
    
    @Autowired
    private RestClientService restClientService;
    
    @Autowired
    private TestRestTemplate testRestTemplate;
    
    @MockBean
    private RestTemplate restTemplate;
    
    private WireMockServer wireMockServer;
    
    @BeforeEach
    void setUp() {
        wireMockServer = new WireMockServer(wireMockConfig().port(8089));
        wireMockServer.start();
        configureFor("localhost", 8089);
    }
    
    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }
    
    @Test
    @DisplayName("完整的用戶管理流程")
    void testCompleteUserManagementFlow() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        
        // 1. 模擬創建用戶 API
        User newUser = new User(null, "integration@example.com", "Integration", "Test");
        User createdUser = new User(1L, "integration@example.com", "Integration", "Test");
        
        stubFor(post(urlEqualTo("/api/users"))
                .willReturn(aResponse()
                        .withStatus(201)
                        .withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(createdUser))));
        
        // 2. 模擬獲取用戶 API
        stubFor(get(urlEqualTo("/api/users/1"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(createdUser))));
        
        // 3. 模擬更新用戶 API
        User updatedUser = new User(1L, "updated@example.com", "Updated", "User");
        stubFor(put(urlEqualTo("/api/users/1"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(objectMapper.writeValueAsString(updatedUser))));
        
        // 4. 模擬刪除用戶 API
        stubFor(delete(urlEqualTo("/api/users/1"))
                .willReturn(aResponse().withStatus(204)));
        
        // 執行測試流程
        // 創建用戶
        User created = restClientService.createUser(newUser);
        assertThat(created.getId()).isEqualTo(1L);
        
        // 獲取用戶
        User retrieved = restClientService.getUserById(1L);
        assertThat(retrieved.getEmail()).isEqualTo("integration@example.com");
        
        // 更新用戶
        User updated = restClientService.updateUser(1L, updatedUser);
        assertThat(updated.getEmail()).isEqualTo("updated@example.com");
        
        // 刪除用戶
        assertDoesNotThrow(() -> restClientService.deleteUser(1L));
        
        // 驗證所有請求都被調用
        verify(postRequestedFor(urlEqualTo("/api/users")));
        verify(getRequestedFor(urlEqualTo("/api/users/1")));
        verify(putRequestedFor(urlEqualTo("/api/users/1")));
        verify(deleteRequestedFor(urlEqualTo("/api/users/1")));
    }
    
    @Test
    @DisplayName("錯誤處理和重試機制")
    void testErrorHandlingAndRetry() {
        // 模擬服務器錯誤，然後成功
        stubFor(get(urlEqualTo("/api/users/1"))
                .inScenario("Retry Scenario")
                .whenScenarioStateIs(STARTED)
                .willSetStateTo("First Attempt")
                .willReturn(aResponse().withStatus(500)));
        
        stubFor(get(urlEqualTo("/api/users/1"))
                .inScenario("Retry Scenario")
                .whenScenarioStateIs("First Attempt")
                .willSetStateTo("Second Attempt")
                .willReturn(aResponse().withStatus(500)));
        
        stubFor(get(urlEqualTo("/api/users/1"))
                .inScenario("Retry Scenario")
                .whenScenarioStateIs("Second Attempt")
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"id\":1,\"email\":\"test@example.com\"}")));
        
        // 執行測試
        User user = restClientService.getUserById(1L);
        assertThat(user.getId()).isEqualTo(1L);
        
        // 驗證重試了 3 次
        verify(3, getRequestedFor(urlEqualTo("/api/users/1")));
    }
}
```

## 現代化替代方案

### 1. WebClient 遷移指南

```java
/**
 * WebClient 遷移範例
 */
@Service
public class ModernRestClientService {
    
    private final WebClient webClient;
    
    public ModernRestClientService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.example.com")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    /**
     * 異步 GET 請求
     */
    public Mono<User> getUserByIdAsync(Long userId) {
        return webClient.get()
                .uri("/users/{id}", userId)
                .retrieve()
                .bodyToMono(User.class);
    }
    
    /**
     * 響應式 POST 請求
     */
    public Mono<User> createUserAsync(User newUser) {
        return webClient.post()
                .uri("/users")
                .bodyValue(newUser)
                .retrieve()
                .bodyToMono(User.class);
    }
    
    /**
     * 錯誤處理
     */
    public Mono<User> getUserWithErrorHandling(Long userId) {
        return webClient.get()
                .uri("/users/{id}", userId)
                .retrieve()
                .onStatus(HttpStatus::is4xxClientError, 
                         response -> Mono.error(new NotFoundException("User not found")))
                .onStatus(HttpStatus::is5xxServerError,
                         response -> Mono.error(new ServerErrorException("Server error")))
                .bodyToMono(User.class);
    }
    
    /**
     * 流式處理
     */
    public Flux<User> getAllUsersStream() {
        return webClient.get()
                .uri("/users/stream")
                .retrieve()
                .bodyToFlux(User.class);
    }
}
```

### 2. RestTemplate vs WebClient 對比

| 特性 | RestTemplate | WebClient |
|------|-------------|-----------|
| API 風格 | 同步阻塞 | 異步非阻塞 |
| 響應式支援 | 不支援 | 完整支援 |
| 效能 | 中等 | 高 |
| 記憶體使用 | 較高 | 較低 |
| 背壓處理 | 不支援 | 支援 |
| Spring 5+ 支援 | 維護模式 | 主推方案 |
| 學習曲線 | 較低 | 較高 |

## 最佳實踐與建議

### 1. 配置最佳實踐

```java
/**
 * RestTemplate 最佳實踐配置
 */
@Configuration
public class RestTemplateBestPractices {
    
    /**
     * 生產環境推薦配置
     */
    @Bean
    @Primary
    public RestTemplate productionRestTemplate() {
        // 1. 使用連接池
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(200);
        connectionManager.setDefaultMaxPerRoute(50);
        connectionManager.setValidateAfterInactivity(2000);
        
        // 2. 配置超時
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(5000)
                .setConnectTimeout(5000)
                .setSocketTimeout(30000)
                .build();
        
        // 3. 配置重試
        HttpRequestRetryHandler retryHandler = new DefaultHttpRequestRetryHandler(3, true);
        
        // 4. 配置 Keep-Alive
        ConnectionKeepAliveStrategy keepAliveStrategy = (response, context) -> 30 * 1000;
        
        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .setRetryHandler(retryHandler)
                .setKeepAliveStrategy(keepAliveStrategy)
                .build();
        
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        RestTemplate restTemplate = new RestTemplate(factory);
        
        // 5. 添加攔截器
        restTemplate.setInterceptors(Arrays.asList(
                new LoggingInterceptor(),
                new MetricsInterceptor(meterRegistry),
                new AuthenticationInterceptor(tokenService)
        ));
        
        // 6. 設置錯誤處理器
        restTemplate.setErrorHandler(new CustomResponseErrorHandler());
        
        return restTemplate;
    }
    
    /**
     * 常見錯誤和解決方案
     */
    public void demonstrateCommonPitfalls() {
        // ❌ 錯誤：未設置超時
        RestTemplate badTemplate = new RestTemplate();
        
        // ✅ 正確：設置合理的超時
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);
        RestTemplate goodTemplate = new RestTemplate(factory);
        
        // ❌ 錯誤：未使用連接池
        // 每次請求都創建新連接
        
        // ✅ 正確：使用連接池復用連接
        // 見上面的生產環境配置
        
        // ❌ 錯誤：未處理異常
        try {
            String result = badTemplate.getForObject("http://api.example.com/data", String.class);
        } catch (Exception e) {
            // 直接忽略異常
        }
        
        // ✅ 正確：適當的異常處理
        try {
            String result = goodTemplate.getForObject("http://api.example.com/data", String.class);
        } catch (ResourceAccessException e) {
            logger.error("Network error", e);
            throw new ServiceUnavailableException("Service temporarily unavailable");
        } catch (HttpClientErrorException e) {
            logger.error("Client error: {}", e.getStatusCode(), e);
            throw new BadRequestException("Invalid request");
        }
    }
}
```

### 2. 安全性考量

```java
/**
 * RestTemplate 安全配置
 */
@Configuration
public class SecureRestTemplateConfig {
    
    /**
     * HTTPS 配置
     */
    @Bean
    public RestTemplate secureRestTemplate() throws Exception {
        TrustStrategy acceptingTrustStrategy = (X509Certificate[] chain, String authType) -> true;
        
        SSLContext sslContext = org.apache.http.ssl.SSLContexts.custom()
                .loadTrustMaterial(null, acceptingTrustStrategy)
                .build();
        
        SSLConnectionSocketFactory csf = new SSLConnectionSocketFactory(sslContext);
        
        CloseableHttpClient httpClient = HttpClients.custom()
                .setSSLSocketFactory(csf)
                .build();
        
        HttpComponentsClientHttpRequestFactory requestFactory = 
                new HttpComponentsClientHttpRequestFactory();
        requestFactory.setHttpClient(httpClient);
        
        return new RestTemplate(requestFactory);
    }
    
    /**
     * 認證配置
     */
    @Component
    public class SecureAuthInterceptor implements ClientHttpRequestInterceptor {
        
        @Override
        public ClientHttpResponse intercept(
                HttpRequest request, 
                byte[] body, 
                ClientHttpRequestExecution execution) throws IOException {
            
            // 1. 添加 API Key
            request.getHeaders().set("X-API-Key", getApiKey());
            
            // 2. 添加請求簽名
            String signature = generateSignature(request, body);
            request.getHeaders().set("X-Signature", signature);
            
            // 3. 添加時間戳防重放
            request.getHeaders().set("X-Timestamp", String.valueOf(System.currentTimeMillis()));
            
            return execution.execute(request, body);
        }
        
        private String getApiKey() {
            // 從安全配置中獲取 API Key
            return securityConfig.getApiKey();
        }
        
        private String generateSignature(HttpRequest request, byte[] body) {
            // 實作請求簽名邏輯
            return hmacSha256(request.getURI() + new String(body), getSecretKey());
        }
    }
}
```

## 總結

RestTemplate 作為 Spring 生態系統中的經典 HTTP 客戶端，提供了豐富的功能和良好的擴展性：

### 主要優勢

1. **簡單易用**：直觀的 API 設計，易於上手
2. **功能完整**：支援所有 HTTP 方法和豐富的配置選項
3. **Spring 整合**：與 Spring 框架完美整合
4. **擴展性好**：支援攔截器、錯誤處理器等擴展機制
5. **穩定成熟**：經過長期驗證，穩定可靠

### 適用場景

- **傳統 Spring 應用**：非響應式應用的 HTTP 客戶端需求
- **微服務通信**：服務間的同步調用
- **第三方 API 整合**：調用外部 REST API
- **遺留系統維護**：現有系統的維護和升級

### 遷移建議

雖然 RestTemplate 在維護模式，但對於以下情況建議遷移到 WebClient：

1. **新項目開發**：使用 WebClient 獲得更好的效能
2. **高並發需求**：WebClient 的非阻塞特性更適合
3. **響應式程式設計**：需要響應式流的場景
4. **效能敏感**：對效能有較高要求的應用

通過合理的配置和最佳實踐，RestTemplate 仍然是一個可靠的 HTTP 客戶端選擇，特別是在現有項目的維護和漸進式升級場景中。