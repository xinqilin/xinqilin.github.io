---
title: "備援、故障轉移與災難復原：從可用性數字到還原演練"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 6：用可用性數字與 RPO、RTO 設計備援，拆解故障轉移的偵測、決策、提升與轉向，說明複寫為何不是備份，以及還原演練與防範勒索軟體"
categories: ["SystemDesign"]
tags: ["System Design", "High Availability", "Failover", "Disaster Recovery", "MySQL", "Security"]
---

> **System Design 系列** Part 6-1｜上一篇：[即時更新](/post/systemdesign/realtime-updates/)｜下一篇：[Timeout、Retry、Backoff 與 Jitter](/post/systemdesign/timeout-retry-backoff/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座平台目前的部署：一個機房（一個可用區，AZ）裡有 4 台應用伺服器、1 台 MySQL primary 加 1 台 replica、1 台 Redis。以下四件事，哪些會讓平台停擺？

1. 一台應用伺服器的硬碟壞了
2. 整個可用區停電
3. 工程師在正式環境執行了少了 `WHERE` 的 `DELETE FROM registration`
4. 攻擊者取得管理員帳號，加密了資料庫，並刪除了備份

第 1 件事，負載平衡器把流量轉到其他 3 台就解決了（[Load Balancing 篇](/post/systemdesign/load-balancing/)）。第 2 件事讓所有東西同時消失。第 3、4 件事更麻煩：機器都好好的，但**資料錯了**，而 replica 在幾毫秒內就忠實地複製了同一個錯誤。

```diagram
title: 一個可用區裡的講座平台
row: LB 負載平衡器 | APP 4 台應用伺服器 | P MySQL primary
row: BK 備份 | RD Redis | R MySQL replica
step: 一台硬碟壞了
  一台應用伺服器的硬碟壞了。負載平衡器把流量轉給其他 3 台，使用者幾乎感覺不到。
LB => APP: 轉給其他 3 台 [ok]
note APP: 一台硬碟壞了
step: 整個可用區停電
  所有機器都在同一個可用區。停電時，應用伺服器、primary、replica、Redis 同時消失，沒有任何一台能接手。
note APP: 停電 [danger]
note P: 停電 [danger]
note RD: 停電 [danger]
note R: 停電 [danger]
step: 少了 WHERE 的 DELETE
  工程師在正式環境執行了少了 WHERE 的 DELETE FROM registration。機器都好好的，但資料錯了，而 replica 在幾毫秒內就忠實地複製了同一個錯誤。
APP -> P: 整表 DELETE [danger]
P -> R: 幾毫秒內照樣複製 [danger]
note R: 一樣被刪光 [danger]
step: 資料庫被加密，備份被刪
  攻擊者取得管理員帳號，加密了資料庫，也刪除了備份。可用性的手段在這裡都幫不上忙，只有攻擊者碰不到的備份能救。
note P: 被加密 [danger]
note R: 也被加密 [danger]
note BK: 備份被刪除 [danger]
```

前兩件事是**可用性**的問題，靠備援與故障轉移解決；後兩件事是**資料正確性**的問題，只有備份能救。這篇把兩者分開談。

## 最簡單的做法與它的極限

- **每天半夜備份一次資料庫，存在同一台機器的另一顆硬碟**：最多遺失 24 小時的報名資料；機器或機房一壞，備份跟著一起消失；而且從來沒有人試過還原要花多久
- **多開幾台機器**：如果它們都在同一個可用區、用同一份設定、同一次部署，就會因為同一個原因一起壞掉

備援要有效，前提是故障**互相獨立**。

## 核心機制

### 可用性的數字

| 可用性 | 每年停機 | 每月停機 |
|---|---|---|
| 99% | 3.65 天 | 7.3 小時 |
| 99.9% | 8.76 小時 | 43.8 分鐘 |
| 99.95% | 4.38 小時 | 21.9 分鐘 |
| 99.99% | 52.6 分鐘 | 4.38 分鐘 |
| 99.999% | 5.26 分鐘 | 26.3 秒 |

**串聯的元件，可用性相乘**。一個報名請求依序經過負載平衡器（99.99%）、應用伺服器（99.9%）、MySQL（99.95%）、Redis（99.9%）：

0.9999 × 0.999 × 0.9995 × 0.999 ≈ 99.74%，一年大約停機 22.8 小時，比任何一個元件都差。每多一個「必須正常」的依賴，整體就更差。

**並聯的元件，不可用的機率相乘**。兩台各自 99% 的伺服器互為備援，兩台同時壞掉的機率是 1% × 1% = 0.01%，可用性 99.99%。但這個計算**假設兩台的故障互相獨立**。同一個可用區的停電、同一次錯誤的部署、同一張過期的憑證，會讓兩台同時壞掉，這時並聯帶來的好處就消失了。所以備援的重點不是「幾台」，而是「是否分散在不同的故障範圍」：不同的可用區、不同的部署批次、不同的設定變更時間。

### 無狀態服務：N+1 與靜態穩定

應用伺服器是無狀態的（[無狀態服務篇](/post/systemdesign/scaling-stateless/)），備援只要多開幾台、分散到多個可用區。關鍵是**容量**：尖峰需要 6 台，分散在 3 個可用區，每區 2 台。一個可用區壞掉，剩下 4 台撐不住尖峰。

要撐過一個可用區故障，每一區都要能承擔 1/(k−1) 的尖峰流量，k 是可用區數：

| 可用區數 | 每區容量 | 總容量（相對於尖峰） |
|---|---|---|
| 2 | 100% | 2 倍 |
| 3 | 50% | 1.5 倍 |
| 4 | 33% | 1.33 倍 |

「壞掉時再自動擴充」聽起來比較省錢，但故障發生時，擴充本身可能也在故障範圍裡：管理介面變慢、同一區域裡所有人都在搶機器。AWS 稱之為**靜態穩定**（static stability）：系統在故障期間不需要做任何變更就能繼續運作，容量事先就準備好。

### 有狀態服務：誰來接手

資料庫的備援比較困難，因為資料只能有一份「正確」的版本：

| 形式 | 做法 | 代價 |
|---|---|---|
| Active-passive（主從） | 一台 primary 接受寫入，replica 隨時準備接手 | 非同步複寫在切換時可能遺失資料（[Replication 篇](/post/systemdesign/replication-lag/)） |
| 共識叢集 | 多數節點確認才算寫入，leader 掛了自動選出新的（[Raft 篇](/post/systemdesign/consensus-raft/)） | 每次寫入多一次網路往返 |
| Active-active（多主） | 每個地點都接受寫入 | 衝突要解決，例如最後寫入者勝出，可能悄悄遺失資料（[CAP 篇](/post/systemdesign/cap-pacelc/)） |

備用節點的「溫度」決定了接手的速度：hot standby 持續同步、隨時可以接手；warm standby 有資料但規模較小，接手前要先擴充；cold standby 只有備份，要從頭建起。

### 故障轉移的四個步驟

```mermaid
flowchart LR
    D[偵測<br/>連續 3 次心跳失敗] --> J[決策<br/>多數同意才切換]
    J --> P[提升<br/>選資料最新的 replica]
    P --> R[轉向<br/>DNS、VIP 或 proxy]
    R --> C[用戶端重連<br/>連線池汰換舊連線]
```

**偵測**：多久沒有回應才算故障？太敏感，網路抖一下就切換，切換本身造成的中斷比原本的問題更大；太遲鈍，停機時間就拉長。常見做法是連續幾次心跳失敗才判定。

**決策**：誰有權判定 primary 已經死了？如果只有一台監控程式，它自己和 primary 之間的網路斷了，就會誤判 primary 死亡，提升 replica。結果兩台都以為自己是 primary，各自接受寫入，這就是**腦裂**（split brain）。避免的方法：

- 由多數決的叢集來決定（etcd、Raft、MySQL Group Replication）
- 提升新的 primary 之前，先**隔離**舊的：把它設成 `super_read_only`、從網路上拿掉，或撤銷它的寫入權限。和[分散式鎖篇](/post/systemdesign/distributed-lock/)的 fencing 是同一個道理：不能只相信「舊的應該已經停了」

**提升**：選擇資料最新的 replica。非同步複寫時，primary 上還沒送出去的交易就遺失了。

**轉向**：讓用戶端連到新的 primary。DNS 要等 TTL 過期，而且用戶端與 JVM 也會快取 DNS；VIP 或資料庫 proxy 切換得比較快，但多了一個元件。最後，**連線池裡的舊連線**還連著舊的 primary，要汰換掉。

四個步驟的時間相加，才是使用者感受到的停機時間。託管的 MySQL（例如 Amazon RDS Multi-AZ），官方文件給的典型故障轉移時間是 60 到 120 秒，這還不包含應用程式這一端汰換連線的時間。

**切回來**（failback）不要自動進行。舊的 primary 恢復時，它的 binlog 裡可能有新 primary 沒有的交易，直接接回去會造成資料不一致。要先比對、處理，再重建成 replica。

### 複寫不是備份

回到第 3 件事。`DELETE FROM registration` 在 primary 上執行，幾毫秒後在每一台 replica 上執行。故障轉移完全幫不上忙，因為每一份副本都是錯的。

- **延遲複寫**：讓一台 replica 刻意延遲一小時套用變更。發現錯誤時，那台 replica 上還保有一小時前的資料，可以停止複寫、取出資料
- **時間點還原**（point-in-time recovery，PITR）：完整備份加上之後的 binlog。先還原最近一次的完整備份，再重播 binlog 到錯誤發生的前一刻
- **3-2-1 原則**：至少 3 份資料、2 種不同的儲存媒介、1 份放在異地

**沒有還原過的備份，等於沒有備份**。還原需要多久，要實際做過才知道。粗估：500 GB 的實體備份，以每秒 200 MB 的速度複製，光是搬資料就要 2,500 秒，大約 42 分鐘，還不包含重播 binlog。如果是 `mysqldump` 這類邏輯備份，還原時要重新建立所有索引，時間會長很多。

### RPO 與 RTO

- **RPO**（Recovery Point Objective）：最多能遺失多久的資料。非同步複寫的 RPO 是複寫延遲；每天備份一次的 RPO 是 24 小時
- **RTO**（Recovery Time Objective）：最多能停機多久

兩個數字由業務決定，而且不同的資料可以有不同的目標：

| 資料 | RPO | RTO | 理由 |
|---|---|---|---|
| 付款紀錄 | 0（遺失的部分可以和金流對帳補回） | 1 小時 | 錢不能算錯 |
| 報名名單 | 1 分鐘 | 15 分鐘 | 講座當天一定要能查詢 |
| 推薦結果、快取 | 不需要 | 不需要 | 可以從原始資料重新產生 |

跨區域的同步複寫通常不切實際：台北到東京的網路往返大約幾十毫秒，每一次寫入都要多等這段時間。所以跨區域的備援幾乎都是非同步的，RPO 大於 0。

### 爆炸半徑與共模故障

備援擋得住「一台壞掉」，擋不住「所有副本因為同一個原因壞掉」：

- 一次錯誤的設定變更同時推送到所有機器
- 一個程式 bug 在特定日期或特定輸入時觸發，所有副本同時當機
- 一張憑證過期，所有服務同時無法連線

對策是**限制爆炸半徑**：部署與設定變更分批進行，先推一個可用區，觀察一段時間再推下一個；系統切成互相獨立的單元（cell），一個單元的問題不影響其他單元。

### 演練

故障轉移的程式碼平常不會執行，所以它幾乎一定有 bug。定期在離峰時間實際切換一次 primary、關掉一個可用區、從備份還原一次，記錄每一步實際花的時間，才知道 RTO 是不是真的做得到。

## 方案比較

以下是 AWS 災難復原白皮書歸納的四種策略，RPO 與 RTO 是大致的數量級：

| 策略 | 平常的狀態 | RPO | RTO | 成本 |
|---|---|---|---|---|
| 備份與還原 | 只有備份在異地 | 小時 | 小時到天 | 低 |
| Pilot light | 異地有持續複寫的資料庫，應用伺服器平常不開 | 分鐘 | 數十分鐘 | 中低 |
| Warm standby | 異地有縮小規模的完整環境 | 秒到分鐘 | 分鐘 | 中高 |
| Multi-site active-active | 多個地點同時服務 | 接近 0 | 接近 0 | 高，還要處理寫入衝突 |

講座平台的選擇：主要區域內跨 3 個可用區部署（應用伺服器 1.5 倍容量，MySQL 用託管的 Multi-AZ）；另一個區域保留每天的完整備份加上持續傳送的 binlog，也就是「備份與還原」再加上接近 pilot light 的資料複寫。整個區域故障的機率很低，用幾小時的 RTO 換取低成本。

## Java 落地

### 1. 讓應用程式撐過資料庫的故障轉移

```yaml
spring:
  datasource:
    url: jdbc:mysql://lectures-db.internal.example.com:3306/lectures
    hikari:
      connection-timeout: 3000     # 故障轉移期間快速失敗，不要讓請求排隊等 30 秒
      max-lifetime: 240000         # 比 MySQL 與中間代理的閒置逾時更短
```

`max-lifetime` 與 `wait_timeout` 的關係，在 [HikariCP 調校篇](/post/database/hikaricp-tuning/)有詳細說明。這裡要補充的是 `connection-timeout`：預設的 30 秒在故障轉移時代表每個請求都卡住 30 秒，執行緒與上游的連線全部被佔住。縮短它，讓請求快速失敗，上游才有機會重試或降級。

```java
public static void main(String[] args) {
    // 故障轉移靠 DNS 指向新的 primary 時，JVM 的 DNS 快取不能比 DNS 紀錄的 TTL 更長
    // 沒有 security manager 時 JDK 預設快取 30 秒，這裡明確寫出，不依賴執行環境的設定
    Security.setProperty("networkaddress.cache.ttl", "30");
    SpringApplication.run(LectureApplication.class, args);
}
```

這個設定必須在第一次 DNS 查詢之前執行，也可以寫在 JDK 的 `java.security` 檔案裡。

### 2. 偵測「連到的已經不是 primary」

故障轉移之後，連線池裡的舊連線可能還連著舊的 primary。舊的 primary 被設成 `super_read_only` 後，寫入會失敗並回傳 MySQL 錯誤碼 1290。偵測到這個錯誤時，讓連線池汰換所有連線：

```java
@RestControllerAdvice
public class DatabaseFailoverAdvice {

    private static final int ER_OPTION_PREVENTS_STATEMENT = 1290;   // 例如 super_read_only 拒絕寫入

    private final HikariDataSource dataSource;

    public DatabaseFailoverAdvice(HikariDataSource dataSource) {
        this.dataSource = dataSource;
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ProblemDetail> handle(DataAccessException e) {
        if (rejectedByReadOnly(e)) {
            // 閒置的連線立即關閉，使用中的連線歸還時關閉；新連線會重新解析 DNS，連到新的 primary
            dataSource.getHikariPoolMXBean().softEvictConnections();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header(HttpHeaders.RETRY_AFTER, "5")
                    .body(ProblemDetail.forStatus(HttpStatus.SERVICE_UNAVAILABLE));
        }
        // 其他資料庫錯誤：不把 SQL 與資料表名稱回傳給用戶端
        return ResponseEntity.internalServerError()
                .body(ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    private static boolean rejectedByReadOnly(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql && sql.getErrorCode() == ER_OPTION_PREVENTS_STATEMENT) {
                return true;
            }
        }
        return false;
    }
}
```

- 回傳 503 加上 `Retry-After`，讓用戶端知道這是暫時的。用戶端重試時要帶上同一個 [Idempotency Key](/post/systemdesign/idempotency-key/)：失敗的交易可能其實已經在舊的 primary 上提交了
- 使用 Amazon Aurora 這類服務時，也可以考慮能感知叢集拓撲的 JDBC driver，切換會更快；但應用程式「快速失敗、汰換連線、安全重試」的原則不變

### 3. Graceful shutdown

Spring Boot 的內嵌伺服器預設就會優雅關閉：停止接受新的請求，等待進行中的請求完成。等待時間由 `spring.lifecycle.timeout-per-shutdown-phase` 設定。搭配 readiness probe 先把自己從負載平衡器移除（[Load Balancing 篇](/post/systemdesign/load-balancing/)），滾動部署與可用區撤離時就不會中斷進行中的報名。

### 4. 延遲複寫與時間點還原

建立一台延遲一小時的 replica：

```sql
STOP REPLICA;
CHANGE REPLICATION SOURCE TO SOURCE_DELAY = 3600;
START REPLICA;
```

發生誤刪時，先在那台 replica 上停止複寫，保住一小時前的資料。如果需要還原到更精確的時間點，就從最近一次的完整備份開始，重播 binlog 到誤刪的前一刻：

```bash
# 在還原用的獨立主機上執行，不要直接對正式環境的 primary 執行
mysqlbinlog --start-position=4 --stop-datetime="2026-11-22 14:02:59" \
    binlog.000123 binlog.000124 | mysql -h restore-host -u restore_admin -p
```

`--start-position` 要換成完整備份記錄下來的 binlog 位置。還原出來的資料先放在另一台主機，確認無誤後，再把需要的資料列搬回正式環境，而不是整個資料庫覆蓋回去：誤刪之後的正常報名也要保留。

> 以上設定與程式碼依 Spring Boot、HikariCP、MySQL 8.4 與 JDK 官方文件撰寫，沒有實際執行。

## 踩坑與 Gotchas

- **只有備份，沒有還原過**：真正需要的那天才發現備份是空的、少了某個資料表、解密金鑰不見了，或者還原要花 12 小時
- **備份和正式環境在同一個故障範圍**：同一個可用區、同一個雲端帳號、同一組管理員權限
- **相信並聯的可用性計算**：兩台在同一個機櫃、同一次部署的伺服器，不是獨立的
- **自動擴充當作備援**：故障時擴充可能失敗，或者搶不到機器。關鍵容量要事先準備
- **故障轉移太敏感**：網路短暫抖動就切換，切換本身造成一分鐘以上的中斷，而且可能來回切換。偵測要有門檻，切換之後要有冷卻時間
- **只把舊 primary 「當成」已經停止**：沒有隔離舊的 primary，它恢復後繼續接受寫入，資料分裂成兩份
- **忘了 DNS 快取與連線池**：DNS 已經指向新的 primary，應用程式還連著舊的
- **RTO 只算資料庫**：資料庫兩分鐘就切換完成，但應用程式重新暖機、快取重建、排隊的訊息消化完，要再加上 20 分鐘
- **災難復原計畫依賴故障的那個區域**：異地復原的步驟需要登入主要區域的管理介面、從主要區域的映像檔倉庫拉取映像檔、讀取主要區域的機密資料

### 資安相關

- **勒索軟體會先找備份**：攻擊者取得管理員權限後，通常先刪除備份，再加密資料。備份要放在**另一個帳號**，用另一組憑證管理；使用不可變的儲存（例如 S3 Object Lock 的 compliance 模式），在保留期限內連管理員都無法刪除或覆寫
- **備份是一份完整的個資副本**：備份的存取控制、加密與稽核要和正式環境一樣嚴格。實務上常見的狀況是正式資料庫管得很嚴，備份卻放在誰都能讀的儲存桶裡
- **加密金鑰也要有災難復原**：備份用 KMS 的金鑰加密，金鑰被刪除或停用，備份就再也無法解密。金鑰的複寫、刪除保護與存取權限，要納入還原演練
- **還原到測試環境**：拿正式備份還原到測試或開發環境除錯，等於把所有使用者的個資複製到防護較弱的環境。要先遮罩或移除個資
- **異地環境的防護要對等**：異地環境的 WAF、存取控制、稽核 log、機密資料輪替如果沒有同步，切換過去就等於關掉了一部分防護
- **緊急存取帳號**：單一登入服務本身故障時，維運人員要有另一種方式登入（break-glass 帳號）。這些帳號的憑證要離線保管、使用時要告警、事後要稽核
- **DNS 是故障轉移的控制點**：能修改 DNS 紀錄的人，可以把流量導到任何地方。DNS 服務的帳號要有多因素驗證，網域在註冊商那邊要開啟轉移鎖定

## 何時用／何時別用

- **一定要做**：分散到多個可用區、定期備份、**定期還原演練**。這是最便宜、效益最高的部分
- **依業務決定**：跨區域的 warm standby 或 active-active。先用 RPO 與 RTO 算出停機與遺失資料的成本，再和備援的成本比較
- **別做**：在還沒有可靠備份與還原流程之前，就投入多區域 active-active。複雜度大增，而且資料正確性的問題（誤刪、勒索）它一個都解決不了

## 參考資料

- AWS Whitepaper — Disaster Recovery of Workloads on AWS: Recovery in the Cloud：<https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-workloads-on-aws.html>
- AWS Builders' Library — Static stability using Availability Zones：<https://aws.amazon.com/builders-library/static-stability-using-availability-zones/>
- Amazon RDS User Guide — Multi-AZ DB instance deployments：<https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html>
- Google, *Site Reliability Engineering*, Chapter 3 "Embracing Risk" 與 Chapter 26 "Data Integrity"：<https://sre.google/sre-book/table-of-contents/>
- MySQL 8.4 Reference Manual — Delayed Replication：<https://dev.mysql.com/doc/refman/8.4/en/replication-delayed.html>
- MySQL 8.4 Reference Manual — Point-in-Time (Incremental) Recovery：<https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html>
- Spring Boot Reference — Graceful Shutdown：<https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html>
- Java SE — Networking Properties（`networkaddress.cache.ttl`）：<https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/net/doc-files/net-properties.html>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
