---
title: "Java TreeSet 完整實作指南：紅黑樹有序集合與 NavigableSet 介面詳解"
author: Bill.Lin
date: 2022-10-02T00:48:01+08:00
draft: false
tags: ["Java", "TreeSet", "Data Structure", "Red-Black Tree", "Collections", "Sorting", "NavigableSet", "SortedSet", "Binary Search Tree", "Performance", "Algorithms", "Enterprise", "Best Practices", "Thread Safety", "Concurrency"]
Description: "深入探討 Java TreeSet 的完整實作指南，包含紅黑樹內部結構、NavigableSet 介面、排序機制、效能分析與企業級應用最佳實踐"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/TreeSet/

---

## Java TreeSet 完整實作指南

### 簡介

TreeSet 是 Java 集合框架中實現有序集合的核心類別，基於 TreeMap 實現並使用紅黑樹（Red-Black Tree）數據結構。它保證元素的唯一性和有序性，提供了 O(log n) 的時間複雜度進行搜索、插入和刪除操作。本文將深入探討 TreeSet 的內部實現、各種方法使用、效能特性以及在企業級開發中的最佳實踐。

### TreeSet 架構與繼承關係

#### 類別繼承結構

```
Collection<E>
   ↑
Set<E>
   ↑
SortedSet<E>
   ↑
NavigableSet<E>
   ↑
TreeSet<E>
```

#### 核心介面關係

```java
// 基本集合介面
public interface Set<E> extends Collection<E> {
    boolean add(E e);
    boolean remove(Object o);
    boolean contains(Object o);
    int size();
    boolean isEmpty();
    Iterator<E> iterator();
}

// 有序集合介面
public interface SortedSet<E> extends Set<E> {
    Comparator<? super E> comparator();
    SortedSet<E> subSet(E fromElement, E toElement);
    SortedSet<E> headSet(E toElement);
    SortedSet<E> tailSet(E fromElement);
    E first();
    E last();
}

// 可導航集合介面
public interface NavigableSet<E> extends SortedSet<E> {
    E lower(E e);
    E floor(E e);
    E ceiling(E e);
    E higher(E e);
    E pollFirst();
    E pollLast();
    Iterator<E> iterator();
    NavigableSet<E> descendingSet();
    Iterator<E> descendingIterator();
    NavigableSet<E> subSet(E fromElement, boolean fromInclusive,
                          E toElement, boolean toInclusive);
    NavigableSet<E> headSet(E toElement, boolean inclusive);
    NavigableSet<E> tailSet(E fromElement, boolean inclusive);
}
```

### TreeSet 核心特性

#### 1. 基於 TreeMap 的實現

```java
// TreeSet 內部實現
public class TreeSet<E> extends AbstractSet<E>
    implements NavigableSet<E>, Cloneable, java.io.Serializable {
    
    // 內部使用 TreeMap 存儲元素
    private transient NavigableMap<E,Object> m;
    
    // 虛擬值，用於將 Set 轉換為 Map
    private static final Object PRESENT = new Object();
    
    // 構造函數
    public TreeSet() {
        this(new TreeMap<E,Object>());
    }
    
    public TreeSet(Comparator<? super E> comparator) {
        this(new TreeMap<>(comparator));
    }
    
    // 基本操作
    public boolean add(E e) {
        return m.put(e, PRESENT) == null;
    }
    
    public boolean remove(Object o) {
        return m.remove(o) == PRESENT;
    }
    
    public boolean contains(Object o) {
        return m.containsKey(o);
    }
    
    public int size() {
        return m.size();
    }
}
```

#### 2. 自然排序與自定義比較器

```java
// 自然排序 TreeSet
TreeSet<String> naturalOrder = new TreeSet<>();
naturalOrder.add("Charlie");
naturalOrder.add("Alice");
naturalOrder.add("Bob");
// 結果：[Alice, Bob, Charlie]

// 自定義比較器 - 按長度排序
TreeSet<String> lengthOrder = new TreeSet<>(
    Comparator.comparing(String::length)
        .thenComparing(String::compareTo) // 長度相同時按字典序
);
lengthOrder.add("Java");
lengthOrder.add("C++");
lengthOrder.add("Python");
lengthOrder.add("Go");
// 結果：[Go, C++, Java, Python]

// 降序排序
TreeSet<Integer> descendingOrder = new TreeSet<>(Collections.reverseOrder());
descendingOrder.add(5);
descendingOrder.add(2);
descendingOrder.add(8);
descendingOrder.add(1);
// 結果：[8, 5, 2, 1]

// 複雜對象排序
TreeSet<Person> personSet = new TreeSet<>(
    Comparator.comparing(Person::getAge)
        .thenComparing(Person::getName)
);
```

### SortedSet 介面詳解

#### 基本方法實現

```java
public class TreeSetSortedExample {
    
    public static void main(String[] args) {
        TreeSet<Integer> treeSet = new TreeSet<>();
        
        // 添加元素
        treeSet.add(5);
        treeSet.add(2);
        treeSet.add(8);
        treeSet.add(1);
        treeSet.add(9);
        treeSet.add(3);
        
        demonstrateSortedSetMethods(treeSet);
    }
    
    private static void demonstrateSortedSetMethods(TreeSet<Integer> set) {
        System.out.println("Original set: " + set); // [1, 2, 3, 5, 8, 9]
        
        // 獲取比較器
        Comparator<? super Integer> comparator = set.comparator();
        System.out.println("Comparator: " + comparator); // null (natural ordering)
        
        // 第一個和最後一個元素
        System.out.println("First element: " + set.first()); // 1
        System.out.println("Last element: " + set.last());   // 9
        
        // 子集合（含頭不含尾）
        SortedSet<Integer> subSet = set.subSet(2, 8);
        System.out.println("SubSet [2, 8): " + subSet); // [2, 3, 5]
        
        // 頭部集合（不包含指定元素）
        SortedSet<Integer> headSet = set.headSet(5);
        System.out.println("HeadSet (< 5): " + headSet); // [1, 2, 3]
        
        // 尾部集合（包含指定元素）
        SortedSet<Integer> tailSet = set.tailSet(5);
        System.out.println("TailSet (>= 5): " + tailSet); // [5, 8, 9]
        
        // 迭代器
        System.out.print("Forward iteration: ");
        for (Integer value : set) {
            System.out.print(value + " ");
        }
        System.out.println();
        
        // 降序迭代器
        System.out.print("Descending iteration: ");
        Iterator<Integer> descendingIterator = set.descendingIterator();
        while (descendingIterator.hasNext()) {
            System.out.print(descendingIterator.next() + " ");
        }
        System.out.println();
    }
}
```

### NavigableSet 介面詳解

#### 導航方法實現

```java
public class TreeSetNavigableExample {
    
    public static void main(String[] args) {
        TreeSet<Integer> treeSet = new TreeSet<>();
        
        // 添加測試數據
        treeSet.add(1);
        treeSet.add(3);
        treeSet.add(5);
        treeSet.add(7);
        treeSet.add(9);
        
        demonstrateNavigableMethods(treeSet);
    }
    
    private static void demonstrateNavigableMethods(TreeSet<Integer> set) {
        System.out.println("Original set: " + set); // [1, 3, 5, 7, 9]
        
        // Lower 方法：返回嚴格小於指定元素的最大元素
        Integer lower = set.lower(5);
        System.out.println("Lower (< 5): " + lower); // 3
        
        // Floor 方法：返回小於或等於指定元素的最大元素
        Integer floor1 = set.floor(4);
        Integer floor2 = set.floor(5);
        System.out.println("Floor (<= 4): " + floor1); // 3
        System.out.println("Floor (<= 5): " + floor2); // 5
        
        // Ceiling 方法：返回大於或等於指定元素的最小元素
        Integer ceiling1 = set.ceiling(4);
        Integer ceiling2 = set.ceiling(5);
        System.out.println("Ceiling (>= 4): " + ceiling1); // 5
        System.out.println("Ceiling (>= 5): " + ceiling2); // 5
        
        // Higher 方法：返回嚴格大於指定元素的最小元素
        Integer higher = set.higher(5);
        System.out.println("Higher (> 5): " + higher); // 7
        
        // 彈出首尾元素（會刪除元素）
        TreeSet<Integer> copySet = new TreeSet<>(set);
        Integer pollFirst = copySet.pollFirst();
        Integer pollLast = copySet.pollLast();
        System.out.println("Poll first: " + pollFirst); // 1
        System.out.println("Poll last: " + pollLast);   // 9
        System.out.println("After polling: " + copySet); // [3, 5, 7]
        
        // 降序視圖
        NavigableSet<Integer> descendingSet = set.descendingSet();
        System.out.println("Descending set: " + descendingSet); // [9, 7, 5, 3, 1]
        
        // 範圍視圖
        NavigableSet<Integer> rangeSet = set.subSet(3, true, 7, false);
        System.out.println("Range [3, 7): " + rangeSet); // [3, 5]
        
        NavigableSet<Integer> headSet = set.headSet(5, true);
        System.out.println("Head set (<= 5): " + headSet); // [1, 3, 5]
        
        NavigableSet<Integer> tailSet = set.tailSet(5, false);
        System.out.println("Tail set (> 5): " + tailSet); // [7, 9]
        
        // 查找操作
        demonstrateSearchOperations(set);
    }
    
    private static void demonstrateSearchOperations(TreeSet<Integer> set) {
        System.out.println("\n=== Search Operations ===");
        
        // 測試不存在的元素
        int target = 4;
        System.out.println("Searching for: " + target);
        System.out.println("Contains: " + set.contains(target)); // false
        System.out.println("Lower: " + set.lower(target));       // 3
        System.out.println("Floor: " + set.floor(target));       // 3
        System.out.println("Ceiling: " + set.ceiling(target));   // 5
        System.out.println("Higher: " + set.higher(target));     // 5
        
        // 測試邊界情況
        System.out.println("\n=== Boundary Cases ===");
        System.out.println("Lower than first: " + set.lower(1));    // null
        System.out.println("Higher than last: " + set.higher(9));   // null
        System.out.println("Floor of first: " + set.floor(1));      // 1
        System.out.println("Ceiling of last: " + set.ceiling(9));   // 9
    }
}
```

### 企業級應用實例

#### 1. 事件調度系統

```java
public class EventScheduler {
    
    private final TreeSet<Event> eventQueue;
    private final ScheduledExecutorService scheduler;
    private final AtomicBoolean running;
    
    public EventScheduler() {
        // 按時間排序事件
        this.eventQueue = new TreeSet<>(Comparator.comparing(Event::getScheduledTime));
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.running = new AtomicBoolean(false);
    }
    
    // 調度事件
    public void scheduleEvent(Event event) {
        synchronized (eventQueue) {
            eventQueue.add(event);
            
            // 如果是最早的事件，重新調度
            if (event.equals(eventQueue.first())) {
                rescheduleNext();
            }
        }
    }
    
    // 取消事件
    public boolean cancelEvent(Event event) {
        synchronized (eventQueue) {
            boolean removed = eventQueue.remove(event);
            if (removed && !eventQueue.isEmpty()) {
                rescheduleNext();
            }
            return removed;
        }
    }
    
    // 獲取即將執行的事件
    public List<Event> getUpcomingEvents(int count) {
        synchronized (eventQueue) {
            return eventQueue.stream()
                    .limit(count)
                    .collect(Collectors.toList());
        }
    }
    
    // 獲取指定時間範圍內的事件
    public List<Event> getEventsInRange(LocalDateTime start, LocalDateTime end) {
        synchronized (eventQueue) {
            Event startEvent = new Event("", start, null);
            Event endEvent = new Event("", end, null);
            
            return eventQueue.subSet(startEvent, true, endEvent, false)
                    .stream()
                    .collect(Collectors.toList());
        }
    }
    
    // 啟動調度器
    public void start() {
        if (running.compareAndSet(false, true)) {
            rescheduleNext();
        }
    }
    
    // 停止調度器
    public void stop() {
        running.set(false);
        scheduler.shutdown();
    }
    
    // 重新調度下一個事件
    private void rescheduleNext() {
        if (!running.get()) {
            return;
        }
        
        synchronized (eventQueue) {
            if (eventQueue.isEmpty()) {
                return;
            }
            
            Event nextEvent = eventQueue.first();
            LocalDateTime now = LocalDateTime.now();
            
            if (nextEvent.getScheduledTime().isBefore(now)) {
                // 立即執行過期事件
                scheduler.submit(this::processNextEvent);
            } else {
                // 計算延遲時間
                long delay = Duration.between(now, nextEvent.getScheduledTime()).toMillis();
                scheduler.schedule(this::processNextEvent, delay, TimeUnit.MILLISECONDS);
            }
        }
    }
    
    // 處理下一個事件
    private void processNextEvent() {
        Event event = null;
        
        synchronized (eventQueue) {
            if (!eventQueue.isEmpty()) {
                event = eventQueue.pollFirst();
            }
        }
        
        if (event != null) {
            try {
                event.execute();
            } catch (Exception e) {
                System.err.println("Event execution failed: " + event.getName());
                e.printStackTrace();
            }
        }
        
        // 調度下一個事件
        rescheduleNext();
    }
    
    // 清理過期事件
    public int cleanupExpiredEvents() {
        synchronized (eventQueue) {
            LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
            Event cutoffEvent = new Event("", cutoff, null);
            
            NavigableSet<Event> expiredEvents = eventQueue.headSet(cutoffEvent, true);
            int count = expiredEvents.size();
            expiredEvents.clear();
            
            return count;
        }
    }
    
    // 獲取統計信息
    public EventStatistics getStatistics() {
        synchronized (eventQueue) {
            LocalDateTime now = LocalDateTime.now();
            long pendingEvents = eventQueue.size();
            long overdueEvents = eventQueue.stream()
                    .filter(event -> event.getScheduledTime().isBefore(now))
                    .count();
            
            LocalDateTime nextEventTime = eventQueue.isEmpty() ? null : eventQueue.first().getScheduledTime();
            
            return new EventStatistics(pendingEvents, overdueEvents, nextEventTime);
        }
    }
    
    // 事件類
    public static class Event {
        private final String name;
        private final LocalDateTime scheduledTime;
        private final Runnable action;
        
        public Event(String name, LocalDateTime scheduledTime, Runnable action) {
            this.name = name;
            this.scheduledTime = scheduledTime;
            this.action = action;
        }
        
        public void execute() {
            if (action != null) {
                action.run();
            }
        }
        
        // Getters
        public String getName() { return name; }
        public LocalDateTime getScheduledTime() { return scheduledTime; }
        
        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            Event event = (Event) obj;
            return Objects.equals(name, event.name) && 
                   Objects.equals(scheduledTime, event.scheduledTime);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(name, scheduledTime);
        }
    }
    
    // 統計信息類
    public static class EventStatistics {
        private final long pendingEvents;
        private final long overdueEvents;
        private final LocalDateTime nextEventTime;
        
        public EventStatistics(long pendingEvents, long overdueEvents, LocalDateTime nextEventTime) {
            this.pendingEvents = pendingEvents;
            this.overdueEvents = overdueEvents;
            this.nextEventTime = nextEventTime;
        }
        
        // Getters
        public long getPendingEvents() { return pendingEvents; }
        public long getOverdueEvents() { return overdueEvents; }
        public LocalDateTime getNextEventTime() { return nextEventTime; }
    }
}
```

#### 2. 範圍查詢緩存系統

```java
public class RangeQueryCache<T extends Comparable<T>> {
    
    private final TreeSet<CacheEntry<T>> cache;
    private final int maxSize;
    private final long ttlMillis;
    
    public RangeQueryCache(int maxSize, long ttlMillis) {
        this.cache = new TreeSet<>(Comparator.comparing(CacheEntry::getKey));
        this.maxSize = maxSize;
        this.ttlMillis = ttlMillis;
    }
    
    // 添加緩存項
    public void put(T key, Object value) {
        synchronized (cache) {
            // 移除舊值
            cache.removeIf(entry -> entry.getKey().equals(key));
            
            // 添加新值
            CacheEntry<T> entry = new CacheEntry<>(key, value, System.currentTimeMillis() + ttlMillis);
            cache.add(entry);
            
            // 清理過期項
            cleanupExpired();
            
            // 如果超過容量，移除最舊的項
            if (cache.size() > maxSize) {
                cache.pollFirst();
            }
        }
    }
    
    // 獲取單個值
    public Object get(T key) {
        synchronized (cache) {
            CacheEntry<T> searchEntry = new CacheEntry<>(key, null, 0);
            CacheEntry<T> found = cache.floor(searchEntry);
            
            if (found != null && found.getKey().equals(key) && !found.isExpired()) {
                return found.getValue();
            }
            
            return null;
        }
    }
    
    // 範圍查詢
    public List<Object> getRangeValues(T fromKey, T toKey) {
        synchronized (cache) {
            CacheEntry<T> fromEntry = new CacheEntry<>(fromKey, null, 0);
            CacheEntry<T> toEntry = new CacheEntry<>(toKey, null, 0);
            
            return cache.subSet(fromEntry, true, toEntry, true)
                    .stream()
                    .filter(entry -> !entry.isExpired())
                    .map(CacheEntry::getValue)
                    .collect(Collectors.toList());
        }
    }
    
    // 獲取最接近的值
    public Object getClosest(T key) {
        synchronized (cache) {
            CacheEntry<T> searchEntry = new CacheEntry<>(key, null, 0);
            CacheEntry<T> floor = cache.floor(searchEntry);
            CacheEntry<T> ceiling = cache.ceiling(searchEntry);
            
            CacheEntry<T> closest = null;
            
            if (floor != null && !floor.isExpired()) {
                closest = floor;
            }
            
            if (ceiling != null && !ceiling.isExpired()) {
                if (closest == null || 
                    key.compareTo(ceiling.getKey()) < closest.getKey().compareTo(key)) {
                    closest = ceiling;
                }
            }
            
            return closest != null ? closest.getValue() : null;
        }
    }
    
    // 獲取前 N 個值
    public List<Object> getTopN(int n) {
        synchronized (cache) {
            return cache.stream()
                    .filter(entry -> !entry.isExpired())
                    .limit(n)
                    .map(CacheEntry::getValue)
                    .collect(Collectors.toList());
        }
    }
    
    // 清理過期項
    private void cleanupExpired() {
        long now = System.currentTimeMillis();
        cache.removeIf(entry -> entry.getExpirationTime() < now);
    }
    
    // 清空緩存
    public void clear() {
        synchronized (cache) {
            cache.clear();
        }
    }
    
    // 獲取緩存統計
    public CacheStatistics getStatistics() {
        synchronized (cache) {
            cleanupExpired();
            return new CacheStatistics(cache.size(), maxSize, getHitRatio());
        }
    }
    
    private double getHitRatio() {
        // 簡化實現，實際應用中需要跟蹤命中率
        return 0.85; // 示例值
    }
    
    // 緩存項
    private static class CacheEntry<T> {
        private final T key;
        private final Object value;
        private final long expirationTime;
        
        public CacheEntry(T key, Object value, long expirationTime) {
            this.key = key;
            this.value = value;
            this.expirationTime = expirationTime;
        }
        
        public boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
        
        // Getters
        public T getKey() { return key; }
        public Object getValue() { return value; }
        public long getExpirationTime() { return expirationTime; }
    }
    
    // 統計信息
    public static class CacheStatistics {
        private final int currentSize;
        private final int maxSize;
        private final double hitRatio;
        
        public CacheStatistics(int currentSize, int maxSize, double hitRatio) {
            this.currentSize = currentSize;
            this.maxSize = maxSize;
            this.hitRatio = hitRatio;
        }
        
        // Getters
        public int getCurrentSize() { return currentSize; }
        public int getMaxSize() { return maxSize; }
        public double getHitRatio() { return hitRatio; }
    }
}
```

#### 3. 分數排名系統

```java
public class LeaderboardSystem {
    
    private final TreeSet<Player> leaderboard;
    private final Map<String, Player> playerMap;
    private final int maxSize;
    
    public LeaderboardSystem(int maxSize) {
        // 按分數降序排列，分數相同時按名稱升序
        this.leaderboard = new TreeSet<>(
            Comparator.comparing(Player::getScore, Comparator.reverseOrder())
                .thenComparing(Player::getName)
        );
        this.playerMap = new ConcurrentHashMap<>();
        this.maxSize = maxSize;
    }
    
    // 更新玩家分數
    public void updateScore(String playerName, int score) {
        synchronized (leaderboard) {
            // 移除舊記錄
            Player oldPlayer = playerMap.get(playerName);
            if (oldPlayer != null) {
                leaderboard.remove(oldPlayer);
            }
            
            // 添加新記錄
            Player newPlayer = new Player(playerName, score, System.currentTimeMillis());
            leaderboard.add(newPlayer);
            playerMap.put(playerName, newPlayer);
            
            // 保持排行榜大小
            if (leaderboard.size() > maxSize) {
                Player removed = leaderboard.pollLast();
                playerMap.remove(removed.getName());
            }
        }
    }
    
    // 獲取排行榜
    public List<Player> getLeaderboard() {
        synchronized (leaderboard) {
            return new ArrayList<>(leaderboard);
        }
    }
    
    // 獲取前 N 名
    public List<Player> getTopN(int n) {
        synchronized (leaderboard) {
            return leaderboard.stream()
                    .limit(n)
                    .collect(Collectors.toList());
        }
    }
    
    // 獲取玩家排名
    public int getPlayerRank(String playerName) {
        synchronized (leaderboard) {
            Player player = playerMap.get(playerName);
            if (player == null) {
                return -1;
            }
            
            return leaderboard.headSet(player, false).size() + 1;
        }
    }
    
    // 獲取玩家分數
    public int getPlayerScore(String playerName) {
        Player player = playerMap.get(playerName);
        return player != null ? player.getScore() : -1;
    }
    
    // 獲取分數範圍內的玩家
    public List<Player> getPlayersInScoreRange(int minScore, int maxScore) {
        synchronized (leaderboard) {
            // 創建邊界對象
            Player minPlayer = new Player("", minScore, 0);
            Player maxPlayer = new Player("", maxScore, 0);
            
            return leaderboard.subSet(maxPlayer, true, minPlayer, true)
                    .stream()
                    .filter(p -> p.getScore() >= minScore && p.getScore() <= maxScore)
                    .collect(Collectors.toList());
        }
    }
    
    // 獲取玩家周圍的排名
    public List<Player> getPlayersAround(String playerName, int radius) {
        synchronized (leaderboard) {
            Player player = playerMap.get(playerName);
            if (player == null) {
                return new ArrayList<>();
            }
            
            List<Player> result = new ArrayList<>();
            
            // 獲取前面的玩家
            NavigableSet<Player> before = leaderboard.headSet(player, false);
            before.descendingSet().stream()
                    .limit(radius)
                    .forEach(result::add);
            
            Collections.reverse(result);
            
            // 添加當前玩家
            result.add(player);
            
            // 獲取後面的玩家
            NavigableSet<Player> after = leaderboard.tailSet(player, false);
            after.stream()
                    .limit(radius)
                    .forEach(result::add);
            
            return result;
        }
    }
    
    // 移除玩家
    public boolean removePlayer(String playerName) {
        synchronized (leaderboard) {
            Player player = playerMap.remove(playerName);
            if (player != null) {
                return leaderboard.remove(player);
            }
            return false;
        }
    }
    
    // 清空排行榜
    public void clear() {
        synchronized (leaderboard) {
            leaderboard.clear();
            playerMap.clear();
        }
    }
    
    // 獲取統計信息
    public LeaderboardStatistics getStatistics() {
        synchronized (leaderboard) {
            if (leaderboard.isEmpty()) {
                return new LeaderboardStatistics(0, 0, 0, 0);
            }
            
            int totalPlayers = leaderboard.size();
            int highestScore = leaderboard.first().getScore();
            int lowestScore = leaderboard.last().getScore();
            double averageScore = leaderboard.stream()
                    .mapToInt(Player::getScore)
                    .average()
                    .orElse(0.0);
            
            return new LeaderboardStatistics(totalPlayers, highestScore, lowestScore, averageScore);
        }
    }
    
    // 玩家類
    public static class Player {
        private final String name;
        private final int score;
        private final long timestamp;
        
        public Player(String name, int score, long timestamp) {
            this.name = name;
            this.score = score;
            this.timestamp = timestamp;
        }
        
        // Getters
        public String getName() { return name; }
        public int getScore() { return score; }
        public long getTimestamp() { return timestamp; }
        
        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            Player player = (Player) obj;
            return score == player.score && 
                   Objects.equals(name, player.name);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(name, score);
        }
        
        @Override
        public String toString() {
            return String.format("Player{name='%s', score=%d}", name, score);
        }
    }
    
    // 統計信息
    public static class LeaderboardStatistics {
        private final int totalPlayers;
        private final int highestScore;
        private final int lowestScore;
        private final double averageScore;
        
        public LeaderboardStatistics(int totalPlayers, int highestScore, int lowestScore, double averageScore) {
            this.totalPlayers = totalPlayers;
            this.highestScore = highestScore;
            this.lowestScore = lowestScore;
            this.averageScore = averageScore;
        }
        
        // Getters
        public int getTotalPlayers() { return totalPlayers; }
        public int getHighestScore() { return highestScore; }
        public int getLowestScore() { return lowestScore; }
        public double getAverageScore() { return averageScore; }
    }
}
```

### 效能分析與優化

#### 1. 時間複雜度分析

```java
public class TreeSetPerformanceAnalysis {
    
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
            
            // TreeSet 測試
            long startTime = System.nanoTime();
            TreeSet<Integer> treeSet = new TreeSet<>();
            for (int i = 0; i < size; i++) {
                treeSet.add(i);
            }
            long treeSetInsertTime = System.nanoTime() - startTime;
            
            // 搜索測試
            startTime = System.nanoTime();
            for (int i = 0; i < 1000; i++) {
                treeSet.contains(i * size / 1000);
            }
            long treeSetSearchTime = System.nanoTime() - startTime;
            
            // HashSet 比較
            startTime = System.nanoTime();
            HashSet<Integer> hashSet = new HashSet<>();
            for (int i = 0; i < size; i++) {
                hashSet.add(i);
            }
            long hashSetInsertTime = System.nanoTime() - startTime;
            
            startTime = System.nanoTime();
            for (int i = 0; i < 1000; i++) {
                hashSet.contains(i * size / 1000);
            }
            long hashSetSearchTime = System.nanoTime() - startTime;
            
            System.out.printf("TreeSet - Insert: %d ns, Search: %d ns\n", 
                            treeSetInsertTime, treeSetSearchTime);
            System.out.printf("HashSet - Insert: %d ns, Search: %d ns\n\n", 
                            hashSetInsertTime, hashSetSearchTime);
        }
    }
    
    // 記憶體分析
    private static void memoryAnalysis() {
        Runtime runtime = Runtime.getRuntime();
        
        runtime.gc();
        long beforeMemory = runtime.totalMemory() - runtime.freeMemory();
        
        TreeSet<Integer> treeSet = new TreeSet<>();
        for (int i = 0; i < 100000; i++) {
            treeSet.add(i);
        }
        
        long afterMemory = runtime.totalMemory() - runtime.freeMemory();
        System.out.println("TreeSet memory usage: " + (afterMemory - beforeMemory) + " bytes");
        
        // 對比 HashSet
        runtime.gc();
        beforeMemory = runtime.totalMemory() - runtime.freeMemory();
        
        HashSet<Integer> hashSet = new HashSet<>();
        for (int i = 0; i < 100000; i++) {
            hashSet.add(i);
        }
        
        afterMemory = runtime.totalMemory() - runtime.freeMemory();
        System.out.println("HashSet memory usage: " + (afterMemory - beforeMemory) + " bytes");
    }
    
    // 並發測試
    private static void concurrencyTest() {
        TreeSet<Integer> treeSet = new TreeSet<>();
        ConcurrentSkipListSet<Integer> concurrentSet = new ConcurrentSkipListSet<>();
        
        // 填充初始數據
        for (int i = 0; i < 10000; i++) {
            treeSet.add(i);
            concurrentSet.add(i);
        }
        
        // 並發讀取測試
        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        System.out.println("Concurrent read test:");
        
        // TreeSet 同步讀取
        long startTime = System.nanoTime();
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 10000; j++) {
                        synchronized (treeSet) {
                            treeSet.contains(j);
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
        
        long treeSetTime = System.nanoTime() - startTime;
        System.out.println("TreeSet (synchronized): " + treeSetTime + " ns");
        
        // ConcurrentSkipListSet 測試
        startTime = System.nanoTime();
        latch = new CountDownLatch(threadCount);
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 10000; j++) {
                        concurrentSet.contains(j);
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
        
        long concurrentSetTime = System.nanoTime() - startTime;
        System.out.println("ConcurrentSkipListSet: " + concurrentSetTime + " ns");
        
        executor.shutdown();
    }
}
```

#### 2. 最佳化建議

```java
public class TreeSetOptimizationTips {
    
    // 1. 使用適當的比較器
    public static void comparatorOptimization() {
        // 避免在比較器中進行複雜計算
        TreeSet<String> badExample = new TreeSet<>((s1, s2) -> {
            // 壞例子：每次比較都進行昂貴的計算
            return expensiveCalculation(s1) - expensiveCalculation(s2);
        });
        
        // 好例子：預先計算或使用緩存
        Map<String, Integer> cache = new ConcurrentHashMap<>();
        TreeSet<String> goodExample = new TreeSet<>((s1, s2) -> {
            int val1 = cache.computeIfAbsent(s1, TreeSetOptimizationTips::expensiveCalculation);
            int val2 = cache.computeIfAbsent(s2, TreeSetOptimizationTips::expensiveCalculation);
            return val1 - val2;
        });
    }
    
    // 2. 批量操作優化
    public static void batchOperationOptimization() {
        TreeSet<Integer> treeSet = new TreeSet<>();
        
        // 批量添加比單個添加效率更高
        Collection<Integer> batchData = Arrays.asList(1, 2, 3, 4, 5);
        treeSet.addAll(batchData);
        
        // 使用子集合進行批量操作
        NavigableSet<Integer> subSet = treeSet.subSet(2, true, 4, false);
        subSet.clear(); // 比逐個刪除效率更高
    }
    
    // 3. 記憶體優化
    public static void memoryOptimization() {
        // 使用原始類型包裝器時注意自動裝箱
        TreeSet<Integer> set = new TreeSet<>();
        
        // 避免不必要的對象創建
        for (int i = 0; i < 1000; i++) {
            set.add(i); // 會創建 Integer 對象
        }
        
        // 考慮使用專門的原始類型集合庫
        // 如 Eclipse Collections 的 IntSortedSet
    }
    
    // 4. 並發優化
    public static void concurrencyOptimization() {
        TreeSet<Integer> treeSet = new TreeSet<>();
        
        // 使用 ConcurrentSkipListSet 替代同步的 TreeSet
        ConcurrentSkipListSet<Integer> concurrentSet = new ConcurrentSkipListSet<>();
        
        // 或者使用讀寫鎖
        ReadWriteLock lock = new ReentrantReadWriteLock();
        ReadLock readLock = lock.readLock();
        WriteLock writeLock = lock.writeLock();
        
        // 讀操作
        readLock.lock();
        try {
            treeSet.contains(1);
        } finally {
            readLock.unlock();
        }
        
        // 寫操作
        writeLock.lock();
        try {
            treeSet.add(1);
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
public class TreeSetLeetCodeSolutions {
    
    // LeetCode 1845: 座位預約管理系統
    static class SeatManager {
        private TreeSet<Integer> availableSeats;
        
        public SeatManager(int n) {
            availableSeats = new TreeSet<>();
            for (int i = 1; i <= n; i++) {
                availableSeats.add(i);
            }
        }
        
        public int reserve() {
            return availableSeats.pollFirst();
        }
        
        public void unreserve(int seatNumber) {
            availableSeats.add(seatNumber);
        }
    }
    
    // LeetCode 855: 考場就座
    static class ExamRoom {
        private TreeSet<Integer> seats;
        private int n;
        
        public ExamRoom(int n) {
            this.n = n;
            this.seats = new TreeSet<>();
        }
        
        public int seat() {
            int seat = 0;
            if (!seats.isEmpty()) {
                int maxDistance = seats.first();
                
                // 檢查中間位置
                Integer prev = null;
                for (Integer s : seats) {
                    if (prev != null) {
                        int distance = (s - prev) / 2;
                        if (distance > maxDistance) {
                            maxDistance = distance;
                            seat = prev + distance;
                        }
                    }
                    prev = s;
                }
                
                // 檢查最後位置
                if (n - 1 - seats.last() > maxDistance) {
                    seat = n - 1;
                }
            }
            
            seats.add(seat);
            return seat;
        }
        
        public void leave(int p) {
            seats.remove(p);
        }
    }
    
    // LeetCode 895: 最大頻率棧
    static class FreqStack {
        private TreeSet<Element> elements;
        private Map<Integer, Integer> freq;
        private int timestamp;
        
        public FreqStack() {
            elements = new TreeSet<>((a, b) -> {
                if (a.frequency != b.frequency) {
                    return b.frequency - a.frequency; // 頻率降序
                }
                return b.timestamp - a.timestamp; // 時間降序
            });
            freq = new HashMap<>();
            timestamp = 0;
        }
        
        public void push(int x) {
            int oldFreq = freq.getOrDefault(x, 0);
            int newFreq = oldFreq + 1;
            
            if (oldFreq > 0) {
                elements.remove(new Element(x, oldFreq, -1));
            }
            
            elements.add(new Element(x, newFreq, timestamp++));
            freq.put(x, newFreq);
        }
        
        public int pop() {
            Element top = elements.pollFirst();
            int val = top.value;
            int newFreq = freq.get(val) - 1;
            
            if (newFreq > 0) {
                freq.put(val, newFreq);
                elements.add(new Element(val, newFreq, timestamp++));
            } else {
                freq.remove(val);
            }
            
            return val;
        }
        
        static class Element {
            int value;
            int frequency;
            int timestamp;
            
            Element(int value, int frequency, int timestamp) {
                this.value = value;
                this.frequency = frequency;
                this.timestamp = timestamp;
            }
            
            @Override
            public boolean equals(Object obj) {
                if (this == obj) return true;
                if (obj == null || getClass() != obj.getClass()) return false;
                Element element = (Element) obj;
                return value == element.value && frequency == element.frequency;
            }
            
            @Override
            public int hashCode() {
                return Objects.hash(value, frequency);
            }
        }
    }
    
    // LeetCode 1499: 滿足不等式的最大值
    public int findMaxValueOfEquation(int[][] points, int k) {
        // 使用 TreeSet 維護滑動窗口
        TreeSet<Point> window = new TreeSet<>((a, b) -> {
            if (a.yMinusX != b.yMinusX) {
                return b.yMinusX - a.yMinusX; // 按 y-x 降序
            }
            return a.x - b.x; // 按 x 升序
        });
        
        int maxValue = Integer.MIN_VALUE;
        
        for (int[] point : points) {
            int x = point[0];
            int y = point[1];
            
            // 移除窗口外的點
            window.removeIf(p -> x - p.x > k);
            
            // 如果窗口不為空，計算最大值
            if (!window.isEmpty()) {
                Point best = window.first();
                maxValue = Math.max(maxValue, y + x + best.yMinusX);
            }
            
            // 添加當前點
            window.add(new Point(x, y - x));
        }
        
        return maxValue;
    }
    
    static class Point {
        int x;
        int yMinusX;
        
        Point(int x, int yMinusX) {
            this.x = x;
            this.yMinusX = yMinusX;
        }
    }
}
```

#### 2. 數據結構應用

```java
public class TreeSetDataStructureApplications {
    
    // 滑動窗口最大值
    public static class SlidingWindowMaximum {
        private TreeSet<Element> window;
        private int windowSize;
        private int index;
        
        public SlidingWindowMaximum(int windowSize) {
            this.window = new TreeSet<>((a, b) -> {
                if (a.value != b.value) {
                    return b.value - a.value; // 值降序
                }
                return a.index - b.index; // 索引升序
            });
            this.windowSize = windowSize;
            this.index = 0;
        }
        
        public void addNumber(int num) {
            // 添加新元素
            window.add(new Element(num, index));
            
            // 移除窗口外的元素
            if (index >= windowSize) {
                window.removeIf(e -> e.index <= index - windowSize);
            }
            
            index++;
        }
        
        public int getMaximum() {
            return window.isEmpty() ? 0 : window.first().value;
        }
        
        static class Element {
            int value;
            int index;
            
            Element(int value, int index) {
                this.value = value;
                this.index = index;
            }
        }
    }
    
    // 動態中位數
    public static class DynamicMedian {
        private TreeSet<Element> elements;
        private int index;
        
        public DynamicMedian() {
            this.elements = new TreeSet<>((a, b) -> {
                if (a.value != b.value) {
                    return a.value - b.value; // 值升序
                }
                return a.index - b.index; // 索引升序
            });
            this.index = 0;
        }
        
        public void addNumber(int num) {
            elements.add(new Element(num, index++));
        }
        
        public double getMedian() {
            int size = elements.size();
            if (size == 0) return 0;
            
            List<Element> sortedElements = new ArrayList<>(elements);
            
            if (size % 2 == 1) {
                return sortedElements.get(size / 2).value;
            } else {
                return (sortedElements.get(size / 2 - 1).value + 
                        sortedElements.get(size / 2).value) / 2.0;
            }
        }
        
        static class Element {
            int value;
            int index;
            
            Element(int value, int index) {
                this.value = value;
                this.index = index;
            }
        }
    }
    
    // 區間調度
    public static class IntervalScheduler {
        private TreeSet<Interval> intervals;
        
        public IntervalScheduler() {
            this.intervals = new TreeSet<>(Comparator.comparing(Interval::getStart));
        }
        
        public boolean canSchedule(int start, int end) {
            Interval newInterval = new Interval(start, end);
            
            // 檢查是否與現有區間重疊
            Interval floor = intervals.floor(newInterval);
            if (floor != null && floor.getEnd() > start) {
                return false;
            }
            
            Interval ceiling = intervals.ceiling(newInterval);
            if (ceiling != null && ceiling.getStart() < end) {
                return false;
            }
            
            return true;
        }
        
        public boolean schedule(int start, int end) {
            if (canSchedule(start, end)) {
                intervals.add(new Interval(start, end));
                return true;
            }
            return false;
        }
        
        public List<Interval> getSchedule() {
            return new ArrayList<>(intervals);
        }
        
        static class Interval {
            private final int start;
            private final int end;
            
            public Interval(int start, int end) {
                this.start = start;
                this.end = end;
            }
            
            public int getStart() { return start; }
            public int getEnd() { return end; }
            
            @Override
            public boolean equals(Object obj) {
                if (this == obj) return true;
                if (obj == null || getClass() != obj.getClass()) return false;
                Interval interval = (Interval) obj;
                return start == interval.start && end == interval.end;
            }
            
            @Override
            public int hashCode() {
                return Objects.hash(start, end);
            }
        }
    }
}
```

### 最佳實踐與建議

#### 1. 選擇適當的比較策略

```java
public class TreeSetBestPractices {
    
    // 1. 自然排序 vs 自定義比較器
    public static void comparatorChoice() {
        // 對於實現 Comparable 的類型，使用自然排序
        TreeSet<String> naturalOrder = new TreeSet<>();
        
        // 對於需要自定義排序的情況，使用比較器
        TreeSet<String> customOrder = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        
        // 複雜對象的多字段排序
        TreeSet<Person> personSet = new TreeSet<>(
            Comparator.comparing(Person::getAge)
                .thenComparing(Person::getName)
        );
    }
    
    // 2. 空值處理
    public static void nullHandling() {
        // TreeSet 不允許 null 元素
        TreeSet<String> set = new TreeSet<>();
        // set.add(null); // 會拋出 NullPointerException
        
        // 如果需要支持 null 值，使用自定義比較器
        TreeSet<String> nullSafeSet = new TreeSet<>((s1, s2) -> {
            if (s1 == null && s2 == null) return 0;
            if (s1 == null) return -1;
            if (s2 == null) return 1;
            return s1.compareTo(s2);
        });
    }
    
    // 3. 線程安全處理
    public static void threadSafety() {
        TreeSet<Integer> treeSet = new TreeSet<>();
        
        // 方法1：使用 Collections.synchronizedSet
        Set<Integer> syncSet = Collections.synchronizedSet(treeSet);
        
        // 方法2：使用 ConcurrentSkipListSet
        ConcurrentSkipListSet<Integer> concurrentSet = new ConcurrentSkipListSet<>();
        
        // 方法3：使用讀寫鎖
        ReadWriteLock lock = new ReentrantReadWriteLock();
        // 在讀寫操作時使用相應的鎖
    }
    
    // 4. 效能考慮
    public static void performanceConsiderations() {
        // 批量添加比單個添加效率更高
        Collection<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        TreeSet<Integer> treeSet = new TreeSet<>(data);
        
        // 避免頻繁的範圍查詢操作
        NavigableSet<Integer> subSet = treeSet.subSet(2, true, 4, false);
        // 對 subSet 的操作會影響原始 set
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
public class TreeSetCommonMistakes {
    
    // 錯誤1：在迭代過程中修改 TreeSet
    public static void avoidConcurrentModification() {
        TreeSet<Integer> set = new TreeSet<>();
        for (int i = 0; i < 10; i++) {
            set.add(i);
        }
        
        // 錯誤的做法
        // for (Integer value : set) {
        //     if (value % 2 == 0) {
        //         set.remove(value); // ConcurrentModificationException
        //     }
        // }
        
        // 正確的做法1：使用迭代器
        Iterator<Integer> iterator = set.iterator();
        while (iterator.hasNext()) {
            if (iterator.next() % 2 == 0) {
                iterator.remove();
            }
        }
        
        // 正確的做法2：收集要刪除的元素
        Set<Integer> toRemove = set.stream()
                .filter(value -> value % 2 == 0)
                .collect(Collectors.toSet());
        set.removeAll(toRemove);
    }
    
    // 錯誤2：比較器不一致
    public static void avoidInconsistentComparator() {
        // 錯誤：比較器與 equals 不一致
        TreeSet<String> badSet = new TreeSet<>((s1, s2) -> {
            return s1.length() - s2.length(); // 只比較長度
        });
        
        badSet.add("abc");
        badSet.add("def"); // 會被忽略，因為長度相同
        
        // 正確：確保比較器一致性
        TreeSet<String> goodSet = new TreeSet<>((s1, s2) -> {
            int lengthCompare = s1.length() - s2.length();
            if (lengthCompare != 0) {
                return lengthCompare;
            }
            return s1.compareTo(s2); // 長度相同時比較內容
        });
    }
    
    // 錯誤3：誤用子集合
    public static void avoidSubSetMisuse() {
        TreeSet<Integer> set = new TreeSet<>();
        for (int i = 0; i < 10; i++) {
            set.add(i);
        }
        
        // 錯誤：認為子集合是獨立的
        NavigableSet<Integer> subSet = set.subSet(2, true, 8, false);
        subSet.clear(); // 這會影響原始 set
        
        // 正確：如果需要獨立的副本
        NavigableSet<Integer> independentCopy = new TreeSet<>(subSet);
    }
}
```

### 總結

TreeSet 是 Java 集合框架中功能強大的有序集合實現，基於紅黑樹提供了 O(log n) 的高效操作。通過本文的深入分析，我們了解了：

1. **核心特性**：基於 TreeMap 的有序存儲，支持自然排序和自定義比較器
2. **介面層次**：從 Set 到 SortedSet 再到 NavigableSet 的完整功能
3. **實用方法**：豐富的範圍查詢、導航操作和視圖方法
4. **企業應用**：事件調度、範圍查詢、排名系統等實際場景
5. **效能優化**：比較器優化、批量操作、並發處理等最佳實踐
6. **常見陷阱**：並發修改、比較器一致性、子集合使用等需要注意的問題

正確使用 TreeSet 可以在需要有序集合的場景中提供高效、可靠的解決方案，是 Java 開發者必須掌握的重要工具之一。