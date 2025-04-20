---
title: "Swagger2"
author: Bill.Lin
date: 2021-07-01T20:47:27+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring"]
DisableComments: false
---

# Swagger2

### Dependency Inject

```xml
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
```

```java

//Config

@Configuration
@EnableSwagger2
public class SwaggerConf {
    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.bill.xxx.controller"))
                .paths(PathSelectors.any())//paths(PathSelectors.regex("/.*"))
                .build();
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("標題:Spring Boot中使用Swagger2建構RESTful APIs")
                .description("相關說明")
                .termsOfServiceUrl("https://www.pixnet.net/pcard/B0212066/")
                .license("Apache 2.0")
                .licenseUrl("http://www.apache.org/licenses/LICENSE-2.0.html")
                .version("1.0.0")
                .build();
    }
}

========

@Configuration
public class SwaggerConfiguration {

    @Bean
    public Docket api() {
        return new Docket(DocumentationType.SWAGGER_2)
                .select()
                .apis(RequestHandlerSelectors.any())
                .paths(PathSelectors.any())
                .build()
                .apiInfo(apiInfo())
                .securitySchemes(Arrays.asList(apiKey()));
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("REST API Document")
                .description("description for api")
                .termsOfServiceUrl("localhost")
                .version("1.0")
                .build();
    }

    private ApiKey apiKey() {
        return new ApiKey("apiKey", WebSecurityConfig.JWT_TOKEN_HEADER_PARAM, "header");
    }
}

```


### 基本

```java

@ApiOperation(value = "這支API的功能", notes = "更詳細的功能", authorizations = { @Authorization(value = "apiKey") })

```

### Response

```java
@ApiResponses(value = {

    @ApiResponse(code = 200, message = "Successfully retrieved list"),

    @ApiResponse(code = 401, message = "You are not authorized to view the resource"),

    @ApiResponse(code = 403, message = "Accessing the resource you were trying to reach is forbidden"),

    @ApiResponse(code = 404, message = "The resource you were trying to reach is not found")

}) 

```

### 參數

```java

public User get(
                @ApiParam(required = true,value = "請傳入UserObject的格式") @RequestBody UserObject dto) {
            return dto;
        }

```
