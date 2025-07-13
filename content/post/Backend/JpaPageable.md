---
title: "Spring Data JPA Pageable 分頁查詢：完整實作與效能優化指南"
author: Bill.Lin
date: 2020-01-07T13:26:41+08:00
draft: false
tags: ["Spring Data JPA", "Pageable", "Pagination", "Spring Boot", "Database", "Performance", "Specification", "Criteria API"]
Description: "詳細介紹 Spring Data JPA 中 Pageable 分頁查詢的使用方法，包含自訂查詢、排序與效能優化技巧"
Categories: ["Backend"]
DisableComments: false
---

## 概述

在處理大量資料時，分頁查詢是必不可少的功能。Spring Data JPA 提供了強大的 `Pageable` 接口，配合 `Specification` 可以輕鬆實現靈活的分頁查詢功能。本文將深入介紹如何使用這些功能來構建高效的分頁系統。

### 核心概念

- **Pageable**：分頁參數接口，定義頁面大小、頁碼和排序規則
- **Page**：分頁結果接口，包含資料和分頁資訊
- **Specification**：查詢規格接口，用於動態構建查詢條件
- **Criteria API**：JPA 標準的類型安全查詢 API

### 架構優勢

1. **類型安全**：Criteria API 提供編譯時檢查
2. **動態查詢**：根據條件動態構建 SQL
3. **自動計數**：自動執行 COUNT 查詢計算總數
4. **靈活排序**：支援多欄位排序
5. **效能優化**：支援各種優化策略

## 基礎配置

### 1. 依賴設定

```xml
<!-- Spring Boot Starter Data JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Spring Boot Starter Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Database Driver (以 MySQL 為例) -->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Spring Boot Starter Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

### 2. 實體類定義

```java
package com.example.pagination.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_username", columnList = "username"),
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    @NotBlank
    @Email
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(name = "first_name", length = 50)
    private String firstName;
    
    @Column(name = "last_name", length = 50)
    private String lastName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;
    
    @Column(name = "age")
    private Integer age;
    
    @Column(name = "city", length = 100)
    private String city;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // 建構子
    public User() {}
    
    public User(String username, String email, String firstName, String lastName) {
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

enum UserStatus {
    ACTIVE, INACTIVE, SUSPENDED, DELETED
}
```

### 3. Repository 接口

```java
package com.example.pagination.repository;

import com.example.pagination.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    
    // 基本分頁查詢
    Page<User> findByStatus(UserStatus status, Pageable pageable);
    
    // 複合條件分頁查詢
    Page<User> findByStatusAndAgeGreaterThan(UserStatus status, Integer age, Pageable pageable);
    
    // 模糊查詢分頁
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
    
    // 時間範圍查詢
    Page<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    // 自訂查詢分頁
    @Query("SELECT u FROM User u WHERE u.city = :city AND u.age BETWEEN :minAge AND :maxAge")
    Page<User> findByCityAndAgeBetween(@Param("city") String city, 
                                       @Param("minAge") Integer minAge, 
                                       @Param("maxAge") Integer maxAge, 
                                       Pageable pageable);
    
    // 原生 SQL 分頁查詢
    @Query(value = "SELECT * FROM users u WHERE u.email LIKE %:emailDomain%", 
           countQuery = "SELECT COUNT(*) FROM users u WHERE u.email LIKE %:emailDomain%",
           nativeQuery = true)
    Page<User> findByEmailDomain(@Param("emailDomain") String emailDomain, Pageable pageable);
    
    // 投影查詢（只查詢部分欄位）
    @Query("SELECT new com.example.pagination.dto.UserSummaryDto(u.id, u.username, u.email, u.status) " +
           "FROM User u WHERE u.status = :status")
    Page<UserSummaryDto> findUserSummariesByStatus(@Param("status") UserStatus status, Pageable pageable);
}
```

## Specification 動態查詢

### 1. 基礎 Specification

```java
package com.example.pagination.specification;

import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class UserSpecification {
    
    /**
     * 根據使用者名稱模糊查詢
     */
    public static Specification<User> usernameContains(String username) {
        return (root, query, criteriaBuilder) -> {
            if (username == null || username.trim().isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.like(
                criteriaBuilder.lower(root.get("username")), 
                "%" + username.toLowerCase() + "%"
            );
        };
    }
    
    /**
     * 根據郵箱模糊查詢
     */
    public static Specification<User> emailContains(String email) {
        return (root, query, criteriaBuilder) -> {
            if (email == null || email.trim().isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.like(
                criteriaBuilder.lower(root.get("email")), 
                "%" + email.toLowerCase() + "%"
            );
        };
    }
    
    /**
     * 根據狀態查詢
     */
    public static Specification<User> statusEquals(UserStatus status) {
        return (root, query, criteriaBuilder) -> {
            if (status == null) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(root.get("status"), status);
        };
    }
    
    /**
     * 根據年齡範圍查詢
     */
    public static Specification<User> ageBetween(Integer minAge, Integer maxAge) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (minAge != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("age"), minAge));
            }
            if (maxAge != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("age"), maxAge));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * 根據城市查詢
     */
    public static Specification<User> cityEquals(String city) {
        return (root, query, criteriaBuilder) -> {
            if (city == null || city.trim().isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(root.get("city"), city);
        };
    }
    
    /**
     * 根據創建時間範圍查詢
     */
    public static Specification<User> createdAtBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * 複合查詢 - 根據多個條件
     */
    public static Specification<User> withFilters(String username, String email, 
                                                  UserStatus status, Integer minAge, 
                                                  Integer maxAge, String city) {
        return Specification.where(usernameContains(username))
                .and(emailContains(email))
                .and(statusEquals(status))
                .and(ageBetween(minAge, maxAge))
                .and(cityEquals(city));
    }
    
    /**
     * 進階查詢 - 支援 OR 條件
     */
    public static Specification<User> searchByKeyword(String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            
            String likePattern = "%" + keyword.toLowerCase() + "%";
            
            return criteriaBuilder.or(
                criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), likePattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), likePattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("firstName")), likePattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("lastName")), likePattern),
                criteriaBuilder.like(criteriaBuilder.lower(root.get("city")), likePattern)
            );
        };
    }
}
```

### 2. 動態 Specification 建構器

```java
package com.example.pagination.specification;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;

public class DynamicSpecificationBuilder<T> {
    
    private List<Specification<T>> specifications = new ArrayList<>();
    
    public DynamicSpecificationBuilder<T> with(String field, String operation, Object value) {
        if (value != null) {
            specifications.add(createSpecification(field, operation, value));
        }
        return this;
    }
    
    public DynamicSpecificationBuilder<T> with(Specification<T> specification) {
        if (specification != null) {
            specifications.add(specification);
        }
        return this;
    }
    
    public Specification<T> build() {
        if (specifications.isEmpty()) {
            return null;
        }
        
        Specification<T> result = specifications.get(0);
        for (int i = 1; i < specifications.size(); i++) {
            result = Specification.where(result).and(specifications.get(i));
        }
        return result;
    }
    
    private Specification<T> createSpecification(String field, String operation, Object value) {
        return (root, query, criteriaBuilder) -> {
            switch (operation.toLowerCase()) {
                case "eq":
                case "equals":
                    return criteriaBuilder.equal(root.get(field), value);
                    
                case "ne":
                case "not_equals":
                    return criteriaBuilder.notEqual(root.get(field), value);
                    
                case "gt":
                case "greater_than":
                    return criteriaBuilder.greaterThan(root.get(field), (Comparable) value);
                    
                case "gte":
                case "greater_than_or_equal":
                    return criteriaBuilder.greaterThanOrEqualTo(root.get(field), (Comparable) value);
                    
                case "lt":
                case "less_than":
                    return criteriaBuilder.lessThan(root.get(field), (Comparable) value);
                    
                case "lte":
                case "less_than_or_equal":
                    return criteriaBuilder.lessThanOrEqualTo(root.get(field), (Comparable) value);
                    
                case "like":
                case "contains":
                    return criteriaBuilder.like(
                        criteriaBuilder.lower(root.get(field)), 
                        "%" + value.toString().toLowerCase() + "%"
                    );
                    
                case "starts_with":
                    return criteriaBuilder.like(
                        criteriaBuilder.lower(root.get(field)), 
                        value.toString().toLowerCase() + "%"
                    );
                    
                case "ends_with":
                    return criteriaBuilder.like(
                        criteriaBuilder.lower(root.get(field)), 
                        "%" + value.toString().toLowerCase()
                    );
                    
                case "in":
                    if (value instanceof List) {
                        return root.get(field).in((List<?>) value);
                    }
                    return criteriaBuilder.equal(root.get(field), value);
                    
                case "is_null":
                    return criteriaBuilder.isNull(root.get(field));
                    
                case "is_not_null":
                    return criteriaBuilder.isNotNull(root.get(field));
                    
                default:
                    throw new IllegalArgumentException("不支援的操作: " + operation);
            }
        };
    }
}
```

## DTO 和分頁請求處理

### 1. 分頁請求 DTO

```java
package com.example.pagination.dto;

import com.example.pagination.entity.UserStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;

public class UserPageRequest {
    
    @Min(value = 0, message = "頁碼不能小於 0")
    private int page = 0;
    
    @Min(value = 1, message = "每頁大小不能小於 1")
    @Max(value = 100, message = "每頁大小不能超過 100")
    private int size = 20;
    
    private String sortBy = "id";
    private String sortDirection = "DESC";
    
    // 查詢條件
    private String username;
    private String email;
    private UserStatus status;
    private Integer minAge;
    private Integer maxAge;
    private String city;
    private String keyword; // 關鍵字搜索
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    
    // 建構子
    public UserPageRequest() {}
    
    public UserPageRequest(int page, int size) {
        this.page = page;
        this.size = size;
    }
    
    /**
     * 轉換為 Pageable 物件
     */
    public Pageable toPageable() {
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Sort sort = Sort.by(direction, sortBy);
        return PageRequest.of(page, size, sort);
    }
    
    /**
     * 檢查是否有查詢條件
     */
    public boolean hasFilters() {
        return username != null || email != null || status != null ||
               minAge != null || maxAge != null || city != null ||
               keyword != null || startDate != null || endDate != null;
    }
    
    // Getters and Setters
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
    
    public String getSortBy() { return sortBy; }
    public void setSortBy(String sortBy) { this.sortBy = sortBy; }
    
    public String getSortDirection() { return sortDirection; }
    public void setSortDirection(String sortDirection) { this.sortDirection = sortDirection; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    
    public Integer getMinAge() { return minAge; }
    public void setMinAge(Integer minAge) { this.minAge = minAge; }
    
    public Integer getMaxAge() { return maxAge; }
    public void setMaxAge(Integer maxAge) { this.maxAge = maxAge; }
    
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    
    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
}
```

### 2. 分頁回應 DTO

```java
package com.example.pagination.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public class PageResponse<T> {
    
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private boolean hasNext;
    private boolean hasPrevious;
    private int numberOfElements;
    
    // 建構子
    public PageResponse() {}
    
    public PageResponse(Page<T> page) {
        this.content = page.getContent();
        this.page = page.getNumber();
        this.size = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages = page.getTotalPages();
        this.first = page.isFirst();
        this.last = page.isLast();
        this.hasNext = page.hasNext();
        this.hasPrevious = page.hasPrevious();
        this.numberOfElements = page.getNumberOfElements();
    }
    
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page);
    }
    
    // Getters and Setters
    public List<T> getContent() { return content; }
    public void setContent(List<T> content) { this.content = content; }
    
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
    
    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }
    
    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    
    public boolean isFirst() { return first; }
    public void setFirst(boolean first) { this.first = first; }
    
    public boolean isLast() { return last; }
    public void setLast(boolean last) { this.last = last; }
    
    public boolean isHasNext() { return hasNext; }
    public void setHasNext(boolean hasNext) { this.hasNext = hasNext; }
    
    public boolean isHasPrevious() { return hasPrevious; }
    public void setHasPrevious(boolean hasPrevious) { this.hasPrevious = hasPrevious; }
    
    public int getNumberOfElements() { return numberOfElements; }
    public void setNumberOfElements(int numberOfElements) { this.numberOfElements = numberOfElements; }
}
```

### 3. 使用者摘要 DTO

```java
package com.example.pagination.dto;

import com.example.pagination.entity.UserStatus;

public class UserSummaryDto {
    
    private Long id;
    private String username;
    private String email;
    private UserStatus status;
    
    // 建構子
    public UserSummaryDto() {}
    
    public UserSummaryDto(Long id, String username, String email, UserStatus status) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.status = status;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
}
```

## Service 層實作

### 1. 使用者服務介面

```java
package com.example.pagination.service;

import com.example.pagination.dto.PageResponse;
import com.example.pagination.dto.UserPageRequest;
import com.example.pagination.dto.UserSummaryDto;
import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import org.springframework.data.domain.Page;

public interface UserService {
    
    /**
     * 分頁查詢使用者
     */
    PageResponse<User> findUsers(UserPageRequest request);
    
    /**
     * 關鍵字搜索使用者
     */
    PageResponse<User> searchUsers(String keyword, UserPageRequest request);
    
    /**
     * 根據狀態分頁查詢使用者摘要
     */
    PageResponse<UserSummaryDto> findUserSummariesByStatus(UserStatus status, UserPageRequest request);
    
    /**
     * 高級搜索
     */
    PageResponse<User> advancedSearch(UserPageRequest request);
}
```

### 2. 使用者服務實作

```java
package com.example.pagination.service.impl;

import com.example.pagination.dto.PageResponse;
import com.example.pagination.dto.UserPageRequest;
import com.example.pagination.dto.UserSummaryDto;
import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import com.example.pagination.repository.UserRepository;
import com.example.pagination.service.UserService;
import com.example.pagination.specification.DynamicSpecificationBuilder;
import com.example.pagination.specification.UserSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public PageResponse<User> findUsers(UserPageRequest request) {
        Pageable pageable = request.toPageable();
        
        if (!request.hasFilters()) {
            // 沒有過濾條件，直接分頁查詢
            Page<User> page = userRepository.findAll(pageable);
            return PageResponse.of(page);
        }
        
        // 有過濾條件，使用 Specification
        Specification<User> spec = UserSpecification.withFilters(
            request.getUsername(),
            request.getEmail(),
            request.getStatus(),
            request.getMinAge(),
            request.getMaxAge(),
            request.getCity()
        );
        
        Page<User> page = userRepository.findAll(spec, pageable);
        return PageResponse.of(page);
    }
    
    @Override
    public PageResponse<User> searchUsers(String keyword, UserPageRequest request) {
        Pageable pageable = request.toPageable();
        Specification<User> spec = UserSpecification.searchByKeyword(keyword);
        
        Page<User> page = userRepository.findAll(spec, pageable);
        return PageResponse.of(page);
    }
    
    @Override
    public PageResponse<UserSummaryDto> findUserSummariesByStatus(UserStatus status, UserPageRequest request) {
        Pageable pageable = request.toPageable();
        Page<UserSummaryDto> page = userRepository.findUserSummariesByStatus(status, pageable);
        return PageResponse.of(page);
    }
    
    @Override
    public PageResponse<User> advancedSearch(UserPageRequest request) {
        Pageable pageable = request.toPageable();
        
        // 使用動態 Specification 建構器
        DynamicSpecificationBuilder<User> builder = new DynamicSpecificationBuilder<>();
        
        builder.with("username", "contains", request.getUsername())
               .with("email", "contains", request.getEmail())
               .with("status", "equals", request.getStatus())
               .with("age", "gte", request.getMinAge())
               .with("age", "lte", request.getMaxAge())
               .with("city", "equals", request.getCity())
               .with("createdAt", "gte", request.getStartDate())
               .with("createdAt", "lte", request.getEndDate());
        
        // 如果有關鍵字，添加關鍵字搜索
        if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
            builder.with(UserSpecification.searchByKeyword(request.getKeyword()));
        }
        
        Specification<User> spec = builder.build();
        Page<User> page = userRepository.findAll(spec, pageable);
        return PageResponse.of(page);
    }
}
```

## Controller 層實作

### 1. 使用者控制器

```java
package com.example.pagination.controller;

import com.example.pagination.dto.PageResponse;
import com.example.pagination.dto.UserPageRequest;
import com.example.pagination.dto.UserSummaryDto;
import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import com.example.pagination.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {
    
    @Autowired
    private UserService userService;
    
    /**
     * 分頁查詢使用者
     */
    @GetMapping
    public ResponseEntity<PageResponse<User>> getUsers(@Valid UserPageRequest request) {
        PageResponse<User> response = userService.findUsers(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 關鍵字搜索使用者
     */
    @GetMapping("/search")
    public ResponseEntity<PageResponse<User>> searchUsers(
            @RequestParam String keyword,
            @Valid UserPageRequest request) {
        
        PageResponse<User> response = userService.searchUsers(keyword, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 高級搜索
     */
    @PostMapping("/advanced-search")
    public ResponseEntity<PageResponse<User>> advancedSearch(@Valid @RequestBody UserPageRequest request) {
        PageResponse<User> response = userService.advancedSearch(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 根據狀態查詢使用者摘要
     */
    @GetMapping("/summaries")
    public ResponseEntity<PageResponse<UserSummaryDto>> getUserSummaries(
            @RequestParam UserStatus status,
            @Valid UserPageRequest request) {
        
        PageResponse<UserSummaryDto> response = userService.findUserSummariesByStatus(status, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 使用路徑參數的分頁查詢
     */
    @GetMapping("/page/{page}/size/{size}")
    public ResponseEntity<PageResponse<User>> getUsersWithPathParams(
            @PathVariable int page,
            @PathVariable int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {
        
        UserPageRequest request = new UserPageRequest(page, size);
        if (sortBy != null) request.setSortBy(sortBy);
        if (sortDirection != null) request.setSortDirection(sortDirection);
        
        PageResponse<User> response = userService.findUsers(request);
        return ResponseEntity.ok(response);
    }
}
```

### 2. 分頁配置控制器

```java
package com.example.pagination.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.SortDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class PageConfigController {
    
    /**
     * 使用 Spring 自動解析的 Pageable 參數
     */
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsersWithSpringPageable(
            @PageableDefault(page = 0, size = 20) 
            @SortDefault(sort = "id", direction = Sort.Direction.DESC) 
            Pageable pageable) {
        
        Map<String, Object> result = new HashMap<>();
        result.put("page", pageable.getPageNumber());
        result.put("size", pageable.getPageSize());
        result.put("sort", pageable.getSort().toString());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * 動態排序欄位驗證
     */
    @GetMapping("/users/validated")
    public ResponseEntity<Pageable> getValidatedPageable(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        // 驗證排序欄位
        String[] allowedSortFields = {"id", "username", "email", "createdAt", "updatedAt"};
        boolean isValidSortField = false;
        for (String field : allowedSortFields) {
            if (field.equals(sortBy)) {
                isValidSortField = true;
                break;
            }
        }
        
        if (!isValidSortField) {
            sortBy = "id"; // 預設排序欄位
        }
        
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Sort sort = Sort.by(direction, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        return ResponseEntity.ok(pageable);
    }
}
```

## 效能優化技巧

### 1. 資料庫索引優化

```sql
-- 為常用查詢欄位建立索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_city_status ON users(city, status);

-- 複合索引優化多條件查詢
CREATE INDEX idx_users_status_age ON users(status, age);
CREATE INDEX idx_users_city_age_status ON users(city, age, status);

-- 分析查詢執行計畫
EXPLAIN SELECT * FROM users WHERE status = 'ACTIVE' AND age > 25 ORDER BY created_at DESC LIMIT 20;
```

### 2. JPA 查詢優化

```java
package com.example.pagination.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@EnableSpringDataWebSupport
public class PaginationConfig implements WebMvcConfigurer {
    
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        PageableHandlerMethodArgumentResolver resolver = new PageableHandlerMethodArgumentResolver();
        
        // 設定預設分頁參數
        resolver.setFallbackPageable(PageRequest.of(0, 20));
        
        // 設定最大分頁大小
        resolver.setMaxPageSize(100);
        
        // 設定一頁為 1 的參數（而不是 0）
        resolver.setOneIndexedParameters(false);
        
        resolvers.add(resolver);
    }
}
```

### 3. 快取優化

```java
package com.example.pagination.service.impl;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class CachedUserService {
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 快取熱門查詢結果
     */
    @Cacheable(value = "userPages", key = "#status + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public Page<User> findUsersByStatusCached(UserStatus status, Pageable pageable) {
        return userRepository.findByStatus(status, pageable);
    }
    
    /**
     * 快取總數查詢
     */
    @Cacheable(value = "userCounts", key = "#status")
    public long countUsersByStatus(UserStatus status) {
        return userRepository.countByStatus(status);
    }
}
```

### 4. 批次查詢優化

```java
package com.example.pagination.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OptimizedUserService {
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 避免 N+1 查詢問題
     */
    public Page<User> findUsersWithOptimization(Pageable pageable) {
        // 只查詢當前頁的資料
        List<User> users = userRepository.findUsersWithPagination(
            pageable.getOffset(), 
            pageable.getPageSize()
        );
        
        // 單獨查詢總數（可以快取）
        long total = userRepository.countAllUsers();
        
        return new PageImpl<>(users, pageable, total);
    }
    
    /**
     * 使用原生 SQL 優化大資料查詢
     */
    @Query(value = """
        SELECT u.* FROM users u 
        WHERE u.status = :status 
        ORDER BY u.id DESC 
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    public List<User> findUsersWithNativeQuery(
        @Param("status") String status,
        @Param("limit") int limit,
        @Param("offset") long offset
    );
}
```

## 實戰範例

### 1. 電商訂單分頁查詢

```java
package com.example.pagination.example;

import com.example.pagination.entity.Order;
import com.example.pagination.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// 訂單實體
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;
    
    @Column(name = "customer_id")
    private String customerId;
    
    @Column(name = "total_amount")
    private BigDecimal totalAmount;
    
    @Enumerated(EnumType.STRING)
    private OrderStatus status;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // Getters and Setters...
}

// Repository 介面
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    
    Page<Order> findByCustomerId(String customerId, Pageable pageable);
    
    Page<Order> findByStatusAndCreatedAtBetween(
        OrderStatus status, 
        LocalDateTime startDate, 
        LocalDateTime endDate, 
        Pageable pageable
    );
}

// 訂單 Specification
public class OrderSpecification {
    
    public static Specification<Order> hasCustomerId(String customerId) {
        return (root, query, cb) -> 
            customerId == null ? cb.conjunction() : cb.equal(root.get("customerId"), customerId);
    }
    
    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) -> 
            status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }
    
    public static Specification<Order> amountBetween(BigDecimal minAmount, BigDecimal maxAmount) {
        return (root, query, cb) -> {
            if (minAmount == null && maxAmount == null) return cb.conjunction();
            
            if (minAmount != null && maxAmount != null) {
                return cb.between(root.get("totalAmount"), minAmount, maxAmount);
            } else if (minAmount != null) {
                return cb.greaterThanOrEqualTo(root.get("totalAmount"), minAmount);
            } else {
                return cb.lessThanOrEqualTo(root.get("totalAmount"), maxAmount);
            }
        };
    }
    
    public static Specification<Order> createdBetween(LocalDateTime start, LocalDateTime end) {
        return (root, query, cb) -> {
            if (start == null && end == null) return cb.conjunction();
            
            if (start != null && end != null) {
                return cb.between(root.get("createdAt"), start, end);
            } else if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("createdAt"), start);
            } else {
                return cb.lessThanOrEqualTo(root.get("createdAt"), end);
            }
        };
    }
}

// 控制器實作
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    @Autowired
    private OrderRepository orderRepository;
    
    /**
     * 分頁查詢訂單
     */
    @GetMapping
    public ResponseEntity<Page<Order>> getOrders(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            Pageable pageable) {
        
        Specification<Order> spec = Specification
            .where(OrderSpecification.hasCustomerId(customerId))
            .and(OrderSpecification.hasStatus(status))
            .and(OrderSpecification.amountBetween(minAmount, maxAmount))
            .and(OrderSpecification.createdBetween(startDate, endDate));
        
        Page<Order> orders = orderRepository.findAll(spec, pageable);
        return ResponseEntity.ok(orders);
    }
    
    /**
     * 客戶訂單查詢
     */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Page<Order>> getCustomerOrders(
            @PathVariable String customerId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) 
            Pageable pageable) {
        
        Page<Order> orders = orderRepository.findByCustomerId(customerId, pageable);
        return ResponseEntity.ok(orders);
    }
}
```

### 2. 統計報表分頁查詢

```java
package com.example.pagination.example;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

// 統計 DTO
public class OrderStatistics {
    private String customerId;
    private String customerName;
    private Long orderCount;
    private BigDecimal totalAmount;
    private LocalDate lastOrderDate;
    
    public OrderStatistics(String customerId, String customerName, 
                          Long orderCount, BigDecimal totalAmount, LocalDate lastOrderDate) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.orderCount = orderCount;
        this.totalAmount = totalAmount;
        this.lastOrderDate = lastOrderDate;
    }
    
    // Getters and Setters...
}

// Repository 統計查詢
public interface OrderStatisticsRepository extends JpaRepository<Order, Long> {
    
    @Query("""
        SELECT new com.example.pagination.example.OrderStatistics(
            o.customerId, 
            c.name,
            COUNT(o.orderId),
            SUM(o.totalAmount),
            MAX(CAST(o.createdAt AS LocalDate))
        )
        FROM Order o 
        JOIN Customer c ON o.customerId = c.customerId
        WHERE o.createdAt BETWEEN :startDate AND :endDate
        GROUP BY o.customerId, c.name
        HAVING COUNT(o.orderId) >= :minOrderCount
        """)
    Page<OrderStatistics> findOrderStatistics(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("minOrderCount") Long minOrderCount,
        Pageable pageable
    );
}

// 統計報表控制器
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    
    @Autowired
    private OrderStatisticsRepository statisticsRepository;
    
    @GetMapping("/customer-statistics")
    public ResponseEntity<Page<OrderStatistics>> getCustomerStatistics(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(defaultValue = "1") Long minOrderCount,
            @PageableDefault(size = 20, sort = "totalAmount", direction = Sort.Direction.DESC)
            Pageable pageable) {
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        Page<OrderStatistics> statistics = statisticsRepository.findOrderStatistics(
            startDateTime, endDateTime, minOrderCount, pageable
        );
        
        return ResponseEntity.ok(statistics);
    }
}
```

## 測試實作

### 1. 單元測試

```java
package com.example.pagination.service;

import com.example.pagination.dto.PageResponse;
import com.example.pagination.dto.UserPageRequest;
import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import com.example.pagination.repository.UserRepository;
import com.example.pagination.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserServiceImpl userService;
    
    private List<User> testUsers;
    
    @BeforeEach
    public void setUp() {
        User user1 = new User("john", "john@example.com", "John", "Doe");
        User user2 = new User("jane", "jane@example.com", "Jane", "Smith");
        testUsers = Arrays.asList(user1, user2);
    }
    
    @Test
    public void testFindUsersWithoutFilters() {
        // Given
        UserPageRequest request = new UserPageRequest(0, 10);
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(testUsers, pageable, testUsers.size());
        
        when(userRepository.findAll(pageable)).thenReturn(page);
        
        // When
        PageResponse<User> result = userService.findUsers(request);
        
        // Then
        assertEquals(2, result.getContent().size());
        assertEquals(0, result.getPage());
        assertEquals(10, result.getSize());
        assertEquals(2, result.getTotalElements());
        
        verify(userRepository).findAll(pageable);
        verify(userRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }
    
    @Test
    public void testFindUsersWithFilters() {
        // Given
        UserPageRequest request = new UserPageRequest(0, 10);
        request.setUsername("john");
        request.setStatus(UserStatus.ACTIVE);
        
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(Arrays.asList(testUsers.get(0)), pageable, 1);
        
        when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        
        // When
        PageResponse<User> result = userService.findUsers(request);
        
        // Then
        assertEquals(1, result.getContent().size());
        assertEquals("john", result.getContent().get(0).getUsername());
        
        verify(userRepository).findAll(any(Specification.class), eq(pageable));
        verify(userRepository, never()).findAll(pageable);
    }
    
    @Test
    public void testSearchUsers() {
        // Given
        String keyword = "john";
        UserPageRequest request = new UserPageRequest(0, 10);
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(Arrays.asList(testUsers.get(0)), pageable, 1);
        
        when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        
        // When
        PageResponse<User> result = userService.searchUsers(keyword, request);
        
        // Then
        assertEquals(1, result.getContent().size());
        verify(userRepository).findAll(any(Specification.class), eq(pageable));
    }
}
```

### 2. 整合測試

```java
package com.example.pagination.integration;

import com.example.pagination.entity.User;
import com.example.pagination.entity.UserStatus;
import com.example.pagination.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
@Transactional
public class UserControllerIntegrationTest {
    
    @Autowired
    private WebApplicationContext webApplicationContext;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    private MockMvc mockMvc;
    
    @BeforeEach
    public void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        
        // 建立測試資料
        for (int i = 1; i <= 50; i++) {
            User user = new User("user" + i, "user" + i + "@example.com", "User", String.valueOf(i));
            user.setAge(20 + (i % 40));
            user.setCity(i % 2 == 0 ? "Taipei" : "Kaohsiung");
            user.setStatus(i % 3 == 0 ? UserStatus.INACTIVE : UserStatus.ACTIVE);
            userRepository.save(user);
        }
    }
    
    @Test
    public void testGetUsersWithDefaultPagination() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(50))
                .andExpected(jsonPath("$.totalPages").value(3));
    }
    
    @Test
    public void testGetUsersWithCustomPagination() throws Exception {
        mockMvc.perform(get("/api/users")
                        .param("page", "1")
                        .param("size", "10")
                        .param("sortBy", "username")
                        .param("sortDirection", "ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.content.length()").value(10));
    }
    
    @Test
    public void testGetUsersWithFilters() throws Exception {
        mockMvc.perform(get("/api/users")
                        .param("status", "ACTIVE")
                        .param("city", "Taipei")
                        .param("minAge", "25")
                        .param("maxAge", "35"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
    
    @Test
    public void testSearchUsers() throws Exception {
        mockMvc.perform(get("/api/users/search")
                        .param("keyword", "user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
```

## 常見問題與解決方案

### 1. 效能問題

```java
// 問題：大資料量分頁查詢緩慢
// 解決方案：使用覆蓋索引和遊標分頁

@Repository
public class OptimizedRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    /**
     * 使用遊標分頁避免 OFFSET 效能問題
     */
    public List<User> findUsersWithCursor(Long lastId, int limit) {
        return entityManager.createQuery(
            "SELECT u FROM User u WHERE u.id > :lastId ORDER BY u.id ASC", 
            User.class)
            .setParameter("lastId", lastId)
            .setMaxResults(limit)
            .getResultList();
    }
    
    /**
     * 分離計數查詢和資料查詢
     */
    public Page<User> findUsersOptimized(Specification<User> spec, Pageable pageable) {
        // 先查詢資料
        List<User> content = entityManager.createQuery(buildQuery(spec, pageable))
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();
        
        // 再查詢總數（可以快取）
        Long total = getCountFromCache(spec);
        
        return new PageImpl<>(content, pageable, total);
    }
}
```

### 2. 記憶體問題

```java
// 問題：大結果集導致記憶體溢出
// 解決方案：使用流式查詢和投影

@Service
public class StreamingService {
    
    /**
     * 流式處理大資料集
     */
    @Transactional(readOnly = true)
    public void processLargeDataset(Specification<User> spec) {
        try (Stream<User> stream = userRepository.streamBySpec(spec)) {
            stream.forEach(this::processUser);
        }
    }
    
    /**
     * 只查詢必要欄位
     */
    @Query("SELECT new com.example.dto.UserProjection(u.id, u.username, u.email) FROM User u")
    Page<UserProjection> findUserProjections(Pageable pageable);
}
```

### 3. 並發問題

```java
// 問題：分頁過程中資料變化導致重複或遺漏
// 解決方案：使用快照隔離或版本控制

@Service
public class ConsistentPaginationService {
    
    /**
     * 使用時間戳確保一致性
     */
    public Page<User> findUsersConsistently(UserPageRequest request, LocalDateTime snapshot) {
        Specification<User> spec = UserSpecification.withFilters(
            request.getUsername(),
            request.getEmail(),
            request.getStatus(),
            request.getMinAge(),
            request.getMaxAge(),
            request.getCity()
        ).and((root, query, cb) -> 
            cb.lessThanOrEqualTo(root.get("createdAt"), snapshot)
        );
        
        return userRepository.findAll(spec, request.toPageable());
    }
}
```

## 總結

### 核心優勢

1. **類型安全**：Criteria API 提供編譯時檢查
2. **動態查詢**：根據條件靈活構建查詢
3. **自動分頁**：自動處理分頁邏輯和計數
4. **效能優化**：支援索引、快取和查詢優化
5. **易於維護**：結構化的查詢構建方式

### 最佳實踐

1. **合理設定分頁大小**：避免過大的頁面大小
2. **建立適當索引**：為查詢條件和排序欄位建立索引
3. **使用投影查詢**：只查詢需要的欄位
4. **快取熱門查詢**：快取頻繁查詢的結果
5. **驗證輸入參數**：防止 SQL 注入和無效查詢
6. **監控查詢效能**：定期檢查慢查詢
7. **使用連接池**：合理配置資料庫連接池

### 常用模式速查

```java
// 基本分頁
PageRequest.of(page, size, Sort.by("fieldName").descending())

// Specification 組合
Specification.where(spec1).and(spec2).or(spec3)

// 動態條件
if (condition != null) {
    spec = spec.and(customSpec(condition));
}

// 自訂排序
Sort.by(Sort.Order.desc("field1"), Sort.Order.asc("field2"))

// 投影查詢
@Query("SELECT new dto.UserDto(u.id, u.name) FROM User u")
Page<UserDto> findUserDtos(Pageable pageable);
```

Spring Data JPA 的 Pageable 和 Specification 提供了強大而靈活的分頁查詢功能，正確使用能夠大幅提升應用程式的查詢效能和使用者體驗。記住：理解底層的 SQL 生成機制有助於寫出更高效的查詢代碼。

## 參考資料

- [Spring Data JPA 官方文檔](https://spring.io/projects/spring-data-jpa)
- [JPA Criteria API 規範](https://docs.oracle.com/javaee/7/tutorial/persistence-criteria.htm)
- [Spring Data Web Support](https://docs.spring.io/spring-data/commons/docs/current/reference/html/#core.web)
- [Hibernate Performance Guide](https://hibernate.org/orm/documentation/)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)