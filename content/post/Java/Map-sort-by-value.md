---
title: "Map Sort by Value"
author: Bill.Lin
date: 2021-03-28T15:10:59+08:00
draft: false
tags: ["Java"]
Description: ""
Categories: ["Java"]
DisableComments: false
---

# Map Sort by value

有鑑於 Bill 上上週在刷 LC 時 <a href="https://leetcode.com/problems/top-k-frequent-words/"><b>題目點我!</b></a>

很簡單的排序問題，那時我的想法是先掃過一次，存 Map<String 字，Integer 字的長度> 然後在排序 Map Value 後 得到答案
但那時我心中想到的 map value 排序蠻麻煩的，這邊先記錄一下後來比較乾淨一點的寫法，以防之後忘記

```java

        // 掃第一次

        Map<String,Integer> map = new HashMap<>();
        
        for(String s: words){
            map.put(s, map.getOrDefault(s, 0) + 1);
        }

```

### 排序方法: 

```java

        List<Map.Entry<String, Integer>> list = new ArrayList(map.entrySet());

        Collections.sort(list, new Comparator<Map.Entry<String, Integer>>() {
            @Override
            public int compare(Map.Entry<String, Integer> e1, Map.Entry<String, Integer> e2) {
                return e2.getValue().compareTo(e1.getValue());
            }
        });

```

這個跟上面的幾乎一樣，一個是 list 存 Map.Entry 在排序器中拿 Entry 出來比，另一個存 map key 然後每次都從 map 掃一次拿 value 出來比

```java

        List<String> list = new ArrayList<>(map.keySet());

        Collections.sort(list,new Comparator<String>(){
            public int compare(String s1, String s2){
                int length = map.get(s2) - map.get(s1);
                if(length != 0) return length;
                return s1.compareTo(s2);
            }
        });


```

最後 lambda 寫法

```java

        List<String> list = new ArrayList<>(map.keySet());

        Collections.sort(list, (s1, s2)-> {
            return (map.get(s2) == map.get(s1)) ?  s1.compareTo(s2) :  (map.get(s2)- map.get(s1));
        });

```

