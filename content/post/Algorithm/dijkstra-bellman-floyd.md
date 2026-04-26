---
title: "最短路三兄弟：Dijkstra / Bellman-Ford / Floyd-Warshall"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "帶實作程式碼深入比較 Dijkstra、Bellman-Ford、Floyd-Warshall 三種最短路演算法的原理、複雜度與適用場景"
categories: ["Algorithm"]
tags: ["Algorithm", "Graph", "Shortest Path", "Dijkstra", "LeetCode"]
---

## 問題定義

給定一個帶權圖（有向或無向），找從某點（或所有點）到其他點的最短路徑。

三種演算法各有不同的適用前提：

| 演算法 | 來源 | 負權重 | 負環偵測 | 時間複雜度 |
|--------|------|--------|---------|-----------|
| Dijkstra | 單源 | 不支援 | 否 | O((V+E) log V) |
| Bellman-Ford | 單源 | 支援 | 是 | O(VE) |
| Floyd-Warshall | 全對 | 支援 | 是（對角線 < 0）| O(V³) |

---

## Dijkstra

### 原理

貪心策略 + Priority Queue。每次從未確定的節點中取出距離最小的，再用它更新鄰居的距離。**前提：所有邊權重 >= 0**。

### 實作

```java
public int[] dijkstra(int n, int[][] edges, int src) {
    // 建立鄰接表
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] e : edges) {
        graph.computeIfAbsent(e[0], k -> new ArrayList<>()).add(new int[]{e[1], e[2]});
        graph.computeIfAbsent(e[1], k -> new ArrayList<>()).add(new int[]{e[0], e[2]});
    }

    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // [node, distance]
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
    pq.offer(new int[]{src, 0});

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], d = curr[1];
        // 若取出的距離比已知更大，代表這個狀態已過時
        if (d > dist[u]) continue;

        for (int[] next : graph.getOrDefault(u, List.of())) {
            int v = next[0], w = next[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.offer(new int[]{v, dist[v]});
            }
        }
    }
    return dist;
}
```

### 關鍵細節

- `if (d > dist[u]) continue;`：Priority Queue 可能存有同一節點的多個過時條目，這行跳過它們，是效能的關鍵。
- 不用 `visited[]` 陣列，用距離比較達到同樣效果，程式碼更簡潔。

### 相關 LeetCode

- **743 Network Delay Time**：單源最短路，到達所有節點的最長距離。

```java
// LC 743 核心
int[] dist = dijkstra(n + 1, times, k);
int ans = 0;
for (int i = 1; i <= n; i++) {
    if (dist[i] == Integer.MAX_VALUE) return -1;
    ans = Math.max(ans, dist[i]);
}
return ans;
```

---

## Bellman-Ford

### 原理

動態規劃思維。最短路最多經過 V-1 條邊（若存在更短路，必有負環）。對所有邊 relax V-1 次。

### 實作

```java
public int[] bellmanFord(int n, int[][] edges, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // Relax 所有邊 n-1 次
    for (int i = 0; i < n - 1; i++) {
        boolean updated = false;
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // 提前結束：沒有任何更新
    }

    // 第 n 次 relax：若仍可更新，存在負環
    for (int[] e : edges) {
        int u = e[0], v = e[1], w = e[2];
        if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
            throw new IllegalStateException("Negative cycle detected");
        }
    }

    return dist;
}
```

### 負環偵測

第 n 次（多一次）relax 仍能縮短距離，代表存在負環（路徑可以無限縮短）。

### 相關 LeetCode

- **787 Cheapest Flights Within K Stops**：最多經過 K 條中間邊的最短路，限制 relax 次數即可。

```java
// LC 787：只 relax k+1 次（最多 k 個中轉站）
public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    for (int i = 0; i <= k; i++) {
        int[] prev = dist.clone(); // 必須用上一輪結果，防止同輪多次更新
        for (int[] flight : flights) {
            int u = flight[0], v = flight[1], w = flight[2];
            if (prev[u] != Integer.MAX_VALUE && prev[u] + w < dist[v]) {
                dist[v] = prev[u] + w;
            }
        }
    }
    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
}
```

注意：限制 relax 次數時**必須複製上一輪的 dist**（`int[] prev = dist.clone()`），否則同一輪的更新會連鎖傳遞，繞過 K 的限制。

---

## Floyd-Warshall

### 原理

動態規劃。`dp[i][j]` = 從 i 到 j，只經過 `{0, 1, ..., k}` 中節點的最短距離。枚舉中間節點 k，逐步放寬路徑可以經過的節點集合。

### 實作

```java
public int[][] floydWarshall(int n, int[][] edges) {
    int[][] dp = new int[n][n];
    // 初始化：不可達設為大數（避免加法 overflow，用 MAX_VALUE/2）
    for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE / 2);
    for (int i = 0; i < n; i++) dp[i][i] = 0;
    for (int[] e : edges) {
        // 有向圖：只設一個方向
        dp[e[0]][e[1]] = Math.min(dp[e[0]][e[1]], e[2]);
    }

    // k 是中間節點（枚舉順序：k 必須在最外層）
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dp[i][k] + dp[k][j] < dp[i][j]) {
                    dp[i][j] = dp[i][k] + dp[k][j];
                }
            }
        }
    }

    // 偵測負環：dp[i][i] < 0
    for (int i = 0; i < n; i++) {
        if (dp[i][i] < 0) {
            throw new IllegalStateException("Negative cycle detected at node " + i);
        }
    }

    return dp;
}
```

### 為什麼 k 必須在最外層

`dp[i][j]` 的語意是「只用 `{0..k}` 作為中間節點的最短路」。若 k 在內層，計算 `dp[i][j]` 時可能用到尚未完成更新的 `dp[i][k]` 或 `dp[k][j]`，破壞 DP 的子問題假設。

### 相關 LeetCode

- **1334 Find the City With the Smallest Number of Neighbors at a Threshold Distance**

```java
public int findTheCity(int n, int[][] edges, int distanceThreshold) {
    int[][] dist = floydWarshall(n, edges);
    int ans = -1, minCount = n + 1;
    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = 0; j < n; j++) {
            if (i != j && dist[i][j] <= distanceThreshold) count++;
        }
        if (count <= minCount) { // 相等時取 index 較大（題目要求）
            minCount = count;
            ans = i;
        }
    }
    return ans;
}
```

---

## 完整比較表

| | Dijkstra | Bellman-Ford | Floyd-Warshall |
|--|---------|-------------|----------------|
| 來源數 | 單源 | 單源 | 全對（all-pairs）|
| 負權重 | 不支援 | 支援 | 支援 |
| 負環偵測 | 否 | 是（第 n 次 relax）| 是（對角線 < 0）|
| 時間複雜度 | O((V+E) log V) | O(VE) | O(V³) |
| 空間複雜度 | O(V+E) | O(V+E) | O(V²) |
| 稀疏圖 | 優 | 中 | 差（V³ 固定）|
| 稠密圖 | 中 | 差 | 可接受（V 小）|
| 適用 V 上限 | ~10⁶ | ~10³ | ~500 |
| 實作複雜度 | 中 | 低 | 低 |

---

## 選擇指引

```
有負權重？
├── 是
│   ├── 需要全對最短路？ → Floyd-Warshall（V <= 500）
│   └── 單源？          → Bellman-Ford
└── 否（所有邊 >= 0）
    ├── 需要全對最短路？
    │   ├── V 小（<= 500）→ Floyd-Warshall 或跑 V 次 Dijkstra
    │   └── V 大          → 跑 V 次 Dijkstra
    └── 單源 → Dijkstra（最常用）
```

---

## 常見錯誤

**Dijkstra 用在負權重圖**：貪心假設「已確定最短路的節點不需再更新」在有負權重時不成立，可能漏掉更短的路徑。

**Bellman-Ford 忘記複製前一輪陣列**：在限制 relax 次數（如 LC 787）的場景中，必須基於上一輪的 dist 更新，否則一輪內的連鎖更新會讓路徑超過 K 跳。

**Floyd-Warshall 初始化用 `Integer.MAX_VALUE`**：加法 overflow。`MAX_VALUE / 2` 是安全值，足夠大且不 overflow。
