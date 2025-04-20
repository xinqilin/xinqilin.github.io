---
title: "UML"
author: Bill.Lin
date: 2021-07-12T23:33:14+08:00
draft: false
tags: []
Description: ""
Categories: ["UML"]
DisableComments: false
---

## Instance Level

- Dependency 依賴
- Association 關聯
- Aggregation 聚合
- Composition 組合

## Class Level

- Implementation 實作
- Inheritance 繼承

### Dependency 

```

虛線，箭頭指向 被使用者

A ---> B

```

### Association 

```

實線，箭頭指向 被擁有者 ， 可在箭頭上增加 1-many 1-1 關西

A -> B

```


### Aggregation

```

空心菱形屁股箭頭，箭頭指向 整體


A <>-> B
  <>-> C  

  要有A 必須要有B，C

```


### Composition 

```

實心菱形屁股箭頭，箭頭指向 整體

```

to be continued....

