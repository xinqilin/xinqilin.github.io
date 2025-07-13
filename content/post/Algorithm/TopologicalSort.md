---
title: "拓撲排序（Topological Sort）演算法詳解"
author: Bill.Lin
date: 2021-12-26T12:53:14+08:00
draft: false
tags: ["Algorithm", "Graph", "TopologicalSort", "DFS", "BFS", "Java"]
Description: "深入探討拓撲排序演算法原理、實作方式與實際應用，包含 DFS 和 BFS 兩種方法"
Categories: ["Algorithm"]
DisableComments: false
---

## 概述

拓撲排序（Topological Sort）是對**有向無環圖（DAG, Directed Acyclic Graph）**進行排序的演算法。排序結果是一個線性序列，使得對於圖中任意有向邊 (u, v)，在排序結果中 u 都出現在 v 之前。

## 基本概念

### 應用場景

1. **課程排課**：某些課程有先修課程的要求
2. **編譯依賴**：程式模組間的編譯順序
3. **任務調度**：有依賴關係的任務執行順序
4. **Makefile 建構**：檔案間的依賴關係

### 前提條件

- 圖必須是**有向無環圖（DAG）**
- 如果圖中存在環，則無法進行拓撲排序

## 演算法實作

### 方法一：Kahn 演算法（BFS 基礎）

#### 基本思路

1. 計算所有節點的入度
2. 將入度為 0 的節點加入佇列
3. 不斷從佇列中取出節點，並減少其相鄰節點的入度
4. 如果相鄰節點的入度變為 0，則加入佇列
5. 重複直到佇列為空

#### 實作代碼

```java
public class TopologicalSort {
    public List<Integer> topologicalSort(int numNodes, List<List<Integer>> edges) {
        // 建立鄰接表和入度陣列
        List<List<Integer>> graph = new ArrayList<>();
        int[] indegree = new int[numNodes];
        
        for (int i = 0; i < numNodes; i++) {
            graph.add(new ArrayList<>());
        }
        
        // 建構圖並計算入度
        for (List<Integer> edge : edges) {
            int from = edge.get(0);
            int to = edge.get(1);
            graph.get(from).add(to);
            indegree[to]++;
        }
        
        // 將入度為 0 的節點加入佇列
        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < numNodes; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }
        
        List<Integer> result = new ArrayList<>();
        
        // BFS 處理
        while (!queue.isEmpty()) {
            int node = queue.poll();
            result.add(node);
            
            // 減少相鄰節點的入度
            for (int neighbor : graph.get(node)) {
                indegree[neighbor]--;
                if (indegree[neighbor] == 0) {
                    queue.offer(neighbor);
                }
            }
        }
        
        // 檢查是否存在環
        if (result.size() != numNodes) {
            return new ArrayList<>();  // 存在環，無法拓撲排序
        }
        
        return result;
    }
}
```

### 方法二：DFS 基礎

#### 基本思路

1. 對每個未訪問的節點進行 DFS
2. 在 DFS 回溯時將節點加入結果
3. 反轉結果得到拓撲排序

#### 實作代碼

```java
public class TopologicalSortDFS {
    private static final int WHITE = 0;  // 未訪問
    private static final int GRAY = 1;   // 正在訪問
    private static final int BLACK = 2;  // 已完成
    
    public List<Integer> topologicalSort(int numNodes, List<List<Integer>> edges) {
        // 建立鄰接表
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numNodes; i++) {
            graph.add(new ArrayList<>());
        }
        
        for (List<Integer> edge : edges) {
            graph.get(edge.get(0)).add(edge.get(1));
        }
        
        int[] color = new int[numNodes];
        Stack<Integer> stack = new Stack<>();
        
        // 對每個未訪問的節點進行 DFS
        for (int i = 0; i < numNodes; i++) {
            if (color[i] == WHITE) {
                if (!dfs(graph, i, color, stack)) {
                    return new ArrayList<>();  // 存在環
                }
            }
        }
        
        // 反轉結果
        List<Integer> result = new ArrayList<>();
        while (!stack.isEmpty()) {
            result.add(stack.pop());
        }
        
        return result;
    }
    
    private boolean dfs(List<List<Integer>> graph, int node, int[] color, Stack<Integer> stack) {
        color[node] = GRAY;  // 標記為正在訪問
        
        for (int neighbor : graph.get(node)) {
            if (color[neighbor] == GRAY) {
                return false;  // 發現後向邊，存在環
            }
            if (color[neighbor] == WHITE && !dfs(graph, neighbor, color, stack)) {
                return false;
            }
        }
        
        color[node] = BLACK;  // 標記為已完成
        stack.push(node);     // 後序遍歷順序
        
        return true;
    }
}
```

## 實際應用題型

### 1. 課程安排（LeetCode 207 & 210）

**問題 207**：判斷是否可以完成所有課程。

```java
public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] indegree = new int[numCourses];
    
    // 初始化圖
    for (int i = 0; i < numCourses; i++) {
        graph.add(new ArrayList<>());
    }
    
    // 建構圖
    for (int[] prereq : prerequisites) {
        graph.get(prereq[1]).add(prereq[0]);
        indegree[prereq[0]]++;
    }
    
    // Kahn 演算法
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (indegree[i] == 0) {
            queue.offer(i);
        }
    }
    
    int completedCourses = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        completedCourses++;
        
        for (int nextCourse : graph.get(course)) {
            indegree[nextCourse]--;
            if (indegree[nextCourse] == 0) {
                queue.offer(nextCourse);
            }
        }
    }
    
    return completedCourses == numCourses;
}
```

**問題 210**：返回課程安排的順序。

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] indegree = new int[numCourses];
    
    // 建構圖（同上）
    for (int i = 0; i < numCourses; i++) {
        graph.add(new ArrayList<>());
    }
    
    for (int[] prereq : prerequisites) {
        graph.get(prereq[1]).add(prereq[0]);
        indegree[prereq[0]]++;
    }
    
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (indegree[i] == 0) {
            queue.offer(i);
        }
    }
    
    int[] result = new int[numCourses];
    int index = 0;
    
    while (!queue.isEmpty()) {
        int course = queue.poll();
        result[index++] = course;
        
        for (int nextCourse : graph.get(course)) {
            indegree[nextCourse]--;
            if (indegree[nextCourse] == 0) {
                queue.offer(nextCourse);
            }
        }
    }
    
    return index == numCourses ? result : new int[0];
}
```

### 2. 所有可能的菜譜（LeetCode 2115）

**問題描述**：給定可製作的菜譜、所需原料以及現有原料，找出所有可能製作的菜譜。

```java
class Solution {
    private static final int NOT_VISITED = 0;
    private static final int VISITING = 1;
    private static final int VISITED = 2;
    
    public List<String> findAllRecipes(String[] recipes, List<List<String>> ingredients, String[] supplies) {
        Map<String, Integer> status = new HashMap<>();
        Map<String, List<String>> prereqs = new HashMap<>();
        
        // 初始化食譜和其所需原料
        for (int i = 0; i < recipes.length; i++) {
            status.put(recipes[i], NOT_VISITED);
            prereqs.put(recipes[i], ingredients.get(i));
        }
        
        // 將現有原料標記為已訪問
        for (String supply : supplies) {
            status.put(supply, VISITED);
        }
        
        List<String> result = new ArrayList<>();
        
        // 對每個食譜進行 DFS
        for (String recipe : recipes) {
            dfs(recipe, prereqs, status, result);
        }
        
        return result;
    }
    
    private boolean dfs(String item, Map<String, List<String>> prereqs, 
                       Map<String, Integer> status, List<String> result) {
        if (!status.containsKey(item)) {
            return false;  // 不存在此原料或食譜
        }
        
        if (status.get(item) == VISITING) {
            return false;  // 發現環，無法製作
        }
        
        if (status.get(item) == VISITED) {
            return true;   // 已經可以製作
        }
        
        // 標記為正在訪問
        status.put(item, VISITING);
        
        // 檢查所有前置條件
        if (prereqs.containsKey(item)) {
            for (String ingredient : prereqs.get(item)) {
                if (!dfs(ingredient, prereqs, status, result)) {
                    return false;
                }
            }
        }
        
        // 標記為已完成
        status.put(item, VISITED);
        result.add(item);
        
        return true;
    }
}
```

## 複雜度分析

| 演算法 | 時間複雜度 | 空間複雜度 | 優點 | 缺點 |
|-------|-----------|-----------|------|------|
| Kahn (BFS) | O(V + E) | O(V) | 實作簡單，易於理解 | 需要額外的入度陣列 |
| DFS | O(V + E) | O(V) | 可以檢測環，記憶體使用較少 | 實作稍複雜 |

其中 V 是節點數，E 是邊數。

## 實作技巧

### 1. 環的檢測

```java
// Kahn 演算法：如果處理的節點數不等於總節點數，則存在環
if (processedNodes != totalNodes) {
    // 存在環
}

// DFS：使用三色標記法檢測後向邊
if (color[neighbor] == GRAY) {
    // 發現後向邊，存在環
    return false;
}
```

### 2. 多個拓撲排序解

如果需要找出所有可能的拓撲排序：

```java
public void findAllTopologicalSorts(List<List<Integer>> graph, int[] indegree, 
                                   List<Integer> current, List<List<Integer>> allResults) {
    Queue<Integer> available = new LinkedList<>();
    for (int i = 0; i < indegree.length; i++) {
        if (indegree[i] == 0) {
            available.offer(i);
        }
    }
    
    if (available.isEmpty()) {
        if (current.size() == indegree.length) {
            allResults.add(new ArrayList<>(current));
        }
        return;
    }
    
    // 嘗試所有可能的下一個節點
    for (int node : available) {
        // 選擇
        current.add(node);
        int[] newIndegree = indegree.clone();
        newIndegree[node] = -1;  // 標記為已使用
        
        for (int neighbor : graph.get(node)) {
            newIndegree[neighbor]--;
        }
        
        // 遞歸
        findAllTopologicalSorts(graph, newIndegree, current, allResults);
        
        // 撤銷選擇
        current.remove(current.size() - 1);
    }
}
```

## 總結

拓撲排序是處理有依賴關係問題的重要演算法。掌握要點：

1. **適用條件**：只能用於有向無環圖
2. **兩種方法**：Kahn 演算法（BFS）和 DFS 方法
3. **環的檢測**：兩種方法都能檢測圖中是否存在環
4. **實際應用**：課程安排、任務調度、編譯依賴等

選擇演算法時：
- **Kahn 演算法**：邏輯直觀，適合初學者
- **DFS 方法**：更靈活，能提供更多信息（如完成時間）

## 參考資料

- [LeetCode 207. Course Schedule](https://leetcode.com/problems/course-schedule/)
- [LeetCode 210. Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)
- [LeetCode 2115. Find All Possible Recipes from Given Supplies](https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/)
- [演算法導論 - 圖的拓撲排序](https://mitpress.mit.edu/books/introduction-algorithms)