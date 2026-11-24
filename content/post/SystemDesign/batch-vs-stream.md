---
title: "Batch 與 Stream：月結報表與即時熱門榜，兩種處理資料的方式"
date: 2026-11-23
draft: false
author: Bill.Lin
description: "System Design 系列 Part 7：比較批次與串流處理，說明可重啟的分塊批次、事件時間、視窗與遲到資料、Lambda 與 Kappa 架構，並用 Spring Batch 與 Kafka Streams 落地"
categories: ["SystemDesign"]
tags: ["System Design", "Batch Processing", "Stream Processing", "Spring Batch", "Kafka Streams", "Security"]
---

> **System Design 系列** Part 7-4｜上一篇：[Saga 與 Outbox](/post/systemdesign/saga-outbox/)｜下一篇：[身分驗證](/post/systemdesign/authentication-session-token-oidc/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台有兩個新需求：

1. **講者月結**：每個月 1 日，依上個月確認的報名，計算每位講者的分潤，產生結算紀錄，再交給付款流程撥款。5,000 位講者、上個月 100 萬筆報名
2. **即時熱門榜**：首頁顯示「過去一分鐘報名最多的講座」，開放報名的瞬間要在幾秒內反映出來

兩者處理的是同一批報名資料，但要求完全不同：月結要**正確**，晚幾個小時沒關係，但算錯錢、重複撥款都不行；熱門榜要**快**，偶爾少算一兩筆，使用者不會發現。

```diagram
title: 同一批報名資料，兩種要求
row: U 持續湧入的報名 | DB 報名資料 | HOT 即時熱門榜
row: . | . | MON 講者月結
step: 講者月結
  每個月 1 日，依上個月確認的報名，計算 5,000 位講者的分潤、產生結算紀錄，再交給付款流程撥款。
DB => MON: 上個月 100 萬筆
note MON: 5,000 位講者的分潤
step: 即時熱門榜
  首頁顯示過去一分鐘報名最多的講座，開放報名的瞬間要在幾秒內反映出來。
U => DB: 報名持續湧入
DB => HOT: 過去一分鐘
note HOT: 幾秒內反映
step: 正確，還是快
  月結要正確：晚幾個小時沒關係，但算錯錢、重複撥款都不行。熱門榜要快：偶爾少算一兩筆，使用者不會發現。
DB => MON: 晚幾小時沒關係
DB => HOT: 少算一兩筆沒關係
note MON: 要正確 [ok]
note HOT: 要快 [ok]
```

這就是批次（batch）與串流（stream）處理的分界：資料是**有邊界**的（上個月的報名，已經不會再變）還是**沒有邊界**的（報名持續湧入，永遠沒有「全部到齊」的一刻）。

## 最簡單的做法與它的極限

**月結：半夜在正式資料庫上跑一段程式**

```java
List<Speaker> speakers = speakerRepository.findAll();          // 一次載入全部
for (Speaker s : speakers) {
    BigDecimal income = registrationRepository.sumIncome(s.id(), month);
    settlementRepository.save(new Settlement(s.id(), month, income));
}
```

- 跑在 primary 上，月結的大量查詢拖慢了同一時間的報名交易
- 跑到第 4,000 位講者時程序當機。重新執行要從頭開始，前 4,000 筆已經寫入的結算紀錄會不會重複？
- 有人不小心在同一天又執行了一次，講者會不會被撥兩次款？

**熱門榜：每次請求都查資料庫**

```sql
SELECT lecture_id, COUNT(*) FROM registration
 WHERE created_at > NOW() - INTERVAL 1 MINUTE
 GROUP BY lecture_id ORDER BY COUNT(*) DESC LIMIT 10;
```

首頁每秒被看幾千次，每次都對最熱的資料表做彙總查詢。剛好在開放報名、資料庫最忙的時候。

## 核心機制

### 批次：有邊界的資料，重點是可重啟與冪等

批次處理的輸入是固定的：上個月的報名不會再改變。這讓它可以專注在**吞吐量**與**正確性**：

**分塊處理**（chunk）：每次讀取 N 筆、處理、寫入，然後提交一次交易，並記錄目前處理到哪裡。

- 交易不會太大：不會因為一次寫入 100 萬筆而長時間鎖表、撐爆 undo log
- 當機後**從最後一次提交的位置繼續**，而不是從頭開始

**用 keyset 分頁，不用 OFFSET**：`LIMIT 1000 OFFSET 900000` 要先掃過前 90 萬筆再丟掉。100 萬筆分成 1,000 頁，平均每頁要跳過 50 萬筆，總共掃描約 5 億筆；用 `WHERE id > :lastId ORDER BY id LIMIT 1000`，每頁都直接從索引定位，總共只掃描 100 萬筆（[Index 與 B+Tree 篇](/post/systemdesign/index-btree/)）。

**輸出要冪等**：重新執行同一個月的月結，結果應該完全相同，而不是多出一份。結算紀錄用 `(speaker_id, settle_month)` 當唯一鍵，寫入用 upsert。真正撥款是另一個步驟，有自己的冪等保護（[分散式鎖篇](/post/systemdesign/distributed-lock/)的撥款流程）。

**同一份輸入只執行一次**：「2026 年 10 月的月結」是一個明確的工作實例。已經成功完成的實例，不應該被再執行一次；失敗的實例，應該從中斷的地方繼續。

**讀取的資料要有明確的截止點**：月結讀的是「10 月 1 日 0 時到 11 月 1 日 0 時之間確認的報名」，而不是「現在資料庫裡的所有報名」。在 replica 上執行時，要先確認複寫延遲已經超過截止時間（[Replication 篇](/post/systemdesign/replication-lag/)）。

### 串流：沒有邊界的資料，重點是時間

串流處理的輸入永遠在增加。「過去一分鐘有幾筆報名」聽起來簡單，但有一個根本的問題：**「一分鐘」是誰的時間？**

- **事件時間**（event time）：報名實際發生的時間，記錄在事件裡
- **處理時間**（processing time）：串流程式處理到這個事件的時間

兩者在正常時只差幾毫秒，但手機在捷運上斷線、30 秒後才送出；某個分區的消費者重啟、積壓了 2 分鐘。依處理時間計算，這些事件會被算進錯誤的那一分鐘。

**視窗**把沒有邊界的資料切成有邊界的片段：

| 視窗 | 切法 | 例子 |
|---|---|---|
| 滾動視窗（tumbling） | 固定大小、不重疊 | 每一分鐘的報名數：10:00–10:01、10:01–10:02 |
| 跳躍視窗（hopping） | 固定大小、會重疊 | 每 10 秒更新一次「過去一分鐘」的報名數 |
| 工作階段視窗（session） | 依活動的間隔切分 | 使用者連續瀏覽講座，閒置 30 分鐘就算一個工作階段結束 |

**遲到的資料**：10:00–10:01 的視窗，什麼時候算「結束」？如果 10:01 一到就結束，10:00:50 發生、10:01:20 才到的事件就被漏掉。所以視窗要有一段**寬限期**（grace period）：在這段時間內到達的遲到事件仍然會被計入，超過寬限期才到的事件被丟棄。寬限期越長，結果越完整，但最終結果出來得越晚、要保存的狀態越多。

**狀態**：計數、彙總都需要保存中間狀態。串流程式重啟或重新分配分區時，狀態不能遺失。Kafka Streams 把狀態存在本機，同時寫入 Kafka 的 changelog topic，重啟時從那裡復原。

### Lambda 與 Kappa

| 架構 | 做法 | 代價 |
|---|---|---|
| Lambda | 同一份資料同時走批次與串流兩條路：串流提供即時但可能不精確的結果，批次定期產生精確的結果並覆蓋 | 同一套邏輯要寫兩次、維護兩次，兩邊的結果可能對不上 |
| Kappa | 只有串流。需要重新計算時（邏輯修改、修正錯誤），從保留的 log 起點重新播放一次 | 依賴長期保留的事件 log；重播大量歷史資料需要時間與資源 |

Kappa 的前提是事件被完整保留（[Pub/Sub 篇](/post/systemdesign/pubsub-delivery-semantics/)的 Kafka log），而且串流程式本身就能產生精確的結果。實務上很多系統是混合的：即時的指標用串流，牽涉到金錢、需要稽核與對帳的結果用批次。

## 方案比較

| | 批次 | 串流 |
|---|---|---|
| 輸入 | 有邊界：一天、一個月 | 沒有邊界：持續到達 |
| 延遲 | 分鐘到小時 | 毫秒到秒 |
| 正確性 | 輸入固定，容易重跑、容易驗證 | 要處理亂序、遲到、重複 |
| 失敗處理 | 從檢查點重新開始 | 狀態要能復原，輸出要能處理重複 |
| 適合 | 結算、對帳、報表、資料遷移、重新建立索引 | 即時指標、異常偵測、即時推薦、通知 |

講座平台的選擇：講者月結用 Spring Batch，在 replica 上讀取、在 primary 上寫入結算紀錄；熱門榜用 Kafka Streams 消費報名事件，結果寫入另一個 topic，由[即時更新篇](/post/systemdesign/realtime-updates/)的推播服務送到瀏覽器。

## Java 落地

### 1. 月結：Spring Batch 的分塊處理

```sql
CREATE TABLE speaker_settlement (
    speaker_id   BIGINT        NOT NULL,
    settle_month CHAR(7)       NOT NULL,           -- 例如 2026-10
    gross        DECIMAL(12,2) NOT NULL,
    payout       DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (speaker_id, settle_month)
);
```

```java
@Configuration
public class SpeakerSettlementJobConfig {

    @Bean
    Job speakerSettlementJob(JobRepository jobRepository, Step settleSpeakers) {
        return new JobBuilder("speakerSettlement", jobRepository)
                .start(settleSpeakers)
                .build();
    }

    @Bean
    Step settleSpeakers(JobRepository jobRepository, PlatformTransactionManager transactionManager,
                        JdbcPagingItemReader<SpeakerShare> speakerReader,
                        SettlementCalculator calculator,
                        JdbcBatchItemWriter<Settlement> settlementWriter) {
        return new StepBuilder("settleSpeakers", jobRepository)
                .<SpeakerShare, Settlement>chunk(200).transactionManager(transactionManager)
                .reader(speakerReader)
                .processor(calculator)
                .writer(settlementWriter)
                .build();
    }

    @Bean
    @StepScope
    JdbcPagingItemReader<SpeakerShare> speakerReader(@Qualifier("replicaDataSource") DataSource replica) {
        return new JdbcPagingItemReaderBuilder<SpeakerShare>()
                .name("speakerReader")                              // 用來在 ExecutionContext 保存讀取位置
                .dataSource(replica)
                .selectClause("SELECT id, revenue_share")
                .fromClause("FROM speaker")
                .sortKeys(Map.of("id", Order.ASCENDING))            // keyset 分頁，sort key 必須唯一
                .rowMapper((rs, rowNum) -> new SpeakerShare(rs.getLong("id"), rs.getBigDecimal("revenue_share")))
                .pageSize(200)
                .build();
    }

    @Bean
    JdbcBatchItemWriter<Settlement> settlementWriter(DataSource primary) {
        return new JdbcBatchItemWriterBuilder<Settlement>()
                .dataSource(primary)
                .sql("""
                        INSERT INTO speaker_settlement (speaker_id, settle_month, gross, payout)
                        VALUES (:speakerId, :settleMonth, :gross, :payout) AS incoming
                        ON DUPLICATE KEY UPDATE gross = incoming.gross, payout = incoming.payout
                        """)
                .itemSqlParameterSourceProvider(SimplePropertySqlParameterSource::new)
                .build();
    }
}
```

```java
@Component
@StepScope
public class SettlementCalculator implements ItemProcessor<SpeakerShare, Settlement> {

    private final JdbcClient replica;
    private final YearMonth month;

    public SettlementCalculator(@Qualifier("replicaJdbcClient") JdbcClient replica,
                                @Value("#{jobParameters['month']}") String month) {
        this.replica = replica;
        this.month = YearMonth.parse(month);
    }

    @Override
    public Settlement process(SpeakerShare speaker) {
        BigDecimal gross = replica.sql("""
                        SELECT COALESCE(SUM(r.amount), 0)
                          FROM registration r JOIN lecture l ON l.id = r.lecture_id
                         WHERE l.speaker_id = :speakerId AND r.status = 'CONFIRMED'
                           AND r.confirmed_at >= :from AND r.confirmed_at < :to
                        """)
                .param("speakerId", speaker.id())
                .param("from", month.atDay(1).atStartOfDay())
                .param("to", month.plusMonths(1).atDay(1).atStartOfDay())
                .query(BigDecimal.class)
                .single();
        if (gross.signum() == 0) {
            return null;                                            // 回傳 null 代表這位講者沒有結算，不寫入
        }
        BigDecimal payout = gross.multiply(speaker.revenueShare()).setScale(2, RoundingMode.HALF_UP);
        return new Settlement(speaker.id(), month.toString(), gross, payout);
    }
}
```

- 重新啟動與防止重複執行，都依賴 job repository 保存的執行紀錄。Spring Batch 6 預設的 `ResourcelessJobRepository` **不保存任何紀錄**，只適合一次性的工作；月結要改用 JDBC 的 job repository（Spring Boot 的 JDBC store，或 `@EnableJdbcJobRepository`）
- `month` 是**識別參數**：`month=2026-10` 的工作實例成功完成之後，用同樣的參數再啟動會被 Spring Batch 拒絕；失敗的實例再啟動時，會從最後一次提交的分塊繼續
- `JdbcPagingItemReader` 每次提交分塊時，把最後一筆的 sort key 存進 `ExecutionContext`，重新啟動時從那之後讀取
- 即使有人繞過 Spring Batch 重跑，`ON DUPLICATE KEY UPDATE` 的結果也相同，不會多出一份結算
- 金額一律用 `BigDecimal`，不用 `double`
- 讀取走 replica，寫入走 primary。啟動前檢查 replica 的複寫延遲，確定截止時間之前的資料都已經複寫過來

### 2. 熱門榜：Kafka Streams 的滾動視窗

```yaml
spring:
  kafka:
    streams:
      application-id: trending-lectures         # 同時是消費群組的 ID 與內部 topic 的前綴
      properties:
        "[processing.guarantee]": exactly_once_v2
```

```java
@Configuration
@EnableKafkaStreams
public class TrendingLecturesTopology {

    @Bean
    KStream<String, RegistrationEvent> registrationsPerMinute(StreamsBuilder builder,
                                                              Serde<RegistrationEvent> registrationSerde,
                                                              Serde<LectureRate> rateSerde) {
        KStream<String, RegistrationEvent> events =
                builder.stream("registration-events", Consumed.with(Serdes.String(), registrationSerde));

        events.filter((key, event) -> event.type() == RegistrationEvent.Type.CONFIRMED)
                // 原本的 key 是報名 ID，改成講座 ID 分組：Kafka Streams 會建立內部的 repartition topic
                .groupBy((key, event) -> String.valueOf(event.lectureId()),
                        Grouped.with(Serdes.String(), registrationSerde))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(1), Duration.ofSeconds(30)))
                .count(Materialized.as("registrations-per-minute"))
                .toStream()
                .map((window, count) -> KeyValue.pair(window.key(),
                        new LectureRate(window.key(), window.window().startTime(), count)))
                .to("lecture-registration-rate", Produced.with(Serdes.String(), rateSerde));

        return events;
    }
}
```

- 視窗依**事件時間**計算：預設使用 Kafka 記錄上的時間戳，也就是生產者送出時的時間。要用事件內的欄位，就自訂 `TimestampExtractor`
- 寬限期 30 秒：10:00–10:01 的視窗在 10:01:30（以串流時間計）之後關閉，更晚到的事件會被丟棄。熱門榜可以接受，月結不行，這也是月結用批次的原因之一
- 每來一筆事件，視窗的計數就更新一次並往下游送出。熱門榜需要的正是這種持續更新的結果；如果下游只要最終結果（例如發送告警），可以加上 `suppress(Suppressed.untilWindowCloses(...))`
- `exactly_once_v2` 保證「讀取報名事件、更新計數狀態、寫入結果 topic」三者在 Kafka 內部是原子的；讀取 `lecture-registration-rate` 的消費者要設定 `isolation.level=read_committed`。它不涵蓋對外的副作用（[Pub/Sub 篇](/post/systemdesign/pubsub-delivery-semantics/)）
- `Serde` 的定義省略；`registration-events` 的保留期限決定了「重新計算」最遠能回到哪裡

> 以上程式碼依 Spring Batch 6、Spring Boot 4.1、Spring for Apache Kafka 與 Apache Kafka 4.3 官方文件撰寫，沒有實際編譯與執行。SQL 以 MySQL 8.0.19 以上的語法為例。

## 踩坑與 Gotchas

- **批次用 OFFSET 分頁**：越後面越慢，整體是平方等級的成本
- **批次的 sort key 不唯一**：用 `created_at` 排序，同一毫秒的兩筆資料剛好落在分頁的邊界，其中一筆會被跳過或讀兩次
- **批次的輸出不冪等**：重新啟動後，已經提交的分塊又寫一次
- **批次跑在 primary 上**：大量的讀取拖慢線上交易
- **讀取「現在」的資料而不是固定的截止點**：月結在 1 日凌晨跑，結果包含了 1 日凌晨的報名
- **串流用處理時間**：消費者積壓或重啟時，事件被算進錯誤的視窗
- **寬限期太短或太長**：太短，大量遲到的事件被丟棄；太長，狀態變大、結果延遲
- **忽略 repartition 的成本**：`groupBy` 改變了 key，所有事件要再寫入、再讀取一次內部 topic。資料量大時，生產者在一開始就用分組需要的 key，可以省掉這一步
- **以為重播是免費的**：Kappa 架構重新計算時，所有的副作用（通知、寫入外部系統）也會再發生一次，這些下游要冪等，或在重播時關閉
- **串流的結果拿來對帳**：牽涉到金錢、需要稽核的結果，用批次從事實的來源重新計算，而不是累加串流的中間結果

### 資安相關

- **批次工作的權限通常太大**：月結需要讀取所有報名，常見的做法是給它一個什麼都能做的資料庫帳號。實際上它只需要 replica 的唯讀權限，以及結算表的寫入權限。批次工作的帳號被盜用，影響的是全部的資料
- **觸發批次的介面要保護**：透過 HTTP 端點或管理介面啟動批次時，沒有驗證就等於任何人都能重跑月結、觸發撥款，或在尖峰時間啟動大量查詢拖垮資料庫
- **工作參數不能拼進 SQL**：用工作參數動態組出 `whereClause`，就是 SQL injection。一律使用具名參數
- **批次的輸出是大量的資料匯出**：產生的 CSV、報表檔放在共用的儲存位置，等於一份完整的個資或財務資料。要加密、限制存取、設定保存期限，並記錄誰下載了（[Observability 篇](/post/systemdesign/observability/)的稽核紀錄）
- **偽造的時間戳會關閉別人的視窗**：Kafka Streams 的串流時間由看過的最大時間戳推進。能寫入 topic 的攻擊者送出一筆時間戳在一小時後的事件，串流時間就跳到一小時後，之後正常的事件全部被當成遲到而丟棄。限制誰能寫入來源 topic（ACL），在產生事件的地方檢查時間戳的合理範圍，或在 topic 上使用 broker 的寫入時間（`LogAppendTime`）
- **一則壞掉的事件讓整個串流停擺**：反序列化失敗的預設處理是停止。能寫入 topic 的人只要送一則格式錯誤的訊息，就能讓熱門榜停止更新。明確設定反序列化失敗時的處理方式（記錄並跳過，或送到 DLQ），並監控被跳過的數量
- **狀態與內部 topic 也有資料**：Kafka Streams 的本機狀態（RocksDB 檔案）、changelog 與 repartition topic 都包含事件的內容。內部 topic 要有 ACL，本機磁碟要加密，個資不需要進入串流的就不要放進事件
- **重播舊資料要注意權限的變化**：重新播放三個月前的事件時，有些使用者已經刪除帳號、有些講者已經被停權。重新計算的結果不應該讓已刪除的個資重新出現在新的系統裡

## 何時用／何時別用

- **用批次**：輸入有明確的邊界、結果要精確、可以接受分鐘到小時的延遲：結算、對帳、報表、資料遷移、重建搜尋索引
- **用串流**：需要秒級的反應、可以接受近似或持續修正的結果：即時指標、異常偵測、即時推薦、通知
- **重新評估的時機**：批次的執行時間逼近下一次執行的間隔（每小時的批次要跑 50 分鐘），或者業務開始要求「月結的數字也要即時看到」
- **別用串流**：資料量小、每天算一次就夠的報表，用排程的 SQL 或批次就好；串流框架的狀態、分區、重新分配、遲到資料，都是需要維運的複雜度

## 參考資料

- Tyler Akidau, "Streaming 101" 與 "Streaming 102", O'Reilly Radar, 2015–2016：<https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/>
- Tyler Akidau, Slava Chernyak, Reuven Lax, *Streaming Systems*, O'Reilly, 2018
- Jay Kreps, "Questioning the Lambda Architecture", O'Reilly Radar, 2014：<https://www.oreilly.com/radar/questioning-the-lambda-architecture/>
- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017, Chapter 10 "Batch Processing" 與 Chapter 11 "Stream Processing"
- Spring Batch Reference Documentation（Chunk-oriented Processing、JdbcPagingItemReader、Restartability）：<https://docs.spring.io/spring-batch/reference/>
- Apache Kafka Documentation — Kafka Streams Developer Guide（Windowing、Window Final Results）：<https://kafka.apache.org/documentation/streams/developer-guide/dsl-api.html>
- Spring for Apache Kafka Reference — Apache Kafka Streams Support：<https://docs.spring.io/spring-kafka/reference/streams.html>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
