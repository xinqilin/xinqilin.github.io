---
title: "Side Project 專案配置最佳實踐：開發環境設定與部署流程"
author: Bill.Lin
date: 2020-01-01T20:31:25+08:00
draft: false
tags: ["Project Setup", "Configuration", "Development", "Best Practices", "Spring Boot"]
Description: "分享 Side Project 開發的完整配置指南，包含開發環境設定、專案結構規劃與部署最佳實踐"
Categories: ["Backend"]
DisableComments: false
---

# Side Project 常用功能，紀錄，方便以後快速 setup 環境

### DI

```xml

    <!--  Lombok-->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!--    Test Swagger with GraphQL -->
    <dependency>
        <groupId>io.springfox</groupId>
        <artifactId>springfox-swagger2</artifactId>
        <version>2.9.2</version>
    </dependency>

    <dependency>
        <groupId>io.springfox</groupId>
        <artifactId>springfox-swagger-ui</artifactId>
        <version>2.9.2</version>
    </dependency>

    <!--        StringUtil-->
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <version>3.11</version>
    </dependency>

    <!--        Validate-->
    <dependency>
        <groupId>javax.validation</groupId>
        <artifactId>validation-api</artifactId>
        <version>2.0.1.Final</version>
    </dependency>

        <!-- JSON -->
    <dependency>
			<groupId>com.fasterxml.jackson.core</groupId>
			<artifactId>jackson-core</artifactId>
			<version>2.9.8</version>
		</dependency>

    <dependency>
			<groupId>com.fasterxml.jackson.core</groupId>
			<artifactId>jackson-databind</artifactId>
			<version>2.10.0</version>
		</dependency>

    <!-- logstash -->
    <dependency>
        <groupId>net.logstash.logback</groupId>
        <artifactId>logstash-logback-encoder</artifactId>
        <version>5.2</version>
    </dependency>

    <!-- guava -->
    <dependency>
        <groupId>com.google.guava</groupId>
        <artifactId>guava</artifactId>
        <version>30.1.1-jre</version>
    </dependency>


```

### Properties or Yaml

```properties

    server.port = 808x
    server.servlet.context-path = /name

    #mysql-8 
    spring.datasource.username = root
    spring.datasource.password = mysql
    spring.datasource.url = jdbc:mysql://localhost:3306/<name>?serverTimezone=Asia/Taipei&useUnicode=true&characterEncoding=utf8&useSSL=false
    spring.datasource.driver-class-name = com.mysql.cj.jdbc.Driver

    #JPA
    spring.jpa.hibernate.ddl-auto = update
    spring.jpa.show-sql = true

```

```yml
server:
  port: 808x
  servlet:
    context-path: /name
spring:
  thymeleaf:
    cache: false

#mysql-8 
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/<name>?characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Taipei
    username: root
    password: mysql
    hikari:
      minimum-idle: 5
      maximum-pool-size: 15
      idle-timeout: 30000
      pool-name: hikariCP
      connection-timeout: 30000
      max-lifetime: 1800000


  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
```

### Config

Swagger2Config

```java

    /**
    * @author Bill.Lin 
    */

    @Configuration
    @EnableSwagger2
    public class Swagger2Config {

    @Bean
    public Docket api() {
        return new Docket(DocumentationType.SWAGGER_2)
                .select()
                .apis(RequestHandlerSelectors.any())
                .paths(PathSelectors.any())
                .build();
        }
    }
```


RestTemplateConfig

```java
    @Configuration
    public class RestTemplateConfig {

        @Bean
        public RestTemplate restTemplate(ClientHttpRequestFactory factory) {
            return new RestTemplate(factory);
        }

        @Bean
        public ClientHttpRequestFactory simpleClientHttpRequestFactory() {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setReadTimeout(3000);
            factory.setConnectTimeout(3000);
            return factory;
        }
    }
```


### docker-compose

kafka

```yml

version: '3'

services:
    zookeeper1:
        image: wurstmeister/zookeeper
        ports:
        - 2181:2181
        container_name: zookeeper

    kafka1:
        image: wurstmeister/kafka
        container_name: kafka
        ports:
        - 9092:9092
        environment:
        KAFKA_ADVERTISED_HOST_NAME: 192.168.99.100
        KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
        KAFKA_CREATE_TOPIC: "bill:1:3"

  redis:
    image: redis:<tag>
    expose:
      - 6379
    ports:
      - "6379:6379"
    networks:
      - default

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=rabbitmq
      - RABBITMQ_DEFAULT_PASS=rabbitmq
    ports:
      - "15672:15672"
      - "5672:5672"
    networks:
      - default

  mysql: 
    image: mysql:5.7 # 或 8
    environment:
      - MYSQL_ROOT_PASSWORD=mysql
    expose:
      - 3306
    ports:
      - "3306:3306"
    networks:
      - default
 
  mongo:
    image: mongo:4.1
    restart: always
    expose:
      - 27017
    ports:
      - 27017:27017
    environment:
      MONGO_INITDB_DATABASE: db
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: mongo
    networks:
      - default
  mongo-express:
    image: mongo-express
    restart: always
    ports:
      - 8081:8081
    environment:
      ME_CONFIG_MONGODB_SERVER: mongo
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: mongo
    depends_on:
      - mongo
    networks:
      - default

```

### logstash config (resource)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <conversionRule conversionWord="clr" converterClass="org.springframework.boot.logging.logback.ColorConverter" />
    <conversionRule conversionWord="wex" converterClass="org.springframework.boot.logging.logback.WhitespaceThrowableProxyConverter" />
    <conversionRule conversionWord="wEx" converterClass="org.springframework.boot.logging.logback.ExtendedWhitespaceThrowableProxyConverter" />
    <property name="CONSOLE_LOG_PATTERN" value="${CONSOLE_LOG_PATTERN:-%clr(%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}}){faint} %clr(${LOG_LEVEL_PATTERN:-%5p}) %clr(${PID:- }){magenta} %clr(---){faint} %clr([%15.15t]){faint} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %m%n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}}"/>

    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <layout class="ch.qos.logback.classic.PatternLayout">
            <pattern>${CONSOLE_LOG_PATTERN}</pattern>
        </layout>
    </appender>

    <logger name="com.bill.xx" level="info" />

    <root level="info">
        <appender-ref ref="STDOUT" />
    </root>

    <property name="LOGS" value="./logs" />

    <springProfile name="indev, staging">
        <property name="LOGS" value="IDC 目錄" />

        <appender name="RollingFile"
            class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>${LOGS}/ma-pos.log</file>
            <encoder
                class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
                <Pattern>%d %p %C{1.} [%t] %m%n</Pattern>
            </encoder>

            <rollingPolicy
                class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <!-- rollover daily and when the file reaches 10 MegaBytes -->
                <fileNamePattern>${LOGS}/archived/ma-pos-%d{yyyy-MM-dd}.%i.log
                </fileNamePattern>
                <timeBasedFileNamingAndTriggeringPolicy
                    class="ch.qos.logback.core.rolling.SizeAndTimeBasedFNATP">
                    <maxFileSize>10MB</maxFileSize>
                </timeBasedFileNamingAndTriggeringPolicy>
            </rollingPolicy>
        </appender>

        <appender name="LogstashFile" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>${LOGS}/logstash/logstash.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>${LOGS}/logstash/logstash.%d{yyyy-MM-dd}.log</fileNamePattern>
                <maxHistory>7</maxHistory>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        </appender>

        <root level="info">
            <appender-ref ref="RollingFile" />
            <appender-ref ref="LogstashFile" />
        </root>
    </springProfile>

</configuration>

```

### Other

banner.txt

```txt

      ,.  - · - .,  '             ,.-·.              ,.  '                ,.  '
,·'´,.-,   ,. -.,   `';,'         /    ;'\'          /   ';\              /   ';\
 \::\.'´  ;'\::::;:'  ,·':\'      ;    ;:::\       ,'   ,'::'\           ,'   ,'::'\
  '\:';   ;:;:·'´,.·'´\::::';    ';    ;::::;'     ,'    ;:::';'         ,'    ;:::';'
  ,.·'   ,.·:'´:::::::'\;·´      ;   ;::::;      ';   ,':::;'          ';   ,':::;'
  '·,   ,.`' ·- :;:;·'´         ';  ;'::::;       ;  ,':::;' '          ;  ,':::;' '
     ;  ';:\:`*·,  '`·,  °     ;  ';:::';       ,'  ,'::;'            ,'  ,'::;'
     ;  ;:;:'-·'´  ,.·':\       ';  ;::::;'      ;  ';_:,.-·´';\‘     ;  ';_:,.-·´';\‘
  ,·',  ,. -~:*'´\:::::'\‘      \*´\:::;‘      ',   _,.-·'´:\:\‘    ',   _,.-·'´:\:\‘
   \:\`'´\:::::::::'\;:·'´        '\::\:;'        \¨:::::::::::\';     \¨:::::::::::\';
    '\;\:::\;: -~*´‘              `*´‘          '\;::_;:-·'´‘        '\;::_;:-·'´‘
             '                                     '¨                   '¨

```
