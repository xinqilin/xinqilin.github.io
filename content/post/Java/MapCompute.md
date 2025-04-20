---
title: "MapCompute"
author: Bill.Lin
date: 2019-03-20T20:58:17+08:00
draft: false
tags: []
Description: ""
Categories: ["Map", "Compute","ComputeIfAbsent", "ComputeIfPresent"]
DisableComments: false
---

### init

```java
    Map<String, Integer> map = new HashMap<String, Integer>();
    map.put("a", 1);

```

### putIfAbsent

有了就不塞, 沒有就塞 value (不存在就塞)

```java
    map.putIfAbsent("a", 2); // return 1
    System.out.println(map); // {a=1}
    map.putIfAbsent("b", 3); // return null (因不存在會回 null, 但會塞進 map)
    System.out.println(map); // {a=1, b=3}
```

### compute

```java
    map.compute("a", (k, v) -> v + 1); // return 2
    System.out.println(map); // {a=2}
    map.compute("b", (k, v) -> v == null ? 1000 : v + 1); // return 1000
    System.out.println(map); // {a=2, b=1000}

```

### computeIfAbsent

不存在就計算

```java
    map.computeIfAbsent("a", k -> 2); // return 1
    System.out.println(map); // {a=1}
    map.computeIfAbsent("b", k -> 1000); // return 1000
    System.out.println(map); // {a=1, b=1000} 

```

### computeIfPresent

存在就計算

```java
    map.computeIfPresent("a", (k, v) -> v + 1); // return 2
    System.out.println(map); // {a=2}
    map.computeIfPresent("b", (k, v) -> v == null ? 0 : v + 1); // reutrn null
    System.out.println(map); // {a=2}
```



