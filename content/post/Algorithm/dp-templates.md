---
title: "動態規劃入門模板：背包、LIS、編輯距離"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "從 0/1 背包、完全背包到 LIS 與編輯距離，拆解 DP 三要素並提供可直接套用的 Java 模板與 LeetCode 對應題"
categories: ["Algorithm"]
tags: ["Algorithm", "Dynamic Programming", "LeetCode", "DP", "Backpack"]
---

## DP 三要素

拿到任何 DP 題，先確認這三件事：

1. **狀態定義**：`dp[i]` 或 `dp[i][j]` 代表什麼？
2. **轉移方程**：當前狀態如何從子問題推導？
3. **初始化**：Base case 是什麼？遍歷方向是從前到後還是後到前？

這三點清楚後，程式碼幾乎是機械式填寫。

---

## 0/1 背包（01 Knapsack）

### 問題

有 N 個物品，每個有重量 `weights[i]` 和價值 `values[i]`，背包容量 W。每個物品只能拿一次，求最大價值。

### 2D DP（最易理解）

```java
int knapsack01(int[] weights, int[] values, int W) {
    int n = weights.length;
    // dp[i][w] = 只考慮前 i 個物品，容量為 w 時的最大價值
    int[][] dp = new int[n + 1][W + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i-1][w];  // 不拿第 i 個物品
            if (w >= weights[i-1]) {
                // 拿第 i 個物品
                dp[i][w] = Math.max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1]);
            }
        }
    }
    return dp[n][W];
}
```

### 1D 滾動陣列（空間 O(W)）

```java
int knapsack01Optimized(int[] weights, int[] values, int W) {
    int n = weights.length;
    int[] dp = new int[W + 1];  // dp[w] = 容量 w 時的最大價值

    for (int i = 0; i < n; i++) {
        // 必須從右到左（大容量先更新），防止同一物品被重複選取
        for (int w = W; w >= weights[i]; w--) {
            dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[W];
}
```

**為什麼逆序**：若從左到右（小容量先更新），`dp[w]` 更新時用到的 `dp[w - weights[i]]` 可能已是本輪更新的值，等同於拿了兩次第 i 個物品。

### 相關題型

- **LC 416 Partition Equal Subset Sum**：能否分成兩個和相等的子集 → 能否從陣列選若干數，使總和 = sum/2（0/1 背包，`values[i] = weights[i]`）

```java
public boolean canPartition(int[] nums) {
    int sum = Arrays.stream(nums).sum();
    if (sum % 2 != 0) return false;
    int target = sum / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums) {
        for (int w = target; w >= num; w--) {
            dp[w] = dp[w] || dp[w - num];
        }
    }
    return dp[target];
}
```

- **LC 494 Target Sum**：給每個數加 + 或 -，求組合數 → 轉化為 0/1 背包計數問題

---

## 完全背包（Unbounded Knapsack）

每個物品可以無限次拿取。與 0/1 背包的差別：**內層迴圈改為正序**（小容量先更新），這樣 `dp[w - weights[i]]` 是本輪更新的值，等同於允許同一物品再次拿取。

```java
int knapsackUnbounded(int[] weights, int[] values, int W) {
    int[] dp = new int[W + 1];
    for (int i = 0; i < weights.length; i++) {
        for (int w = weights[i]; w <= W; w++) {  // 正序！
            dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[W];
}
```

### 相關題型

- **LC 322 Coin Change**：最少硬幣數 → 完全背包，`values[i] = 1`，求最小值

```java
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);  // 初始化為不可達的大數
    dp[0] = 0;
    for (int coin : coins) {
        for (int w = coin; w <= amount; w++) {
            dp[w] = Math.min(dp[w], dp[w - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```

- **LC 518 Coin Change II**：組合數 → 完全背包，但兩層迴圈**不能交換**（外層物品，內層容量）才能避免重複計算同一組合的不同排列

---

## 最長遞增子序列（LIS）

### O(n²) DP

```java
int lis(int[] nums) {
    int n = nums.length;
    // dp[i] = 以 nums[i] 結尾的最長遞增子序列長度
    int[] dp = new int[n];
    Arrays.fill(dp, 1);  // 每個元素自己就是長度 1 的 LIS
    int max = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
        max = Math.max(max, dp[i]);
    }
    return max;
}
```

### O(n log n)：Patience Sort + Binary Search

`tails[i]` 代表「長度為 i+1 的遞增子序列中，最小的結尾元素」。每個新元素用 binary search 找到能替換的位置：

```java
int lisOptimal(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int num : nums) {
        // 找 tails 中第一個 >= num 的位置
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1);  // binarySearch 未找到時回傳 -(insertion point) - 1

        if (pos == tails.size()) {
            tails.add(num);  // num 比所有 tails 都大，LIS 長度 +1
        } else {
            tails.set(pos, num);  // 替換，讓結尾更小（有利於後續延伸）
        }
    }
    return tails.size();
}
```

**注意**：`tails` 陣列**不是** LIS 本身，只是用來計算長度。若需要重建 LIS 路徑，需要額外的 parent 陣列追蹤。

### 相關題型

- **LC 300 Longest Increasing Subsequence**：基本題
- **LC 354 Russian Doll Envelopes**：2D LIS，先對第一維升序排序，第二維降序排序，再對第二維跑 LIS

```java
public int maxEnvelopes(int[][] envelopes) {
    // 第一維升序，同一寬度的第二維降序（防止同一寬度被多次選取）
    Arrays.sort(envelopes, (a, b) -> a[0] != b[0] ? a[0] - b[0] : b[1] - a[1]);
    int[] heights = Arrays.stream(envelopes).mapToInt(e -> e[1]).toArray();
    return lisOptimal(heights);
}
```

---

## 編輯距離（Edit Distance / Levenshtein）

### 問題

最少需要幾次操作（insert、delete、replace）將 `word1` 轉換為 `word2`。

### 實作

```java
int editDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    // dp[i][j] = word1[0..i-1] 轉換為 word2[0..j-1] 的最少操作數
    int[][] dp = new int[m + 1][n + 1];

    // Base case：一個字串為空時，全部插入或刪除
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i-1) == word2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1];  // 字元相同，不需操作
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i-1][j-1],  // replace
                    Math.min(
                        dp[i-1][j],  // delete from word1
                        dp[i][j-1]   // insert into word1
                    )
                );
            }
        }
    }
    return dp[m][n];
}
```

### 轉移方程說明

```
word1[i] == word2[j]：
    dp[i][j] = dp[i-1][j-1]  （不需操作）

word1[i] != word2[j]：
    dp[i][j] = 1 + min(
        dp[i-1][j-1],   replace word1[i] with word2[j]
        dp[i-1][j],     delete word1[i]
        dp[i][j-1]      insert word2[j] after word1[i]
    )
```

### 相關題型

- **LC 72 Edit Distance**：基本題
- **LC 583 Delete Operation for Two Strings**：只允許刪除 → `LCS` 思路，答案 = `m + n - 2 * LCS`

---

## 常見 DP 模式速查

| 問題類型 | 代表 LeetCode | 關鍵模板 | 空間優化 |
|---------|--------------|---------|---------|
| 0/1 背包 | 416, 494 | 外層物品，內層容量**逆序** | O(W) |
| 完全背包 | 322, 518 | 外層物品，內層容量**正序** | O(W) |
| LIS | 300, 354 | patience sort + binary search | O(n) |
| 編輯距離 | 72, 583 | 2D DP，三選一 min | O(min(m,n)) |
| 區間 DP | 312, 1039 | 外層枚舉長度，內層枚舉左端點 | — |
| 樹形 DP | 337, 543 | DFS post-order，回傳多個狀態 | — |
| 狀態壓縮 DP | 847, 1125 | bitmask 表示子集狀態 | — |

---

## 區間 DP 框架（補充）

LC 312 Burst Balloons：

```java
public int maxCoins(int[] nums) {
    int n = nums.length;
    int[] arr = new int[n + 2];
    arr[0] = arr[n + 1] = 1;
    for (int i = 0; i < n; i++) arr[i + 1] = nums[i];

    int m = n + 2;
    int[][] dp = new int[m][m];

    // 枚舉區間長度（從小到大）
    for (int len = 2; len < m; len++) {
        for (int left = 0; left < m - len; left++) {
            int right = left + len;
            // k 是區間 (left, right) 中最後一個被戳破的氣球
            for (int k = left + 1; k < right; k++) {
                dp[left][right] = Math.max(
                    dp[left][right],
                    dp[left][k] + arr[left] * arr[k] * arr[right] + dp[k][right]
                );
            }
        }
    }
    return dp[0][m - 1];
}
```

---

## 小結

- **0/1 背包 vs 完全背包**：差別只在內層迴圈方向（逆序 vs 正序）。
- **LIS**：O(n²) 夠用於 n <= 2000；O(n log n) 的 patience sort 是面試加分。
- **編輯距離**：三個操作對應三個方向的 DP 轉移，記住方向比背公式重要。
- 遇到新 DP 題：先想狀態定義，畫出轉移方向，再考慮空間優化。
