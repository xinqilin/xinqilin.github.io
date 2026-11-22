---
title: "Bloom Filter 與 HyperLogLog：用一點誤差換大量記憶體，以及估計值被刻意操縱時怎麼辦"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 3：實測 Bloom filter 的誤判率與容量的關係、HyperLogLog 的估計誤差與合併，用它們擋下快取穿透、計算不重複訪客，並示範攻擊者如何利用公開雜湊灌水估計值"
categories: ["SystemDesign"]
tags: ["System Design", "Bloom Filter", "HyperLogLog", "Redis", "Guava", "Probabilistic Data Structures", "Security"]
---

> **System Design 系列** Part 3-6｜上一篇：[檔案與物件儲存](/post/systemdesign/object-storage/)｜下一篇：[全文搜尋與倒排索引](/post/systemdesign/full-text-search/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

平台上有兩個看似無關的需求：

1. **快取穿透**：[Cache 篇](/post/systemdesign/caching/)提過，有人用大量不存在的商品 ID 打 `/products/{id}`，快取永遠 miss，每次都打到資料庫。快取空結果能擋住重複的 ID，但攻擊者可以產生無限多種 ID，空結果反而把快取塞滿
2. **不重複訪客數（UV）**：行銷要每場講座每天的不重複訪客，以及任意區間（例如整週）的不重複訪客。未登入的訪客用 cookie 裡的 visitor ID 識別

精確的做法是把元素存起來：一個 `Set` 記錄所有商品 ID，一個 Redis `SET` 記錄每場講座每天的訪客。以每個成員約 60 bytes 粗估，一場熱門講座一天 50 萬名訪客就是 30 MB，一年 365 個 key 約 11 GB，而且這只是一場講座。要算整週的不重複訪客，還得把 7 個集合做聯集。

兩個需求有個共同點：**要的只是「在不在」或「有幾個」，不需要元素本身**。只要能接受一點誤差，記憶體可以省下好幾個數量級。

## 最簡單的做法與它的極限

| 做法 | 問題 |
|---|---|
| `HashSet` 或 Redis `SET` | 記憶體和元素數量成正比 |
| 資料庫 `COUNT(DISTINCT visitor_id)` | 每次都要掃描所有事件；[B-Tree vs LSM 篇](/post/systemdesign/btree-vs-lsm/)的瀏覽紀錄一天就有 10 億筆 |
| 快取空結果 | 能擋住重複的不存在 ID，擋不住每次都不一樣的 ID |

## 核心機制

### Bloom filter：「一定不在」或「可能在」

Bloom filter 是一個 m 個 bit 的陣列，加上 k 個雜湊函式：

- **加入**：把元素用 k 個雜湊函式算出 k 個位置，全部設成 1
- **查詢**：檢查這 k 個位置。只要有一個是 0，元素**一定不在**；全部是 1，元素**可能在**（也可能是其他元素剛好把這些位置都設成了 1）

所以它只會出現一種錯誤：把不在的誤判成「可能在」（false positive），不會把在的誤判成不在。放入 n 個元素後，誤判率約為 (1 − e^(−kn/m))^k；最佳的 k 是 (m/n) × ln 2，此時每個元素需要 −ln p ÷ (ln 2)² 個 bit。實作一個來驗證公式：

<details>
<summary>實作與測試（<code>java BloomFilterDemo.java</code>）</summary>

```java
import java.util.BitSet;

public class BloomFilterDemo {

    static final class Bloom {
        final BitSet bits;
        final int m;
        final int k;

        Bloom(long expected, double bitsPerItem) {
            m = (int) Math.ceil(expected * bitsPerItem);
            k = (int) Math.max(1, Math.round(bitsPerItem * Math.log(2)));   // 最佳雜湊數 = (m/n) ln 2
            bits = new BitSet(m);
        }

        void add(long item) {
            long h1 = mix(item);
            long h2 = mix(h1) | 1;                                  // 兩個雜湊值組合出 k 個位置
            for (int i = 0; i < k; i++) {
                bits.set(index(h1 + i * h2));
            }
        }

        boolean mightContain(long item) {
            long h1 = mix(item);
            long h2 = mix(h1) | 1;
            for (int i = 0; i < k; i++) {
                if (!bits.get(index(h1 + i * h2))) {
                    return false;                                   // 有任何一個位置是 0：一定不在
                }
            }
            return true;                                            // 全部是 1：可能在
        }

        int index(long hash) {
            return (int) Long.remainderUnsigned(hash, m);
        }
    }

    static long mix(long z) {                                       // SplitMix64 的混合函式
        z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9L;
        z = (z ^ (z >>> 27)) * 0x94d049bb133111ebL;
        return z ^ (z >>> 31);
    }

    public static void main(String[] args) {
        int n = 1_000_000;
        System.out.printf("放入 %,d 個 ID，再用另外 %,d 個不存在的 ID 測試%n", n, n);
        for (double bitsPerItem : new double[] {4.79, 9.59, 14.38}) {
            report(n, bitsPerItem, n);
        }
        System.out.println();
        System.out.println("依 1% 誤判率設計，但實際放入的數量超過設計容量：");
        for (int actual : new int[] {n, 2 * n, 4 * n}) {
            report(n, 9.59, actual);
        }
    }

    static void report(int designed, double bitsPerItem, int inserted) {
        Bloom bloom = new Bloom(designed, bitsPerItem);
        for (long id = 0; id < inserted; id++) {
            bloom.add(id);
        }
        int falsePositives = 0;
        for (long id = inserted; id < inserted + 1_000_000L; id++) {
            if (bloom.mightContain(id)) {
                falsePositives++;
            }
        }
        double theory = Math.pow(1 - Math.exp(-(double) bloom.k * inserted / bloom.m), bloom.k);
        System.out.printf("  每個元素 %5.2f bits、k = %2d、放入 %,9d 個：佔 %,6.0f KB，誤判率 實測 %6.3f%%｜理論 %6.3f%%%n",
                bitsPerItem, bloom.k, inserted, bloom.m / 8.0 / 1024, falsePositives / 10_000.0, theory * 100);
    }
}
```

</details>

```text
放入 1,000,000 個 ID，再用另外 1,000,000 個不存在的 ID 測試
  每個元素  4.79 bits、k =  3、放入 1,000,000 個：佔    585 KB，誤判率 實測 10.119%｜理論 10.083%
  每個元素  9.59 bits、k =  7、放入 1,000,000 個：佔  1,171 KB，誤判率 實測  1.010%｜理論  1.001%
  每個元素 14.38 bits、k = 10、放入 1,000,000 個：佔  1,755 KB，誤判率 實測  0.100%｜理論  0.100%

依 1% 誤判率設計，但實際放入的數量超過設計容量：
  每個元素  9.59 bits、k =  7、放入 1,000,000 個：佔  1,171 KB，誤判率 實測  1.010%｜理論  1.001%
  每個元素  9.59 bits、k =  7、放入 2,000,000 個：佔  1,171 KB，誤判率 實測 15.732%｜理論 15.720%
  每個元素  9.59 bits、k =  7、放入 4,000,000 個：佔  1,171 KB，誤判率 實測 67.869%｜理論 67.827%
```

- **誤判率 1% 只要每個元素約 9.6 bits**：100 萬個 ID 佔 1.1 MB，而存 100 萬個 `Long` 的 `HashSet` 要數十 MB。誤判率每降低 10 倍，大約多 4.8 bits
- **實測與理論幾乎完全一致**
- **超過設計容量會急速惡化**：依 100 萬個設計的 filter 放進 200 萬個，誤判率從 1% 跳到 15.7%；放進 400 萬個就到了 68%，幾乎失去作用
- **不能刪除**：一個 bit 可能被好幾個元素共用，清掉它會讓其他元素被誤判成「一定不在」。需要刪除時，可以定期重建、改用 counting Bloom filter，或改用 Cuckoo filter

程式裡用兩個雜湊值 h1 + i × h2 組合出 k 個位置，而不是真的算 k 次雜湊，這是 Kirsch 與 Mitzenmacher 證明過不會影響誤判率的技巧。[B-Tree vs LSM 篇](/post/systemdesign/btree-vs-lsm/)的 SSTable 也是用 Bloom filter 跳過「一定沒有這個 key」的檔案。

### HyperLogLog：用前導零估計數量

想像一直丟硬幣：如果有人告訴你他曾經連續丟出 20 次反面，你大概會猜他丟了上百萬次。HyperLogLog 用同樣的直覺估計不重複元素的數量：

1. 每個元素先算雜湊值。同一個元素的雜湊值永遠相同，所以重複出現的元素不會影響結果
2. 雜湊值的前 14 bits 決定它屬於 16,384 個 register 中的哪一個
3. 每個 register 只記住「看過的雜湊值中，剩餘 bits 最多有幾個前導零」
4. 單一 register 的估計誤差很大，所以把 16,384 個 register 用調和平均合起來；數量很少時改用 linear counting

Redis 的實作正是 16,384 個 6-bit register，共 12,288 bytes，標準誤差 1.04 ÷ √16384 ≈ 0.81%。數量少時還會先用稀疏表示法，實際更小。實作一個同樣規格的版本：

<details>
<summary>實作與測試（<code>java HyperLogLogDemo.java</code>）</summary>

```java
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class HyperLogLogDemo {

    static final int P = 14;                                        // 2^14 = 16,384 個 register，和 Redis 相同
    static final int M = 1 << P;
    static final double ALPHA = 0.7213 / (1 + 1.079 / M);

    static final class Hll {
        final byte[] registers = new byte[M];

        void addHash(long hash) {
            int index = (int) (hash >>> (64 - P));                  // 前 14 bits 決定放哪個 register
            long rest = hash << P;
            int rank = Math.min(Long.numberOfLeadingZeros(rest), 64 - P) + 1;   // 剩下的 bits 有幾個前導零
            if (rank > registers[index]) {
                registers[index] = (byte) rank;
            }
        }

        long estimate() {
            double sum = 0;
            int zeros = 0;
            for (byte r : registers) {
                sum += 1.0 / (1L << r);
                if (r == 0) {
                    zeros++;
                }
            }
            double e = ALPHA * M * M / sum;                         // 調和平均
            if (e <= 2.5 * M && zeros > 0) {
                e = M * Math.log((double) M / zeros);               // 數量少時改用 linear counting
            }
            return Math.round(e);
        }

        void merge(Hll other) {
            for (int i = 0; i < M; i++) {
                registers[i] = (byte) Math.max(registers[i], other.registers[i]);
            }
        }
    }

    public static void main(String[] args) throws GeneralSecurityException {
        System.out.println("估計誤差（register 共 16,384 個）：");
        for (int n : new int[] {1_000, 100_000, 1_000_000, 10_000_000}) {
            Hll hll = new Hll();
            for (long id = 1; id <= n; id++) {
                hll.addHash(mix(id));
            }
            long estimate = hll.estimate();
            System.out.printf("  實際 %,11d｜估計 %,11d｜誤差 %+.2f%%%n", n, estimate, (estimate - n) * 100.0 / n);
        }

        Hll monday = new Hll();
        Hll tuesday = new Hll();
        for (long id = 1; id <= 6_000_000; id++) {
            monday.addHash(mix(id));
        }
        for (long id = 4_000_001; id <= 10_000_000; id++) {
            tuesday.addHash(mix(id));
        }
        monday.merge(tuesday);
        System.out.printf("%n週一 600 萬人、週二 600 萬人，其中 200 萬人兩天都來：合併後估計 %,d（實際 10,000,000）%n",
                monday.estimate());

        // 攻擊者知道雜湊函式，又能自己決定 visitor ID：直接反推出「雜湊值有很多前導零」的 ID
        long[] crafted = new long[M];
        for (int j = 0; j < M; j++) {
            long wantedHash = ((long) j << (64 - P)) | (1L << 30);  // 每個 register 都放一個前導零很多的值
            crafted[j] = unmix(wantedHash);
        }
        Hll plain = new Hll();
        Hll keyed = new Hll();
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec("server-side-secret".getBytes(), "HmacSHA256"));
        for (long id : crafted) {
            plain.addHash(mix(id));
            keyed.addHash(ByteBuffer.wrap(hmac.doFinal(ByteBuffer.allocate(8).putLong(id).array())).getLong());
        }
        System.out.printf("%n攻擊者送出 %,d 個特製 ID：%n", M);
        System.out.printf("  雜湊函式公開：估計 %,d 人%n", plain.estimate());
        System.out.printf("  先用伺服器端金鑰做 HMAC：估計 %,d 人%n", keyed.estimate());
    }

    static long mix(long z) {
        z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9L;
        z = (z ^ (z >>> 27)) * 0x94d049bb133111ebL;
        return z ^ (z >>> 31);
    }

    /** mix 是可逆的：給定想要的雜湊值，可以算回輸入。 */
    static long unmix(long z) {
        z = unxorshift(z, 31);
        z *= inverse(0x94d049bb133111ebL);
        z = unxorshift(z, 27);
        z *= inverse(0xbf58476d1ce4e5b9L);
        return unxorshift(z, 30);
    }

    static long unxorshift(long z, int shift) {
        long x = z;
        for (int i = 0; i <= 64 / shift; i++) {
            x = z ^ (x >>> shift);
        }
        return x;
    }

    static long inverse(long odd) {                                 // 2^64 下的乘法反元素（牛頓法）
        long x = odd;
        for (int i = 0; i < 6; i++) {
            x *= 2 - odd * x;
        }
        return x;
    }
}
```

</details>

```text
估計誤差（register 共 16,384 個）：
  實際       1,000｜估計       1,009｜誤差 +0.90%
  實際     100,000｜估計      99,786｜誤差 -0.21%
  實際   1,000,000｜估計     997,596｜誤差 -0.24%
  實際  10,000,000｜估計   9,921,965｜誤差 -0.78%

週一 600 萬人、週二 600 萬人，其中 200 萬人兩天都來：合併後估計 9,921,965（實際 10,000,000）

攻擊者送出 16,384 個特製 ID：
  雜湊函式公開：估計 12,391,023,608 人
  先用伺服器端金鑰做 HMAC：估計 16,282 人
```

（輸出的最後兩行留到資安小節說明。）

- **誤差都在 1% 以內**，不論是 1,000 還是 1,000 萬
- **合併是無損的**：兩個 HyperLogLog 合併時，每個 register 取最大值。週一和週二合併後的估計值，和直接數 1 到 1,000 萬的結果完全相同，兩天都來的 200 萬人沒有被重複計算。這就是「任意區間的不重複訪客」能用 7 個每日 key 合併算出來的原因
- **重複加入不影響結果**：同一個訪客重新整理 100 次，結果都一樣，所以重試是安全的（冪等性在 Part 5 詳談）

做不到的事：列出有哪些成員、刪除某個成員、準確算出交集（用排容原理相減，誤差會被放大）。

### 其他機率型資料結構

| 問題 | 資料結構 | 誤差特性 |
|---|---|---|
| 在不在 | Bloom filter、Cuckoo filter（可刪除） | 只會誤判成「在」 |
| 有幾個不同的 | HyperLogLog | 約 ±0.81%（16,384 個 register） |
| 某個元素出現幾次 | Count-Min Sketch | 只會高估，不會低估 |
| 出現最多次的前 K 個 | Top-K | 近似 |
| 分位數（例如 p99） | t-digest | 近似，尾端較準 |

Redis 除了 HyperLogLog，也以 probabilistic data types 提供 Bloom filter、Cuckoo filter、Count-Min Sketch、Top-K 與 t-digest。找出熱點 key（[Cache 篇](/post/systemdesign/caching/)）可以用 Top-K；算 p99（[Latency 篇](/post/systemdesign/latency-throughput/)）可以用 t-digest。

## 方案比較

| | 精確集合（`Set`） | Bloom filter | HyperLogLog |
|---|---|---|---|
| 回答的問題 | 在不在、有幾個、有哪些 | 在不在 | 有幾個 |
| 記憶體 | 和元素數量成正比 | 每個元素約 10 bits（1% 誤判） | 固定，最多 12 KB |
| 誤差 | 無 | 只會誤判成「可能在」 | 約 ±1% |
| 刪除 | 可以 | 不行（Cuckoo filter 可以） | 不行 |
| 列出成員 | 可以 | 不行 | 不行 |
| 合併 | 聯集要讀出全部元素 | 同樣大小的 filter 可以 OR | register 取最大值，無損 |

擋快取穿透的幾種做法：

| | 參數驗證 | 快取空結果 | Bloom filter |
|---|---|---|---|
| 擋得住 | 格式錯誤、超出範圍的 ID | 重複出現的不存在 ID | 所有不存在的 ID（約 1% 漏網） |
| 代價 | 幾乎沒有 | 佔快取空間；新商品上架前的空結果要等 TTL 過期 | 要維護、要重建 |

三者可以疊加：先驗證參數，再問 Bloom filter，最後才查快取與資料庫。

## Java 落地

### 1. 擋下不存在的商品 ID

```java
package catalog;

import com.google.common.hash.BloomFilter;
import com.google.common.hash.Funnels;
import java.util.function.Supplier;
import java.util.stream.LongStream;

/**
 * 在快取前面擋掉「一定不存在」的商品 ID。
 * 只會把不存在誤判成「可能存在」，代價是多查一次快取或資料庫；不會把存在的商品擋掉。
 */
public final class ProductExistenceFilter {

    private record Snapshot(BloomFilter<Long> filter, long maxId) {}

    private volatile Snapshot snapshot;

    /** 定期（例如每 10 分鐘）用資料庫中所有商品 ID 重建。Bloom filter 不能刪除，下架的商品靠重建移除。 */
    public void rebuild(Supplier<LongStream> allIds, long expectedCount) {
        BloomFilter<Long> filter = BloomFilter.create(Funnels.longFunnel(), Math.max(expectedCount * 2, 1_000), 0.01);
        long[] maxId = {Long.MIN_VALUE};
        allIds.get().forEach(id -> {
            filter.put(id);
            maxId[0] = Math.max(maxId[0], id);
        });
        snapshot = new Snapshot(filter, maxId[0]);                // 整份換掉，讀取端不需要加鎖
    }

    public boolean mightExist(long productId) {
        Snapshot current = snapshot;
        // 重建之後才上架的商品不在 filter 裡，但它的 ID 一定比 maxId 大，不能因此判定為不存在
        return productId > current.maxId() || current.filter().mightContain(productId);
    }
}
```

用 100 萬個商品驗證（ID 是 7 的倍數，模擬 ID 之間有空隙）：

```text
存在的商品被擋下：0 個
不存在的 ID 被放行：1,529 / 6,000,000（0.025%）
重建後新上架的 ID 7000007：放行
```

- **容量抓兩倍**：`BloomFilter.create` 的 expectedInsertions 設成目前數量的兩倍，商品持續增加也不會像前面的實測一樣急速惡化。實際放入 100 萬個時誤判率只有 0.025%
- **重建取代刪除**：下架的商品等下一次重建才會從 filter 消失，這段期間它只是「可能存在」，會多查一次資料庫，不影響正確性
- **`maxId` 處理重建之後的新商品**：這是 Bloom filter 唯一可能出錯的方向。如果 filter 少了某個存在的元素（例如重建後才上架的商品），它會回答「一定不存在」，真正的商品就變成 404。商品 ID 是遞增的（IDENTITY，或 依時間遞增的[分散式 ID](/post/systemdesign/distributed-id/)），所以比 `maxId` 大的一律放行，多台機器各自重建也不需要互相同步。ID 若是隨機的 UUID 就不能用這招，要改成新增商品時發事件通知每台機器加入 filter

### 2. 講座頁面的不重複訪客

```java
package stats;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.data.redis.core.StringRedisTemplate;

/** 講座頁面每天的不重複訪客數。每個 key 最多 12 KB，不論訪客有多少。 */
public class UniqueVisitorCounter {

    private final StringRedisTemplate redis;
    private final SecretKeySpec hashKey;                              // 由 secrets 管理服務注入，不寫在程式裡

    public UniqueVisitorCounter(StringRedisTemplate redis, byte[] secret) {
        this.redis = redis;
        this.hashKey = new SecretKeySpec(secret, "HmacSHA256");
    }

    public void record(long lectureId, String visitorId, LocalDate day) {
        String key = key(lectureId, day);
        redis.opsForHyperLogLog().add(key, keyedHash(visitorId));
        redis.expire(key, 400, TimeUnit.DAYS);
    }

    public long count(long lectureId, LocalDate day) {
        return redis.opsForHyperLogLog().size(key(lectureId, day));
    }

    /** 多個 key 一起 PFCOUNT 得到的是聯集：同一位訪客來了好幾天，只算一次。 */
    public long countBetween(long lectureId, LocalDate from, LocalDate to) {
        String[] keys = from.datesUntil(to.plusDays(1)).map(day -> key(lectureId, day)).toArray(String[]::new);
        return redis.opsForHyperLogLog().size(keys);
    }

    /** {lecture:42} 是 hash tag：同一場講座的所有 key 落在同一個 cluster slot，多 key 指令才能執行。 */
    private static String key(long lectureId, LocalDate day) {
        return "uv:{lecture:" + lectureId + "}:" + day;
    }

    /** 訪客 ID 由 client 帶來，先用伺服器端金鑰做 HMAC，攻擊者就無法挑選雜湊值。 */
    private String keyedHash(String visitorId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");                 // Mac 不是 thread-safe，每次建立
            mac.init(hashKey);
            byte[] digest = mac.doFinal(visitorId.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 16);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

- **一個 key 一場講座一天**：任意區間的 UV 用多個 key 一起 `PFCOUNT`，得到的是聯集的估計，不必另外存週、月的統計
- **hash tag**：Redis Cluster 的多 key 指令要求所有 key 在同一個 slot，`{lecture:42}` 讓同一場講座的 key 落在一起
- **HMAC**：原因在資安小節

## 踩坑與 Gotchas

- **沒有預估容量就建 Bloom filter**：放入數量超過設計容量兩倍，1% 的誤判率就變成 15.7%
- **以為 Bloom filter 可以刪除**：清掉 bit 會讓共用它的元素變成「一定不在」，產生原本不可能出現的錯誤
- **Bloom filter 缺了元素**：重建時漏資料、新元素沒加進去，都會讓存在的東西被判定為不存在。這是唯一會出現 false negative 的方式，比誤判嚴重得多
- **用 HyperLogLog 算交集、或想知道「是誰」**：它只能回答數量
- **Redis Cluster 的多 key `PFCOUNT`、`PFMERGE`**：key 不在同一個 slot 會直接報錯，要用 hash tag
- **把估計值用在需要精確的地方**：依 UV 結算廣告費、發放獎勵，約 1% 的誤差就是金額上的爭議，這類情境要用精確計數或可稽核的紀錄
- **小看 12 KB**：每個商品、每天、每種維度一個 key，100 萬個商品 × 365 天 × 12 KB 約 4.5 TB（最壞情況，流量低的 key 會用稀疏表示法而小得多）。key 的維度要設計，舊資料要設 TTL

### 資安相關

- **估計值可以被灌水**：HyperLogLog 的估計完全取決於雜湊值的前導零。如果雜湊函式是公開的（Redis 的實作原始碼可查），而元素又由 client 決定（例如未登入訪客的 visitor ID），攻擊者就能挑選雜湊值前導零特別多的元素。前面的實測中，攻擊者只送出 16,384 個請求，就讓估計值變成 124 億；先用伺服器端金鑰做 HMAC 再加入，攻擊者無法控制雜湊值，估計值回到 16,282。UV 一旦影響熱門排行、推薦或獎勵，灌水就是詐欺。對策是 HMAC、由伺服器簽發 visitor ID（簽章 cookie），再加上 rate limit
- **Bloom filter 也能被操縱**：攻擊者如果能決定加入的元素，可以挑選會設定大量不同 bit 的元素，把誤判率推高到讓 filter 失效（pollution）；如果知道雜湊函式，也能直接算出會被誤判為「可能在」的元素。本篇的商品 filter 只放入資料庫裡的 ID，攻擊者無法加入元素，風險較低；元素來自使用者時，雜湊要加上伺服器端的金鑰或隨機種子，並監控 bit 的填滿比例
- **不要用 Bloom filter 做「放行」的判斷**：例如用 Bloom filter 存 JWT 撤銷名單，以「不在名單裡」作為放行依據：filter 只要漏了一筆（同步延遲、重建失敗），被撤銷的 token 就能通過；反過來，誤判會讓正常使用者的 token 被拒絕。它只適合當快速路徑，「可能被撤銷」時再查權威資料來源（token 撤銷在 Part 8 詳談）
- **雜湊過的資料仍可能是個資**：Bloom filter 與 HyperLogLog 裡存的是雜湊值，看起來不像個資；但雜湊函式公開時，拿到這份結構的人可以逐一測試「某個 email 在不在裡面」。匯出或分享給第三方前，仍要當成個資處理，使用帶金鑰的雜湊也能降低風險

## 何時用／何時別用

- **Bloom filter**：「一定不在」能省下昂貴的操作（磁碟、網路、資料庫），而誤判的代價只是多做一次確認。例如 LSM 的 SSTable、快取穿透、爬蟲判斷 URL 是否抓過、推薦時排除看過的商品
- **HyperLogLog**：大量資料的不重複計數，能接受約 1% 誤差。例如 UV、不重複搜尋關鍵字、單一 IP 連過多少個不同的 port（偵測掃描行為）
- **別用**：需要精確值（金流、計費、庫存）、需要列出或刪除成員、資料量小到 `HashSet` 就裝得下

## 參考資料

- Burton H. Bloom, "Space/Time Trade-offs in Hash Coding with Allowable Errors", *Communications of the ACM*, 1970
- Adam Kirsch, Michael Mitzenmacher, "Less Hashing, Same Performance: Building a Better Bloom Filter", ESA 2006
- Philippe Flajolet, Éric Fusy, Olivier Gandouet, Frédéric Meunier, "HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm", AofA 2007
- Stefan Heule, Marc Nunkesser, Alexander Hall, "HyperLogLog in Practice: Algorithmic Engineering of a State of The Art Cardinality Estimation Algorithm", EDBT 2013
- Bin Fan, David G. Andersen, Michael Kaminsky, Michael D. Mitzenmacher, "Cuckoo Filter: Practically Better Than Bloom", CoNEXT 2014
- Graham Cormode, S. Muthukrishnan, "An Improved Data Stream Summary: The Count-Min Sketch and its Applications", *Journal of Algorithms*, 2005
- Thomas Gerbet, Amrit Kumar, Cédric Lauradoux, "The Power of Evil Choices in Bloom Filters", DSN 2015
- Redis Documentation — HyperLogLog：<https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/>
- Redis Documentation — PFCOUNT：<https://redis.io/docs/latest/commands/pfcount/>
- Redis Documentation — Bloom filter：<https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/>
- Guava — BloomFilter：<https://guava.dev/releases/snapshot-jre/api/docs/com/google/common/hash/BloomFilter.html>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
