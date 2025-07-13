---
title: "Java Map 計算方法完整指南：高效能數據操作與最佳實踐"
author: Bill.Lin
date: 2019-03-20T20:58:17+08:00
draft: false
tags: ["Java", "Map", "HashMap", "ConcurrentHashMap", "Collections", "Performance", "Lambda", "Atomic Operations", "Thread Safety"]
Description: "深入解析 Java Map 介面的所有計算方法，包含 putIfAbsent、compute、computeIfAbsent、computeIfPresent、merge 等，並提供效能優化與執行緒安全實踐"
Categories: ["Backend"]
DisableComments: false
---

## 概述

Java 8 引入了多個強大的 Map 計算方法，這些方法提供了原子性的讀取-計算-寫入操作，不僅簡化了程式碼，也提高了執行效率和執行緒安全性。本文將深入探討這些方法的使用場景、效能特性和最佳實踐。

### 核心計算方法

- **putIfAbsent**：條件式插入，僅在 Key 不存在時插入值
- **compute**：基於 Key 和現有 Value 計算新值
- **computeIfAbsent**：Key 不存在時執行計算並插入
- **computeIfPresent**：Key 存在時執行計算並更新
- **merge**：合併現有值與新值

### 優勢與特點

1. **原子性操作**：避免 Check-Then-Act 競態條件
2. **效能優化**：減少重複的查找操作
3. **簡潔語法**：使用 Lambda 表達式簡化程式碼
4. **執行緒安全**：與 ConcurrentHashMap 結合提供執行緒安全

## 基礎使用範例

### 1. 環境設定與初始化

```java
package com.example.mapcompute;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class MapComputeExample {
    
    public static void main(String[] args) {
        // 初始化測試資料
        Map<String, Integer> map = new HashMap<>();
        map.put("apple", 5);
        map.put("banana", 10);
        map.put("cherry", 3);
        
        System.out.println("初始 Map: " + map);
        
        demonstratePutIfAbsent(new HashMap<>(map));
        demonstrateCompute(new HashMap<>(map));
        demonstrateComputeIfAbsent(new HashMap<>(map));
        demonstrateComputeIfPresent(new HashMap<>(map));
        demonstrateMerge(new HashMap<>(map));
    }
}
```

## 方法一：putIfAbsent

### 1. 基礎用法

```java
/**
 * putIfAbsent: 僅在 Key 不存在時插入值
 * 返回值：Key 存在時返回現有值，不存在時返回 null（插入後）
 */
public static void demonstratePutIfAbsent(Map<String, Integer> map) {
    System.out.println("\n=== putIfAbsent 示範 ===");
    
    // Case 1: Key 已存在 - 不插入，返回現有值
    Integer result1 = map.putIfAbsent("apple", 99);
    System.out.println("putIfAbsent('apple', 99) 返回: " + result1); // 5
    System.out.println("map 內容: " + map); // apple 仍為 5
    
    // Case 2: Key 不存在 - 插入新值，返回 null
    Integer result2 = map.putIfAbsent("orange", 8);
    System.out.println("putIfAbsent('orange', 8) 返回: " + result2); // null
    System.out.println("map 內容: " + map); // 新增了 orange=8
    
    // Case 3: Value 為 null 的情況
    map.put("grape", null);
    Integer result3 = map.putIfAbsent("grape", 15);
    System.out.println("putIfAbsent('grape', 15) 返回: " + result3); // null
    System.out.println("map 內容: " + map); // grape 被設為 15
}
```

### 2. 實際應用：快取初始化

```java
/**
 * 快取初始化模式：確保每個 Key 只初始化一次
 */
public class CacheInitializationExample {
    
    private final Map<String, ExpensiveObject> cache = new ConcurrentHashMap<>();
    
    /**
     * 使用 putIfAbsent 實現執行緒安全的快取初始化
     */
    public ExpensiveObject getOrCreateObject(String key) {
        ExpensiveObject existing = cache.get(key);
        if (existing != null) {
            return existing;
        }
        
        // 創建昂貴對象
        ExpensiveObject newObject = new ExpensiveObject(key);
        
        // 原子性插入，避免重複創建
        ExpensiveObject result = cache.putIfAbsent(key, newObject);
        return result != null ? result : newObject;
    }
    
    /**
     * 更簡潔的寫法（但可能創建多餘物件）
     */
    public ExpensiveObject getOrCreateObjectSimple(String key) {
        return cache.putIfAbsent(key, new ExpensiveObject(key));
    }
    
    public static class ExpensiveObject {
        private final String id;
        private final long creationTime;
        
        public ExpensiveObject(String id) {
            this.id = id;
            this.creationTime = System.currentTimeMillis();
            // 模擬昂貴的初始化過程
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        @Override
        public String toString() {
            return String.format("ExpensiveObject{id='%s', created=%d}", id, creationTime);
        }
    }
}
```

## 方法二：compute

### 1. 基礎用法

```java
/**
 * compute: 無條件執行計算，可處理 Key 存在或不存在的情況
 * 計算函數接收 (key, value) 參數，value 可能為 null
 */
public static void demonstrateCompute(Map<String, Integer> map) {
    System.out.println("\n=== compute 示範 ===");
    
    // Case 1: Key 存在 - 基於現有值計算
    Integer result1 = map.compute("apple", (key, value) -> value + 10);
    System.out.println("compute('apple', v -> v + 10) 返回: " + result1); // 15
    System.out.println("map 內容: " + map);
    
    // Case 2: Key 不存在 - value 為 null
    Integer result2 = map.compute("orange", (key, value) -> {
        System.out.println("計算 " + key + ", 當前值: " + value);
        return value == null ? 1 : value + 1;
    });
    System.out.println("compute('orange', ...) 返回: " + result2); // 1
    
    // Case 3: 計算結果為 null - 移除該 Key
    Integer result3 = map.compute("cherry", (key, value) -> {
        return value < 5 ? null : value; // cherry=3 < 5，返回 null
    });
    System.out.println("compute('cherry', ...) 返回: " + result3); // null
    System.out.println("map 內容: " + map); // cherry 被移除
}
```

### 2. 複雜計算範例

```java
/**
 * 複雜計算應用：統計和聚合操作
 */
public class ComputeAdvancedExample {
    
    /**
     * 實現計數器功能
     */
    public static Map<String, Integer> updateCounters(Map<String, Integer> counters, 
                                                     List<String> events) {
        for (String event : events) {
            counters.compute(event, (key, count) -> count == null ? 1 : count + 1);
        }
        return counters;
    }
    
    /**
     * 實現累加器功能
     */
    public static Map<String, Double> updateAccumulators(Map<String, Double> accumulators,
                                                        Map<String, Double> newValues) {
        for (Map.Entry<String, Double> entry : newValues.entrySet()) {
            accumulators.compute(entry.getKey(), (key, current) -> {
                double newValue = entry.getValue();
                return current == null ? newValue : current + newValue;
            });
        }
        return accumulators;
    }
    
    /**
     * 條件式更新：基於複雜邏輯的值計算
     */
    public static Map<String, String> updateStatus(Map<String, String> statusMap,
                                                  String key, String newStatus) {
        return Map.of(key, statusMap.compute(key, (k, currentStatus) -> {
            if (currentStatus == null) {
                return newStatus;
            }
            
            // 狀態轉換邏輯
            switch (currentStatus) {
                case "PENDING":
                    return List.of("PROCESSING", "CANCELLED").contains(newStatus) 
                           ? newStatus : currentStatus;
                case "PROCESSING":
                    return List.of("COMPLETED", "FAILED").contains(newStatus) 
                           ? newStatus : currentStatus;
                default:
                    return currentStatus; // 不允許從終態轉換
            }
        }));
    }
    
    public static void main(String[] args) {
        // 測試計數器
        Map<String, Integer> counters = new HashMap<>();
        List<String> events = Arrays.asList("login", "logout", "login", "error", "login");
        updateCounters(counters, events);
        System.out.println("事件計數: " + counters);
        
        // 測試累加器
        Map<String, Double> accumulators = new HashMap<>();
        Map<String, Double> newValues = Map.of("sales", 100.5, "costs", 75.2);
        updateAccumulators(accumulators, newValues);
        System.out.println("累加結果: " + accumulators);
    }
}
```

## 方法三：computeIfAbsent

### 1. 基礎用法

```java
/**
 * computeIfAbsent: 僅在 Key 不存在時執行計算
 * 是 putIfAbsent 的計算版本，支援 Lambda 表達式
 */
public static void demonstrateComputeIfAbsent(Map<String, Integer> map) {
    System.out.println("\n=== computeIfAbsent 示範 ===");
    
    // Case 1: Key 存在 - 不執行計算，返回現有值
    Integer result1 = map.computeIfAbsent("apple", key -> {
        System.out.println("為 " + key + " 執行計算"); // 不會列印
        return 999;
    });
    System.out.println("computeIfAbsent('apple', ...) 返回: " + result1); // 5
    
    // Case 2: Key 不存在 - 執行計算並插入
    Integer result2 = map.computeIfAbsent("orange", key -> {
        System.out.println("為 " + key + " 執行計算"); // 會列印
        return key.length() * 10; // 基於 key 計算值
    });
    System.out.println("computeIfAbsent('orange', ...) 返回: " + result2); // 60
    
    // Case 3: 計算結果為 null - 不插入
    Integer result3 = map.computeIfAbsent("grape", key -> null);
    System.out.println("computeIfAbsent('grape', -> null) 返回: " + result3); // null
    System.out.println("map 內容: " + map); // grape 不會被插入
}
```

### 2. 實際應用：延遲初始化集合

```java
/**
 * 延遲初始化應用：動態創建集合和複雜對象
 */
public class LazyInitializationExample {
    
    private final Map<String, List<String>> groupMap = new ConcurrentHashMap<>();
    private final Map<String, Set<Integer>> categoryMap = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> configMap = new ConcurrentHashMap<>();
    
    /**
     * 延遲初始化 List 集合
     */
    public void addToGroup(String groupName, String item) {
        groupMap.computeIfAbsent(groupName, k -> new ArrayList<>()).add(item);
    }
    
    /**
     * 延遲初始化 Set 集合
     */
    public void addToCategory(String category, Integer value) {
        categoryMap.computeIfAbsent(category, k -> new HashSet<>()).add(value);
    }
    
    /**
     * 延遲初始化巢狀 Map
     */
    public void setConfig(String module, String key, Object value) {
        configMap.computeIfAbsent(module, k -> new ConcurrentHashMap<>()).put(key, value);
    }
    
    /**
     * 複雜對象的延遲初始化
     */
    private final Map<String, DatabaseConnection> connectionPool = new ConcurrentHashMap<>();
    
    public DatabaseConnection getConnection(String database) {
        return connectionPool.computeIfAbsent(database, dbName -> {
            System.out.println("創建新的資料庫連接: " + dbName);
            return new DatabaseConnection(dbName);
        });
    }
    
    /**
     * 基於外部資源的延遲載入
     */
    private final Map<String, UserProfile> userCache = new ConcurrentHashMap<>();
    
    public UserProfile getUserProfile(String userId) {
        return userCache.computeIfAbsent(userId, id -> {
            // 模擬從資料庫載入用戶資料
            System.out.println("從資料庫載入用戶: " + id);
            return loadUserFromDatabase(id);
        });
    }
    
    // 輔助類別和方法
    public static class DatabaseConnection {
        private final String database;
        private final long createdAt;
        
        public DatabaseConnection(String database) {
            this.database = database;
            this.createdAt = System.currentTimeMillis();
        }
        
        @Override
        public String toString() {
            return String.format("Connection{db='%s', created=%d}", database, createdAt);
        }
    }
    
    public static class UserProfile {
        private final String userId;
        private final String name;
        
        public UserProfile(String userId, String name) {
            this.userId = userId;
            this.name = name;
        }
        
        @Override
        public String toString() {
            return String.format("UserProfile{id='%s', name='%s'}", userId, name);
        }
    }
    
    private UserProfile loadUserFromDatabase(String userId) {
        // 模擬資料庫查詢延遲
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return new UserProfile(userId, "User-" + userId);
    }
    
    public static void main(String[] args) {
        LazyInitializationExample example = new LazyInitializationExample();
        
        // 測試群組管理
        example.addToGroup("admins", "alice");
        example.addToGroup("admins", "bob");
        example.addToGroup("users", "charlie");
        System.out.println("群組: " + example.groupMap);
        
        // 測試連接池
        DatabaseConnection conn1 = example.getConnection("user_db");
        DatabaseConnection conn2 = example.getConnection("user_db"); // 同一個實例
        System.out.println("連接1: " + conn1);
        System.out.println("連接2: " + conn2);
        System.out.println("是否為同一個連接: " + (conn1 == conn2));
    }
}
```

## 方法四：computeIfPresent

### 1. 基礎用法

```java
/**
 * computeIfPresent: 僅在 Key 存在且值不為 null 時執行計算
 */
public static void demonstrateComputeIfPresent(Map<String, Integer> map) {
    System.out.println("\n=== computeIfPresent 示範 ===");
    
    // Case 1: Key 存在且值不為 null - 執行計算
    Integer result1 = map.computeIfPresent("apple", (key, value) -> {
        System.out.println("為 " + key + " 執行計算，當前值: " + value);
        return value * 2;
    });
    System.out.println("computeIfPresent('apple', v -> v * 2) 返回: " + result1); // 10
    
    // Case 2: Key 不存在 - 不執行計算
    Integer result2 = map.computeIfPresent("orange", (key, value) -> {
        System.out.println("這行不會執行");
        return 999;
    });
    System.out.println("computeIfPresent('orange', ...) 返回: " + result2); // null
    
    // Case 3: Key 存在但值為 null - 不執行計算
    map.put("grape", null);
    Integer result3 = map.computeIfPresent("grape", (key, value) -> {
        System.out.println("這行也不會執行");
        return 123;
    });
    System.out.println("computeIfPresent('grape', ...) 返回: " + result3); // null
    
    // Case 4: 計算結果為 null - 移除該 Key
    Integer result4 = map.computeIfPresent("banana", (key, value) -> {
        return value > 15 ? null : value + 5; // banana=10 <= 15，返回 15
    });
    System.out.println("computeIfPresent('banana', ...) 返回: " + result4); // 15
    System.out.println("map 內容: " + map);
}
```

### 2. 實際應用：條件式更新

```java
/**
 * 條件式更新應用：基於現有值的智能更新
 */
public class ConditionalUpdateExample {
    
    /**
     * 分數系統：只更新有效分數
     */
    public static Map<String, Integer> updateScores(Map<String, Integer> scores,
                                                   Map<String, Integer> scoreChanges) {
        for (Map.Entry<String, Integer> change : scoreChanges.entrySet()) {
            scores.computeIfPresent(change.getKey(), (player, currentScore) -> {
                int newScore = currentScore + change.getValue();
                // 分數不能低於 0
                return Math.max(0, newScore);
            });
        }
        return scores;
    }
    
    /**
     * 庫存管理：只減少現有庫存
     */
    public static Map<String, Integer> reduceInventory(Map<String, Integer> inventory,
                                                      Map<String, Integer> orders) {
        Map<String, Integer> processed = new HashMap<>();
        
        for (Map.Entry<String, Integer> order : orders.entrySet()) {
            Integer newStock = inventory.computeIfPresent(order.getKey(), (item, stock) -> {
                int orderQuantity = order.getValue();
                if (stock >= orderQuantity) {
                    return stock - orderQuantity;
                } else {
                    // 庫存不足，不處理訂單
                    return stock;
                }
            });
            
            if (newStock != null) {
                int originalStock = newStock + order.getValue();
                if (originalStock >= order.getValue()) {
                    processed.put(order.getKey(), order.getValue());
                }
            }
        }
        
        return processed;
    }
    
    /**
     * 過期資料清理：基於時間戳的條件更新
     */
    public static class TimestampCache {
        private final Map<String, Long> timestampMap = new ConcurrentHashMap<>();
        private final long TTL_MILLIS = 300_000; // 5 分鐘
        
        public void touch(String key) {
            timestampMap.put(key, System.currentTimeMillis());
        }
        
        public boolean isValid(String key) {
            return timestampMap.computeIfPresent(key, (k, timestamp) -> {
                long now = System.currentTimeMillis();
                if (now - timestamp > TTL_MILLIS) {
                    return null; // 過期，移除
                }
                return timestamp; // 仍有效
            }) != null;
        }
        
        public int cleanupExpired() {
            int removed = 0;
            long now = System.currentTimeMillis();
            
            Iterator<Map.Entry<String, Long>> iterator = timestampMap.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, Long> entry = iterator.next();
                if (now - entry.getValue() > TTL_MILLIS) {
                    iterator.remove();
                    removed++;
                }
            }
            
            return removed;
        }
    }
    
    public static void main(String[] args) {
        // 測試分數更新
        Map<String, Integer> scores = new HashMap<>();
        scores.put("Alice", 100);
        scores.put("Bob", 150);
        
        Map<String, Integer> changes = new HashMap<>();
        changes.put("Alice", 50);   // 有效玩家
        changes.put("Charlie", 25); // 不存在的玩家
        changes.put("Bob", -200);   // 會觸發最小值限制
        
        updateScores(scores, changes);
        System.out.println("更新後分數: " + scores);
        
        // 測試時間戳快取
        TimestampCache cache = new TimestampCache();
        cache.touch("session1");
        System.out.println("session1 是否有效: " + cache.isValid("session1"));
        
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        System.out.println("session1 是否仍有效: " + cache.isValid("session1"));
    }
}
```

## 方法五：merge

### 1. 基礎用法

```java
/**
 * merge: 合併現有值與新值
 * 如果 Key 不存在或值為 null，直接使用新值
 * 如果 Key 存在且值不為 null，使用合併函數計算結果
 */
public static void demonstrateMerge(Map<String, Integer> map) {
    System.out.println("\n=== merge 示範 ===");
    
    // Case 1: Key 存在 - 執行合併操作
    Integer result1 = map.merge("apple", 20, (oldValue, newValue) -> {
        System.out.println("合併 apple: " + oldValue + " + " + newValue);
        return oldValue + newValue;
    });
    System.out.println("merge('apple', 20, sum) 返回: " + result1); // 25
    
    // Case 2: Key 不存在 - 直接使用新值
    Integer result2 = map.merge("orange", 15, (oldValue, newValue) -> {
        System.out.println("這行不會執行，因為 orange 不存在");
        return oldValue + newValue;
    });
    System.out.println("merge('orange', 15, sum) 返回: " + result2); // 15
    
    // Case 3: 合併結果為 null - 移除該 Key
    Integer result3 = map.merge("banana", 5, (oldValue, newValue) -> {
        return oldValue == newValue ? null : oldValue + newValue;
    });
    System.out.println("merge('banana', 5, ...) 返回: " + result3); // null（banana=10 != 5）
    System.out.println("map 內容: " + map);
    
    // Case 4: 值為 null 的情況
    map.put("grape", null);
    Integer result4 = map.merge("grape", 30, Integer::sum);
    System.out.println("merge('grape', 30, sum) 返回: " + result4); // 30
}
```

### 2. 高級合併應用

```java
/**
 * 高級合併應用：資料聚合和統計分析
 */
public class AdvancedMergeExample {
    
    /**
     * 統計資料合併：累加計數器
     */
    public static Map<String, Integer> mergeCounters(List<Map<String, Integer>> counterMaps) {
        Map<String, Integer> result = new HashMap<>();
        
        for (Map<String, Integer> counterMap : counterMaps) {
            for (Map.Entry<String, Integer> entry : counterMap.entrySet()) {
                result.merge(entry.getKey(), entry.getValue(), Integer::sum);
            }
        }
        
        return result;
    }
    
    /**
     * 字串合併：拼接文字
     */
    public static Map<String, String> mergeMessages(Map<String, String> base,
                                                   Map<String, String> additional) {
        Map<String, String> result = new HashMap<>(base);
        
        for (Map.Entry<String, String> entry : additional.entrySet()) {
            result.merge(entry.getKey(), entry.getValue(), (old, new_) -> old + "; " + new_);
        }
        
        return result;
    }
    
    /**
     * 複雜對象合併：銷售資料聚合
     */
    public static class SalesData {
        private double revenue;
        private int quantity;
        
        public SalesData(double revenue, int quantity) {
            this.revenue = revenue;
            this.quantity = quantity;
        }
        
        public SalesData merge(SalesData other) {
            return new SalesData(this.revenue + other.revenue, this.quantity + other.quantity);
        }
        
        public double getAveragePrice() {
            return quantity > 0 ? revenue / quantity : 0;
        }
        
        @Override
        public String toString() {
            return String.format("SalesData{revenue=%.2f, quantity=%d, avgPrice=%.2f}",
                               revenue, quantity, getAveragePrice());
        }
        
        // getter 和 setter
        public double getRevenue() { return revenue; }
        public int getQuantity() { return quantity; }
    }
    
    public static Map<String, SalesData> mergeSalesData(List<Map<String, SalesData>> salesMaps) {
        Map<String, SalesData> result = new HashMap<>();
        
        for (Map<String, SalesData> salesMap : salesMaps) {
            for (Map.Entry<String, SalesData> entry : salesMap.entrySet()) {
                result.merge(entry.getKey(), entry.getValue(), SalesData::merge);
            }
        }
        
        return result;
    }
    
    /**
     * 集合合併：Set 和 List 的合併操作
     */
    public static Map<String, Set<String>> mergeSets(Map<String, Set<String>> map1,
                                                    Map<String, Set<String>> map2) {
        Map<String, Set<String>> result = new HashMap<>();
        
        // 複製第一個 map
        for (Map.Entry<String, Set<String>> entry : map1.entrySet()) {
            result.put(entry.getKey(), new HashSet<>(entry.getValue()));
        }
        
        // 合併第二個 map
        for (Map.Entry<String, Set<String>> entry : map2.entrySet()) {
            result.merge(entry.getKey(), entry.getValue(), (set1, set2) -> {
                Set<String> merged = new HashSet<>(set1);
                merged.addAll(set2);
                return merged;
            });
        }
        
        return result;
    }
    
    public static void main(String[] args) {
        // 測試計數器合併
        List<Map<String, Integer>> counters = Arrays.asList(
            Map.of("A", 10, "B", 20),
            Map.of("A", 5, "C", 15),
            Map.of("B", 8, "C", 12)
        );
        
        Map<String, Integer> mergedCounters = mergeCounters(counters);
        System.out.println("合併後計數器: " + mergedCounters);
        
        // 測試銷售資料合併
        List<Map<String, SalesData>> salesList = Arrays.asList(
            Map.of("Product1", new SalesData(1000.0, 10)),
            Map.of("Product1", new SalesData(500.0, 5), "Product2", new SalesData(800.0, 8))
        );
        
        Map<String, SalesData> mergedSales = mergeSalesData(salesList);
        System.out.println("合併後銷售資料:");
        mergedSales.forEach((product, data) -> 
            System.out.println("  " + product + ": " + data));
    }
}
```

## 執行緒安全與 ConcurrentHashMap

### 1. 原子操作的重要性

```java
/**
 * 執行緒安全的計算操作
 */
public class ThreadSafeComputeExample {
    
    private final ConcurrentHashMap<String, Integer> concurrentCounters = new ConcurrentHashMap<>();
    private final Map<String, Integer> unsafeCounters = new HashMap<>();
    
    /**
     * 執行緒安全的計數器增量
     */
    public void incrementCounterSafe(String key) {
        concurrentCounters.compute(key, (k, v) -> v == null ? 1 : v + 1);
    }
    
    /**
     * 非執行緒安全的計數器增量（可能導致資料競爭）
     */
    public synchronized void incrementCounterUnsafe(String key) {
        Integer current = unsafeCounters.get(key);
        unsafeCounters.put(key, current == null ? 1 : current + 1);
    }
    
    /**
     * 並發測試
     */
    public static void testConcurrency() throws InterruptedException {
        ThreadSafeComputeExample example = new ThreadSafeComputeExample();
        int threadCount = 10;
        int incrementsPerThread = 1000;
        String testKey = "counter";
        
        // 測試執行緒安全版本
        Thread[] safeThreads = new Thread[threadCount];
        for (int i = 0; i < threadCount; i++) {
            safeThreads[i] = new Thread(() -> {
                for (int j = 0; j < incrementsPerThread; j++) {
                    example.incrementCounterSafe(testKey);
                }
            });
        }
        
        long startTime = System.currentTimeMillis();
        for (Thread thread : safeThreads) {
            thread.start();
        }
        for (Thread thread : safeThreads) {
            thread.join();
        }
        long safeTime = System.currentTimeMillis() - startTime;
        
        Integer safeResult = example.concurrentCounters.get(testKey);
        System.out.printf("執行緒安全版本: 期望=%d, 實際=%d, 耗時=%dms\n",
                         threadCount * incrementsPerThread, safeResult, safeTime);
        
        // 測試非執行緒安全版本
        Thread[] unsafeThreads = new Thread[threadCount];
        for (int i = 0; i < threadCount; i++) {
            unsafeThreads[i] = new Thread(() -> {
                for (int j = 0; j < incrementsPerThread; j++) {
                    example.incrementCounterUnsafe(testKey);
                }
            });
        }
        
        startTime = System.currentTimeMillis();
        for (Thread thread : unsafeThreads) {
            thread.start();
        }
        for (Thread thread : unsafeThreads) {
            thread.join();
        }
        long unsafeTime = System.currentTimeMillis() - startTime;
        
        Integer unsafeResult = example.unsafeCounters.get(testKey);
        System.out.printf("非執行緒安全版本: 期望=%d, 實際=%d, 耗時=%dms\n",
                         threadCount * incrementsPerThread, unsafeResult, unsafeTime);
    }
    
    public static void main(String[] args) throws InterruptedException {
        testConcurrency();
    }
}
```

### 2. 高效能並發應用

```java
/**
 * 高效能並發統計系統
 */
public class HighPerformanceStats {
    
    private final ConcurrentHashMap<String, Long> metrics = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Double> averages = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
    
    /**
     * 記錄指標值並更新平均值
     */
    public void recordMetric(String metricName, double value) {
        // 原子性更新計數
        counts.compute(metricName, (k, v) -> v == null ? 1 : v + 1);
        
        // 原子性更新平均值
        averages.compute(metricName, (k, currentAvg) -> {
            if (currentAvg == null) {
                return value;
            }
            int count = counts.get(metricName);
            return ((currentAvg * (count - 1)) + value) / count;
        });
    }
    
    /**
     * 批量更新指標
     */
    public void recordBatch(Map<String, Double> batchMetrics) {
        batchMetrics.forEach(this::recordMetric);
    }
    
    /**
     * 獲取統計摘要
     */
    public Map<String, String> getStatsSummary() {
        Map<String, String> summary = new HashMap<>();
        
        averages.forEach((metric, avg) -> {
            int count = counts.getOrDefault(metric, 0);
            summary.put(metric, String.format("avg=%.2f, count=%d", avg, count));
        });
        
        return summary;
    }
    
    /**
     * 重置特定指標
     */
    public void resetMetric(String metricName) {
        averages.remove(metricName);
        counts.remove(metricName);
    }
    
    /**
     * 條件式重置：僅重置低活躍度指標
     */
    public int cleanupLowActivityMetrics(int minCount) {
        int removed = 0;
        
        for (String metric : new HashSet<>(counts.keySet())) {
            Integer count = counts.computeIfPresent(metric, (k, v) -> v >= minCount ? v : null);
            if (count == null) {
                averages.remove(metric);
                removed++;
            }
        }
        
        return removed;
    }
}
```

## 效能分析與優化

### 1. 效能比較測試

```java
/**
 * Map 計算方法的效能比較
 */
public class PerformanceComparison {
    
    private static final int OPERATIONS = 1_000_000;
    private static final String[] KEYS = IntStream.range(0, 1000)
                                                  .mapToObj(i -> "key" + i)
                                                  .toArray(String[]::new);
    
    /**
     * 傳統方式：檢查-計算-更新
     */
    public static long testTraditionalApproach() {
        Map<String, Integer> map = new HashMap<>();
        Random random = new Random(42);
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < OPERATIONS; i++) {
            String key = KEYS[random.nextInt(KEYS.length)];
            Integer current = map.get(key);
            if (current == null) {
                map.put(key, 1);
            } else {
                map.put(key, current + 1);
            }
        }
        
        return System.nanoTime() - startTime;
    }
    
    /**
     * 使用 compute 方法
     */
    public static long testComputeApproach() {
        Map<String, Integer> map = new HashMap<>();
        Random random = new Random(42);
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < OPERATIONS; i++) {
            String key = KEYS[random.nextInt(KEYS.length)];
            map.compute(key, (k, v) -> v == null ? 1 : v + 1);
        }
        
        return System.nanoTime() - startTime;
    }
    
    /**
     * 使用 merge 方法
     */
    public static long testMergeApproach() {
        Map<String, Integer> map = new HashMap<>();
        Random random = new Random(42);
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < OPERATIONS; i++) {
            String key = KEYS[random.nextInt(KEYS.length)];
            map.merge(key, 1, Integer::sum);
        }
        
        return System.nanoTime() - startTime;
    }
    
    /**
     * 使用 computeIfAbsent + computeIfPresent 組合
     */
    public static long testComputeIfApproach() {
        Map<String, Integer> map = new HashMap<>();
        Random random = new Random(42);
        
        long startTime = System.nanoTime();
        
        for (int i = 0; i < OPERATIONS; i++) {
            String key = KEYS[random.nextInt(KEYS.length)];
            if (map.computeIfAbsent(key, k -> 0) != null) {
                map.computeIfPresent(key, (k, v) -> v + 1);
            }
        }
        
        return System.nanoTime() - startTime;
    }
    
    public static void main(String[] args) {
        System.out.println("Map 計算方法效能比較 (" + OPERATIONS + " 操作)");
        System.out.println("================================================");
        
        // 預熱 JVM
        for (int i = 0; i < 5; i++) {
            testTraditionalApproach();
            testComputeApproach();
            testMergeApproach();
            testComputeIfApproach();
        }
        
        // 正式測試
        long traditional = testTraditionalApproach();
        long compute = testComputeApproach();
        long merge = testMergeApproach();
        long computeIf = testComputeIfApproach();
        
        System.out.printf("傳統方式:         %8.2f ms\n", traditional / 1_000_000.0);
        System.out.printf("compute 方法:     %8.2f ms\n", compute / 1_000_000.0);
        System.out.printf("merge 方法:       %8.2f ms\n", merge / 1_000_000.0);
        System.out.printf("computeIf 組合:   %8.2f ms\n", computeIf / 1_000_000.0);
        
        System.out.println("\n相對效能 (以傳統方式為基準):");
        System.out.printf("compute 方法:     %.2fx\n", (double) traditional / compute);
        System.out.printf("merge 方法:       %.2fx\n", (double) traditional / merge);
        System.out.printf("computeIf 組合:   %.2fx\n", (double) traditional / computeIf);
    }
}
```

### 2. 記憶體使用分析

```java
/**
 * 記憶體使用分析工具
 */
public class MemoryAnalysis {
    
    /**
     * 分析不同實作方式的記憶體使用
     */
    public static void analyzeMemoryUsage() {
        Runtime runtime = Runtime.getRuntime();
        
        // 測試資料大小
        int dataSize = 100_000;
        
        System.out.println("記憶體使用分析 (資料大小: " + dataSize + ")");
        System.out.println("=========================================");
        
        // 測試 HashMap + compute
        System.gc();
        long beforeHashMap = runtime.totalMemory() - runtime.freeMemory();
        
        Map<String, Integer> hashMap = new HashMap<>();
        for (int i = 0; i < dataSize; i++) {
            hashMap.compute("key" + (i % 1000), (k, v) -> v == null ? 1 : v + 1);
        }
        
        long afterHashMap = runtime.totalMemory() - runtime.freeMemory();
        long hashMapMemory = afterHashMap - beforeHashMap;
        
        // 測試 ConcurrentHashMap + compute
        System.gc();
        long beforeConcurrent = runtime.totalMemory() - runtime.freeMemory();
        
        ConcurrentHashMap<String, Integer> concurrentMap = new ConcurrentHashMap<>();
        for (int i = 0; i < dataSize; i++) {
            concurrentMap.compute("key" + (i % 1000), (k, v) -> v == null ? 1 : v + 1);
        }
        
        long afterConcurrent = runtime.totalMemory() - runtime.freeMemory();
        long concurrentMemory = afterConcurrent - beforeConcurrent;
        
        System.out.printf("HashMap 記憶體使用:           %.2f MB\n", hashMapMemory / (1024.0 * 1024.0));
        System.out.printf("ConcurrentHashMap 記憶體使用: %.2f MB\n", concurrentMemory / (1024.0 * 1024.0));
        System.out.printf("記憶體使用比例:               %.2fx\n", (double) concurrentMemory / hashMapMemory);
        
        // 保持引用避免被垃圾回收
        System.out.println("HashMap 大小: " + hashMap.size());
        System.out.println("ConcurrentHashMap 大小: " + concurrentMap.size());
    }
    
    public static void main(String[] args) {
        analyzeMemoryUsage();
    }
}
```

## 實際應用案例

### 1. 網站訪問統計系統

```java
/**
 * 網站訪問統計系統
 */
public class WebTrafficAnalyzer {
    
    private final ConcurrentHashMap<String, Long> pageViews = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> uniqueVisitors = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> totalBandwidth = new ConcurrentHashMap<>();
    
    /**
     * 記錄頁面訪問
     */
    public void recordPageView(String page, String visitorId, long bandwidthBytes) {
        // 增加頁面瀏覽量
        pageViews.merge(page, 1L, Long::sum);
        
        // 記錄唯一訪客
        uniqueVisitors.computeIfAbsent(page, k -> ConcurrentHashMap.newKeySet()).add(visitorId);
        
        // 累加頻寬使用
        totalBandwidth.merge(page, bandwidthBytes, Long::sum);
    }
    
    /**
     * 獲取頁面統計報告
     */
    public Map<String, PageStats> getPageStats() {
        Map<String, PageStats> stats = new HashMap<>();
        
        for (String page : pageViews.keySet()) {
            long views = pageViews.getOrDefault(page, 0L);
            int uniqueCount = uniqueVisitors.getOrDefault(page, Collections.emptySet()).size();
            long bandwidth = totalBandwidth.getOrDefault(page, 0L);
            
            stats.put(page, new PageStats(views, uniqueCount, bandwidth));
        }
        
        return stats;
    }
    
    /**
     * 清理低活躍度頁面數據
     */
    public int cleanupLowActivityPages(long minViews) {
        int removed = 0;
        
        Iterator<Map.Entry<String, Long>> iterator = pageViews.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Long> entry = iterator.next();
            if (entry.getValue() < minViews) {
                String page = entry.getKey();
                iterator.remove();
                uniqueVisitors.remove(page);
                totalBandwidth.remove(page);
                removed++;
            }
        }
        
        return removed;
    }
    
    public static class PageStats {
        private final long pageViews;
        private final int uniqueVisitors;
        private final long totalBandwidth;
        
        public PageStats(long pageViews, int uniqueVisitors, long totalBandwidth) {
            this.pageViews = pageViews;
            this.uniqueVisitors = uniqueVisitors;
            this.totalBandwidth = totalBandwidth;
        }
        
        public double getAverageBandwidthPerView() {
            return pageViews > 0 ? (double) totalBandwidth / pageViews : 0;
        }
        
        @Override
        public String toString() {
            return String.format("PageStats{views=%d, unique=%d, bandwidth=%d bytes, avg=%.2f bytes/view}",
                               pageViews, uniqueVisitors, totalBandwidth, getAverageBandwidthPerView());
        }
        
        // getter 方法
        public long getPageViews() { return pageViews; }
        public int getUniqueVisitors() { return uniqueVisitors; }
        public long getTotalBandwidth() { return totalBandwidth; }
    }
}
```

### 2. 分散式快取管理

```java
/**
 * 分散式快取管理系統
 */
public class DistributedCacheManager {
    
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final long defaultTTL = 300_000; // 5 分鐘預設 TTL
    
    /**
     * 放入快取項目
     */
    public void put(String key, Object value, long ttlMillis) {
        long expireTime = System.currentTimeMillis() + ttlMillis;
        cache.put(key, new CacheEntry(value, expireTime));
    }
    
    public void put(String key, Object value) {
        put(key, value, defaultTTL);
    }
    
    /**
     * 獲取快取項目（自動清理過期項目）
     */
    public Object get(String key) {
        return cache.computeIfPresent(key, (k, entry) -> {
            if (entry.isExpired()) {
                return null; // 過期，移除
            }
            entry.updateAccessTime();
            return entry;
        })?.getValue();
    }
    
    /**
     * 條件式更新：僅在值存在且未過期時更新
     */
    public boolean updateIfPresent(String key, Function<Object, Object> updater) {
        CacheEntry updated = cache.computeIfPresent(key, (k, entry) -> {
            if (entry.isExpired()) {
                return null; // 過期，移除
            }
            Object newValue = updater.apply(entry.getValue());
            return new CacheEntry(newValue, entry.getExpireTime());
        });
        
        return updated != null;
    }
    
    /**
     * 獲取或計算值（延遲載入模式）
     */
    public Object getOrCompute(String key, Function<String, Object> valueComputer, long ttlMillis) {
        return cache.compute(key, (k, entry) -> {
            if (entry != null && !entry.isExpired()) {
                entry.updateAccessTime();
                return entry;
            }
            
            // 快取未命中或已過期，重新計算
            Object newValue = valueComputer.apply(key);
            long expireTime = System.currentTimeMillis() + ttlMillis;
            return new CacheEntry(newValue, expireTime);
        }).getValue();
    }
    
    /**
     * 批量清理過期項目
     */
    public int cleanupExpired() {
        int removed = 0;
        long now = System.currentTimeMillis();
        
        Iterator<Map.Entry<String, CacheEntry>> iterator = cache.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, CacheEntry> entry = iterator.next();
            if (entry.getValue().getExpireTime() <= now) {
                iterator.remove();
                removed++;
            }
        }
        
        return removed;
    }
    
    /**
     * 獲取快取統計資訊
     */
    public CacheStats getStats() {
        long now = System.currentTimeMillis();
        int totalEntries = cache.size();
        int expiredEntries = 0;
        long totalSize = 0;
        
        for (CacheEntry entry : cache.values()) {
            if (entry.getExpireTime() <= now) {
                expiredEntries++;
            }
            totalSize += entry.getEstimatedSize();
        }
        
        return new CacheStats(totalEntries, expiredEntries, totalSize);
    }
    
    /**
     * 快取項目類別
     */
    public static class CacheEntry {
        private final Object value;
        private final long expireTime;
        private volatile long lastAccessTime;
        
        public CacheEntry(Object value, long expireTime) {
            this.value = value;
            this.expireTime = expireTime;
            this.lastAccessTime = System.currentTimeMillis();
        }
        
        public boolean isExpired() {
            return System.currentTimeMillis() > expireTime;
        }
        
        public void updateAccessTime() {
            this.lastAccessTime = System.currentTimeMillis();
        }
        
        public long getEstimatedSize() {
            // 簡單的大小估算
            if (value instanceof String) {
                return ((String) value).length() * 2L; // Unicode 字元
            } else if (value instanceof byte[]) {
                return ((byte[]) value).length;
            } else {
                return 100L; // 預設估算
            }
        }
        
        // getter 方法
        public Object getValue() { return value; }
        public long getExpireTime() { return expireTime; }
        public long getLastAccessTime() { return lastAccessTime; }
    }
    
    /**
     * 快取統計資訊
     */
    public static class CacheStats {
        private final int totalEntries;
        private final int expiredEntries;
        private final long totalSize;
        
        public CacheStats(int totalEntries, int expiredEntries, long totalSize) {
            this.totalEntries = totalEntries;
            this.expiredEntries = expiredEntries;
            this.totalSize = totalSize;
        }
        
        public int getActiveEntries() {
            return totalEntries - expiredEntries;
        }
        
        public double getHitRatio() {
            return totalEntries > 0 ? (double) getActiveEntries() / totalEntries : 0;
        }
        
        @Override
        public String toString() {
            return String.format("CacheStats{total=%d, active=%d, expired=%d, size=%d bytes, hitRatio=%.2f%%}",
                               totalEntries, getActiveEntries(), expiredEntries, totalSize, getHitRatio() * 100);
        }
        
        // getter 方法
        public int getTotalEntries() { return totalEntries; }
        public int getExpiredEntries() { return expiredEntries; }
        public long getTotalSize() { return totalSize; }
    }
}
```

## 最佳實踐與建議

### 1. 方法選擇指南

```java
/**
 * Map 計算方法選擇指南
 */
public class MethodSelectionGuide {
    
    /**
     * 基於使用場景選擇最適合的方法
     */
    public static void demonstrateMethodSelection() {
        System.out.println("Map 計算方法選擇指南");
        System.out.println("==================");
        
        // 場景 1: 簡單的 Key 存在性檢查與插入
        System.out.println("場景 1: 初始化集合元素");
        System.out.println("推薦: putIfAbsent 或 computeIfAbsent");
        Map<String, List<String>> groups = new ConcurrentHashMap<>();
        
        // 使用 computeIfAbsent（推薦）
        groups.computeIfAbsent("admins", k -> new ArrayList<>()).add("alice");
        
        // 場景 2: 累加計數器
        System.out.println("場景 2: 計數器累加");
        System.out.println("推薦: merge 或 compute");
        Map<String, Integer> counters = new ConcurrentHashMap<>();
        
        // 使用 merge（推薦）
        counters.merge("clicks", 1, Integer::sum);
        
        // 場景 3: 條件式更新現有值
        System.out.println("場景 3: 條件式更新");
        System.out.println("推薦: computeIfPresent");
        Map<String, Integer> scores = new ConcurrentHashMap<>();
        scores.put("player1", 100);
        
        // 使用 computeIfPresent（推薦）
        scores.computeIfPresent("player1", (k, v) -> v > 50 ? v + 10 : v);
        
        // 場景 4: 複雜的計算邏輯
        System.out.println("場景 4: 複雜計算");
        System.out.println("推薦: compute");
        Map<String, String> stateMachine = new ConcurrentHashMap<>();
        
        // 使用 compute（推薦）
        stateMachine.compute("task1", (k, currentState) -> {
            if (currentState == null) return "CREATED";
            switch (currentState) {
                case "CREATED": return "PROCESSING";
                case "PROCESSING": return "COMPLETED";
                default: return currentState;
            }
        });
        
        System.out.println("結果展示:");
        System.out.println("群組: " + groups);
        System.out.println("計數器: " + counters);
        System.out.println("分數: " + scores);
        System.out.println("狀態: " + stateMachine);
    }
}
```

### 2. 常見陷阱與解決方案

```java
/**
 * 常見陷阱與解決方案
 */
public class CommonPitfalls {
    
    /**
     * 陷阱 1: 在計算函數中執行耗時操作
     */
    public static void demonstrateExpensiveOperationPitfall() {
        System.out.println("陷阱 1: 計算函數中的耗時操作");
        
        ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
        
        // ❌ 錯誤做法：在計算函數中執行耗時操作
        String badResult = cache.computeIfAbsent("user123", key -> {
            try {
                Thread.sleep(1000); // 模擬耗時的資料庫查詢
                return "User data for " + key;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        });
        
        // ✅ 正確做法：預先計算或使用異步載入
        CompletableFuture<String> futureResult = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(1000); // 模擬耗時操作
                return "User data for user456";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        });
        
        // 只在快取中存儲已計算的結果
        try {
            String goodResult = cache.putIfAbsent("user456", futureResult.get());
            System.out.println("預計算結果: " + goodResult);
        } catch (Exception e) {
            System.err.println("計算失敗: " + e.getMessage());
        }
    }
    
    /**
     * 陷阱 2: 在計算函數中修改 Map 本身
     */
    public static void demonstrateRecursiveModificationPitfall() {
        System.out.println("陷阱 2: 遞迴修改陷阱");
        
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        map.put("a", 1);
        
        try {
            // ❌ 錯誤做法：在計算函數中修改同一個 Map
            map.compute("a", (key, value) -> {
                map.put("b", 2); // 這可能導致死鎖或異常
                return value + 1;
            });
        } catch (Exception e) {
            System.err.println("遞迴修改錯誤: " + e.getMessage());
        }
        
        // ✅ 正確做法：分離計算和修改操作
        Integer currentValue = map.get("a");
        if (currentValue != null) {
            map.put("a", currentValue + 1);
            map.put("b", 2);
        }
        
        System.out.println("安全修改後的 Map: " + map);
    }
    
    /**
     * 陷阱 3: 計算函數拋出異常
     */
    public static void demonstrateExceptionHandlingPitfall() {
        System.out.println("陷阱 3: 異常處理陷阱");
        
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        
        // ❌ 可能有問題：未處理計算函數中的異常
        try {
            map.compute("risky", (key, value) -> {
                if (Math.random() > 0.5) {
                    throw new RuntimeException("隨機失敗");
                }
                return value == null ? 1 : value + 1;
            });
        } catch (RuntimeException e) {
            System.err.println("計算失敗: " + e.getMessage());
        }
        
        // ✅ 正確做法：在計算函數內部處理異常
        map.compute("safe", (key, value) -> {
            try {
                // 可能拋出異常的操作
                if (Math.random() > 0.5) {
                    throw new RuntimeException("隨機失敗");
                }
                return value == null ? 1 : value + 1;
            } catch (Exception e) {
                System.err.println("內部處理異常: " + e.getMessage());
                return value; // 返回原值或預設值
            }
        });
        
        System.out.println("異常處理後的 Map: " + map);
    }
    
    /**
     * 陷阱 4: null 值處理不當
     */
    public static void demonstrateNullHandlingPitfall() {
        System.out.println("陷阱 4: null 值處理陷阱");
        
        ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
        map.put("key1", "value1");
        map.put("key2", null); // ConcurrentHashMap 不允許 null 值，這會拋出異常
        
        // ✅ 正確做法：避免 null 值
        map.compute("key3", (key, value) -> {
            if (value == null) {
                return "default_value";
            }
            return value.toUpperCase();
        });
        
        // 使用 Optional 處理可能的 null 值
        String result = Optional.ofNullable(map.get("key3"))
                               .map(String::toUpperCase)
                               .orElse("DEFAULT");
        
        System.out.println("安全處理 null 後的結果: " + result);
    }
    
    public static void main(String[] args) {
        demonstrateExpensiveOperationPitfall();
        demonstrateRecursiveModificationPitfall();
        demonstrateExceptionHandlingPitfall();
        // demonstrateNullHandlingPitfall(); // 會拋出異常
    }
}
```

## 總結

Java Map 的計算方法為開發者提供了強大的工具來進行高效的資料操作：

### 方法特性總結

| 方法 | 適用場景 | 執行條件 | 返回值 |
|------|----------|----------|--------|
| putIfAbsent | 條件式插入 | Key 不存在 | 現有值或 null |
| compute | 無條件計算 | 總是執行 | 計算結果 |
| computeIfAbsent | 延遲初始化 | Key 不存在或值為 null | 計算結果或現有值 |
| computeIfPresent | 條件式更新 | Key 存在且值不為 null | 計算結果或 null |
| merge | 值合併 | 總是執行合併邏輯 | 合併結果 |

### 最佳實踐要點

1. **選擇合適的方法**：根據具體需求選擇最合適的計算方法
2. **避免耗時操作**：在計算函數中避免執行耗時的 I/O 或網路操作
3. **異常處理**：妥善處理計算函數中可能出現的異常
4. **執行緒安全**：配合 ConcurrentHashMap 實現高效的併發操作
5. **效能考量**：合理使用這些方法可以顯著提升效能

### 關鍵優勢

- **原子性**：避免 Check-Then-Act 競態條件
- **效能提升**：減少重複的 Map 查找操作
- **程式碼簡潔**：使用 Lambda 表達式簡化邏輯
- **執行緒安全**：與併發集合完美配合

通過掌握這些 Map 計算方法，您可以寫出更高效、更安全、更簡潔的 Java 程式碼。