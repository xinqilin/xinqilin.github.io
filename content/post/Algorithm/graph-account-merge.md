---
title: "GraphAccountMerge - 圖論帳戶合併深度解析與企業應用"
author: Bill.Lin
date: 2021-11-29T22:24:03+08:00
draft: false
tags: ["Algorithm", "Graph Theory", "Union Find", "DFS", "BFS", "Enterprise", "Java"]
description: "LeetCode 721 帳戶合併：把同一人的多個 email 視為圖的連通分量，用 Union-Find 合併後輸出，再與 DFS／BFS 圖論解法比較複雜度與適用情境，最後整理 Union-Find 的其他應用題。"
categories: ["Algorithm"]
aliases:
  - /post/Algorithm/GraphAccountMerge/

---

## 問題描述

[LeetCode 721 - Accounts Merge](https://leetcode.com/problems/accounts-merge/)

給定 `accounts` 列表，每個帳號是一個字串陣列 `[name, email1, email2, ...]`。
若兩個帳號有**共同的 email**，則屬於同一人（可以傳遞：A=B 且 B=C 則 A=B=C）。
合併所有屬於同一人的帳號，輸出格式：`[name, email1, email2, ...]`（emails 排序）。

```
輸入：
[["John","john@mail","john_r@mail"],
 ["John","johnr@mail","john@mail"],   ← 與第一個共用 john@mail
 ["Mary","mary@mail"]]

輸出：
[["John","john@mail","john_r@mail","johnr@mail"],
 ["Mary","mary@mail"]]
```

## 解法：Union-Find

**建模**：把每個 email 視為圖中的節點，同一帳號內的 emails union 在一起。

```java
class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, String> parent = new HashMap<>();  // email -> root email
        Map<String, String> owner = new HashMap<>();   // email -> name

        // 初始化：每個 email 的 parent 是自己
        for (List<String> account : accounts) {
            String name = account.get(0);
            for (int i = 1; i < account.size(); i++) {
                parent.putIfAbsent(account.get(i), account.get(i));
                owner.put(account.get(i), name);
            }
        }

        // Union：同一帳號內的所有 email union 到第一個 email
        for (List<String> account : accounts) {
            String first = account.get(1);
            for (int i = 2; i < account.size(); i++) {
                union(parent, first, account.get(i));
            }
        }

        // 分組：用 root email 作 key 收集所有同組 email
        Map<String, TreeSet<String>> groups = new HashMap<>();
        for (String email : parent.keySet()) {
            String root = find(parent, email);
            groups.computeIfAbsent(root, k -> new TreeSet<>()).add(email);
        }

        // 組裝結果
        List<List<String>> result = new ArrayList<>();
        for (Map.Entry<String, TreeSet<String>> entry : groups.entrySet()) {
            List<String> merged = new ArrayList<>();
            merged.add(owner.get(entry.getKey()));  // 加姓名
            merged.addAll(entry.getValue());         // emails 已 TreeSet 排序
            result.add(merged);
        }
        return result;
    }

    private String find(Map<String, String> parent, String x) {
        if (!parent.get(x).equals(x)) {
            parent.put(x, find(parent, parent.get(x)));  // path compression
        }
        return parent.get(x);
    }

    private void union(Map<String, String> parent, String x, String y) {
        String rx = find(parent, x);
        String ry = find(parent, y);
        if (!rx.equals(ry)) {
            parent.put(rx, ry);
        }
    }
}
```

**複雜度**：
- 時間：O(N × α(N))，N = 所有 email 總數，α 為反 Ackermann 函數（幾乎 O(1)）
- 空間：O(N)

## 替代解法：圖論 DFS/BFS

**建模**：email 為節點，同帳號內的 emails 兩兩連邊，找連通分量。

```java
// DFS 解法（概念）
Map<String, List<String>> graph = new HashMap<>();
Map<String, String> emailToName = new HashMap<>();

// 建圖
for (List<String> account : accounts) {
    String name = account.get(0);
    String first = account.get(1);
    emailToName.put(first, name);
    for (int i = 1; i < account.size(); i++) {
        emailToName.put(account.get(i), name);
        graph.computeIfAbsent(first, k -> new ArrayList<>()).add(account.get(i));
        graph.computeIfAbsent(account.get(i), k -> new ArrayList<>()).add(first);
    }
}

// DFS 找連通分量
Set<String> visited = new HashSet<>();
List<List<String>> result = new ArrayList<>();
for (String email : graph.keySet()) {
    if (!visited.contains(email)) {
        List<String> component = new ArrayList<>();
        dfs(graph, visited, component, email);
        Collections.sort(component);
        component.add(0, emailToName.get(email));
        result.add(component);
    }
}
```

## 兩種解法比較

| 面向 | Union-Find | DFS/BFS |
|---|---|---|
| 程式碼複雜度 | 中 | 中 |
| 時間複雜度 | O(N × α(N)) | O(N log N)（含排序） |
| 直覺性 | 需要理解 UF 概念 | 圖論思維，較直觀 |
| 適合場景 | 動態合併（online） | 靜態圖（offline） |
| 面試推薦 | 是（展示 UF 熟練度） | 是（展示圖論基礎） |

## Union-Find 在其他 LeetCode 的應用

- [LC 684 - Redundant Connection](https://leetcode.com/problems/redundant-connection/)：找成環的邊
- [LC 200 - Number of Islands](https://leetcode.com/problems/number-of-islands/)：連通分量計數
- [LC 261 - Graph Valid Tree](https://leetcode.com/problems/graph-valid-tree/)：判斷無環連通圖
- [LC 547 - Number of Provinces](https://leetcode.com/problems/number-of-provinces/)：朋友圈問題

## 參考

- [LeetCode 721 討論](https://leetcode.com/problems/accounts-merge/solutions/)
- [Union-Find 可視化](https://www.cs.usfca.edu/~galles/visualization/DisjointSets.html)
