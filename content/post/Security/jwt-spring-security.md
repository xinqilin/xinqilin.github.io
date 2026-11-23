---
title: "JWT 認證機制完整實作：Spring Security 整合與最佳實踐"
author: Bill.Lin
date: 2021-07-01T23:39:52+08:00
draft: false
tags: ["JWT", "Spring Security", "Authentication", "Java", "Spring Boot", "Security", "REST API", "Token"]
description: "深入解析 JWT 認證機制在 Spring Boot 中的完整實作，包含 Token 生成、驗證、Filter 配置與安全性最佳實踐"
categories: ["Security"]
disableComments: false
aliases:
  - /post/Backend/JWT/
  - /post/backend/jwt-spring-security/

---

## 概述

JSON Web Token (JWT) 是一種開放標準 (RFC 7519)，定義了一種簡潔、自包含的方式，用於在各方之間安全地傳輸資訊。JWT 在現代 Web 應用程式中廣泛用於身份驗證和授權，特別適合分散式系統和微服務架構。

### JWT 核心特徵

- **無狀態性**：伺服器不需要儲存 Session 資訊
- **可擴展性**：適合分散式和微服務環境
- **跨域支援**：支援跨網域請求
- **自包含**：Token 包含所有必要的使用者資訊
- **數位簽名**：確保 Token 的完整性和真實性

### JWT 結構

JWT 由三部分組成，以點號（.）分隔：

```
Header.Payload.Signature
```

1. **Header**：包含 Token 類型和簽名演算法
2. **Payload**：包含聲明（Claims），即使用者資訊和其他資料
3. **Signature**：用於驗證 Token 是否被篡改

### Payload 的標準 Claims（RFC 7519 Registered Claims）

RFC 7519 第 4.1 節預先註冊了 7 個 claim 名稱，名稱刻意只用 3 個字母，讓 token 盡量短。這 7 個在規格裡**全部是選填（OPTIONAL）**，哪些必填由使用 JWT 的應用或上層協定決定。例如 OpenID Connect 的 ID Token 就規定 `iss`、`sub`、`aud`、`exp`、`iat` 必填。

| Claim | 全名 | 型別 | 意思 | 驗證方該做什麼 |
|---|---|---|---|---|
| `iss` | Issuer | StringOrURI | 誰簽發這個 token，例如 `https://auth.example.com` | 確認是信任的簽發者；有多個簽發者時，也用它決定拿哪把金鑰驗簽 |
| `sub` | Subject | StringOrURI | 這個 token 描述的主體，通常是使用者 ID | 在同一個 `iss` 底下必須唯一（或全域唯一）。用穩定、不會被重新分配的 ID，不要用 email 這種會變的值 |
| `aud` | Audience | StringOrURI，或其陣列 | 這個 token 要給誰用，例如 `order-service` | **有帶 `aud` 時，接收方必須確認自己在名單內，不在就拒絕**，避免給 A 服務的 token 被拿去打 B 服務 |
| `exp` | Expiration Time | NumericDate | 過期時間，到這個時間點（含）之後不可再接受 | 現在時間 ≥ `exp` 就拒絕；可容許幾分鐘的時鐘誤差（leeway） |
| `nbf` | Not Before | NumericDate | 生效時間，在這之前不可接受 | 現在時間 < `nbf` 就拒絕；同樣可容許時鐘誤差 |
| `iat` | Issued At | NumericDate | 簽發時間 | 用來判斷 token 的年齡，例如「簽發超過 24 小時就要求重新登入」。規格本身沒有規定要據此拒絕什麼 |
| `jti` | JWT ID | 字串（大小寫敏感） | 這個 token 的唯一識別碼 | 用於防重放或撤銷黑名單（見本文後段「JWT Blacklist（JTI 黑名單）」）；產生方式要讓碰撞機率可忽略，例如 UUID |

兩個型別要特別注意：

- **NumericDate**：從 1970-01-01T00:00:00Z（UTC）起算的**秒數**，不是毫秒，可以帶小數。直接把 `System.currentTimeMillis()` 塞進 `exp`，token 會變成五萬多年後才過期。用 jjwt 的 `expiration(Date)` 這類方法設定，函式庫會自動換算成秒
- **StringOrURI**：任意字串都可以，但**只要含有冒號 `:`，就必須是合法的 URI**

一個實際的 payload 長這樣：

```json
{
  "iss": "https://auth.example.com",
  "sub": "10086",
  "aud": ["order-service", "payment-service"],
  "exp": 1795334400,
  "nbf": 1795333500,
  "iat": 1795333500,
  "jti": "5f0c3a8e-2d4b-4c1e-9a7f-6b2e8d1c4a90",
  "roles": ["USER"]
}
```

`exp - iat` = 900 秒，也就是有效期 15 分鐘。最後的 `roles` 不是標準 claim，屬於下面說的 private claim。

除了這 7 個 registered claims，RFC 7519 還定義了兩類 claim：

- **Public claims**：想讓大家共用的名稱。要到 IANA 的「JSON Web Token Claims」registry 註冊，或使用不會撞名的名稱（例如 URI 形式的 `https://example.com/claims/tenant`）。OpenID Connect 的 `email`、`name` 等都已經註冊在裡面
- **Private claims**：簽發方和接收方私下約定的名稱，例如上面的 `roles`。因為沒有註冊、可能撞名，只適合在自己的系統內使用

Payload 只有 Base64URL 編碼、**沒有加密**，拿到 token 的人都能解開來看，所以不要放密碼、身分證字號這類敏感資料。

用 jjwt 0.12 設定與驗證這些 claims：

```java
Instant now = Instant.now();

String token = Jwts.builder()
        .issuer("https://auth.example.com")
        .subject(String.valueOf(userId))
        .audience().add("order-service").and()
        .issuedAt(Date.from(now))
        .notBefore(Date.from(now))
        .expiration(Date.from(now.plus(Duration.ofMinutes(15))))
        .id(UUID.randomUUID().toString())
        .claim("roles", List.of("USER"))          // private claim
        .signWith(key)
        .compact();

Claims claims = Jwts.parser()
        .verifyWith(key)
        .requireIssuer("https://auth.example.com")  // iss 不符或缺少 → InvalidClaimException
        .requireAudience("order-service")           // aud 不含 order-service → InvalidClaimException
        .clockSkewSeconds(60)                       // exp、nbf 容許 60 秒時鐘誤差
        .build()
        .parseSignedClaims(token)                   // exp、nbf 由 jjwt 自動檢查
        .getPayload();
```

jjwt 解析時會**自動檢查** `exp` 與 `nbf`（分別拋出 `ExpiredJwtException`、`PrematureJwtException`），但 `iss` 與 `aud` **不會自動檢查**，要自己用 `requireIssuer`、`requireAudience` 指定。後面的 `JwtUtil` 在標準 claims 中只設定了 `sub`、`iat`、`exp`（另外加了 private claim `roles`）；如果 token 會給多個服務使用，建議補上 `iss` 與 `aud`，並在解析時檢查。

## Spring Boot 整合實作

### 1. 依賴配置

#### Maven 依賴設定

```xml
<properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <java.version>17</java.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <jjwt.version>0.12.3</jjwt.version>
</properties>

<!-- Spring Boot Starters -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- JWT Library (推薦使用最新版本) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>${jjwt.version}</version>
</dependency>

<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
```

#### Gradle 依賴設定

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    
    implementation 'io.jsonwebtoken:jjwt-api:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'
}
```

### 2. 資料模型

#### 認證請求 DTO

```java
package com.example.jwt.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthenticationRequest {
    
    @NotBlank(message = "使用者名稱不能為空")
    @Size(min = 3, max = 50, message = "使用者名稱長度必須在3-50字符之間")
    private String username;
    
    @NotBlank(message = "密碼不能為空")
    @Size(min = 6, max = 100, message = "密碼長度必須在6-100字符之間")
    private String password;
    
    // 建構子
    public AuthenticationRequest() {}
    
    public AuthenticationRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }
    
    // Getters and Setters
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
}
```

#### 認證回應 DTO

```java
package com.example.jwt.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AuthenticationResponse {
    
    @JsonProperty("access_token")
    private final String accessToken;
    
    @JsonProperty("token_type")
    private final String tokenType = "Bearer";
    
    @JsonProperty("expires_in")
    private final long expiresIn;
    
    @JsonProperty("refresh_token")
    private String refreshToken;
    
    public AuthenticationResponse(String accessToken, long expiresIn) {
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
    }
    
    public AuthenticationResponse(String accessToken, long expiresIn, String refreshToken) {
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
        this.refreshToken = refreshToken;
    }
    
    // Getters
    public String getAccessToken() {
        return accessToken;
    }
    
    public String getTokenType() {
        return tokenType;
    }
    
    public long getExpiresIn() {
        return expiresIn;
    }
    
    public String getRefreshToken() {
        return refreshToken;
    }
}
```

#### 使用者實體

```java
package com.example.jwt.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Entity
@Table(name = "users")
public class User implements UserDetails {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true, nullable = false)
    private String username;
    
    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;
    
    @NotBlank
    @Column(nullable = false)
    private String password;
    
    @Column(name = "first_name")
    private String firstName;
    
    @Column(name = "last_name")
    private String lastName;
    
    @Column(name = "enabled")
    private boolean enabled = true;
    
    @Column(name = "account_non_expired")
    private boolean accountNonExpired = true;
    
    @Column(name = "credentials_non_expired")
    private boolean credentialsNonExpired = true;
    
    @Column(name = "account_non_locked")
    private boolean accountNonLocked = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @ElementCollection(targetClass = Role.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "user_roles")
    private Set<Role> roles = new HashSet<>();
    
    // 建構子
    public User() {}
    
    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.roles.add(Role.USER);
    }
    
    // UserDetails interface 實作
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                .collect(Collectors.toList());
    }
    
    @Override
    public String getPassword() {
        return password;
    }
    
    @Override
    public String getUsername() {
        return username;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return accountNonExpired;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return credentialsNonExpired;
    }
    
    @Override
    public boolean isEnabled() {
        return enabled;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public void setPassword(String password) { this.password = password; }
    
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

enum Role {
    USER, ADMIN, MODERATOR
}
```

### 3. JWT 工具類

```java
package com.example.jwt.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private long jwtExpiration;
    
    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;
    
    /**
     * 從 Token 中提取使用者名稱
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    /**
     * 從 Token 中提取過期時間
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    /**
     * 從 Token 中提取特定的聲明
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    /**
     * 提取 Token 中的所有聲明
     */
    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            logger.warn("JWT token 已過期: {}", e.getMessage());
            throw e;
        } catch (UnsupportedJwtException e) {
            logger.warn("不支援的 JWT token: {}", e.getMessage());
            throw e;
        } catch (MalformedJwtException e) {
            logger.warn("格式錯誤的 JWT token: {}", e.getMessage());
            throw e;
        } catch (IllegalArgumentException e) {
            logger.warn("JWT claims string 為空: {}", e.getMessage());
            throw e;
        }
    }
    
    /**
     * 檢查 Token 是否過期
     */
    public boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }
    
    /**
     * 生成訪問 Token
     */
    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities());
        return createToken(claims, userDetails.getUsername(), jwtExpiration);
    }
    
    /**
     * 生成刷新 Token
     */
    public String generateRefreshToken(UserDetails userDetails) {
        return createToken(new HashMap<>(), userDetails.getUsername(), refreshExpiration);
    }
    
    /**
     * 創建 Token
     */
    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSignInKey())
                .compact();
    }
    
    /**
     * 驗證 Token
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
        } catch (JwtException | IllegalArgumentException e) {
            logger.warn("JWT token 驗證失敗: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 驗證 Token 格式和簽名
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            logger.warn("JWT token 驗證失敗: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 獲取簽名金鑰
     */
    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    
    /**
     * 獲取 Token 的剩餘有效時間（毫秒）
     */
    public long getExpirationTime() {
        return jwtExpiration;
    }
    
    /**
     * 檢查 Token 是否需要刷新（剩餘時間少於 30 分鐘）
     */
    public boolean shouldRefreshToken(String token) {
        try {
            Date expiration = extractExpiration(token);
            Date now = new Date();
            long timeLeft = expiration.getTime() - now.getTime();
            return timeLeft < (30 * 60 * 1000); // 30 分鐘
        } catch (Exception e) {
            return false;
        }
    }
}
```

### 4. JWT 請求過濾器

```java
package com.example.jwt.filter;

import com.example.jwt.service.CustomUserDetailsService;
import com.example.jwt.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTHORIZATION_HEADER = "Authorization";
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt) && jwtUtil.validateToken(jwt)) {
                String username = jwtUtil.extractUsername(jwt);
                
                // 檢查 SecurityContext 中是否已有認證資訊
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    
                    if (jwtUtil.validateToken(jwt, userDetails)) {
                        UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        
                        logger.debug("設定使用者 '{}' 的安全上下文", username);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("無法設定使用者認證: {}", e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * 從請求中提取 JWT Token
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }
        
        return null;
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // 排除不需要 JWT 驗證的路徑
        return path.startsWith("/api/auth/") || 
               path.startsWith("/swagger-ui/") || 
               path.startsWith("/v3/api-docs/") ||
               path.equals("/health") ||
               path.equals("/favicon.ico");
    }
}
```

### 5. Spring Security 配置

```java
package com.example.jwt.config;

import com.example.jwt.filter.JwtAuthenticationFilter;
import com.example.jwt.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
    
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                // 公開端點
                .requestMatchers(
                    "/api/auth/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/health",
                    "/favicon.ico"
                ).permitAll()
                // 管理員端點
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // 其他端點需要認證
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### 6. 認證控制器

```java
package com.example.jwt.controller;

import com.example.jwt.dto.AuthenticationRequest;
import com.example.jwt.dto.AuthenticationResponse;
import com.example.jwt.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    @Autowired
    private AuthenticationService authenticationService;
    
    /**
     * 使用者登入
     */
    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @Valid @RequestBody AuthenticationRequest request) {
        
        AuthenticationResponse response = authenticationService.authenticate(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 刷新 Token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthenticationResponse> refreshToken(
            @RequestHeader("Authorization") String refreshToken) {
        
        AuthenticationResponse response = authenticationService.refreshToken(refreshToken);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 登出（可選：加入黑名單機制）
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String token) {
        authenticationService.logout(token);
        return ResponseEntity.ok().build();
    }
    
    /**
     * 驗證 Token 有效性
     */
    @GetMapping("/validate")
    public ResponseEntity<Boolean> validateToken(@RequestHeader("Authorization") String token) {
        boolean isValid = authenticationService.validateToken(token);
        return ResponseEntity.ok(isValid);
    }
}
```

### 7. 認證服務

```java
package com.example.jwt.service;

import com.example.jwt.dto.AuthenticationRequest;
import com.example.jwt.dto.AuthenticationResponse;
import com.example.jwt.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private TokenBlacklistService tokenBlacklistService;
    
    /**
     * 認證使用者並生成 Token
     */
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            // 驗證使用者憑證
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );
            
            // 載入使用者詳細資訊
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            
            // 生成 Token
            String accessToken = jwtUtil.generateAccessToken(userDetails);
            String refreshToken = jwtUtil.generateRefreshToken(userDetails);
            
            return new AuthenticationResponse(
                accessToken,
                jwtUtil.getExpirationTime(),
                refreshToken
            );
            
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("使用者名稱或密碼錯誤");
        }
    }
    
    /**
     * 刷新 Token
     */
    public AuthenticationResponse refreshToken(String refreshToken) {
        // 移除 Bearer 前綴
        String token = refreshToken.startsWith("Bearer ") ? 
            refreshToken.substring(7) : refreshToken;
        
        if (!jwtUtil.validateToken(token)) {
            throw new RuntimeException("無效的刷新 Token");
        }
        
        String username = jwtUtil.extractUsername(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        
        String newAccessToken = jwtUtil.generateAccessToken(userDetails);
        
        return new AuthenticationResponse(newAccessToken, jwtUtil.getExpirationTime());
    }
    
    /**
     * 登出並將 Token 加入黑名單
     */
    public void logout(String token) {
        String jwtToken = token.startsWith("Bearer ") ? 
            token.substring(7) : token;
        
        tokenBlacklistService.blacklistToken(jwtToken);
    }
    
    /**
     * 驗證 Token
     */
    public boolean validateToken(String token) {
        String jwtToken = token.startsWith("Bearer ") ? 
            token.substring(7) : token;
        
        return jwtUtil.validateToken(jwtToken) && 
               !tokenBlacklistService.isTokenBlacklisted(jwtToken);
    }
}
```

## 配置檔案

### application.yml

```yaml
# JWT 配置
jwt:
  # 使用強密鑰（至少256位）
  secret: ${JWT_SECRET:dGhpc2lzYXZlcnlzZWN1cmVzZWNyZXRrZXl0aGF0aXNhdGxlYXN0MjU2Yml0c2xvbmc=}
  # Access Token 過期時間（15分鐘）
  expiration: 900000
  # Refresh Token 過期時間（7天）
  refresh-expiration: 604800000

# Spring Security 配置
spring:
  security:
    # OAuth2 配置（可選）
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:}
            client-secret: ${GOOGLE_CLIENT_SECRET:}
            scope: openid,profile,email

# 日誌配置
logging:
  level:
    com.example.jwt: DEBUG
    org.springframework.security: DEBUG
```

## 安全性最佳實踐

### 1. 密鑰管理

```java
// 生成安全的密鑰
public class KeyGenerator {
    public static void main(String[] args) {
        SecretKey key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
        String encodedKey = Encoders.BASE64.encode(key.getEncoded());
        System.out.println("Generated key: " + encodedKey);
    }
}
```

### 2. Token 黑名單服務

```java
package com.example.jwt.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    
    /**
     * 將 Token 加入黑名單
     */
    public void blacklistToken(String token) {
        String key = BLACKLIST_PREFIX + token;
        // 設定過期時間等於 Token 的剩餘有效時間
        redisTemplate.opsForValue().set(key, "blacklisted", 24, TimeUnit.HOURS);
    }
    
    /**
     * 檢查 Token 是否在黑名單中
     */
    public boolean isTokenBlacklisted(String token) {
        String key = BLACKLIST_PREFIX + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
```

### 3. 異常處理

```java
package com.example.jwt.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException e) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.UNAUTHORIZED.value(),
            "認證失敗",
            e.getMessage()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
    
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorResponse> handleJwtException(JwtException e) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.UNAUTHORIZED.value(),
            "Token 錯誤",
            e.getMessage()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
}

class ErrorResponse {
    private int status;
    private String error;
    private String message;
    private long timestamp;
    
    public ErrorResponse(int status, String error, String message) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.timestamp = System.currentTimeMillis();
    }
    
    // Getters and Setters
    // ...
}
```

## 使用範例

### 1. 前端整合

> **安全提醒**：以下範例為了示範流程，把 access token 與 refresh token 存在 `localStorage`。頁面上任何一段被注入的 JavaScript（XSS）都能讀取並帶走它們。處理個資或金流的網頁應用，建議改用 Backend for Frontend（BFF）：token 只留在後端，瀏覽器只持有 HttpOnly 的 session cookie。詳見 [System Design 系列 8-1 身分驗證](/post/systemdesign/authentication-session-token-oidc/)的「瀏覽器應用：token 不要進瀏覽器」。

```javascript
// JavaScript 前端範例
class AuthService {
    constructor() {
        this.baseURL = 'http://localhost:8080/api';
        this.token = localStorage.getItem('accessToken');
    }
    
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.access_token;
                localStorage.setItem('accessToken', this.token);
                localStorage.setItem('refreshToken', data.refresh_token);
                return data;
            } else {
                throw new Error('登入失敗');
            }
        } catch (error) {
            console.error('登入錯誤:', error);
            throw error;
        }
    }
    
    async apiCall(endpoint, options = {}) {
        const config = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        let response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        // 如果 Token 過期，嘗試刷新
        if (response.status === 401) {
            await this.refreshToken();
            config.headers['Authorization'] = `Bearer ${this.token}`;
            response = await fetch(`${this.baseURL}${endpoint}`, config);
        }
        
        return response;
    }
    
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            this.logout();
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.access_token;
                localStorage.setItem('accessToken', this.token);
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token 刷新失敗:', error);
            this.logout();
        }
    }
    
    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        this.token = null;
        window.location.href = '/login';
    }
}
```

### 2. 測試範例

```java
package com.example.jwt;

import com.example.jwt.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class JwtUtilTest {
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Test
    public void testGenerateAndValidateToken() {
        // 建立測試使用者
        UserDetails userDetails = new User("testuser", "password", new ArrayList<>());
        
        // 生成 Token
        String token = jwtUtil.generateAccessToken(userDetails);
        assertNotNull(token);
        
        // 驗證 Token
        assertTrue(jwtUtil.validateToken(token, userDetails));
        
        // 提取使用者名稱
        String extractedUsername = jwtUtil.extractUsername(token);
        assertEquals("testuser", extractedUsername);
        
        // 檢查 Token 是否未過期
        assertFalse(jwtUtil.isTokenExpired(token));
    }
}
```

## 效能最佳化

### 1. Redis 快取

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(15))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

### 2. 非同步處理

```java
@Service
public class AsyncAuthService {
    
    @Async
    @EventListener
    public void handleUserLogin(UserLoginEvent event) {
        // 記錄登入日誌
        // 發送通知
        // 更新使用者統計
    }
}
```

## 監控和日誌

### 1. 認證監控

```java
@Component
public class AuthenticationEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthenticationEventListener.class);
    
    @EventListener
    public void onAuthenticationSuccess(AuthenticationSuccessEvent event) {
        String username = event.getAuthentication().getName();
        logger.info("使用者 {} 登入成功", username);
    }
    
    @EventListener
    public void onAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        logger.warn("使用者 {} 登入失敗: {}", username, event.getException().getMessage());
    }
}
```

### 2. 效能監控

```java
@Aspect
@Component
public class JwtPerformanceAspect {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtPerformanceAspect.class);
    
    @Around("execution(* com.example.jwt.util.JwtUtil.*(..))")
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long endTime = System.currentTimeMillis();
        
        logger.debug("方法 {} 執行時間: {} ms", 
                    joinPoint.getSignature().getName(), 
                    endTime - startTime);
        
        return result;
    }
}
```

## 常見問題與解決方案

### 1. Token 過期處理

```java
// 自動 Token 刷新攔截器
@Component
public class TokenRefreshInterceptor implements HandlerInterceptor {
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                           HttpServletResponse response, 
                           Object handler) throws Exception {
        
        String token = getTokenFromRequest(request);
        
        if (token != null && jwtUtil.shouldRefreshToken(token)) {
            // 設定回應標頭提示前端刷新 Token
            response.setHeader("X-Token-Refresh-Required", "true");
        }
        
        return true;
    }
}
```

### 2. 跨域處理

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

## 總結

### 核心優勢

1. **無狀態性**：伺服器無需存儲 Session，適合分散式系統
2. **可擴展性**：支援微服務架構和負載均衡
3. **跨域支援**：解決傳統 Session 的跨域問題
4. **安全性**：數位簽名確保 Token 完整性
5. **靈活性**：可攜帶自訂使用者資訊

### 最佳實踐

1. **使用強密鑰**：至少 256 位的隨機密鑰
2. **適當的過期時間**：短期 Access Token + 長期 Refresh Token
3. **Token 黑名單**：支援登出和緊急撤銷
4. **HTTPS 傳輸**：確保 Token 傳輸安全
5. **輸入驗證**：驗證所有使用者輸入
6. **錯誤處理**：優雅處理認證錯誤
7. **監控日誌**：記錄認證事件和異常

### 常用命令速查

```bash
# 生成密鑰
openssl rand -base64 32

# 解析 JWT Token
echo "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." | cut -d. -f2 | base64 -d

# 測試 API
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 使用 Token 訪問 API
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

JWT 是現代 Web 應用程式認證的標準解決方案，正確實作能夠提供安全、可擴展的認證機制。記住：安全性設計應該從一開始就考慮，而不是後續添加的功能。

## 安全設計最佳實踐

### Algorithm 白名單（防 alg=none 攻擊）
JWT header 中的 `alg` 欄位若被攻擊者篡改為 `none`，伺服器端若未驗證演算法，會跳過簽章驗證：

```java
// 正確：在解析時強制指定允許的演算法
Jwts.parser()
    .verifyWith(secretKey)
    .requireAudience("my-app")
    .build()
    .parseSignedClaims(token);
// jjwt 0.12.x 已強制要求 key，隱式拒絕 alg=none
```

**不要**使用允許空白演算法的 parser 設定。

### JWT Blacklist（JTI 黑名單）
stateless JWT 的弱點：無法在 token 過期前使它失效（如登出、帳號停權）。解法：在 Redis 儲存被撤銷的 JTI（JWT ID）：

```java
// 簽發時加入 JTI
String jti = UUID.randomUUID().toString();
String token = Jwts.builder().id(jti)...build();

// 登出時加入黑名單（TTL 設為 token 剩餘有效期）
redisTemplate.opsForValue().set("jwt:blacklist:" + jti, "1", remainingTtl, TimeUnit.SECONDS);

// 驗證時檢查黑名單
if (Boolean.TRUE.equals(redisTemplate.hasKey("jwt:blacklist:" + jti))) {
    throw new JwtException("Token revoked");
}
```

### Refresh Token Rotation
Access token 應短命（15 分鐘），搭配 refresh token rotation 策略：
- Refresh token 每次使用後換發新的（舊的立即失效）
- Refresh token 儲存在 HttpOnly cookie（非 localStorage，避免 XSS 竊取）
- 偵測 refresh token 重複使用 → 視為令牌洩漏 → 撤銷該用戶的所有 session

### Access Token 不該放 localStorage
JWT 存在 `localStorage` 可被 XSS 腳本讀取。生產環境建議：
- Access token：記憶體（SPA state）
- Refresh token：HttpOnly + SameSite=Strict cookie

```java
// Spring Boot 設定 refresh token cookie
ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
    .httpOnly(true)
    .secure(true)
    .sameSite("Strict")
    .maxAge(Duration.ofDays(7))
    .path("/auth/refresh")
    .build();
response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
```

## 參考資料

- [JWT Official Website](https://jwt.io/)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [Spring Security Documentation](https://spring.io/projects/spring-security)
- [JJWT Library](https://github.com/jwtk/jjwt)
- [OWASP JWT Security Guide](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)