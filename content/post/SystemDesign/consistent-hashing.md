---
title: "Consistent Hashing：增減節點只搬 1/N、虛擬節點與 rendezvous hashing，以及被刻意挑選的 key"
date: 2026-11-22
draft: false
author: Bill.Lin
description: "System Design 系列 Part 4：實測 hash ring、虛擬節點與 rendezvous hashing 在增減節點時的搬移量與負載，用 Guava 實作快取路由與工作分配，並示範挑選 key 壓垮單一節點的攻擊"
categories: ["SystemDesign"]
tags: ["System Design", "Consistent Hashing", "Rendezvous Hashing", "Guava", "Cache", "Load Balancing", "Security"]
---

> **System Design 系列** Part 4-3｜上一篇：[Sharding](/post/systemdesign/sharding/)｜下一篇：[分散式 ID](/post/systemdesign/distributed-id/)｜[系列地圖](/post/systemdesign/system-design-thinking/#系列地圖)

## 情境與問題

講座詳情頁的快取放在 10 台獨立的 Redis 上（不是 Redis Cluster），應用程式用 `hash(key) % 10` 決定每個 key 放在哪一台。尖峰每秒 5 萬次讀取，命中率 98%，資料庫只承受每秒 1,000 次查詢。

某天其中一台故障，運維把它從清單移除，公式變成 `hash(key) % 9`。接下來的幾秒內，資料庫的查詢量衝到每秒 4 萬次以上，接著整個倒下。

另一個場景：平台有 1,000 個企業租戶，每個租戶每 10 分鐘要跑一次報表彙整。應用程式有 3 台 instance，要讓每個租戶只由一台負責，而且 instance 增減時，盡量不要改變已經分配好的租戶。

## 最簡單的做法與它的極限

`hash(key) % N` 的分布很平均，問題在 N 改變的時候。key 的雜湊值除以 10 和除以 9 的餘數，大部分都不相同，[Sharding 篇](/post/systemdesign/sharding/)的實測中，16 台改成 17 台要搬 94% 的資料。對快取來說，「搬移」就是 cache miss：一台故障，90% 的 key 同時失效，這正是 [Cache 篇](/post/systemdesign/caching/)的雪崩。

我們要的是：**加入或移除一個節點時，只有 1/N 的 key 需要換節點**。

## 核心機制

### Hash ring

把雜湊值的範圍首尾相接，想成一個圓環：

1. 每個節點依名稱算出雜湊值，放在環上的對應位置
2. 每個 key 也算出雜湊值，從它的位置**順時針**找到的第一個節點，就是它的歸屬
3. 加入新節點時，只有「新節點和它逆時針方向上一個節點之間」的 key 會改歸新節點，其他 key 完全不動
4. 移除節點時，只有它負責的 key 會改歸順時針的下一個節點

### 虛擬節點

只用 10 個點把圓環切成 10 段，每段的長度差很多，負載也就差很多。解法是讓每個實體節點在環上出現很多次，也就是**虛擬節點**（virtual node）：每個節點用 `cache-3#0`、`cache-3#1`… 算出 100 個位置，圓環被切成 1,000 小段，每個節點分到的總長度就接近平均了。

虛擬節點還帶來兩個好處：

- **移除節點時，負載分散給所有剩下的節點**：只有一個點時，它的 key 全部交給順時針的下一個節點，那個節點的負載瞬間加倍，很可能接著倒下，形成連鎖故障
- **權重**：機器規格不同時，虛擬節點的數量和容量成正比，大機器放 200 個、小機器放 100 個

### 實測：負載平衡與搬移量

10 個節點、100 萬個 key，雜湊函式用 Guava 的 murmur3：

<details>
<summary>Hash ring 實作（<code>ConsistentHashRing.java</code>）</summary>

```java
package ring;

import com.google.common.hash.HashFunction;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

/** 不可變的 hash ring：成員變動時建立新的 ring，再整個替換，讀取端不需要加鎖。 */
public final class ConsistentHashRing {

    private final NavigableMap<Long, String> ring;
    private final HashFunction hash;

    private ConsistentHashRing(NavigableMap<Long, String> ring, HashFunction hash) {
        this.ring = ring;
        this.hash = hash;
    }

    /** vnodesByNode 的值是每個節點在 ring 上的虛擬節點數，也就是權重。 */
    public static ConsistentHashRing of(Map<String, Integer> vnodesByNode, HashFunction hash) {
        NavigableMap<Long, String> ring = new TreeMap<>();
        vnodesByNode.forEach((node, vnodes) -> {
            for (int i = 0; i < vnodes; i++) {
                ring.put(position(hash, node + "#" + i), node);
            }
        });
        return new ConsistentHashRing(ring, hash);
    }

    /** 從 key 的位置順時針找到的第一個虛擬節點；超過最後一個就繞回開頭。 */
    public String nodeFor(String key) {
        Map.Entry<Long, String> entry = ring.ceilingEntry(position(hash, key));
        return (entry != null ? entry : ring.firstEntry()).getValue();
    }

    private static long position(HashFunction hash, String value) {
        return hash.hashString(value, StandardCharsets.UTF_8).asLong();
    }
}
```

</details>

<details>
<summary>Rendezvous hashing 實作（<code>Rendezvous.java</code>）</summary>

```java
package ring;

import com.google.common.hash.HashFunction;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Comparator;

/** Rendezvous hashing：每個節點和 key 一起算一個分數，分數最高的節點擁有這個 key。不需要 ring，代價是每次查找要算 N 次。 */
public final class Rendezvous {

    private Rendezvous() {
    }

    public static String ownerOf(String key, Collection<String> nodes, HashFunction hash) {
        return nodes.stream()
                .max(Comparator.comparingLong((String node) -> hash.hashString(node + "|" + key, StandardCharsets.UTF_8).asLong())
                        .thenComparing(Comparator.naturalOrder()))
                .orElseThrow();
    }
}
```

</details>

<details>
<summary>模擬程式（<code>RingSimulation.java</code>）</summary>

```java
package ring;

import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class RingSimulation {

    static final HashFunction MURMUR = Hashing.murmur3_128();
    static final int KEYS = 1_000_000;

    public static void main(String[] args) {
        List<String> keys = new ArrayList<>(KEYS);
        for (int i = 0; i < KEYS; i++) {
            keys.add("lecture:" + i);
        }
        List<String> ten = nodes(10);
        List<String> eleven = nodes(11);

        System.out.println("10 個節點、100 萬個 key：");
        for (int vnodes : new int[] {1, 10, 100, 1000}) {
            ConsistentHashRing ring = ConsistentHashRing.of(weights(ten, vnodes), MURMUR);
            System.out.printf("  每個節點 %4d 個虛擬節點：%s%n", vnodes, balance(keys, ring::nodeFor, ten.size()));
        }

        System.out.println("\n加入第 11 個節點，要換節點的 key：");
        report("hash % N", keys, k -> ten.get(mod(k, 10)), k -> eleven.get(mod(k, 11)));
        ConsistentHashRing ring10 = ConsistentHashRing.of(weights(ten, 100), MURMUR);
        ConsistentHashRing ring11 = ConsistentHashRing.of(weights(eleven, 100), MURMUR);
        report("hash ring（100 個虛擬節點）", keys, ring10::nodeFor, ring11::nodeFor);
        report("rendezvous hashing", keys, k -> Rendezvous.ownerOf(k, ten, MURMUR), k -> Rendezvous.ownerOf(k, eleven, MURMUR));
        report("Guava consistentHash", keys,
                k -> ten.get(Hashing.consistentHash(MURMUR.hashString(k, StandardCharsets.UTF_8), 10)),
                k -> eleven.get(Hashing.consistentHash(MURMUR.hashString(k, StandardCharsets.UTF_8), 11)));

        System.out.println("\n移除 cache-3 之後，負載最重的節點是平均的幾倍：");
        List<String> nine = new ArrayList<>(ten);
        nine.remove("cache-3");
        for (int vnodes : new int[] {1, 100}) {
            ConsistentHashRing before = ConsistentHashRing.of(weights(ten, vnodes), MURMUR);
            ConsistentHashRing after = ConsistentHashRing.of(weights(nine, vnodes), MURMUR);
            Map<String, Integer> receivers = new HashMap<>();
            for (String key : keys) {
                if (before.nodeFor(key).equals("cache-3")) {
                    receivers.merge(after.nodeFor(key), 1, Integer::sum);
                }
            }
            System.out.printf("  每個節點 %3d 個虛擬節點：cache-3 的 key 分給 %d 個節點｜%s%n",
                    vnodes, receivers.size(), balance(keys, after::nodeFor, nine.size()));
        }
    }

    static String balance(List<String> keys, Function<String, String> router, int nodes) {
        Map<String, Integer> load = new HashMap<>();
        keys.forEach(k -> load.merge(router.apply(k), 1, Integer::sum));
        double avg = (double) keys.size() / nodes;
        int max = load.values().stream().mapToInt(Integer::intValue).max().orElseThrow();
        int min = load.size() < nodes ? 0 : load.values().stream().mapToInt(Integer::intValue).min().orElseThrow();
        return String.format("最重 %.2f 倍、最輕 %.2f 倍", max / avg, min / avg);
    }

    static void report(String label, List<String> keys, Function<String, String> before, Function<String, String> after) {
        long moved = keys.stream().filter(k -> !before.apply(k).equals(after.apply(k))).count();
        System.out.printf("  %5.1f%%｜%s%n", 100.0 * moved / keys.size(), label);
    }

    static int mod(String key, int n) {
        return Math.floorMod(MURMUR.hashString(key, StandardCharsets.UTF_8).asLong(), n);
    }

    static List<String> nodes(int n) {
        List<String> nodes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            nodes.add("cache-" + i);
        }
        return nodes;
    }

    static Map<String, Integer> weights(List<String> nodes, int vnodes) {
        Map<String, Integer> weights = new LinkedHashMap<>();
        nodes.forEach(node -> weights.put(node, vnodes));
        return weights;
    }
}
```

</details>

```text
10 個節點、100 萬個 key：
  每個節點    1 個虛擬節點：最重 3.22 倍、最輕 0.04 倍
  每個節點   10 個虛擬節點：最重 2.21 倍、最輕 0.41 倍
  每個節點  100 個虛擬節點：最重 1.18 倍、最輕 0.89 倍
  每個節點 1000 個虛擬節點：最重 1.06 倍、最輕 0.94 倍

加入第 11 個節點，要換節點的 key：
   90.9%｜hash % N
    9.2%｜hash ring（100 個虛擬節點）
    9.1%｜rendezvous hashing
    9.1%｜Guava consistentHash

移除 cache-3 之後，負載最重的節點是平均的幾倍：
  每個節點   1 個虛擬節點：cache-3 的 key 分給 1 個節點｜最重 2.90 倍、最輕 0.04 倍
  每個節點 100 個虛擬節點：cache-3 的 key 分給 9 個節點｜最重 1.17 倍、最輕 0.87 倍
```

- **虛擬節點的數量**：每個節點只有 1 個點時，最重的節點是平均的 3.22 倍，最輕的只有 0.04 倍，幾乎閒置。100 個時是 1.18 倍，1,000 個時 1.06 倍
- **搬移量**：`hash % N` 從 10 台變 11 台要換 90.9% 的 key；hash ring、rendezvous hashing、Guava 的 `consistentHash` 都只換約 9.1%，也就是 1/11，新節點應得的那一份
- **移除節點**：只有 1 個虛擬節點時，cache-3 的 key 全部交給同一個節點，它的負載變成平均的 2.90 倍；有 100 個虛擬節點時，這些 key 分散給剩下的 9 個節點，最重的仍只有 1.17 倍

### 其他演算法

- **Rendezvous hashing**（highest random weight）：每個節點和 key 一起算一個分數，分數最高的節點擁有這個 key。不需要 ring 與虛擬節點，分布天生平均，移除任何節點都只影響它自己的 key。代價是每次查找要算 N 次，節點數量在幾十個以內時很適合
- **Guava `Hashing.consistentHash`**：輸入一個雜湊值與 bucket 數量，回傳 0 到 N−1 的 bucket，不需要任何記憶體。限制是 bucket 只能從最後一個開始移除：從 `[alpha, bravo, charlie]` 拿掉 alpha，它無法表達「alpha 消失了」，結果會是 alpha 的流量給 bravo、bravo 的給 charlie。適合編號固定、只會依序增減的分片，不適合可能任意故障的節點。Lamping 與 Veach 發表的 Jump Consistent Hash 也是同樣的介面與限制
- **Maglev hashing**（Google）：預先算好一張固定大小的查找表，查找只要一次陣列存取，分布也很平均，常用在負載平衡器
- **有界負載**（consistent hashing with bounded loads）：限制每個節點的負載不能超過平均的某個倍數，超過就順著 ring 找下一個節點。HAProxy 的 `hash-balance-factor` 就是這個做法，文件建議設在 125 到 200（即平均的 1.25 到 2 倍）

### 實際的系統怎麼做

- **Redis Cluster** 沒有用 hash ring：key 用 CRC16 對應到 16,384 個 hash slot，每個節點負責一部分 slot。這就是 Sharding 篇的邏輯分片，搬移以 slot 為單位
- **Dynamo、Cassandra** 用 token ring 加上虛擬節點；每個 key 除了存在順時針的第一個節點，也複製到接下來的幾個**不同的實體節點**上（跳過同一台機器的其他虛擬節點）
- **負載平衡器**：Envoy 提供 ring hash 與 Maglev 兩種策略，HAProxy 有 `hash-type consistent`，用來讓同一個使用者或同一個 URL 固定送到同一台後端，提高後端本機快取的命中率（[Load Balancing 篇](/post/systemdesign/load-balancing/)）

## 方案比較

| | `hash % N` | Hash ring + 虛擬節點 | Rendezvous | Guava `consistentHash` | Slot 對照表 |
|---|---|---|---|---|---|
| 增減節點的搬移量 | 幾乎全部 | 約 1/N | 約 1/N | 約 1/N | 只搬被指定的 slot |
| 負載平衡 | 很平均 | 取決於虛擬節點數 | 很平均 | 很平均 | 由對照表決定 |
| 查找成本 | O(1) | O(log(N × V)) | O(N) | O(log N) | O(1) |
| 移除任意節點 | 可以，但幾乎全部重排 | 可以 | 可以 | 只能移除最後一個 | 可以 |
| 需要協調者 | 否 | 否 | 否 | 否 | 是，對照表要有人維護 |

有中央協調者能維護對照表時（例如資料庫分片），slot 對照表的控制最精確；沒有協調者、每個用戶端要自己算出相同結果時（快取路由、負載平衡、工作分配），才是 consistent hashing 的主場。

## Java 落地

### 1. 快取路由

`ConsistentHashRing` 是不可變的：節點清單改變時建立新的 ring，再用一個 `volatile` 欄位或 `AtomicReference` 整個替換，讀取端不需要加鎖。用法：

```java
Map<String, Integer> weights = Map.of("cache-0", 100, "cache-1", 100, "cache-2", 200);   // cache-2 的容量是兩倍
ConsistentHashRing ring = ConsistentHashRing.of(weights, Hashing.murmur3_128());
String node = ring.nodeFor("lecture:42");
```

能改用 Redis Cluster 時，就交給它的 slot 機制處理，不需要自己維護 ring。

### 2. 租戶工作分配：rendezvous hashing

每個 instance 從服務註冊（例如 Kubernetes 的 Endpoints）取得目前存活的 instance 清單，各自算出「哪些租戶歸我」，不需要互相溝通：

```java
package ring;

import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;

/** 每個 instance 只處理自己擁有的租戶。成員清單來自服務註冊，每次排程執行時重新取得。 */
public class TenantJobRunner {

    private static final HashFunction HASH = Hashing.murmur3_128();

    private final String self;
    private final Supplier<Set<String>> liveInstances;

    public TenantJobRunner(String self, Supplier<Set<String>> liveInstances) {
        this.self = self;
        this.liveInstances = liveInstances;
    }

    public List<String> ownedTenants(List<String> tenants) {
        Set<String> members = liveInstances.get();
        if (!members.contains(self)) {
            return List.of();                   // 自己不在清單上（剛啟動或已被移出），不處理任何租戶
        }
        return tenants.stream()
                .filter(tenant -> Rendezvous.ownerOf(tenant, members, HASH).equals(self))
                .toList();
    }
}
```

1,000 個租戶在 instance 增減時的變化：

<details>
<summary>驗證程式（<code>OwnershipDemo.java</code>）</summary>

```java
package ring;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

public class OwnershipDemo {

    public static void main(String[] args) {
        List<String> tenants = new ArrayList<>();
        for (int i = 1; i <= 1_000; i++) {
            tenants.add("tenant-" + i);
        }
        Map<String, String> abc = assign(tenants, Set.of("app-a", "app-b", "app-c"));
        Map<String, String> ac = assign(tenants, Set.of("app-a", "app-c"));
        Map<String, String> abcd = assign(tenants, Set.of("app-a", "app-b", "app-c", "app-d"));
        System.out.println("app-a、app-b、app-c：" + counts(abc));
        System.out.println("app-b 下線：" + counts(ac) + "｜換 owner 的租戶：" + moves(abc, ac));
        System.out.println("加入 app-d：" + counts(abcd) + "｜換 owner 的租戶：" + moves(abc, abcd));
    }

    /** 每個 instance 各自計算自己擁有哪些租戶，合起來看分配結果。 */
    static Map<String, String> assign(List<String> tenants, Set<String> members) {
        Map<String, String> owner = new HashMap<>();
        for (String member : members) {
            new TenantJobRunner(member, () -> members).ownedTenants(tenants)
                    .forEach(tenant -> owner.merge(tenant, member, (a, b) -> a + "," + b));
        }
        return owner;
    }

    static Map<String, Integer> counts(Map<String, String> owner) {
        Map<String, Integer> counts = new TreeMap<>();
        owner.values().forEach(member -> counts.merge(member, 1, Integer::sum));
        return counts;
    }

    static String moves(Map<String, String> before, Map<String, String> after) {
        Map<String, Integer> moves = new TreeMap<>();
        before.forEach((tenant, from) -> {
            String to = after.get(tenant);
            if (!from.equals(to)) {
                moves.merge(from + " → " + to, 1, Integer::sum);
            }
        });
        return moves.toString();
    }
}
```

</details>

```text
app-a、app-b、app-c：{app-a=340, app-b=307, app-c=353}
app-b 下線：{app-a=491, app-c=509}｜換 owner 的租戶：{app-b → app-a=151, app-b → app-c=156}
加入 app-d：{app-a=250, app-b=222, app-c=277, app-d=251}｜換 owner 的租戶：{app-a → app-d=90, app-b → app-d=85, app-c → app-d=76}
```

- app-b 下線時，只有它原本的 307 個租戶換 owner，平均分給 app-a 與 app-c；app-a、app-c 原本的租戶完全不動
- 加入 app-d 時，三台各讓出約 1/4 給 app-d，彼此之間沒有交換

注意每台 instance 看到的成員清單不一定同時更新。app-b 剛下線的那幾秒，app-a 可能還沒看到變化，這段期間 app-b 的租戶沒有人處理；反過來，新加入的 instance 可能和舊的 owner 同時處理同一個租戶。工作本身要能安全地重複執行（冪等），或者再加上租約（[分散式鎖篇](/post/systemdesign/distributed-lock/)）。

## 踩坑與 Gotchas

- **不同服務的雜湊實作不一致**：Java 服務和 Node.js 服務對同一個 key 算出不同的節點，資料就寫到一台、讀另一台。雜湊函式、輸入的編碼、取前幾個位元組都要明確規定。HAProxy 的文件也提醒，多台負載平衡器要用完全相同的伺服器 ID，才會得到相同的分布
- **用 IP 當節點名稱**：Kubernetes 的 Pod 重啟後 IP 會變，ring 上的位置跟著變。要用穩定的名稱，例如 StatefulSet 的 Pod 名稱
- **新節點是空的**：新加入的快取節點負責的 1/N 個 key 全部 miss。可以逐步提高它的權重（虛擬節點數），讓流量慢慢移過去
- **節點反覆上下線**：健康檢查太敏感時，節點在 ring 上進進出出，每次都搬移一部分 key。下線與重新加入都要有緩衝時間
- **以為 consistent hashing 能解決熱門 key**：同一個 key 永遠在同一個節點。熱門 key 要用本機快取、複製多份，或有界負載
- **虛擬節點太少**：實測中每個節點 10 個虛擬節點，最重的節點仍是平均的 2.21 倍

### 資安相關

- **攻擊者可以挑選 key**：key 來自使用者時（使用者名稱、自訂網址、上傳的檔名），而路由用的雜湊函式是公開的，攻擊者可以在自己的電腦上挑出會落到同一個節點的 key：

  <details>
  <summary>示範程式（<code>HashFloodDemo.java</code>）</summary>

  ```java
  package ring;

  import com.google.common.hash.HashFunction;
  import com.google.common.hash.Hashing;
  import java.security.SecureRandom;
  import java.util.ArrayList;
  import java.util.HashMap;
  import java.util.LinkedHashMap;
  import java.util.List;
  import java.util.Map;
  import java.util.Random;

  /** 攻擊者知道系統用沒有金鑰的 murmur3 與節點名稱（開源設定檔、錯誤訊息），自己挑選會落到同一個節點的 key。 */
  public class HashFloodDemo {

      public static void main(String[] args) {
          Map<String, Integer> vnodes = new LinkedHashMap<>();
          for (int i = 0; i < 10; i++) {
              vnodes.put("cache-" + i, 100);
          }
          ConsistentHashRing publicRing = ConsistentHashRing.of(vnodes, Hashing.murmur3_128());

          Random attacker = new Random(1);
          List<String> crafted = new ArrayList<>();
          long attempts = 0;
          while (crafted.size() < 10_000) {
              String key = "user:" + Long.toHexString(attacker.nextLong());
              attempts++;
              if (publicRing.nodeFor(key).equals("cache-3")) {
                  crafted.add(key);
              }
          }
          System.out.printf("攻擊者在自己的電腦上試了 %,d 個 key，挑出 %,d 個會落到 cache-3 的 key%n", attempts, crafted.size());

          SecureRandom secret = new SecureRandom();
          HashFunction keyed = Hashing.sipHash24(secret.nextLong(), secret.nextLong());
          ConsistentHashRing keyedRing = ConsistentHashRing.of(vnodes, keyed);
          System.out.println("沒有金鑰的 murmur3：" + share(crafted, publicRing));
          System.out.println("帶秘密金鑰的 SipHash：" + share(crafted, keyedRing));
      }

      static String share(List<String> keys, ConsistentHashRing ring) {
          Map<String, Integer> load = new HashMap<>();
          keys.forEach(k -> load.merge(ring.nodeFor(k), 1, Integer::sum));
          int max = load.values().stream().mapToInt(Integer::intValue).max().orElseThrow();
          return String.format("cache-3 收到 %.1f%%，最忙的節點收到 %.1f%%",
                  100.0 * load.getOrDefault("cache-3", 0) / keys.size(), 100.0 * max / keys.size());
      }
  }
  ```

  </details>

  ```text
  攻擊者在自己的電腦上試了 103,741 個 key，挑出 10,000 個會落到 cache-3 的 key
  沒有金鑰的 murmur3：cache-3 收到 100.0%，最忙的節點收到 100.0%
  帶秘密金鑰的 SipHash：cache-3 收到 9.9%，最忙的節點收到 13.1%
  ```

  10 個節點時，平均每試 10 個 key 就有 1 個落在 cache-3，攻擊者試了約 10 萬個，挑出來的 1 萬個 key 全部落在 cache-3。換成帶秘密金鑰的 SipHash，攻擊者無法預先計算，同一批 key 被平均打散。這和 [Bloom Filter 篇](/post/systemdesign/bloom-filter-hyperloglog/)的 HyperLogLog 灌水、以及雜湊表的 hash flooding 是同一類攻擊。注意只給 murmur3 換一個隨機 seed 不夠，已知有不受 seed 影響的碰撞，所以要用 SipHash 這類為此設計的帶金鑰函式。所有路由端要共用同一把金鑰，換金鑰等於整個 ring 重排
- **叢集成員要驗證**：節點透過 gossip 自動加入 ring 的系統（Cassandra、Redis Cluster 的叢集匯流排），如果沒有驗證，惡意節點加入後就會分到一部分 key 與資料。節點之間要用 mTLS 或其他驗證機制
- **同一個節點上有不同租戶的資料**：路由只決定資料放哪台，不提供隔離。key 要帶租戶前綴，讀取時仍要檢查權限

## 何時用／何時別用

- **用**：用戶端自己路由的快取叢集、負載平衡器的親和性路由、動態增減的 instance 之間分配工作、Dynamo 類的分散式儲存
- **別用**：有中央協調者能維護 slot 對照表（資料庫分片通常是這種情況）；節點數量固定、幾乎不會改變
- **選哪一種**：節點少、可能任意故障 → rendezvous；節點多、需要權重 → hash ring 加虛擬節點；編號固定、只會依序擴充 → Guava `consistentHash`；負載平衡器 → Maglev 或有界負載

## 參考資料

- David Karger et al., "Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web", *STOC*, 1997
- David G. Thaler, Chinya V. Ravishankar, "Using Name-Based Mappings to Increase Hit Rates", *IEEE/ACM Transactions on Networking*, 1998
- John Lamping, Eric Veach, "A Fast, Minimal Memory, Consistent Hash Algorithm", arXiv:1406.2294, 2014
- Daniel E. Eisenbud et al., "Maglev: A Fast and Reliable Software Network Load Balancer", *NSDI*, 2016
- Vahab Mirrokni, Mikkel Thorup, Morteza Zadimoghaddam, "Consistent Hashing with Bounded Loads", *SODA*, 2018
- Giuseppe DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store", *SOSP*, 2007
- Jean-Philippe Aumasson, Daniel J. Bernstein, "SipHash: a fast short-input PRF", *INDOCRYPT*, 2012
- HAProxy Configuration Manual（`hash-type`、`hash-balance-factor`）：<https://www.haproxy.org/download/3.3/doc/configuration.txt>
- 互動圖解延伸：Dilum Sanjaya，System Design — an interactive course：<https://designed-to-scale.vercel.app/>
