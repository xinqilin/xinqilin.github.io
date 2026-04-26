---
title: "Swagger/OpenAPI 完整指南：API 文檔化與測試最佳實踐"
author: Bill.Lin
date: 2021-07-01T20:47:27+08:00
draft: false
tags: ["Java", "Spring", "Swagger", "OpenAPI", "API", "Documentation", "SpringBoot", "REST"]
Description: "深入探討 Swagger/OpenAPI 在 Spring Boot 中的完整應用，包含進階配置、安全整合、自動化測試與最佳實踐"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/Swagger2/

---

## 概述

Swagger（現稱為 OpenAPI）是目前最流行的 REST API 文檔化工具之一。它不僅能自動生成美觀的 API 文檔，還提供互動式測試介面，支援多種程式語言的客戶端程式碼生成。本文將全面介紹如何在 Spring Boot 專案中整合和使用 Swagger，從基礎配置到進階功能的完整實戰指南。

## 版本選擇與依賴配置

### OpenAPI 3.0 vs Swagger 2.0

| 特性 | Swagger 2.0 | OpenAPI 3.0 |
|------|-------------|--------------|
| **規範版本** | 較舊 | 最新標準 |
| **Spring Boot 支援** | 良好 | 原生支援 |
| **功能豐富度** | 基本功能 | 豐富特性 |
| **社群活躍度** | 維護模式 | 積極開發 |
| **推薦度** | 僅限舊專案 | **強烈推薦** |

### 現代化依賴配置（OpenAPI 3.0）

```xml
<!-- 推薦：SpringDoc OpenAPI 3 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- 安全整合 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-security</artifactId>
    <version>2.2.0</version>
</dependency>

<!-- WebFlux 支援 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.2.0</version>
</dependency>
```

### 傳統 Swagger 2.0 配置（僅供參考）

```xml
<!-- 傳統：Springfox Swagger 2 -->
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger2</artifactId>
    <version>3.0.0</version>
</dependency>

<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger-ui</artifactId>
    <version>3.0.0</version>
</dependency>

<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-boot-starter</artifactId>
    <version>3.0.0</version>
</dependency>
```

## OpenAPI 3.0 基礎配置

### 1. 應用程式配置

```yaml
# application.yml
springdoc:
  api-docs:
    path: /api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    enabled: true
    operations-sorter: method
    tags-sorter: alpha
    try-it-out-enabled: true
    filter: true
    display-request-duration: true
  packages-to-scan: com.example.controller
  paths-to-match: /api/**
  default-consumes-media-type: application/json
  default-produces-media-type: application/json

# 自訂配置
app:
  api:
    title: E-Commerce API
    description: 電商平台核心 API 服務
    version: 1.0.0
    contact:
      name: API Support Team
      email: api-support@example.com
      url: https://example.com/support
    license:
      name: Apache 2.0
      url: https://www.apache.org/licenses/LICENSE-2.0.html
    terms-of-service: https://example.com/terms
```

### 2. 進階 OpenAPI 配置類

```java
@Configuration
@EnableOpenApi
public class OpenApiConfiguration {
    
    @Value("${app.api.title}")
    private String title;
    
    @Value("${app.api.description}")
    private String description;
    
    @Value("${app.api.version}")
    private String version;
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(createApiInfo())
            .servers(createServers())
            .security(createSecurityRequirements())
            .components(createComponents());
    }
    
    private Info createApiInfo() {
        return new Info()
            .title(title)
            .description(description)
            .version(version)
            .contact(new Contact()
                .name("API Support Team")
                .email("api-support@example.com")
                .url("https://example.com/support"))
            .license(new License()
                .name("Apache 2.0")
                .url("https://www.apache.org/licenses/LICENSE-2.0.html"))
            .termsOfService("https://example.com/terms");
    }
    
    private List<Server> createServers() {
        return List.of(
            new Server()
                .url("https://api.example.com")
                .description("Production Server"),
            new Server()
                .url("https://staging-api.example.com")
                .description("Staging Server"),
            new Server()
                .url("http://localhost:8080")
                .description("Development Server")
        );
    }
    
    private List<SecurityRequirement> createSecurityRequirements() {
        return List.of(
            new SecurityRequirement().addList("bearerAuth"),
            new SecurityRequirement().addList("apiKey")
        );
    }
    
    private Components createComponents() {
        return new Components()
            .addSecuritySchemes("bearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("JWT Bearer Token Authentication"))
            .addSecuritySchemes("apiKey", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY)
                .in(SecurityScheme.In.HEADER)
                .name("X-API-Key")
                .description("API Key Authentication"))
            .addSchemas("Error", createErrorSchema())
            .addSchemas("PageInfo", createPageInfoSchema());
    }
    
    private Schema<?> createErrorSchema() {
        return new Schema<>()
            .type("object")
            .addProperties("timestamp", new Schema<>().type("string").format("date-time"))
            .addProperties("status", new Schema<>().type("integer"))
            .addProperties("error", new Schema<>().type("string"))
            .addProperties("message", new Schema<>().type("string"))
            .addProperties("path", new Schema<>().type("string"));
    }
    
    private Schema<?> createPageInfoSchema() {
        return new Schema<>()
            .type("object")
            .addProperties("page", new Schema<>().type("integer"))
            .addProperties("size", new Schema<>().type("integer"))
            .addProperties("totalElements", new Schema<>().type("integer"))
            .addProperties("totalPages", new Schema<>().type("integer"));
    }
}
```

## 控制器註解詳解

### 1. 完整的 REST Controller 範例

```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "用戶管理相關 API")
@SecurityRequirement(name = "bearerAuth")
public class UserController {
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping
    @Operation(
        summary = "獲取用戶列表",
        description = "分頁查詢用戶資訊，支援多種過濾條件",
        tags = {"User Management"}
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功獲取用戶列表",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PagedUserResponse.class),
                examples = @ExampleObject(
                    name = "用戶列表範例",
                    value = """
                        {
                          "content": [
                            {
                              "id": 1,
                              "username": "john_doe",
                              "email": "john@example.com",
                              "firstName": "John",
                              "lastName": "Doe",
                              "createdAt": "2023-01-15T10:30:00Z"
                            }
                          ],
                          "pageable": {
                            "page": 0,
                            "size": 20,
                            "totalElements": 1,
                            "totalPages": 1
                          }
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "請求參數錯誤",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "401", 
            description = "未授權訪問",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        ),
        @ApiResponse(
            responseCode = "403", 
            description = "權限不足",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    public ResponseEntity<Page<UserResponse>> getUsers(
        @Parameter(
            description = "頁碼（從 0 開始）",
            example = "0",
            schema = @Schema(minimum = "0", defaultValue = "0")
        )
        @RequestParam(defaultValue = "0") 
        @Min(0) int page,
        
        @Parameter(
            description = "每頁大小",
            example = "20", 
            schema = @Schema(minimum = "1", maximum = "100", defaultValue = "20")
        )
        @RequestParam(defaultValue = "20") 
        @Min(1) @Max(100) int size,
        
        @Parameter(
            description = "排序欄位，格式：field,direction",
            example = "createdAt,desc",
            array = @ArraySchema(schema = @Schema(type = "string"))
        )
        @RequestParam(defaultValue = "createdAt,desc") String[] sort,
        
        @Parameter(
            description = "用戶名搜尋關鍵字",
            example = "john"
        )
        @RequestParam(required = false) String username,
        
        @Parameter(
            description = "郵箱搜尋關鍵字", 
            example = "example.com"
        )
        @RequestParam(required = false) String email,
        
        @Parameter(
            description = "用戶狀態過濾",
            schema = @Schema(allowableValues = {"ACTIVE", "INACTIVE", "SUSPENDED"})
        )
        @RequestParam(required = false) UserStatus status
    ) {
        UserSearchCriteria criteria = UserSearchCriteria.builder()
            .username(username)
            .email(email)
            .status(status)
            .build();
            
        Pageable pageable = createPageable(page, size, sort);
        Page<UserResponse> users = userService.findUsers(criteria, pageable);
        
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @Operation(
        summary = "根據 ID 獲取用戶",
        description = "根據用戶 ID 獲取詳細資訊"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功獲取用戶資訊",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserDetailResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "用戶不存在")
    })
    public ResponseEntity<UserDetailResponse> getUserById(
        @Parameter(
            description = "用戶 ID",
            required = true,
            example = "123"
        )
        @PathVariable 
        @Positive Long id
    ) {
        UserDetailResponse user = userService.findDetailById(id);
        return ResponseEntity.ok(user);
    }
    
    @PostMapping
    @Operation(
        summary = "創建新用戶",
        description = "創建新的用戶帳戶，郵箱必須唯一"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "用戶創建成功",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UserResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400", 
            description = "請求資料驗證失敗",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ValidationErrorResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "409", 
            description = "郵箱已存在"
        )
    })
    public ResponseEntity<UserResponse> createUser(
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "用戶創建請求",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = CreateUserRequest.class),
                examples = @ExampleObject(
                    name = "用戶創建範例",
                    value = """
                        {
                          "username": "john_doe",
                          "email": "john@example.com",
                          "firstName": "John",
                          "lastName": "Doe",
                          "password": "SecurePassword123!"
                        }
                        """
                )
            )
        )
        @RequestBody @Valid CreateUserRequest request
    ) {
        UserResponse user = userService.createUser(request);
        URI location = URI.create("/api/v1/users/" + user.getId());
        return ResponseEntity.created(location).body(user);
    }
    
    @PutMapping("/{id}")
    @Operation(
        summary = "更新用戶資訊",
        description = "更新指定用戶的基本資訊"
    )
    public ResponseEntity<UserResponse> updateUser(
        @PathVariable @Positive Long id,
        @RequestBody @Valid UpdateUserRequest request
    ) {
        UserResponse user = userService.updateUser(id, request);
        return ResponseEntity.ok(user);
    }
    
    @DeleteMapping("/{id}")
    @Operation(
        summary = "刪除用戶",
        description = "軟刪除指定用戶（標記為已刪除狀態）"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "刪除成功"),
        @ApiResponse(responseCode = "404", description = "用戶不存在"),
        @ApiResponse(responseCode = "409", description = "用戶有關聯資料，無法刪除")
    })
    public ResponseEntity<Void> deleteUser(
        @PathVariable @Positive Long id
    ) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/avatar")
    @Operation(
        summary = "上傳用戶頭像",
        description = "上傳用戶頭像圖片，支援 JPG、PNG 格式"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "頭像上傳成功",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = UploadResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "檔案格式不支援"),
        @ApiResponse(responseCode = "413", description = "檔案大小超出限制")
    })
    public ResponseEntity<UploadResponse> uploadAvatar(
        @PathVariable @Positive Long id,
        @Parameter(
            description = "頭像圖片檔案",
            required = true,
            content = @Content(mediaType = "multipart/form-data")
        )
        @RequestParam("file") MultipartFile file
    ) {
        UploadResponse response = userService.uploadAvatar(id, file);
        return ResponseEntity.ok(response);
    }
}
```

### 2. DTO 類別註解

```java
@Schema(description = "用戶創建請求")
public class CreateUserRequest {
    
    @Schema(
        description = "用戶名",
        example = "john_doe",
        minLength = 3,
        maxLength = 50,
        pattern = "^[a-zA-Z0-9_]+$"
    )
    @NotBlank(message = "用戶名不能為空")
    @Size(min = 3, max = 50, message = "用戶名長度必須在 3-50 字元之間")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "用戶名只能包含字母、數字和底線")
    private String username;
    
    @Schema(
        description = "郵箱地址",
        example = "john@example.com",
        format = "email"
    )
    @NotBlank(message = "郵箱不能為空")
    @Email(message = "郵箱格式不正確")
    private String email;
    
    @Schema(
        description = "名字",
        example = "John",
        maxLength = 30
    )
    @NotBlank(message = "名字不能為空")
    @Size(max = 30, message = "名字長度不能超過 30 字元")
    private String firstName;
    
    @Schema(
        description = "姓氏",
        example = "Doe",
        maxLength = 30
    )
    @NotBlank(message = "姓氏不能為空")
    @Size(max = 30, message = "姓氏長度不能超過 30 字元")
    private String lastName;
    
    @Schema(
        description = "密碼",
        example = "SecurePassword123!",
        minLength = 8,
        maxLength = 100,
        format = "password"
    )
    @NotBlank(message = "密碼不能為空")
    @Size(min = 8, max = 100, message = "密碼長度必須在 8-100 字元之間")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
        message = "密碼必須包含大小寫字母、數字和特殊字元"
    )
    private String password;
    
    @Schema(
        description = "出生日期",
        example = "1990-01-15",
        format = "date"
    )
    @Past(message = "出生日期必須是過去的日期")
    private LocalDate birthDate;
    
    @Schema(
        description = "用戶角色",
        allowableValues = {"USER", "ADMIN", "MODERATOR"},
        defaultValue = "USER"
    )
    private UserRole role = UserRole.USER;
    
    // Getters and Setters...
}

@Schema(description = "分頁用戶回應")
public class PagedUserResponse {
    
    @Schema(description = "用戶列表")
    private List<UserResponse> content;
    
    @Schema(description = "分頁資訊")
    private PageInfo pageable;
    
    // Getters and Setters...
}

@Schema(description = "用戶基本資訊回應")
public class UserResponse {
    
    @Schema(description = "用戶 ID", example = "123")
    private Long id;
    
    @Schema(description = "用戶名", example = "john_doe")
    private String username;
    
    @Schema(description = "郵箱", example = "john@example.com")
    private String email;
    
    @Schema(description = "全名", example = "John Doe")
    private String fullName;
    
    @Schema(description = "頭像 URL", example = "https://example.com/avatars/123.jpg")
    private String avatarUrl;
    
    @Schema(description = "用戶狀態", allowableValues = {"ACTIVE", "INACTIVE", "SUSPENDED"})
    private UserStatus status;
    
    @Schema(description = "創建時間", format = "date-time")
    private LocalDateTime createdAt;
    
    @Schema(description = "最後登入時間", format = "date-time")
    private LocalDateTime lastLoginAt;
    
    // Getters and Setters...
}
```

## 安全配置整合

### 1. JWT Bearer Token 整合

```java
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Swagger 相關路徑公開
                .requestMatchers(
                    "/api-docs/**",
                    "/swagger-ui/**", 
                    "/swagger-ui.html",
                    "/webjars/**"
                ).permitAll()
                // 公開 API
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                // 需要認證的 API
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtDecoder(jwtDecoder()))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .build();
    }
    
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri("https://your-auth-server/.well-known/jwks.json")
            .build();
    }
}

// 在 Controller 中指定安全需求
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Management", description = "管理員專用 API")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    
    @GetMapping("/users")
    @Operation(
        summary = "管理員查看所有用戶",
        description = "需要 ADMIN 角色權限"
    )
    @PreAuthorize("hasAuthority('USER_READ_ALL')")
    public ResponseEntity<Page<UserResponse>> getAllUsersForAdmin(
        @ParameterObject Pageable pageable
    ) {
        // Implementation...
        return ResponseEntity.ok().build();
    }
}
```

### 2. API Key 認證

```java
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    
    private static final String API_KEY_HEADER = "X-API-Key";
    private final ApiKeyService apiKeyService;
    
    public ApiKeyAuthenticationFilter(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String apiKey = request.getHeader(API_KEY_HEADER);
        
        if (apiKey != null && apiKeyService.isValidApiKey(apiKey)) {
            ApiKeyDetails details = apiKeyService.getApiKeyDetails(apiKey);
            ApiKeyAuthenticationToken authentication = 
                new ApiKeyAuthenticationToken(details);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
}

// 在特定 Controller 中使用 API Key
@RestController
@RequestMapping("/api/v1/webhook")
@Tag(name = "Webhook API", description = "第三方系統回調 API")
@SecurityRequirement(name = "apiKey")
public class WebhookController {
    
    @PostMapping("/payment")
    @Operation(
        summary = "支付結果回調",
        description = "第三方支付系統回調通知"
    )
    public ResponseEntity<Void> handlePaymentWebhook(
        @RequestBody PaymentWebhookRequest request
    ) {
        // Implementation...
        return ResponseEntity.ok().build();
    }
}
```

## 進階功能配置

### 1. 自訂文檔分組

```java
@Configuration
public class OpenApiGroupConfiguration {
    
    @Bean
    @Primary
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
            .group("public")
            .displayName("Public API")
            .pathsToMatch("/api/v1/public/**", "/api/v1/auth/**")
            .build();
    }
    
    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
            .group("user")
            .displayName("User API")
            .pathsToMatch("/api/v1/users/**", "/api/v1/profile/**")
            .addOperationCustomizer((operation, handlerMethod) -> {
                operation.addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
                return operation;
            })
            .build();
    }
    
    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
            .group("admin")
            .displayName("Admin API")
            .pathsToMatch("/api/v1/admin/**")
            .addOperationCustomizer((operation, handlerMethod) -> {
                operation.addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
                // 添加管理員 API 的額外標籤
                operation.addTagsItem("Admin Only");
                return operation;
            })
            .build();
    }
    
    @Bean
    public GroupedOpenApi internalApi() {
        return GroupedOpenApi.builder()
            .group("internal")
            .displayName("Internal API")
            .pathsToMatch("/api/internal/**")
            .addOperationCustomizer((operation, handlerMethod) -> {
                operation.addSecurityItem(new SecurityRequirement().addList("apiKey"));
                return operation;
            })
            .build();
    }
}
```

### 2. 自訂操作符處理器

```java
@Component
public class CustomOperationCustomizer implements OperationCustomizer {
    
    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        // 自動添加通用錯誤回應
        addCommonErrorResponses(operation);
        
        // 為分頁端點添加通用參數
        if (isPaginationEndpoint(handlerMethod)) {
            addPaginationParameters(operation);
        }
        
        // 添加請求追蹤資訊
        addRequestTrackingInfo(operation);
        
        return operation;
    }
    
    private void addCommonErrorResponses(Operation operation) {
        ApiResponses responses = operation.getResponses();
        
        if (responses.get("400") == null) {
            responses.addApiResponse("400", new ApiResponse()
                .description("請求參數錯誤")
                .content(new Content()
                    .addMediaType("application/json", new MediaType()
                        .schema(new Schema<>().$ref("#/components/schemas/Error")))));
        }
        
        if (responses.get("500") == null) {
            responses.addApiResponse("500", new ApiResponse()
                .description("內部伺服器錯誤")
                .content(new Content()
                    .addMediaType("application/json", new MediaType()
                        .schema(new Schema<>().$ref("#/components/schemas/Error")))));
        }
    }
    
    private boolean isPaginationEndpoint(HandlerMethod handlerMethod) {
        return Arrays.stream(handlerMethod.getMethodParameters())
            .anyMatch(param -> Pageable.class.isAssignableFrom(param.getParameterType()));
    }
    
    private void addPaginationParameters(Operation operation) {
        if (operation.getParameters() == null) {
            operation.setParameters(new ArrayList<>());
        }
        
        // 添加通用分頁參數
        operation.getParameters().add(new Parameter()
            .name("page")
            .in(ParameterIn.QUERY)
            .description("頁碼（從 0 開始）")
            .schema(new IntegerSchema().minimum(BigDecimal.ZERO)._default(0)));
            
        operation.getParameters().add(new Parameter()
            .name("size")
            .in(ParameterIn.QUERY)
            .description("每頁大小")
            .schema(new IntegerSchema().minimum(BigDecimal.ONE).maximum(BigDecimal.valueOf(100))._default(20)));
    }
    
    private void addRequestTrackingInfo(Operation operation) {
        operation.addExtension("x-request-id", "自動生成的請求追蹤 ID");
        operation.addExtension("x-rate-limit", "API 呼叫頻率限制資訊");
    }
}
```

### 3. 自訂 Schema 處理器

```java
@Component
public class CustomModelConverter implements ModelConverter {
    
    @Override
    public ModelConverterContext resolve(
        AnnotatedType annotatedType,
        ModelConverterContext context,
        Iterator<ModelConverter> chain
    ) {
        if (chain.hasNext()) {
            context = chain.next().resolve(annotatedType, context, chain);
        }
        
        // 自訂枚舉處理
        if (annotatedType.getType() instanceof Class<?> clazz && clazz.isEnum()) {
            Schema<?> schema = context.getDefinedModels().get(annotatedType.getType().getTypeName());
            if (schema != null) {
                enhanceEnumSchema(schema, clazz);
            }
        }
        
        return context;
    }
    
    @SuppressWarnings("unchecked")
    private void enhanceEnumSchema(Schema<?> schema, Class<?> enumClass) {
        if (enumClass.isEnum()) {
            Enum<?>[] enumConstants = (Enum<?>[]) enumClass.getEnumConstants();
            
            List<String> enumValues = Arrays.stream(enumConstants)
                .map(Enum::name)
                .collect(Collectors.toList());
                
            schema.setEnum(enumValues);
            
            // 添加枚舉描述
            StringBuilder description = new StringBuilder(schema.getDescription() != null ? 
                schema.getDescription() : "");
            description.append("\n\n可用值：\n");
            
            for (Enum<?> enumConstant : enumConstants) {
                description.append("- `").append(enumConstant.name()).append("`");
                
                // 如果枚舉有描述方法，添加描述
                try {
                    Method getDescription = enumClass.getMethod("getDescription");
                    Object desc = getDescription.invoke(enumConstant);
                    if (desc != null) {
                        description.append(": ").append(desc);
                    }
                } catch (Exception ignored) {
                    // 忽略沒有 getDescription 方法的情況
                }
                
                description.append("\n");
            }
            
            schema.setDescription(description.toString());
        }
    }
}
```

## 測試整合

### 1. API 文檔測試

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
class OpenApiDocumentationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @LocalServerPort
    private int port;
    
    @Test
    @Order(1)
    void testOpenApiJsonGeneration() {
        String url = "http://localhost:" + port + "/api-docs";
        
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        
        // 驗證 JSON 結構
        DocumentContext context = JsonPath.parse(response.getBody());
        assertThat(context.read("$.openapi", String.class)).isEqualTo("3.0.1");
        assertThat(context.read("$.info.title", String.class)).isNotEmpty();
        assertThat(context.read("$.paths", Map.class)).isNotEmpty();
    }
    
    @Test
    @Order(2)
    void testSwaggerUiAccess() {
        String url = "http://localhost:" + port + "/swagger-ui.html";
        
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Swagger UI");
    }
    
    @Test
    @Order(3)
    void testApiGroupsGeneration() {
        String[] groups = {"public", "user", "admin", "internal"};
        
        for (String group : groups) {
            String url = "http://localhost:" + port + "/api-docs/" + group;
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            
            DocumentContext context = JsonPath.parse(response.getBody());
            assertThat(context.read("$.paths", Map.class)).isNotEmpty();
        }
    }
    
    @Test
    @Order(4)
    void testSecuritySchemesDefinition() {
        String url = "http://localhost:" + port + "/api-docs";
        
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        DocumentContext context = JsonPath.parse(response.getBody());
        
        // 驗證安全方案定義
        assertThat(context.read("$.components.securitySchemes.bearerAuth.type", String.class))
            .isEqualTo("http");
        assertThat(context.read("$.components.securitySchemes.apiKey.type", String.class))
            .isEqualTo("apiKey");
    }
}
```

### 2. 契約測試

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiContractTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @LocalServerPort
    private int port;
    
    @Test
    void testUserApiContract() throws Exception {
        // 獲取 OpenAPI 規範
        String openApiJson = getOpenApiJson();
        OpenAPIV3Parser parser = new OpenAPIV3Parser();
        OpenAPI openAPI = parser.readContents(openApiJson).getOpenAPI();
        
        // 測試用戶創建端點
        PathItem userPath = openAPI.getPaths().get("/api/v1/users");
        assertThat(userPath).isNotNull();
        
        Operation postOperation = userPath.getPost();
        assertThat(postOperation).isNotNull();
        assertThat(postOperation.getSummary()).isEqualTo("創建新用戶");
        
        // 驗證請求 Schema
        RequestBody requestBody = postOperation.getRequestBody();
        assertThat(requestBody).isNotNull();
        
        Content content = requestBody.getContent();
        MediaType mediaType = content.get("application/json");
        assertThat(mediaType).isNotNull();
        
        // 驗證回應 Schema
        ApiResponse response201 = postOperation.getResponses().get("201");
        assertThat(response201).isNotNull();
        assertThat(response201.getDescription()).isEqualTo("用戶創建成功");
    }
    
    @Test
    void testActualApiMatchesContract() throws Exception {
        // 根據文檔測試實際 API
        String requestJson = """
            {
              "username": "test_user",
              "email": "test@example.com",
              "firstName": "Test",
              "lastName": "User",
              "password": "TestPassword123!"
            }
            """;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth("valid-jwt-token");
        
        HttpEntity<String> request = new HttpEntity<>(requestJson, headers);
        
        // 假設這個端點在測試環境中可用
        String url = "http://localhost:" + port + "/api/v1/users";
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        
        // 根據文檔，應該返回 201 或 401（如果沒有有效 token）
        assertThat(response.getStatusCode())
            .isIn(HttpStatus.CREATED, HttpStatus.UNAUTHORIZED);
    }
    
    private String getOpenApiJson() {
        String url = "http://localhost:" + port + "/api-docs";
        return restTemplate.getForObject(url, String.class);
    }
}
```

## 部署與 CI/CD 整合

### 1. 文檔生成腳本

```bash
#!/bin/bash
# scripts/generate-api-docs.sh

set -e

echo "🚀 生成 API 文檔..."

# 啟動應用程式
echo "啟動 Spring Boot 應用程式..."
java -jar target/api-service.jar --server.port=8080 &
APP_PID=$!

# 等待應用程式啟動
echo "等待應用程式啟動..."
for i in {1..30}; do
    if curl -s http://localhost:8080/actuator/health > /dev/null; then
        echo "應用程式已啟動"
        break
    fi
    sleep 2
done

# 生成 OpenAPI JSON
echo "下載 OpenAPI 規範..."
curl -o docs/openapi.json http://localhost:8080/api-docs

# 生成不同格式的文檔
echo "生成 HTML 文檔..."
npx @redocly/openapi-cli build-docs docs/openapi.json --output docs/api.html

echo "生成 Markdown 文檔..."
npx widdershins docs/openapi.json -o docs/api.md

# 生成客戶端 SDK
echo "生成客戶端 SDK..."
mkdir -p generated/java-client
npx @openapitools/openapi-generator-cli generate \
    -i docs/openapi.json \
    -g java \
    -o generated/java-client \
    --additional-properties=invokerPackage=com.example.client

# 停止應用程式
echo "停止應用程式..."
kill $APP_PID

echo "✅ API 文檔生成完成"
```

### 2. GitHub Actions 工作流程

```yaml
# .github/workflows/api-docs.yml
name: Generate API Documentation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
        
    - name: Cache Maven dependencies
      uses: actions/cache@v3
      with:
        path: ~/.m2
        key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
        
    - name: Build application
      run: mvn clean package -DskipTests
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install documentation tools
      run: |
        npm install -g @redocly/openapi-cli
        npm install -g widdershins
        npm install -g @openapitools/openapi-generator-cli
        
    - name: Generate API documentation
      run: |
        chmod +x scripts/generate-api-docs.sh
        ./scripts/generate-api-docs.sh
        
    - name: Upload documentation artifacts
      uses: actions/upload-artifact@v3
      with:
        name: api-documentation
        path: |
          docs/
          generated/
          
    - name: Deploy to GitHub Pages
      if: github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
```

### 3. Docker 整合

```dockerfile
# Dockerfile.docs
FROM openjdk:17-jdk-slim as builder

WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM node:18-alpine as docs-generator

WORKDIR /app

# 安裝文檔生成工具
RUN npm install -g @redocly/openapi-cli widdershins @openapitools/openapi-generator-cli

# 複製應用程式
COPY --from=builder /app/target/*.jar app.jar

# 生成文檔的腳本
COPY scripts/generate-docs-docker.sh .
RUN chmod +x generate-docs-docker.sh

EXPOSE 8080

CMD ["./generate-docs-docker.sh"]
```

## 效能優化與最佳實踐

### 1. 大型 API 的文檔優化

```java
@Configuration
public class OpenApiPerformanceConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "springdoc.api-docs.enabled", havingValue = "true")
    public OpenApiCustomiser openApiCustomiser() {
        return openApi -> {
            // 移除不必要的 Schema
            removeUnusedSchemas(openApi);
            
            // 簡化複雜的嵌套對象
            simplifyNestedObjects(openApi);
            
            // 添加快取頭
            addCacheHeaders(openApi);
        };
    }
    
    private void removeUnusedSchemas(OpenAPI openApi) {
        if (openApi.getComponents() != null && openApi.getComponents().getSchemas() != null) {
            Set<String> usedSchemas = findUsedSchemas(openApi);
            openApi.getComponents().getSchemas().entrySet()
                .removeIf(entry -> !usedSchemas.contains(entry.getKey()));
        }
    }
    
    private Set<String> findUsedSchemas(OpenAPI openApi) {
        Set<String> usedSchemas = new HashSet<>();
        
        if (openApi.getPaths() != null) {
            openApi.getPaths().values().forEach(pathItem -> {
                Stream.of(
                    pathItem.getGet(), pathItem.getPost(), pathItem.getPut(),
                    pathItem.getDelete(), pathItem.getPatch()
                ).filter(Objects::nonNull)
                .forEach(operation -> collectUsedSchemas(operation, usedSchemas));
            });
        }
        
        return usedSchemas;
    }
    
    private void collectUsedSchemas(Operation operation, Set<String> usedSchemas) {
        // 從請求體收集
        if (operation.getRequestBody() != null && 
            operation.getRequestBody().getContent() != null) {
            operation.getRequestBody().getContent().values()
                .forEach(mediaType -> collectSchemaRefs(mediaType.getSchema(), usedSchemas));
        }
        
        // 從回應收集
        if (operation.getResponses() != null) {
            operation.getResponses().values().forEach(response -> {
                if (response.getContent() != null) {
                    response.getContent().values()
                        .forEach(mediaType -> collectSchemaRefs(mediaType.getSchema(), usedSchemas));
                }
            });
        }
    }
    
    private void collectSchemaRefs(Schema<?> schema, Set<String> usedSchemas) {
        if (schema != null) {
            if (schema.get$ref() != null) {
                String schemaName = schema.get$ref().substring("#/components/schemas/".length());
                usedSchemas.add(schemaName);
            }
            
            // 遞迴處理嵌套 Schema
            if (schema.getProperties() != null) {
                schema.getProperties().values().forEach(prop -> 
                    collectSchemaRefs((Schema<?>) prop, usedSchemas));
            }
        }
    }
}
```

### 2. 快取策略

```java
@RestController
@RequestMapping("/api-docs")
public class CachedApiDocsController {
    
    private final SpringDocConfigProperties springDocConfigProperties;
    private final ObjectMapper objectMapper;
    private final Cache<String, String> apiDocsCache;
    
    public CachedApiDocsController(
        SpringDocConfigProperties springDocConfigProperties,
        ObjectMapper objectMapper
    ) {
        this.springDocConfigProperties = springDocConfigProperties;
        this.objectMapper = objectMapper;
        this.apiDocsCache = Caffeine.newBuilder()
            .maximumSize(10)
            .expireAfterWrite(Duration.ofMinutes(30))
            .build();
    }
    
    @GetMapping(
        value = "/{group}",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> getCachedApiDocs(
        @PathVariable String group,
        HttpServletRequest request
    ) {
        String cacheKey = group + "_" + getVersionHash();
        
        String cachedDocs = apiDocsCache.get(cacheKey, key -> {
            // 生成文檔的邏輯
            return generateApiDocs(group);
        });
        
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
            .eTag(calculateETag(cachedDocs))
            .body(cachedDocs);
    }
    
    private String getVersionHash() {
        // 基於應用程式版本和配置生成雜湊
        String version = getClass().getPackage().getImplementationVersion();
        return DigestUtils.md5Hex(version != null ? version : "dev");
    }
    
    private String calculateETag(String content) {
        return "\"" + DigestUtils.md5Hex(content) + "\"";
    }
}
```

### 3. 環境配置最佳實踐

```yaml
# application-dev.yml
springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
    try-it-out-enabled: true
    operations-sorter: method
    tags-sorter: alpha
    display-request-duration: true
    doc-expansion: list
    default-models-expand-depth: 2

# application-prod.yml  
springdoc:
  api-docs:
    enabled: false  # 生產環境關閉
  swagger-ui:
    enabled: false  # 生產環境關閉

# application-staging.yml
springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
    try-it-out-enabled: false  # 測試環境禁止直接測試
```

## 監控與分析

### 1. API 使用情況追蹤

```java
@Component
public class ApiUsageTracker {
    
    private final MeterRegistry meterRegistry;
    private final Counter apiCallsCounter;
    private final Timer apiResponseTimer;
    
    public ApiUsageTracker(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.apiCallsCounter = Counter.builder("api.calls")
            .description("API 呼叫次數")
            .register(meterRegistry);
        this.apiResponseTimer = Timer.builder("api.response.time")
            .description("API 回應時間")
            .register(meterRegistry);
    }
    
    @EventListener
    public void trackApiCall(ApiCallEvent event) {
        apiCallsCounter
            .tag("endpoint", event.getEndpoint())
            .tag("method", event.getMethod())
            .tag("status", String.valueOf(event.getStatusCode()))
            .increment();
            
        apiResponseTimer
            .tag("endpoint", event.getEndpoint())
            .record(event.getResponseTime(), TimeUnit.MILLISECONDS);
    }
}

@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "API Analytics", description = "API 使用情況分析")
public class ApiAnalyticsController {
    
    private final MeterRegistry meterRegistry;
    
    public ApiAnalyticsController(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    @GetMapping("/metrics")
    @Operation(summary = "獲取 API 使用統計")
    public ResponseEntity<ApiMetrics> getApiMetrics() {
        Map<String, Double> endpointCalls = new HashMap<>();
        Map<String, Double> averageResponseTimes = new HashMap<>();
        
        meterRegistry.getMeters().forEach(meter -> {
            if (meter instanceof Counter counter && meter.getId().getName().equals("api.calls")) {
                String endpoint = meter.getId().getTag("endpoint");
                endpointCalls.put(endpoint, counter.count());
            }
            
            if (meter instanceof Timer timer && meter.getId().getName().equals("api.response.time")) {
                String endpoint = meter.getId().getTag("endpoint");
                averageResponseTimes.put(endpoint, timer.mean(TimeUnit.MILLISECONDS));
            }
        });
        
        ApiMetrics metrics = new ApiMetrics(endpointCalls, averageResponseTimes);
        return ResponseEntity.ok(metrics);
    }
}
```

## 總結

Swagger/OpenAPI 是現代 API 開發的必備工具，提供了從文檔生成到測試、監控的完整解決方案。透過本文的深入介紹，我們了解到：

### 核心價值

1. **自動化文檔**：減少手動維護成本，確保文檔與程式碼同步
2. **互動式測試**：提供友善的 API 測試介面
3. **團隊協作**：統一的 API 規範促進前後端協作
4. **程式碼生成**：支援多種語言的客戶端 SDK 自動生成

### 最佳實踐要點

1. **選擇 OpenAPI 3.0**：使用最新標準和工具鏈
2. **完整的註解**：提供詳細的描述、範例和驗證規則
3. **安全整合**：正確配置認證和授權機制
4. **效能優化**：適當的快取和文檔分組策略
5. **CI/CD 整合**：自動化文檔生成和部署流程

### 進階應用

- 契約測試和 API 治理
- 多環境配置和版本管理
- 監控和分析 API 使用情況
- 與微服務架構的整合

正確實施 Swagger/OpenAPI 不僅能提升開發效率，還能建立標準化的 API 開發流程，為團隊帶來長期的技術價值。

## 參考資料

- [OpenAPI Specification](https://swagger.io/specification/)
- [SpringDoc OpenAPI](https://springdoc.org/)
- [Spring Boot OpenAPI Integration](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.endpoints.openapi)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger UI Configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)