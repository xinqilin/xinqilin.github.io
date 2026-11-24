---
title: "分散式 ID 生成系統：Snowflake 算法與企業級實現"
author: Bill.Lin
date: 2022-09-13T23:05:38+08:00
draft: false
tags: ["Snowflake", "分散式系統", "ID生成", "Spring Boot", "微服務", "高併發", "架構設計"]
description: "深入探討 Twitter Snowflake 分散式 ID 生成算法，包含多種實現方式、Spring Boot 整合、企業級應用場景與最佳實踐"
categories: ["Architecture"]
aliases:
  - /post/Architecture/SnowFlake-DistributionKey/

---

# 分散式 ID 生成系統：Snowflake 算法與企業級實現

## 概述

在分散式系統中，生成全域唯一 ID 是一個關鍵挑戰。不同於單體應用可以依賴資料庫的自增主鍵，分散式系統需要考慮多節點併發、高可用性、效能、順序性等多重需求。Twitter 開源的 Snowflake 算法為這個問題提供了優雅的解決方案。

## 分散式 ID 的核心挑戰

### 傳統方案的局限性

#### UUID 方案
```java
/**
 * 傳統 UUID 生成器
 * 優點：本地生成、無網路依賴、效能高
 * 缺點：無序性、儲存空間大、不適合作為主鍵
 */
public class UUIDGenerator {
    
    public static String generateUUID() {
        return UUID.randomUUID().toString();
        // 範例: 550e8400-e29b-41d4-a716-446655440000
    }
    
    public static String generateCompactUUID() {
        return UUID.randomUUID().toString().replace("-", "");
        // 範例: 550e8400e29b41d4a716446655440000
    }
}
```

#### 資料庫自增方案
```java
/**
 * 資料庫自增 ID 方案
 * 優點：單調遞增、實現簡單
 * 缺點：單點故障、效能瓶頸、難以水平擴展
 */
@Entity
@Table(name = "id_generator")
public class DatabaseIdGenerator {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "stub", unique = true)
    private String stub = "a";
    
    // getter/setter
}

@Repository
public interface IdGeneratorRepository extends JpaRepository<DatabaseIdGenerator, Long> {
    
    @Modifying
    @Query("DELETE FROM DatabaseIdGenerator")
    void clearAll();
}
```

### 分散式 ID 的設計目標

1. **全域唯一性**：在分散式環境下保證 ID 全域唯一
2. **高可用性**：系統故障時仍能正常生成 ID
3. **高效能**：支援高併發場景下的快速生成
4. **遞增性**：保證生成的 ID 具有時間順序性
5. **可擴展性**：支援水平擴展，節點數量可動態調整

## Snowflake 算法深度解析

### 算法核心思想

Snowflake 算法使用 64 位長整型來生成 ID，結構如下：

```
+----------+-------+----------+----------+
| 1bit     | 41bit | 10bit    | 12bit    |
| 符號位   | 時間戳 | 機器 ID  | 序列號   |
+----------+-------+----------+----------+
```

### 位元結構詳細分析

#### 1. 符號位 (1 bit)
- 固定為 0，保證生成的 ID 為正數
- 避免在某些系統中被當作負數處理

#### 2. 時間戳 (41 bit)
```java
/**
 * 時間戳計算邏輯
 * 41 位可表示 2^41 - 1 = 2,199,023,255,551 毫秒
 * 約等於 69.7 年的時間範圍
 */
public class TimestampCalculator {
    
    // 起始時間戳（2015-01-01）
    private static final long EPOCH = 1420041600000L;
    
    public static long calculateTimestamp() {
        return System.currentTimeMillis() - EPOCH;
    }
    
    public static long getMaxTimestamp() {
        return (1L << 41) - 1;
    }
    
    public static double getMaxYears() {
        long maxMillis = getMaxTimestamp();
        return maxMillis / (1000.0 * 60 * 60 * 24 * 365);
    }
}
```

#### 3. 機器 ID (10 bit)
```java
/**
 * 機器 ID 管理
 * 10 位可支援 2^10 = 1024 個節點
 * 通常分為：5 位數據中心 ID + 5 位工作節點 ID
 */
public class MachineIdManager {
    
    private static final long DATACENTER_ID_BITS = 5L;
    private static final long WORKER_ID_BITS = 5L;
    
    public static final long MAX_DATACENTER_ID = (1L << DATACENTER_ID_BITS) - 1;
    public static final long MAX_WORKER_ID = (1L << WORKER_ID_BITS) - 1;
    
    public static void validateDatacenterId(long datacenterId) {
        if (datacenterId > MAX_DATACENTER_ID || datacenterId < 0) {
            throw new IllegalArgumentException(
                String.format("Datacenter ID must be between 0 and %d", MAX_DATACENTER_ID)
            );
        }
    }
    
    public static void validateWorkerId(long workerId) {
        if (workerId > MAX_WORKER_ID || workerId < 0) {
            throw new IllegalArgumentException(
                String.format("Worker ID must be between 0 and %d", MAX_WORKER_ID)
            );
        }
    }
}
```

#### 4. 序列號 (12 bit)
```java
/**
 * 序列號管理
 * 12 位可在同一毫秒內生成 2^12 = 4096 個不同 ID
 */
public class SequenceManager {
    
    private static final long SEQUENCE_BITS = 12L;
    public static final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1;
    
    private long sequence = 0L;
    private long lastTimestamp = -1L;
    
    public synchronized long nextSequence(long timestamp) {
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 序列號溢出，等待下一毫秒
                timestamp = waitForNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }
        
        lastTimestamp = timestamp;
        return sequence;
    }
    
    private long waitForNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}
```

## 核心實現

### 基礎版本實現

```java
/**
 * Snowflake 基礎實現
 * 提供基本的分散式 ID 生成功能
 */
public class BasicSnowflakeIdGenerator {
    
    // 時間戳起始點（2015-01-01）
    private final long epoch = 1420041600000L;
    
    // 各部分位數
    private final long workerIdBits = 5L;
    private final long datacenterIdBits = 5L;
    private final long sequenceBits = 12L;
    
    // 最大值計算
    private final long maxWorkerId = ~(-1L << workerIdBits);
    private final long maxDatacenterId = ~(-1L << datacenterIdBits);
    private final long sequenceMask = ~(-1L << sequenceBits);
    
    // 位移量
    private final long workerIdShift = sequenceBits;
    private final long datacenterIdShift = sequenceBits + workerIdBits;
    private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
    
    // 配置參數
    private final long workerId;
    private final long datacenterId;
    
    // 狀態變數
    private long sequence = 0L;
    private long lastTimestamp = -1L;
    
    public BasicSnowflakeIdGenerator(long workerId, long datacenterId) {
        if (workerId > maxWorkerId || workerId < 0) {
            throw new IllegalArgumentException(
                String.format("Worker ID can't be greater than %d or less than 0", maxWorkerId)
            );
        }
        if (datacenterId > maxDatacenterId || datacenterId < 0) {
            throw new IllegalArgumentException(
                String.format("Datacenter ID can't be greater than %d or less than 0", maxDatacenterId)
            );
        }
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }
    
    /**
     * 生成下一個 ID（線程安全）
     */
    public synchronized long nextId() {
        long timestamp = timeGen();
        
        // 時鐘回撥檢測
        if (timestamp < lastTimestamp) {
            throw new RuntimeException(
                String.format("Clock moved backwards. Refusing to generate id for %d milliseconds", 
                    lastTimestamp - timestamp)
            );
        }
        
        // 同一毫秒內的序列號處理
        if (lastTimestamp == timestamp) {
            sequence = (sequence + 1) & sequenceMask;
            if (sequence == 0) {
                // 序列號溢出，等待下一毫秒
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            // 不同毫秒，序列號重置
            sequence = 0L;
        }
        
        lastTimestamp = timestamp;
        
        // 組裝 64 位 ID
        return ((timestamp - epoch) << timestampLeftShift)
                | (datacenterId << datacenterIdShift)
                | (workerId << workerIdShift)
                | sequence;
    }
    
    /**
     * 等待下一毫秒
     */
    protected long tilNextMillis(long lastTimestamp) {
        long timestamp = timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = timeGen();
        }
        return timestamp;
    }
    
    /**
     * 獲取當前時間戳
     */
    protected long timeGen() {
        return System.currentTimeMillis();
    }
    
    /**
     * 解析 Snowflake ID
     */
    public SnowflakeIdInfo parseId(long id) {
        long timestamp = ((id >> timestampLeftShift) & ((1L << 41) - 1)) + epoch;
        long datacenterId = (id >> datacenterIdShift) & ((1L << datacenterIdBits) - 1);
        long workerId = (id >> workerIdShift) & ((1L << workerIdBits) - 1);
        long sequence = id & sequenceMask;
        
        return new SnowflakeIdInfo(timestamp, datacenterId, workerId, sequence);
    }
    
    /**
     * Snowflake ID 資訊載體
     */
    public static class SnowflakeIdInfo {
        private final long timestamp;
        private final long datacenterId;
        private final long workerId;
        private final long sequence;
        
        public SnowflakeIdInfo(long timestamp, long datacenterId, long workerId, long sequence) {
            this.timestamp = timestamp;
            this.datacenterId = datacenterId;
            this.workerId = workerId;
            this.sequence = sequence;
        }
        
        // getter 方法
        public long getTimestamp() { return timestamp; }
        public long getDatacenterId() { return datacenterId; }
        public long getWorkerId() { return workerId; }
        public long getSequence() { return sequence; }
        
        @Override
        public String toString() {
            return String.format(
                "SnowflakeIdInfo{timestamp=%d (%s), datacenterId=%d, workerId=%d, sequence=%d}",
                timestamp, new Date(timestamp), datacenterId, workerId, sequence
            );
        }
    }
}
```

### 高效能版本實現

```java
/**
 * 高效能 Snowflake 實現
 * 使用 Lock-Free 設計提升併發效能
 */
public class HighPerformanceSnowflakeIdGenerator {
    
    private final long epoch = 1420041600000L;
    private final long workerIdBits = 5L;
    private final long datacenterIdBits = 5L;
    private final long sequenceBits = 12L;
    
    private final long maxWorkerId = ~(-1L << workerIdBits);
    private final long maxDatacenterId = ~(-1L << datacenterIdBits);
    private final long sequenceMask = ~(-1L << sequenceBits);
    
    private final long workerIdShift = sequenceBits;
    private final long datacenterIdShift = sequenceBits + workerIdBits;
    private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
    
    private final long workerId;
    private final long datacenterId;
    
    // 使用 AtomicLong 實現 Lock-Free
    private final AtomicLong sequenceAndTimestamp = new AtomicLong(0L);
    
    public HighPerformanceSnowflakeIdGenerator(long workerId, long datacenterId) {
        if (workerId > maxWorkerId || workerId < 0) {
            throw new IllegalArgumentException("Invalid worker ID");
        }
        if (datacenterId > maxDatacenterId || datacenterId < 0) {
            throw new IllegalArgumentException("Invalid datacenter ID");
        }
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }
    
    public long nextId() {
        while (true) {
            long current = sequenceAndTimestamp.get();
            long currentTimestamp = current >>> 12;
            long currentSequence = current & sequenceMask;
            
            long newTimestamp = System.currentTimeMillis();
            
            if (newTimestamp < currentTimestamp) {
                throw new RuntimeException("Clock moved backwards");
            }
            
            long newSequence;
            if (newTimestamp == currentTimestamp) {
                newSequence = (currentSequence + 1) & sequenceMask;
                if (newSequence == 0) {
                    // 等待下一毫秒
                    newTimestamp = waitForNextMillis(currentTimestamp);
                }
            } else {
                newSequence = 0L;
            }
            
            long newValue = (newTimestamp << 12) | newSequence;
            
            if (sequenceAndTimestamp.compareAndSet(current, newValue)) {
                return ((newTimestamp - epoch) << timestampLeftShift)
                        | (datacenterId << datacenterIdShift)
                        | (workerId << workerIdShift)
                        | newSequence;
            }
        }
    }
    
    private long waitForNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}
```

### 企業級版本實現

```java
/**
 * 企業級 Snowflake 實現
 * 包含監控、配置、容錯等企業特性
 */
@Component
@Slf4j
public class EnterpriseSnowflakeIdGenerator implements IdGenerator {
    
    private final SnowflakeConfig config;
    private final SnowflakeMetrics metrics;
    private final ClockService clockService;
    
    private final long epoch;
    private final long workerId;
    private final long datacenterId;
    
    // 位移和掩碼常量
    private final long sequenceMask = 0xFFF; // 12 位
    private final long workerIdShift = 12L;
    private final long datacenterIdShift = 17L;
    private final long timestampLeftShift = 22L;
    
    // 狀態管理
    private final AtomicLong lastTimestampAndSequence = new AtomicLong(0);
    private final Object lock = new Object();
    
    public EnterpriseSnowflakeIdGenerator(
            SnowflakeConfig config, 
            SnowflakeMetrics metrics,
            ClockService clockService) {
        this.config = config;
        this.metrics = metrics;
        this.clockService = clockService;
        this.epoch = config.getEpoch();
        this.workerId = config.getWorkerId();
        this.datacenterId = config.getDatacenterId();
        
        validateConfiguration();
        log.info("Snowflake ID Generator initialized: workerId={}, datacenterId={}", 
                workerId, datacenterId);
    }
    
    @Override
    public long generateId() {
        return generateId(GenerationContext.DEFAULT);
    }
    
    public long generateId(GenerationContext context) {
        long startTime = System.nanoTime();
        
        try {
            long id = doGenerateId();
            metrics.recordGeneration(System.nanoTime() - startTime, true);
            
            if (context.isLoggingEnabled()) {
                log.debug("Generated ID: {} for context: {}", id, context);
            }
            
            return id;
        } catch (Exception e) {
            metrics.recordGeneration(System.nanoTime() - startTime, false);
            log.error("Failed to generate ID", e);
            throw e;
        }
    }
    
    private long doGenerateId() {
        while (true) {
            long currentValue = lastTimestampAndSequence.get();
            long lastTimestamp = currentValue >>> 12;
            long lastSequence = currentValue & sequenceMask;
            
            long currentTimestamp = getCurrentTimestamp();
            
            // 時鐘回撥處理
            if (currentTimestamp < lastTimestamp) {
                handleClockBackwards(lastTimestamp, currentTimestamp);
                continue;
            }
            
            long sequence;
            if (currentTimestamp == lastTimestamp) {
                sequence = (lastSequence + 1) & sequenceMask;
                if (sequence == 0) {
                    // 序列號用完，等待下一毫秒
                    currentTimestamp = waitForNextMillis(lastTimestamp);
                    metrics.recordSequenceOverflow();
                }
            } else {
                sequence = 0L;
            }
            
            long newValue = (currentTimestamp << 12) | sequence;
            
            if (lastTimestampAndSequence.compareAndSet(currentValue, newValue)) {
                return buildId(currentTimestamp, sequence);
            }
        }
    }
    
    private long buildId(long timestamp, long sequence) {
        return ((timestamp - epoch) << timestampLeftShift)
                | (datacenterId << datacenterIdShift)
                | (workerId << workerIdShift)
                | sequence;
    }
    
    private long getCurrentTimestamp() {
        return clockService.currentTimeMillis();
    }
    
    private void handleClockBackwards(long lastTimestamp, long currentTimestamp) {
        long timeDiff = lastTimestamp - currentTimestamp;
        metrics.recordClockBackwards(timeDiff);
        
        if (timeDiff <= config.getMaxClockBackwardsMs()) {
            log.warn("Clock moved backwards by {} ms, waiting...", timeDiff);
            try {
                Thread.sleep(timeDiff + 1);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while waiting for clock", e);
            }
        } else {
            throw new ClockBackwardsException(
                String.format("Clock moved backwards by %d ms, exceeds max allowed %d ms",
                    timeDiff, config.getMaxClockBackwardsMs())
            );
        }
    }
    
    private long waitForNextMillis(long lastTimestamp) {
        long timestamp = getCurrentTimestamp();
        while (timestamp <= lastTimestamp) {
            timestamp = getCurrentTimestamp();
        }
        return timestamp;
    }
    
    private void validateConfiguration() {
        if (workerId > 31 || workerId < 0) {
            throw new IllegalArgumentException("Worker ID must be between 0 and 31");
        }
        if (datacenterId > 31 || datacenterId < 0) {
            throw new IllegalArgumentException("Datacenter ID must be between 0 and 31");
        }
    }
    
    /**
     * ID 解析功能
     */
    public IdComponents parseId(long id) {
        long timestamp = ((id >> timestampLeftShift) & 0x1FFFFFFFFFFL) + epoch;
        long datacenterId = (id >> datacenterIdShift) & 0x1F;
        long workerId = (id >> workerIdShift) & 0x1F;
        long sequence = id & sequenceMask;
        
        return new IdComponents(timestamp, datacenterId, workerId, sequence);
    }
    
    /**
     * 健康檢查
     */
    public HealthStatus getHealthStatus() {
        try {
            long testId = generateId(GenerationContext.HEALTH_CHECK);
            return HealthStatus.healthy()
                    .withDetail("lastGeneratedId", testId)
                    .withDetail("workerId", workerId)
                    .withDetail("datacenterId", datacenterId)
                    .build();
        } catch (Exception e) {
            return HealthStatus.unhealthy()
                    .withException(e)
                    .build();
        }
    }
    
    // 內部類和接口定義
    public static class GenerationContext {
        public static final GenerationContext DEFAULT = new GenerationContext(false);
        public static final GenerationContext HEALTH_CHECK = new GenerationContext(true);
        
        private final boolean loggingEnabled;
        
        public GenerationContext(boolean loggingEnabled) {
            this.loggingEnabled = loggingEnabled;
        }
        
        public boolean isLoggingEnabled() { return loggingEnabled; }
    }
    
    public static class IdComponents {
        private final long timestamp;
        private final long datacenterId;
        private final long workerId;
        private final long sequence;
        
        public IdComponents(long timestamp, long datacenterId, long workerId, long sequence) {
            this.timestamp = timestamp;
            this.datacenterId = datacenterId;
            this.workerId = workerId;
            this.sequence = sequence;
        }
        
        // getter 方法省略
    }
    
    public static class ClockBackwardsException extends RuntimeException {
        public ClockBackwardsException(String message) {
            super(message);
        }
    }
}

/**
 * 時鐘服務接口
 */
public interface ClockService {
    long currentTimeMillis();
}

@Component
public class SystemClockService implements ClockService {
    @Override
    public long currentTimeMillis() {
        return System.currentTimeMillis();
    }
}

/**
 * 可測試的時鐘服務
 */
@Component
@Profile("test")
public class TestableClockService implements ClockService {
    private final AtomicLong currentTime = new AtomicLong(System.currentTimeMillis());
    
    @Override
    public long currentTimeMillis() {
        return currentTime.get();
    }
    
    public void setCurrentTime(long time) {
        currentTime.set(time);
    }
    
    public void advanceTime(long millis) {
        currentTime.addAndGet(millis);
    }
}
```

## Spring Boot 整合

### 自動配置

```java
/**
 * Snowflake 配置屬性
 */
@ConfigurationProperties(prefix = "snowflake")
@Data
public class SnowflakeProperties {
    
    /**
     * 是否啟用 Snowflake ID 生成器
     */
    private boolean enabled = true;
    
    /**
     * 工作節點 ID (0-31)
     */
    private long workerId = 0;
    
    /**
     * 數據中心 ID (0-31)
     */
    private long datacenterId = 0;
    
    /**
     * 起始時間戳（毫秒）
     */
    private long epoch = 1420041600000L; // 2015-01-01
    
    /**
     * 允許的最大時鐘回撥時間（毫秒）
     */
    private long maxClockBackwardsMs = 5;
    
    /**
     * 是否啟用監控
     */
    private boolean metricsEnabled = true;
    
    /**
     * 工作節點 ID 自動發現配置
     */
    private WorkerIdDiscovery workerIdDiscovery = new WorkerIdDiscovery();
    
    @Data
    public static class WorkerIdDiscovery {
        /**
         * 是否啟用自動發現
         */
        private boolean enabled = false;
        
        /**
         * 發現策略：ip, zookeeper, redis, database
         */
        private String strategy = "ip";
        
        /**
         * ZooKeeper 配置
         */
        private String zookeeperConnect;
        
        /**
         * Redis 配置
         */
        private String redisConnect;
        
        /**
         * 數據庫配置
         */
        private String databaseUrl;
    }
}

/**
 * Snowflake 自動配置類
 */
@Configuration
@EnableConfigurationProperties(SnowflakeProperties.class)
@ConditionalOnProperty(prefix = "snowflake", name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class SnowflakeAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public ClockService clockService() {
        return new SystemClockService();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public SnowflakeMetrics snowflakeMetrics(MeterRegistry meterRegistry) {
        return new MicrometerSnowflakeMetrics(meterRegistry);
    }
    
    @Bean
    @ConditionalOnMissingBean
    public WorkerIdProvider workerIdProvider(SnowflakeProperties properties) {
        if (properties.getWorkerIdDiscovery().isEnabled()) {
            return createDiscoveryBasedProvider(properties.getWorkerIdDiscovery());
        } else {
            return new StaticWorkerIdProvider(
                properties.getWorkerId(), 
                properties.getDatacenterId()
            );
        }
    }
    
    @Bean
    @ConditionalOnMissingBean
    public SnowflakeConfig snowflakeConfig(
            SnowflakeProperties properties,
            WorkerIdProvider workerIdProvider) {
        
        WorkerIdInfo workerIdInfo = workerIdProvider.getWorkerIdInfo();
        
        return SnowflakeConfig.builder()
                .workerId(workerIdInfo.getWorkerId())
                .datacenterId(workerIdInfo.getDatacenterId())
                .epoch(properties.getEpoch())
                .maxClockBackwardsMs(properties.getMaxClockBackwardsMs())
                .build();
    }
    
    @Bean
    @Primary
    public IdGenerator snowflakeIdGenerator(
            SnowflakeConfig config,
            SnowflakeMetrics metrics,
            ClockService clockService) {
        
        log.info("Initializing Snowflake ID Generator with workerId={}, datacenterId={}", 
                config.getWorkerId(), config.getDatacenterId());
        
        return new EnterpriseSnowflakeIdGenerator(config, metrics, clockService);
    }
    
    @Bean
    @ConditionalOnProperty(prefix = "snowflake", name = "metrics-enabled", havingValue = "true")
    public SnowflakeHealthIndicator snowflakeHealthIndicator(IdGenerator idGenerator) {
        return new SnowflakeHealthIndicator((EnterpriseSnowflakeIdGenerator) idGenerator);
    }
    
    private WorkerIdProvider createDiscoveryBasedProvider(SnowflakeProperties.WorkerIdDiscovery discovery) {
        switch (discovery.getStrategy().toLowerCase()) {
            case "ip":
                return new IpBasedWorkerIdProvider();
            case "zookeeper":
                return new ZookeeperWorkerIdProvider(discovery.getZookeeperConnect());
            case "redis":
                return new RedisWorkerIdProvider(discovery.getRedisConnect());
            case "database":
                return new DatabaseWorkerIdProvider(discovery.getDatabaseUrl());
            default:
                throw new IllegalArgumentException("Unknown worker ID discovery strategy: " + discovery.getStrategy());
        }
    }
}

/**
 * Snowflake 配置
 */
@Data
@Builder
public class SnowflakeConfig {
    private final long workerId;
    private final long datacenterId;
    private final long epoch;
    private final long maxClockBackwardsMs;
}

/**
 * 工作節點 ID 提供者接口
 */
public interface WorkerIdProvider {
    WorkerIdInfo getWorkerIdInfo();
}

@Data
@AllArgsConstructor
public class WorkerIdInfo {
    private final long workerId;
    private final long datacenterId;
}

/**
 * 靜態工作節點 ID 提供者
 */
public class StaticWorkerIdProvider implements WorkerIdProvider {
    private final WorkerIdInfo workerIdInfo;
    
    public StaticWorkerIdProvider(long workerId, long datacenterId) {
        this.workerIdInfo = new WorkerIdInfo(workerId, datacenterId);
    }
    
    @Override
    public WorkerIdInfo getWorkerIdInfo() {
        return workerIdInfo;
    }
}

/**
 * 基於 IP 地址的工作節點 ID 提供者
 */
public class IpBasedWorkerIdProvider implements WorkerIdProvider {
    
    @Override
    public WorkerIdInfo getWorkerIdInfo() {
        try {
            String hostAddress = InetAddress.getLocalHost().getHostAddress();
            long workerId = Math.abs(hostAddress.hashCode()) % 32;
            long datacenterId = Math.abs(hostAddress.hashCode() / 32) % 32;
            
            return new WorkerIdInfo(workerId, datacenterId);
        } catch (UnknownHostException e) {
            throw new RuntimeException("Failed to get local host address", e);
        }
    }
}
```

### REST API 整合

```java
/**
 * ID 生成 REST 控制器
 */
@RestController
@RequestMapping("/api/v1/ids")
@Slf4j
public class IdGenerationController {
    
    private final IdGenerator idGenerator;
    private final SnowflakeMetrics metrics;
    
    public IdGenerationController(IdGenerator idGenerator, SnowflakeMetrics metrics) {
        this.idGenerator = idGenerator;
        this.metrics = metrics;
    }
    
    /**
     * 生成單個 ID
     */
    @GetMapping("/generate")
    public ResponseEntity<IdResponse> generateId() {
        long id = idGenerator.generateId();
        return ResponseEntity.ok(new IdResponse(id));
    }
    
    /**
     * 批量生成 ID
     */
    @PostMapping("/generate/batch")
    public ResponseEntity<BatchIdResponse> generateBatch(@RequestBody BatchIdRequest request) {
        int count = Math.min(request.getCount(), 1000); // 限制最大批量數量
        List<Long> ids = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            ids.add(idGenerator.generateId());
        }
        
        return ResponseEntity.ok(new BatchIdResponse(ids));
    }
    
    /**
     * 解析 ID
     */
    @GetMapping("/parse/{id}")
    public ResponseEntity<IdParseResponse> parseId(@PathVariable long id) {
        if (idGenerator instanceof EnterpriseSnowflakeIdGenerator) {
            EnterpriseSnowflakeIdGenerator snowflakeGenerator = 
                (EnterpriseSnowflakeIdGenerator) idGenerator;
            
            EnterpriseSnowflakeIdGenerator.IdComponents components = 
                snowflakeGenerator.parseId(id);
            
            return ResponseEntity.ok(new IdParseResponse(
                id,
                components.getTimestamp(),
                components.getDatacenterId(),
                components.getWorkerId(),
                components.getSequence()
            ));
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * 獲取生成器統計信息
     */
    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats() {
        return ResponseEntity.ok(new StatsResponse(
            metrics.getGeneratedCount(),
            metrics.getFailureCount(),
            metrics.getAverageGenerationTime(),
            metrics.getClockBackwardsCount()
        ));
    }
    
    // DTO 類
    @Data
    @AllArgsConstructor
    public static class IdResponse {
        private long id;
    }
    
    @Data
    public static class BatchIdRequest {
        private int count = 1;
    }
    
    @Data
    @AllArgsConstructor
    public static class BatchIdResponse {
        private List<Long> ids;
    }
    
    @Data
    @AllArgsConstructor
    public static class IdParseResponse {
        private long id;
        private long timestamp;
        private long datacenterId;
        private long workerId;
        private long sequence;
    }
    
    @Data
    @AllArgsConstructor
    public static class StatsResponse {
        private long generatedCount;
        private long failureCount;
        private double averageGenerationTime;
        private long clockBackwardsCount;
    }
}
```

### JPA 整合

```java
/**
 * Snowflake ID 生成器 JPA 整合
 */
@Component
public class SnowflakeIdValueGenerator implements IdentifierGenerator {
    
    private final IdGenerator idGenerator;
    
    public SnowflakeIdValueGenerator(IdGenerator idGenerator) {
        this.idGenerator = idGenerator;
    }
    
    @Override
    public Serializable generate(SharedSessionContractImplementor session, Object object) {
        return idGenerator.generateId();
    }
}

/**
 * 使用自定義 ID 生成器的實體
 */
@Entity
@Table(name = "orders")
public class Order {
    
    @Id
    @GeneratedValue(generator = "snowflake")
    @GenericGenerator(name = "snowflake", strategy = "com.example.id.SnowflakeIdValueGenerator")
    private Long id;
    
    @Column(nullable = false)
    private String orderNumber;
    
    @Column(nullable = false)
    private BigDecimal amount;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    // constructors, getters, setters
}

/**
 * 基於 Snowflake ID 的倉庫
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    /**
     * 根據 ID 範圍查詢（利用 Snowflake ID 的時間順序性）
     */
    @Query("SELECT o FROM Order o WHERE o.id BETWEEN :startId AND :endId")
    List<Order> findByIdRange(@Param("startId") long startId, @Param("endId") long endId);
    
    /**
     * 根據時間範圍查詢（通過解析 Snowflake ID 中的時間戳）
     */
    default List<Order> findByTimeRange(LocalDateTime start, LocalDateTime end) {
        // 需要實現時間戳到 Snowflake ID 的轉換邏輯
        long startId = convertTimestampToSnowflakeId(start);
        long endId = convertTimestampToSnowflakeId(end);
        return findByIdRange(startId, endId);
    }
    
    private long convertTimestampToSnowflakeId(LocalDateTime dateTime) {
        // 實現時間戳轉換邏輯
        long timestamp = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return (timestamp - 1420041600000L) << 22; // 只包含時間戳部分的最小 ID
    }
}
```

## 監控與度量

### Micrometer 整合

```java
/**
 * Snowflake 度量收集器
 */
public interface SnowflakeMetrics {
    void recordGeneration(long durationNanos, boolean success);
    void recordSequenceOverflow();
    void recordClockBackwards(long backwardsMs);
    
    long getGeneratedCount();
    long getFailureCount();
    double getAverageGenerationTime();
    long getClockBackwardsCount();
}

@Component
public class MicrometerSnowflakeMetrics implements SnowflakeMetrics {
    
    private final Counter generatedCounter;
    private final Counter failureCounter;
    private final Timer generationTimer;
    private final Counter sequenceOverflowCounter;
    private final Counter clockBackwardsCounter;
    private final Gauge clockBackwardsGauge;
    
    private final AtomicLong clockBackwardsCount = new AtomicLong(0);
    
    public MicrometerSnowflakeMetrics(MeterRegistry meterRegistry) {
        this.generatedCounter = Counter.builder("snowflake.id.generated")
                .description("Total number of generated IDs")
                .register(meterRegistry);
        
        this.failureCounter = Counter.builder("snowflake.id.generation.failures")
                .description("Total number of ID generation failures")
                .register(meterRegistry);
        
        this.generationTimer = Timer.builder("snowflake.id.generation.time")
                .description("Time taken to generate an ID")
                .register(meterRegistry);
        
        this.sequenceOverflowCounter = Counter.builder("snowflake.sequence.overflow")
                .description("Total number of sequence overflows")
                .register(meterRegistry);
        
        this.clockBackwardsCounter = Counter.builder("snowflake.clock.backwards")
                .description("Total number of clock backwards events")
                .register(meterRegistry);
        
        this.clockBackwardsGauge = Gauge.builder("snowflake.clock.backwards.count")
                .description("Current count of clock backwards events")
                .register(meterRegistry, clockBackwardsCount, AtomicLong::get);
    }
    
    @Override
    public void recordGeneration(long durationNanos, boolean success) {
        if (success) {
            generatedCounter.increment();
        } else {
            failureCounter.increment();
        }
        generationTimer.record(durationNanos, TimeUnit.NANOSECONDS);
    }
    
    @Override
    public void recordSequenceOverflow() {
        sequenceOverflowCounter.increment();
    }
    
    @Override
    public void recordClockBackwards(long backwardsMs) {
        clockBackwardsCounter.increment();
        clockBackwardsCount.incrementAndGet();
    }
    
    @Override
    public long getGeneratedCount() {
        return (long) generatedCounter.count();
    }
    
    @Override
    public long getFailureCount() {
        return (long) failureCounter.count();
    }
    
    @Override
    public double getAverageGenerationTime() {
        return generationTimer.mean(TimeUnit.MILLISECONDS);
    }
    
    @Override
    public long getClockBackwardsCount() {
        return clockBackwardsCount.get();
    }
}
```

### 健康檢查

```java
/**
 * Snowflake 健康檢查指示器
 */
@Component
public class SnowflakeHealthIndicator implements HealthIndicator {
    
    private final EnterpriseSnowflakeIdGenerator idGenerator;
    
    public SnowflakeHealthIndicator(EnterpriseSnowflakeIdGenerator idGenerator) {
        this.idGenerator = idGenerator;
    }
    
    @Override
    public Health health() {
        try {
            Health.Builder builder = new Health.Builder();
            
            // 測試 ID 生成
            long testId = idGenerator.generateId();
            EnterpriseSnowflakeIdGenerator.IdComponents components = 
                idGenerator.parseId(testId);
            
            builder.up()
                    .withDetail("status", "UP")
                    .withDetail("lastGeneratedId", testId)
                    .withDetail("workerId", components.getWorkerId())
                    .withDetail("datacenterId", components.getDatacenterId())
                    .withDetail("timestamp", new Date(components.getTimestamp()))
                    .withDetail("sequence", components.getSequence());
            
            return builder.build();
            
        } catch (Exception e) {
            return Health.down()
                    .withDetail("status", "DOWN")
                    .withDetail("error", e.getMessage())
                    .withException(e)
                    .build();
        }
    }
}
```

## 企業級應用場景

### 訂單系統實現

```java
/**
 * 基於 Snowflake ID 的訂單服務
 */
@Service
@Transactional
@Slf4j
public class OrderService {
    
    private final IdGenerator idGenerator;
    private final OrderRepository orderRepository;
    private final OrderEventPublisher eventPublisher;
    
    public OrderService(
            IdGenerator idGenerator,
            OrderRepository orderRepository,
            OrderEventPublisher eventPublisher) {
        this.idGenerator = idGenerator;
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }
    
    /**
     * 創建訂單
     */
    public Order createOrder(CreateOrderRequest request) {
        // 生成訂單 ID
        long orderId = idGenerator.generateId();
        
        // 生成訂單號（基於 ID 的友好格式）
        String orderNumber = generateOrderNumber(orderId);
        
        Order order = Order.builder()
                .id(orderId)
                .orderNumber(orderNumber)
                .customerId(request.getCustomerId())
                .amount(request.getAmount())
                .status(OrderStatus.PENDING)
                .items(request.getItems())
                .build();
        
        order = orderRepository.save(order);
        
        // 發布事件
        eventPublisher.publishOrderCreated(order);
        
        log.info("Created order: id={}, orderNumber={}, amount={}", 
                orderId, orderNumber, request.getAmount());
        
        return order;
    }
    
    /**
     * 批量創建訂單（高併發場景）
     */
    public List<Order> createOrdersBatch(List<CreateOrderRequest> requests) {
        List<Order> orders = requests.parallelStream()
                .map(this::createOrder)
                .collect(Collectors.toList());
        
        log.info("Created {} orders in batch", orders.size());
        return orders;
    }
    
    /**
     * 根據時間範圍查詢訂單（利用 Snowflake ID 的時間順序性）
     */
    public List<Order> findOrdersByTimeRange(LocalDateTime start, LocalDateTime end) {
        long startId = convertTimestampToMinSnowflakeId(start);
        long endId = convertTimestampToMaxSnowflakeId(end);
        
        return orderRepository.findByIdBetween(startId, endId);
    }
    
    /**
     * 生成友好的訂單號
     */
    private String generateOrderNumber(long orderId) {
        // 格式：ORD + 年月日 + ID 後8位
        LocalDate today = LocalDate.now();
        String dateStr = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String idSuffix = String.valueOf(orderId % 100000000); // 取後8位
        
        return String.format("ORD%s%08d", dateStr, Long.parseLong(idSuffix));
    }
    
    private long convertTimestampToMinSnowflakeId(LocalDateTime dateTime) {
        long timestamp = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return ((timestamp - 1420041600000L) << 22); // 最小可能的 ID
    }
    
    private long convertTimestampToMaxSnowflakeId(LocalDateTime dateTime) {
        long timestamp = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return ((timestamp - 1420041600000L) << 22) | 0x3FFFFF; // 最大可能的 ID
    }
}

/**
 * 訂單事件發布器
 */
@Component
public class OrderEventPublisher {
    
    private final ApplicationEventPublisher eventPublisher;
    
    public OrderEventPublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }
    
    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(this, order);
        eventPublisher.publishEvent(event);
    }
    
    public static class OrderCreatedEvent extends ApplicationEvent {
        private final Order order;
        
        public OrderCreatedEvent(Object source, Order order) {
            super(source);
            this.order = order;
        }
        
        public Order getOrder() {
            return order;
        }
    }
}
```

### 用戶追踪系統

```java
/**
 * 基於 Snowflake ID 的用戶行為追踪系統
 */
@Service
@Slf4j
public class UserTrackingService {
    
    private final IdGenerator idGenerator;
    private final UserActionRepository actionRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    
    public UserTrackingService(
            IdGenerator idGenerator,
            UserActionRepository actionRepository,
            RedisTemplate<String, Object> redisTemplate) {
        this.idGenerator = idGenerator;
        this.actionRepository = actionRepository;
        this.redisTemplate = redisTemplate;
    }
    
    /**
     * 記錄用戶行為
     */
    @Async
    public CompletableFuture<Void> trackUserAction(UserActionRequest request) {
        long actionId = idGenerator.generateId();
        
        UserAction action = UserAction.builder()
                .id(actionId)
                .userId(request.getUserId())
                .actionType(request.getActionType())
                .resource(request.getResource())
                .timestamp(Instant.now())
                .metadata(request.getMetadata())
                .sessionId(request.getSessionId())
                .userAgent(request.getUserAgent())
                .ipAddress(request.getIpAddress())
                .build();
        
        // 異步保存到數據庫
        actionRepository.save(action);
        
        // 更新實時統計（Redis）
        updateRealTimeStats(action);
        
        log.debug("Tracked user action: id={}, userId={}, type={}", 
                actionId, request.getUserId(), request.getActionType());
        
        return CompletableFuture.completedFuture(null);
    }
    
    /**
     * 批量追踪（高吞吐量場景）
     */
    @Async
    public CompletableFuture<Void> trackUserActionsBatch(List<UserActionRequest> requests) {
        List<UserAction> actions = requests.parallelStream()
                .map(request -> {
                    long actionId = idGenerator.generateId();
                    return UserAction.builder()
                            .id(actionId)
                            .userId(request.getUserId())
                            .actionType(request.getActionType())
                            .resource(request.getResource())
                            .timestamp(Instant.now())
                            .metadata(request.getMetadata())
                            .build();
                })
                .collect(Collectors.toList());
        
        // 批量保存
        actionRepository.saveAll(actions);
        
        // 批量更新統計
        actions.forEach(this::updateRealTimeStats);
        
        log.info("Tracked {} user actions in batch", actions.size());
        
        return CompletableFuture.completedFuture(null);
    }
    
    /**
     * 查詢用戶行為軌跡
     */
    public List<UserAction> getUserActionTrail(Long userId, LocalDateTime start, LocalDateTime end) {
        // 利用 Snowflake ID 的時間順序性進行高效查詢
        long startId = convertTimestampToSnowflakeIdRange(start).getFirst();
        long endId = convertTimestampToSnowflakeIdRange(end).getSecond();
        
        return actionRepository.findByUserIdAndIdBetween(userId, startId, endId);
    }
    
    private void updateRealTimeStats(UserAction action) {
        String key = "user_stats:" + action.getUserId() + ":" + 
                     LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        
        redisTemplate.opsForHash().increment(key, "total_actions", 1);
        redisTemplate.opsForHash().increment(key, action.getActionType().name(), 1);
        redisTemplate.expire(key, Duration.ofDays(7));
    }
    
    private Pair<Long, Long> convertTimestampToSnowflakeIdRange(LocalDateTime dateTime) {
        long timestamp = dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long baseId = (timestamp - 1420041600000L) << 22;
        return Pair.of(baseId, baseId | 0x3FFFFF);
    }
}

@Entity
@Table(name = "user_actions", indexes = {
    @Index(name = "idx_user_id_id", columnList = "userId,id"),
    @Index(name = "idx_action_type", columnList = "actionType"),
    @Index(name = "idx_timestamp", columnList = "timestamp")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAction {
    
    @Id
    private Long id; // Snowflake ID
    
    @Column(nullable = false)
    private Long userId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionType actionType;
    
    @Column(nullable = false)
    private String resource;
    
    @Column(nullable = false)
    private Instant timestamp;
    
    @Column(columnDefinition = "TEXT")
    private String metadata;
    
    private String sessionId;
    private String userAgent;
    private String ipAddress;
}

public enum ActionType {
    LOGIN, LOGOUT, VIEW_PAGE, CLICK_BUTTON, SUBMIT_FORM, 
    PURCHASE, SEARCH, DOWNLOAD, UPLOAD, SHARE
}
```

### 分散式鎖實現

```java
/**
 * 基於 Snowflake ID 的分散式鎖實現
 */
@Component
@Slf4j
public class SnowflakeDistributedLock {
    
    private final IdGenerator idGenerator;
    private final RedisTemplate<String, Object> redisTemplate;
    private final StringRedisTemplate stringRedisTemplate;
    
    public SnowflakeDistributedLock(
            IdGenerator idGenerator,
            RedisTemplate<String, Object> redisTemplate,
            StringRedisTemplate stringRedisTemplate) {
        this.idGenerator = idGenerator;
        this.redisTemplate = redisTemplate;
        this.stringRedisTemplate = stringRedisTemplate;
    }
    
    /**
     * 獲取分散式鎖
     */
    public DistributedLockResult acquireLock(String lockKey, Duration timeout) {
        long lockId = idGenerator.generateId();
        String lockValue = String.valueOf(lockId);
        
        long startTime = System.currentTimeMillis();
        long timeoutMs = timeout.toMillis();
        
        while (System.currentTimeMillis() - startTime < timeoutMs) {
            Boolean acquired = stringRedisTemplate.opsForValue()
                    .setIfAbsent(lockKey, lockValue, timeout);
            
            if (Boolean.TRUE.equals(acquired)) {
                log.debug("Acquired lock: key={}, id={}", lockKey, lockId);
                return DistributedLockResult.success(lockKey, lockId);
            }
            
            try {
                Thread.sleep(50); // 短暫等待後重試
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return DistributedLockResult.failure("Interrupted while waiting for lock");
            }
        }
        
        return DistributedLockResult.failure("Failed to acquire lock within timeout");
    }
    
    /**
     * 釋放分散式鎖
     */
    public boolean releaseLock(String lockKey, long lockId) {
        String script = 
                "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                "    return redis.call('del', KEYS[1]) " +
                "else " +
                "    return 0 " +
                "end";
        
        Long result = stringRedisTemplate.execute(
                new DefaultRedisScript<>(script, Long.class),
                Collections.singletonList(lockKey),
                String.valueOf(lockId)
        );
        
        boolean released = result != null && result == 1;
        if (released) {
            log.debug("Released lock: key={}, id={}", lockKey, lockId);
        }
        
        return released;
    }
    
    /**
     * 使用分散式鎖執行業務邏輯
     */
    public <T> T executeWithLock(String lockKey, Duration timeout, Supplier<T> business) {
        DistributedLockResult lockResult = acquireLock(lockKey, timeout);
        if (!lockResult.isSuccess()) {
            throw new DistributedLockException("Failed to acquire lock: " + lockResult.getErrorMessage());
        }
        
        try {
            return business.get();
        } finally {
            releaseLock(lockKey, lockResult.getLockId());
        }
    }
    
    @Data
    @AllArgsConstructor
    public static class DistributedLockResult {
        private final boolean success;
        private final String lockKey;
        private final long lockId;
        private final String errorMessage;
        
        public static DistributedLockResult success(String lockKey, long lockId) {
            return new DistributedLockResult(true, lockKey, lockId, null);
        }
        
        public static DistributedLockResult failure(String errorMessage) {
            return new DistributedLockResult(false, null, 0, errorMessage);
        }
    }
    
    public static class DistributedLockException extends RuntimeException {
        public DistributedLockException(String message) {
            super(message);
        }
    }
}
```

## 其他分散式 ID 解決方案

### 美團 Leaf 算法

```java
/**
 * 美團 Leaf Segment 模式實現
 * 解決 Snowflake 時鐘回撥問題
 */
@Service
@Slf4j
public class LeafSegmentIdGenerator implements IdGenerator {
    
    private final SegmentRepository segmentRepository;
    private final Map<String, SegmentBuffer> segmentBuffers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService updateExecutor = Executors.newScheduledThreadPool(5);
    
    public LeafSegmentIdGenerator(SegmentRepository segmentRepository) {
        this.segmentRepository = segmentRepository;
        initializeSegments();
    }
    
    @Override
    public long generateId() {
        return generateId("default");
    }
    
    public long generateId(String bizType) {
        SegmentBuffer buffer = segmentBuffers.get(bizType);
        if (buffer == null) {
            throw new IllegalArgumentException("Unknown business type: " + bizType);
        }
        
        return buffer.nextId();
    }
    
    private void initializeSegments() {
        List<SegmentAllocation> allocations = segmentRepository.findAll();
        for (SegmentAllocation allocation : allocations) {
            SegmentBuffer buffer = new SegmentBuffer(allocation);
            segmentBuffers.put(allocation.getBizType(), buffer);
            
            // 異步更新機制
            updateExecutor.scheduleWithFixedDelay(
                () -> buffer.asyncUpdateSegment(segmentRepository),
                0, 1, TimeUnit.MINUTES
            );
        }
    }
    
    /**
     * 號段緩衝區
     */
    public static class SegmentBuffer {
        private final String bizType;
        private volatile Segment currentSegment;
        private volatile Segment nextSegment;
        private final AtomicBoolean isUpdating = new AtomicBoolean(false);
        
        public SegmentBuffer(SegmentAllocation allocation) {
            this.bizType = allocation.getBizType();
            this.currentSegment = new Segment(allocation);
        }
        
        public long nextId() {
            while (true) {
                if (currentSegment.hasRemaining()) {
                    return currentSegment.nextId();
                }
                
                synchronized (this) {
                    if (nextSegment != null) {
                        currentSegment = nextSegment;
                        nextSegment = null;
                        continue;
                    } else {
                        throw new RuntimeException("No available segment for " + bizType);
                    }
                }
            }
        }
        
        public void asyncUpdateSegment(SegmentRepository repository) {
            if (currentSegment.reachUpdateThreshold() && isUpdating.compareAndSet(false, true)) {
                try {
                    SegmentAllocation newAllocation = repository.getNextSegment(bizType);
                    nextSegment = new Segment(newAllocation);
                    log.debug("Updated segment for {}: {}", bizType, newAllocation);
                } catch (Exception e) {
                    log.error("Failed to update segment for " + bizType, e);
                } finally {
                    isUpdating.set(false);
                }
            }
        }
    }
    
    /**
     * 號段
     */
    public static class Segment {
        private final long start;
        private final long end;
        private final AtomicLong current;
        private final int step;
        
        public Segment(SegmentAllocation allocation) {
            this.start = allocation.getCurrentValue();
            this.step = allocation.getStep();
            this.end = start + step - 1;
            this.current = new AtomicLong(start);
        }
        
        public boolean hasRemaining() {
            return current.get() <= end;
        }
        
        public long nextId() {
            long id = current.getAndIncrement();
            if (id > end) {
                throw new RuntimeException("Segment exhausted");
            }
            return id;
        }
        
        public boolean reachUpdateThreshold() {
            return current.get() >= start + step * 0.9; // 90% 使用時觸發更新
        }
    }
}

@Entity
@Table(name = "leaf_alloc")
@Data
public class SegmentAllocation {
    
    @Id
    private String bizType;
    
    @Column(name = "max_id")
    private Long currentValue;
    
    private Integer step;
    
    @Column(name = "update_time")
    private LocalDateTime updateTime;
    
    private String description;
}

@Repository
public interface SegmentRepository extends JpaRepository<SegmentAllocation, String> {
    
    @Modifying
    @Query("UPDATE SegmentAllocation s SET s.currentValue = s.currentValue + s.step, " +
           "s.updateTime = CURRENT_TIMESTAMP WHERE s.bizType = :bizType")
    int updateMaxId(@Param("bizType") String bizType);
    
    @Transactional
    default SegmentAllocation getNextSegment(String bizType) {
        int updated = updateMaxId(bizType);
        if (updated == 0) {
            throw new RuntimeException("Failed to update segment for " + bizType);
        }
        return findById(bizType).orElseThrow();
    }
}
```

### 百度 UidGenerator

```java
/**
 * 百度 UidGenerator 緩存實現
 * 解決 Snowflake 效能問題
 */
@Component
@Slf4j
public class CachedUidGenerator implements IdGenerator {
    
    private final UidGeneratorConfig config;
    private final RingBuffer ringBuffer;
    private final ScheduledExecutorService scheduleExecutor;
    
    public CachedUidGenerator(UidGeneratorConfig config) {
        this.config = config;
        this.ringBuffer = new RingBuffer(config.getBufferSize());
        this.scheduleExecutor = Executors.newSingleThreadScheduledExecutor(
            r -> new Thread(r, "CachedUidGenerator-producer")
        );
        
        // 啟動後台生產者
        startBufferProducer();
    }
    
    @Override
    public long generateId() {
        try {
            return ringBuffer.take();
        } catch (Exception e) {
            log.error("Failed to take UID from buffer", e);
            throw new RuntimeException("Failed to generate UID", e);
        }
    }
    
    private void startBufferProducer() {
        scheduleExecutor.scheduleWithFixedDelay(this::fillBuffer, 0, 1, TimeUnit.SECONDS);
    }
    
    private void fillBuffer() {
        try {
            ringBuffer.fillWithMutex(() -> {
                long uid = generateUidDirectly();
                log.debug("Generated UID for buffer: {}", uid);
                return uid;
            });
        } catch (Exception e) {
            log.error("Failed to fill buffer", e);
        }
    }
    
    private long generateUidDirectly() {
        // 直接生成 UID，類似 Snowflake 算法
        long timestamp = System.currentTimeMillis();
        return ((timestamp - config.getEpoch()) << config.getTimestampBits())
                | (config.getWorkerId() << config.getWorkerIdBits())
                | getSequence();
    }
    
    private long getSequence() {
        // 簡化的序列號生成邏輯
        return System.nanoTime() % 4096;
    }
    
    /**
     * 環形緩衝區
     */
    public static class RingBuffer {
        private final long[] slots;
        private final int size;
        private final AtomicLong cursor = new AtomicLong(0);
        private final Object mutex = new Object();
        
        public RingBuffer(int size) {
            this.size = size;
            this.slots = new long[size];
        }
        
        public long take() {
            long index = cursor.getAndIncrement() % size;
            long uid = slots[(int) index];
            if (uid == 0) {
                throw new RuntimeException("Buffer is empty");
            }
            return uid;
        }
        
        public void fillWithMutex(Supplier<Long> uidSupplier) {
            synchronized (mutex) {
                for (int i = 0; i < size; i++) {
                    if (slots[i] == 0) {
                        slots[i] = uidSupplier.get();
                    }
                }
            }
        }
    }
    
    @Data
    @ConfigurationProperties(prefix = "uid-generator")
    public static class UidGeneratorConfig {
        private long epoch = 1420041600000L;
        private int timestampBits = 28;
        private int workerIdBits = 22;
        private int sequenceBits = 13;
        private long workerId = 1;
        private int bufferSize = 8192;
    }
}
```

## 測試策略

### 單元測試

```java
/**
 * Snowflake ID 生成器單元測試
 */
@ExtendWith(MockitoExtension.class)
class SnowflakeIdGeneratorTest {
    
    @Mock
    private ClockService clockService;
    
    @Mock
    private SnowflakeMetrics metrics;
    
    private SnowflakeConfig config;
    private EnterpriseSnowflakeIdGenerator generator;
    
    @BeforeEach
    void setUp() {
        config = SnowflakeConfig.builder()
                .workerId(1)
                .datacenterId(1)
                .epoch(1420041600000L)
                .maxClockBackwardsMs(5)
                .build();
        
        generator = new EnterpriseSnowflakeIdGenerator(config, metrics, clockService);
    }
    
    @Test
    @DisplayName("應該生成唯一的 ID")
    void shouldGenerateUniqueIds() {
        // Given
        when(clockService.currentTimeMillis()).thenReturn(1420041700000L);
        
        // When
        Set<Long> generatedIds = IntStream.range(0, 1000)
                .mapToLong(i -> generator.generateId())
                .boxed()
                .collect(Collectors.toSet());
        
        // Then
        assertThat(generatedIds).hasSize(1000);
    }
    
    @Test
    @DisplayName("應該在同一毫秒內生成遞增的序列號")
    void shouldGenerateIncreasingSequenceInSameMillisecond() {
        // Given
        when(clockService.currentTimeMillis()).thenReturn(1420041700000L);
        
        // When
        List<Long> ids = IntStream.range(0, 10)
                .mapToLong(i -> generator.generateId())
                .boxed()
                .collect(Collectors.toList());
        
        // Then
        List<Long> sequences = ids.stream()
                .map(id -> id & 0xFFF) // 提取序列號
                .collect(Collectors.toList());
        
        assertThat(sequences).isStrictlyIncreasing();
    }
    
    @Test
    @DisplayName("應該正確解析 ID 組成部分")
    void shouldCorrectlyParseIdComponents() {
        // Given
        when(clockService.currentTimeMillis()).thenReturn(1420041700000L);
        long id = generator.generateId();
        
        // When
        EnterpriseSnowflakeIdGenerator.IdComponents components = generator.parseId(id);
        
        // Then
        assertThat(components.getTimestamp()).isEqualTo(1420041700000L);
        assertThat(components.getWorkerId()).isEqualTo(1);
        assertThat(components.getDatacenterId()).isEqualTo(1);
        assertThat(components.getSequence()).isEqualTo(0);
    }
    
    @Test
    @DisplayName("應該在時鐘回撥時拋出異常")
    void shouldThrowExceptionOnClockBackwards() {
        // Given
        when(clockService.currentTimeMillis())
                .thenReturn(1420041700000L)  // 第一次調用
                .thenReturn(1420041699000L); // 第二次調用（時鐘回撥）
        
        // When & Then
        generator.generateId(); // 第一次正常
        
        assertThatThrownBy(() -> generator.generateId())
                .isInstanceOf(EnterpriseSnowflakeIdGenerator.ClockBackwardsException.class)
                .hasMessageContaining("Clock moved backwards");
    }
    
    @Test
    @DisplayName("應該在序列號溢出時等待下一毫秒")
    void shouldWaitForNextMillisecondOnSequenceOverflow() {
        // Given
        when(clockService.currentTimeMillis())
                .thenReturn(1420041700000L) // 初始時間
                .thenReturn(1420041700001L); // 下一毫秒
        
        // 模擬序列號即將溢出的場景
        // 生成 4095 個 ID（序列號 0-4094）
        IntStream.range(0, 4095).forEach(i -> generator.generateId());
        
        // When
        long overflowId = generator.generateId(); // 這應該觸發等待下一毫秒
        
        // Then
        EnterpriseSnowflakeIdGenerator.IdComponents components = generator.parseId(overflowId);
        assertThat(components.getTimestamp()).isEqualTo(1420041700001L);
        assertThat(components.getSequence()).isEqualTo(0); // 新毫秒，序列號重置
    }
    
    @Test
    @DisplayName("應該記錄生成度量")
    void shouldRecordGenerationMetrics() {
        // Given
        when(clockService.currentTimeMillis()).thenReturn(1420041700000L);
        
        // When
        generator.generateId();
        
        // Then
        verify(metrics).recordGeneration(anyLong(), eq(true));
    }
}

/**
 * 性能測試
 */
@ExtendWith(MockitoExtension.class)
class SnowflakePerformanceTest {
    
    private EnterpriseSnowflakeIdGenerator generator;
    
    @BeforeEach
    void setUp() {
        SnowflakeConfig config = SnowflakeConfig.builder()
                .workerId(1)
                .datacenterId(1)
                .epoch(1420041600000L)
                .maxClockBackwardsMs(5)
                .build();
        
        generator = new EnterpriseSnowflakeIdGenerator(
                config, 
                new NoOpSnowflakeMetrics(), 
                new SystemClockService()
        );
    }
    
    @Test
    @DisplayName("單線程性能測試")
    void singleThreadPerformanceTest() {
        int iterations = 100_000;
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < iterations; i++) {
            generator.generateId();
        }
        
        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000;
        
        double idsPerSecond = (iterations * 1000.0) / durationMs;
        
        log.info("Single thread performance: {} IDs/second", String.format("%.2f", idsPerSecond));
        
        // 應該能達到每秒至少 100,000 個 ID
        assertThat(idsPerSecond).isGreaterThan(100_000);
    }
    
    @Test
    @DisplayName("多線程併發測試")
    void multiThreadConcurrencyTest() throws InterruptedException {
        int threadCount = 10;
        int idsPerThread = 10_000;
        
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        Set<Long> allIds = Collections.synchronizedSet(new HashSet<>());
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    Set<Long> threadIds = new HashSet<>();
                    for (int j = 0; j < idsPerThread; j++) {
                        threadIds.add(generator.generateId());
                    }
                    allIds.addAll(threadIds);
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
        
        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000;
        
        int totalIds = threadCount * idsPerThread;
        double idsPerSecond = (totalIds * 1000.0) / durationMs;
        
        log.info("Multi-thread performance: {} IDs/second", String.format("%.2f", idsPerSecond));
        
        // 驗證唯一性
        assertThat(allIds).hasSize(totalIds);
        
        // 多線程性能應該更高
        assertThat(idsPerSecond).isGreaterThan(200_000);
    }
    
    private static class NoOpSnowflakeMetrics implements SnowflakeMetrics {
        @Override
        public void recordGeneration(long durationNanos, boolean success) {}
        @Override
        public void recordSequenceOverflow() {}
        @Override
        public void recordClockBackwards(long backwardsMs) {}
        @Override
        public long getGeneratedCount() { return 0; }
        @Override
        public long getFailureCount() { return 0; }
        @Override
        public double getAverageGenerationTime() { return 0; }
        @Override
        public long getClockBackwardsCount() { return 0; }
    }
}
```

### 整合測試

```java
/**
 * Spring Boot 整合測試
 */
@SpringBootTest
@TestPropertySource(properties = {
        "snowflake.enabled=true",
        "snowflake.worker-id=1",
        "snowflake.datacenter-id=1",
        "snowflake.metrics-enabled=true"
})
class SnowflakeIntegrationTest {
    
    @Autowired
    private IdGenerator idGenerator;
    
    @Autowired
    private SnowflakeHealthIndicator healthIndicator;
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("應該成功自動配置 Snowflake 生成器")
    void shouldAutoConfigureSnowflakeGenerator() {
        assertThat(idGenerator).isNotNull();
        assertThat(idGenerator).isInstanceOf(EnterpriseSnowflakeIdGenerator.class);
    }
    
    @Test
    @DisplayName("健康檢查應該返回 UP 狀態")
    void healthCheckShouldReturnUp() {
        Health health = healthIndicator.health();
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("lastGeneratedId");
    }
    
    @Test
    @DisplayName("REST API 應該正常工作")
    void restApiShouldWork() {
        // 測試單個 ID 生成
        ResponseEntity<Map> response = restTemplate.getForEntity(
                "/api/v1/ids/generate", Map.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKey("id");
        
        // 測試批量 ID 生成
        Map<String, Object> request = Map.of("count", 10);
        ResponseEntity<Map> batchResponse = restTemplate.postForEntity(
                "/api/v1/ids/generate/batch", request, Map.class);
        
        assertThat(batchResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(batchResponse.getBody()).containsKey("ids");
        
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) batchResponse.getBody().get("ids");
        assertThat(ids).hasSize(10);
    }
    
    @Test
    @DisplayName("應該正確處理 JPA 實體 ID 生成")
    void shouldHandleJpaEntityIdGeneration() {
        // 這個測試需要配置了 Snowflake ID 生成器的 JPA 實體
        // 具體實現依賴於實際的實體類
    }
}

/**
 * 負載測試
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SnowflakeLoadTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("高併發負載測試")
    void highConcurrencyLoadTest() throws InterruptedException {
        int threadCount = 50;
        int requestsPerThread = 200;
        
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);
        
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        try {
                            ResponseEntity<Map> response = restTemplate.getForEntity(
                                    "/api/v1/ids/generate", Map.class);
                            if (response.getStatusCode().is2xxSuccessful()) {
                                successCount.incrementAndGet();
                            } else {
                                errorCount.incrementAndGet();
                            }
                        } catch (Exception e) {
                            errorCount.incrementAndGet();
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await();
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        long durationMs = endTime - startTime;
        
        int totalRequests = threadCount * requestsPerThread;
        double requestsPerSecond = (totalRequests * 1000.0) / durationMs;
        
        log.info("Load test results:");
        log.info("Total requests: {}", totalRequests);
        log.info("Successful requests: {}", successCount.get());
        log.info("Failed requests: {}", errorCount.get());
        log.info("Duration: {} ms", durationMs);
        log.info("Requests per second: {}", String.format("%.2f", requestsPerSecond));
        
        // 成功率應該超過 99%
        double successRate = (successCount.get() * 100.0) / totalRequests;
        assertThat(successRate).isGreaterThan(99.0);
        
        // 應該能處理每秒至少 1000 個請求
        assertThat(requestsPerSecond).isGreaterThan(1000);
    }
}
```

## 最佳實踐與注意事項

### 配置最佳實踐

```yaml
# application.yml
snowflake:
  enabled: true
  # 工作節點 ID 配置
  worker-id-discovery:
    enabled: true
    strategy: ip  # ip, zookeeper, redis, database
  
  # 時鐘回撥處理
  max-clock-backwards-ms: 5
  
  # 監控配置
  metrics-enabled: true
  
  # 起始時間（建議設置為系統上線時間）
  epoch: 1640995200000  # 2022-01-01

# Actuator 健康檢查
management:
  health:
    snowflake:
      enabled: true
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
```

### 生產環境部署指南

```java
/**
 * 生產環境配置類
 */
@Configuration
@Profile("production")
@Slf4j
public class ProductionSnowflakeConfiguration {
    
    /**
     * 生產環境工作節點 ID 提供者
     */
    @Bean
    @Primary
    public WorkerIdProvider productionWorkerIdProvider() {
        return new ZookeeperWorkerIdProvider("zk1:2181,zk2:2181,zk3:2181");
    }
    
    /**
     * 生產環境時鐘服務（支援 NTP 同步檢查）
     */
    @Bean
    @Primary
    public ClockService productionClockService() {
        return new NtpAwareClockService();
    }
    
    /**
     * 生產環境度量收集（增加更多監控指標）
     */
    @Bean
    @Primary
    public SnowflakeMetrics productionSnowflakeMetrics(
            MeterRegistry meterRegistry,
            @Value("${spring.application.name}") String applicationName) {
        return new EnhancedSnowflakeMetrics(meterRegistry, applicationName);
    }
}

/**
 * NTP 感知時鐘服務
 */
@Slf4j
public class NtpAwareClockService implements ClockService {
    
    private final AtomicLong lastNtpCheck = new AtomicLong(0);
    private final long ntpCheckInterval = TimeUnit.HOURS.toMillis(1); // 每小時檢查一次
    
    @Override
    public long currentTimeMillis() {
        long now = System.currentTimeMillis();
        
        // 定期檢查 NTP 同步狀態
        if (now - lastNtpCheck.get() > ntpCheckInterval) {
            if (lastNtpCheck.compareAndSet(lastNtpCheck.get(), now)) {
                checkNtpSync();
            }
        }
        
        return now;
    }
    
    private void checkNtpSync() {
        try {
            // 實際實現應該檢查系統 NTP 同步狀態
            ProcessBuilder pb = new ProcessBuilder("timedatectl", "status");
            Process process = pb.start();
            // 解析輸出檢查 NTP 同步狀態
            log.info("NTP sync status checked");
        } catch (Exception e) {
            log.warn("Failed to check NTP sync status", e);
        }
    }
}

/**
 * ZooKeeper 工作節點 ID 提供者
 */
@Slf4j
public class ZookeeperWorkerIdProvider implements WorkerIdProvider {
    
    private final String connectString;
    private final CuratorFramework curator;
    private final String workerPath = "/snowflake/workers";
    
    public ZookeeperWorkerIdProvider(String connectString) {
        this.connectString = connectString;
        this.curator = CuratorFrameworkFactory.newClient(
                connectString,
                new ExponentialBackoffRetry(1000, 3)
        );
        this.curator.start();
        
        try {
            this.curator.blockUntilConnected(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to connect to ZooKeeper", e);
        }
    }
    
    @Override
    public WorkerIdInfo getWorkerIdInfo() {
        try {
            // 確保路徑存在
            curator.create()
                    .creatingParentsIfNeeded()
                    .forPath(workerPath);
            
            // 創建臨時順序節點
            String actualPath = curator.create()
                    .withMode(CreateMode.EPHEMERAL_SEQUENTIAL)
                    .forPath(workerPath + "/worker-", getLocalHostInfo().getBytes());
            
            // 從路徑中提取工作節點 ID
            String nodeName = actualPath.substring(actualPath.lastIndexOf('/') + 1);
            String sequence = nodeName.substring("worker-".length());
            long workerId = Long.parseLong(sequence) % 32;
            long datacenterId = (Long.parseLong(sequence) / 32) % 32;
            
            log.info("Assigned worker ID: {}, datacenter ID: {} (ZooKeeper path: {})",
                    workerId, datacenterId, actualPath);
            
            return new WorkerIdInfo(workerId, datacenterId);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to get worker ID from ZooKeeper", e);
        }
    }
    
    private String getLocalHostInfo() {
        try {
            InetAddress address = InetAddress.getLocalHost();
            return address.getHostName() + ":" + address.getHostAddress();
        } catch (UnknownHostException e) {
            return "unknown:" + System.currentTimeMillis();
        }
    }
}
```

### 監控與報警

```java
/**
 * 增強版度量收集器
 */
@Component
public class EnhancedSnowflakeMetrics implements SnowflakeMetrics {
    
    private final MeterRegistry meterRegistry;
    private final String applicationName;
    
    // 基礎度量
    private final Counter generatedCounter;
    private final Counter failureCounter;
    private final Timer generationTimer;
    
    // 高級度量
    private final Gauge currentQpsGauge;
    private final Counter clockBackwardsCounter;
    private final Timer clockBackwardsRecoveryTimer;
    private final DistributionSummary sequenceDistribution;
    
    // 統計數據
    private final AtomicLong lastMinuteGenerated = new AtomicLong(0);
    private final AtomicLong currentQps = new AtomicLong(0);
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    
    public EnhancedSnowflakeMetrics(MeterRegistry meterRegistry, String applicationName) {
        this.meterRegistry = meterRegistry;
        this.applicationName = applicationName;
        
        // 初始化度量
        this.generatedCounter = Counter.builder("snowflake.id.generated.total")
                .description("Total number of generated IDs")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        this.failureCounter = Counter.builder("snowflake.id.generation.failures.total")
                .description("Total number of ID generation failures")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        this.generationTimer = Timer.builder("snowflake.id.generation.duration")
                .description("Time taken to generate an ID")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        this.currentQpsGauge = Gauge.builder("snowflake.id.qps.current")
                .description("Current QPS of ID generation")
                .tag("application", applicationName)
                .register(meterRegistry, currentQps, AtomicLong::get);
        
        this.clockBackwardsCounter = Counter.builder("snowflake.clock.backwards.total")
                .description("Total number of clock backwards events")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        this.clockBackwardsRecoveryTimer = Timer.builder("snowflake.clock.backwards.recovery.duration")
                .description("Time taken to recover from clock backwards")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        this.sequenceDistribution = DistributionSummary.builder("snowflake.sequence.distribution")
                .description("Distribution of sequence numbers")
                .tag("application", applicationName)
                .register(meterRegistry);
        
        // 啟動 QPS 計算
        startQpsCalculation();
    }
    
    @Override
    public void recordGeneration(long durationNanos, boolean success) {
        if (success) {
            generatedCounter.increment();
            lastMinuteGenerated.incrementAndGet();
        } else {
            failureCounter.increment();
        }
        generationTimer.record(durationNanos, TimeUnit.NANOSECONDS);
    }
    
    @Override
    public void recordSequenceOverflow() {
        // 記錄序列號溢出事件
        meterRegistry.counter("snowflake.sequence.overflow.total",
                "application", applicationName).increment();
    }
    
    @Override
    public void recordClockBackwards(long backwardsMs) {
        clockBackwardsCounter.increment();
        
        // 記錄恢復時間
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            Thread.sleep(backwardsMs + 1); // 模擬等待時間
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            sample.stop(clockBackwardsRecoveryTimer);
        }
    }
    
    public void recordSequenceNumber(long sequence) {
        sequenceDistribution.record(sequence);
    }
    
    private void startQpsCalculation() {
        scheduler.scheduleWithFixedDelay(() -> {
            long generated = lastMinuteGenerated.getAndSet(0);
            currentQps.set(generated); // 每秒生成數量
        }, 1, 1, TimeUnit.SECONDS);
    }
    
    // 實現接口的其他方法...
    @Override
    public long getGeneratedCount() {
        return (long) generatedCounter.count();
    }
    
    @Override
    public long getFailureCount() {
        return (long) failureCounter.count();
    }
    
    @Override
    public double getAverageGenerationTime() {
        return generationTimer.mean(TimeUnit.MILLISECONDS);
    }
    
    @Override
    public long getClockBackwardsCount() {
        return (long) clockBackwardsCounter.count();
    }
}

/**
 * 報警規則配置
 */
@Component
@ConfigurationProperties(prefix = "snowflake.alerting")
@Data
public class SnowflakeAlertingConfig {
    
    /**
     * QPS 閾值報警
     */
    private long qpsThreshold = 10000;
    
    /**
     * 失敗率閾值
     */
    private double failureRateThreshold = 0.01; // 1%
    
    /**
     * 時鐘回撥次數閾值
     */
    private long clockBackwardsThreshold = 5;
    
    /**
     * 平均生成時間閾值（毫秒）
     */
    private double avgGenerationTimeThreshold = 1.0;
}

/**
 * 報警檢查器
 */
@Component
@Slf4j
public class SnowflakeAlertingService {
    
    private final SnowflakeMetrics metrics;
    private final SnowflakeAlertingConfig alertingConfig;
    private final ApplicationEventPublisher eventPublisher;
    
    public SnowflakeAlertingService(
            SnowflakeMetrics metrics,
            SnowflakeAlertingConfig alertingConfig,
            ApplicationEventPublisher eventPublisher) {
        this.metrics = metrics;
        this.alertingConfig = alertingConfig;
        this.eventPublisher = eventPublisher;
    }
    
    @Scheduled(fixedRate = 30000) // 每30秒檢查一次
    public void checkAlerts() {
        checkFailureRate();
        checkClockBackwards();
        checkAverageGenerationTime();
    }
    
    private void checkFailureRate() {
        long totalGenerated = metrics.getGeneratedCount();
        long totalFailed = metrics.getFailureCount();
        
        if (totalGenerated > 0) {
            double failureRate = (double) totalFailed / (totalGenerated + totalFailed);
            
            if (failureRate > alertingConfig.getFailureRateThreshold()) {
                AlertEvent alert = AlertEvent.builder()
                        .type(AlertType.HIGH_FAILURE_RATE)
                        .message(String.format("Snowflake ID generation failure rate is %.2f%%, threshold is %.2f%%",
                                failureRate * 100, alertingConfig.getFailureRateThreshold() * 100))
                        .severity(AlertSeverity.WARNING)
                        .build();
                
                eventPublisher.publishEvent(alert);
            }
        }
    }
    
    private void checkClockBackwards() {
        long clockBackwardsCount = metrics.getClockBackwardsCount();
        
        if (clockBackwardsCount > alertingConfig.getClockBackwardsThreshold()) {
            AlertEvent alert = AlertEvent.builder()
                    .type(AlertType.CLOCK_BACKWARDS)
                    .message(String.format("Clock backwards events: %d, threshold: %d",
                            clockBackwardsCount, alertingConfig.getClockBackwardsThreshold()))
                    .severity(AlertSeverity.CRITICAL)
                    .build();
            
            eventPublisher.publishEvent(alert);
        }
    }
    
    private void checkAverageGenerationTime() {
        double avgTime = metrics.getAverageGenerationTime();
        
        if (avgTime > alertingConfig.getAvgGenerationTimeThreshold()) {
            AlertEvent alert = AlertEvent.builder()
                    .type(AlertType.SLOW_GENERATION)
                    .message(String.format("Average ID generation time is %.2f ms, threshold is %.2f ms",
                            avgTime, alertingConfig.getAvgGenerationTimeThreshold()))
                    .severity(AlertSeverity.WARNING)
                    .build();
            
            eventPublisher.publishEvent(alert);
        }
    }
    
    @Data
    @Builder
    public static class AlertEvent {
        private AlertType type;
        private String message;
        private AlertSeverity severity;
        private LocalDateTime timestamp = LocalDateTime.now();
    }
    
    public enum AlertType {
        HIGH_FAILURE_RATE, CLOCK_BACKWARDS, SLOW_GENERATION, HIGH_QPS
    }
    
    public enum AlertSeverity {
        INFO, WARNING, CRITICAL
    }
}
```

## 總結

Snowflake 算法是分散式系統中生成唯一 ID 的經典解決方案，具有以下優勢：

### 核心優勢
1. **全域唯一性**：64 位結構保證 ID 的全域唯一性
2. **高效能**：本地生成，無網路依賴，支援高併發
3. **時間有序性**：ID 包含時間戳，具有自然的時間順序
4. **可擴展性**：支援多數據中心、多節點部署

### 適用場景
1. **高併發系統**：電商訂單、用戶追踪、消息 ID
2. **分散式數據庫**：分庫分表場景的主鍵生成
3. **微服務架構**：服務間通信的請求 ID
4. **大數據系統**：事件追踪、日誌聚合

### 注意事項
1. **時鐘依賴**：需要確保系統時鐘同步，避免時鐘回撥
2. **節點管理**：需要合理分配和管理工作節點 ID
3. **監控重要性**：需要完善的監控和報警機制
4. **容錯處理**：需要處理各種異常情況

通過本文的全面介紹，您應該能夠在企業級項目中成功實施 Snowflake 分散式 ID 生成系統，並根據具體需求進行適當的優化和定制。

## 踩坑紀錄

### K8s / 容器環境的 Worker ID 分配
Snowflake 需要唯一 Worker ID（通常 10 bits = 1024 個節點）。在容器環境中，容器 IP 的末段 8 bits 是常見做法，但需注意：
- IP 可能重複（不同子網路）
- Pod 重啟後 IP 會變，同一時間兩個 Pod 可能短暫使用同一個 Worker ID

推薦做法：
1. 用 Redis `INCR` 分配 Worker ID，Pod 啟動時取號
2. 用 Zookeeper/etcd 做 Worker ID 分配協調

### 雪花 ID vs UUID 對 InnoDB 主鍵的影響

| 特性 | 雪花 ID | UUIDv4 | UUIDv7 |
|------|---------|--------|--------|
| 插入順序 | 單調遞增 | 隨機 | 時間排序 |
| InnoDB B+ Tree 插入 | 尾插，快速 | 頁分裂，慢 | 尾插，快速 |
| 索引碎片化 | 低 | 高 | 低 |
| 可讀性 | 可解析時間戳 | 不可讀 | 可解析時間戳 |
| 分散式唯一性 | 需協調 Worker ID | 無需協調 | 無需協調 |

**結論**：雪花 ID 在 MySQL InnoDB 下效能優於 UUIDv4；UUIDv7（RFC 9562，Java 尚無原生支援）是更好的標準化替代。

---

## 參考資料

- [Twitter Snowflake 原始論文](https://github.com/twitter-archive/snowflake)
- [美團 Leaf 分散式 ID 生成系統](https://tech.meituan.com/2017/04/21/mt-leaf.html)
- [百度 UidGenerator](https://github.com/baidu/uid-generator)
- [Spring Boot 官方文檔](https://spring.io/projects/spring-boot)
- [Micrometer 監控框架](https://micrometer.io/)