---
title: "QueryDSL"
author: Bill.Lin
date: 2021-08-08T13:07:45+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring","QueryDSL"]
DisableComments: false
---

### Maven integration

```xml
    <dependency>
    <groupId>com.querydsl</groupId>
    <artifactId>querydsl-apt</artifactId>
    <version>${querydsl.version}</version>  <!-- //可不寫，由 spring 自動判斷 --> 
    <scope>provided</scope>
    </dependency>

    <dependency>
    <groupId>com.querydsl</groupId>
    <artifactId>querydsl-jpa</artifactId>
    <version>${querydsl.version}</version>   <!-- //可不寫，由 spring 自動判斷 --> 
    </dependency>


    <!-- 會在 target/generated-sources/kotlin 生成 @Entity 的 Q類別 -->
    <project>
        <build>
            <plugins>
                ...
                <plugin>
                <groupId>com.mysema.maven</groupId>
                <artifactId>apt-maven-plugin</artifactId>
                <version>1.1.3</version>
                <executions>
                    <execution>
                    <goals>
                        <goal>process</goal>
                    </goals>
                    <configuration>
                        <outputDirectory>target/generated-sources/kotlin</outputDirectory>
                        <processor>com.querydsl.apt.jpa.JPAAnnotationProcessor</processor>
                    </configuration>
                    </execution>
                </executions>
                </plugin>
                ...
            </plugins>
        </build>
    </project>


```


### 產生 Q 類

```
    mvn clean compile
```

## 使用

### select

```kotlin 

    @Autowired
    lateinit var queryFactory: JPAQueryFactory

    val qadmin: QAdmin.admin

    bill = queryFactory.selectFrom(qadmin)
    .where(qadmin.account.eq("Bill"))
    .and(qadmin.password.ed("password"))
    .fetchOne();

```

### join

===== 以下 官網 java 範例 =====

```java

    @Autowired
    private JPAQueryFactory queryFactory;

    QCat cat = QCat.cat;
    QCat mate = new QCat("mate");
    QCat kitten = new QCat("kitten");
    queryFactory.selectFrom(cat)
        .innerJoin(cat.mate, mate)
        .leftJoin(cat.kittens, kitten)
        .fetch();


    queryFactory.selectFrom(cat)
    .leftJoin(cat.kittens, kitten)
    .on(kitten.bodyWeight.gt(10.0))
    .fetch();

```

### update

```java
    QCustomer customer = QCustomer.customer;
    // rename customers named Bob to Bobby
    queryFactory.update(customer).where(customer.name.eq("Bob"))
        .set(customer.name, "Bobby")
        .execute();
```

### delete

```java
    QCustomer customer = QCustomer.customer;
    // delete all customers
    queryFactory.delete(customer).execute();
    // delete all customers with a level less than 3
    queryFactory.delete(customer).where(customer.level.lt(3)).execute();
```

### 子查詢

```java
    QDepartment department = QDepartment.department;
    QDepartment d = new QDepartment("d");
    queryFactory.selectFrom(department)
        .where(department.size.eq(JPAExpressions.select(d.size.max()).from(d)))
        .fetch();



     //----------

    QEmployee employee = QEmployee.employee;
    QEmployee e = new QEmployee("e");
    queryFactory.selectFrom(employee)
        .where(employee.weeklyhours.gt(
            JPAExpressions.select(e.weeklyhours.avg())
                .from(employee.department.employees, e)
                .where(e.manager.eq(employee.manager))))
        .fetch();
```

### order by

```java
    QCustomer customer = QCustomer.customer;
    queryFactory.selectFrom(customer)
        .orderBy(customer.lastName.asc(), customer.firstName.desc())
        .fetch();

```

### group by

```java
    QCustomer customer = QCustomer.customer;
    queryFactory.select(customer.lastName).from(customer)
        .groupBy(customer.lastName)
        .fetch();
```



Reference : <br>
<a href="https://querydsl.com/static/querydsl/latest/reference/html/ch02.html#jpa_integration">官網範例 請點我!</a>


