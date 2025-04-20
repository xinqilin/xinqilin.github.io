---
title: "Lateinit"
author: Bill.Lin
date: 2021-08-05T21:07:54+08:00
draft: false
tags: []
Description: ""
Categories: ["Kotlin"]
DisableComments: false
---

### lateinit：延遲初始化

當不想設定 init value 又不想加上 ``!!`` ， ``?.`` ， ``貓王運算`` 時 可以使用

ex: DI 時可以使用

```kotlin
    lateinit var adminUserRepository: AdminUserRepository
```

### lateinit with val

```
    lateinit modifier is allowed only on mutable properties
```

lateinit 算有點語法糖，強制不初始化，繞過compiler，但要小心 之後一定要給值，不然就踩到自己埋的地雷
<br>
檢查 lateinit 是否已給值:

```kotlin
    xxx.isInitialized
```
