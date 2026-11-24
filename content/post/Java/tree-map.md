---
title: "Java TreeMap 完整實作指南：紅黑樹有序映射與 NavigableMap 介面詳解"
author: Bill.Lin
date: 2021-10-31T19:16:31+08:00
draft: false
tags: ["Java", "TreeMap", "NavigableMap", "Red-Black Tree", "Data Structure", "Sorting", "SortedMap", "Binary Search Tree", "Performance", "Algorithms", "Collections", "Enterprise", "Best Practices", "Thread Safety", "Concurrency"]
description: "深入探討 Java TreeMap 的完整實作指南，包含紅黑樹內部結構、NavigableMap 介面、排序機制、效能分析與企業級應用最佳實踐"
categories: ["Java"]
aliases:
  - /post/Backend/TreeMap/
  - /post/backend/tree-map/

---

## Java TreeMap 完整實作指南

### 簡介

TreeMap 是 Java 集合框架中實現有序映射的核心類別，基於紅黑樹（Red-Black Tree）數據結構實現。它提供了 O(log n) 的時間複雜度進行搜索、插入和刪除操作，並保證鍵的有序性。本文將深入探討 TreeMap 的內部實現、各種方法使用、效能特性以及在企業級開發中的最佳實踐。

### TreeMap 架構與繼承關係

#### 類別繼承結構

```
Map<K,V>
   ↑
SortedMap<K,V> 
   ↑
NavigableMap<K,V>
   ↑
TreeMap<K,V>
```

#### 核心介面關係

```java
// 基本映射介面
public interface Map<K,V> {
    V put(K key, V value);
    V get(Object key);
    V remove(Object key);
    boolean containsKey(Object key);
    Set<K> keySet();
    Collection<V> values();
    Set<Map.Entry<K, V>> entrySet();
}

// 有序映射介面
public interface SortedMap<K,V> extends Map<K,V> {
    Comparator<? super K> comparator();
    SortedMap<K,V> subMap(K fromKey, K toKey);
    SortedMap<K,V> headMap(K toKey);
    SortedMap<K,V> tailMap(K fromKey);
    K firstKey();
    K lastKey();
}

// 可導航映射介面
public interface NavigableMap<K,V> extends SortedMap<K,V> {
    Map.Entry<K,V> lowerEntry(K key);
    K lowerKey(K key);
    Map.Entry<K,V> floorEntry(K key);
    K floorKey(K key);
    Map.Entry<K,V> ceilingEntry(K key);
    K ceilingKey(K key);
    Map.Entry<K,V> higherEntry(K key);
    K higherKey(K key);
    Map.Entry<K,V> firstEntry();
    Map.Entry<K,V> lastEntry();
    Map.Entry<K,V> pollFirstEntry();
    Map.Entry<K,V> pollLastEntry();
    NavigableMap<K,V> descendingMap();
    NavigableSet<K> navigableKeySet();
    NavigableSet<K> descendingKeySet();
}
```

### TreeMap 核心特性

#### 1. 紅黑樹實現

```java
// TreeMap 內部節點結構
static final class Entry<K,V> implements Map.Entry<K,V> {
    K key;
    V value;
    Entry<K,V> left;
    Entry<K,V> right;
    Entry<K,V> parent;
    boolean color = BLACK;
    
    Entry(K key, V value, Entry<K,V> parent) {
        this.key = key;
        this.value = value;
        this.parent = parent;
    }
}

// 紅黑樹顏色常量
private static final boolean RED = false;
private static final boolean BLACK = true;

// 根節點和大小
private transient Entry<K,V> root;
private transient int size = 0;
private transient int modCount = 0;

// 比較器
private final Comparator<? super K> comparator;
```

#### 2. 自然排序與自定義比較器

```java
// 自然排序 TreeMap
TreeMap<String, Integer> naturalOrder = new TreeMap<>();
naturalOrder.put("Charlie", 3);
naturalOrder.put("Alice", 1);
naturalOrder.put("Bob", 2);
// 結果：{Alice=1, Bob=2, Charlie=3}

// 自定義比較器
TreeMap<String, Integer> customOrder = new TreeMap<>(
    (s1, s2) -> s2.compareTo(s1) // 降序
);
customOrder.put("Charlie", 3);
customOrder.put("Alice", 1);
customOrder.put("Bob", 2);
// 結果：{Charlie=3, Bob=2, Alice=1}

// 複雜對象比較器
TreeMap<Student, String> studentMap = new TreeMap<>(
    Comparator.comparing(Student::getGrade)
        .thenComparing(Student::getName)
);
```

### SortedMap 介面詳解

#### 基本方法實現

```java
public class TreeMapSortedExample {
    
    public static void main(String[] args) {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        
        // 添加元素
        treeMap.put(5, "Five");
        treeMap.put(2, "Two");
        treeMap.put(8, "Eight");
        treeMap.put(1, "One");
        treeMap.put(9, "Nine");
        
        // 基本排序方法
        demonstrateSortedMapMethods(treeMap);
    }
    
    private static void demonstrateSortedMapMethods(TreeMap<Integer, String> map) {
        System.out.println("Original map: " + map);
        
        // 獲取比較器
        Comparator<? super Integer> comparator = map.comparator();
        System.out.println("Comparator: " + comparator); // null (natural ordering)
        
        // 第一個和最後一個鍵
        System.out.println("First key: " + map.firstKey()); // 1
        System.out.println("Last key: " + map.lastKey());   // 9
        
        // 子映射（含頭不含尾）
        SortedMap<Integer, String> subMap = map.subMap(2, 8);
        System.out.println("SubMap [2, 8): " + subMap); // {2=Two, 5=Five}
        
        // 頭部映射（不包含指定鍵）
        SortedMap<Integer, String> headMap = map.headMap(5);
        System.out.println("HeadMap (< 5): " + headMap); // {1=One, 2=Two}
        
        // 尾部映射（包含指定鍵）
        SortedMap<Integer, String> tailMap = map.tailMap(5);
        System.out.println("TailMap (>= 5): " + tailMap); // {5=Five, 8=Eight, 9=Nine}
        
        // 鍵集合、值集合、條目集合
        System.out.println("Keys: " + map.keySet());
        System.out.println("Values: " + map.values());
        System.out.println("Entries: " + map.entrySet());
    }
}
```

### NavigableMap 介面詳解

#### 導航方法實現

```java
public class TreeMapNavigableExample {
    
    public static void main(String[] args) {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        
        // 添加測試數據
        treeMap.put(1, "One");
        treeMap.put(3, "Three");
        treeMap.put(5, "Five");
        treeMap.put(7, "Seven");
        treeMap.put(9, "Nine");
        
        demonstrateNavigableMethods(treeMap);
    }
    
    private static void demonstrateNavigableMethods(TreeMap<Integer, String> map) {
        System.out.println("Original map: " + map);
        
        // Lower 方法：返回嚴格小於指定鍵的最大鍵
        Map.Entry<Integer, String> lowerEntry = map.lowerEntry(5);
        System.out.println("Lower entry (< 5): " + lowerEntry); // 3=Three
        
        Integer lowerKey = map.lowerKey(5);
        System.out.println("Lower key (< 5): " + lowerKey); // 3
        
        // Floor 方法：返回小於或等於指定鍵的最大鍵
        Map.Entry<Integer, String> floorEntry = map.floorEntry(4);
        System.out.println("Floor entry (<= 4): " + floorEntry); // 3=Three
        
        Map.Entry<Integer, String> floorEntry2 = map.floorEntry(5);
        System.out.println("Floor entry (<= 5): " + floorEntry2); // 5=Five
        
        // Ceiling 方法：返回大於或等於指定鍵的最小鍵
        Map.Entry<Integer, String> ceilingEntry = map.ceilingEntry(4);
        System.out.println("Ceiling entry (>= 4): " + ceilingEntry); // 5=Five
        
        Map.Entry<Integer, String> ceilingEntry2 = map.ceilingEntry(5);
        System.out.println("Ceiling entry (>= 5): " + ceilingEntry2); // 5=Five
        
        // Higher 方法：返回嚴格大於指定鍵的最小鍵
        Map.Entry<Integer, String> higherEntry = map.higherEntry(5);
        System.out.println("Higher entry (> 5): " + higherEntry); // 7=Seven
        
        // 首尾條目
        Map.Entry<Integer, String> firstEntry = map.firstEntry();
        Map.Entry<Integer, String> lastEntry = map.lastEntry();
        System.out.println("First entry: " + firstEntry); // 1=One
        System.out.println("Last entry: " + lastEntry);   // 9=Nine
        
        // 彈出首尾條目（會刪除元素）
        TreeMap<Integer, String> copyMap = new TreeMap<>(map);
        Map.Entry<Integer, String> pollFirst = copyMap.pollFirstEntry();
        Map.Entry<Integer, String> pollLast = copyMap.pollLastEntry();
        System.out.println("Poll first: " + pollFirst); // 1=One
        System.out.println("Poll last: " + pollLast);   // 9=Nine
        System.out.println("After polling: " + copyMap); // {3=Three, 5=Five, 7=Seven}
        
        // 降序視圖
        NavigableMap<Integer, String> descendingMap = map.descendingMap();
        System.out.println("Descending map: " + descendingMap);
        
        // 導航鍵集合
        NavigableSet<Integer> navigableKeySet = map.navigableKeySet();
        NavigableSet<Integer> descendingKeySet = map.descendingKeySet();
        System.out.println("Navigable key set: " + navigableKeySet);
        System.out.println("Descending key set: " + descendingKeySet);
        
        // 範圍視圖
        NavigableMap<Integer, String> rangeMap = map.subMap(3, true, 7, false);
        System.out.println("Range [3, 7): " + rangeMap); // {3=Three, 5=Five}
        
        NavigableMap<Integer, String> headMap = map.headMap(5, true);
        System.out.println("Head map (<= 5): " + headMap); // {1=One, 3=Three, 5=Five}
        
        NavigableMap<Integer, String> tailMap = map.tailMap(5, false);
        System.out.println("Tail map (> 5): " + tailMap); // {7=Seven, 9=Nine}
    }
}
```

### 企業級應用實例

#### 1. 時間序列數據管理

```java
public class TimeSeriesDataManager {
    
    private final TreeMap<LocalDateTime, Double> timeSeriesData;
    
    public TimeSeriesDataManager() {
        this.timeSeriesData = new TreeMap<>();
    }
    
    // 添加數據點
    public void addDataPoint(LocalDateTime timestamp, Double value) {
        timeSeriesData.put(timestamp, value);
    }
    
    // 獲取指定時間範圍的數據
    public NavigableMap<LocalDateTime, Double> getDataInRange(
            LocalDateTime startTime, LocalDateTime endTime) {
        return timeSeriesData.subMap(startTime, true, endTime, true);
    }
    
    // 獲取最新數據
    public Map.Entry<LocalDateTime, Double> getLatestData() {
        return timeSeriesData.lastEntry();
    }
    
    // 獲取指定時間之前的最新數據
    public Map.Entry<LocalDateTime, Double> getLatestDataBefore(LocalDateTime time) {
        return timeSeriesData.lowerEntry(time);
    }
    
    // 獲取指定時間之後的最早數據
    public Map.Entry<LocalDateTime, Double> getEarliestDataAfter(LocalDateTime time) {
        return timeSeriesData.higherEntry(time);
    }
    
    // 計算時間範圍內的平均值
    public double getAverageInRange(LocalDateTime startTime, LocalDateTime endTime) {
        NavigableMap<LocalDateTime, Double> rangeData = getDataInRange(startTime, endTime);
        return rangeData.values().stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }
    
    // 清理舊數據
    public void cleanupOldData(LocalDateTime cutoffTime) {
        timeSeriesData.headMap(cutoffTime, false).clear();
    }
    
    // 獲取數據統計信息
    public DataStatistics getStatistics() {
        if (timeSeriesData.isEmpty()) {
            return new DataStatistics();
        }
        
        DoubleSummaryStatistics stats = timeSeriesData.values().stream()
                .mapToDouble(Double::doubleValue)
                .summaryStatistics();
        
        return new DataStatistics(
            timeSeriesData.firstKey(),
            timeSeriesData.lastKey(),
            stats.getCount(),
            stats.getMin(),
            stats.getMax(),
            stats.getAverage()
        );
    }
    
    public static class DataStatistics {
        private final LocalDateTime earliestTime;
        private final LocalDateTime latestTime;
        private final long count;
        private final double min;
        private final double max;
        private final double average;
        
        public DataStatistics() {
            this(null, null, 0, 0, 0, 0);
        }
        
        public DataStatistics(LocalDateTime earliestTime, LocalDateTime latestTime, 
                            long count, double min, double max, double average) {
            this.earliestTime = earliestTime;
            this.latestTime = latestTime;
            this.count = count;
            this.min = min;
            this.max = max;
            this.average = average;
        }
        
        // Getters
        public LocalDateTime getEarliestTime() { return earliestTime; }
        public LocalDateTime getLatestTime() { return latestTime; }
        public long getCount() { return count; }
        public double getMin() { return min; }
        public double getMax() { return max; }
        public double getAverage() { return average; }
    }
}
```

#### 2. 範圍查詢系統

```java
public class RangeQuerySystem<T extends Comparable<T>, V> {
    
    private final TreeMap<T, V> dataMap;
    private final ReentrantReadWriteLock lock;
    private final ReadLock readLock;
    private final WriteLock writeLock;
    
    public RangeQuerySystem() {
        this.dataMap = new TreeMap<>();
        this.lock = new ReentrantReadWriteLock();
        this.readLock = lock.readLock();
        this.writeLock = lock.writeLock();
    }
    
    // 線程安全的插入操作
    public void put(T key, V value) {
        writeLock.lock();
        try {
            dataMap.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
    
    // 線程安全的獲取操作
    public V get(T key) {
        readLock.lock();
        try {
            return dataMap.get(key);
        } finally {
            readLock.unlock();
        }
    }
    
    // 範圍查詢
    public List<Map.Entry<T, V>> rangeQuery(T start, T end) {
        readLock.lock();
        try {
            return new ArrayList<>(dataMap.subMap(start, true, end, true).entrySet());
        } finally {
            readLock.unlock();
        }
    }
    
    // 前綴查詢
    public List<Map.Entry<T, V>> prefixQuery(T prefix) {
        readLock.lock();
        try {
            NavigableMap<T, V> tailMap = dataMap.tailMap(prefix, true);
            List<Map.Entry<T, V>> result = new ArrayList<>();
            
            for (Map.Entry<T, V> entry : tailMap.entrySet()) {
                if (entry.getKey().toString().startsWith(prefix.toString())) {
                    result.add(entry);
                } else {
                    break;
                }
            }
            
            return result;
        } finally {
            readLock.unlock();
        }
    }
    
    // 獲取最接近的值
    public Map.Entry<T, V> getClosest(T target) {
        readLock.lock();
        try {
            Map.Entry<T, V> floor = dataMap.floorEntry(target);
            Map.Entry<T, V> ceiling = dataMap.ceilingEntry(target);
            
            if (floor == null) return ceiling;
            if (ceiling == null) return floor;
            
            // 比較距離
            if (target.compareTo(floor.getKey()) <= ceiling.getKey().compareTo(target)) {
                return floor;
            } else {
                return ceiling;
            }
        } finally {
            readLock.unlock();
        }
    }
    
    // 批量插入
    public void putAll(Map<T, V> map) {
        writeLock.lock();
        try {
            dataMap.putAll(map);
        } finally {
            writeLock.unlock();
        }
    }
    
    // 條件刪除
    public int removeIf(Predicate<Map.Entry<T, V>> condition) {
        writeLock.lock();
        try {
            List<T> keysToRemove = dataMap.entrySet().stream()
                    .filter(condition)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
            
            keysToRemove.forEach(dataMap::remove);
            return keysToRemove.size();
        } finally {
            writeLock.unlock();
        }
    }
    
    // 獲取統計信息
    public RangeStatistics getStatistics() {
        readLock.lock();
        try {
            return new RangeStatistics(
                dataMap.size(),
                dataMap.isEmpty() ? null : dataMap.firstKey(),
                dataMap.isEmpty() ? null : dataMap.lastKey()
            );
        } finally {
            readLock.unlock();
        }
    }
    
    public static class RangeStatistics {
        private final int size;
        private final Object minKey;
        private final Object maxKey;
        
        public RangeStatistics(int size, Object minKey, Object maxKey) {
            this.size = size;
            this.minKey = minKey;
            this.maxKey = maxKey;
        }
        
        // Getters
        public int getSize() { return size; }
        public Object getMinKey() { return minKey; }
        public Object getMaxKey() { return maxKey; }
    }
}
```

#### 3. 優先級任務調度器

```java
public class PriorityTaskScheduler {
    
    private final TreeMap<Priority, Queue<Task>> taskQueues;
    private final ExecutorService executor;
    private final ScheduledExecutorService scheduler;
    private final AtomicBoolean running;
    
    public PriorityTaskScheduler(int threadPoolSize) {
        this.taskQueues = new TreeMap<>();
        this.executor = Executors.newFixedThreadPool(threadPoolSize);
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.running = new AtomicBoolean(true);
        
        // 初始化優先級隊列
        for (Priority priority : Priority.values()) {
            taskQueues.put(priority, new ConcurrentLinkedQueue<>());
        }
        
        // 啟動任務調度
        startTaskScheduling();
    }
    
    // 提交任務
    public void submitTask(Task task) {
        if (!running.get()) {
            throw new IllegalStateException("Scheduler is shutdown");
        }
        
        taskQueues.get(task.getPriority()).offer(task);
    }
    
    // 提交延遲任務
    public void submitDelayedTask(Task task, long delay, TimeUnit unit) {
        scheduler.schedule(() -> submitTask(task), delay, unit);
    }
    
    // 提交週期性任務
    public void submitPeriodicTask(Task task, long initialDelay, long period, TimeUnit unit) {
        scheduler.scheduleAtFixedRate(() -> {
            if (running.get()) {
                submitTask(task);
            }
        }, initialDelay, period, unit);
    }
    
    // 啟動任務調度
    private void startTaskScheduling() {
        scheduler.scheduleAtFixedRate(this::processNextTask, 0, 10, TimeUnit.MILLISECONDS);
    }
    
    // 處理下一個任務
    private void processNextTask() {
        if (!running.get()) {
            return;
        }
        
        // 從最高優先級開始查找任務
        NavigableMap<Priority, Queue<Task>> descendingMap = taskQueues.descendingMap();
        
        for (Map.Entry<Priority, Queue<Task>> entry : descendingMap.entrySet()) {
            Queue<Task> queue = entry.getValue();
            Task task = queue.poll();
            
            if (task != null) {
                executor.submit(new TaskRunner(task));
                return;
            }
        }
    }
    
    // 獲取隊列統計信息
    public QueueStatistics getQueueStatistics() {
        Map<Priority, Integer> queueSizes = new EnumMap<>(Priority.class);
        int totalTasks = 0;
        
        for (Map.Entry<Priority, Queue<Task>> entry : taskQueues.entrySet()) {
            int size = entry.getValue().size();
            queueSizes.put(entry.getKey(), size);
            totalTasks += size;
        }
        
        return new QueueStatistics(queueSizes, totalTasks);
    }
    
    // 清空指定優先級的任務
    public int clearTasks(Priority priority) {
        Queue<Task> queue = taskQueues.get(priority);
        int size = queue.size();
        queue.clear();
        return size;
    }
    
    // 關閉調度器
    public void shutdown() {
        running.set(false);
        executor.shutdown();
        scheduler.shutdown();
        
        try {
            if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
            if (!scheduler.awaitTermination(30, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
    
    // 優先級枚舉
    public enum Priority {
        LOW(1), NORMAL(2), HIGH(3), CRITICAL(4);
        
        private final int value;
        
        Priority(int value) {
            this.value = value;
        }
        
        public int getValue() {
            return value;
        }
    }
    
    // 任務介面
    public interface Task {
        void execute();
        Priority getPriority();
        String getName();
    }
    
    // 任務運行器
    private static class TaskRunner implements Runnable {
        private final Task task;
        
        public TaskRunner(Task task) {
            this.task = task;
        }
        
        @Override
        public void run() {
            try {
                task.execute();
            } catch (Exception e) {
                System.err.println("Task execution failed: " + task.getName());
                e.printStackTrace();
            }
        }
    }
    
    // 隊列統計信息
    public static class QueueStatistics {
        private final Map<Priority, Integer> queueSizes;
        private final int totalTasks;
        
        public QueueStatistics(Map<Priority, Integer> queueSizes, int totalTasks) {
            this.queueSizes = queueSizes;
            this.totalTasks = totalTasks;
        }
        
        public Map<Priority, Integer> getQueueSizes() { return queueSizes; }
        public int getTotalTasks() { return totalTasks; }
    }
}
```

### 效能分析與優化

#### 1. 時間複雜度分析

```java
public class TreeMapPerformanceAnalysis {
    
    public static void main(String[] args) {
        performanceComparison();
        memoryAnalysis();
        concurrencyTest();
    }
    
    // 效能比較
    private static void performanceComparison() {
        int[] sizes = {1000, 10000, 100000, 1000000};
        
        for (int size : sizes) {
            System.out.println("Size: " + size);
            
            // TreeMap 測試
            long startTime = System.nanoTime();
            TreeMap<Integer, String> treeMap = new TreeMap<>();
            for (int i = 0; i < size; i++) {
                treeMap.put(i, "value" + i);
            }
            long treeMapInsertTime = System.nanoTime() - startTime;
            
            // 搜索測試
            startTime = System.nanoTime();
            for (int i = 0; i < 1000; i++) {
                treeMap.get(i * size / 1000);
            }
            long treeMapSearchTime = System.nanoTime() - startTime;
            
            // HashMap 比較
            startTime = System.nanoTime();
            HashMap<Integer, String> hashMap = new HashMap<>();
            for (int i = 0; i < size; i++) {
                hashMap.put(i, "value" + i);
            }
            long hashMapInsertTime = System.nanoTime() - startTime;
            
            startTime = System.nanoTime();
            for (int i = 0; i < 1000; i++) {
                hashMap.get(i * size / 1000);
            }
            long hashMapSearchTime = System.nanoTime() - startTime;
            
            System.out.printf("TreeMap - Insert: %d ns, Search: %d ns\n", 
                            treeMapInsertTime, treeMapSearchTime);
            System.out.printf("HashMap - Insert: %d ns, Search: %d ns\n\n", 
                            hashMapInsertTime, hashMapSearchTime);
        }
    }
    
    // 記憶體分析
    private static void memoryAnalysis() {
        Runtime runtime = Runtime.getRuntime();
        
        runtime.gc();
        long beforeMemory = runtime.totalMemory() - runtime.freeMemory();
        
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        for (int i = 0; i < 100000; i++) {
            treeMap.put(i, "value" + i);
        }
        
        long afterMemory = runtime.totalMemory() - runtime.freeMemory();
        System.out.println("TreeMap memory usage: " + (afterMemory - beforeMemory) + " bytes");
        
        // 對比 HashMap
        runtime.gc();
        beforeMemory = runtime.totalMemory() - runtime.freeMemory();
        
        HashMap<Integer, String> hashMap = new HashMap<>();
        for (int i = 0; i < 100000; i++) {
            hashMap.put(i, "value" + i);
        }
        
        afterMemory = runtime.totalMemory() - runtime.freeMemory();
        System.out.println("HashMap memory usage: " + (afterMemory - beforeMemory) + " bytes");
    }
    
    // 並發測試
    private static void concurrencyTest() {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        ConcurrentSkipListMap<Integer, String> concurrentMap = new ConcurrentSkipListMap<>();
        
        // 填充初始數據
        for (int i = 0; i < 10000; i++) {
            treeMap.put(i, "value" + i);
            concurrentMap.put(i, "value" + i);
        }
        
        // 並發讀取測試
        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        System.out.println("Concurrent read test:");
        
        // TreeMap 同步讀取
        long startTime = System.nanoTime();
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 10000; j++) {
                        synchronized (treeMap) {
                            treeMap.get(j);
                        }
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long treeMapTime = System.nanoTime() - startTime;
        System.out.println("TreeMap (synchronized): " + treeMapTime + " ns");
        
        // ConcurrentSkipListMap 測試
        startTime = System.nanoTime();
        latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 10000; j++) {
                        concurrentMap.get(j);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long concurrentMapTime = System.nanoTime() - startTime;
        System.out.println("ConcurrentSkipListMap: " + concurrentMapTime + " ns");
        
        executor.shutdown();
    }
}
```

#### 2. 最佳化建議

```java
public class TreeMapOptimizationTips {
    
    // 1. 使用適當的比較器
    public static void comparatorOptimization() {
        // 避免在比較器中進行複雜計算
        TreeMap<String, Integer> badExample = new TreeMap<>((s1, s2) -> {
            // 壞例子：每次比較都進行昂貴的計算
            return expensiveCalculation(s1) - expensiveCalculation(s2);
        });
        
        // 好例子：預先計算或使用緩存
        Map<String, Integer> cache = new ConcurrentHashMap<>();
        TreeMap<String, Integer> goodExample = new TreeMap<>((s1, s2) -> {
            int val1 = cache.computeIfAbsent(s1, TreeMapOptimizationTips::expensiveCalculation);
            int val2 = cache.computeIfAbsent(s2, TreeMapOptimizationTips::expensiveCalculation);
            return val1 - val2;
        });
    }
    
    // 2. 批量操作優化
    public static void batchOperationOptimization() {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        
        // 批量插入比單個插入效率更高
        Map<Integer, String> batchData = new HashMap<>();
        for (int i = 0; i < 1000; i++) {
            batchData.put(i, "value" + i);
        }
        treeMap.putAll(batchData);
        
        // 使用子映射進行批量操作
        NavigableMap<Integer, String> subMap = treeMap.subMap(100, true, 200, false);
        subMap.clear(); // 比逐個刪除效率更高
    }
    
    // 3. 記憶體優化
    public static void memoryOptimization() {
        // 使用原始類型包裝器時注意自動裝箱
        TreeMap<Integer, Integer> map = new TreeMap<>();
        
        // 避免不必要的對象創建
        for (int i = 0; i < 1000; i++) {
            map.put(i, i * 2); // 會創建 Integer 對象
        }
        
        // 考慮使用專門的原始類型集合庫（如 Eclipse Collections）
        // 或者使用 TIntIntMap 等原始類型映射
    }
    
    // 4. 並發優化
    public static void concurrencyOptimization() {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        
        // 使用 ConcurrentSkipListMap 替代同步的 TreeMap
        ConcurrentSkipListMap<Integer, String> concurrentMap = new ConcurrentSkipListMap<>();
        
        // 或者使用讀寫鎖
        ReadWriteLock lock = new ReentrantReadWriteLock();
        ReadLock readLock = lock.readLock();
        WriteLock writeLock = lock.writeLock();
        
        // 讀操作
        readLock.lock();
        try {
            treeMap.get(1);
        } finally {
            readLock.unlock();
        }
        
        // 寫操作
        writeLock.lock();
        try {
            treeMap.put(1, "value");
        } finally {
            writeLock.unlock();
        }
    }
    
    private static int expensiveCalculation(String s) {
        // 模擬昂貴的計算
        return s.hashCode() * 31;
    }
}
```

### 實際應用場景

#### 1. LeetCode 問題解決

```java
public class TreeMapLeetCodeSolutions {
    
    // LeetCode 2055: 蠟燭之間的盤子
    public int[] platesBetweenCandles(String s, int[][] queries) {
        TreeMap<Integer, Integer> candlePositions = new TreeMap<>();
        
        // 記錄蠟燭位置
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == '|') {
                candlePositions.put(i, i);
            }
        }
        
        int[] result = new int[queries.length];
        
        for (int i = 0; i < queries.length; i++) {
            int left = queries[i][0];
            int right = queries[i][1];
            
            // 找到範圍內的第一個和最後一個蠟燭
            Integer firstCandle = candlePositions.ceilingKey(left);
            Integer lastCandle = candlePositions.floorKey(right);
            
            if (firstCandle != null && lastCandle != null && firstCandle <= lastCandle) {
                // 計算蠟燭之間的盤子數量
                int totalLength = lastCandle - firstCandle + 1;
                int candleCount = candlePositions.subMap(firstCandle, true, lastCandle, true).size();
                result[i] = totalLength - candleCount;
            } else {
                result[i] = 0;
            }
        }
        
        return result;
    }
    
    // LeetCode 220: 存在重複元素 III
    public boolean containsNearbyAlmostDuplicate(int[] nums, int k, int t) {
        TreeMap<Integer, Integer> window = new TreeMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int num = nums[i];
            
            // 查找是否存在差值小於等於 t 的數字
            Integer floor = window.floorKey(num);
            Integer ceiling = window.ceilingKey(num);
            
            if ((floor != null && (long) num - floor <= t) || 
                (ceiling != null && (long) ceiling - num <= t)) {
                return true;
            }
            
            // 添加當前數字到窗口
            window.put(num, window.getOrDefault(num, 0) + 1);
            
            // 維護窗口大小
            if (i >= k) {
                int oldNum = nums[i - k];
                window.put(oldNum, window.get(oldNum) - 1);
                if (window.get(oldNum) == 0) {
                    window.remove(oldNum);
                }
            }
        }
        
        return false;
    }
    
    // LeetCode 732: 我的日程安排表 III
    static class MyCalendarThree {
        private TreeMap<Integer, Integer> timeline;
        
        public MyCalendarThree() {
            timeline = new TreeMap<>();
        }
        
        public int book(int start, int end) {
            timeline.put(start, timeline.getOrDefault(start, 0) + 1);
            timeline.put(end, timeline.getOrDefault(end, 0) - 1);
            
            int activeEvents = 0;
            int maxEvents = 0;
            
            for (int count : timeline.values()) {
                activeEvents += count;
                maxEvents = Math.max(maxEvents, activeEvents);
            }
            
            return maxEvents;
        }
    }
}
```

#### 2. 分佈式系統中的應用

```java
public class DistributedSystemApplications {
    
    // 一致性哈希環
    public static class ConsistentHashRing {
        private final TreeMap<Long, String> ring;
        private final int virtualNodes;
        
        public ConsistentHashRing(int virtualNodes) {
            this.ring = new TreeMap<>();
            this.virtualNodes = virtualNodes;
        }
        
        public void addNode(String node) {
            for (int i = 0; i < virtualNodes; i++) {
                long hash = hash(node + ":" + i);
                ring.put(hash, node);
            }
        }
        
        public void removeNode(String node) {
            for (int i = 0; i < virtualNodes; i++) {
                long hash = hash(node + ":" + i);
                ring.remove(hash);
            }
        }
        
        public String getNode(String key) {
            if (ring.isEmpty()) {
                return null;
            }
            
            long hash = hash(key);
            Map.Entry<Long, String> entry = ring.ceilingEntry(hash);
            
            if (entry == null) {
                entry = ring.firstEntry();
            }
            
            return entry.getValue();
        }
        
        private long hash(String key) {
            return key.hashCode() & 0xFFFFFFFFL;
        }
    }
    
    // 負載平衡器
    public static class LoadBalancer {
        private final TreeMap<Integer, List<String>> weightedServers;
        private final AtomicInteger currentWeight;
        
        public LoadBalancer() {
            this.weightedServers = new TreeMap<>();
            this.currentWeight = new AtomicInteger(0);
        }
        
        public void addServer(String server, int weight) {
            weightedServers.computeIfAbsent(weight, k -> new ArrayList<>()).add(server);
        }
        
        public String selectServer() {
            if (weightedServers.isEmpty()) {
                return null;
            }
            
            // 加權輪詢算法
            int totalWeight = weightedServers.lastKey();
            int current = currentWeight.updateAndGet(w -> (w + 1) % totalWeight);
            
            for (Map.Entry<Integer, List<String>> entry : weightedServers.descendingMap().entrySet()) {
                if (current < entry.getKey()) {
                    List<String> servers = entry.getValue();
                    return servers.get(current % servers.size());
                }
            }
            
            return null;
        }
    }
}
```

### 最佳實踐與建議

#### 1. 選擇適當的比較策略

```java
public class TreeMapBestPractices {
    
    // 1. 自然排序 vs 自定義比較器
    public static void comparatorChoice() {
        // 對於實現 Comparable 的類型，使用自然排序
        TreeMap<String, Integer> naturalOrder = new TreeMap<>();
        
        // 對於需要自定義排序的情況，使用比較器
        TreeMap<String, Integer> customOrder = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        
        // 複雜對象的多字段排序
        TreeMap<Person, String> personMap = new TreeMap<>(
            Comparator.comparing(Person::getAge)
                .thenComparing(Person::getName)
        );
    }
    
    // 2. 空值處理
    public static void nullHandling() {
        // TreeMap 不允許 null 鍵
        TreeMap<String, Integer> map = new TreeMap<>();
        // map.put(null, 1); // 會拋出 NullPointerException
        
        // 但允許 null 值
        map.put("key", null);
        
        // 如果需要支持 null 鍵，使用自定義比較器
        TreeMap<String, Integer> nullSafeMap = new TreeMap<>((s1, s2) -> {
            if (s1 == null && s2 == null) return 0;
            if (s1 == null) return -1;
            if (s2 == null) return 1;
            return s1.compareTo(s2);
        });
    }
    
    // 3. 線程安全處理
    public static void threadSafety() {
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        
        // 方法1：使用 Collections.synchronizedMap
        Map<Integer, String> syncMap = Collections.synchronizedMap(treeMap);
        
        // 方法2：使用 ConcurrentSkipListMap
        ConcurrentSkipListMap<Integer, String> concurrentMap = new ConcurrentSkipListMap<>();
        
        // 方法3：使用讀寫鎖
        ReadWriteLock lock = new ReentrantReadWriteLock();
        // 在讀寫操作時使用相應的鎖
    }
    
    // 4. 效能考慮
    public static void performanceConsiderations() {
        // 預先指定初始容量（TreeMap 沒有初始容量概念，但可以批量插入）
        Map<Integer, String> initialData = new HashMap<>();
        for (int i = 0; i < 1000; i++) {
            initialData.put(i, "value" + i);
        }
        
        TreeMap<Integer, String> treeMap = new TreeMap<>(initialData);
        
        // 避免頻繁的範圍查詢操作
        NavigableMap<Integer, String> subMap = treeMap.subMap(100, true, 200, false);
        // 對 subMap 的操作會影響原始 map
    }
    
    static class Person {
        private String name;
        private int age;
        
        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        public String getName() { return name; }
        public int getAge() { return age; }
    }
}
```

#### 2. 常見錯誤避免

```java
public class TreeMapCommonMistakes {
    
    // 錯誤1：在迭代過程中修改 TreeMap
    public static void avoidConcurrentModification() {
        TreeMap<Integer, String> map = new TreeMap<>();
        for (int i = 0; i < 10; i++) {
            map.put(i, "value" + i);
        }
        
        // 錯誤的做法
        // for (Integer key : map.keySet()) {
        //     if (key % 2 == 0) {
        //         map.remove(key); // ConcurrentModificationException
        //     }
        // }
        
        // 正確的做法1：使用迭代器
        Iterator<Integer> iterator = map.keySet().iterator();
        while (iterator.hasNext()) {
            if (iterator.next() % 2 == 0) {
                iterator.remove();
            }
        }
        
        // 正確的做法2：收集要刪除的鍵
        List<Integer> keysToRemove = map.keySet().stream()
                .filter(key -> key % 2 == 0)
                .collect(Collectors.toList());
        keysToRemove.forEach(map::remove);
    }
    
    // 錯誤2：比較器不一致
    public static void avoidInconsistentComparator() {
        // 錯誤：比較器與 equals 不一致
        TreeMap<String, Integer> badMap = new TreeMap<>((s1, s2) -> {
            return s1.length() - s2.length(); // 只比較長度
        });
        
        badMap.put("abc", 1);
        badMap.put("def", 2); // 會覆蓋 "abc"，因為長度相同
        
        // 正確：確保比較器一致性
        TreeMap<String, Integer> goodMap = new TreeMap<>((s1, s2) -> {
            int lengthCompare = s1.length() - s2.length();
            if (lengthCompare != 0) {
                return lengthCompare;
            }
            return s1.compareTo(s2); // 長度相同時比較內容
        });
    }
    
    // 錯誤3：誤用子映射
    public static void avoidSubMapMisuse() {
        TreeMap<Integer, String> map = new TreeMap<>();
        for (int i = 0; i < 10; i++) {
            map.put(i, "value" + i);
        }
        
        // 錯誤：認為子映射是獨立的
        NavigableMap<Integer, String> subMap = map.subMap(2, true, 8, false);
        subMap.clear(); // 這會影響原始 map
        
        // 正確：如果需要獨立的副本
        NavigableMap<Integer, String> independentCopy = new TreeMap<>(subMap);
    }
}
```

### 總結

TreeMap 是 Java 集合框架中功能強大的有序映射實現，基於紅黑樹提供了 O(log n) 的高效操作。通過本文的深入分析，我們了解了：

1. **核心特性**：基於紅黑樹的有序存儲，支持自然排序和自定義比較器
2. **介面層次**：從 Map 到 SortedMap 再到 NavigableMap 的完整功能
3. **實用方法**：豐富的範圍查詢、導航操作和視圖方法
4. **企業應用**：時間序列數據、範圍查詢、任務調度等實際場景
5. **效能優化**：比較器優化、批量操作、並發處理等最佳實踐
6. **常見陷阱**：並發修改、比較器一致性、子映射使用等需要注意的問題

正確使用 TreeMap 可以在需要有序映射的場景中提供高效、可靠的解決方案，是 Java 開發者必須掌握的重要工具之一。