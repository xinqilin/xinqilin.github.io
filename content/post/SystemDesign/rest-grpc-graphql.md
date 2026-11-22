---
title: "REST、gRPC 與 GraphQL：依呼叫者選擇 API 風格"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 5：比較 REST、gRPC 與 GraphQL 的契約、快取、串流與除錯成本，依呼叫者選擇 API 風格，並處理 deadline、N+1 查詢與查詢深度限制等效能與安全問題"
categories: ["SystemDesign"]
tags: ["System Design", "REST", "gRPC", "GraphQL", "API Design", "Spring", "Security"]
---

> **System Design 系列** Part 5-1｜上一篇：[分散式鎖與 Fencing Token](/post/systemdesign/distributed-lock/)｜下一篇：[Message Queue](/post/systemdesign/message-queue/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台拆成報名、講座、通知幾個服務之後，API 的呼叫者分成三種，需求很不一樣：

1. **合作夥伴**：企業客戶用 API 查詢講座、替員工報名。他們用什麼語言、什麼工具都有可能，最在意的是好上手、穩定、文件清楚
2. **自家 App 的首頁**：一個畫面要顯示講座、講者、剩餘名額、我的報名狀態。不同版本的 App、不同的畫面，要的欄位都不一樣，而且行動網路的每一次往返都很貴
3. **服務之間**：報名服務每次報名都要向講座服務確認名額與時間，尖峰每秒數千次；講者後台還要即時看到新的報名，需要伺服器主動推送

## 最簡單的做法與它的極限

全部用 REST + JSON：

- **App 首頁**：要打 4、5 支 API 才湊得齊一個畫面。為首頁做一支專用 API 可以解決，但每個畫面、每個 App 版本都要一支，API 數量一直膨脹；共用同一支 API，又會回傳很多用不到的欄位
- **服務之間**：每次呼叫都要序列化與解析 JSON；欄位改名或型別改變，要到執行時才發現；也沒有內建的機制把「呼叫端還願意等多久」傳給下游
- **即時推送**：HTTP 的一問一答模式不適合長時間的串流

這不代表 REST 不好，而是不同的呼叫者適合不同的工具。

## 核心機制

### REST：用 HTTP 本身的語意

REST 以**資源**為中心，用 HTTP 方法表達操作。它最大的優勢是能直接利用整個 HTTP 生態：瀏覽器、curl、CDN、反向代理、快取都看得懂。

HTTP 規格（RFC 9110）對每個方法有明確的語意，這些語意會影響快取與重試：

| 方法 | 安全（不改變狀態） | 冪等（執行多次結果相同） | 用途 |
|---|---|---|---|
| GET、HEAD | 是 | 是 | 讀取，可以快取，失敗可以直接重試 |
| PUT | 否 | 是 | 整份取代 |
| DELETE | 否 | 是 | 刪除 |
| POST | 否 | 否 | 建立、或其他不符合上述語意的操作 |
| PATCH | 否 | 不一定 | 部分更新 |

POST 不是冪等的，網路逾時後重試可能建立兩筆資料。建立類的 POST 要支援 `Idempotency-Key`，[Part 5 的冪等性篇](/post/systemdesign/idempotency-key/)會詳談。

**條件式請求**是 REST 常被忽略的能力：

- **`ETag` + `If-None-Match`**：用戶端帶著上次拿到的版本來問，內容沒變就回 `304 Not Modified`，不傳內容，省頻寬也省序列化
- **`If-Match`**：更新時帶上版本，版本不符回 `412 Precondition Failed`。這就是把樂觀鎖放進 API 契約，避免兩個人同時編輯時，後寫的人無聲地覆蓋先寫的人

其他 REST 設計的要點：

- **版本放在路徑**（`/v1/lectures`），只在不相容的變更時升版；加欄位、加選填參數不算
- **大資料量用 cursor 分頁**：cursor 編碼「排序欄位的值 + 主鍵」，而不是把 offset 換個名字
- **統一的錯誤格式**：用標準的 Problem Details（RFC 9457）或團隊自訂的格式都可以，重點是全部 API 一致，並且有給程式判斷用的錯誤代碼。HTTP 狀態碼仍然要正確
- **契約用 OpenAPI 描述**（[springdoc-openapi](/post/spring/springdoc-openapi/)）

### gRPC：先定義契約，再產生程式碼

gRPC 從 `.proto` 檔定義服務與訊息，再用工具產生各種語言的用戶端與伺服器程式碼。

- **Protocol Buffers 是二進位格式**：比 JSON 小、解析快，欄位用編號而不是名稱識別
- **跑在 HTTP/2 上**：一條連線可以同時進行很多個呼叫，並支援四種呼叫模式：一問一答（unary）、伺服器串流、用戶端串流、雙向串流
- **Deadline 是一等公民**：用戶端指定「最晚什麼時候要拿到結果」，伺服器端看得到剩餘時間。gRPC **預設沒有 deadline**，用戶端不設定就可能永遠等下去。Java 版的 gRPC 會自動把收到的 deadline 傳遞給下游呼叫，並換算成剩餘時間，不受兩台機器時鐘誤差的影響
- **狀態碼**：`DEADLINE_EXCEEDED`、`UNAVAILABLE`、`NOT_FOUND`、`RESOURCE_EXHAUSTED` 等，比 HTTP 狀態碼更貼近 RPC 的語意

它的代價：

- **瀏覽器不能直接呼叫**，要透過 gRPC-Web 與代理（例如 Envoy），或在邊緣轉成 REST
- **不是人看得懂的格式**，除錯要用 grpcurl 這類工具，並依賴伺服器開啟 reflection 或手上有 `.proto`
- **長連線讓 L4 負載平衡失效**：連線建立後，上面所有呼叫都打同一台（[Load Balancing 篇](/post/systemdesign/load-balancing/)），需要 L7 或用戶端負載平衡
- **訊息大小預設上限 4 MiB**（grpc-java），超過就以 `RESOURCE_EXHAUSTED` 失敗

**Schema 的演進規則**：欄位編號就是欄位的身分。新增欄位用新的編號，舊的用戶端會忽略不認得的欄位；刪除欄位時要把編號標記為 `reserved`，**永遠不能重用**。重用編號會讓新舊版本把同一段資料解讀成不同的意義，而且不會報錯。

### GraphQL：讓用戶端決定要什麼

GraphQL 只有一個端點，伺服器公開一份有型別的 schema，用戶端在一次請求裡描述要哪些欄位、要往下展開哪些關聯：

```graphql
query HomePage {
  upcomingLectures(first: 10) {
    title
    startsAt
    remainingSeats
    speaker { name }
  }
}
```

App 首頁一次請求就拿到需要的資料，不多也不少。新的畫面只要改查詢，伺服器不用新增 API。

它的代價：

- **N+1 查詢**：每個欄位由各自的 resolver 取得。天真的實作會先查 10 個講座，再對每個講座各查一次講者，共 11 次。解法是 DataLoader：在同一個請求裡先收集所有要查的講者 ID，再一次批次查詢
- **HTTP 快取幫不上忙**：查詢通常用 POST 送到同一個網址，CDN 與瀏覽器快取無從快取。常見的做法是 persisted queries：事先登記允許的查詢，用戶端只送查詢的 ID，可以改用 GET 並且被快取
- **錯誤常常是 200**：部分欄位失敗時，回應仍是 HTTP 200，錯誤放在回應的 `errors` 陣列裡，同時附上其他成功的資料。監控只看 HTTP 狀態碼會漏掉錯誤
- **查詢的成本由用戶端決定**：一個查詢可以展開很深、要求很多資料，伺服器要限制深度與複雜度（見資安相關）

### 比較

| | REST | gRPC | GraphQL |
|---|---|---|---|
| 契約 | OpenAPI（選用） | `.proto`（必要） | Schema（必要） |
| 編碼 | JSON，人看得懂 | Protobuf 二進位 | JSON |
| 傳輸 | HTTP/1.1 或 HTTP/2 | HTTP/2 | HTTP，訂閱常用 WebSocket |
| HTTP 快取 | 直接可用 | 不適用 | 要靠 persisted queries |
| 瀏覽器 | 直接呼叫 | 要 gRPC-Web 與代理 | 直接呼叫 |
| 串流 | 要另外處理（SSE、WebSocket） | 內建四種模式 | Subscription |
| 除錯 | curl 就能打 | 要 grpcurl 與 reflection | 有 GraphiQL 這類工具 |
| 適合的呼叫者 | 對外、合作夥伴、簡單的 CRUD | 內部服務、多語言、高頻、串流 | 多種前端、畫面多變、關聯深的資料 |

## 方案比較

講座平台的選擇：

| 呼叫者 | 選擇 | 理由 |
|---|---|---|
| 合作夥伴 | REST + OpenAPI | 任何語言都能呼叫、能用 HTTP 快取、文件與工具最成熟 |
| 自家 App | GraphQL 或為畫面設計的 REST BFF | 畫面變化快、一次請求湊齊資料 |
| 報名服務 → 講座服務 | gRPC | 高頻呼叫、強型別契約、deadline 傳遞 |
| 講者後台的即時報名 | gRPC 伺服器串流（內部）；對瀏覽器用 SSE 或 WebSocket | 伺服器主動推送 |

同一個系統混用很常見：內部用 gRPC，邊緣用 REST 或 GraphQL，由 BFF 或 API gateway 轉換。

最簡單的選項永遠值得先考慮：只有一個前端、團隊不大時，**全部用 REST，為幾個複雜的畫面各做一支 BFF API**，通常比引入 GraphQL 或 gRPC 的工具鏈與維運成本划算。

## Java 落地

### 1. REST：條件式 GET 與 `If-Match`

```java
@RestController
@RequestMapping("/v1/lectures")
public class LectureController {

    private final LectureService lectureService;

    public LectureController(LectureService lectureService) {
        this.lectureService = lectureService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<LectureView> get(@PathVariable long id) {
        Lecture lecture = lectureService.find(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)))
                .eTag(Long.toString(lecture.version()))     // If-None-Match 相符時，Spring 自動回 304
                .body(LectureView.from(lecture));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LectureView> replace(@PathVariable long id,
                                               @RequestHeader(HttpHeaders.IF_MATCH) String ifMatch,
                                               @Valid @RequestBody LectureUpdate body) {
        long expectedVersion = Long.parseLong(ifMatch.replace("\"", ""));
        Lecture updated = lectureService.replace(id, expectedVersion, body);   // 版本不符時丟出例外，對應 412
        return ResponseEntity.ok()
                .eTag(Long.toString(updated.version()))
                .body(LectureView.from(updated));
    }
}
```

- 回傳的是 `LectureView` 而不是 entity，接收的是 `LectureUpdate` 而不是 entity，API 的形狀和資料表解耦（也和資安相關）
- 版本號用 JPA 的 `@Version` 欄位，`replace` 在更新時比對版本，不符就丟出例外，由 `@ExceptionHandler` 轉成 412

### 2. gRPC：內部的名額查詢與報名串流

```proto
syntax = "proto3";

package lecture.v1;

option java_package = "com.example.lecture.v1";
option java_multiple_files = true;

service LectureService {
  rpc GetSeats(GetSeatsRequest) returns (Seats);
  rpc WatchRegistrations(WatchRegistrationsRequest) returns (stream RegistrationEvent);
}

message GetSeatsRequest {
  int64 lecture_id = 1;
}

message Seats {
  int64 lecture_id = 1;
  int32 capacity = 2;
  int32 remaining = 3;
  reserved 4;                       // 已刪除的 waitlist_size，編號永遠不能重用
  reserved "waitlist_size";
}

message WatchRegistrationsRequest {
  int64 lecture_id = 1;
}

message RegistrationEvent {
  int64 member_id = 1;
  string status = 2;
}
```

伺服器端繼承產生出來的 `ImplBase`：

```java
public class LectureGrpcService extends LectureServiceGrpc.LectureServiceImplBase {

    private final SeatRepository seatRepository;
    private final RegistrationEvents registrationEvents;

    public LectureGrpcService(SeatRepository seatRepository, RegistrationEvents registrationEvents) {
        this.seatRepository = seatRepository;
        this.registrationEvents = registrationEvents;
    }

    @Override
    public void getSeats(GetSeatsRequest request, StreamObserver<Seats> responseObserver) {
        Optional<SeatCount> count = seatRepository.find(request.getLectureId());
        if (count.isEmpty()) {
            responseObserver.onError(Status.NOT_FOUND
                    .withDescription("lecture " + request.getLectureId())
                    .asRuntimeException());
            return;
        }
        responseObserver.onNext(Seats.newBuilder()
                .setLectureId(request.getLectureId())
                .setCapacity(count.get().capacity())
                .setRemaining(count.get().remaining())
                .build());
        responseObserver.onCompleted();
    }

    @Override
    public void watchRegistrations(WatchRegistrationsRequest request,
                                   StreamObserver<RegistrationEvent> responseObserver) {
        ServerCallStreamObserver<RegistrationEvent> observer =
                (ServerCallStreamObserver<RegistrationEvent>) responseObserver;
        Subscription subscription = registrationEvents.subscribe(request.getLectureId(),
                event -> observer.onNext(RegistrationEvent.newBuilder()
                        .setMemberId(event.memberId())
                        .setStatus(event.status())
                        .build()));
        observer.setOnCancelHandler(subscription::cancel);     // 用戶端斷線或 deadline 到期時停止推送
    }
}
```

用戶端：channel 是長期存活的物件，整個應用程式共用一個；每次呼叫都設定 deadline：

```java
ManagedChannel channel = ManagedChannelBuilder.forTarget("dns:///lecture-service:9090")
        .defaultLoadBalancingPolicy("round_robin")      // 預設的 pick_first 只連一台
        .useTransportSecurity()
        .build();
LectureServiceGrpc.LectureServiceBlockingStub stub = LectureServiceGrpc.newBlockingStub(channel);

try {
    Seats seats = stub.withDeadlineAfter(300, TimeUnit.MILLISECONDS)
            .getSeats(GetSeatsRequest.newBuilder().setLectureId(lectureId).build());
    // ...
} catch (StatusRuntimeException e) {
    if (e.getStatus().getCode() == Status.Code.DEADLINE_EXCEEDED) {
        // 講座服務太慢：回報「暫時無法確認名額」，不要無限等待
    }
    throw e;
}
```

`dns:///` 搭配 `round_robin` 時，DNS 要回傳每一台的位址。在 Kubernetes 上要用 headless Service，一般的 Service 只會回傳一個虛擬 IP，用戶端負載平衡就失去作用。

### 3. GraphQL：App 首頁

```graphql
type Query {
  upcomingLectures(first: Int = 20): [Lecture!]!
}

type Lecture {
  id: ID!
  title: String!
  startsAt: String!
  remainingSeats: Int!
  speaker: Speaker!
}

type Speaker {
  id: ID!
  name: String!
}
```

```java
@Controller
public class HomeGraphQlController {

    private final LectureService lectureService;
    private final SpeakerService speakerService;

    public HomeGraphQlController(LectureService lectureService, SpeakerService speakerService) {
        this.lectureService = lectureService;
        this.speakerService = speakerService;
    }

    @QueryMapping
    public List<Lecture> upcomingLectures(@Argument int first) {
        return lectureService.upcoming(Math.min(first, 50));    // 上限由伺服器決定
    }

    /** 一次查出這批講座的所有講者，而不是每個講座查一次。 */
    @BatchMapping
    public Map<Lecture, Speaker> speaker(List<Lecture> lectures) {
        Set<Long> speakerIds = lectures.stream().map(Lecture::speakerId).collect(Collectors.toSet());
        Map<Long, Speaker> byId = speakerService.findAllById(speakerIds);
        return lectures.stream().collect(Collectors.toMap(l -> l, l -> byId.get(l.speakerId())));
    }
}
```

`@BatchMapping` 會註冊一個 DataLoader，把同一個請求裡所有講座的 `speaker` 欄位合併成一次呼叫。`Lecture` 被當成 Map 的 key，必須正確實作 `equals` 與 `hashCode`，用 record 最簡單。

限制查詢的深度與複雜度，並在正式環境關閉 introspection：

```java
@Configuration(proxyBeanMethods = false)
public class GraphQlLimits {

    @Bean
    public MaxQueryDepthInstrumentation maxQueryDepth() {
        return new MaxQueryDepthInstrumentation(8);
    }

    @Bean
    public MaxQueryComplexityInstrumentation maxQueryComplexity() {
        return new MaxQueryComplexityInstrumentation(200);
    }
}
```

```properties
spring.graphql.schema.introspection.enabled=false
```

Spring Boot 會自動把 `Instrumentation` bean 註冊到 GraphQL 引擎。

> 以上程式碼依 Spring Framework、Spring for GraphQL、Spring Boot、grpc-java 與 GraphQL Java 的官方文件撰寫，沒有實際編譯與執行。

## 踩坑與 Gotchas

- **PATCH 被當成整份覆蓋**：PATCH 應該只更新請求裡出現的欄位。要整份取代就用 PUT
- **分頁沒有排序**：沒有明確的 `ORDER BY`，翻頁時資料順序不穩定，會重複或遺漏
- **gRPC 沒設 deadline**：下游卡住時，上游的執行緒與連線一起被佔住，整條呼叫鏈跟著卡死（Part 6 的 Timeout 與 Retry）
- **每次呼叫都建立新的 gRPC channel**：channel 內含連線池與名稱解析，建立成本高，應該共用
- **串流的 `StreamObserver` 不是執行緒安全的**：多個執行緒同時呼叫 `onNext` 會出錯，要確保同一時間只有一個執行緒推送。用戶端讀得慢時，伺服器推送的訊息會在記憶體裡堆積，要用 `isReady()` 與 `setOnReadyHandler` 做流量控制
- **Protobuf 欄位編號重用**：舊版本的服務把新欄位解讀成舊的意義，不會報錯，只會產生錯誤的資料
- **GraphQL 的 N+1**：每個關聯欄位都要檢查是否用了批次載入，否則一個查詢可能打出數百次資料庫查詢
- **GraphQL 回 200 就以為成功**：監控與告警要看回應裡的 `errors`

### 資安相關

- **物件層授權（BOLA）**：`GET /v1/lectures/{id}/registrations` 只驗證了「有登入」，沒有驗證「這個講座是你的」，換個 ID 就能看到別人的報名名單。三種風格都一樣，每次存取物件都要檢查擁有權（Part 8 詳談）
- **Mass assignment**：直接把請求內容綁定到 entity，攻擊者多送一個 `"status": "APPROVED"` 或 `"role": "ADMIN"` 就被寫進資料庫。請求與回應一律使用專用的 DTO
- **GraphQL 的查詢成本攻擊**：利用互相參照的型別（講座 → 講者 → 講者的講座 → …）組出很深的查詢，一個請求就能耗盡伺服器資源。要限制深度與複雜度，正式環境的公開 API 最好只接受 persisted queries
- **GraphQL 的別名與批次繞過速率限制**：一個請求裡用別名呼叫同一個 mutation 一百次（例如嘗試一百組優惠碼），以「請求數」計算的速率限制只算一次。速率限制要以操作或欄位為單位計算
- **GraphQL 的欄位授權**：授權要放在每個 resolver 或其呼叫的服務方法上（例如 `@PreAuthorize`），而不是只檢查進入點。用戶端可以從任何一個入口查詢走到敏感的欄位
- **Introspection 與 gRPC reflection**：兩者都會公開完整的 API 結構，方便攻擊者找出隱藏的操作。對外的正式環境關閉；內部環境依需要開啟
- **內部 gRPC 也要加密與驗證身分**：「在內網」不是信任的理由。服務之間使用 mTLS，伺服器端依呼叫方的身分授權（Part 8 的服務身分）
- **錯誤訊息洩漏內部資訊**：stack trace、SQL 錯誤、內部主機名稱不要出現在回應裡，包括 GraphQL 的 `errors` 與 gRPC 的 status description

## 何時用／何時別用

- **REST**：對外 API、合作夥伴、需要 HTTP 快取、團隊不想引入額外工具鏈
- **gRPC**：內部服務之間、多語言、高頻呼叫、需要串流與 deadline 傳遞；不適合直接給瀏覽器或第三方使用
- **GraphQL**：多種前端、畫面變化快、資料關聯深；不適合簡單的 CRUD、需要大量 HTTP 快取的公開內容，或團隊還沒準備好處理 N+1 與查詢成本限制

## 參考資料

- RFC 9110, "HTTP Semantics", 2022：<https://www.rfc-editor.org/rfc/rfc9110>
- RFC 9457, "Problem Details for HTTP APIs", 2023：<https://www.rfc-editor.org/rfc/rfc9457>
- Roy T. Fielding, "Architectural Styles and the Design of Network-based Software Architectures", Ph.D. dissertation, UC Irvine, 2000
- gRPC — Deadlines：<https://grpc.io/docs/guides/deadlines/>
- gRPC — Reflection：<https://grpc.io/docs/guides/reflection/>
- gRPC — Error handling：<https://grpc.io/docs/guides/error/>
- Protocol Buffers — Language Guide (proto 3)：<https://protobuf.dev/programming-guides/proto3/>
- GraphQL Specification：<https://spec.graphql.org/>
- GraphQL Java — Instrumentation：<https://www.graphql-java.com/documentation/instrumentation>
- Spring for GraphQL — Controllers（Batch Mapping）：<https://docs.spring.io/spring-graphql/reference/controllers.html>
- Spring Framework — HTTP Caching：<https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-caching.html>
- OWASP API Security Top 10 (2023)：<https://owasp.org/API-Security/editions/2023/en/0x11-t10/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
