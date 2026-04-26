---
title: "並查集（Union-Find）演算法完整指南"
author: Bill.Lin
date: 2022-09-26T22:15:44+08:00
draft: false
tags: ["Algorithm", "UnionFind", "DisjointSet", "Graph", "Java"]
Description: "深入探討並查集數據結構的原理、優化技巧與實際應用，包含路徑壓縮和按秩合併等優化策略"
Categories: ["Algorithm"]
DisableComments: false
aliases:
  - /post/Algorithm/UnionFind/

---

## 概述

並查集（Union-Find）又稱為不相交集合（Disjoint Set），是一種用來處理不相交集合的合併和查詢問題的數據結構。它支援兩種主要操作：

1. **Find**：查找元素所屬的集合（返回集合的代表元素）
2. **Union**：合併兩個不同的集合

並查集在圖論演算法中應用廣泛，特別適用於解決連通性問題。

## 基本原理

### 核心概念

並查集將每個集合表示為一棵樹，樹的根節點作為該集合的**代表元素**。初始狀態下，每個元素都是獨立的集合（自己是自己的父節點）。

```
初始狀態：
0   1   2   3   4
↓   ↓   ↓   ↓   ↓
0   1   2   3   4

合併 0 和 1 後：
  0       2   3   4
 ↙        ↓   ↓   ↓
1         2   3   4

合併 2 和 3 後：
  0     2     4
 ↙     ↙      ↓
1     3       4
```

### 基本實作

```java
public class UnionFind {
    private int[] parent;  // parent[i] 表示元素 i 的父節點
    private int[] rank;    // rank[i] 表示以 i 為根的樹的高度
    private int components; // 連通分量的數量
    
    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        
        // 初始化：每個元素都是獨立的集合
        for (int i = 0; i < n; i++) {
            parent[i] = i;  // 自己是自己的父節點
            rank[i] = 0;    // 初始高度為 0
        }
    }
    
    /**
     * 查找元素 x 所屬集合的代表元素
     */
    public int find(int x) {
        if (parent[x] != x) {
            // 路徑壓縮：將路徑上所有節點直接連接到根節點
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }
    
    /**
     * 合併元素 x 和 y 所屬的集合
     */
    public boolean union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        
        // 如果已經在同一個集合中，返回 false
        if (rootX == rootY) {
            return false;
        }
        
        // 按秩合併：將較矮的樹合併到較高的樹下
        if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;  // 高度相同時，合併後高度加 1
        }
        
        components--;  // 連通分量減 1
        return true;
    }
    
    /**
     * 檢查兩個元素是否在同一個集合中
     */
    public boolean connected(int x, int y) {
        return find(x) == find(y);
    }
    
    /**
     * 獲取連通分量的數量
     */
    public int getComponentCount() {
        return components;
    }
}
```

## 優化技巧

### 1. 路徑壓縮（Path Compression）

在 `find` 操作中，將查找路徑上的所有節點直接連接到根節點，使樹變得更加扁平。

```java
public int find(int x) {
    if (parent[x] != x) {
        parent[x] = find(parent[x]);  // 遞歸壓縮路徑
    }
    return parent[x];
}
```

### 2. 按秩合併（Union by Rank）

總是將較矮的樹合併到較高的樹下，避免樹變得過高。

```java
public boolean union(int x, int y) {
    int rootX = find(x);
    int rootY = find(y);
    
    if (rootX == rootY) return false;
    
    // 按秩合併
    if (rank[rootX] < rank[rootY]) {
        parent[rootX] = rootY;
    } else if (rank[rootX] > rank[rootY]) {
        parent[rootY] = rootX;
    } else {
        parent[rootY] = rootX;
        rank[rootX]++;
    }
    
    return true;
}
```

### 3. 按大小合併（Union by Size）

另一種優化策略是將較小的集合合併到較大的集合中：

```java
public class UnionFindBySize {
    private int[] parent;
    private int[] size;  // size[i] 表示以 i 為根的集合大小
    
    public UnionFindBySize(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;  // 初始每個集合大小為 1
        }
    }
    
    public boolean union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        
        if (rootX == rootY) return false;
        
        // 按大小合併：將小集合合併到大集合
        if (size[rootX] < size[rootY]) {
            parent[rootX] = rootY;
            size[rootY] += size[rootX];
        } else {
            parent[rootY] = rootX;
            size[rootX] += size[rootY];
        }
        
        return true;
    }
}
```

## 時間複雜度

| 操作 | 時間複雜度 | 說明 |
|------|-----------|------|
| 初始化 | O(n) | 建立 n 個獨立集合 |
| Find（無優化） | O(n) | 最壞情況下需要遍歷整條鏈 |
| Union（無優化） | O(n) | 需要調用 Find 操作 |
| Find（路徑壓縮） | O(α(n)) | α(n) 是阿克曼函數的反函數 |
| Union（按秩合併） | O(α(n)) | 近似常數時間 |

其中 α(n) 是阿克曼函數的反函數，在實際應用中可視為常數。

## 經典應用題型

### 1. 等式方程的可滿足性（LeetCode 990）

**問題描述**：給定一個由表示變數之間關係的字串組成的陣列 `equations`，每個字串 `equations[i]` 的長度為 4，有兩種形式：`"a==b"` 或 `"a!=b"`。判斷是否所有等式都能同時滿足。

```java
class Solution {
    private int[] parent = new int[26];  // 26 個字母
    
    public boolean equationsPossible(String[] equations) {
        // 初始化並查集
        for (int i = 0; i < 26; i++) {
            parent[i] = i;
        }
        
        // 第一遍：處理所有等式，合併相等的變數
        for (String equation : equations) {
            if (equation.charAt(1) == '=') {
                union(equation.charAt(0) - 'a', equation.charAt(3) - 'a');
            }
        }
        
        // 第二遍：檢查不等式是否違反了等式的結果
        for (String equation : equations) {
            if (equation.charAt(1) == '!') {
                int x = equation.charAt(0) - 'a';
                int y = equation.charAt(3) - 'a';
                if (find(x) == find(y)) {
                    return false;  // 不等式矛盾
                }
            }
        }
        
        return true;
    }
    
    private int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }
    
    private void union(int x, int y) {
        parent[find(x)] = find(y);
    }
}
```

### 2. 朋友圈數量（LeetCode 547）

**問題描述**：班上有 N 名學生。其中有些人是朋友，有些則不是。他們的友誼具有傳遞性。找出朋友圈的總數。

```java
class Solution {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        UnionFind uf = new UnionFind(n);
        
        // 遍歷所有學生對，如果是朋友就合併
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (isConnected[i][j] == 1) {
                    uf.union(i, j);
                }
            }
        }
        
        return uf.getComponentCount();
    }
}
```

### 3. 島嶼數量（LeetCode 200）

**問題描述**：給定一個由 '1'（陸地）和 '0'（水）組成的二維網格，計算島嶼的數量。

```java
class Solution {
    public int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        
        int rows = grid.length;
        int cols = grid[0].length;
        UnionFind uf = new UnionFind(rows * cols);
        int waterCells = 0;
        
        // 方向陣列：上、下、左、右
        int[][] directions = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == '0') {
                    waterCells++;
                } else {
                    // 檢查四個方向的相鄰陸地
                    for (int[] dir : directions) {
                        int newRow = i + dir[0];
                        int newCol = j + dir[1];
                        
                        if (newRow >= 0 && newRow < rows && 
                            newCol >= 0 && newCol < cols && 
                            grid[newRow][newCol] == '1') {
                            uf.union(i * cols + j, newRow * cols + newCol);
                        }
                    }
                }
            }
        }
        
        return uf.getComponentCount() - waterCells;
    }
}
```

### 4. 冗余連接（LeetCode 684）

**問題描述**：在無向圖中找到一條邊，移除它後圖將變成樹。如果有多個答案，返回最後出現在給定二維陣列中的邊。

```java
class Solution {
    public int[] findRedundantConnection(int[][] edges) {
        UnionFind uf = new UnionFind(edges.length + 1);
        
        for (int[] edge : edges) {
            // 如果兩個節點已經連通，這條邊就是冗余的
            if (!uf.union(edge[0], edge[1])) {
                return edge;
            }
        }
        
        return new int[0];  // 理論上不會到達這裡
    }
}
```

### 5. 賬戶合併（LeetCode 721）

**問題描述**：給定一個賬戶列表，每個元素 `accounts[i]` 是一個字串列表，其中第一個元素是名字，其餘元素是 emails。合併屬於同一人的賬戶。

```java
class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, Integer> emailToIndex = new HashMap<>();
        Map<String, String> emailToName = new HashMap<>();
        int emailCount = 0;
        
        // 為每個 email 分配唯一索引
        for (List<String> account : accounts) {
            String name = account.get(0);
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                if (!emailToIndex.containsKey(email)) {
                    emailToIndex.put(email, emailCount++);
                }
                emailToName.put(email, name);
            }
        }
        
        UnionFind uf = new UnionFind(emailCount);
        
        // 合併同一賬戶下的所有 email
        for (List<String> account : accounts) {
            String firstEmail = account.get(1);
            for (int i = 2; i < account.size(); i++) {
                uf.union(emailToIndex.get(firstEmail), 
                        emailToIndex.get(account.get(i)));
            }
        }
        
        // 根據並查集結果分組 email
        Map<Integer, List<String>> groups = new HashMap<>();
        for (String email : emailToIndex.keySet()) {
            int root = uf.find(emailToIndex.get(email));
            groups.computeIfAbsent(root, k -> new ArrayList<>()).add(email);
        }
        
        // 構建最終結果
        List<List<String>> result = new ArrayList<>();
        for (List<String> emails : groups.values()) {
            Collections.sort(emails);
            List<String> account = new ArrayList<>();
            account.add(emailToName.get(emails.get(0)));
            account.addAll(emails);
            result.add(account);
        }
        
        return result;
    }
}
```

## 高級應用

### 動態連通性問題

並查集特別適用於處理動態連通性問題，即在線回答「兩個節點是否連通」的查詢。

### 最小生成樹（Kruskal 演算法）

Kruskal 演算法使用並查集來檢測環的存在：

```java
public class KruskalMST {
    public int kruskalMST(int n, int[][] edges) {
        // 按權重排序邊
        Arrays.sort(edges, (a, b) -> a[2] - b[2]);
        
        UnionFind uf = new UnionFind(n);
        int mstWeight = 0;
        int edgesUsed = 0;
        
        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], weight = edge[2];
            
            // 如果不會形成環，加入 MST
            if (uf.union(u, v)) {
                mstWeight += weight;
                edgesUsed++;
                
                // MST 有 n-1 條邊
                if (edgesUsed == n - 1) {
                    break;
                }
            }
        }
        
        return mstWeight;
    }
}
```

## 實作技巧與注意事項

1. **路徑壓縮**：在 `find` 操作中使用路徑壓縮可以顯著提升性能
2. **按秩合併**：避免樹變得過高，保持操作的高效性
3. **元素映射**：當元素不是連續整數時，需要建立映射關係
4. **連通分量計數**：維護連通分量的數量可以快速回答相關查詢

## 總結

並查集是解決動態連通性問題的高效數據結構，在圖論、網路分析、集合劃分等領域有廣泛應用。掌握並查集的關鍵在於：

1. **理解基本原理**：樹形結構表示集合，根節點作為代表元素
2. **掌握優化技巧**：路徑壓縮和按秩/按大小合併
3. **靈活應用**：根據問題特點選擇合適的實作方式
4. **注意細節**：邊界條件處理和元素映射

## 參考資料

- [LeetCode 990. Satisfiability of Equality Equations](https://leetcode.com/problems/satisfiability-of-equality-equations/)
- [LeetCode 547. Number of Provinces](https://leetcode.com/problems/number-of-provinces/)
- [LeetCode 200. Number of Islands](https://leetcode.com/problems/number-of-islands/)
- [LeetCode 684. Redundant Connection](https://leetcode.com/problems/redundant-connection/)
- [LeetCode 721. Accounts Merge](https://leetcode.com/problems/accounts-merge/)
- [演算法導論 - 不相交集合的數據結構](https://mitpress.mit.edu/books/introduction-algorithms)