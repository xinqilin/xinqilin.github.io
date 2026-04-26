---
title: "HikariCP 連線池調校"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "HikariCP 核心參數公式推導、max-lifetime 與 MySQL wait_timeout 的關係，以及洩漏偵測與 Actuator 監控設定"
categories: ["Backend"]
tags: ["HikariCP", "Connection Pool", "Performance", "Spring Boot", "MySQL"]
---

## 為什麼需要連線池

每次建立一條 MySQL 連線涉及：

1. TCP 三向交握
2. MySQL 認證協議（握手、登入封包）
3. SSL 協商（若啟用）

單次耗時 ~5–30ms，在高並發場景下，每個請求都新建連線會讓延遲成為瓶頸。連線池預先建立固定數量的連線並重複使用，消除這段開銷。

另一個角度：**MySQL Server 端的連線數有上限**（`max_connections`，預設 151）。連線池讓多個應用執行緒共享少量資料庫連線。

---

## HikariCP 核心參數

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10       # 連線池最大連線數
      minimum-idle: 5             # 最少保持的閒置連線數
      connection-timeout: 30000   # 向池請求連線的最長等待時間（ms），超過拋出例外
      idle-timeout: 600000        # 閒置連線在池中存活的最長時間（ms），10 分鐘
      max-lifetime: 1800000       # 連線在池中存活的最長時間（ms），30 分鐘
      leak-detection-threshold: 60000  # 連線被借出後超過此時間未歸還，印出警告（ms）
      pool-name: HikariPool-Main
```

---

## maximumPoolSize 公式

HikariCP 官方推薦公式（基於 PostgreSQL 基準測試，MySQL 也適用）：

```
maximumPoolSize = (core_count * 2) + effective_spindle_count
```

- `core_count`：CPU 實體核心數
- `effective_spindle_count`：機械硬碟磁頭數（SSD 填 1）

**範例**：8 核 CPU + SSD → `(8 * 2) + 1 = 17`，向下取整到 10–15 是常見選擇。

### 為什麼不是越大越好

- 連線數增加 → DB Server 內部 mutex 競爭增加
- 過多連線反而讓 DB 的 query 吞吐量下降
- 基準測試一再顯示：小池（10–20）的吞吐量 > 大池（100+）

### 特殊場景調整

| 場景 | 建議 maximumPoolSize |
|------|---------------------|
| Web API（8 核 SSD）| 10–17 |
| 批次作業（高並發 worker）| 依 worker 數量，通常 20–50 |
| 報表系統（長時間查詢）| 5–10（避免佔滿 DB 連線） |
| 微服務（多個 Pod）| 每個 Pod 小池，總和不超過 DB max_connections × 0.8 |

---

## max-lifetime vs MySQL wait_timeout

這是最常見的生產事故根源。

### 問題描述

MySQL 會在連線閒置超過 `wait_timeout`（預設 8 小時，但雲端 MySQL/RDS 常設為 5–10 分鐘）後主動切斷連線。

若 HikariCP 的 `max-lifetime >= wait_timeout`，連線在 MySQL 端已被切斷，但 HikariCP 仍認為該連線有效，下一個請求借走這條「死連線」時就會拋出：

```
com.mysql.cj.jdbc.exceptions.CommunicationsException: Communications link failure
The last packet successfully received from the server was N milliseconds ago.
```

### 解法

```yaml
# MySQL wait_timeout（雲端版通常是 300s = 5 分鐘）
# max-lifetime 必須小於 wait_timeout，保留一些緩衝
spring:
  datasource:
    hikari:
      max-lifetime: 240000  # 4 分鐘，若 wait_timeout 是 5 分鐘
```

**查詢 MySQL wait_timeout**：

```sql
SHOW VARIABLES LIKE 'wait_timeout';
-- Variable_name | Value
-- wait_timeout  | 28800  (秒，= 8 小時，預設)
```

### 完整保護設定

```yaml
spring:
  datasource:
    hikari:
      max-lifetime: 1800000         # 30 min（DB wait_timeout 為 1h 以上時）
      keepalive-time: 600000        # 10 min，定期發送 keepalive query，防止連線被切
      connection-test-query: SELECT 1  # keepalive 用的 SQL（MySQL 適用）
```

`keepalive-time` 會讓 HikariCP 對閒置連線定期執行 `connection-test-query`，確保連線存活。

---

## 洩漏偵測（Leak Detection）

`leak-detection-threshold` 設定後，若有連線被借出超過該時間未歸還，HikariCP 會印出借出時的完整 stack trace：

```
WARN  c.z.h.p.ProxyLeakTask - Connection leak detection triggered for ...
	at com.example.service.ReportService.generateReport(ReportService.java:45)
	at ...
```

這讓你立刻看到問題發生在哪行程式碼。

### 常見洩漏原因

```java
// 洩漏範例：在 @Transactional 內呼叫慢速外部 API
@Transactional
public ReportDto generateReport(Long userId) {
    User user = userRepository.findById(userId).orElseThrow();
    // 此處 DB 連線還被 transaction 持有
    ExternalData data = slowExternalApiClient.fetch(userId); // 可能耗時 30 秒
    // 整段期間 DB 連線都被佔用但沒做 DB 工作
    return buildReport(user, data);
}
```

**修法**：將外部 API 呼叫移到 `@Transactional` 範圍外。

```java
// 正確：先呼叫外部 API，再開 transaction
public ReportDto generateReport(Long userId) {
    ExternalData data = slowExternalApiClient.fetch(userId); // 不在 transaction 內
    return createReportInTransaction(userId, data);
}

@Transactional
private ReportDto createReportInTransaction(Long userId, ExternalData data) {
    User user = userRepository.findById(userId).orElseThrow();
    return buildReport(user, data);
}
```

---

## 監控：Spring Actuator + Micrometer

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, prometheus
  metrics:
    tags:
      application: ${spring.application.name}
```

關鍵指標：

| Metric | 含義 | 警戒值 |
|--------|------|--------|
| `hikaricp.connections.active` | 當前正在使用的連線數 | 接近 maximumPoolSize |
| `hikaricp.connections.pending` | 等待連線的執行緒數 | > 0（表示連線池滿） |
| `hikaricp.connections.idle` | 閒置連線數 | 過多表示池太大 |
| `hikaricp.connections.timeout.total` | 等待超時次數 | > 0 立即調查 |
| `hikaricp.connections.acquire` | 從池取連線的平均耗時 | > 10ms 需關注 |

```bash
# 查看當前 active 連線數
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq '.measurements[0].value'

# 查看 pending（等待中）的執行緒
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.pending | jq '.measurements[0].value'
```

### Prometheus + Grafana 告警規則

```yaml
# alert.yml
- alert: HikariConnectionPoolExhausted
  expr: hikaricp_connections_pending{application="my-service"} > 0
  for: 30s
  labels:
    severity: warning
  annotations:
    summary: "HikariCP connection pool is full"
```

---

## 各場景建議值

| 場景 | maxPoolSize | minIdle | connTimeout | maxLifetime |
|------|-------------|---------|-------------|-------------|
| Spring MVC Web（8 核）| 10 | 5 | 30s | 30min |
| 批次作業（高並發）| 30 | 10 | 60s | 30min |
| 報表系統（長查詢）| 5 | 2 | 60s | 30min |
| 雲端 MySQL（wait_timeout=5min）| 10 | 5 | 30s | **4min** |

---

## 常見錯誤整理

### `Connection is not available, request timed out after 30000ms`

- **原因**：連線池滿，所有連線都在使用中。
- **診斷**：查看 `hikaricp.connections.active` 是否達到 `maximumPoolSize`；啟用 `leak-detection-threshold` 找出誰沒歸還連線。
- **解法**：提高 `maximumPoolSize`（先確認 DB 端能承受）；或找出 long-running transaction。

### `Communications link failure`

- **原因**：MySQL 切斷閒置連線，HikariCP 仍嘗試使用。
- **解法**：降低 `max-lifetime`（小於 MySQL `wait_timeout`）；或設定 `keepalive-time`。

### `@Transactional(readOnly = true)` 仍佔用連線

`readOnly = true` 只是給 JDBC driver 的 hint，不會跳過取連線的步驟。在 `@Transactional` 方法中呼叫耗時外部 API 依然會長時間佔用一條 DB 連線。
