---
title: "ReactiveJava"
author: Bill.Lin
date: 2021-12-01T22:13:40+08:00
draft: false
tags: []
Description: ""
Categories: ["Flux","Mono","Reactive"]
DisableComments: false
---

### init

```java
Flux<String> seq1 = Flux.just("Bill", "Is", "Good");
Flux<String> seq2 = Flux.fromIterable(Arrays.asList("Bill", "Is", "Good"));
Flux<Integer> intFrom5To6 = Flux.range(5, 2); 
Mono<String> mono = Mono.just("Bill");
Mono<String> mono1 = Mono.empty(); 
Mono<String> mono2 = Mono.justOrEmpty("Robert"); 

```

### onError, onComplete, onNext

```java
Flux<Integer> intList = Flux.range(1, 10);
intList.subscribe(
    n -> System.out.println(n),
    error -> System.err.println("Error " + error),
    () -> System.out.println("Done"));
```

### Map, FlatMap

<table  style="border:3px #cccccc solid;" cellpadding="10"; border="1"; text-align="center">
    <tr>
        <td>map</td>
        <td>flatMap</td>
    </tr>
    <tr>
        <td>轉換一個來源對應一個輸出</td>
        <td>轉換一個來源對應一個Flux(N個)</td>
    </tr>
    <tr>
        <td>單純的處理轉換</td>
        <td>subscribe每一個Flux</td>
    </tr>
    <tr>
        <td>synchronous</td>
        <td>Async</td>
    </tr>

</table>

### mergeWith

### Zip

```java
	
	
	
```

