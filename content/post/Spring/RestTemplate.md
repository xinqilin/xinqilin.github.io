---
title: "RestTemplate"
author: Bill.Lin
date: 2021-06-30T19:39:44+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring","Java"]
DisableComments: false
---

# RestTemplate

一般比較常用的 rest 服務，有的人自己公司可能會 base 在 OKHttp 上 包一層 HttpHelper/ HttpUtil 之類的方便使用，但在之前公司，有自己開發一個 microservice module 時 ，我一開始是選用 RestTemplate，這邊紀錄一下，未來要用時能直接隨開隨用。
<br>

```java

//config

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


### 注入

```java

    private final RestTemplate restTemplate;

    public XXService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    //==============我是分隔線================

    @AuroWired
    RestTemplate restTemplate;

```


### 使用 exchange

```java

// 第一個直接開門見山，最常用的 exchange，先點進去看 override 有甚麼不同的參數

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.lang.String url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, java.lang.Class<T> responseType, java.lang.Object... uriVariables) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.lang.String url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, java.lang.Class<T> responseType, java.util.Map<java.lang.String,?> uriVariables) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.net.URI url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, java.lang.Class<T> responseType) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.lang.String url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, org.springframework.core.ParameterizedTypeReference<T> responseType, java.lang.Object... uriVariables) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.lang.String url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, org.springframework.core.ParameterizedTypeReference<T> responseType, java.util.Map<java.lang.String,?> uriVariables) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(java.net.URI url, org.springframework.http.HttpMethod method, @org.springframework.lang.Nullable org.springframework.http.HttpEntity<?> requestEntity, org.springframework.core.ParameterizedTypeReference<T> responseType) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(org.springframework.http.RequestEntity<?> entity, java.lang.Class<T> responseType) throws org.springframework.web.client.RestClientException { /* compiled code */ }

    public <T> org.springframework.http.ResponseEntity<T> exchange(org.springframework.http.RequestEntity<?> entity, org.springframework.core.ParameterizedTypeReference<T> responseType) throws org.springframework.web.client.RestClientException { /* compiled code */ }



//大致上來說，其實我自己最常用的是

//回來的是一個 mapperObject
(String url, HttpMethod method, HttpEntity<?> requestEntity, Class<T> responseType)

//回來的是一個 List<mapperObject>
(String url, HttpMethod method, HttpEntity<?> requestEntity, ParameterizedTypeReference<T> new ParameterizedTypeReference<List<東西>>>() {})


//這兩個


// exchange 偷懶法
//沒用特定 POJO 使用 JSONObject
JSONObject jsonObj = new JSONObject();
jsonObj.put("start",1);
jsonObj.put("page",5);

HttpEntity<String> entity = new HttpEntity<>(jsonObj.toString(), headers);
ResponseEntity<JSONObject> exchange = restTemplate.exchange(url, 
HttpMethod.GET, entity, JSONObject.class);
System.out.println(exchange.getBody());
```

<br>

### get


```java

// 在來是 Get 請求 中 最常用的 ( 如果不用 exchange 的話)
// getForObject() 在裡面做 反序列化，所以不再自己處理 HTTP 回來的 ResponseEntity objectMapper to JavaObject的動作   而 getForEntity() 則要自己處理


public <T> T getForObject(String url, Class<T> responseType, Object... uriVariables){}
public <T> T getForObject(String url, Class<T> responseType, Map<String, ?> uriVariables)
public <T> T getForObject(URI url, Class<T> responseType)

public <T> ResponseEntity<T> getForEntity(String url, Class<T> responseType, Object... uriVariables){}
public <T> ResponseEntity<T> getForEntity(String url, Class<T> responseType, Map<String, ?> uriVariables){}
public <T> ResponseEntity<T> getForEntity(URI url, Class<T> responseType){}


//uriVariables 是用來帶在url上的參數用的
restTemplate.getForEntity("http://bill_domain/{1}/{2}", BillResponse.class,1,5);

// Map<String, ?> uriVariables 使用

Map<String,String> map = new HashMap();
map.put("start","1");
map.put("page","5");
restTemplate.getForObject("http://bill_domain/{1}/{2}", BillResponse.class, map);

```

<br>


### post


```java

public <T> T postForObject(String url, @Nullable Object request, Class<T> responseType, Object... uriVariables)
throws RestClientException {}
public <T> T postForObject(String url, @Nullable Object request, Class<T> responseType, Map<String, ?> uriVariables)
throws RestClientException {}
public <T> T postForObject(URI url, @Nullable Object request, Class<T> responseType) throws RestClientException {}

//這邊沒問題跟上面一樣
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);


//重點來了 MultiValueMap  ???
MultiValueMap<String, String> map= new LinkedMultiValueMap<>();
map.add("email", "bill@gmail.com");

HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
restTemplate.postForEntity( url, request , String.class );

```