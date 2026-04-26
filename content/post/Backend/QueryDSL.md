---
title: "QueryDSL 完整實戰指南：類型安全的動態查詢解決方案"
author: Bill.Lin
date: 2021-08-08T13:07:45+08:00
draft: false
tags: ["QueryDSL", "JPA", "Spring Data", "Database", "Query Builder", "Type Safety", "Criteria API", "Dynamic Query", "Performance"]
Description: "深入解析 QueryDSL 動態查詢框架的完整使用方法，包含配置、查詢建構、效能優化與企業級應用實戰"
Categories: ["Backend"]
DisableComments: false
---

## 概述

QueryDSL 是一個強大的 Java 查詢框架，提供類型安全的 SQL 查詢建構功能。它通過代碼生成技術創建查詢類型，在編譯時期就能發現查詢錯誤，大幅提升開發效率和代碼質量。本文將深入介紹 QueryDSL 的各種用法和最佳實踐。

### 核心優勢

- **類型安全**：編譯時檢查，避免執行期錯誤
- **IDE 支援**：完整的自動完成和重構功能
- **統一 API**：支援 JPA、SQL、MongoDB 等多種數據源
- **動態查詢**：靈活的條件組合和查詢建構
- **效能優化**：生成高效的 SQL 查詢

### 支援的技術棧

1. **JPA/Hibernate**：最常用的 ORM 整合
2. **Spring Data JPA**：與 Spring 生態完美整合
3. **SQL 數據庫**：MySQL、PostgreSQL、Oracle 等
4. **NoSQL 數據庫**：MongoDB、Lucene 等

## 環境配置與設定

### 1. Maven 依賴配置

```xml
<properties>
    <querydsl.version>5.0.0</querydsl.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
</properties>

<dependencies>
    <!-- Spring Boot Starter Data JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- QueryDSL JPA -->
    <dependency>
        <groupId>com.querydsl</groupId>
        <artifactId>querydsl-jpa</artifactId>
        <version>${querydsl.version}</version>
        <classifier>jakarta</classifier>
    </dependency>
    
    <!-- QueryDSL APT (Annotation Processing Tool) -->
    <dependency>
        <groupId>com.querydsl</groupId>
        <artifactId>querydsl-apt</artifactId>
        <version>${querydsl.version}</version>
        <classifier>jakarta</classifier>
        <scope>provided</scope>
    </dependency>
    
    <!-- Database Driver -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>

<build>
    <plugins>
        <!-- Maven Compiler Plugin -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>
            <configuration>
                <source>17</source>
                <target>17</target>
                <annotationProcessorPaths>
                    <path>
                        <groupId>com.querydsl</groupId>
                        <artifactId>querydsl-apt</artifactId>
                        <version>${querydsl.version}</version>
                        <classifier>jakarta</classifier>
                    </path>
                    <path>
                        <groupId>jakarta.persistence</groupId>
                        <artifactId>jakarta.persistence-api</artifactId>
                        <version>3.1.0</version>
                    </path>
                    <path>
                        <groupId>jakarta.annotation</groupId>
                        <artifactId>jakarta.annotation-api</artifactId>
                        <version>2.1.1</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
        
        <!-- Generate Sources Plugin -->
        <plugin>
            <groupId>org.codehaus.mojo</groupId>
            <artifactId>build-helper-maven-plugin</artifactId>
            <version>3.4.0</version>
            <executions>
                <execution>
                    <phase>generate-sources</phase>
                    <goals>
                        <goal>add-source</goal>
                    </goals>
                    <configuration>
                        <sources>
                            <source>target/generated-sources/annotations</source>
                        </sources>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### 2. Gradle 配置

```gradle
plugins {
    id 'org.springframework.boot' version '3.1.0'
    id 'io.spring.dependency-management' version '1.1.0'
    id 'java'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    
    // QueryDSL
    implementation 'com.querydsl:querydsl-jpa:5.0.0:jakarta'
    annotationProcessor 'com.querydsl:querydsl-apt:5.0.0:jakarta'
    annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
    annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
    
    runtimeOnly 'mysql:mysql-connector-java'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

// QueryDSL 配置
def queryDslDir = "$buildDir/generated/querydsl"

querydsl {
    jpa = true
    querydslSourcesDir = queryDslDir
}

sourceSets {
    main.java.srcDir queryDslDir
}

configurations {
    querydsl.extendsFrom compileClasspath
}

compileQuerydsl {
    options.annotationProcessorPath = configurations.querydsl
}
```

### 3. Spring Boot 配置

```java
package com.example.querydsl.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QueryDSLConfig {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }
}
```

## 實體類定義與 Q 類生成

### 1. 實體類定義

```java
package com.example.querydsl.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_username", columnList = "username"),
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_department_id", columnList = "department_id"),
    @Index(name = "idx_status", columnList = "status")
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
    
    @Column(nullable = false)
    private Integer age;
    
    @Column(length = 20)
    private String phone;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;
    
    @Column(precision = 10, scale = 2)
    private Double salary;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<UserRole> userRoles;
    
    @OneToMany(mappedBy = "assignee", fetch = FetchType.LAZY)
    private Set<Project> assignedProjects;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // 建構子、getter、setter 和 toString 方法
    public User() {}
    
    public User(String username, String email, String firstName, String lastName, Integer age) {
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.age = age;
    }
    
    // 完整的 getter 和 setter 方法
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
    
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    
    public Double getSalary() { return salary; }
    public void setSalary(Double salary) { this.salary = salary; }
    
    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
    
    public Set<UserRole> getUserRoles() { return userRoles; }
    public void setUserRoles(Set<UserRole> userRoles) { this.userRoles = userRoles; }
    
    public Set<Project> getAssignedProjects() { return assignedProjects; }
    public void setAssignedProjects(Set<Project> assignedProjects) { this.assignedProjects = assignedProjects; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

// 枚舉類型
enum UserStatus {
    ACTIVE, INACTIVE, SUSPENDED, DELETED
}
```

### 2. 相關實體類

```java
// Department 實體
@Entity
@Table(name = "departments")
public class Department {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true, nullable = false, length = 100)
    private String name;
    
    @Column(length = 500)
    private String description;
    
    @Column(name = "budget", precision = 15, scale = 2)
    private Double budget;
    
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    private Set<User> employees;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    // 建構子、getter、setter 方法
    public Department() {}
    
    public Department(String name, String description, Double budget) {
        this.name = name;
        this.description = description;
        this.budget = budget;
    }
    
    // getter 和 setter 方法省略...
}

// Project 實體
@Entity
@Table(name = "projects")
public class Project {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(length = 1000)
    private String description;
    
    @Column(name = "start_date")
    private LocalDateTime startDate;
    
    @Column(name = "end_date")
    private LocalDateTime endDate;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNING;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
    
    // getter 和 setter 方法省略...
}

enum ProjectStatus {
    PLANNING, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
}

// UserRole 實體（多對多關聯表）
@Entity
@Table(name = "user_roles")
public class UserRole {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    
    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;
    
    // getter 和 setter 方法省略...
}

@Entity
@Table(name = "roles")
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(unique = true, nullable = false, length = 50)
    private String name;
    
    @Column(length = 200)
    private String description;
    
    @OneToMany(mappedBy = "role", fetch = FetchType.LAZY)
    private Set<UserRole> userRoles;
    
    // getter 和 setter 方法省略...
}
```

### 3. Q 類生成

執行以下命令生成 Q 類：

```bash
# Maven 項目
mvn clean compile

# Gradle 項目
./gradlew compileQuerydsl
```

生成的 Q 類將位於 `target/generated-sources/annotations` (Maven) 或 `build/generated/querydsl` (Gradle) 目錄中。

## 基礎查詢操作

### 1. Repository 介面定義

```java
package com.example.querydsl.repository;

import com.example.querydsl.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, QuerydslPredicateExecutor<User> {
    // 基本的 CRUD 操作由 JpaRepository 提供
    // QuerydslPredicateExecutor 提供 QueryDSL 查詢支援
}
```

### 2. Service 層實作

```java
package com.example.querydsl.service;

import com.example.querydsl.entity.*;
import com.example.querydsl.repository.UserRepository;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class UserService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    @Autowired
    private UserRepository userRepository;
    
    // Q 類實例
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    private final QProject qProject = QProject.project;
    private final QUserRole qUserRole = QUserRole.userRole;
    private final QRole qRole = QRole.role;
    
    /**
     * 基礎查詢：根據用戶名查找用戶
     */
    public Optional<User> findByUsername(String username) {
        User user = queryFactory.selectFrom(qUser)
                                .where(qUser.username.eq(username))
                                .fetchOne();
        return Optional.ofNullable(user);
    }
    
    /**
     * 條件查詢：根據多個條件查找用戶
     */
    public List<User> findUsersByConditions(String username, String email, 
                                          Integer minAge, Integer maxAge, 
                                          UserStatus status) {
        BooleanBuilder builder = new BooleanBuilder();
        
        if (username != null && !username.trim().isEmpty()) {
            builder.and(qUser.username.containsIgnoreCase(username));
        }
        
        if (email != null && !email.trim().isEmpty()) {
            builder.and(qUser.email.containsIgnoreCase(email));
        }
        
        if (minAge != null) {
            builder.and(qUser.age.goe(minAge));
        }
        
        if (maxAge != null) {
            builder.and(qUser.age.loe(maxAge));
        }
        
        if (status != null) {
            builder.and(qUser.status.eq(status));
        }
        
        return queryFactory.selectFrom(qUser)
                          .where(builder)
                          .orderBy(qUser.createdAt.desc())
                          .fetch();
    }
    
    /**
     * 分頁查詢：使用 Spring Data 的分頁支援
     */
    public Page<User> findUsersWithPagination(String keyword, UserStatus status, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            BooleanExpression keywordCondition = qUser.username.containsIgnoreCase(keyword)
                                                     .or(qUser.firstName.containsIgnoreCase(keyword))
                                                     .or(qUser.lastName.containsIgnoreCase(keyword))
                                                     .or(qUser.email.containsIgnoreCase(keyword));
            builder.and(keywordCondition);
        }
        
        if (status != null) {
            builder.and(qUser.status.eq(status));
        }
        
        return userRepository.findAll(builder, pageable);
    }
}
```

## 高級查詢功能

### 1. Join 查詢

```java
/**
 * Join 查詢範例
 */
@Service
@Transactional(readOnly = true)
public class AdvancedQueryService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    private final QProject qProject = QProject.project;
    private final QUserRole qUserRole = QUserRole.userRole;
    private final QRole qRole = QRole.role;
    
    /**
     * Inner Join：查詢用戶及其部門資訊
     */
    public List<User> findUsersWithDepartment() {
        return queryFactory.selectFrom(qUser)
                          .innerJoin(qUser.department, qDepartment).fetchJoin()
                          .where(qDepartment.name.isNotNull())
                          .orderBy(qDepartment.name.asc(), qUser.username.asc())
                          .fetch();
    }
    
    /**
     * Left Join：查詢所有用戶（包含沒有部門的用戶）
     */
    public List<User> findAllUsersWithOptionalDepartment() {
        return queryFactory.selectFrom(qUser)
                          .leftJoin(qUser.department, qDepartment).fetchJoin()
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 複雜 Join：查詢用戶、部門和專案資訊
     */
    public List<User> findUsersWithDepartmentAndProjects() {
        return queryFactory.selectFrom(qUser)
                          .leftJoin(qUser.department, qDepartment).fetchJoin()
                          .leftJoin(qUser.assignedProjects, qProject).fetchJoin()
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .orderBy(qDepartment.name.asc(), qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 條件 Join：根據部門預算查詢用戶
     */
    public List<User> findUsersByDepartmentBudget(Double minBudget) {
        return queryFactory.selectFrom(qUser)
                          .innerJoin(qUser.department, qDepartment)
                          .where(qDepartment.budget.goe(minBudget))
                          .orderBy(qDepartment.budget.desc(), qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 多層 Join：查詢用戶角色資訊
     */
    public List<User> findUsersWithRoles(String roleName) {
        return queryFactory.selectFrom(qUser)
                          .innerJoin(qUser.userRoles, qUserRole)
                          .innerJoin(qUserRole.role, qRole)
                          .where(qRole.name.eq(roleName))
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
}
```

### 2. 子查詢

```java
/**
 * 子查詢範例
 */
public class SubQueryService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    private final QProject qProject = QProject.project;
    
    /**
     * EXISTS 子查詢：查詢有專案的用戶
     */
    public List<User> findUsersWithProjects() {
        QProject subProject = new QProject("subProject");
        
        return queryFactory.selectFrom(qUser)
                          .where(JPAExpressions.selectOne()
                                              .from(subProject)
                                              .where(subProject.assignee.eq(qUser))
                                              .exists())
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * NOT EXISTS 子查詢：查詢沒有專案的用戶
     */
    public List<User> findUsersWithoutProjects() {
        QProject subProject = new QProject("subProject");
        
        return queryFactory.selectFrom(qUser)
                          .where(JPAExpressions.selectOne()
                                              .from(subProject)
                                              .where(subProject.assignee.eq(qUser))
                                              .notExists())
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * IN 子查詢：查詢特定部門的用戶
     */
    public List<User> findUsersByDepartmentNames(List<String> departmentNames) {
        QDepartment subDepartment = new QDepartment("subDepartment");
        
        return queryFactory.selectFrom(qUser)
                          .where(qUser.department.id.in(
                              JPAExpressions.select(subDepartment.id)
                                           .from(subDepartment)
                                           .where(subDepartment.name.in(departmentNames))
                          ))
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 比較子查詢：查詢薪資高於平均薪資的用戶
     */
    public List<User> findUsersWithAboveAverageSalary() {
        QUser subUser = new QUser("subUser");
        
        return queryFactory.selectFrom(qUser)
                          .where(qUser.salary.gt(
                              JPAExpressions.select(subUser.salary.avg())
                                           .from(subUser)
                                           .where(subUser.salary.isNotNull())
                          ))
                          .orderBy(qUser.salary.desc())
                          .fetch();
    }
    
    /**
     * 相關子查詢：查詢部門內薪資最高的用戶
     */
    public List<User> findTopSalaryUsersByDepartment() {
        QUser subUser = new QUser("subUser");
        
        return queryFactory.selectFrom(qUser)
                          .where(qUser.salary.eq(
                              JPAExpressions.select(subUser.salary.max())
                                           .from(subUser)
                                           .where(subUser.department.eq(qUser.department)
                                                  .and(subUser.salary.isNotNull()))
                          ))
                          .orderBy(qUser.department.name.asc(), qUser.username.asc())
                          .fetch();
    }
}
```

### 3. 聚合查詢

```java
/**
 * 聚合查詢範例
 */
public class AggregationService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    private final QProject qProject = QProject.project;
    
    /**
     * 基礎聚合：統計用戶數量
     */
    public Long countActiveUsers() {
        return queryFactory.select(qUser.count())
                          .from(qUser)
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .fetchOne();
    }
    
    /**
     * GROUP BY：按部門統計用戶數量
     */
    public List<DepartmentUserCount> countUsersByDepartment() {
        return queryFactory.select(Projections.constructor(DepartmentUserCount.class,
                                  qDepartment.id,
                                  qDepartment.name,
                                  qUser.count()))
                          .from(qUser)
                          .innerJoin(qUser.department, qDepartment)
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .groupBy(qDepartment.id, qDepartment.name)
                          .orderBy(qUser.count().desc())
                          .fetch();
    }
    
    /**
     * HAVING：查詢用戶數量大於指定數量的部門
     */
    public List<DepartmentUserCount> findDepartmentsWithMinUsers(Long minUserCount) {
        return queryFactory.select(Projections.constructor(DepartmentUserCount.class,
                                  qDepartment.id,
                                  qDepartment.name,
                                  qUser.count()))
                          .from(qUser)
                          .innerJoin(qUser.department, qDepartment)
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .groupBy(qDepartment.id, qDepartment.name)
                          .having(qUser.count().goe(minUserCount))
                          .orderBy(qUser.count().desc())
                          .fetch();
    }
    
    /**
     * 多欄位聚合：部門薪資統計
     */
    public List<DepartmentSalaryStats> calculateDepartmentSalaryStats() {
        return queryFactory.select(Projections.constructor(DepartmentSalaryStats.class,
                                  qDepartment.id,
                                  qDepartment.name,
                                  qUser.salary.sum(),
                                  qUser.salary.avg(),
                                  qUser.salary.min(),
                                  qUser.salary.max(),
                                  qUser.count()))
                          .from(qUser)
                          .innerJoin(qUser.department, qDepartment)
                          .where(qUser.status.eq(UserStatus.ACTIVE)
                                    .and(qUser.salary.isNotNull()))
                          .groupBy(qDepartment.id, qDepartment.name)
                          .orderBy(qUser.salary.avg().desc())
                          .fetch();
    }
    
    /**
     * 時間聚合：按月統計用戶註冊數量
     */
    public List<MonthlyUserRegistration> getUserRegistrationByMonth(int year) {
        return queryFactory.select(Projections.constructor(MonthlyUserRegistration.class,
                                  qUser.createdAt.month(),
                                  qUser.count()))
                          .from(qUser)
                          .where(qUser.createdAt.year().eq(year))
                          .groupBy(qUser.createdAt.month())
                          .orderBy(qUser.createdAt.month().asc())
                          .fetch();
    }
    
    // DTO 類別定義
    public static class DepartmentUserCount {
        private Long departmentId;
        private String departmentName;
        private Long userCount;
        
        public DepartmentUserCount(Long departmentId, String departmentName, Long userCount) {
            this.departmentId = departmentId;
            this.departmentName = departmentName;
            this.userCount = userCount;
        }
        
        // getter 和 setter 方法省略...
    }
    
    public static class DepartmentSalaryStats {
        private Long departmentId;
        private String departmentName;
        private Double totalSalary;
        private Double averageSalary;
        private Double minSalary;
        private Double maxSalary;
        private Long employeeCount;
        
        public DepartmentSalaryStats(Long departmentId, String departmentName,
                                   Double totalSalary, Double averageSalary,
                                   Double minSalary, Double maxSalary, Long employeeCount) {
            this.departmentId = departmentId;
            this.departmentName = departmentName;
            this.totalSalary = totalSalary;
            this.averageSalary = averageSalary;
            this.minSalary = minSalary;
            this.maxSalary = maxSalary;
            this.employeeCount = employeeCount;
        }
        
        // getter 和 setter 方法省略...
    }
    
    public static class MonthlyUserRegistration {
        private Integer month;
        private Long registrationCount;
        
        public MonthlyUserRegistration(Integer month, Long registrationCount) {
            this.month = month;
            this.registrationCount = registrationCount;
        }
        
        // getter 和 setter 方法省略...
    }
}
```

## 動態查詢建構

### 1. Predicate 建構器

```java
/**
 * 動態查詢建構器
 */
@Component
public class UserPredicateBuilder {
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    
    /**
     * 建構用戶查詢條件
     */
    public BooleanBuilder buildUserPredicate(UserSearchCriteria criteria) {
        BooleanBuilder builder = new BooleanBuilder();
        
        // 基本欄位條件
        addStringCondition(builder, qUser.username, criteria.getUsername(), StringMatchType.CONTAINS);
        addStringCondition(builder, qUser.email, criteria.getEmail(), StringMatchType.CONTAINS);
        addStringCondition(builder, qUser.firstName, criteria.getFirstName(), StringMatchType.CONTAINS);
        addStringCondition(builder, qUser.lastName, criteria.getLastName(), StringMatchType.CONTAINS);
        addStringCondition(builder, qUser.phone, criteria.getPhone(), StringMatchType.EXACT);
        
        // 數值範圍條件
        addRangeCondition(builder, qUser.age, criteria.getMinAge(), criteria.getMaxAge());
        addRangeCondition(builder, qUser.salary, criteria.getMinSalary(), criteria.getMaxSalary());
        
        // 枚舉條件
        addEnumCondition(builder, qUser.status, criteria.getStatuses());
        
        // 日期範圍條件
        addDateRangeCondition(builder, qUser.createdAt, criteria.getCreatedAfter(), criteria.getCreatedBefore());
        addDateRangeCondition(builder, qUser.updatedAt, criteria.getUpdatedAfter(), criteria.getUpdatedBefore());
        
        // 關聯條件
        addDepartmentConditions(builder, criteria);
        
        return builder;
    }
    
    /**
     * 字串條件處理
     */
    private void addStringCondition(BooleanBuilder builder, StringPath path, 
                                   String value, StringMatchType matchType) {
        if (value != null && !value.trim().isEmpty()) {
            switch (matchType) {
                case EXACT:
                    builder.and(path.eq(value));
                    break;
                case CONTAINS:
                    builder.and(path.containsIgnoreCase(value.trim()));
                    break;
                case STARTS_WITH:
                    builder.and(path.startsWithIgnoreCase(value.trim()));
                    break;
                case ENDS_WITH:
                    builder.and(path.endsWithIgnoreCase(value.trim()));
                    break;
            }
        }
    }
    
    /**
     * 數值範圍條件處理
     */
    private <T extends Number & Comparable<T>> void addRangeCondition(
            BooleanBuilder builder, NumberPath<T> path, T minValue, T maxValue) {
        
        if (minValue != null) {
            builder.and(path.goe(minValue));
        }
        
        if (maxValue != null) {
            builder.and(path.loe(maxValue));
        }
    }
    
    /**
     * 枚舉條件處理
     */
    private <T extends Enum<T>> void addEnumCondition(
            BooleanBuilder builder, EnumPath<T> path, List<T> values) {
        
        if (values != null && !values.isEmpty()) {
            builder.and(path.in(values));
        }
    }
    
    /**
     * 日期範圍條件處理
     */
    private void addDateRangeCondition(BooleanBuilder builder, DateTimePath<LocalDateTime> path,
                                     LocalDateTime after, LocalDateTime before) {
        
        if (after != null) {
            builder.and(path.goe(after));
        }
        
        if (before != null) {
            builder.and(path.loe(before));
        }
    }
    
    /**
     * 部門相關條件處理
     */
    private void addDepartmentConditions(BooleanBuilder builder, UserSearchCriteria criteria) {
        if (criteria.getDepartmentIds() != null && !criteria.getDepartmentIds().isEmpty()) {
            builder.and(qUser.department.id.in(criteria.getDepartmentIds()));
        }
        
        if (criteria.getDepartmentName() != null && !criteria.getDepartmentName().trim().isEmpty()) {
            builder.and(qUser.department.name.containsIgnoreCase(criteria.getDepartmentName().trim()));
        }
        
        if (criteria.getMinDepartmentBudget() != null) {
            builder.and(qUser.department.budget.goe(criteria.getMinDepartmentBudget()));
        }
        
        if (criteria.getMaxDepartmentBudget() != null) {
            builder.and(qUser.department.budget.loe(criteria.getMaxDepartmentBudget()));
        }
    }
    
    /**
     * 字串匹配類型枚舉
     */
    public enum StringMatchType {
        EXACT, CONTAINS, STARTS_WITH, ENDS_WITH
    }
}

/**
 * 用戶搜尋條件 DTO
 */
public class UserSearchCriteria {
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private Integer minAge;
    private Integer maxAge;
    private Double minSalary;
    private Double maxSalary;
    private List<UserStatus> statuses;
    private LocalDateTime createdAfter;
    private LocalDateTime createdBefore;
    private LocalDateTime updatedAfter;
    private LocalDateTime updatedBefore;
    private List<Long> departmentIds;
    private String departmentName;
    private Double minDepartmentBudget;
    private Double maxDepartmentBudget;
    
    // 建構子、getter 和 setter 方法省略...
}
```

### 2. 查詢規格建構器

```java
/**
 * 查詢規格建構器
 */
@Component
public class QuerySpecificationBuilder {
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    private final QProject qProject = QProject.project;
    
    /**
     * 建構複雜查詢規格
     */
    public JPAQuery<User> buildComplexUserQuery(JPAQueryFactory queryFactory, 
                                              ComplexSearchCriteria criteria) {
        
        JPAQuery<User> query = queryFactory.selectFrom(qUser);
        
        // 添加 Join
        addJoins(query, criteria);
        
        // 添加 Where 條件
        addWhereConditions(query, criteria);
        
        // 添加排序
        addOrderBy(query, criteria);
        
        return query;
    }
    
    /**
     * 添加 Join 條件
     */
    private void addJoins(JPAQuery<User> query, ComplexSearchCriteria criteria) {
        if (criteria.isIncludeDepartment() || criteria.hasDepartmentConditions()) {
            query.leftJoin(qUser.department, qDepartment);
            
            if (criteria.isFetchDepartment()) {
                query.fetchJoin();
            }
        }
        
        if (criteria.isIncludeProjects() || criteria.hasProjectConditions()) {
            query.leftJoin(qUser.assignedProjects, qProject);
            
            if (criteria.isFetchProjects()) {
                query.fetchJoin();
            }
        }
    }
    
    /**
     * 添加 Where 條件
     */
    private void addWhereConditions(JPAQuery<User> query, ComplexSearchCriteria criteria) {
        BooleanBuilder builder = new BooleanBuilder();
        
        // 用戶基本條件
        addUserConditions(builder, criteria);
        
        // 部門條件
        addDepartmentConditions(builder, criteria);
        
        // 專案條件
        addProjectConditions(builder, criteria);
        
        // 自訂條件
        addCustomConditions(builder, criteria);
        
        if (builder.hasValue()) {
            query.where(builder);
        }
    }
    
    /**
     * 添加排序條件
     */
    private void addOrderBy(JPAQuery<User> query, ComplexSearchCriteria criteria) {
        List<OrderSpecifier<?>> orderSpecifiers = new ArrayList<>();
        
        if (criteria.getSortFields() != null && !criteria.getSortFields().isEmpty()) {
            for (SortField sortField : criteria.getSortFields()) {
                OrderSpecifier<?> orderSpecifier = createOrderSpecifier(sortField);
                if (orderSpecifier != null) {
                    orderSpecifiers.add(orderSpecifier);
                }
            }
        }
        
        // 預設排序
        if (orderSpecifiers.isEmpty()) {
            orderSpecifiers.add(qUser.createdAt.desc());
        }
        
        query.orderBy(orderSpecifiers.toArray(new OrderSpecifier[0]));
    }
    
    /**
     * 創建排序規格
     */
    private OrderSpecifier<?> createOrderSpecifier(SortField sortField) {
        boolean isAsc = sortField.getDirection() == SortDirection.ASC;
        
        switch (sortField.getField()) {
            case "username":
                return isAsc ? qUser.username.asc() : qUser.username.desc();
            case "email":
                return isAsc ? qUser.email.asc() : qUser.email.desc();
            case "age":
                return isAsc ? qUser.age.asc() : qUser.age.desc();
            case "salary":
                return isAsc ? qUser.salary.asc() : qUser.salary.desc();
            case "createdAt":
                return isAsc ? qUser.createdAt.asc() : qUser.createdAt.desc();
            case "departmentName":
                return isAsc ? qDepartment.name.asc() : qDepartment.name.desc();
            default:
                return null;
        }
    }
    
    // 輔助方法省略...
}
```

## 更新和刪除操作

### 1. 批量更新

```java
/**
 * 更新和刪除操作服務
 */
@Service
@Transactional
public class UserUpdateService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    
    /**
     * 批量更新用戶狀態
     */
    public long updateUserStatus(List<Long> userIds, UserStatus newStatus) {
        return queryFactory.update(qUser)
                          .set(qUser.status, newStatus)
                          .set(qUser.updatedAt, LocalDateTime.now())
                          .where(qUser.id.in(userIds))
                          .execute();
    }
    
    /**
     * 批量更新用戶薪資
     */
    public long updateSalaryByDepartment(Long departmentId, Double salaryIncrease) {
        return queryFactory.update(qUser)
                          .set(qUser.salary, qUser.salary.add(salaryIncrease))
                          .set(qUser.updatedAt, LocalDateTime.now())
                          .where(qUser.department.id.eq(departmentId)
                                    .and(qUser.status.eq(UserStatus.ACTIVE))
                                    .and(qUser.salary.isNotNull()))
                          .execute();
    }
    
    /**
     * 條件式更新：根據年齡調整薪資
     */
    public long adjustSalaryByAge() {
        // 為年齡大於 30 的員工增加 10% 薪資
        return queryFactory.update(qUser)
                          .set(qUser.salary, qUser.salary.multiply(1.1))
                          .set(qUser.updatedAt, LocalDateTime.now())
                          .where(qUser.age.gt(30)
                                    .and(qUser.status.eq(UserStatus.ACTIVE))
                                    .and(qUser.salary.isNotNull()))
                          .execute();
    }
    
    /**
     * Join 更新：根據部門預算更新員工狀態
     */
    public long updateStatusByDepartmentBudget(Double minBudget, UserStatus newStatus) {
        return queryFactory.update(qUser)
                          .set(qUser.status, newStatus)
                          .set(qUser.updatedAt, LocalDateTime.now())
                          .where(qUser.department.budget.lt(minBudget))
                          .execute();
    }
}
```

### 2. 批量刪除

```java
/**
 * 刪除操作服務
 */
@Service
@Transactional
public class UserDeleteService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    
    /**
     * 軟刪除：標記為已刪除狀態
     */
    public long softDeleteUsers(List<Long> userIds) {
        return queryFactory.update(qUser)
                          .set(qUser.status, UserStatus.DELETED)
                          .set(qUser.updatedAt, LocalDateTime.now())
                          .where(qUser.id.in(userIds))
                          .execute();
    }
    
    /**
     * 硬刪除：物理刪除記錄
     */
    public long hardDeleteInactiveUsers(LocalDateTime before) {
        return queryFactory.delete(qUser)
                          .where(qUser.status.eq(UserStatus.DELETED)
                                    .and(qUser.updatedAt.before(before)))
                          .execute();
    }
    
    /**
     * 條件刪除：刪除特定條件的用戶
     */
    public long deleteUsersByCondition(UserStatus status, Integer maxAge) {
        BooleanBuilder builder = new BooleanBuilder();
        
        if (status != null) {
            builder.and(qUser.status.eq(status));
        }
        
        if (maxAge != null) {
            builder.and(qUser.age.loe(maxAge));
        }
        
        return queryFactory.delete(qUser)
                          .where(builder)
                          .execute();
    }
    
    /**
     * 清理孤立記錄：刪除沒有部門的用戶
     */
    public long deleteUsersWithoutDepartment() {
        return queryFactory.delete(qUser)
                          .where(qUser.department.isNull()
                                    .and(qUser.status.eq(UserStatus.INACTIVE)))
                          .execute();
    }
}
```

## 效能優化技巧

### 1. 查詢優化

```java
/**
 * 效能優化服務
 */
@Service
@Transactional(readOnly = true)
public class QueryOptimizationService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    
    /**
     * 使用投影減少資料傳輸
     */
    public List<UserSummaryDTO> getUserSummaries() {
        return queryFactory.select(Projections.constructor(UserSummaryDTO.class,
                                  qUser.id,
                                  qUser.username,
                                  qUser.email,
                                  qUser.status,
                                  qDepartment.name))
                          .from(qUser)
                          .leftJoin(qUser.department, qDepartment)
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 使用 Fetch Join 避免 N+1 問題
     */
    public List<User> getUsersWithDepartmentOptimized() {
        return queryFactory.selectFrom(qUser)
                          .leftJoin(qUser.department, qDepartment).fetchJoin()
                          .where(qUser.status.eq(UserStatus.ACTIVE))
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 分頁查詢優化
     */
    public Page<User> getUsersWithOptimizedPaging(Pageable pageable) {
        // 先查詢總數
        Long total = queryFactory.select(qUser.count())
                                 .from(qUser)
                                 .where(qUser.status.eq(UserStatus.ACTIVE))
                                 .fetchOne();
        
        // 如果總數為 0，直接返回空頁面
        if (total == 0) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }
        
        // 查詢分頁資料
        List<User> users = queryFactory.selectFrom(qUser)
                                      .where(qUser.status.eq(UserStatus.ACTIVE))
                                      .orderBy(qUser.username.asc())
                                      .offset(pageable.getOffset())
                                      .limit(pageable.getPageSize())
                                      .fetch();
        
        return new PageImpl<>(users, pageable, total);
    }
    
    /**
     * 使用索引提示優化查詢
     */
    public List<User> findUsersByIndexedFields(String username, String email) {
        BooleanBuilder builder = new BooleanBuilder();
        
        // 優先使用有索引的欄位
        if (username != null && !username.trim().isEmpty()) {
            builder.and(qUser.username.eq(username)); // username 有唯一索引
        } else if (email != null && !email.trim().isEmpty()) {
            builder.and(qUser.email.eq(email)); // email 有唯一索引
        }
        
        return queryFactory.selectFrom(qUser)
                          .where(builder)
                          .fetch();
    }
    
    /**
     * 批量查詢優化
     */
    public Map<Long, User> getUsersByIdsOptimized(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        
        List<User> users = queryFactory.selectFrom(qUser)
                                      .where(qUser.id.in(userIds))
                                      .fetch();
        
        return users.stream()
                   .collect(Collectors.toMap(User::getId, Function.identity()));
    }
}

/**
 * 用戶摘要 DTO
 */
public class UserSummaryDTO {
    private Long id;
    private String username;
    private String email;
    private UserStatus status;
    private String departmentName;
    
    public UserSummaryDTO(Long id, String username, String email, 
                         UserStatus status, String departmentName) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.status = status;
        this.departmentName = departmentName;
    }
    
    // getter 和 setter 方法省略...
}
```

### 2. 快取策略

```java
/**
 * 快取優化服務
 */
@Service
@Transactional(readOnly = true)
public class CachedQueryService {
    
    @Autowired
    private JPAQueryFactory queryFactory;
    
    @Autowired
    private CacheManager cacheManager;
    
    private final QUser qUser = QUser.user;
    private final QDepartment qDepartment = QDepartment.department;
    
    /**
     * 快取用戶基本資訊
     */
    @Cacheable(value = "userCache", key = "#userId")
    public Optional<User> getCachedUser(Long userId) {
        User user = queryFactory.selectFrom(qUser)
                                .where(qUser.id.eq(userId))
                                .fetchOne();
        return Optional.ofNullable(user);
    }
    
    /**
     * 快取部門用戶列表
     */
    @Cacheable(value = "departmentUsersCache", key = "#departmentId")
    public List<User> getCachedDepartmentUsers(Long departmentId) {
        return queryFactory.selectFrom(qUser)
                          .where(qUser.department.id.eq(departmentId)
                                    .and(qUser.status.eq(UserStatus.ACTIVE)))
                          .orderBy(qUser.username.asc())
                          .fetch();
    }
    
    /**
     * 快取用戶統計資訊
     */
    @Cacheable(value = "userStatsCache", key = "'userStats'")
    public UserStatistics getCachedUserStatistics() {
        Long totalUsers = queryFactory.select(qUser.count())
                                     .from(qUser)
                                     .fetchOne();
        
        Long activeUsers = queryFactory.select(qUser.count())
                                      .from(qUser)
                                      .where(qUser.status.eq(UserStatus.ACTIVE))
                                      .fetchOne();
        
        Double averageSalary = queryFactory.select(qUser.salary.avg())
                                          .from(qUser)
                                          .where(qUser.salary.isNotNull()
                                                    .and(qUser.status.eq(UserStatus.ACTIVE)))
                                          .fetchOne();
        
        return new UserStatistics(totalUsers, activeUsers, averageSalary);
    }
    
    /**
     * 更新時清除快取
     */
    @CacheEvict(value = {"userCache", "departmentUsersCache", "userStatsCache"}, allEntries = true)
    public void evictAllCaches() {
        // 清除所有相關快取
    }
    
    /**
     * 清除特定用戶快取
     */
    @CacheEvict(value = "userCache", key = "#userId")
    public void evictUserCache(Long userId) {
        // 清除特定用戶快取
    }
}
```

## 測試策略

### 1. 單元測試

```java
/**
 * QueryDSL 單元測試
 */
@DataJpaTest
@TestPropertySource(locations = "classpath:application-test.properties")
class QueryDSLServiceTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    private JPAQueryFactory queryFactory;
    private UserService userService;
    
    @BeforeEach
    void setUp() {
        queryFactory = new JPAQueryFactory(entityManager.getEntityManager());
        userService = new UserService();
        ReflectionTestUtils.setField(userService, "queryFactory", queryFactory);
        ReflectionTestUtils.setField(userService, "userRepository", userRepository);
    }
    
    @Test
    @DisplayName("根據用戶名查找用戶")
    void testFindByUsername() {
        // Given
        User user = new User("testuser", "test@example.com", "Test", "User", 25);
        user.setStatus(UserStatus.ACTIVE);
        entityManager.persistAndFlush(user);
        
        // When
        Optional<User> result = userService.findByUsername("testuser");
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("testuser");
        assertThat(result.get().getEmail()).isEqualTo("test@example.com");
    }
    
    @Test
    @DisplayName("多條件查詢用戶")
    void testFindUsersByConditions() {
        // Given
        Department department = new Department("IT", "Information Technology", 100000.0);
        entityManager.persistAndFlush(department);
        
        User user1 = new User("john", "john@example.com", "John", "Doe", 30);
        user1.setStatus(UserStatus.ACTIVE);
        user1.setDepartment(department);
        
        User user2 = new User("jane", "jane@example.com", "Jane", "Smith", 25);
        user2.setStatus(UserStatus.INACTIVE);
        user2.setDepartment(department);
        
        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);
        
        // When
        List<User> activeUsers = userService.findUsersByConditions(
            null, null, 20, 35, UserStatus.ACTIVE);
        
        // Then
        assertThat(activeUsers).hasSize(1);
        assertThat(activeUsers.get(0).getUsername()).isEqualTo("john");
    }
    
    @Test
    @DisplayName("測試 Join 查詢")
    void testJoinQuery() {
        // Given
        Department department = new Department("HR", "Human Resources", 80000.0);
        entityManager.persistAndFlush(department);
        
        User user = new User("hr_user", "hr@example.com", "HR", "Manager", 35);
        user.setStatus(UserStatus.ACTIVE);
        user.setDepartment(department);
        entityManager.persistAndFlush(user);
        
        // When
        QUser qUser = QUser.user;
        QDepartment qDepartment = QDepartment.department;
        
        List<User> users = queryFactory.selectFrom(qUser)
                                      .innerJoin(qUser.department, qDepartment).fetchJoin()
                                      .where(qDepartment.name.eq("HR"))
                                      .fetch();
        
        // Then
        assertThat(users).hasSize(1);
        assertThat(users.get(0).getDepartment().getName()).isEqualTo("HR");
    }
    
    @Test
    @DisplayName("測試聚合查詢")
    void testAggregationQuery() {
        // Given
        Department department = new Department("Sales", "Sales Department", 120000.0);
        entityManager.persistAndFlush(department);
        
        User user1 = new User("sales1", "sales1@example.com", "Sales", "Rep1", 28);
        user1.setStatus(UserStatus.ACTIVE);
        user1.setDepartment(department);
        user1.setSalary(50000.0);
        
        User user2 = new User("sales2", "sales2@example.com", "Sales", "Rep2", 32);
        user2.setStatus(UserStatus.ACTIVE);
        user2.setDepartment(department);
        user2.setSalary(60000.0);
        
        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);
        
        // When
        QUser qUser = QUser.user;
        QDepartment qDepartment = QDepartment.department;
        
        Tuple result = queryFactory.select(
                                      qDepartment.name,
                                      qUser.count(),
                                      qUser.salary.avg())
                                  .from(qUser)
                                  .innerJoin(qUser.department, qDepartment)
                                  .where(qDepartment.name.eq("Sales"))
                                  .groupBy(qDepartment.name)
                                  .fetchOne();
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.get(qDepartment.name)).isEqualTo("Sales");
        assertThat(result.get(qUser.count())).isEqualTo(2L);
        assertThat(result.get(qUser.salary.avg())).isEqualTo(55000.0);
    }
}
```

### 2. 整合測試

```java
/**
 * QueryDSL 整合測試
 */
@SpringBootTest
@Transactional
@TestPropertySource(locations = "classpath:application-integration-test.properties")
class QueryDSLIntegrationTest {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    @Test
    @DisplayName("完整的用戶管理流程測試")
    void testCompleteUserManagementFlow() {
        // 1. 創建部門
        Department department = new Department("Engineering", "Software Engineering", 200000.0);
        department = departmentRepository.save(department);
        
        // 2. 創建用戶
        User user1 = new User("engineer1", "eng1@example.com", "John", "Engineer", 30);
        user1.setStatus(UserStatus.ACTIVE);
        user1.setSalary(80000.0);
        user1.setDepartment(department);
        
        User user2 = new User("engineer2", "eng2@example.com", "Jane", "Developer", 28);
        user2.setStatus(UserStatus.ACTIVE);
        user2.setSalary(75000.0);
        user2.setDepartment(department);
        
        userRepository.saveAll(Arrays.asList(user1, user2));
        
        // 3. 測試查詢
        List<User> engineers = userService.findUsersByConditions(
            null, null, 25, 35, UserStatus.ACTIVE);
        
        assertThat(engineers).hasSize(2);
        
        // 4. 測試更新
        UserUpdateService updateService = new UserUpdateService();
        // 設定 queryFactory...
        
        long updatedCount = updateService.updateSalaryByDepartment(
            department.getId(), 5000.0);
        
        assertThat(updatedCount).isEqualTo(2);
        
        // 5. 驗證更新結果
        List<User> updatedUsers = userRepository.findAll();
        assertThat(updatedUsers.stream()
                              .mapToDouble(User::getSalary)
                              .average()
                              .orElse(0.0))
            .isEqualTo(82500.0); // (85000 + 80000) / 2
    }
}
```

## 最佳實踐與建議

### 1. 查詢優化建議

```java
/**
 * QueryDSL 最佳實踐指南
 */
@Component
public class QueryDSLBestPractices {
    
    /**
     * 1. 使用適當的 Fetch 策略
     */
    public void demonstrateFetchStrategies() {
        // ✅ 推薦：使用 fetchJoin 避免 N+1 問題
        List<User> usersWithDepartment = queryFactory.selectFrom(qUser)
                                                     .leftJoin(qUser.department, qDepartment).fetchJoin()
                                                     .fetch();
        
        // ❌ 避免：不使用 fetchJoin 會導致 N+1 問題
        List<User> users = queryFactory.selectFrom(qUser).fetch();
        // 後續存取 user.getDepartment() 會觸發額外查詢
    }
    
    /**
     * 2. 使用投影減少記憶體使用
     */
    public void demonstrateProjections() {
        // ✅ 推薦：只選擇需要的欄位
        List<UserSummaryDTO> summaries = queryFactory
            .select(Projections.constructor(UserSummaryDTO.class,
                qUser.id, qUser.username, qUser.email))
            .from(qUser)
            .fetch();
        
        // ❌ 避免：選擇整個實體但只使用部分欄位
        List<User> allUsers = queryFactory.selectFrom(qUser).fetch();
    }
    
    /**
     * 3. 合理使用索引
     */
    public void demonstrateIndexUsage() {
        // ✅ 推薦：查詢條件使用有索引的欄位
        List<User> usersByUsername = queryFactory.selectFrom(qUser)
                                                 .where(qUser.username.eq("john")) // username 有索引
                                                 .fetch();
        
        // ❌ 避免：在沒有索引的欄位上使用 LIKE 查詢
        List<User> usersByDescription = queryFactory.selectFrom(qUser)
                                                    .where(qUser.email.contains("@gmail")) // 可能效能較差
                                                    .fetch();
    }
    
    /**
     * 4. 批量操作優化
     */
    public void demonstrateBatchOperations() {
        // ✅ 推薦：使用批量更新
        long updated = queryFactory.update(qUser)
                                   .set(qUser.status, UserStatus.ACTIVE)
                                   .where(qUser.id.in(Arrays.asList(1L, 2L, 3L)))
                                   .execute();
        
        // ❌ 避免：迴圈中進行單個更新
        for (Long id : Arrays.asList(1L, 2L, 3L)) {
            queryFactory.update(qUser)
                        .set(qUser.status, UserStatus.ACTIVE)
                        .where(qUser.id.eq(id))
                        .execute(); // 多次資料庫往返
        }
    }
    
    /**
     * 5. 分頁查詢優化
     */
    public void demonstratePaginationOptimization() {
        // ✅ 推薦：先查總數，再查分頁資料
        Long total = queryFactory.select(qUser.count())
                                 .from(qUser)
                                 .where(qUser.status.eq(UserStatus.ACTIVE))
                                 .fetchOne();
        
        if (total > 0) {
            List<User> users = queryFactory.selectFrom(qUser)
                                          .where(qUser.status.eq(UserStatus.ACTIVE))
                                          .offset(0)
                                          .limit(20)
                                          .fetch();
        }
        
        // ❌ 避免：使用複雜的子查詢進行分頁
    }
}
```

### 2. 錯誤處理與除錯

```java
/**
 * QueryDSL 錯誤處理指南
 */
@Component
public class QueryDSLErrorHandling {
    
    private static final Logger logger = LoggerFactory.getLogger(QueryDSLErrorHandling.class);
    
    /**
     * 安全的查詢執行
     */
    public Optional<User> safeQueryExecution(Long userId) {
        try {
            User user = queryFactory.selectFrom(qUser)
                                   .where(qUser.id.eq(userId))
                                   .fetchOne();
            return Optional.ofNullable(user);
        } catch (DataAccessException e) {
            logger.error("Database error while fetching user with id: {}", userId, e);
            return Optional.empty();
        } catch (Exception e) {
            logger.error("Unexpected error while fetching user with id: {}", userId, e);
            throw new ServiceException("Failed to fetch user", e);
        }
    }
    
    /**
     * 查詢除錯輔助方法
     */
    public void debugQuery() {
        // 開啟 SQL 日誌記錄
        JPAQuery<User> query = queryFactory.selectFrom(qUser)
                                          .where(qUser.status.eq(UserStatus.ACTIVE));
        
        // 印出生成的 SQL
        logger.debug("Generated SQL: {}", query.toString());
        
        // 執行查詢
        List<User> results = query.fetch();
        logger.debug("Query returned {} results", results.size());
    }
    
    /**
     * 驗證查詢參數
     */
    public List<User> validateAndQuery(UserSearchCriteria criteria) {
        // 參數驗證
        if (criteria == null) {
            throw new IllegalArgumentException("Search criteria cannot be null");
        }
        
        BooleanBuilder builder = new BooleanBuilder();
        
        // 安全的字串處理
        if (criteria.getUsername() != null) {
            String cleanUsername = criteria.getUsername().trim();
            if (!cleanUsername.isEmpty()) {
                builder.and(qUser.username.containsIgnoreCase(cleanUsername));
            }
        }
        
        // 數值範圍驗證
        if (criteria.getMinAge() != null && criteria.getMaxAge() != null) {
            if (criteria.getMinAge() > criteria.getMaxAge()) {
                throw new IllegalArgumentException("Min age cannot be greater than max age");
            }
        }
        
        return queryFactory.selectFrom(qUser)
                          .where(builder)
                          .fetch();
    }
}
```

## 總結

QueryDSL 是一個功能強大的類型安全查詢框架，為 Java 開發者提供了高效的動態查詢解決方案：

### 主要優勢

1. **類型安全**：編譯時檢查，減少執行期錯誤
2. **IDE 友好**：完整的自動完成和重構支援
3. **統一 API**：支援多種資料源的一致查詢介面
4. **效能優化**：生成高效的 SQL 查詢語句
5. **動態查詢**：靈活的條件組合和查詢建構

### 適用場景

- **複雜動態查詢**：多條件組合查詢
- **報表系統**：複雜的聚合和統計查詢
- **搜尋功能**：靈活的搜尋條件組合
- **資料分析**：大量的資料處理和分析
- **API 開發**：RESTful API 的查詢參數處理

### 最佳實踐要點

1. **效能優化**：合理使用 Fetch Join 和投影
2. **索引利用**：查詢條件對應適當的資料庫索引
3. **批量操作**：使用批量更新和刪除操作
4. **錯誤處理**：完善的異常處理和日誌記錄
5. **測試覆蓋**：充分的單元測試和整合測試

通過掌握 QueryDSL 的使用技巧和最佳實踐，可以大幅提升 Java 應用程式的查詢效率和開發體驗，建構出高效能、可維護的資料存取層。

## 踩坑紀錄

### APT（Annotation Processing）Q-class 生成
IntelliJ 需到 `Build → Compiler → Annotation Processors` 啟用 APT。Gradle 需加：
```groovy
annotationProcessor "com.querydsl:querydsl-apt:${queryDslVersion}:jpa"
annotationProcessor "jakarta.persistence:jakarta.persistence-api"
```
每次 Entity 變更需重新執行 `compileJava` 才能更新 Q-class。

### 維護狀態
QueryDSL 5.x 更新非常緩慢（最後活躍 2021）。若遇到 Hibernate 6 / Spring Boot 3 整合問題，可評估以下替代品：

## 版本變遷

| 版本 | 變更 |
|------|------|
| QueryDSL 4.x | 支援 `javax.persistence` |
| QueryDSL 5.x | 遷移至 `jakarta.persistence`，Spring Boot 3 需要此版 |

## 替代方案比較

| 方案 | 適用 | 特點 |
|------|------|------|
| QueryDSL | 複雜動態查詢 | 最成熟但維護放緩 |
| Spring Data `Specification` | 中等複雜度 | 無程式碼生成，內建支援 |
| jOOQ | 複雜 SQL + 型別安全 | SQL-first，非 ORM |
| Blaze-Persistence | 視窗函數、CTE | QueryDSL 相容，功能更強 |