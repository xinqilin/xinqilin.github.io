---
title: "單體 vs 微服務：先切對邊界，再決定要不要拆"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 7：比較單體、模組化單體與微服務的代價，說明依業務能力劃分邊界、資料所有權與分散式單體的徵兆，並用 Spring Modulith 落地"
categories: ["SystemDesign"]
tags: ["System Design", "Microservices", "Modular Monolith", "Spring Modulith", "DDD", "Security"]
---

> **System Design 系列** Part 7-1｜上一篇：[Observability](/post/systemdesign/observability/)｜下一篇：[Service Discovery](/post/systemdesign/service-discovery/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台上線兩年，工程團隊從 4 個人變成 30 個人，分成四個小組：報名與付款、講者後台、直播互動、推薦與數據。整個平台仍然是一個 Spring Boot 應用程式、一個 MySQL 資料庫。

最近的抱怨越來越多：

- 每週四統一發版。推薦小組的一個測試沒過，其他三組已經完成的功能也全部延後一週
- 直播互動的 SSE 連線有記憶體洩漏，整個應用程式 OOM 重啟，報名與付款跟著中斷
- 講者後台的月報表查詢跑了 3 分鐘，拖慢了同一個資料庫上的報名交易
- 改一個報名的欄位，要先搞清楚另外三組有沒有在 SQL 裡直接讀這張表

會議上有人說：「拆微服務吧。」

這篇要回答的是：哪些問題是微服務能解決的、哪些是它會帶來的，以及在拆之前應該先做什麼。

## 最簡單的做法與它的極限

- **維持一個沒有邊界的單體**：任何類別都能呼叫任何類別，任何程式都能查詢任何資料表。久了就成為所謂的「大泥球」（big ball of mud），沒有人敢改，也沒有人知道改了會影響什麼
- **依技術層或資料表拆服務**：`UserService`、`LectureService`、`RegistrationService` 各自一個微服務，各自負責一張表的 CRUD。結果是每一個功能都要同時修改三、四個服務，而且它們必須一起部署。這就是**分散式單體**：同時承受單體的耦合與分散式系統的複雜度

## 核心機制

### 微服務買到什麼、付出什麼

| 買到的 | 付出的 |
|---|---|
| **獨立部署**：每個團隊自己決定何時上線，不用等別人 | 服務之間的呼叫變成網路呼叫，會變慢、會失敗（[Part 6](/post/systemdesign/timeout-retry-backoff/)） |
| **團隊自主**：在自己的服務內選擇技術與節奏 | 跨服務的交易沒有了，要用 Saga 與最終一致性（[Part 7 的 Saga 篇](/post/systemdesign/saga-outbox/)） |
| **獨立擴展**：直播互動依連線數擴展，報名依請求數擴展 | 要有服務發現、集中的 log 與分散式追蹤（[Observability 篇](/post/systemdesign/observability/)） |
| **故障隔離**：直播互動 OOM 不會讓付款中斷 | API 的版本相容性要管理，不能再一次改完所有呼叫端 |
| **安全隔離**：付款與個資可以放在更嚴格的環境 | 測試變難：單一服務的測試通過，不代表整條流程正確 |

微服務最核心的價值是**獨立部署**，其他好處大多由此而來。如果拆完之後各個服務還是必須一起部署，那就付出了所有的代價，卻沒有得到主要的好處。

### 網路呼叫的代價

同一個程序內的方法呼叫是奈秒到微秒等級；同一個可用區內的 HTTP 呼叫，加上序列化與反序列化，通常是 1 毫秒上下，而且可能失敗。

結帳頁面在單體裡依序呼叫 8 個模組，拆成 8 個服務之後：

- 延遲至少多出 8 毫秒，而且每一段的長尾會疊加（[Latency 與 p99 篇](/post/systemdesign/latency-throughput/)）
- 每個服務的可用性是 99.9%，8 個串聯起來是 0.999⁸ ≈ 99.2%，一年多出大約 60 小時的不可用時間
- 每一個呼叫都要決定逾時、重試、斷路器與降級

所以邊界要切在**呼叫不頻繁**的地方。如果兩個服務每處理一個請求都要來回呼叫好幾次，它們很可能應該是同一個服務。

### 依業務能力切邊界

Melvin Conway 在 1968 年觀察到：系統的結構會複製設計它的組織的溝通結構。反過來運用：**讓服務的邊界和團隊的邊界一致**，一個團隊負責一個或幾個服務，日常的修改不需要跨團隊協調。

邊界依**業務能力**劃分，而不是依技術層或資料表。領域驅動設計（DDD）的 bounded context 是常用的工具：同一個詞在不同的情境下有不同的意義與規則。「報名」在報名情境裡關心名額與狀態轉換，在講者結算情境裡只是一筆計算分潤的收入，在推薦情境裡是一個使用者興趣的訊號。

講座平台的業務能力：

| 能力 | 負責 | 擁有的資料 |
|---|---|---|
| 講座目錄 | 講座資訊、場次、講者介紹 | 講座、場次 |
| 報名 | 名額、報名狀態 | 報名、候補名單 |
| 付款 | 扣款、退款、與金流對帳 | 付款紀錄 |
| 通知 | email、推播 | 通知紀錄、使用者的通知偏好 |
| 直播互動 | 即時提問、名額推播 | 提問、連線狀態 |
| 講者結算 | 每月分潤 | 結算紀錄 |
| 推薦 | 個人化推薦 | 使用者行為、模型 |

檢驗邊界的問題：**最常見的需求，要同時修改幾個模組？** 如果大部分的需求都只動一個，邊界大概是對的；如果每個需求都要動三個，邊界切錯了。

### 資料所有權

每份資料只有一個擁有者，**只有擁有者能直接讀寫它的資料表**。其他模組要資料，透過兩種方式：

- **呼叫擁有者的 API**：資料永遠是最新的，但多了一個執行期的依賴
- **訂閱擁有者的事件，保存自己需要的副本**：講者結算訂閱「報名完成」與「退款完成」事件，在自己的資料表裡累計每位講者的收入。不依賴報名服務的可用性，代價是資料有延遲（[CQRS](/post/architecture/cqrs/) 的讀取模型是同一個概念）

共用資料庫是最隱蔽的耦合：表面上服務分開了，但任何一個服務修改欄位，都可能讓其他服務壞掉，而且編譯器與測試都抓不到。

### 分散式單體的徵兆

- 一個服務上線，必須同時上線另外幾個服務
- 多個服務讀寫同一個資料庫的同一批資料表
- 一個使用者請求同步地串過五、六個服務
- 共用一個包含領域模型的函式庫，改一個欄位所有服務都要重新部署
- 一個服務掛掉，大部分的功能都不能用
- 每個需求都要排好幾個團隊的時程

### 模組化單體：先把邊界做對

在單體裡把業務能力分成**邊界明確的模組**：

- 模組之間只能透過公開的 API 或事件溝通，不能引用彼此的內部類別
- 每個模組使用自己的資料表（最好是自己的 schema），不能直接查詢其他模組的表
- 用自動化的測試檢查這些規則，違反時建置失敗

這樣做保留了單體的簡單：一次部署、程序內的呼叫、本地交易、單一的 log。同時，邊界清楚之後，未來要把某個模組拆出去，只是把程序內的呼叫換成網路呼叫、把程序內的事件換成 broker，而不是重新設計。

邊界在一開始最容易切錯。在單體裡調整模組邊界只是重構；在微服務裡調整邊界，是跨團隊的 API 與資料遷移。

### 怎麼拆：絞殺者模式

Martin Fowler 以絞殺榕命名的 **strangler fig** 模式：不重寫整個系統，而是逐步把功能搬到新的服務，在前面放一層路由，一個功能一個功能地把流量轉過去，直到舊系統的那一部分可以移除。

拆哪一個先？挑**拆出去有明確好處、而且邊界已經穩定**的模組：

- **直播互動**：執行特性完全不同（大量長連線、依連線數擴展，見[即時更新篇](/post/systemdesign/realtime-updates/)），它的故障不應該影響報名
- **付款**：需要更嚴格的安全控制與稽核，獨立出來可以縮小需要符合金融法規的範圍

而講座目錄、報名這些核心而且經常一起修改的部分，可以留在單體裡很久。

## 方案比較

| 方案 | 適合 | 主要代價 |
|---|---|---|
| 單體（沒有明確的模組邊界） | 小團隊、需求還在快速變動的早期產品 | 長大之後難以修改與拆分 |
| 模組化單體 | 一到數個團隊；大多數的業務系統 | 仍然一起部署、一起擴展；一個模組的記憶體洩漏影響全部 |
| 微服務 | 多個團隊需要獨立部署；不同部分有截然不同的擴展、可用性或安全需求 | 網路、資料一致性、維運、可觀測性的成本全部增加 |
| 模組化單體 + 少數拆出的服務 | 大部分成長中的系統 | 要維護兩種模式的工具與流程 |

講座平台的選擇：先把單體整理成模組化單體，報名、付款、講者結算之間改用事件溝通，各自擁有自己的資料表。然後把直播互動與付款拆成獨立的服務，其餘維持在單體裡。月報表改由講者結算模組維護的讀取模型提供，不再直接查詢報名資料表。

## Java 落地

### 1. 模組結構

Spring Modulith 把主應用程式類別所在套件的**直接子套件**視為模組，子套件底下的套件預設是模組的內部實作：

```text
com.example.lectures
├── LectureApplication.java
├── catalog/                         講座目錄模組
├── registration/                    報名模組
│   ├── RegistrationService.java     公開 API
│   ├── RegistrationCompleted.java   公開的事件
│   ├── package-info.java
│   └── internal/                    內部實作，其他模組不能引用
│       ├── RegistrationRepository.java
│       └── SeatAllocator.java
├── payment/
├── notification/
└── settlement/
```

```java
// registration/package-info.java：報名模組只允許依賴講座目錄
@org.springframework.modulith.ApplicationModule(allowedDependencies = "catalog")
package com.example.lectures.registration;
```

### 2. 讓建置檢查邊界

```java
class ModularityTests {

    @Test
    void modulesRespectTheirBoundaries() {
        // 模組之間不能有循環依賴、不能引用其他模組的 internal 套件、只能依賴允許的模組
        ApplicationModules.of(LectureApplication.class).verify();
    }
}
```

有人在通知模組裡直接注入 `registration.internal.RegistrationRepository`，這個測試就會失敗，建置跟著失敗。邊界不再只靠 code review 維持。

### 3. 模組之間用事件溝通

```java
// registration 模組：公開的事件
public record RegistrationCompleted(UUID eventId, long registrationId, long memberId, long lectureId) {
}

@Service
public class RegistrationService {

    private final RegistrationRepository registrations;
    private final ApplicationEventPublisher events;

    public RegistrationService(RegistrationRepository registrations, ApplicationEventPublisher events) {
        this.registrations = registrations;
        this.events = events;
    }

    @Transactional
    public Registration register(long lectureId, long memberId) {
        Registration registration = registrations.save(Registration.create(lectureId, memberId));
        events.publishEvent(new RegistrationCompleted(UUID.randomUUID(), registration.id(), memberId, lectureId));
        return registration;
    }
}
```

```java
// notification 模組：不需要知道報名模組的任何內部細節
@Component
class ConfirmationMailer {

    private final MailSender mailSender;

    ConfirmationMailer(MailSender mailSender) {
        this.mailSender = mailSender;
    }

    @ApplicationModuleListener
    void on(RegistrationCompleted event) {
        mailSender.sendConfirmation(event.memberId(), event.registrationId(), event.eventId());
    }
}
```

- `@ApplicationModuleListener` 是交易提交之後、非同步、在新的交易裡執行的事件監聽器。報名的交易不會因為寄信失敗而回滾，寄信也不會在報名回滾之後發生
- 加上 `spring-modulith-starter-jdbc` 之後，Event Publication Registry 會在**報名的同一個交易裡**寫入一筆「待投遞」的紀錄，監聽器成功後才標記完成。應用程式在中途當機，未完成的紀錄可以透過 `IncompleteEventPublications` 重新投遞。這就是程序內的 [Outbox](/post/architecture/outbox-pattern/)。重新投遞代表監聽器可能執行兩次，所以寄信用 `eventId` 當冪等 key（[冪等性篇](/post/systemdesign/idempotency-key/)）
- 有一天通知模組要拆成獨立的服務時，在事件上加上 `@Externalized`，Spring Modulith 會把它送到 Kafka 或 RabbitMQ，報名模組的程式不需要修改：

```java
@Externalized("registration-events::#{#this.lectureId()}")    // topic 與 routing key
public record RegistrationCompleted(UUID eventId, long registrationId, long memberId, long lectureId) {
}
```

> 以上程式碼依 Spring Modulith 2.1 與 Spring Framework 7 官方文件撰寫，沒有實際編譯與執行。

## 踩坑與 Gotchas

- **為了「微服務」而拆**：沒有獨立部署、獨立擴展或隔離的具體需求，只得到分散式系統的成本
- **邊界還沒穩定就拆**：產品方向還在變，邊界跟著變，跨服務的重構比單體內的重構貴上好幾倍
- **服務切得太細**：一個服務只有一張表、幾個 CRUD API，一個功能要動十個服務
- **共用資料庫**：服務分開了，耦合還在資料表裡
- **共用領域模型的函式庫**：所有服務依賴同一個版本的 `Registration` 類別，改一個欄位就要全部重新部署
- **同步呼叫鏈**：A 呼叫 B、B 呼叫 C、C 呼叫 D，任何一個慢，整條都慢；可用性相乘
- **先拆再補可觀測性**：拆完才發現無法追蹤一個請求跨過了哪些服務，事故時只能猜
- **低估資料遷移**：程式拆出去只是一半，資料從共用的資料表搬到新服務的資料庫、在遷移期間保持兩邊一致，才是最花時間的部分
- **組織沒有跟著調整**：一個團隊負責十個服務，或十個團隊共同負責一個服務，Conway's law 都會讓系統的結構往組織的方向扭曲
- **以為微服務能解決效能問題**：效能問題通常是查詢、索引、快取的問題。拆成微服務多了網路往返，往往更慢

### 資安相關

- **攻擊面變大**：單體只有一個對外的入口；微服務有幾十個服務、幾十個網路端點、幾十組憑證。每一個都要修補、設定 TLS、管理機密資料
- **內部網路不等於可信任**：「這個 API 只有內部服務會呼叫，所以不檢查權限」是常見的漏洞來源。攻擊者只要進入內部網路的任何一台機器，就能直接呼叫。服務之間要驗證彼此的身分（例如 mTLS），而且**每個服務都要自己做授權**，不能只依賴 API gateway 或 BFF 檢查過（[Part 8](/post/systemdesign/identity-propagation/) 詳談 BOLA 在微服務中的傳遞）
- **授權邏輯分散**：單體只有一處檢查「這個使用者能不能看這筆報名」；拆成微服務後，這個檢查要在每一個持有報名資料的服務裡重複，而且規則要一致。漏掉一個，就是一個越權存取的漏洞
- **事件會複製個資**：講者結算、推薦、通知都訂閱了報名事件，並在自己的資料庫保存副本。使用者要求刪除個資時，每一個副本都要處理。事件裡盡量只放 ID，個資由擁有者提供查詢
- **隔離是微服務的資安優勢**：付款與個資放在獨立的服務、獨立的網路區段、獨立的資料庫帳號，其他服務被入侵時無法直接存取。這是拆分的好理由，而且可以縮小需要符合 PCI DSS 等規範的範圍
- **模組化單體的限制**：模組邊界只在原始碼層級。任何一個模組有遠端程式執行的漏洞，攻擊者就取得整個程序的記憶體，以及能存取所有資料表的資料庫連線。需要真正的隔離時，就要拆成獨立的程序與資料庫帳號
- **供應鏈**：每個服務都有自己的依賴與容器映像檔。統一基礎映像檔、自動掃描依賴的漏洞、產生 SBOM，否則修補一個漏洞要追蹤幾十個儲存庫

## 何時用／何時別用

- **用模組化單體**：大部分的新系統與一到數個團隊的系統。先把邊界做對，這是之後所有選擇的基礎
- **拆出微服務**：有具體的理由，例如多個團隊被同一個發版流程卡住、某個部分有截然不同的擴展或可用性需求、需要安全或法規上的隔離。而且團隊已經具備自動化部署、集中的 log 與追蹤、服務間的身分驗證
- **重新評估的時機**：發版頻率因為協調成本而下降；一個模組的故障反覆影響其他模組；某個模組的資源需求與其他部分差異越來越大
- **別拆**：團隊只有一個；邊界還在變；拆分的動機只是「別人都這樣做」或「技術比較新」

## 參考資料

- Melvin E. Conway, "How Do Committees Invent?", *Datamation*, 1968：<https://www.melconway.com/Home/Committees_Paper.html>
- Martin Fowler, "MonolithFirst", 2015：<https://martinfowler.com/bliki/MonolithFirst.html>
- Martin Fowler, "StranglerFigApplication"：<https://martinfowler.com/bliki/StranglerFigApplication.html>
- Martin Fowler, "MicroservicePrerequisites", 2014：<https://martinfowler.com/bliki/MicroservicePrerequisites.html>
- Sam Newman, *Building Microservices*, 2nd Edition, O'Reilly, 2021；*Monolith to Microservices*, O'Reilly, 2019
- Matthew Skelton, Manuel Pais, *Team Topologies*, IT Revolution, 2019
- Eric Evans, *Domain-Driven Design*, Addison-Wesley, 2003
- Spring Modulith Reference Documentation：<https://docs.spring.io/spring-modulith/reference/>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
