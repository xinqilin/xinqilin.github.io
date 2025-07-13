---
title: "Java Map 按 Value 排序：完整實作與效能優化指南"
author: Bill.Lin
date: 2021-03-28T15:10:59+08:00
draft: false
tags: ["Java", "Map", "Sorting", "Collections", "Stream API", "Performance", "Lambda", "TreeMap", "LinkedHashMap", "Comparator"]
Description: "深入解析 Java Map 按 Value 排序的多種實作方法，包含 Stream API、Collections.sort、TreeMap 等方式，並提供效能分析與最佳實踐"
Categories: ["Backend"]
DisableComments: false
---

## 概述

在 Java 程式開發中，經常需要對 Map 集合按照 Value 值進行排序。Map 本身並不保證元素的順序，因此需要採用特定的技術來實現按 Value 排序。本文將深入介紹多種實作方式，並分析其效能特徵和適用場景。

### 核心概念

- **Map 排序特性**：Map 接口本身不提供排序功能
- **排序策略**：通過轉換為 List 或使用 Stream API 實現
- **排序穩定性**：保持相等元素的相對順序
- **效能考量**：時間複雜度和空間複雜度的權衡

### 常見應用場景

1. **統計排名**：字頻統計、用戶評分排序
2. **資料分析**：銷售數據排序、效能指標排名
3. **快取管理**：LRU 快取的熱點資料排序
4. **搜尋結果**：相關性得分排序

## 實作方法一：Collections.sort + Map.Entry

### 1. 基礎實作

這是最傳統且直觀的方法，通過將 Map 的 entrySet 轉換為 List 進行排序。

```java
package com.example.sorting;

import java.util.*;
import java.util.stream.Collectors;

public class MapSortingExample {
    
    public static void main(String[] args) {
        // 創建測試資料
        Map<String, Integer> wordFrequency = createSampleData();
        
        // 方法一：使用 Collections.sort 排序
        Map<String, Integer> sortedByValue = sortByValueUsingCollections(wordFrequency);
        System.out.println("排序結果: " + sortedByValue);
    }
    
    /**
     * 使用 Collections.sort 按 Value 排序（降序）
     */
    public static <K, V extends Comparable<V>> Map<K, V> sortByValueUsingCollections(Map<K, V> map) {
        // 將 Map 的 entrySet 轉換為 List
        List<Map.Entry<K, V>> list = new ArrayList<>(map.entrySet());
        
        // 使用 Collections.sort 排序
        Collections.sort(list, new Comparator<Map.Entry<K, V>>() {
            @Override
            public int compare(Map.Entry<K, V> entry1, Map.Entry<K, V> entry2) {
                // 降序排列：entry2 - entry1
                return entry2.getValue().compareTo(entry1.getValue());
            }
        });
        
        // 將排序後的結果放入 LinkedHashMap 保持順序
        Map<K, V> sortedMap = new LinkedHashMap<>();
        for (Map.Entry<K, V> entry : list) {
            sortedMap.put(entry.getKey(), entry.getValue());
        }
        
        return sortedMap;
    }
    
    /**
     * 創建測試資料
     */
    private static Map<String, Integer> createSampleData() {
        Map<String, Integer> map = new HashMap<>();
        map.put("apple", 10);
        map.put("banana", 25);
        map.put("cherry", 5);
        map.put("date", 15);
        map.put("elderberry", 30);
        return map;
    }
}
```

### 2. Lambda 表達式簡化版本

```java
/**
 * 使用 Lambda 表達式簡化比較器
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValueWithLambda(Map<K, V> map) {
    List<Map.Entry<K, V>> list = new ArrayList<>(map.entrySet());
    
    // Lambda 表達式簡化比較器
    Collections.sort(list, (entry1, entry2) -> 
        entry2.getValue().compareTo(entry1.getValue())
    );
    
    Map<K, V> sortedMap = new LinkedHashMap<>();
    for (Map.Entry<K, V> entry : list) {
        sortedMap.put(entry.getKey(), entry.getValue());
    }
    
    return sortedMap;
}

/**
 * 更簡潔的 Lambda 版本，支援升序/降序
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValue(
        Map<K, V> map, boolean ascending) {
    
    List<Map.Entry<K, V>> list = new ArrayList<>(map.entrySet());
    
    if (ascending) {
        Collections.sort(list, Map.Entry.comparingByValue());
    } else {
        Collections.sort(list, Map.Entry.<K, V>comparingByValue().reversed());
    }
    
    return list.stream()
               .collect(Collectors.toMap(
                   Map.Entry::getKey, 
                   Map.Entry::getValue,
                   (oldValue, newValue) -> oldValue, 
                   LinkedHashMap::new
               ));
}
```

## 實作方法二：Stream API

### 1. 基礎 Stream 排序

```java
/**
 * 使用 Stream API 進行排序
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValueUsingStream(
        Map<K, V> map, boolean ascending) {
    
    return map.entrySet()
              .stream()
              .sorted(ascending ? 
                  Map.Entry.comparingByValue() : 
                  Map.Entry.<K, V>comparingByValue().reversed())
              .collect(Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (oldValue, newValue) -> oldValue,
                  LinkedHashMap::new
              ));
}

/**
 * 支援自訂比較器的 Stream 排序
 */
public static <K, V> Map<K, V> sortByValueWithCustomComparator(
        Map<K, V> map, Comparator<V> valueComparator) {
    
    return map.entrySet()
              .stream()
              .sorted(Map.Entry.comparingByValue(valueComparator))
              .collect(Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (oldValue, newValue) -> oldValue,
                  LinkedHashMap::new
              ));
}
```

### 2. 並行 Stream 排序

```java
/**
 * 使用並行 Stream 提升大資料集的排序效能
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValueParallel(
        Map<K, V> map, boolean ascending) {
    
    return map.entrySet()
              .parallelStream()
              .sorted(ascending ? 
                  Map.Entry.comparingByValue() : 
                  Map.Entry.<K, V>comparingByValue().reversed())
              .collect(Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (oldValue, newValue) -> oldValue,
                  LinkedHashMap::new
              ));
}
```

## 實作方法三：使用 TreeMap

### 1. Value-to-Key 反轉策略

```java
/**
 * 使用 TreeMap 實現按 Value 排序
 * 注意：此方法適用於 Value 值唯一的情況
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValueUsingTreeMap(Map<K, V> map) {
    // 創建一個以 Value 為 Key 的 TreeMap
    TreeMap<V, K> reversedMap = new TreeMap<>(Collections.reverseOrder());
    
    for (Map.Entry<K, V> entry : map.entrySet()) {
        reversedMap.put(entry.getValue(), entry.getKey());
    }
    
    // 重新構建原始格式的 Map
    Map<K, V> sortedMap = new LinkedHashMap<>();
    for (Map.Entry<V, K> entry : reversedMap.entrySet()) {
        sortedMap.put(entry.getValue(), entry.getKey());
    }
    
    return sortedMap;
}

/**
 * 處理重複 Value 的 TreeMap 排序
 */
public static <K, V extends Comparable<V>> Map<K, V> sortByValueWithDuplicates(Map<K, V> map) {
    // 使用 TreeMap，Key 為複合鍵：Value + 原始Key
    TreeMap<String, Map.Entry<K, V>> sortedTreeMap = new TreeMap<>((key1, key2) -> {
        String[] parts1 = key1.split("###");
        String[] parts2 = key2.split("###");
        
        @SuppressWarnings("unchecked")
        V value1 = (V) parts1[0];
        @SuppressWarnings("unchecked") 
        V value2 = (V) parts2[0];
        
        int valueComparison = value2.compareTo(value1); // 降序
        if (valueComparison != 0) {
            return valueComparison;
        }
        return parts1[1].compareTo(parts2[1]); // 按原始 Key 排序
    });
    
    for (Map.Entry<K, V> entry : map.entrySet()) {
        String compositeKey = entry.getValue() + "###" + entry.getKey();
        sortedTreeMap.put(compositeKey, entry);
    }
    
    Map<K, V> result = new LinkedHashMap<>();
    for (Map.Entry<K, V> entry : sortedTreeMap.values()) {
        result.put(entry.getKey(), entry.getValue());
    }
    
    return result;
}
```

## 實作方法四：Key List 排序

### 1. 基於 Key 的間接排序

```java
/**
 * 通過排序 Key 列表實現間接排序
 * 適用於需要保留原始 Map 的場景
 */
public static <K, V extends Comparable<V>> List<K> sortKeysByValue(
        Map<K, V> map, boolean ascending) {
    
    List<K> keys = new ArrayList<>(map.keySet());
    
    Collections.sort(keys, (key1, key2) -> {
        V value1 = map.get(key1);
        V value2 = map.get(key2);
        
        if (ascending) {
            return value1.compareTo(value2);
        } else {
            return value2.compareTo(value1);
        }
    });
    
    return keys;
}

/**
 * 使用排序後的 Key 列表創建新的有序 Map
 */
public static <K, V> Map<K, V> createSortedMapFromKeys(Map<K, V> originalMap, List<K> sortedKeys) {
    Map<K, V> sortedMap = new LinkedHashMap<>();
    for (K key : sortedKeys) {
        sortedMap.put(key, originalMap.get(key));
    }
    return sortedMap;
}
```

## 複雜排序場景

### 1. 多級排序

```java
/**
 * 多級排序：先按 Value 排序，Value 相同時按 Key 排序
 */
public static <K extends Comparable<K>, V extends Comparable<V>> Map<K, V> 
        multiLevelSort(Map<K, V> map) {
    
    return map.entrySet()
              .stream()
              .sorted(Map.Entry.<K, V>comparingByValue().reversed()
                     .thenComparing(Map.Entry.comparingByKey()))
              .collect(Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (oldValue, newValue) -> oldValue,
                  LinkedHashMap::new
              ));
}
```

### 2. 自訂物件排序

```java
/**
 * 自訂物件作為 Value 的排序
 */
public static class ScoreData implements Comparable<ScoreData> {
    private final int score;
    private final String level;
    
    public ScoreData(int score, String level) {
        this.score = score;
        this.level = level;
    }
    
    @Override
    public int compareTo(ScoreData other) {
        int scoreComparison = Integer.compare(other.score, this.score); // 分數降序
        if (scoreComparison != 0) {
            return scoreComparison;
        }
        return this.level.compareTo(other.level); // 等級升序
    }
    
    // getter, setter, toString 方法
    public int getScore() { return score; }
    public String getLevel() { return level; }
    
    @Override
    public String toString() {
        return String.format("ScoreData{score=%d, level='%s'}", score, level);
    }
}

/**
 * 排序包含自訂物件的 Map
 */
public static Map<String, ScoreData> sortByScoreData(Map<String, ScoreData> map) {
    return map.entrySet()
              .stream()
              .sorted(Map.Entry.comparingByValue())
              .collect(Collectors.toMap(
                  Map.Entry::getKey,
                  Map.Entry::getValue,
                  (oldValue, newValue) -> oldValue,
                  LinkedHashMap::new
              ));
}
```

## 效能分析與比較

### 1. 效能測試框架

```java
package com.example.performance;

import java.util.*;
import java.util.concurrent.TimeUnit;

public class MapSortingPerformanceTest {
    
    private static final int[] DATA_SIZES = {1000, 10000, 100000, 1000000};
    
    public static void main(String[] args) {
        System.out.println("Map Sorting Performance Comparison");
        System.out.println("=====================================");
        
        for (int size : DATA_SIZES) {
            System.out.printf("\nTesting with %d elements:\n", size);
            Map<String, Integer> testData = generateTestData(size);
            
            runPerformanceTest("Collections.sort", testData, 
                MapSortingExample::sortByValueUsingCollections);
                
            runPerformanceTest("Stream API", testData, 
                map -> sortByValueUsingStream(map, false));
                
            runPerformanceTest("Parallel Stream", testData, 
                map -> sortByValueParallel(map, false));
        }
    }
    
    private static void runPerformanceTest(String method, Map<String, Integer> data, 
                                         SortingFunction<String, Integer> sortFunction) {
        // 預熱
        for (int i = 0; i < 3; i++) {
            sortFunction.sort(new HashMap<>(data));
        }
        
        // 正式測試
        long startTime = System.nanoTime();
        Map<String, Integer> result = sortFunction.sort(new HashMap<>(data));
        long endTime = System.nanoTime();
        
        long duration = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.printf("  %-15s: %4d ms (result size: %d)\n", 
                         method, duration, result.size());
    }
    
    private static Map<String, Integer> generateTestData(int size) {
        Map<String, Integer> map = new HashMap<>();
        Random random = new Random(42); // 固定種子確保可重現性
        
        for (int i = 0; i < size; i++) {
            String key = "key" + i;
            Integer value = random.nextInt(1000);
            map.put(key, value);
        }
        
        return map;
    }
    
    @FunctionalInterface
    interface SortingFunction<K, V> {
        Map<K, V> sort(Map<K, V> map);
    }
}
```

### 2. 效能分析結果

| 方法 | 時間複雜度 | 空間複雜度 | 適用場景 |
|------|------------|------------|----------|
| Collections.sort | O(n log n) | O(n) | 小到中型資料集，需要穩定排序 |
| Stream API | O(n log n) | O(n) | 函數式程式設計風格，程式碼簡潔 |
| Parallel Stream | O(n log n) | O(n) | 大型資料集，多核心處理器 |
| TreeMap 反轉 | O(n log n) | O(n) | Value 值唯一，需要持續有序 |

### 3. 記憶體使用分析

```java
/**
 * 記憶體使用監控工具
 */
public class MemoryAnalyzer {
    
    public static void analyzeMemoryUsage(String testName, Runnable test) {
        System.gc(); // 建議垃圾回收
        
        Runtime runtime = Runtime.getRuntime();
        long beforeMemory = runtime.totalMemory() - runtime.freeMemory();
        
        test.run();
        
        long afterMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryUsed = afterMemory - beforeMemory;
        
        System.out.printf("%s - Memory used: %.2f MB\n", 
                         testName, memoryUsed / (1024.0 * 1024.0));
    }
}
```

## 實際應用範例

### 1. 字頻統計和排序

```java
/**
 * 文本字頻統計與排序應用
 */
public class WordFrequencyAnalyzer {
    
    /**
     * 統計文本中的字頻並排序
     */
    public static Map<String, Integer> analyzeWordFrequency(String text, int topN) {
        // 文本預處理和字頻統計
        Map<String, Integer> wordCount = Arrays.stream(text.toLowerCase()
                                                          .replaceAll("[^a-zA-Z\\s]", "")
                                                          .split("\\s+"))
                                              .filter(word -> !word.isEmpty())
                                              .collect(Collectors.toMap(
                                                  word -> word,
                                                  word -> 1,
                                                  Integer::sum,
                                                  HashMap::new
                                              ));
        
        // 按頻率排序並取前 N 個
        return wordCount.entrySet()
                       .stream()
                       .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                       .limit(topN)
                       .collect(Collectors.toMap(
                           Map.Entry::getKey,
                           Map.Entry::getValue,
                           (oldValue, newValue) -> oldValue,
                           LinkedHashMap::new
                       ));
    }
    
    public static void main(String[] args) {
        String sampleText = "The quick brown fox jumps over the lazy dog. " +
                           "The dog was really lazy and the fox was very quick.";
        
        Map<String, Integer> topWords = analyzeWordFrequency(sampleText, 5);
        
        System.out.println("Top 5 most frequent words:");
        topWords.forEach((word, count) -> 
            System.out.printf("  %s: %d times\n", word, count));
    }
}
```

### 2. 使用者評分排序系統

```java
/**
 * 使用者評分排序系統
 */
public class UserRatingSystem {
    
    public static class UserRating {
        private final String userId;
        private final double averageRating;
        private final int totalReviews;
        
        public UserRating(String userId, double averageRating, int totalReviews) {
            this.userId = userId;
            this.averageRating = averageRating;
            this.totalReviews = totalReviews;
        }
        
        public double getWeightedScore() {
            // 加權評分：考慮評論數量
            return averageRating * Math.log(totalReviews + 1);
        }
        
        // getter 方法
        public String getUserId() { return userId; }
        public double getAverageRating() { return averageRating; }
        public int getTotalReviews() { return totalReviews; }
        
        @Override
        public String toString() {
            return String.format("UserRating{userId='%s', avgRating=%.2f, reviews=%d, weighted=%.2f}",
                               userId, averageRating, totalReviews, getWeightedScore());
        }
    }
    
    /**
     * 根據加權評分排序用戶
     */
    public static Map<String, UserRating> sortUsersByRating(Map<String, UserRating> users) {
        return users.entrySet()
                   .stream()
                   .sorted(Map.Entry.<String, UserRating>comparingByValue(
                       (r1, r2) -> Double.compare(r2.getWeightedScore(), r1.getWeightedScore())))
                   .collect(Collectors.toMap(
                       Map.Entry::getKey,
                       Map.Entry::getValue,
                       (oldValue, newValue) -> oldValue,
                       LinkedHashMap::new
                   ));
    }
    
    public static void main(String[] args) {
        Map<String, UserRating> users = new HashMap<>();
        users.put("user1", new UserRating("user1", 4.5, 100));
        users.put("user2", new UserRating("user2", 4.8, 50));
        users.put("user3", new UserRating("user3", 4.2, 200));
        users.put("user4", new UserRating("user4", 4.9, 25));
        
        Map<String, UserRating> sortedUsers = sortUsersByRating(users);
        
        System.out.println("Users sorted by weighted rating:");
        sortedUsers.values().forEach(System.out::println);
    }
}
```

## 最佳實踐與建議

### 1. 選擇合適的排序方法

```java
/**
 * 排序方法選擇指南
 */
public class SortingMethodSelector {
    
    /**
     * 根據資料特徵選擇最佳排序方法
     */
    public static <K, V extends Comparable<V>> Map<K, V> smartSort(
            Map<K, V> map, SortingContext context) {
        
        int size = map.size();
        
        // 小資料集：使用 Collections.sort
        if (size < 1000) {
            return sortByValueUsingCollections(map);
        }
        
        // 大資料集且有多核心：使用並行 Stream
        if (size > 100000 && context.isParallelProcessingAvailable()) {
            return sortByValueParallel(map, context.isAscending());
        }
        
        // 中等資料集：使用 Stream API
        return sortByValueUsingStream(map, context.isAscending());
    }
    
    public static class SortingContext {
        private final boolean ascending;
        private final boolean parallelProcessingAvailable;
        
        public SortingContext(boolean ascending, boolean parallelProcessingAvailable) {
            this.ascending = ascending;
            this.parallelProcessingAvailable = parallelProcessingAvailable;
        }
        
        public boolean isAscending() { return ascending; }
        public boolean isParallelProcessingAvailable() { return parallelProcessingAvailable; }
    }
}
```

### 2. 避免常見陷阱

```java
/**
 * 常見錯誤和解決方案
 */
public class CommonPitfalls {
    
    /**
     * 錯誤：使用 HashMap 儲存排序結果（會丟失順序）
     */
    public static <K, V extends Comparable<V>> Map<K, V> wrongApproach(Map<K, V> map) {
        // ❌ 錯誤：HashMap 不保證順序
        return map.entrySet()
                  .stream()
                  .sorted(Map.Entry.comparingByValue())
                  .collect(Collectors.toMap(
                      Map.Entry::getKey,
                      Map.Entry::getValue,
                      (oldValue, newValue) -> oldValue,
                      HashMap::new  // ❌ 這裡應該使用 LinkedHashMap
                  ));
    }
    
    /**
     * 正確：使用 LinkedHashMap 保持順序
     */
    public static <K, V extends Comparable<V>> Map<K, V> correctApproach(Map<K, V> map) {
        // ✅ 正確：LinkedHashMap 保持插入順序
        return map.entrySet()
                  .stream()
                  .sorted(Map.Entry.comparingByValue())
                  .collect(Collectors.toMap(
                      Map.Entry::getKey,
                      Map.Entry::getValue,
                      (oldValue, newValue) -> oldValue,
                      LinkedHashMap::new  // ✅ 正確
                  ));
    }
    
    /**
     * 處理 null 值的排序
     */
    public static <K, V extends Comparable<V>> Map<K, V> sortWithNulls(Map<K, V> map) {
        return map.entrySet()
                  .stream()
                  .sorted(Map.Entry.comparingByValue(
                      Comparator.nullsLast(Comparator.naturalOrder())))
                  .collect(Collectors.toMap(
                      Map.Entry::getKey,
                      Map.Entry::getValue,
                      (oldValue, newValue) -> oldValue,
                      LinkedHashMap::new
                  ));
    }
}
```

### 3. 執行緒安全考量

```java
/**
 * 執行緒安全的 Map 排序
 */
public class ThreadSafeSorting {
    
    /**
     * 對 ConcurrentHashMap 進行安全排序
     */
    public static <K, V extends Comparable<V>> Map<K, V> sortConcurrentMap(
            ConcurrentHashMap<K, V> concurrentMap) {
        
        // 創建快照避免併發修改
        Map<K, V> snapshot = new HashMap<>(concurrentMap);
        
        return snapshot.entrySet()
                      .stream()
                      .sorted(Map.Entry.comparingByValue())
                      .collect(Collectors.toMap(
                          Map.Entry::getKey,
                          Map.Entry::getValue,
                          (oldValue, newValue) -> oldValue,
                          LinkedHashMap::new
                      ));
    }
    
    /**
     * 返回執行緒安全的排序結果
     */
    public static <K, V extends Comparable<V>> Map<K, V> sortAndMakeThreadSafe(Map<K, V> map) {
        Map<K, V> sortedMap = sortByValueUsingStream(map, false);
        return Collections.synchronizedMap(sortedMap);
    }
}
```

## 總結

Map 按 Value 排序是 Java 開發中的常見需求，本文介紹了四種主要實作方法：

1. **Collections.sort**：傳統方法，適合小到中型資料集
2. **Stream API**：現代函數式方法，程式碼簡潔易讀
3. **Parallel Stream**：適合大型資料集的並行處理
4. **TreeMap 策略**：適合特殊場景，如 Value 唯一的情況

### 選擇建議

- **小資料集（< 1000）**：使用 Collections.sort
- **中等資料集（1000-100000）**：使用 Stream API
- **大資料集（> 100000）**：使用 Parallel Stream
- **需要持續有序**：考慮使用 TreeMap 或 LinkedHashMap
- **函數式程式設計**：優先選擇 Stream API

### 關鍵要點

1. **保持順序**：使用 LinkedHashMap 儲存排序結果
2. **效能考量**：根據資料大小選擇合適的方法
3. **執行緒安全**：併發環境下注意同步問題
4. **null 處理**：使用 Comparator.nullsLast() 處理 null 值
5. **記憶體管理**：大資料集時注意記憶體使用

通過掌握這些技術和最佳實踐，您可以在各種場景下高效地實現 Map 按 Value 排序功能。