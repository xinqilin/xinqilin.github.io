---
title: "ORMEnumType"
author: Bill.Lin
date: 2023-01-05T23:18:48+08:00
draft: false
tags: []
Description: ""
Categories: ["Backend"]
DisableComments: false
---


### ORM Enum Type

```java

    @Enumerated(EnumType.STRING)
    @Column(name = "enum_type_name", columnDefinition = "VARCHAR(10) NOT NULL DEFAULT 'CREATE'")
    private EnumType enumType = EnumType.CREATE;

```
