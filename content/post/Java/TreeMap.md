---
title: "TreeMap Method"
author: Bill.Lin
date: 2021-10-31T19:16:31+08:00
draft: false
tags: ["Java", "Map", "TreeMap"]
Description: "Map -> SortedMap -> NavigableMap -> TreeMap"
Categories: ["Java"]
DisableComments: false
---

# TreeMap Method

Map <-繼承 SortedMap <-繼承 NavigableMap <-實作 TreeMap

### SortedMap

```java

public interface SortedMap<K,V> extends Map<K,V> {
    
    //return 元素comparator。如果是 ASC，则返回null；
    Comparator<? super K> comparator();
    
    //fromKey到toKey的集合：含頭不含尾
    java.util.SortedMap<K,V> subMap(K fromKey, K toKey);

    // 0 到toKey的集合：不包含toKey
    java.util.SortedMap<K,V> headMap(K toKey);

    //返回 fromKey 到结尾的集合：包含fromKey
    java.util.SortedMap<K,V> tailMap(K fromKey);
    
    //返回集合中的第一個元素：
    K firstKey();
   
    //返回集合中的最后一個元素：
    K lastKey();
    
    //返回集合中所有key的集合：
    Set<K> keySet();
    
    //返回集合中所有value的集合：
    Collection<V> values();
    
    //返回集合中的元素映射：
    Set<Map.Entry<K, V>> entrySet();
}

```

<br>

### NavigableMap

```java

public interface NavigableMap<K,V> extends SortedMap<K,V> {

    //返回 < key的第一個元素：
    Map.Entry<K,V> lowerEntry(K key);

    // 返回 < key的第一個 key：
    K lowerKey(K key);

    // 返回 <= key的第一個元素：
    Map.Entry<K,V> floorEntry(K key);

    //返回 <= key的第一個键：
    K floorKey(K key);

    //返回 >= key的第一個元素：
    Map.Entry<K,V> ceilingEntry(K key);

    //返回 >= key的第一個键：
    K ceilingKey(K key);

    //返回 > key的第一個元素：
    Map.Entry<K,V> higherEntry(K key);

    //返回 > key的第一個键：
    K higherKey(K key);

    //return 第一個元素：
    Map.Entry<K,V> firstEntry();

    //return 最後一個元素：
    Map.Entry<K,V> lastEntry();

    //return 第一個元素，並刪除：
    Map.Entry<K,V> pollFirstEntry();

    //return 最後一個元素，並刪除：
    Map.Entry<K,V> pollLastEntry();

    //返回 desc 的Map集合：
    java.util.NavigableMap<K,V> descendingMap();

    NavigableSet<K> navigableKeySet();

    //返回Map集合中 desc 的Key组成的Set集合：
    NavigableSet<K> descendingKeySet();

    java.util.NavigableMap<K,V> subMap(K fromKey, boolean fromInclusive,
                                       K toKey, boolean toInclusive);

    java.util.NavigableMap<K,V> headMap(K toKey, boolean inclusive);

    java.util.NavigableMap<K,V> tailMap(K fromKey, boolean inclusive);

    SortedMap<K,V> subMap(K fromKey, K toKey);

    SortedMap<K,V> headMap(K toKey);

    SortedMap<K,V> tailMap(K fromKey);
}

```

### Practice Leetcode 2055.

<table>
    <tr>
        <td>Map.Entry<K,V> ceilingEntry(K key)</td>
        <td>It returns the key-value pair having the least key, greater than or equal to the specified key, or null if there is no such key.</td>
    </tr>
    <tr>
        <td>K ceilingKey(K key)	</td>
        <td>It returns the least key, greater than the specified key or null if there is no such key.
        </td>
    </tr>
</table>



