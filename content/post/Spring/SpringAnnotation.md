---
title: "Spring Annotation"
author: Bill.Lin
date: 2019-09-05T23:50:29+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring"]
DisableComments: false
---

### Spring 常用 annotation 筆記


### Cron

```

@EnableScheduling
@Scheduled

cron屬性
second、minute、hour、day of month (日)、month、day of week(星期幾)
0 * * * * MON-FRI (周一到週五 每分鐘)
* * * * * MON-FRI (周一到週五每秒)
0,1,2,3,4 * * * * * MON-FRI (枚舉，０－４秒)
0-4 * * * * * MON-FRI (直接，０－４秒)
0/4 * * * * * MON-FRI (0秒啟動，每4秒執行一次)


    秒：可出現”, – * /”四個字元，有效範圍為0-59的整數  

    分：可出現”, – * /”四個字元，有效範圍為0-59的整數  

    時：可出現”, – * /”四個字元，有效範圍為0-23的整數  

    每月第幾天：可出現”, – * / ? L W C”八個字元，有效範圍為0-31的整數  

    月：可出現”, – * /”四個字元，有效範圍為1-12的整數或JAN-DEC  

    星期：可出現”, – * / ? L C #”四個字元，有效範圍為0-7的整數或SUN-SAT兩個範圍。0,1 都是星期日 1-6 星期一到六
    
    
    * : 表示匹配該域的任意值，比如在秒*, 就表示每秒都會觸發事件。；

    ? : 只能用在每月第幾天和星期兩個域。表示不指定值，當2個子表示式其中之一被指定了值以後，為了避免衝突，需要將另一個子表示式的值設為“?”；

    – : 表示範圍，例如在分域使用5-20，表示從5分到20分鐘每分鐘觸發一次  

    / : 表示起始時間開始觸發，然後每隔固定時間觸發一次，例如在分域使用5/20,則意味著5分，25分，45分，分別觸發一次.  

    , : 表示列出列舉值。例如：在分域使用5,20，則意味著在5和20分時觸發一次。  

    L : 表示最後，只能出現在星期和每月第幾天域，如果在星期域使用1L,意味著在最後的一個星期日觸發。  

    W : 表示有效工作日(週一到週五),只能出現在每月第幾日域，系統將在離指定日期的最近的有效工作日觸發事件。注意一點，W的最近尋找不會跨過月份  

    LW : 這兩個字元可以連用，表示在某個月最後一個工作日，即最後一個星期五。  

    # : 用於確定每個月第幾個星期幾，只能出現在每月第幾天域。例如在1#3，表示某月的第三個星期一。4#2 第二個星期四

   （1）cron：cron表示式，指定任務在特定時間執行；

    （2）fixedDelay：表示上一次任務執行完成後多久再次執行，引數型別為long，單位ms；

    （3）fixedDelayString：與fixedDelay含義一樣，只是引數型別變為String；

    （4）fixedRate：表示按一定的頻率執行任務，引數型別為long，單位ms；

    （5）fixedRateString: 與fixedRate的含義一樣，只是將引數型別變為String；

    （6）initialDelay：表示延遲多久再第一次執行任務，引數型別為long，單位ms；

    （7）initialDelayString：與initialDelay的含義一樣，只是將引數型別變為String；
    
  example:
    “0 0 * * * *”                      表示每小時0分0秒執行一次

    ” */10 * * * * *”                 表示每10秒執行一次

    “0 0 8-10 * * *”                 表示每天8，9，10點執行

    “0 0/30 8-10 * * *”            表示每天8點到10點，每半小時執行

    “0 0 9-17 * * MON-FRI”     表示每週一至週五，9點到17點的0分0秒執行

    “0 0 0 25 12 ?”                  表示每年聖誕節（12月25日）0時0分0秒執行
    
    表達式參考:
     https://codertw.com/%E7%A8%8B%E5%BC%8F%E8%AA%9E%E8%A8%80/6009/
     https://gitee.com/jack90john/spring-boot-timmer

@Scheduled(fixedDelay = 5000)        //fixedDelay = 5000表示當前方法執行完畢5000ms後，Spring scheduling會再次呼叫該方法


```

### Mail

```
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-mail</artifactId>
		</dependency>

```

##### properties

```properties
spring.mail.username=
spring.mail.password=
spring.mail.host=
spring.mail.properties.mail.smtp.ssl.enable=true  (SSL 安全機制)

```

##### REF properties
```properties
# =================================
# Mail
# =================================
spring.mail.default-encoding=UTF-8
# Gmail SMTP
spring.mail.host=smtp.gmail.com
# TLS , port 587
spring.mail.port=587
spring.mail.username=my.account@gmail.com
spring.mail.password=my.password
# Other properties
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true

```


##### 透過config設置

```java

@Configuration
public class MailConfig {
 @Bean
 public JavaMailSender getJavaMailSender() {
     JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
     mailSender.setHost("smtp.gmail.com");
     mailSender.setPort(587);
      
     mailSender.setUsername("my.gmail@gmail.com");
     mailSender.setPassword("my.password");
      
     Properties props = mailSender.getJavaMailProperties();
     props.put("mail.transport.protocol", "smtp");
     props.put("mail.smtp.auth", "true");
     props.put("mail.smtp.starttls.enable", "true");
     props.put("mail.smtp.starttls.required", "true");
     props.put("mail.debug", "true");
      
     return mailSender;
 }
 
}

```


調用 

```java
@AutoWired
JavaMailSenderImpl javaMail;

@Test
XXXXX
SimpleMailMessage msg=new SimpleMailMessage();

msg.setSubject("標題");
msg.setText("內容");

msg.setTo("去哪裡@gmail.com");
msg.setFrom("從哪裡@gmail.com");

javaMail.send(msg);




```

##### 有兩步驟驗證的話:

```
左側導覽面板上的 [安全性]，按一下底部的 [選取應用程式]，然後選擇您使用的應用程式，或是建立一組應用程式使用用的密碼

選其他 => 自命名 =>產生16位密碼  =>當成正式密碼 丟在properties中

```

##### 複雜mail 

```java

MimeMessage mimeMsg=javaMailSender.createMimeMessage();
MimeMessageHelper helper=new MimeMessageHelper(mimeMsg ,(multipart:)true);


helper.setSubject("標題");
helper.setText("<strong>內容</strong>",(html編譯) true);    (可加html標籤，後面預設是false)

helper.setTo("去哪裡@gmail.com");
helper.setFrom("從哪裡@gmail.com");

helper.addAttachement("檔名",new File("檔案位置"));


javaMail.send(mimeMsg);

```


### Actuator

##### Actuator 提供了 13 個接口，具體如下表所示 (引用自think power)<a href="https://tpu.thinkpower.com.tw/tpu/articleDetails/954">think power</a>
<table cellpadding="8" border="1">
	<tr>
		<th>路徑</th>
		<th>描述</th>
	</tr>
	<tr>
		<th>/health</th>
		<th>展示系統的各種組件運行狀態、硬碟使用狀況</th>
	</tr>
	<tr>
		<th>/metrics</th>
		<th>統計系統當前的一些即時信息，如：該系統接收了多少個請求、cache命中率、mq中有多少條信息待處理、CPU使用率、內存占用情況等。</th>
	</tr>
	<tr>
		<th>/metrics/{name}</th>
		<th>報告指定名稱的應用進程度量值</th>
	</tr>
	<tr>
		<th>/dump</th>
		<th>當前系統中線程的詳細信息</th>
	</tr>
	<tr>
		<th>/env</th>
		<th>展示系統變量 和 springboot的應用變量</th>
	</tr>
	<tr>
		<th>/env/{name}</th>
		<th>根據名稱獲取特定的環境屬性值</th>
	</tr>
	<tr>
		<th>/trace</th>
		<th>顯示最近的http請求的request、response對（默認最多緩存100條）</th>
	</tr>
	<tr>
		<th>/autoconfig</th>
		<th>展示所有auto-configuration候選者及它們被應用或未被應用的原因</th>
	</tr>
	<tr>
		<th>/info</th>
		<th>顯示應用自定義的信息：如該應用的聯繫人、名稱、版本等</th>
	</tr>
	<tr>
		<th>/configprops</th>
		<th>顯示所有被@ConfigurationProperties mark的Bean的信息列表</th>
	</tr>
	<tr>
		<th>/mappings</th>
		<th>顯示所有@RequestMapping mark 的url list</th>
	</tr>
	<tr>
		<th>/shutdown</th>
		<th>允許以POST方式關閉應用，要求endpoints.shutdown.enabled設置為true</th>
	</tr>
	<tr>
		<th>/beans</th>
		<th>顯示該應用中所有Spring Beans的完整信息，包括依賴了哪些bean、是singleton還是prototype</th>
	</tr>

</table>


## spring boot 2參考用表
<table cellpadding="5" border="1">
<tr>
	<th>id</th>
	<th>效果</th>
	<th>default value</th>
</tr>
<tr>
	<td>auditevents</td>
	<td>顯示當前訊息事件</td>
	<td>Y</td>
</tr>
<tr>
	<td>beans</td>
	<td>顯示應用Spring Beans的完整列表</td>
	<td>Y</td>
</tr>
<tr>
	<td>caches</td>
	<td>顯示可cache訊息</td>
	<td>Y</td>
</tr>
<tr>
	<td>conditions</td>
	<td>顯示autoconfig 的狀態與應用訊息</td>
	<td>Y</td>
</tr>

<tr>
	<td>configprops</td>
	<td>顯示所有@ConfigurationProperties 列表</td>
	<td>Y</td>
</tr>
<tr>
	<td>env</td>
	<td>顯示ConfigurableEnvironment 中的属性</td>
	<td>Y</td>
</tr>
<tr>
	<td>flyway</td>
	<td>顯示Flyway 中data遷移訊息</td>
	<td>Y</td>
</tr>
<tr>
	<td>health</td>
	<td>顯示應運的訊息(為認證只顯示status，已認證顯示全部)</td>
	<td>Y</td>
</tr>

<tr>
	<td>info</td>
	<td>很直白</td>
	<td>Y</td>
</tr>
<tr>
	<td>liquibase</td>
	<td>跟fly依樣，顯示liquibase</td>
	<td>Y</td>
</tr>
<tr>
	<td>metrics</td>
	<td>顯示當前metrics訊息</td>
	<td>Y</td>
</tr>


<tr>
	<td>mappings</td>
	<td>顯示所有@RequestMapping</td>
	<td>Y</td>
</tr>
<tr>
	<td>scheduledtasks</td>
	<td>顯示所有scheduledtasks</td>
	<td>Y</td>
</tr>

<tr>
	<td>sessions</td>
	<td>...</td>
	<td>Y</td>
</tr>
<tr>
	<td>shutdown</td>
	<td>若是true時，可發/shutdown 的post req去關閉server</td>
	<td style="color:red;">N</td>
</tr>
<tr>
	<td>threaddump</td>
	<td>執行一個thread的dump</td>
	<td>Y</td>
</tr>
<tr>
	<td>httptrace</td>
	<td>顯示最後執行的100的http req</td>
	<td>Y</td>
</tr>
<tr>
	<td>heapdump</td>
	<td>return gzip 的dump文件</td>
	<td>Y</td>
</tr>

<tr>
	<td>prometheus</td>
	<td>Prometheus的格式顯示metrics訊息</td>
	<td>Y</td>
</tr>
</table>

參考掘金https://juejin.im/post/5d78afa951882505e029c57e

### 配置path

```
  management.endpoints.web.basePath=
```

### 全部啟用 management.endpoints.enabled-by-default

```
management.endpoints.enabled-by-default=true
```

全部停用，只啟用部分

```
  management.endpoints.enabled-by-default=false
  management.endpoint.[id].enabled=true
```
##### 開放與封閉

```
management.endpoints.<web|jmx>.exposure.<include|exclude>

 * 開放所有所有web端點，如果暴露的是一個要用 id 並以逗號隔開 
management.endpoints.web.exposure.include='*'

排除端點
management.endpoints.web.exposure.exclude=
```

##### 安全性
```
  可用上面方法  或是 此方法關閉敏感端點 ex: /shutdown 或是使用Spring security 來搭配使用
  management.server.port=-1
```

##### 自訂義 (boot 2 開始，Actuator支援CRUD模型)

@Endpoint 支援JMX和http
@JmxEndpoint 只支援JMX
@WebEndpoint 只支援http

通過在一個端點類（必須是Spring Bean）上添加上面其中一個來表明該類是一個端點類。
在類的方法使用
@ReadOperation
@WriteOperation
@DeleteOperation，這分別會orm到Http中的GET，POST，DELETE。以下範例

```java

@Component
@Endpoint(id = "features")
public class FeaturesEndpoint {

   private Map<String, Feature> features = new ConcurrentHashMap<>();

   @ReadOperation
   public Map<String, Feature> features() {
       return features;
   }

   @ReadOperation
   public Feature feature(@Selector String name) {
       return features.get(name);
   }

   @WriteOperation
   public void configureFeature(@Selector String name, Feature feature) {
       features.put(name, feature);
   }

   @DeleteOperation
   public void deleteFeature(@Selector String name) {
       features.remove(name);
   }

   public static class Feature {
       private Boolean enabled;

       // getters and setters ...
   }

}

```

##### 應用延伸
可以使用
@EndpointExtension
@EndpointWebExtension
@EndpointJmxExtension
來延伸端點行為

```java

@Component
@EndpointWebExtension(endpoint = InfoEndpoint.class)
public class InfoWebEndpointExtension {
 
    private InfoEndpoint delegate;
 
    // standard constructor
 
    @ReadOperation
    public WebEndpointResponse<Map> info() {
        Map<String, Object> info = this.delegate.info();
        Integer status = getStatus(info);
        return new WebEndpointResponse<>(info, status);
    }
 
    private Integer getStatus(Map<String, Object> info) {
        // return 5xx if this is a snapshot
        return 200;
    }
}

```

- 啟用端點 env
management.endpoint.env.enabled=true

- 暴露端點 env 配置多個,隔開
management.endpoints.web.exposure.include=env

- 開啟全部
management.endpoint.*.enabled=true
management.endpoints.web.exposure.include=*



### 使用非同步  (待補...)

``@EnableAsync``
``@Async``


