---
title: "Side Project 企業級專案配置指南：完整開發環境設定與最佳實踐"
author: Bill.Lin
date: 2020-01-01T20:31:25+08:00
draft: false
tags: ["Project Setup", "Configuration", "Development", "Best Practices", "Spring Boot", "Docker", "DevOps", "Microservices", "CI/CD", "Production", "Architecture", "Infrastructure", "Environment", "Deployment"]
Description: "完整的 Side Project 企業級專案配置指南，包含現代化開發環境設定、專案結構規劃、容器化部署、監控系統與 CI/CD 流程的最佳實踐"
Categories: ["Backend"]
DisableComments: false
---

## Side Project 企業級專案配置指南

### 簡介

在現代軟體開發中，一個良好的專案配置是成功的關鍵。本文將深入介紹如何從零開始建立一個企業級的 Side Project，包含完整的開發環境設定、專案結構規劃、依賴管理、容器化部署、監控系統與 CI/CD 流程。

### 專案結構規劃

#### 標準 Maven 專案結構

```
project-root/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── company/
│   │   │           └── project/
│   │   │               ├── Application.java
│   │   │               ├── config/
│   │   │               │   ├── AppConfig.java
│   │   │               │   ├── SecurityConfig.java
│   │   │               │   └── DatabaseConfig.java
│   │   │               ├── controller/
│   │   │               ├── service/
│   │   │               │   ├── impl/
│   │   │               │   └── dto/
│   │   │               ├── repository/
│   │   │               ├── entity/
│   │   │               ├── exception/
│   │   │               └── util/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       ├── logback-spring.xml
│   │       ├── banner.txt
│   │       └── db/
│   │           └── migration/
│   └── test/
│       ├── java/
│       │   └── com/
│       │       └── company/
│       │           └── project/
│       │               ├── integration/
│       │               ├── unit/
│       │               └── TestApplication.java
│       └── resources/
│           └── application-test.yml
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docs/
│   ├── api/
│   └── setup/
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   └── setup.sh
├── pom.xml
├── README.md
└── .gitignore
```

### 核心依賴管理

#### 完整的 Maven 依賴配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.1.5</version>
        <relativePath/>
    </parent>

    <groupId>com.company</groupId>
    <artifactId>side-project</artifactId>
    <version>1.0.0</version>
    <name>Side Project</name>
    <description>Enterprise Side Project Configuration</description>
    <packaging>jar</packaging>

    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <spring-cloud.version>2022.0.4</spring-cloud.version>
        <springdoc.version>2.2.0</springdoc.version>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
        <testcontainers.version>1.19.0</testcontainers.version>
        <jackson.version>2.15.2</jackson.version>
        <guava.version>32.1.2-jre</guava.version>
        <commons-lang3.version>3.13.0</commons-lang3.version>
        <liquibase.version>4.23.2</liquibase.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-cache</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-aop</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <version>8.0.33</version>
        </dependency>
        
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
        
        <!-- Database Migration -->
        <dependency>
            <groupId>org.liquibase</groupId>
            <artifactId>liquibase-core</artifactId>
            <version>${liquibase.version}</version>
        </dependency>

        <!-- Documentation -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${springdoc.version}</version>
        </dependency>

        <!-- JSON Processing -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-core</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        
        <dependency>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>jackson-datatype-jsr310</artifactId>
            <version>${jackson.version}</version>
        </dependency>

        <!-- Utilities -->
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>${commons-lang3.version}</version>
        </dependency>
        
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>${guava.version}</version>
        </dependency>

        <!-- Mapping -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Monitoring -->
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
        
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>7.4</version>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.11.5</version>
        </dependency>
        
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>
        
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Test Dependencies -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${testcontainers.version}</version>
            <scope>test</scope>
        </dependency>
        
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>mysql</artifactId>
            <version>${testcontainers.version}</version>
            <scope>test</scope>
        </dependency>
        
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>redis</artifactId>
            <version>${testcontainers.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>17</source>
                    <target>17</target>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>${lombok.version}</version>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok-mapstruct-binding</artifactId>
                            <version>0.2.0</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            
            <plugin>
                <groupId>org.liquibase</groupId>
                <artifactId>liquibase-maven-plugin</artifactId>
                <version>${liquibase.version}</version>
                <configuration>
                    <propertyFile>src/main/resources/liquibase.properties</propertyFile>
                </configuration>
            </plugin>
            
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.10</version>
                <executions>
                    <execution>
                        <goals>
                            <goal>prepare-agent</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>report</id>
                        <phase>test</phase>
                        <goals>
                            <goal>report</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            
            <plugin>
                <groupId>com.google.cloud.tools</groupId>
                <artifactId>jib-maven-plugin</artifactId>
                <version>3.3.2</version>
                <configuration>
                    <from>
                        <image>eclipse-temurin:17-jre-alpine</image>
                    </from>
                    <to>
                        <image>your-registry/side-project:${project.version}</image>
                    </to>
                    <container>
                        <jvmFlags>
                            <jvmFlag>-Xms512m</jvmFlag>
                            <jvmFlag>-Xmx2g</jvmFlag>
                        </jvmFlags>
                        <mainClass>com.company.project.Application</mainClass>
                        <ports>
                            <port>8080</port>
                        </ports>
                    </container>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

### 應用程式配置

#### 主要配置檔案 - application.yml

```yaml
# 應用程式配置
spring:
  application:
    name: side-project
  
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  
  # 資料庫配置
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:side_project}?useSSL=false&serverTimezone=Asia/Taipei&allowPublicKeyRetrieval=true
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:password}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      minimum-idle: 5
      maximum-pool-size: 20
      idle-timeout: 30000
      connection-timeout: 30000
      max-lifetime: 1800000
      pool-name: HikariCP
  
  # JPA 配置
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
        format_sql: true
        use_sql_comments: true
        jdbc:
          batch_size: 25
          order_inserts: true
          order_updates: true
        connection:
          provider_disables_autocommit: true
        query:
          in_clause_parameter_padding: true
        cache:
          use_second_level_cache: true
          use_query_cache: true
          region:
            factory_class: org.hibernate.cache.jcache.JCacheRegionFactory
  
  # Redis 配置
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    database: 0
    timeout: 10000ms
    lettuce:
      pool:
        max-active: 200
        max-idle: 20
        min-idle: 5
        max-wait: 10000ms
  
  # Cache 配置
  cache:
    type: redis
    redis:
      time-to-live: 600000
      cache-null-values: false
  
  # Security 配置
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:your-google-client-id}
            client-secret: ${GOOGLE_CLIENT_SECRET:your-google-client-secret}
            scope: openid,profile,email
  
  # Liquibase 配置
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml
    enabled: true
  
  # Jackson 配置
  jackson:
    serialization:
      write-dates-as-timestamps: false
      indent-output: true
    deserialization:
      fail-on-unknown-properties: false
    time-zone: Asia/Taipei
    default-property-inclusion: non_null

# 服務器配置
server:
  port: ${SERVER_PORT:8080}
  servlet:
    context-path: /api
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json
    min-response-size: 1024
  error:
    include-stacktrace: never
    include-message: always

# 日誌配置
logging:
  level:
    root: INFO
    com.company.project: DEBUG
    org.springframework.security: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/application.log
  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 30

# 管理端點配置
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,liquibase,caches
  endpoint:
    health:
      show-details: always
  health:
    redis:
      enabled: true
    db:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}

# SpringDoc 配置
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: method
    tags-sorter: alpha
  packages-to-scan: com.company.project.controller

# 應用程式自訂配置
app:
  jwt:
    secret: ${JWT_SECRET:your-secret-key-must-be-at-least-256-bits}
    expiration: ${JWT_EXPIRATION:86400000} # 24 hours
    refresh-expiration: ${JWT_REFRESH_EXPIRATION:604800000} # 7 days
  
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:8080}
    allowed-methods: ${CORS_ALLOWED_METHODS:GET,POST,PUT,DELETE,OPTIONS}
    allowed-headers: ${CORS_ALLOWED_HEADERS:*}
    allow-credentials: true
  
  rate-limit:
    enabled: true
    requests-per-minute: 60
    burst-capacity: 100
  
  file-storage:
    upload-dir: ${FILE_UPLOAD_DIR:uploads/}
    max-file-size: ${MAX_FILE_SIZE:10MB}
    allowed-extensions: ${ALLOWED_EXTENSIONS:jpg,jpeg,png,gif,pdf,docx,xlsx}
```

#### 開發環境配置 - application-dev.yml

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/side_project_dev?useSSL=false&serverTimezone=Asia/Taipei
    username: root
    password: mysql
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  
  redis:
    host: localhost
    port: 6379
  
  liquibase:
    enabled: false

logging:
  level:
    root: DEBUG
    com.company.project: DEBUG
    org.springframework.web: DEBUG
    org.springframework.security: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: "*"

app:
  jwt:
    secret: dev-secret-key-for-development-only-not-for-production
    expiration: 86400000
  
  cors:
    allowed-origins: "http://localhost:3000,http://localhost:8080"
```

#### 生產環境配置 - application-prod.yml

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}?useSSL=true&serverTimezone=Asia/Taipei
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50
      idle-timeout: 60000
      connection-timeout: 30000
      max-lifetime: 1800000
  
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  
  redis:
    host: ${REDIS_HOST}
    port: ${REDIS_PORT}
    password: ${REDIS_PASSWORD}
    ssl: true
  
  liquibase:
    enabled: true

logging:
  level:
    root: WARN
    com.company.project: INFO
  file:
    name: /var/log/side-project/application.log

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration: ${JWT_EXPIRATION:3600000}
  
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS}
```

### 核心配置類別

#### 主要應用程式配置

```java
package com.company.project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    
    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private RateLimit rateLimit = new RateLimit();
    private FileStorage fileStorage = new FileStorage();
    
    @Data
    public static class Jwt {
        private String secret;
        private long expiration;
        private long refreshExpiration;
    }
    
    @Data
    public static class Cors {
        private String allowedOrigins;
        private String allowedMethods;
        private String allowedHeaders;
        private boolean allowCredentials;
    }
    
    @Data
    public static class RateLimit {
        private boolean enabled;
        private int requestsPerMinute;
        private int burstCapacity;
    }
    
    @Data
    public static class FileStorage {
        private String uploadDir;
        private String maxFileSize;
        private String allowedExtensions;
    }
}
```

#### 資料庫配置

```java
package com.company.project.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;

@Configuration
@EnableJpaRepositories(basePackages = "com.company.project.repository")
@EnableJpaAuditing
@EnableTransactionManagement
public class DatabaseConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariConfig hikariConfig() {
        return new HikariConfig();
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        return new HikariDataSource(hikariConfig());
    }
}
```

#### Redis 配置

```java
package com.company.project.config;

import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheConfiguration;

import java.time.Duration;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory(RedisProperties redisProperties) {
        return new LettuceConnectionFactory(redisProperties.getHost(), redisProperties.getPort());
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // 設定序列化器
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

#### 安全配置

```java
package com.company.project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
public class SecurityConfig {

    private final AppProperties appProperties;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(AppProperties appProperties, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.appProperties = appProperties;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/auth/**", "/api/public/**").permitAll()
                .requestMatchers("/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(appProperties.getCors().getAllowedOrigins().split(",")));
        configuration.setAllowedMethods(Arrays.asList(appProperties.getCors().getAllowedMethods().split(",")));
        configuration.setAllowedHeaders(Arrays.asList(appProperties.getCors().getAllowedHeaders().split(",")));
        configuration.setAllowCredentials(appProperties.getCors().isAllowCredentials());
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

#### OpenAPI 配置

```java
package com.company.project.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Side Project API")
                        .version("1.0.0")
                        .description("Enterprise Side Project API Documentation")
                        .contact(new Contact()
                                .name("Bill Lin")
                                .email("bill@example.com")
                                .url("https://github.com/yourhandle"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
                .components(new Components()
                        .addSecuritySchemes("Bearer Authentication",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
```

### 容器化配置

#### Dockerfile

```dockerfile
# Multi-stage build
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app
COPY pom.xml .
COPY src ./src

RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

# 建立非 root 使用者
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# 複製 JAR 檔案
COPY --from=builder /app/target/*.jar app.jar

# 建立必要目錄
RUN mkdir -p /app/logs /app/uploads && \
    chown -R appuser:appgroup /app

# 切換到非 root 使用者
USER appuser

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# 暴露埠號
EXPOSE 8080

# JVM 調優參數
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/app/logs/"

# 啟動應用程式
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=side_project
      - DB_USERNAME=root
      - DB_PASSWORD=mysql
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mysql
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - app-network
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=mysql
      - MYSQL_DATABASE=side_project
      - MYSQL_USER=app
      - MYSQL_PASSWORD=app
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - app-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./docker/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - app-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

#### 生產環境 docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    image: your-registry/side-project:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_HOST=mysql-prod
      - DB_PORT=3306
      - DB_NAME=side_project_prod
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis-prod
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    secrets:
      - db_password
      - jwt_secret
    networks:
      - app-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  mysql-prod:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD_FILE=/run/secrets/db_password
      - MYSQL_DATABASE=side_project_prod
    volumes:
      - mysql_prod_data:/var/lib/mysql
    secrets:
      - db_password
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'

  redis-prod:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_prod_data:/data
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true

volumes:
  mysql_prod_data:
  redis_prod_data:

networks:
  app-network:
    driver: overlay
```

### 監控配置

#### logback-spring.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    
    <springProfile name="!prod">
        <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
    
    <springProfile name="prod">
        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>/var/log/side-project/application.log</file>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <mdc/>
                    <message/>
                    <stackTrace/>
                </providers>
            </encoder>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>/var/log/side-project/application.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
                <timeBasedFileNamingAndTriggeringPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                    <maxFileSize>100MB</maxFileSize>
                </timeBasedFileNamingAndTriggeringPolicy>
                <maxHistory>30</maxHistory>
                <totalSizeCap>3GB</totalSizeCap>
            </rollingPolicy>
        </appender>
        
        <appender name="METRICS" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>/var/log/side-project/metrics.log</file>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <mdc/>
                    <message/>
                </providers>
            </encoder>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>/var/log/side-project/metrics.%d{yyyy-MM-dd}.log</fileNamePattern>
                <maxHistory>7</maxHistory>
            </rollingPolicy>
        </appender>
        
        <logger name="metrics" level="INFO" additivity="false">
            <appender-ref ref="METRICS"/>
        </logger>
        
        <root level="INFO">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

#### Prometheus 配置

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'side-project'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/actuator/prometheus'
    scrape_interval: 10s
    
  - job_name: 'mysql'
    static_configs:
      - targets: ['mysql:3306']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### CI/CD 配置

#### GitHub Actions - CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: mysql
          MYSQL_DATABASE: side_project_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
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
        restore-keys: ${{ runner.os }}-m2
    
    - name: Run tests
      run: mvn clean test
      env:
        SPRING_PROFILES_ACTIVE: test
        DB_HOST: localhost
        DB_PORT: 3306
        DB_NAME: side_project_test
        DB_USERNAME: root
        DB_PASSWORD: mysql
        REDIS_HOST: localhost
        REDIS_PORT: 6379
    
    - name: Generate test report
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Maven Tests
        path: target/surefire-reports/*.xml
        reporter: java-junit
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./target/site/jacoco/jacoco.xml
    
    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

#### GitHub Actions - CD

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Build with Maven
      run: mvn clean package -DskipTests
    
    - name: Build Docker image
      run: |
        docker build -t ${{ secrets.REGISTRY_URL }}/side-project:${{ github.sha }} .
        docker tag ${{ secrets.REGISTRY_URL }}/side-project:${{ github.sha }} ${{ secrets.REGISTRY_URL }}/side-project:latest
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ secrets.REGISTRY_URL }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Push Docker image
      run: |
        docker push ${{ secrets.REGISTRY_URL }}/side-project:${{ github.sha }}
        docker push ${{ secrets.REGISTRY_URL }}/side-project:latest
    
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/side-project
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

### 部署腳本

#### 建構腳本 - scripts/build.sh

```bash
#!/bin/bash

# 建構腳本
set -e

echo "開始建構 Side Project..."

# 清理舊的建構檔案
echo "清理舊的建構檔案..."
mvn clean

# 執行測試
echo "執行測試..."
mvn test

# 建構應用程式
echo "建構應用程式..."
mvn package -DskipTests

# 建構 Docker 映像
echo "建構 Docker 映像..."
docker build -t side-project:latest .

echo "建構完成！"
```

#### 部署腳本 - scripts/deploy.sh

```bash
#!/bin/bash

# 部署腳本
set -e

ENVIRONMENT=${1:-dev}
VERSION=${2:-latest}

echo "部署 Side Project 到 $ENVIRONMENT 環境..."

case $ENVIRONMENT in
    "dev")
        echo "部署到開發環境..."
        docker-compose -f docker-compose.yml up -d
        ;;
    "staging")
        echo "部署到測試環境..."
        docker-compose -f docker-compose.staging.yml up -d
        ;;
    "prod")
        echo "部署到生產環境..."
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    *)
        echo "未知環境: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "部署完成！"
echo "健康檢查中..."
sleep 30

# 健康檢查
for i in {1..5}; do
    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo "應用程式健康狀態正常"
        break
    else
        echo "健康檢查失敗，重試中... ($i/5)"
        sleep 10
    fi
done
```

### 自訂 Banner

#### resources/banner.txt

```
   _____ _     _        _____           _           _   
  / ____(_)   | |      |  __ \         (_)         | |  
 | (___  _  __| | ___  | |__) |____ ___ _  ___  ___| |_ 
  \___ \| |/ _` |/ _ \ |  ___/ '__/ _ \ |/ _ \/ __| __|
  ____) | | (_| |  __/ | |   | | | (_) | |  __/ (__| |_ 
 |_____/|_|\__,_|\___| |_|   |_|  \___/| |\___|\___|\__|
                                      _/ |              
                                     |__/               

:: Spring Boot :: (v3.1.5)
:: Application Version :: 1.0.0
:: Environment :: ${spring.profiles.active}
:: Port :: ${server.port}
```

### 最佳實踐與建議

#### 1. 安全性最佳實踐

```yaml
# 生產環境安全配置
security:
  headers:
    frame-options: DENY
    content-type-options: nosniff
    xss-protection: 1; mode=block
    referrer-policy: strict-origin-when-cross-origin
  
  ssl:
    enabled: true
    key-store: /etc/ssl/keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
```

#### 2. 效能優化配置

```yaml
# JVM 調優
JAVA_OPTS: >
  -server
  -Xms1g
  -Xmx2g
  -XX:+UseG1GC
  -XX:MaxGCPauseMillis=200
  -XX:+UseStringDeduplication
  -XX:+HeapDumpOnOutOfMemoryError
  -XX:HeapDumpPath=/var/log/side-project/
  -Dspring.profiles.active=prod
```

#### 3. 監控與告警

```yaml
# 自訂監控指標
management:
  metrics:
    export:
      prometheus:
        enabled: true
      cloudwatch:
        enabled: true
        namespace: SideProject
        step: 1m
    distribution:
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
        spring.data.repository.invocations: 0.5, 0.95, 0.99
```

#### 4. 資料庫優化

```yaml
# 資料庫連線池優化
spring:
  datasource:
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50
      idle-timeout: 600000
      connection-timeout: 30000
      max-lifetime: 1800000
      leak-detection-threshold: 60000
      connection-test-query: SELECT 1
```

## 踩坑紀錄

### Spring Boot 3 Jakarta 遷移
Spring Boot 3 需要 Java 17+ 且所有 javax.* → jakarta.*。若從 Boot 2.x 升級，常見的 compile error：
- `javax.persistence.*` → `jakarta.persistence.*`
- `javax.servlet.*` → `jakarta.servlet.*`
- `javax.validation.*` → `jakarta.validation.*`

### Testcontainers 整合
Spring Boot 3.1+ 原生支援 Testcontainers：
```java
@SpringBootTest
@Testcontainers
class IntegrationTest {
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
    }
}
```

## 版本變遷

| 版本 | 主要變更 |
|------|---------|
| Spring Boot 3.0 | Jakarta EE 10、Java 17 baseline、Hibernate 6 |
| Spring Boot 3.1 | Testcontainers 原生支援、Docker Compose 支援 |
| Spring Boot 3.2 | Virtual Threads 自動啟用（`spring.threads.virtual.enabled=true`）、`RestClient` GA |
| Spring Boot 3.3 | CDS（Class Data Sharing）啟動加速 |

### 總結

本文提供了一個完整的 Side Project 企業級配置指南，包含：

1. **完整的專案結構**：標準化的 Maven 專案結構
2. **現代化依賴管理**：使用最新的 Spring Boot 3.x 和 Java 17
3. **多環境配置**：開發、測試、生產環境的完整配置
4. **安全性配置**：JWT、CORS、OAuth2 等安全機制
5. **容器化部署**：Docker 和 docker-compose 配置
6. **監控系統**：Prometheus、Grafana 監控配置
7. **CI/CD 流程**：GitHub Actions 自動化部署
8. **最佳實踐**：安全性、效能、監控等方面的建議

這個配置可以作為任何 Side Project 的起點，提供了企業級的可擴展性和可維護性。通過遵循這些最佳實踐，您可以快速建立一個穩定、安全、高效的應用程式。