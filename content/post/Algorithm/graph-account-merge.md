---
title: "GraphAccountMerge - 圖論帳戶合併深度解析與企業應用"
author: Bill.Lin
date: 2021-11-29T22:24:03+08:00
draft: false
tags: ["Algorithm", "Graph Theory", "Union Find", "DFS", "BFS", "Enterprise", "Java"]
Description: "深入探討 LeetCode #721 帳戶合併問題：從基礎圖論到企業級實現，涵蓋 Union-Find、DFS、BFS 多種解法與實際應用場景"
Categories: ["Algorithm"]
DisableComments: false
aliases:
  - /post/Algorithm/GraphAccountMerge/

---

# GraphAccountMerge - 圖論帳戶合併深度解析與企業應用

## 1. 問題概述 (Problem Overview)

### 1.1 LeetCode #721 - 帳戶合併問題

**問題描述**：給定一個帳戶列表 `accounts`，每個元素 `accounts[i]` 是一個字符串列表，其中第一個元素 `accounts[i][0]` 是名字 (name)，其餘元素是該帳戶的電子郵件地址。現在，我們想合併這些帳戶。如果兩個帳戶都有一些共同的電子郵件地址，則這兩個帳戶必定屬於同一個人。

```java
/**
 * 問題輸入輸出示例
 */
public class AccountMergeProblem {
    
    /**
     * 輸入示例
     */
    public static List<List<String>> getExampleInput() {
        return Arrays.asList(
            Arrays.asList("John", "johnsmith@mail.com", "john_newyork@mail.com"),
            Arrays.asList("John", "johnsmith@mail.com", "john00@mail.com"),
            Arrays.asList("Mary", "mary@mail.com"),
            Arrays.asList("John", "johnnybravo@mail.com")
        );
    }
    
    /**
     * 期望輸出
     */
    public static List<List<String>> getExpectedOutput() {
        return Arrays.asList(
            Arrays.asList("John", "john00@mail.com", "john_newyork@mail.com", "johnsmith@mail.com"),
            Arrays.asList("Mary", "mary@mail.com"),
            Arrays.asList("John", "johnnybravo@mail.com")
        );
    }
}
```

### 1.2 問題分析

這個問題本質上是一個**圖論中的連通分量問題**：

1. **節點**：每個電子郵件地址是一個節點
2. **邊**：如果兩個電子郵件地址屬於同一個帳戶，它們之間有邊連接
3. **連通分量**：每個連通分量代表同一個人的所有電子郵件地址

### 1.3 解決方案概覽

- **圖遍歷方法**：DFS/BFS 找連通分量
- **並查集方法**：Union-Find 數據結構
- **哈希映射方法**：直接映射合併

## 2. 圖論基礎概念 (Graph Theory Fundamentals)

### 2.1 圖的基本定義

```java
/**
 * 圖的基本概念和表示方法
 */
public class GraphTheoryFundamentals {
    
    /**
     * 鄰接表表示法
     */
    public static class AdjacencyListGraph {
        private Map<String, Set<String>> adjacencyList;
        
        public AdjacencyListGraph() {
            this.adjacencyList = new HashMap<>();
        }
        
        /**
         * 添加節點
         */
        public void addVertex(String vertex) {
            adjacencyList.putIfAbsent(vertex, new HashSet<>());
        }
        
        /**
         * 添加無向邊
         */
        public void addEdge(String v1, String v2) {
            addVertex(v1);
            addVertex(v2);
            adjacencyList.get(v1).add(v2);
            adjacencyList.get(v2).add(v1);
        }
        
        /**
         * 獲取鄰居節點
         */
        public Set<String> getNeighbors(String vertex) {
            return adjacencyList.getOrDefault(vertex, new HashSet<>());
        }
        
        /**
         * 獲取所有節點
         */
        public Set<String> getAllVertices() {
            return adjacencyList.keySet();
        }
    }
    
    /**
     * 鄰接矩陣表示法（適用於節點較少的情況）
     */
    public static class AdjacencyMatrixGraph {
        private boolean[][] matrix;
        private Map<String, Integer> vertexToIndex;
        private Map<Integer, String> indexToVertex;
        private int vertexCount;
        
        public AdjacencyMatrixGraph(int capacity) {
            this.matrix = new boolean[capacity][capacity];
            this.vertexToIndex = new HashMap<>();
            this.indexToVertex = new HashMap<>();
            this.vertexCount = 0;
        }
        
        /**
         * 添加節點
         */
        public void addVertex(String vertex) {
            if (!vertexToIndex.containsKey(vertex)) {
                vertexToIndex.put(vertex, vertexCount);
                indexToVertex.put(vertexCount, vertex);
                vertexCount++;
            }
        }
        
        /**
         * 添加邊
         */
        public void addEdge(String v1, String v2) {
            addVertex(v1);
            addVertex(v2);
            
            int index1 = vertexToIndex.get(v1);
            int index2 = vertexToIndex.get(v2);
            
            matrix[index1][index2] = true;
            matrix[index2][index1] = true;
        }
    }
}
```

### 2.2 連通分量檢測

```java
/**
 * 連通分量檢測算法
 */
public class ConnectedComponentsDetection {
    
    /**
     * 使用 DFS 檢測連通分量
     */
    public static List<List<String>> findConnectedComponentsDFS(
            GraphTheoryFundamentals.AdjacencyListGraph graph) {
        
        List<List<String>> components = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        
        for (String vertex : graph.getAllVertices()) {
            if (!visited.contains(vertex)) {
                List<String> component = new ArrayList<>();
                dfs(graph, vertex, visited, component);
                components.add(component);
            }
        }
        
        return components;
    }
    
    private static void dfs(GraphTheoryFundamentals.AdjacencyListGraph graph, 
                           String vertex, Set<String> visited, List<String> component) {
        visited.add(vertex);
        component.add(vertex);
        
        for (String neighbor : graph.getNeighbors(vertex)) {
            if (!visited.contains(neighbor)) {
                dfs(graph, neighbor, visited, component);
            }
        }
    }
    
    /**
     * 使用 BFS 檢測連通分量
     */
    public static List<List<String>> findConnectedComponentsBFS(
            GraphTheoryFundamentals.AdjacencyListGraph graph) {
        
        List<List<String>> components = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        
        for (String vertex : graph.getAllVertices()) {
            if (!visited.contains(vertex)) {
                List<String> component = bfs(graph, vertex, visited);
                components.add(component);
            }
        }
        
        return components;
    }
    
    private static List<String> bfs(GraphTheoryFundamentals.AdjacencyListGraph graph,
                                   String startVertex, Set<String> visited) {
        List<String> component = new ArrayList<>();
        Queue<String> queue = new LinkedList<>();
        
        queue.offer(startVertex);
        visited.add(startVertex);
        
        while (!queue.isEmpty()) {
            String current = queue.poll();
            component.add(current);
            
            for (String neighbor : graph.getNeighbors(current)) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        
        return component;
    }
}
```

## 3. 並查集 (Union-Find / Disjoint Set Union)

### 3.1 基礎並查集實現

```java
/**
 * 基礎並查集數據結構
 * 時間複雜度：Find O(α(n)), Union O(α(n))
 * 其中 α 是阿克曼函數的反函數，實際上可視為常數
 */
public class UnionFind {
    private Map<String, String> parent;
    private Map<String, Integer> rank;
    
    public UnionFind() {
        this.parent = new HashMap<>();
        this.rank = new HashMap<>();
    }
    
    /**
     * 創建新的集合
     */
    public void makeSet(String x) {
        if (!parent.containsKey(x)) {
            parent.put(x, x);
            rank.put(x, 0);
        }
    }
    
    /**
     * 查找根節點（帶路徑壓縮）
     */
    public String find(String x) {
        if (!parent.get(x).equals(x)) {
            parent.put(x, find(parent.get(x))); // 路徑壓縮
        }
        return parent.get(x);
    }
    
    /**
     * 合併兩個集合（按秩合併）
     */
    public void union(String x, String y) {
        String rootX = find(x);
        String rootY = find(y);
        
        if (!rootX.equals(rootY)) {
            // 按秩合併
            if (rank.get(rootX) < rank.get(rootY)) {
                parent.put(rootX, rootY);
            } else if (rank.get(rootX) > rank.get(rootY)) {
                parent.put(rootY, rootX);
            } else {
                parent.put(rootY, rootX);
                rank.put(rootX, rank.get(rootX) + 1);
            }
        }
    }
    
    /**
     * 檢查兩個元素是否在同一集合中
     */
    public boolean connected(String x, String y) {
        return find(x).equals(find(y));
    }
    
    /**
     * 獲取所有連通分量
     */
    public Map<String, List<String>> getConnectedComponents() {
        Map<String, List<String>> components = new HashMap<>();
        
        for (String element : parent.keySet()) {
            String root = find(element);
            components.computeIfAbsent(root, k -> new ArrayList<>()).add(element);
        }
        
        return components;
    }
}
```

### 3.2 泛型並查集實現

```java
/**
 * 泛型並查集實現
 * 支持任意類型的元素
 */
public class GenericUnionFind<T> {
    private Map<T, T> parent;
    private Map<T, Integer> rank;
    private int componentCount;
    
    public GenericUnionFind() {
        this.parent = new HashMap<>();
        this.rank = new HashMap<>();
        this.componentCount = 0;
    }
    
    /**
     * 添加新元素
     */
    public void makeSet(T element) {
        if (!parent.containsKey(element)) {
            parent.put(element, element);
            rank.put(element, 0);
            componentCount++;
        }
    }
    
    /**
     * 查找根節點
     */
    public T find(T element) {
        if (!parent.get(element).equals(element)) {
            parent.put(element, find(parent.get(element)));
        }
        return parent.get(element);
    }
    
    /**
     * 合併兩個集合
     */
    public boolean union(T x, T y) {
        T rootX = find(x);
        T rootY = find(y);
        
        if (rootX.equals(rootY)) {
            return false; // 已經在同一集合中
        }
        
        // 按秩合併
        if (rank.get(rootX) < rank.get(rootY)) {
            parent.put(rootX, rootY);
        } else if (rank.get(rootX) > rank.get(rootY)) {
            parent.put(rootY, rootX);
        } else {
            parent.put(rootY, rootX);
            rank.put(rootX, rank.get(rootX) + 1);
        }
        
        componentCount--;
        return true;
    }
    
    /**
     * 獲取連通分量數量
     */
    public int getComponentCount() {
        return componentCount;
    }
    
    /**
     * 獲取集合大小
     */
    public Map<T, Integer> getComponentSizes() {
        Map<T, Integer> sizes = new HashMap<>();
        
        for (T element : parent.keySet()) {
            T root = find(element);
            sizes.put(root, sizes.getOrDefault(root, 0) + 1);
        }
        
        return sizes;
    }
}
```

## 4. 多種解決方案 (Multiple Solution Approaches)

### 4.1 DFS 解法

```java
/**
 * 使用深度優先搜索 (DFS) 解決帳戶合併問題
 * 時間複雜度：O(NK + E) 其中 N 是帳戶數，K 是平均每個帳戶的電子郵件數，E 是邊數
 * 空間複雜度：O(E) 用於存儲圖和遞歸棧
 */
public class AccountMergeDFS {
    
    /**
     * 主要解決方法
     */
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        // 構建圖和名字映射
        Map<String, String> emailToName = new HashMap<>();
        Map<String, Set<String>> graph = new HashMap<>();
        
        buildGraph(accounts, emailToName, graph);
        
        // 使用 DFS 找連通分量
        List<List<String>> result = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        
        for (String email : graph.keySet()) {
            if (!visited.contains(email)) {
                List<String> component = new ArrayList<>();
                dfs(email, graph, visited, component);
                
                // 排序電子郵件並添加名字
                Collections.sort(component);
                component.add(0, emailToName.get(email));
                result.add(component);
            }
        }
        
        return result;
    }
    
    /**
     * 構建圖結構
     */
    private void buildGraph(List<List<String>> accounts, 
                           Map<String, String> emailToName, 
                           Map<String, Set<String>> graph) {
        
        for (List<String> account : accounts) {
            String name = account.get(0);
            String firstEmail = account.get(1);
            
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                emailToName.put(email, name);
                graph.putIfAbsent(email, new HashSet<>());
                
                if (i > 1) {
                    // 將當前電子郵件與第一個電子郵件連接
                    graph.get(firstEmail).add(email);
                    graph.get(email).add(firstEmail);
                }
            }
        }
    }
    
    /**
     * 深度優先搜索
     */
    private void dfs(String email, Map<String, Set<String>> graph, 
                    Set<String> visited, List<String> component) {
        visited.add(email);
        component.add(email);
        
        for (String neighbor : graph.get(email)) {
            if (!visited.contains(neighbor)) {
                dfs(neighbor, graph, visited, component);
            }
        }
    }
}
```

### 4.2 BFS 解法

```java
/**
 * 使用廣度優先搜索 (BFS) 解決帳戶合併問題
 * 時間複雜度：O(NK + E)
 * 空間複雜度：O(E)
 */
public class AccountMergeBFS {
    
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, String> emailToName = new HashMap<>();
        Map<String, List<String>> graph = new HashMap<>();
        
        buildGraph(accounts, emailToName, graph);
        
        List<List<String>> result = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        
        for (String email : graph.keySet()) {
            if (!visited.contains(email)) {
                List<String> component = bfs(email, graph, visited);
                
                Collections.sort(component);
                component.add(0, emailToName.get(email));
                result.add(component);
            }
        }
        
        return result;
    }
    
    /**
     * 構建圖結構
     */
    private void buildGraph(List<List<String>> accounts, 
                           Map<String, String> emailToName, 
                           Map<String, List<String>> graph) {
        
        for (List<String> account : accounts) {
            String name = account.get(0);
            
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                emailToName.put(email, name);
                graph.putIfAbsent(email, new ArrayList<>());
            }
            
            // 連接同一帳戶中的所有電子郵件
            for (int i = 2; i < account.size(); i++) {
                String email1 = account.get(1);
                String email2 = account.get(i);
                
                graph.get(email1).add(email2);
                graph.get(email2).add(email1);
            }
        }
    }
    
    /**
     * 廣度優先搜索
     */
    private List<String> bfs(String startEmail, Map<String, List<String>> graph, 
                            Set<String> visited) {
        List<String> component = new ArrayList<>();
        Queue<String> queue = new LinkedList<>();
        
        queue.offer(startEmail);
        visited.add(startEmail);
        
        while (!queue.isEmpty()) {
            String current = queue.poll();
            component.add(current);
            
            for (String neighbor : graph.get(current)) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        
        return component;
    }
}
```

### 4.3 Union-Find 解法

```java
/**
 * 使用並查集 (Union-Find) 解決帳戶合併問題
 * 時間複雜度：O(NK * α(NK)) 其中 α 是阿克曼函數的反函數
 * 空間複雜度：O(NK)
 */
public class AccountMergeUnionFind {
    
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        UnionFind uf = new UnionFind();
        Map<String, String> emailToName = new HashMap<>();
        
        // 初始化並查集並記錄電子郵件到名字的映射
        for (List<String> account : accounts) {
            String name = account.get(0);
            
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                emailToName.put(email, name);
                uf.makeSet(email);
                
                if (i > 1) {
                    // 將當前電子郵件與第一個電子郵件合併
                    uf.union(account.get(1), email);
                }
            }
        }
        
        // 獲取連通分量
        Map<String, List<String>> components = uf.getConnectedComponents();
        List<List<String>> result = new ArrayList<>();
        
        for (List<String> component : components.values()) {
            Collections.sort(component);
            component.add(0, emailToName.get(component.get(0)));
            result.add(component);
        }
        
        return result;
    }
}
```

### 4.4 優化的 Union-Find 解法

```java
/**
 * 優化的並查集解法
 * 包含路徑壓縮和按秩合併的所有優化
 */
public class OptimizedAccountMergeUnionFind {
    
    /**
     * 優化的並查集類
     */
    private static class OptimizedUnionFind {
        private Map<String, String> parent;
        private Map<String, Integer> rank;
        
        public OptimizedUnionFind() {
            this.parent = new HashMap<>();
            this.rank = new HashMap<>();
        }
        
        public void makeSet(String x) {
            if (!parent.containsKey(x)) {
                parent.put(x, x);
                rank.put(x, 0);
            }
        }
        
        public String find(String x) {
            if (!parent.get(x).equals(x)) {
                parent.put(x, find(parent.get(x))); // 路徑壓縮
            }
            return parent.get(x);
        }
        
        public void union(String x, String y) {
            String rootX = find(x);
            String rootY = find(y);
            
            if (!rootX.equals(rootY)) {
                // 按秩合併
                if (rank.get(rootX) < rank.get(rootY)) {
                    parent.put(rootX, rootY);
                } else if (rank.get(rootX) > rank.get(rootY)) {
                    parent.put(rootY, rootX);
                } else {
                    parent.put(rootY, rootX);
                    rank.put(rootX, rank.get(rootX) + 1);
                }
            }
        }
        
        public Map<String, List<String>> getConnectedComponents() {
            Map<String, List<String>> components = new HashMap<>();
            
            for (String element : parent.keySet()) {
                String root = find(element);
                components.computeIfAbsent(root, k -> new ArrayList<>()).add(element);
            }
            
            return components;
        }
    }
    
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        OptimizedUnionFind uf = new OptimizedUnionFind();
        Map<String, String> emailToName = new HashMap<>();
        
        // 處理每個帳戶
        for (List<String> account : accounts) {
            String name = account.get(0);
            String firstEmail = account.get(1);
            
            // 記錄電子郵件到名字的映射
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                emailToName.put(email, name);
                uf.makeSet(email);
            }
            
            // 將同一帳戶中的所有電子郵件合併到第一個電子郵件
            for (int i = 2; i < account.size(); i++) {
                uf.union(firstEmail, account.get(i));
            }
        }
        
        // 構建結果
        Map<String, List<String>> components = uf.getConnectedComponents();
        List<List<String>> result = new ArrayList<>();
        
        for (List<String> emails : components.values()) {
            Collections.sort(emails);
            emails.add(0, emailToName.get(emails.get(0)));
            result.add(emails);
        }
        
        return result;
    }
}
```

## 5. 性能分析和比較 (Performance Analysis and Comparison)

### 5.1 時間複雜度分析

```java
/**
 * 算法性能分析工具
 */
public class AlgorithmPerformanceAnalysis {
    
    /**
     * 性能分析結果類
     */
    public static class PerformanceResult {
        private final String algorithmName;
        private final long executionTime;
        private final long memoryUsage;
        private final int inputSize;
        
        public PerformanceResult(String algorithmName, long executionTime, 
                               long memoryUsage, int inputSize) {
            this.algorithmName = algorithmName;
            this.executionTime = executionTime;
            this.memoryUsage = memoryUsage;
            this.inputSize = inputSize;
        }
        
        // getter 方法省略
        
        @Override
        public String toString() {
            return String.format("%s: %d ms, %d MB, Size: %d", 
                               algorithmName, executionTime, memoryUsage / 1024 / 1024, inputSize);
        }
    }
    
    /**
     * 測試數據生成器
     */
    public static List<List<String>> generateTestData(int numAccounts, 
                                                     int maxEmailsPerAccount, 
                                                     double mergeRatio) {
        List<List<String>> accounts = new ArrayList<>();
        Random random = new Random(42); // 固定種子保證可重現性
        
        Set<String> usedEmails = new HashSet<>();
        List<String> commonEmails = new ArrayList<>();
        
        // 生成一些公共電子郵件用於合併
        int numCommonEmails = (int) (numAccounts * mergeRatio);
        for (int i = 0; i < numCommonEmails; i++) {
            String commonEmail = "common" + i + "@test.com";
            commonEmails.add(commonEmail);
            usedEmails.add(commonEmail);
        }
        
        for (int i = 0; i < numAccounts; i++) {
            List<String> account = new ArrayList<>();
            account.add("User" + i);
            
            int emailCount = random.nextInt(maxEmailsPerAccount) + 1;
            
            // 可能添加公共電子郵件
            if (random.nextDouble() < mergeRatio && !commonEmails.isEmpty()) {
                String commonEmail = commonEmails.get(random.nextInt(commonEmails.size()));
                account.add(commonEmail);
                emailCount--;
            }
            
            // 添加唯一電子郵件
            for (int j = 0; j < emailCount; j++) {
                String email = "user" + i + "_" + j + "@test.com";
                if (!usedEmails.contains(email)) {
                    account.add(email);
                    usedEmails.add(email);
                }
            }
            
            if (account.size() > 1) { // 確保至少有一個電子郵件
                accounts.add(account);
            }
        }
        
        return accounts;
    }
    
    /**
     * 執行性能測試
     */
    public static PerformanceResult performanceTest(String algorithmName, 
                                                   Function<List<List<String>>, 
                                                   List<List<String>>> algorithm,
                                                   List<List<String>> testData) {
        Runtime runtime = Runtime.getRuntime();
        
        // 垃圾回收
        System.gc();
        long startMemory = runtime.totalMemory() - runtime.freeMemory();
        
        // 執行算法
        long startTime = System.nanoTime();
        List<List<String>> result = algorithm.apply(testData);
        long endTime = System.nanoTime();
        
        // 計算內存使用
        long endMemory = runtime.totalMemory() - runtime.freeMemory();
        
        long executionTime = (endTime - startTime) / 1_000_000; // 轉換為毫秒
        long memoryUsage = Math.max(0, endMemory - startMemory);
        int inputSize = testData.size();
        
        return new PerformanceResult(algorithmName, executionTime, memoryUsage, inputSize);
    }
    
    /**
     * 比較所有算法的性能
     */
    public static void compareAlgorithmPerformance() {
        int[] testSizes = {100, 500, 1000, 5000, 10000};
        
        System.out.println("=== 帳戶合併算法性能比較 ===");
        System.out.printf("%-20s %-15s %-15s %-15s %-15s%n", 
                         "算法", "100帳戶(ms)", "500帳戶(ms)", "1000帳戶(ms)", "5000帳戶(ms)");
        System.out.println("-".repeat(80));
        
        // 測試 DFS 算法
        testAlgorithm("DFS", testSizes, 
                     data -> new AccountMergeDFS().accountsMerge(data));
        
        // 測試 BFS 算法
        testAlgorithm("BFS", testSizes, 
                     data -> new AccountMergeBFS().accountsMerge(data));
        
        // 測試 Union-Find 算法
        testAlgorithm("Union-Find", testSizes, 
                     data -> new AccountMergeUnionFind().accountsMerge(data));
        
        // 測試優化的 Union-Find 算法
        testAlgorithm("Optimized UF", testSizes, 
                     data -> new OptimizedAccountMergeUnionFind().accountsMerge(data));
    }
    
    private static void testAlgorithm(String algorithmName, int[] testSizes, 
                                     Function<List<List<String>>, List<List<String>>> algorithm) {
        System.out.printf("%-20s", algorithmName);
        
        for (int size : testSizes) {
            List<List<String>> testData = generateTestData(size, 5, 0.3);
            PerformanceResult result = performanceTest(algorithmName, algorithm, testData);
            System.out.printf("%-15d", result.executionTime);
        }
        
        System.out.println();
    }
}
```

### 5.2 空間複雜度分析

```java
/**
 * 空間複雜度分析工具
 */
public class SpaceComplexityAnalysis {
    
    /**
     * 分析不同算法的空間使用
     */
    public static void analyzeSpaceComplexity() {
        System.out.println("=== 空間複雜度分析 ===");
        System.out.println("假設有 N 個帳戶，平均每個帳戶 K 個電子郵件，總共 E 條邊");
        System.out.println();
        
        System.out.println("1. DFS/BFS 方法：");
        System.out.println("   - 圖存儲：O(V + E) = O(NK + E)");
        System.out.println("   - 電子郵件到名字映射：O(NK)");
        System.out.println("   - 訪問標記：O(NK)");
        System.out.println("   - 遞歸棧（DFS）：O(NK) 最壞情況");
        System.out.println("   - 總空間複雜度：O(NK + E)");
        System.out.println();
        
        System.out.println("2. Union-Find 方法：");
        System.out.println("   - 父節點映射：O(NK)");
        System.out.println("   - 秩映射：O(NK)");
        System.out.println("   - 電子郵件到名字映射：O(NK)");
        System.out.println("   - 總空間複雜度：O(NK)");
        System.out.println();
        
        System.out.println("3. 實際空間使用比較：");
        analyzeActualSpaceUsage();
    }
    
    private static void analyzeActualSpaceUsage() {
        List<List<String>> testData = AlgorithmPerformanceAnalysis
            .generateTestData(1000, 5, 0.3);
        
        // 測試 DFS 方法的空間使用
        Runtime runtime = Runtime.getRuntime();
        System.gc();
        long beforeDFS = runtime.totalMemory() - runtime.freeMemory();
        
        AccountMergeDFS dfsAlgorithm = new AccountMergeDFS();
        dfsAlgorithm.accountsMerge(testData);
        
        long afterDFS = runtime.totalMemory() - runtime.freeMemory();
        long dfsMemory = afterDFS - beforeDFS;
        
        // 測試 Union-Find 方法的空間使用
        System.gc();
        long beforeUF = runtime.totalMemory() - runtime.freeMemory();
        
        AccountMergeUnionFind ufAlgorithm = new AccountMergeUnionFind();
        ufAlgorithm.accountsMerge(testData);
        
        long afterUF = runtime.totalMemory() - runtime.freeMemory();
        long ufMemory = afterUF - beforeUF;
        
        System.out.printf("DFS 實際內存使用：%d KB%n", Math.max(0, dfsMemory) / 1024);
        System.out.printf("Union-Find 實際內存使用：%d KB%n", Math.max(0, ufMemory) / 1024);
    }
}
```

## 6. 企業級應用場景 (Enterprise Applications)

### 6.1 用戶身份合併系統

```java
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * 企業級用戶身份合併服務
 * 用於合併多平台用戶帳戶
 */
@Service
public class UserIdentityMergeService {
    
    /**
     * 用戶身份實體
     */
    @Entity
    @Table(name = "user_identities")
    public static class UserIdentity {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        
        @Column(nullable = false)
        private String name;
        
        @ElementCollection
        @CollectionTable(name = "user_emails", 
                        joinColumns = @JoinColumn(name = "user_id"))
        @Column(name = "email")
        private Set<String> emails;
        
        @ElementCollection
        @CollectionTable(name = "user_phone_numbers", 
                        joinColumns = @JoinColumn(name = "user_id"))
        @Column(name = "phone_number")
        private Set<String> phoneNumbers;
        
        @ElementCollection
        @CollectionTable(name = "user_social_accounts", 
                        joinColumns = @JoinColumn(name = "user_id"))
        @Column(name = "social_account")
        private Set<String> socialAccounts;
        
        @Column(name = "created_at")
        private LocalDateTime createdAt;
        
        @Column(name = "updated_at")
        private LocalDateTime updatedAt;
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 合併結果類
     */
    public static class MergeResult {
        private final List<UserIdentity> mergedIdentities;
        private final int originalCount;
        private final int mergedCount;
        private final Map<String, String> conflictResolutions;
        
        public MergeResult(List<UserIdentity> mergedIdentities, 
                          int originalCount, int mergedCount,
                          Map<String, String> conflictResolutions) {
            this.mergedIdentities = mergedIdentities;
            this.originalCount = originalCount;
            this.mergedCount = mergedCount;
            this.conflictResolutions = conflictResolutions;
        }
        
        // getter 方法省略
    }
    
    @Autowired
    private UserIdentityRepository userIdentityRepository;
    
    /**
     * 合併用戶身份
     */
    public MergeResult mergeUserIdentities(List<UserIdentity> identities) {
        // 轉換為帳戶合併問題的輸入格式
        List<List<String>> accounts = convertToAccountsFormat(identities);
        
        // 使用優化的 Union-Find 算法進行合併
        OptimizedAccountMergeUnionFind mergeAlgorithm = 
            new OptimizedAccountMergeUnionFind();
        List<List<String>> mergedAccounts = mergeAlgorithm.accountsMerge(accounts);
        
        // 轉換回用戶身份格式
        List<UserIdentity> mergedIdentities = 
            convertToUserIdentities(mergedAccounts, identities);
        
        // 處理衝突
        Map<String, String> conflictResolutions = resolveConflicts(mergedIdentities);
        
        return new MergeResult(mergedIdentities, identities.size(), 
                              mergedAccounts.size(), conflictResolutions);
    }
    
    /**
     * 將用戶身份轉換為帳戶格式
     */
    private List<List<String>> convertToAccountsFormat(List<UserIdentity> identities) {
        List<List<String>> accounts = new ArrayList<>();
        
        for (UserIdentity identity : identities) {
            List<String> account = new ArrayList<>();
            account.add(identity.getName());
            
            // 添加所有聯繫方式作為"電子郵件"
            account.addAll(identity.getEmails());
            account.addAll(identity.getPhoneNumbers());
            account.addAll(identity.getSocialAccounts());
            
            if (account.size() > 1) { // 確保至少有一個聯繫方式
                accounts.add(account);
            }
        }
        
        return accounts;
    }
    
    /**
     * 將合併結果轉換回用戶身份
     */
    private List<UserIdentity> convertToUserIdentities(
            List<List<String>> mergedAccounts, 
            List<UserIdentity> originalIdentities) {
        
        List<UserIdentity> mergedIdentities = new ArrayList<>();
        Map<String, UserIdentity> contactToIdentity = createContactMapping(originalIdentities);
        
        for (List<String> account : mergedAccounts) {
            String name = account.get(0);
            UserIdentity mergedIdentity = new UserIdentity();
            mergedIdentity.setName(name);
            
            Set<String> allEmails = new HashSet<>();
            Set<String> allPhones = new HashSet<>();
            Set<String> allSocial = new HashSet<>();
            
            // 合併所有聯繫方式
            for (int i = 1; i < account.size(); i++) {
                String contact = account.get(i);
                UserIdentity originalIdentity = contactToIdentity.get(contact);
                
                if (originalIdentity != null) {
                    allEmails.addAll(originalIdentity.getEmails());
                    allPhones.addAll(originalIdentity.getPhoneNumbers());
                    allSocial.addAll(originalIdentity.getSocialAccounts());
                }
            }
            
            mergedIdentity.setEmails(allEmails);
            mergedIdentity.setPhoneNumbers(allPhones);
            mergedIdentity.setSocialAccounts(allSocial);
            mergedIdentity.setUpdatedAt(LocalDateTime.now());
            
            mergedIdentities.add(mergedIdentity);
        }
        
        return mergedIdentities;
    }
    
    /**
     * 創建聯繫方式到身份的映射
     */
    private Map<String, UserIdentity> createContactMapping(List<UserIdentity> identities) {
        Map<String, UserIdentity> mapping = new HashMap<>();
        
        for (UserIdentity identity : identities) {
            for (String email : identity.getEmails()) {
                mapping.put(email, identity);
            }
            for (String phone : identity.getPhoneNumbers()) {
                mapping.put(phone, identity);
            }
            for (String social : identity.getSocialAccounts()) {
                mapping.put(social, identity);
            }
        }
        
        return mapping;
    }
    
    /**
     * 解決名字衝突
     */
    private Map<String, String> resolveConflicts(List<UserIdentity> mergedIdentities) {
        Map<String, String> resolutions = new HashMap<>();
        
        for (UserIdentity identity : mergedIdentities) {
            // 這裡可以實現複雜的衝突解決邏輯
            // 例如：選擇最新的名字、最常用的名字、或者讓用戶手動選擇
            String resolvedName = resolveNameConflict(identity);
            if (!resolvedName.equals(identity.getName())) {
                resolutions.put(identity.getName(), resolvedName);
                identity.setName(resolvedName);
            }
        }
        
        return resolutions;
    }
    
    private String resolveNameConflict(UserIdentity identity) {
        // 簡單的衝突解決策略：保持原名
        return identity.getName();
    }
}
```

### 6.2 社交網絡分析系統

```java
/**
 * 社交網絡中的社群檢測服務
 * 使用圖論算法檢測用戶社群
 */
@Service
public class SocialNetworkAnalysisService {
    
    /**
     * 社交關係實體
     */
    @Entity
    @Table(name = "social_relationships")
    public static class SocialRelationship {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        
        @Column(name = "user_id_1")
        private Long userId1;
        
        @Column(name = "user_id_2")
        private Long userId2;
        
        @Enumerated(EnumType.STRING)
        private RelationshipType type;
        
        @Column(name = "strength")
        private Double strength; // 關係強度 0.0 - 1.0
        
        @Column(name = "created_at")
        private LocalDateTime createdAt;
        
        public enum RelationshipType {
            FRIEND, FOLLOWER, COLLEAGUE, FAMILY, ACQUAINTANCE
        }
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 社群檢測結果
     */
    public static class CommunityDetectionResult {
        private final List<List<Long>> communities;
        private final Map<Long, Integer> userToCommunity;
        private final double modularity;
        private final int communityCount;
        
        public CommunityDetectionResult(List<List<Long>> communities, 
                                       Map<Long, Integer> userToCommunity,
                                       double modularity) {
            this.communities = communities;
            this.userToCommunity = userToCommunity;
            this.modularity = modularity;
            this.communityCount = communities.size();
        }
        
        // getter 方法省略
    }
    
    /**
     * 檢測社交網絡中的社群
     */
    public CommunityDetectionResult detectCommunities(
            List<SocialRelationship> relationships, 
            double strengthThreshold) {
        
        // 構建加權圖
        Map<Long, Set<Long>> graph = buildWeightedGraph(relationships, strengthThreshold);
        
        // 使用並查集檢測連通分量作為初始社群
        GenericUnionFind<Long> uf = new GenericUnionFind<>();
        
        // 初始化所有用戶
        Set<Long> allUsers = getAllUsers(relationships);
        for (Long userId : allUsers) {
            uf.makeSet(userId);
        }
        
        // 根據關係強度進行合併
        for (SocialRelationship relationship : relationships) {
            if (relationship.getStrength() >= strengthThreshold) {
                uf.union(relationship.getUserId1(), relationship.getUserId2());
            }
        }
        
        // 獲取社群
        Map<Long, List<Long>> rawCommunities = uf.getConnectedComponents();
        List<List<Long>> communities = new ArrayList<>(rawCommunities.values());
        
        // 建立用戶到社群的映射
        Map<Long, Integer> userToCommunity = new HashMap<>();
        for (int i = 0; i < communities.size(); i++) {
            for (Long userId : communities.get(i)) {
                userToCommunity.put(userId, i);
            }
        }
        
        // 計算模塊度（衡量社群檢測質量的指標）
        double modularity = calculateModularity(relationships, userToCommunity);
        
        return new CommunityDetectionResult(communities, userToCommunity, modularity);
    }
    
    /**
     * 構建加權圖
     */
    private Map<Long, Set<Long>> buildWeightedGraph(
            List<SocialRelationship> relationships, 
            double strengthThreshold) {
        
        Map<Long, Set<Long>> graph = new HashMap<>();
        
        for (SocialRelationship relationship : relationships) {
            if (relationship.getStrength() >= strengthThreshold) {
                Long user1 = relationship.getUserId1();
                Long user2 = relationship.getUserId2();
                
                graph.computeIfAbsent(user1, k -> new HashSet<>()).add(user2);
                graph.computeIfAbsent(user2, k -> new HashSet<>()).add(user1);
            }
        }
        
        return graph;
    }
    
    /**
     * 獲取所有用戶ID
     */
    private Set<Long> getAllUsers(List<SocialRelationship> relationships) {
        Set<Long> users = new HashSet<>();
        
        for (SocialRelationship relationship : relationships) {
            users.add(relationship.getUserId1());
            users.add(relationship.getUserId2());
        }
        
        return users;
    }
    
    /**
     * 計算網絡模塊度
     * 模塊度是衡量社群檢測質量的重要指標
     */
    private double calculateModularity(List<SocialRelationship> relationships,
                                      Map<Long, Integer> userToCommunity) {
        
        int totalEdges = relationships.size();
        if (totalEdges == 0) return 0.0;
        
        // 計算每個社群內部的邊數
        Map<Integer, Integer> internalEdges = new HashMap<>();
        Map<Long, Integer> userDegree = new HashMap<>();
        
        // 統計每個用戶的度數
        for (SocialRelationship relationship : relationships) {
            Long user1 = relationship.getUserId1();
            Long user2 = relationship.getUserId2();
            
            userDegree.put(user1, userDegree.getOrDefault(user1, 0) + 1);
            userDegree.put(user2, userDegree.getOrDefault(user2, 0) + 1);
            
            // 如果兩個用戶在同一社群，增加內部邊數
            Integer community1 = userToCommunity.get(user1);
            Integer community2 = userToCommunity.get(user2);
            
            if (community1 != null && community1.equals(community2)) {
                internalEdges.put(community1, 
                                internalEdges.getOrDefault(community1, 0) + 1);
            }
        }
        
        // 計算模塊度
        double modularity = 0.0;
        Map<Integer, Integer> communityDegreeSum = new HashMap<>();
        
        // 計算每個社群的度數總和
        for (Map.Entry<Long, Integer> entry : userToCommunity.entrySet()) {
            Long userId = entry.getKey();
            Integer communityId = entry.getValue();
            int degree = userDegree.getOrDefault(userId, 0);
            
            communityDegreeSum.put(communityId, 
                                 communityDegreeSum.getOrDefault(communityId, 0) + degree);
        }
        
        // 計算模塊度公式：Q = (1/2m) * Σ[Aij - (ki*kj/2m)] * δ(ci, cj)
        for (Map.Entry<Integer, Integer> entry : internalEdges.entrySet()) {
            Integer communityId = entry.getKey();
            Integer internal = entry.getValue();
            Integer degreeSum = communityDegreeSum.get(communityId);
            
            double expectedInternal = (double) (degreeSum * degreeSum) / (4.0 * totalEdges);
            modularity += (internal - expectedInternal) / totalEdges;
        }
        
        return modularity;
    }
    
    /**
     * 分析社群特徵
     */
    public Map<String, Object> analyzeCommunityCharacteristics(
            CommunityDetectionResult result,
            List<SocialRelationship> relationships) {
        
        Map<String, Object> analysis = new HashMap<>();
        
        // 基本統計
        analysis.put("totalCommunities", result.getCommunityCount());
        analysis.put("modularity", result.getModularity());
        
        // 社群大小分析
        List<Integer> communitySizes = result.getCommunities().stream()
            .map(List::size)
            .sorted(Collections.reverseOrder())
            .collect(Collectors.toList());
        
        analysis.put("communitySizes", communitySizes);
        analysis.put("largestCommunitySize", communitySizes.get(0));
        analysis.put("averageCommunitySize", 
                    communitySizes.stream().mapToInt(Integer::intValue).average().orElse(0.0));
        
        // 社群密度分析
        Map<Integer, Double> communityDensities = calculateCommunityDensities(
            result, relationships);
        analysis.put("communityDensities", communityDensities);
        
        return analysis;
    }
    
    private Map<Integer, Double> calculateCommunityDensities(
            CommunityDetectionResult result,
            List<SocialRelationship> relationships) {
        
        Map<Integer, Double> densities = new HashMap<>();
        
        for (int i = 0; i < result.getCommunities().size(); i++) {
            List<Long> community = result.getCommunities().get(i);
            int communitySize = community.size();
            
            if (communitySize < 2) {
                densities.put(i, 0.0);
                continue;
            }
            
            // 計算社群內部的邊數
            int internalEdges = 0;
            Set<Long> communitySet = new HashSet<>(community);
            
            for (SocialRelationship relationship : relationships) {
                if (communitySet.contains(relationship.getUserId1()) &&
                    communitySet.contains(relationship.getUserId2())) {
                    internalEdges++;
                }
            }
            
            // 密度 = 實際邊數 / 可能的最大邊數
            int maxPossibleEdges = communitySize * (communitySize - 1) / 2;
            double density = (double) internalEdges / maxPossibleEdges;
            densities.put(i, density);
        }
        
        return densities;
    }
}
```

## 7. Spring Boot 整合和 REST API

### 7.1 配置和服務設置

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

/**
 * Spring Boot 應用程序配置
 */
@SpringBootApplication
@EnableCaching
public class GraphAnalysisApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(GraphAnalysisApplication.class, args);
    }
}

@Configuration
public class GraphAnalysisConfiguration {
    
    /**
     * 緩存管理器配置
     */
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("accountMerge", "communityDetection");
    }
    
    /**
     * 圖算法工廠
     */
    @Bean
    public GraphAlgorithmFactory graphAlgorithmFactory() {
        return new GraphAlgorithmFactory();
    }
}

/**
 * 圖算法工廠類
 */
@Component
public class GraphAlgorithmFactory {
    
    public enum AlgorithmType {
        DFS, BFS, UNION_FIND, OPTIMIZED_UNION_FIND
    }
    
    /**
     * 獲取帳戶合併算法實例
     */
    public Function<List<List<String>>, List<List<String>>> getAccountMergeAlgorithm(
            AlgorithmType type) {
        
        switch (type) {
            case DFS:
                return new AccountMergeDFS()::accountsMerge;
            case BFS:
                return new AccountMergeBFS()::accountsMerge;
            case UNION_FIND:
                return new AccountMergeUnionFind()::accountsMerge;
            case OPTIMIZED_UNION_FIND:
                return new OptimizedAccountMergeUnionFind()::accountsMerge;
            default:
                return new OptimizedAccountMergeUnionFind()::accountsMerge;
        }
    }
}
```

### 7.2 REST API 控制器

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.validation.annotation.Validated;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.util.concurrent.CompletableFuture;

/**
 * 帳戶合併 REST API 控制器
 */
@RestController
@RequestMapping("/api/accounts")
@Validated
public class AccountMergeController {
    
    @Autowired
    private GraphAlgorithmFactory algorithmFactory;
    
    /**
     * 帳戶合併請求 DTO
     */
    public static class AccountMergeRequest {
        @NotNull
        @Size(min = 1, max = 10000)
        private List<List<String>> accounts;
        
        private GraphAlgorithmFactory.AlgorithmType algorithmType = 
            GraphAlgorithmFactory.AlgorithmType.OPTIMIZED_UNION_FIND;
        
        // getter、setter 省略
    }
    
    /**
     * 帳戶合併響應 DTO
     */
    public static class AccountMergeResponse {
        private List<List<String>> mergedAccounts;
        private int originalAccountCount;
        private int mergedAccountCount;
        private long executionTimeMs;
        private String algorithmUsed;
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 同步帳戶合併 API
     */
    @PostMapping("/merge")
    @Cacheable(value = "accountMerge", key = "#request.accounts.hashCode()")
    public ResponseEntity<AccountMergeResponse> mergeAccounts(
            @Valid @RequestBody AccountMergeRequest request) {
        
        long startTime = System.currentTimeMillis();
        
        // 獲取指定的算法
        Function<List<List<String>>, List<List<String>>> algorithm = 
            algorithmFactory.getAccountMergeAlgorithm(request.getAlgorithmType());
        
        // 執行合併
        List<List<String>> mergedAccounts = algorithm.apply(request.getAccounts());
        
        long executionTime = System.currentTimeMillis() - startTime;
        
        // 構建響應
        AccountMergeResponse response = new AccountMergeResponse();
        response.setMergedAccounts(mergedAccounts);
        response.setOriginalAccountCount(request.getAccounts().size());
        response.setMergedAccountCount(mergedAccounts.size());
        response.setExecutionTimeMs(executionTime);
        response.setAlgorithmUsed(request.getAlgorithmType().name());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 異步帳戶合併 API
     */
    @PostMapping("/merge/async")
    public CompletableFuture<ResponseEntity<AccountMergeResponse>> mergeAccountsAsync(
            @Valid @RequestBody AccountMergeRequest request) {
        
        return CompletableFuture.supplyAsync(() -> {
            return mergeAccounts(request);
        });
    }
    
    /**
     * 批量帳戶合併 API
     */
    @PostMapping("/merge/batch")
    public ResponseEntity<List<AccountMergeResponse>> mergeBatchAccounts(
            @Valid @RequestBody List<AccountMergeRequest> requests) {
        
        List<AccountMergeResponse> responses = requests.parallelStream()
            .map(request -> mergeAccounts(request).getBody())
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * 算法性能比較 API
     */
    @PostMapping("/performance/compare")
    public ResponseEntity<Map<String, Object>> compareAlgorithmPerformance(
            @Valid @RequestBody AccountMergeRequest request) {
        
        Map<String, Object> results = new HashMap<>();
        List<List<String>> accounts = request.getAccounts();
        
        // 測試所有算法
        for (GraphAlgorithmFactory.AlgorithmType type : 
             GraphAlgorithmFactory.AlgorithmType.values()) {
            
            long startTime = System.currentTimeMillis();
            
            Function<List<List<String>>, List<List<String>>> algorithm = 
                algorithmFactory.getAccountMergeAlgorithm(type);
            
            List<List<String>> result = algorithm.apply(accounts);
            
            long executionTime = System.currentTimeMillis() - startTime;
            
            Map<String, Object> algorithmResult = new HashMap<>();
            algorithmResult.put("executionTimeMs", executionTime);
            algorithmResult.put("mergedAccountCount", result.size());
            
            results.put(type.name(), algorithmResult);
        }
        
        return ResponseEntity.ok(results);
    }
}
```

### 7.3 社交網絡分析 API

```java
/**
 * 社交網絡分析 REST API
 */
@RestController
@RequestMapping("/api/social")
public class SocialNetworkController {
    
    @Autowired
    private SocialNetworkAnalysisService socialNetworkService;
    
    /**
     * 社群檢測請求 DTO
     */
    public static class CommunityDetectionRequest {
        @NotNull
        private List<SocialNetworkAnalysisService.SocialRelationship> relationships;
        
        @DecimalMin("0.0")
        @DecimalMax("1.0")
        private double strengthThreshold = 0.5;
        
        // getter、setter 省略
    }
    
    /**
     * 社群檢測響應 DTO
     */
    public static class CommunityDetectionResponse {
        private List<List<Long>> communities;
        private Map<Long, Integer> userToCommunity;
        private double modularity;
        private int communityCount;
        private Map<String, Object> analysis;
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 社群檢測 API
     */
    @PostMapping("/communities/detect")
    public ResponseEntity<CommunityDetectionResponse> detectCommunities(
            @Valid @RequestBody CommunityDetectionRequest request) {
        
        // 執行社群檢測
        SocialNetworkAnalysisService.CommunityDetectionResult result = 
            socialNetworkService.detectCommunities(
                request.getRelationships(), 
                request.getStrengthThreshold()
            );
        
        // 分析社群特徵
        Map<String, Object> analysis = 
            socialNetworkService.analyzeCommunityCharacteristics(
                result, request.getRelationships()
            );
        
        // 構建響應
        CommunityDetectionResponse response = new CommunityDetectionResponse();
        response.setCommunities(result.getCommunities());
        response.setUserToCommunity(result.getUserToCommunity());
        response.setModularity(result.getModularity());
        response.setCommunityCount(result.getCommunityCount());
        response.setAnalysis(analysis);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 用戶關係推薦 API
     */
    @GetMapping("/recommendations/{userId}")
    public ResponseEntity<List<Long>> recommendConnections(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int limit) {
        
        // 基於社群分析推薦潛在連接
        // 這裡可以實現基於共同朋友、社群相似性等的推薦算法
        List<Long> recommendations = generateRecommendations(userId, limit);
        
        return ResponseEntity.ok(recommendations);
    }
    
    private List<Long> generateRecommendations(Long userId, int limit) {
        // 簡化的推薦邏輯
        return Arrays.asList(1L, 2L, 3L, 4L, 5L).stream()
                    .filter(id -> !id.equals(userId))
                    .limit(limit)
                    .collect(Collectors.toList());
    }
}
```

## 8. 測試策略 (Testing Strategy)

### 8.1 單元測試

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Arrays;
import java.util.List;

/**
 * 帳戶合併算法單元測試
 */
class AccountMergeTest {
    
    private List<List<String>> testAccounts;
    private List<List<String>> expectedResult;
    
    @BeforeEach
    void setUp() {
        testAccounts = Arrays.asList(
            Arrays.asList("John", "johnsmith@mail.com", "john_newyork@mail.com"),
            Arrays.asList("John", "johnsmith@mail.com", "john00@mail.com"),
            Arrays.asList("Mary", "mary@mail.com"),
            Arrays.asList("John", "johnnybravo@mail.com")
        );
        
        expectedResult = Arrays.asList(
            Arrays.asList("John", "john00@mail.com", "john_newyork@mail.com", "johnsmith@mail.com"),
            Arrays.asList("Mary", "mary@mail.com"),
            Arrays.asList("John", "johnnybravo@mail.com")
        );
    }
    
    @ParameterizedTest
    @EnumSource(GraphAlgorithmFactory.AlgorithmType.class)
    @DisplayName("測試所有算法的正確性")
    void testAllAlgorithmsCorrectness(GraphAlgorithmFactory.AlgorithmType algorithmType) {
        GraphAlgorithmFactory factory = new GraphAlgorithmFactory();
        Function<List<List<String>>, List<List<String>>> algorithm = 
            factory.getAccountMergeAlgorithm(algorithmType);
        
        List<List<String>> result = algorithm.apply(testAccounts);
        
        // 驗證結果的正確性
        assertEquals(expectedResult.size(), result.size());
        
        // 對結果進行排序以便比較
        result.forEach(Collections::sort);
        expectedResult.forEach(Collections::sort);
        
        // 驗證每個合併的帳戶
        for (List<String> expectedAccount : expectedResult) {
            assertTrue(result.contains(expectedAccount), 
                      "結果中應包含預期的帳戶: " + expectedAccount);
        }
    }
    
    @Test
    @DisplayName("測試空輸入")
    void testEmptyInput() {
        AccountMergeDFS algorithm = new AccountMergeDFS();
        List<List<String>> result = algorithm.accountsMerge(Arrays.asList());
        
        assertTrue(result.isEmpty());
    }
    
    @Test
    @DisplayName("測試單個帳戶")
    void testSingleAccount() {
        List<List<String>> singleAccount = Arrays.asList(
            Arrays.asList("John", "john@mail.com", "john2@mail.com")
        );
        
        AccountMergeDFS algorithm = new AccountMergeDFS();
        List<List<String>> result = algorithm.accountsMerge(singleAccount);
        
        assertEquals(1, result.size());
        assertEquals("John", result.get(0).get(0));
        assertTrue(result.get(0).contains("john@mail.com"));
        assertTrue(result.get(0).contains("john2@mail.com"));
    }
    
    @Test
    @DisplayName("測試無需合併的帳戶")
    void testNoMergeNeeded() {
        List<List<String>> separateAccounts = Arrays.asList(
            Arrays.asList("John", "john1@mail.com"),
            Arrays.asList("Mary", "mary@mail.com"),
            Arrays.asList("Bob", "bob@mail.com")
        );
        
        AccountMergeDFS algorithm = new AccountMergeDFS();
        List<List<String>> result = algorithm.accountsMerge(separateAccounts);
        
        assertEquals(3, result.size());
    }
    
    @Test
    @DisplayName("測試複雜合併情況")
    void testComplexMerging() {
        List<List<String>> complexAccounts = Arrays.asList(
            Arrays.asList("John", "a@mail.com", "b@mail.com"),
            Arrays.asList("John", "b@mail.com", "c@mail.com"),
            Arrays.asList("John", "c@mail.com", "d@mail.com"),
            Arrays.asList("Mary", "e@mail.com", "f@mail.com")
        );
        
        AccountMergeDFS algorithm = new AccountMergeDFS();
        List<List<String>> result = algorithm.accountsMerge(complexAccounts);
        
        assertEquals(2, result.size());
        
        // 找到 John 的合併帳戶
        List<String> johnAccount = result.stream()
            .filter(account -> account.get(0).equals("John"))
            .findFirst()
            .orElse(null);
        
        assertNotNull(johnAccount);
        assertEquals(5, johnAccount.size()); // 名字 + 4個電子郵件
        assertTrue(johnAccount.containsAll(Arrays.asList("a@mail.com", "b@mail.com", "c@mail.com", "d@mail.com")));
    }
}
```

### 8.2 並查集專項測試

```java
/**
 * 並查集數據結構專項測試
 */
class UnionFindTest {
    
    private UnionFind unionFind;
    
    @BeforeEach
    void setUp() {
        unionFind = new UnionFind();
    }
    
    @Test
    @DisplayName("測試基本操作")
    void testBasicOperations() {
        // 創建集合
        unionFind.makeSet("a");
        unionFind.makeSet("b");
        unionFind.makeSet("c");
        
        // 測試初始狀態
        assertEquals("a", unionFind.find("a"));
        assertEquals("b", unionFind.find("b"));
        assertEquals("c", unionFind.find("c"));
        
        assertFalse(unionFind.connected("a", "b"));
        assertFalse(unionFind.connected("b", "c"));
        
        // 測試合併
        unionFind.union("a", "b");
        assertTrue(unionFind.connected("a", "b"));
        assertFalse(unionFind.connected("a", "c"));
        
        unionFind.union("b", "c");
        assertTrue(unionFind.connected("a", "c"));
        assertTrue(unionFind.connected("b", "c"));
    }
    
    @Test
    @DisplayName("測試路徑壓縮")
    void testPathCompression() {
        // 創建長鏈
        String[] elements = {"a", "b", "c", "d", "e", "f"};
        
        for (String element : elements) {
            unionFind.makeSet(element);
        }
        
        // 創建長鏈：a -> b -> c -> d -> e -> f
        for (int i = 0; i < elements.length - 1; i++) {
            unionFind.union(elements[i], elements[i + 1]);
        }
        
        // 查找應該觸發路徑壓縮
        String root = unionFind.find("f");
        
        // 驗證所有元素都直接指向根
        for (String element : elements) {
            assertEquals(root, unionFind.find(element));
        }
    }
    
    @Test
    @DisplayName("測試按秩合併")
    void testUnionByRank() {
        // 這個測試驗證按秩合併能保持較低的樹高度
        GenericUnionFind<Integer> uf = new GenericUnionFind<>();
        
        // 創建兩個不同大小的樹
        for (int i = 1; i <= 8; i++) {
            uf.makeSet(i);
        }
        
        // 創建第一棵樹：1-2-3-4
        uf.union(1, 2);
        uf.union(2, 3);
        uf.union(3, 4);
        
        // 創建第二棵樹：5-6, 7-8, (5-6)-(7-8)
        uf.union(5, 6);
        uf.union(7, 8);
        uf.union(5, 7);
        
        // 合併兩棵樹
        uf.union(1, 5);
        
        // 驗證所有元素在同一集合中
        for (int i = 2; i <= 8; i++) {
            assertTrue(uf.find(1).equals(uf.find(i)));
        }
    }
    
    @Test
    @DisplayName("測試大規模數據性能")
    void testLargeScalePerformance() {
        GenericUnionFind<Integer> uf = new GenericUnionFind<>();
        int n = 10000;
        
        // 創建大量元素
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < n; i++) {
            uf.makeSet(i);
        }
        
        // 隨機合併
        Random random = new Random(42);
        for (int i = 0; i < n / 2; i++) {
            int a = random.nextInt(n);
            int b = random.nextInt(n);
            uf.union(a, b);
        }
        
        // 執行大量查找操作
        for (int i = 0; i < n; i++) {
            uf.find(i);
        }
        
        long endTime = System.currentTimeMillis();
        long executionTime = endTime - startTime;
        
        // 驗證性能（應該在合理時間內完成）
        assertTrue(executionTime < 1000, "大規模操作應該在1秒內完成，實際用時：" + executionTime + "ms");
        
        // 驗證正確性
        assertTrue(uf.getComponentCount() > 0);
        assertTrue(uf.getComponentCount() <= n);
    }
}
```

### 8.3 整合測試

```java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Spring Boot 整合測試
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@SpringJUnitConfig
class AccountMergeIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("測試帳戶合併 REST API")
    void testAccountMergeAPI() {
        // 準備測試數據
        AccountMergeController.AccountMergeRequest request = 
            new AccountMergeController.AccountMergeRequest();
        
        List<List<String>> accounts = Arrays.asList(
            Arrays.asList("John", "john1@mail.com", "john2@mail.com"),
            Arrays.asList("John", "john1@mail.com", "john3@mail.com"),
            Arrays.asList("Mary", "mary@mail.com")
        );
        
        request.setAccounts(accounts);
        request.setAlgorithmType(GraphAlgorithmFactory.AlgorithmType.OPTIMIZED_UNION_FIND);
        
        // 發送請求
        ResponseEntity<AccountMergeController.AccountMergeResponse> response = 
            restTemplate.postForEntity("/api/accounts/merge", request, 
                                     AccountMergeController.AccountMergeResponse.class);
        
        // 驗證響應
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        AccountMergeController.AccountMergeResponse responseBody = response.getBody();
        assertEquals(3, responseBody.getOriginalAccountCount());
        assertEquals(2, responseBody.getMergedAccountCount());
        assertTrue(responseBody.getExecutionTimeMs() >= 0);
        assertEquals("OPTIMIZED_UNION_FIND", responseBody.getAlgorithmUsed());
    }
    
    @Test
    @DisplayName("測試異步帳戶合併 API")
    void testAsyncAccountMergeAPI() throws Exception {
        AccountMergeController.AccountMergeRequest request = 
            new AccountMergeController.AccountMergeRequest();
        
        request.setAccounts(Arrays.asList(
            Arrays.asList("Test", "test1@mail.com", "test2@mail.com")
        ));
        
        // 測試異步端點
        ResponseEntity<AccountMergeController.AccountMergeResponse> response = 
            restTemplate.postForEntity("/api/accounts/merge/async", request, 
                                     AccountMergeController.AccountMergeResponse.class);
        
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }
    
    @Test
    @DisplayName("測試性能比較 API")
    void testPerformanceComparisonAPI() {
        AccountMergeController.AccountMergeRequest request = 
            new AccountMergeController.AccountMergeRequest();
        
        // 使用較小的測試數據集以確保測試快速完成
        request.setAccounts(Arrays.asList(
            Arrays.asList("User1", "user1a@mail.com", "user1b@mail.com"),
            Arrays.asList("User1", "user1b@mail.com", "user1c@mail.com"),
            Arrays.asList("User2", "user2@mail.com")
        ));
        
        ResponseEntity<Map> response = 
            restTemplate.postForEntity("/api/accounts/performance/compare", 
                                     request, Map.class);
        
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> responseBody = response.getBody();
        
        // 驗證所有算法都有結果
        for (GraphAlgorithmFactory.AlgorithmType type : 
             GraphAlgorithmFactory.AlgorithmType.values()) {
            assertTrue(responseBody.containsKey(type.name()));
        }
    }
    
    @Test
    @DisplayName("測試輸入驗證")
    void testInputValidation() {
        // 測試空帳戶列表
        AccountMergeController.AccountMergeRequest emptyRequest = 
            new AccountMergeController.AccountMergeRequest();
        emptyRequest.setAccounts(Arrays.asList());
        
        ResponseEntity<String> response = 
            restTemplate.postForEntity("/api/accounts/merge", emptyRequest, String.class);
        
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}
```

## 9. 實際應用場景 (Real-world Applications)

### 9.1 客戶關係管理 (CRM) 系統

```java
/**
 * CRM 系統中的客戶資料整合服務
 * 用於合併來自不同渠道的客戶資料
 */
@Service
public class CustomerDataIntegrationService {
    
    /**
     * 客戶資料實體
     */
    @Entity
    @Table(name = "customer_records")
    public static class CustomerRecord {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        
        @Column(name = "name")
        private String name;
        
        @Column(name = "email")
        private String email;
        
        @Column(name = "phone")
        private String phone;
        
        @Column(name = "company")
        private String company;
        
        @Column(name = "source_system")
        private String sourceSystem; // CRM, ERP, 網站, 手機APP等
        
        @Column(name = "created_at")
        private LocalDateTime createdAt;
        
        @Column(name = "confidence_score")
        private Double confidenceScore; // 資料可信度 0.0-1.0
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 客戶整合結果
     */
    public static class CustomerIntegrationResult {
        private final List<CustomerRecord> integratedCustomers;
        private final Map<String, List<CustomerRecord>> duplicateGroups;
        private final Map<String, String> conflictResolutions;
        private final double integrationConfidence;
        
        public CustomerIntegrationResult(List<CustomerRecord> integratedCustomers,
                                       Map<String, List<CustomerRecord>> duplicateGroups,
                                       Map<String, String> conflictResolutions,
                                       double integrationConfidence) {
            this.integratedCustomers = integratedCustomers;
            this.duplicateGroups = duplicateGroups;
            this.conflictResolutions = conflictResolutions;
            this.integrationConfidence = integrationConfidence;
        }
        
        // getter 方法省略
    }
    
    /**
     * 整合客戶資料
     */
    public CustomerIntegrationResult integrateCustomerData(
            List<CustomerRecord> records, double similarityThreshold) {
        
        // 轉換為圖問題：如果兩個記錄相似度超過閾值，就連接它們
        List<List<String>> accounts = convertToGraphFormat(records);
        
        // 使用優化的並查集進行聚類
        OptimizedAccountMergeUnionFind algorithm = new OptimizedAccountMergeUnionFind();
        List<List<String>> clusters = algorithm.accountsMerge(accounts);
        
        // 將聚類結果轉換回客戶記錄
        List<CustomerRecord> integratedCustomers = new ArrayList<>();
        Map<String, List<CustomerRecord>> duplicateGroups = new HashMap<>();
        Map<String, String> conflictResolutions = new HashMap<>();
        
        for (List<String> cluster : clusters) {
            CustomerRecord integratedCustomer = mergeCustomerCluster(cluster, records);
            integratedCustomers.add(integratedCustomer);
            
            // 記錄重複組
            List<CustomerRecord> duplicates = findOriginalRecords(cluster, records);
            if (duplicates.size() > 1) {
                duplicateGroups.put(integratedCustomer.getId().toString(), duplicates);
            }
        }
        
        // 計算整合可信度
        double confidence = calculateIntegrationConfidence(
            records, integratedCustomers, duplicateGroups);
        
        return new CustomerIntegrationResult(
            integratedCustomers, duplicateGroups, conflictResolutions, confidence);
    }
    
    /**
     * 將客戶記錄轉換為圖格式
     */
    private List<List<String>> convertToGraphFormat(List<CustomerRecord> records) {
        List<List<String>> accounts = new ArrayList<>();
        Map<String, String> recordIdToName = new HashMap<>();
        
        for (CustomerRecord record : records) {
            List<String> account = new ArrayList<>();
            String recordId = "record_" + record.getId();
            
            account.add(record.getName());
            
            // 添加所有可以用來匹配的標識符
            if (record.getEmail() != null && !record.getEmail().isEmpty()) {
                account.add("email:" + record.getEmail().toLowerCase());
            }
            
            if (record.getPhone() != null && !record.getPhone().isEmpty()) {
                String normalizedPhone = normalizePhone(record.getPhone());
                account.add("phone:" + normalizedPhone);
            }
            
            if (record.getCompany() != null && !record.getCompany().isEmpty()) {
                account.add("company:" + record.getCompany().toLowerCase());
            }
            
            // 基於名字相似度添加模糊匹配
            String nameKey = generateNameKey(record.getName());
            account.add("name_fuzzy:" + nameKey);
            
            recordIdToName.put(recordId, record.getName());
            
            if (account.size() > 1) {
                accounts.add(account);
            }
        }
        
        return accounts;
    }
    
    /**
     * 合併客戶聚類
     */
    private CustomerRecord mergeCustomerCluster(List<String> cluster, 
                                              List<CustomerRecord> originalRecords) {
        
        // 找到聚類中的所有原始記錄
        List<CustomerRecord> recordsToMerge = findOriginalRecords(cluster, originalRecords);
        
        if (recordsToMerge.isEmpty()) {
            return null;
        }
        
        if (recordsToMerge.size() == 1) {
            return recordsToMerge.get(0);
        }
        
        // 合併邏輯：選擇最高可信度的資料
        CustomerRecord mergedRecord = new CustomerRecord();
        
        // 選擇最常見的名字
        String bestName = selectBestValue(
            recordsToMerge.stream().map(CustomerRecord::getName).collect(Collectors.toList()),
            recordsToMerge.stream().map(CustomerRecord::getConfidenceScore).collect(Collectors.toList())
        );
        mergedRecord.setName(bestName);
        
        // 選擇最可信的電子郵件
        String bestEmail = selectBestValue(
            recordsToMerge.stream().map(CustomerRecord::getEmail)
                         .filter(Objects::nonNull).collect(Collectors.toList()),
            recordsToMerge.stream().map(CustomerRecord::getConfidenceScore).collect(Collectors.toList())
        );
        mergedRecord.setEmail(bestEmail);
        
        // 選擇最可信的電話
        String bestPhone = selectBestValue(
            recordsToMerge.stream().map(CustomerRecord::getPhone)
                         .filter(Objects::nonNull).collect(Collectors.toList()),
            recordsToMerge.stream().map(CustomerRecord::getConfidenceScore).collect(Collectors.toList())
        );
        mergedRecord.setPhone(bestPhone);
        
        // 合併公司資訊
        String bestCompany = selectBestValue(
            recordsToMerge.stream().map(CustomerRecord::getCompany)
                         .filter(Objects::nonNull).collect(Collectors.toList()),
            recordsToMerge.stream().map(CustomerRecord::getConfidenceScore).collect(Collectors.toList())
        );
        mergedRecord.setCompany(bestCompany);
        
        // 計算綜合可信度
        double avgConfidence = recordsToMerge.stream()
            .mapToDouble(CustomerRecord::getConfidenceScore)
            .average().orElse(0.0);
        mergedRecord.setConfidenceScore(avgConfidence);
        
        // 設置來源系統為合併
        mergedRecord.setSourceSystem("MERGED");
        mergedRecord.setCreatedAt(LocalDateTime.now());
        
        return mergedRecord;
    }
    
    /**
     * 根據可信度選擇最佳值
     */
    private String selectBestValue(List<String> values, List<Double> confidences) {
        if (values.isEmpty()) {
            return null;
        }
        
        if (values.size() == 1) {
            return values.get(0);
        }
        
        // 按可信度選擇
        Map<String, Double> valueConfidence = new HashMap<>();
        for (int i = 0; i < Math.min(values.size(), confidences.size()); i++) {
            String value = values.get(i);
            Double confidence = confidences.get(i);
            valueConfidence.put(value, Math.max(valueConfidence.getOrDefault(value, 0.0), confidence));
        }
        
        return valueConfidence.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(values.get(0));
    }
    
    private List<CustomerRecord> findOriginalRecords(List<String> cluster, 
                                                   List<CustomerRecord> originalRecords) {
        // 實現根據聚類標識符找到原始記錄的邏輯
        return originalRecords.stream()
            .filter(record -> clusterContainsRecord(cluster, record))
            .collect(Collectors.toList());
    }
    
    private boolean clusterContainsRecord(List<String> cluster, CustomerRecord record) {
        // 檢查聚類是否包含該記錄的任何標識符
        return cluster.stream().anyMatch(item -> 
            item.contains(record.getEmail()) || 
            item.contains(record.getPhone()) ||
            item.contains(record.getName())
        );
    }
    
    private String normalizePhone(String phone) {
        return phone.replaceAll("[^0-9]", "");
    }
    
    private String generateNameKey(String name) {
        return name.toLowerCase().replaceAll("[^a-z]", "");
    }
    
    private double calculateIntegrationConfidence(List<CustomerRecord> original,
                                                List<CustomerRecord> integrated,
                                                Map<String, List<CustomerRecord>> duplicates) {
        // 計算整合可信度的簡化邏輯
        double reductionRatio = (double) (original.size() - integrated.size()) / original.size();
        double avgConfidence = integrated.stream()
            .mapToDouble(CustomerRecord::getConfidenceScore)
            .average().orElse(0.0);
        
        return (reductionRatio * 0.3 + avgConfidence * 0.7);
    }
}
```

### 9.2 金融反洗錢 (AML) 系統

```java
/**
 * 反洗錢系統中的可疑交易關聯分析
 * 使用圖論檢測可疑的交易網絡
 */
@Service
public class AntiMoneyLaunderingService {
    
    /**
     * 交易記錄實體
     */
    @Entity
    @Table(name = "transactions")
    public static class Transaction {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        
        @Column(name = "from_account")
        private String fromAccount;
        
        @Column(name = "to_account")
        private String toAccount;
        
        @Column(name = "amount")
        private BigDecimal amount;
        
        @Column(name = "currency")
        private String currency;
        
        @Column(name = "transaction_time")
        private LocalDateTime transactionTime;
        
        @Column(name = "transaction_type")
        @Enumerated(EnumType.STRING)
        private TransactionType type;
        
        @Column(name = "risk_score")
        private Double riskScore; // 風險評分 0.0-1.0
        
        public enum TransactionType {
            TRANSFER, DEPOSIT, WITHDRAWAL, PAYMENT, EXCHANGE
        }
        
        // 構造函數、getter、setter 省略
    }
    
    /**
     * 可疑交易網絡分析結果
     */
    public static class SuspiciousNetworkAnalysis {
        private final List<List<String>> suspiciousNetworks;
        private final Map<String, Double> accountRiskScores;
        private final List<Transaction> flaggedTransactions;
        private final double overallRiskLevel;
        
        public SuspiciousNetworkAnalysis(List<List<String>> suspiciousNetworks,
                                       Map<String, Double> accountRiskScores,
                                       List<Transaction> flaggedTransactions,
                                       double overallRiskLevel) {
            this.suspiciousNetworks = suspiciousNetworks;
            this.accountRiskScores = accountRiskScores;
            this.flaggedTransactions = flaggedTransactions;
            this.overallRiskLevel = overallRiskLevel;
        }
        
        // getter 方法省略
    }
    
    /**
     * 分析可疑交易網絡
     */
    public SuspiciousNetworkAnalysis analyzeSuspiciousNetworks(
            List<Transaction> transactions, double riskThreshold) {
        
        // 篩選高風險交易
        List<Transaction> highRiskTransactions = transactions.stream()
            .filter(t -> t.getRiskScore() >= riskThreshold)
            .collect(Collectors.toList());
        
        // 構建交易網絡圖
        Map<String, Set<String>> transactionGraph = buildTransactionGraph(highRiskTransactions);
        
        // 使用 Union-Find 檢測連通的可疑網絡
        GenericUnionFind<String> uf = new GenericUnionFind<>();
        
        // 初始化所有帳戶
        Set<String> allAccounts = getAllAccounts(highRiskTransactions);
        for (String account : allAccounts) {
            uf.makeSet(account);
        }
        
        // 連接有交易關係的帳戶
        for (Transaction transaction : highRiskTransactions) {
            uf.union(transaction.getFromAccount(), transaction.getToAccount());
        }
        
        // 獲取可疑網絡
        Map<String, List<String>> networks = uf.getConnectedComponents();
        List<List<String>> suspiciousNetworks = networks.values().stream()
            .filter(network -> network.size() >= 3) // 至少3個帳戶的網絡
            .collect(Collectors.toList());
        
        // 計算帳戶風險評分
        Map<String, Double> accountRiskScores = calculateAccountRiskScores(
            transactions, suspiciousNetworks);
        
        // 標記可疑交易
        List<Transaction> flaggedTransactions = flagTransactions(
            transactions, suspiciousNetworks, accountRiskScores);
        
        // 計算整體風險水平
        double overallRiskLevel = calculateOverallRiskLevel(
            suspiciousNetworks, accountRiskScores, flaggedTransactions);
        
        return new SuspiciousNetworkAnalysis(
            suspiciousNetworks, accountRiskScores, flaggedTransactions, overallRiskLevel);
    }
    
    /**
     * 構建交易圖
     */
    private Map<String, Set<String>> buildTransactionGraph(List<Transaction> transactions) {
        Map<String, Set<String>> graph = new HashMap<>();
        
        for (Transaction transaction : transactions) {
            String fromAccount = transaction.getFromAccount();
            String toAccount = transaction.getToAccount();
            
            graph.computeIfAbsent(fromAccount, k -> new HashSet<>()).add(toAccount);
            graph.computeIfAbsent(toAccount, k -> new HashSet<>()).add(fromAccount);
        }
        
        return graph;
    }
    
    /**
     * 獲取所有涉及的帳戶
     */
    private Set<String> getAllAccounts(List<Transaction> transactions) {
        Set<String> accounts = new HashSet<>();
        
        for (Transaction transaction : transactions) {
            accounts.add(transaction.getFromAccount());
            accounts.add(transaction.getToAccount());
        }
        
        return accounts;
    }
    
    /**
     * 計算帳戶風險評分
     */
    private Map<String, Double> calculateAccountRiskScores(
            List<Transaction> allTransactions,
            List<List<String>> suspiciousNetworks) {
        
        Map<String, Double> riskScores = new HashMap<>();
        Set<String> suspiciousAccounts = suspiciousNetworks.stream()
            .flatMap(List::stream)
            .collect(Collectors.toSet());
        
        for (String account : suspiciousAccounts) {
            double riskScore = calculateIndividualAccountRisk(account, allTransactions);
            riskScores.put(account, riskScore);
        }
        
        return riskScores;
    }
    
    /**
     * 計算單個帳戶的風險評分
     */
    private double calculateIndividualAccountRisk(String account, 
                                                List<Transaction> transactions) {
        
        List<Transaction> accountTransactions = transactions.stream()
            .filter(t -> t.getFromAccount().equals(account) || t.getToAccount().equals(account))
            .collect(Collectors.toList());
        
        if (accountTransactions.isEmpty()) {
            return 0.0;
        }
        
        // 風險因子計算
        double avgRiskScore = accountTransactions.stream()
            .mapToDouble(Transaction::getRiskScore)
            .average().orElse(0.0);
        
        double transactionVolume = accountTransactions.stream()
            .mapToDouble(t -> t.getAmount().doubleValue())
            .sum();
        
        int transactionCount = accountTransactions.size();
        
        // 異常時間模式檢測
        double timePatternRisk = detectAbnormalTimePatterns(accountTransactions);
        
        // 綜合風險評分
        return Math.min(1.0, 
            avgRiskScore * 0.4 + 
            Math.min(1.0, transactionVolume / 1000000.0) * 0.3 +
            Math.min(1.0, transactionCount / 100.0) * 0.2 +
            timePatternRisk * 0.1
        );
    }
    
    /**
     * 檢測異常時間模式
     */
    private double detectAbnormalTimePatterns(List<Transaction> transactions) {
        if (transactions.size() < 2) {
            return 0.0;
        }
        
        // 檢測是否有大量深夜交易
        long nightTransactions = transactions.stream()
            .filter(t -> {
                int hour = t.getTransactionTime().getHour();
                return hour >= 23 || hour <= 5;
            })
            .count();
        
        double nightRatio = (double) nightTransactions / transactions.size();
        
        // 檢測交易頻率是否異常高
        Map<LocalDate, Long> dailyTransactions = transactions.stream()
            .collect(Collectors.groupingBy(
                t -> t.getTransactionTime().toLocalDate(),
                Collectors.counting()
            ));
        
        double avgDailyTransactions = dailyTransactions.values().stream()
            .mapToLong(Long::longValue)
            .average().orElse(0.0);
        
        double frequencyRisk = Math.min(1.0, avgDailyTransactions / 50.0);
        
        return Math.min(1.0, nightRatio * 0.6 + frequencyRisk * 0.4);
    }
    
    /**
     * 標記可疑交易
     */
    private List<Transaction> flagTransactions(List<Transaction> allTransactions,
                                             List<List<String>> suspiciousNetworks,
                                             Map<String, Double> accountRiskScores) {
        
        Set<String> suspiciousAccounts = suspiciousNetworks.stream()
            .flatMap(List::stream)
            .collect(Collectors.toSet());
        
        return allTransactions.stream()
            .filter(transaction -> {
                String fromAccount = transaction.getFromAccount();
                String toAccount = transaction.getToAccount();
                
                // 如果涉及可疑帳戶且風險評分高
                boolean involvesSuspiciousAccount = 
                    suspiciousAccounts.contains(fromAccount) || 
                    suspiciousAccounts.contains(toAccount);
                
                double maxAccountRisk = Math.max(
                    accountRiskScores.getOrDefault(fromAccount, 0.0),
                    accountRiskScores.getOrDefault(toAccount, 0.0)
                );
                
                return involvesSuspiciousAccount && 
                       (transaction.getRiskScore() >= 0.7 || maxAccountRisk >= 0.8);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * 計算整體風險水平
     */
    private double calculateOverallRiskLevel(List<List<String>> suspiciousNetworks,
                                           Map<String, Double> accountRiskScores,
                                           List<Transaction> flaggedTransactions) {
        
        if (suspiciousNetworks.isEmpty()) {
            return 0.0;
        }
        
        // 可疑網絡規模風險
        double networkSizeRisk = suspiciousNetworks.stream()
            .mapToInt(List::size)
            .max().orElse(0) / 100.0;
        
        // 平均帳戶風險
        double avgAccountRisk = accountRiskScores.values().stream()
            .mapToDouble(Double::doubleValue)
            .average().orElse(0.0);
        
        // 可疑交易比例
        double flaggedTransactionRatio = flaggedTransactions.size() / 1000.0;
        
        return Math.min(1.0, 
            networkSizeRisk * 0.3 + 
            avgAccountRisk * 0.5 + 
            flaggedTransactionRatio * 0.2
        );
    }
}
```

## 10. 總結與最佳實踐 (Summary and Best Practices)

### 10.1 算法選擇指南

```java
/**
 * 帳戶合併算法選擇指南
 */
public class AlgorithmSelectionGuide {
    
    /**
     * 場景分析和算法推薦
     */
    public static class ScenarioRecommendation {
        private final String scenario;
        private final GraphAlgorithmFactory.AlgorithmType recommendedAlgorithm;
        private final String reasoning;
        private final Map<String, Object> performanceCharacteristics;
        
        public ScenarioRecommendation(String scenario, 
                                    GraphAlgorithmFactory.AlgorithmType algorithm,
                                    String reasoning,
                                    Map<String, Object> characteristics) {
            this.scenario = scenario;
            this.recommendedAlgorithm = algorithm;
            this.reasoning = reasoning;
            this.performanceCharacteristics = characteristics;
        }
        
        // getter 方法省略
    }
    
    /**
     * 根據場景推薦最適合的算法
     */
    public static ScenarioRecommendation recommendAlgorithm(
            int accountCount, int avgEmailsPerAccount, boolean requiresStability) {
        
        Map<String, Object> characteristics = new HashMap<>();
        
        // 小規模數據 (< 1000 帳戶)
        if (accountCount < 1000) {
            characteristics.put("timeComplexity", "O(NK + E)");
            characteristics.put("spaceComplexity", "O(NK + E)");
            characteristics.put("implementation", "Simple");
            
            return new ScenarioRecommendation(
                "小規模數據處理",
                GraphAlgorithmFactory.AlgorithmType.DFS,
                "DFS 實現簡單，對於小規模數據性能充足，易於調試和理解",
                characteristics
            );
        }
        
        // 中等規模數據 (1000-10000 帳戶)
        else if (accountCount < 10000) {
            characteristics.put("timeComplexity", "O(NK * α(NK))");
            characteristics.put("spaceComplexity", "O(NK)");
            characteristics.put("implementation", "Moderate");
            
            return new ScenarioRecommendation(
                "中等規模數據處理",
                GraphAlgorithmFactory.AlgorithmType.UNION_FIND,
                "Union-Find 在中等規模下性能優異，空間使用較少",
                characteristics
            );
        }
        
        // 大規模數據 (> 10000 帳戶)
        else {
            characteristics.put("timeComplexity", "O(NK * α(NK))");
            characteristics.put("spaceComplexity", "O(NK)");
            characteristics.put("implementation", "Advanced");
            characteristics.put("optimizations", "Path compression + Union by rank");
            
            return new ScenarioRecommendation(
                "大規模數據處理",
                GraphAlgorithmFactory.AlgorithmType.OPTIMIZED_UNION_FIND,
                "優化的 Union-Find 提供最佳的時間性能，包含路徑壓縮和按秩合併優化",
                characteristics
            );
        }
    }
    
    /**
     * 提供詳細的選擇建議
     */
    public static void printSelectionGuide() {
        System.out.println("=== 帳戶合併算法選擇指南 ===");
        System.out.println();
        
        System.out.println("1. 數據規模考量：");
        System.out.println("   • 小規模 (< 1,000 帳戶): DFS/BFS");
        System.out.println("   • 中等規模 (1,000-10,000 帳戶): Union-Find");
        System.out.println("   • 大規模 (> 10,000 帳戶): Optimized Union-Find");
        System.out.println();
        
        System.out.println("2. 性能要求：");
        System.out.println("   • 實時處理: Optimized Union-Find");
        System.out.println("   • 批次處理: DFS/BFS (更直觀)");
        System.out.println("   • 內存受限: Union-Find (空間複雜度較低)");
        System.out.println();
        
        System.out.println("3. 維護考量：");
        System.out.println("   • 易於理解和調試: DFS");
        System.out.println("   • 高性能要求: Optimized Union-Find");
        System.out.println("   • 教學用途: BFS (層次遍歷更直觀)");
        System.out.println();
        
        System.out.println("4. 擴展需求：");
        System.out.println("   • 需要遍歷順序: BFS");
        System.out.println("   • 動態合併: Union-Find");
        System.out.println("   • 並行處理: 圖方法更容易並行化");
    }
}
```

### 10.2 性能優化建議

```java
/**
 * 性能優化最佳實踐
 */
public class PerformanceOptimizationGuide {
    
    /**
     * Union-Find 優化技術
     */
    public static class OptimizedUnionFindTechniques {
        
        /**
         * 1. 路徑壓縮優化
         */
        public static void demonstratePathCompression() {
            System.out.println("=== 路徑壓縮優化 ===");
            System.out.println("優化前：find(x) 可能需要 O(n) 時間");
            System.out.println("優化後：find(x) 攤還時間複雜度接近 O(1)");
            System.out.println();
            System.out.println("實現要點：");
            System.out.println("if (!parent[x].equals(x)) {");
            System.out.println("    parent[x] = find(parent[x]); // 遞歸壓縮");
            System.out.println("}");
        }
        
        /**
         * 2. 按秩合併優化
         */
        public static void demonstrateUnionByRank() {
            System.out.println("=== 按秩合併優化 ===");
            System.out.println("目標：保持樹的高度盡可能低");
            System.out.println("策略：總是將較小的樹合併到較大的樹下");
            System.out.println();
            System.out.println("實現要點：");
            System.out.println("if (rank[rootX] < rank[rootY]) {");
            System.out.println("    parent[rootX] = rootY;");
            System.out.println("} else if (rank[rootX] > rank[rootY]) {");
            System.out.println("    parent[rootY] = rootX;");
            System.out.println("} else {");
            System.out.println("    parent[rootY] = rootX;");
            System.out.println("    rank[rootX]++;");
            System.out.println("}");
        }
        
        /**
         * 3. 內存使用優化
         */
        public static void demonstrateMemoryOptimization() {
            System.out.println("=== 內存使用優化 ===");
            System.out.println("1. 使用原生數組替代 HashMap (當元素是連續整數時)");
            System.out.println("2. 惰性初始化：只在需要時創建數據結構");
            System.out.println("3. 對象池：重用 UnionFind 實例");
            System.out.println("4. 壓縮表示：使用位操作減少空間占用");
        }
    }
    
    /**
     * 圖算法優化技術
     */
    public static class GraphAlgorithmOptimizations {
        
        /**
         * DFS 優化建議
         */
        public static void optimizeDFS() {
            System.out.println("=== DFS 優化建議 ===");
            System.out.println("1. 迭代代替遞歸（避免棧溢出）");
            System.out.println("2. 提前終止（找到目標後立即返回）");
            System.out.println("3. 訪問標記優化（使用 BitSet）");
            System.out.println("4. 鄰接表優化（使用 ArrayList 而非 HashSet）");
        }
        
        /**
         * BFS 優化建議
         */
        public static void optimizeBFS() {
            System.out.println("=== BFS 優化建議 ===");
            System.out.println("1. 使用 ArrayDeque 而非 LinkedList");
            System.out.println("2. 批次處理同一層的節點");
            System.out.println("3. 雙向 BFS（從兩端同時搜索）");
            System.out.println("4. 限制搜索深度（避免無限擴展）");
        }
    }
    
    /**
     * 企業級優化策略
     */
    public static class EnterpriseOptimizationStrategies {
        
        /**
         * 緩存策略
         */
        public static void demonstrateCachingStrategies() {
            System.out.println("=== 緩存策略 ===");
            System.out.println("1. 結果緩存：緩存常見輸入的計算結果");
            System.out.println("2. 中間結果緩存：緩存連通分量計算結果");
            System.out.println("3. 熱點數據緩存：緩存頻繁查詢的帳戶關係");
            System.out.println("4. 分層緩存：本地緩存 + 分布式緩存");
        }
        
        /**
         * 並行化策略
         */
        public static void demonstrateParallelizationStrategies() {
            System.out.println("=== 並行化策略 ===");
            System.out.println("1. 數據分片：按帳戶范圍分割輸入");
            System.out.println("2. 管道並行：同時進行圖構建和連通分量檢測");
            System.out.println("3. 結果合併：並行合併多個子結果");
            System.out.println("4. 異步處理：使用 CompletableFuture 處理大批量請求");
        }
        
        /**
         * 內存管理策略
         */
        public static void demonstrateMemoryManagementStrategies() {
            System.out.println("=== 內存管理策略 ===");
            System.out.println("1. 流式處理：避免將所有數據加載到內存");
            System.out.println("2. 對象池：重用大對象避免頻繁 GC");
            System.out.println("3. 弱引用：允許 GC 回收不常用的數據");
            System.out.println("4. 分片處理：將大數據集分成小塊處理");
        }
    }
}
```

### 10.3 最佳實踐總結

```java
/**
 * 最佳實踐總結
 */
public class BestPracticesSummary {
    
    /**
     * 設計原則
     */
    public static void printDesignPrinciples() {
        System.out.println("=== 設計原則 ===");
        System.out.println();
        
        System.out.println("1. 單一職責原則");
        System.out.println("   • 每個類只負責一個算法的實現");
        System.out.println("   • 分離圖構建、算法執行、結果處理邏輯");
        System.out.println();
        
        System.out.println("2. 開放封閉原則");
        System.out.println("   • 使用工廠模式支持算法擴展");
        System.out.println("   • 通過接口定義算法契約");
        System.out.println();
        
        System.out.println("3. 依賴倒置原則");
        System.out.println("   • 依賴抽象而非具體實現");
        System.out.println("   • 使用依賴注入管理算法實例");
        System.out.println();
        
        System.out.println("4. 接口隔離原則");
        System.out.println("   • 提供粒度合適的接口");
        System.out.println("   • 避免胖接口設計");
    }
    
    /**
     * 編碼實踐
     */
    public static void printCodingPractices() {
        System.out.println("=== 編碼實踐 ===");
        System.out.println();
        
        System.out.println("1. 輸入驗證");
        System.out.println("   • 檢查 null 輸入");
        System.out.println("   • 驗證數據格式和範圍");
        System.out.println("   • 提供有意義的錯誤消息");
        System.out.println();
        
        System.out.println("2. 異常處理");
        System.out.println("   • 使用自定義異常類");
        System.out.println("   • 提供異常恢復機制");
        System.out.println("   • 記錄詳細的錯誤信息");
        System.out.println();
        
        System.out.println("3. 性能監控");
        System.out.println("   • 添加執行時間監控");
        System.out.println("   • 監控內存使用情況");
        System.out.println("   • 記錄關鍵性能指標");
        System.out.println();
        
        System.out.println("4. 文檔化");
        System.out.println("   • 編寫清晰的 JavaDoc");
        System.out.println("   • 提供使用示例");
        System.out.println("   • 說明時間和空間複雜度");
    }
    
    /**
     * 測試策略
     */
    public static void printTestingStrategies() {
        System.out.println("=== 測試策略 ===");
        System.out.println();
        
        System.out.println("1. 單元測試");
        System.out.println("   • 測試邊界條件");
        System.out.println("   • 驗證算法正確性");
        System.out.println("   • 測試異常處理");
        System.out.println();
        
        System.out.println("2. 性能測試");
        System.out.println("   • 基準測試不同算法");
        System.out.println("   • 測試大規模數據性能");
        System.out.println("   • 監控內存使用");
        System.out.println();
        
        System.out.println("3. 整合測試");
        System.out.println("   • 測試 Spring Boot 整合");
        System.out.println("   • 驗證 REST API 功能");
        System.out.println("   • 測試緩存機制");
        System.out.println();
        
        System.out.println("4. 壓力測試");
        System.out.println("   • 測試並發處理能力");
        System.out.println("   • 驗證系統穩定性");
        System.out.println("   • 測試資源限制下的表現");
    }
    
    /**
     * 生產部署建議
     */
    public static void printProductionDeploymentAdvice() {
        System.out.println("=== 生產部署建議 ===");
        System.out.println();
        
        System.out.println("1. 監控和告警");
        System.out.println("   • 設置性能監控指標");
        System.out.println("   • 配置異常告警機制");
        System.out.println("   • 監控系統資源使用");
        System.out.println();
        
        System.out.println("2. 擴展性考慮");
        System.out.println("   • 設計水平擴展架構");
        System.out.println("   • 使用負載均衡");
        System.out.println("   • 考慮數據分片策略");
        System.out.println();
        
        System.out.println("3. 安全性");
        System.out.println("   • 輸入數據驗證和過濾");
        System.out.println("   • API 訪問控制");
        System.out.println("   • 敏感數據保護");
        System.out.println();
        
        System.out.println("4. 災難恢復");
        System.out.println("   • 定期備份關鍵數據");
        System.out.println("   • 設計故障轉移機制");
        System.out.println("   • 制定應急響應計劃");
    }
}
```

## 11. 未來發展趨勢

帳戶合併和圖論算法在現代軟件開發中將繼續發揮重要作用：

1. **機器學習集成**：使用 ML 模型提高相似度判斷的準確性
2. **實時流處理**：支持增量式帳戶合併和動態圖更新
3. **分布式計算**：在大規模集群上處理海量數據
4. **區塊鏈應用**：在去中心化系統中進行身份驗證和合併
5. **隱私保護**：在保護用戶隱私的前提下進行數據合併

---

*本文檔提供了帳戶合併問題的全面解析，從基礎圖論概念到企業級實現，涵蓋了現代 Java 開發中所需的各個方面。希望能夠幫助開發者深入理解圖論算法的實際應用，並在實際項目中有效運用這些技術。*