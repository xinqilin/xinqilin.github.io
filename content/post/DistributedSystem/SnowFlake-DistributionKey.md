---
title: "SnowFlake DistributionKey"
author: Bill.Lin
date: 2022-09-13T23:05:38+08:00
draft: false
tags: []
Description: ""
Categories: [Distributed System]
DisableComments: false
---

# Snowflake - Distribution Key

### 單體式 ID

一般單體式 UUID(Universally Unique identifier)
8-4-4-4-12 總共 32 個 16 進位


```java
    UUID.randomUUID()  // 80e06459-942d-4a63-9fd4-81691b127363
```

- 優點
  * 性能高
  * 本地生成
  * 無網路延遲
- 缺點
  * 無順序性
  * 字串不適合存 db 當 index or PK 且 32 長度太長
  * 因無序 所以對 b+ Tree 來說 插入時效能低
  * 極小機會但 會重複
  => ＤＢ 解法: replace into <br>
  跟insert功能類似, 但 replace into 會檢查是否存在, 如存在則先刪除, 再插入, 否则直接插入


### 分佈式 ID

twitter 開發的 雪花算法 - snowflake
總共 64 bit

 - 1bit
不用，因為二進制中最高位是符號位，1表示負數，0表示正數。
生成的id一般都是用整數，所以最高位固定為0。

 - 41bit-時間戳，用來記錄時間戳，亳秒級。
41位可以表示 2^41-1個數字，
如果只用來表示正整數(計算機中正數包含0)，可以表示的數值範圍是: 0 至 2^41 - 1， 減1是因為可表示的數值範圍是從0開始算的，而不是1.也就是說41位可以表示 2^41 - 1 個毫秒的值，轉化成單位年則是( 2^41 - 1 )/ (1000* 60 * 60 * 24 *365)= 69年

 - 10bit-工作機器id,用來記錄工作機器id.
可以部署在 2^10 = 1024 個節點，包括5位 dataCenterId 和 15 位 workerId
5位(bit) 可以表示的最大正整數是 2^5-1 = 31，即可以用 0, 1, 2, 3... 這 32 個數字來表示不同的 dataCenterId 或 workerId

 - 12bit, 序列號，序列號，用來記錄同毫秒內產生的不同id.
12位(bit) 可以表示的最大正整數是 2^12 - 1 = 4095，即可以用 0, 1, 2, 3... 4094 這 4095 個數字,
來表示同一機器同一時間截(毫秒)內產生的 4095 個ID序號。

* 優點
 - 全局唯一性
 - 递增性, 確保生成 ID 對於用户或業務是递增的。
 - 高可用性, 確保任何時候都能生成正確的 ID
 - 高性能, 在高併發下依然 ok
 - 亳秒数在高位，自增序列在低位，整個 ID 都是遞增的。

* 缺點
 - 依賴機器時鐘，如果機器時鐘回撥，會導致重複 ID 生成
 - 在單機上是遞增的，但是由於設計到分佈式環境，每台機器上的時鐘不可能完全同步，有時候會出現不是全局遞增的情況(此缺點可以認為無所謂，- .般分佈式ID只要求趨勢遞增，並不會嚴格要求遞增，90%的需求都只要求趨勢遞增)

* additional 解決機器時鐘回撥問題
 - Leaf - 美團點評分佈式ID生成系統
 - 百度 open source - UidGenerator


### java sample code

```java
public class SnowflakeIdWorker {
    /**
     * 开始时间截 (2015-01-01)
     */
    private final long twepoch = 1420041600000L;
    /**
     * 机器id所占的位数
     */
    private final long workerIdBits = 5L;
    /**
     * 数据标识id所占的位数
     */
    private final long datacenterIdBits = 5L;
    /**
     * 支持的最大机器id，结果是31 (这个移位算法可以很快的计算出几位二进制数所能表示的最大十进制数)
     */
    private final long maxWorkerId = -1L ^ (-1L << workerIdBits);
    /**
     * 支持的最大数据标识id，结果是31
     */
    private final long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);
    /**
     * 序列在id中占的位数
     */
    private final long sequenceBits = 12L;
    /**
     * 机器ID向左移12位
     */
    private final long workerIdShift = sequenceBits;
    /**
     * 数据标识id向左移17位(12+5)
     */
    private final long datacenterIdShift = sequenceBits + workerIdBits;
    /**
     * 时间截向左移22位(5+5+12)
     */
    private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
    /**
     * 生成序列的掩码，这里为4095 (0b111111111111=0xfff=4095)
     */
    private final long sequenceMask = -1L ^ (-1L << sequenceBits);
    /**
     * 工作机器ID(0~31)
     */
    private long workerId;
    /**
     * 数据中心ID(0~31)
     */
    private long datacenterId;
    /**
     * 毫秒内序列(0~4095)
     */
    private long sequence = 0L;
    /**
     * 上次生成ID的时间截
     */
    private long lastTimestamp = -1L;
    /**
     * 构造函数
     * @param workerId     工作ID (0~31)
     * @param datacenterId 数据中心ID (0~31)
     */
    public SnowflakeIdWorker(long workerId, long datacenterId) {
        if (workerId > maxWorkerId || workerId < 0) {
            throw new IllegalArgumentException(String.format("worker Id can't be greater than %d or less than 0", maxWorkerId));
        }
        if (datacenterId > maxDatacenterId || datacenterId < 0) {
            throw new IllegalArgumentException(String.format("datacenter Id can't be greater than %d or less than 0", maxDatacenterId));
        }
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }
    /**
     * 获得下一个ID (该方法是线程安全的)
     * @return SnowflakeId
     */
    public synchronized long nextId() {
        long timestamp = timeGen();
        // 如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过这个时候应当抛出异常
        if (timestamp < lastTimestamp) {
            throw new RuntimeException(
                    String.format("Clock moved backwards.  Refusing to generate id for %d milliseconds", lastTimestamp - timestamp));
        }
        // 如果是同一时间生成的，则进行毫秒内序列
        if (lastTimestamp == timestamp) {
            sequence = (sequence + 1) & sequenceMask;
            // 毫秒内序列溢出
            if (sequence == 0) {
                //阻塞到下一个毫秒,获得新的时间戳
                timestamp = tilNextMillis(lastTimestamp);
            }
        }
        // 时间戳改变，毫秒内序列重置
        else {
            sequence = 0L;
        }
        // 上次生成ID的时间截
        lastTimestamp = timestamp;
        // 移位并通过或运算拼到一起组成64位的ID
        return ((timestamp - twepoch) << timestampLeftShift) //
                | (datacenterId << datacenterIdShift) //
                | (workerId << workerIdShift) //
                | sequence;
    }
    /**
     * 阻塞到下一个毫秒，直到获得新的时间戳
     * @param lastTimestamp 上次生成ID的时间截
     * @return 当前时间戳
     */
    protected long tilNextMillis(long lastTimestamp) {
        long timestamp = timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = timeGen();
        }
        return timestamp;
    }
    /**
     * 返回以毫秒为单位的当前时间
     * @return 当前时间(毫秒)
     */
    protected long timeGen() {
        return System.currentTimeMillis();
    }

    public static void main(String[] args) throws InterruptedException {
        SnowflakeIdWorker idWorker = new SnowflakeIdWorker(0, 0);
        for (int i = 0; i < 10; i++) {
            long id = idWorker.nextId();
            Thread.sleep(1);
            System.out.println(id);
        }
    }
}
```



reference: <br>
https://github.com/twitter-archive/snowflake <br>
https://github.com/beyondfengyu/SnowFlake/blob/master/SnowFlake.java <br>
https://blog.csdn.net/qq_45408390/article/details/119793810 <br>



  
