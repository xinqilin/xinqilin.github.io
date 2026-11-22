---
title: "Spring Boot 3 + Virtual Threads 實戰"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "深入解析 Project Loom Virtual Threads 原理，Spring Boot 3.2 啟用方式、Pinning 問題與 ThreadLocal 陷阱的實戰指南"
categories: ["Spring"]
tags: ["Java", "Virtual Threads", "Project Loom", "Spring Boot", "Concurrency"]
aliases:
  - /post/backend/spring-virtual-threads/
---

## 什麼是 Virtual Threads

Java 21 正式引入 Virtual Threads（Project Loom），目的是讓 **I/O-bound** 的應用在不改變同步程式碼風格的前提下，獲得接近非同步的吞吐量。

### Carrier Thread vs Virtual Thread — M:N 調度

```
OS Thread (Carrier Thread) [N 條]
    │
    ├── Virtual Thread 1  (執行中)
    ├── Virtual Thread 2  (等待 I/O，已卸載)
    └── Virtual Thread 3  (等待 I/O，已卸載)
```

- **Platform Thread（傳統）**：1:1 對應 OS thread，每條佔 ~1MB stack，數量上限約數千條。
- **Virtual Thread**：M:N，大量 virtual threads 映射到少量 carrier threads（通常等於 CPU cores）。
- 當 virtual thread 遇到阻塞 I/O，JVM **自動將它從 carrier thread 卸載（unmount）**，carrier thread 可繼續處理其他 virtual threads；I/O 完成後再重新掛載（mount）。

這讓你可以為每個 HTTP 請求建立一條 virtual thread，而不用擔心耗盡 OS threads。

---

## 在 Spring Boot 3.2+ 啟用

### 方式一：yaml 設定（最簡單）

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Spring Boot 會自動將 `TomcatProtocolHandler` 改用 `VirtualThreadExecutor`，Tomcat 每個請求分配一條 virtual thread。

### 方式二：手動設定 Executor

```java
@Configuration
public class ThreadConfig {

    @Bean(name = "virtualThreadExecutor")
    public Executor virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
```

### 確認生效

啟動後用 `jcmd` 確認：

```bash
jcmd <pid> Thread.dump_to_file -format=json /tmp/threads.json
# 看到 virtual=true 的 thread 即為 virtual thread
```

或在 log 中觀察，Spring Boot 會印出 `tomcat-handler-x` 的 virtual thread 字樣。

---

## 效能特性

| 情境 | Virtual Thread 效果 |
|------|-------------------|
| JDBC 查詢（blocking）| 大幅提升吞吐量，因 I/O 等待期間 carrier thread 不閒置 |
| HTTP client（`RestClient`）| 同上 |
| CPU 密集（矩陣運算、影像處理）| **無效甚至退化**，因 carrier thread 本來就在用，不存在「卸載」機會 |
| Sleep / 純等待 | 可大量並發，記憶體佔用遠低於 platform threads |

**經驗法則**：Virtual threads 解決的是「執行緒等待 I/O 時浪費 OS thread」的問題，不是加速 CPU 計算。

---

## 陷阱一：Pinning 問題

### 什麼是 Pinning

Virtual thread 在以下兩種情況會**釘住（pin）** carrier thread，使 carrier thread 無法服務其他 virtual threads：

1. **`synchronized` 區塊 / 方法內發生阻塞**
2. **呼叫 native method**

```java
// 危險：synchronized + 阻塞 I/O = pinning
public synchronized String fetchData() {
    return restClient.get().uri("/api/data").retrieve().body(String.class); // I/O
}
```

若有大量請求同時進入此方法，carrier threads 全部被 pin，吞吐量崩潰。

### 解法：改用 ReentrantLock

```java
private final ReentrantLock lock = new ReentrantLock();

public String fetchData() {
    lock.lock();
    try {
        return restClient.get().uri("/api/data").retrieve().body(String.class);
    } finally {
        lock.unlock();
    }
}
```

`ReentrantLock` 不會造成 pinning，virtual thread 等待鎖時可正常從 carrier thread 卸載。

### 偵測 Pinning

加上 JVM flag，遇到 pinning 時列印警告：

```bash
-Djdk.tracePinnedThreads=full
```

---

## 陷阱二：ThreadLocal 洩漏

### 問題描述

傳統 Platform Thread Pool 中，`ThreadLocal` 值在 thread 歸還到 pool 後若未清除，下一個請求可能讀到舊值。Virtual threads 雖然更輕量，但每條 virtual thread 仍有自己的 `ThreadLocal` map，若無限制地建立 virtual thread 並存放大物件，同樣有記憶體問題。

```java
// 不好的寫法：每條 virtual thread 都把 UserContext 放進 ThreadLocal
ThreadLocal<UserContext> USER_CTX = new ThreadLocal<>();

// 正確做法：用完必須清除
USER_CTX.set(ctx);
try {
    doWork();
} finally {
    USER_CTX.remove(); // 必須
}
```

### Java 21 Preview：ScopedValue

`ScopedValue` 是 `ThreadLocal` 的繼任者，設計給 virtual threads：

```java
// ScopedValue 是不可變的，在 scope 結束後自動清除
static final ScopedValue<UserContext> USER_CTX = ScopedValue.newInstance();

ScopedValue.where(USER_CTX, new UserContext("alice"))
    .run(() -> {
        // 在此 scope 內可讀取
        UserContext ctx = USER_CTX.get();
        doWork(ctx);
    });
// scope 結束後自動清除，無需 finally
```

Java 21 為 preview，Java 23 已 finalized。

---

## 實戰範例：Controller + Service 含阻塞 I/O

```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public OrderDto getOrder(@PathVariable Long id) {
        // 每個請求在獨立 virtual thread 執行，不佔用 carrier thread 在等 DB
        return orderService.findById(id);
    }
}
```

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;

    public OrderService(OrderRepository orderRepository, InventoryClient inventoryClient) {
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
    }

    public OrderDto findById(Long id) {
        // 兩次 I/O：DB + 外部 HTTP，在 virtual thread 中均可阻塞，不浪費 carrier
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));
        InventoryInfo inventory = inventoryClient.getStock(order.getProductId());
        return new OrderDto(order, inventory);
    }
}
```

啟用 `spring.threads.virtual.enabled: true` 後，Tomcat 每個請求跑在獨立 virtual thread，`orderRepository.findById` 阻塞 JDBC 時，carrier thread 自動服務其他請求。

---

## 何時不該用 Virtual Threads

| 情況 | 原因 |
|------|------|
| CPU 密集任務（FFT、影像壓縮）| 沒有 I/O 等待，無法「卸載」，反而增加調度開銷 |
| 大量使用 `synchronized` 的第三方函式庫 | 容易 pinning，需等函式庫升級 |
| native method 密集呼叫 | 同上 |
| 需精確控制並發數的場景 | Virtual thread per task 模型不支援 bounded pool；用 Semaphore 限流 |

---

## 監控

### jcmd Thread dump

```bash
# 以 JSON 格式取 thread dump，含 virtual thread 資訊
jcmd <pid> Thread.dump_to_file -format=json /tmp/threads.json

# 統計 virtual thread 數量
cat /tmp/threads.json | jq '[.threadDump.threads[] | select(.virtual == true)] | length'
```

### JVM Metrics（Micrometer）

```yaml
management:
  metrics:
    enable:
      jvm: true
```

- `jvm.threads.live` — 當前存活 platform threads（virtual threads 不在此計數）
- 觀察 CPU utilization：virtual threads 場景下 CPU 應有更高利用率

---

## 傳統 Threads vs Virtual Threads 比較

| 面向 | Platform Thread | Virtual Thread |
|------|----------------|----------------|
| 建立成本 | 高（OS syscall，~1ms） | 低（純 JVM，~1μs） |
| Stack 大小 | ~1MB（預設） | 初始 ~KB，動態伸縮 |
| 數量上限 | 數千（OS 限制） | 數百萬（記憶體限制） |
| I/O 阻塞行為 | 佔住 OS thread | 自動卸載 |
| 調試工具支援 | 完整 | Java 21+ 已完整支援 |
| `synchronized` pinning | 無此問題 | 需注意 |
| 適合場景 | CPU 密集 | I/O 密集 |

---

## 小結

- **啟用只需一行 yaml**，對現有同步程式碼幾乎零改動。
- **Pinning 是最大風險**：盤點程式碼中 `synchronized` + I/O 的組合，替換為 `ReentrantLock`。
- **ThreadLocal 要清除**，或遷移到 `ScopedValue`（Java 21+）。
- CPU 密集任務繼續用 `ForkJoinPool` 或專用 platform thread pool，不要混用。
