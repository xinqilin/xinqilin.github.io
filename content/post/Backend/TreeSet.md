---
title: "Java TreeSet 資料結構詳解：排序集合與紅黑樹實作原理"
author: Bill.Lin
date: 2022-10-02T00:48:01+08:00
draft: false
tags: ["Java", "TreeSet", "Data Structure", "Red-Black Tree", "Collections", "Sorting"]
Description: "深入探討 Java TreeSet 的內部實作原理、使用方法與效能特性，包含與其他 Set 實作的比較分析"
Categories: ["Backend"]
DisableComments: false
---


### TreeSet

TreeSet使用是紅黑樹。

> 自訂排序
>> Set<String> treeSet = new TreeSet<>(Comparator.comparing(String::length));


```java

    Set<Integer> treeSet = new TreeSet<>();
    treeSet.add(1);
    treeSet.add(2);
    treeSet.add(3);

    Iterator<Integer> itr = treeSet.iterator();
    // Iterator<String> itr = treeSet.descendingIterator();  // 降冪

    while (itr.hasNext()) {
        log.info(itr.next());
    }

```


#### .first() => 返回第一個元素, last() => 返回最後一個元素

```java

    TreeSet<String> treeSet = new TreeSet<>();
    treeSet.add(1);
    treeSet.add(2);
    treeSet.add(3);
    treeSet.add(4);
    treeSet.add(5);

    assertEquals(1, treeSet.first());
    assertEquals(5, treeSet.last());

```


#### subSet(fromKey, toKey) => fromElement 到 toElement的元素 (跟 substring 一樣 包頭不包尾)

```java

    SortedSet<Integer> treeSet = new TreeSet<>();
    treeSet.add(1);
    treeSet.add(2);
    treeSet.add(3);
    treeSet.add(4);
    treeSet.add(5);
    treeSet.add(6);

    Set<Integer> expectedSet = new TreeSet<>();
    expectedSet.add(2);
    expectedSet.add(3);
    expectedSet.add(4);
    expectedSet.add(5);

    assertEquals(expectedSet, treeSet.subSet(2, 6));

```


#### headSet() => 返回小於指定 key 的 element, tailSet() => 返回大於等於指定 key 的 element

```java

    SortedSet<Integer> treeSet = new TreeSet<>();
    treeSet.add(1);
    treeSet.add(2);
    treeSet.add(3);
    treeSet.add(4);
    treeSet.add(5);
    treeSet.add(6);

    System.out.println(treeSet.headSet(6)); // [1, 2, 3, 4, 5]
    System.out.println(treeSet.tailSet(3)); // [3, 4, 5, 6]
    System.out.println( treeSet.subSet(3, 7)); // [3, 4, 5, 6]


    assertEquals(treeSet.headSet(6), treeSet.subSet(1, 6));
    assertEquals(treeSet.tailSet(3), treeSet.subSet(3, 7));

```


issue: <br>
[LC issue](https://leetcode.com/problems/longest-uploaded-prefix/)