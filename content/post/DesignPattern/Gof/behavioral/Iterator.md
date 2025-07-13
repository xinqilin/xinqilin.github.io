---
title: "DesignPattern - Behavioral - Iterator"
author: Bill.Lin
date: 2018-08-07T22:38:21+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Iterator

Iterator 是一種行為模式，使用它來提供一種標準的方式來遍歷一組對象。我們在 Java 集合框架中廣泛使用 Iterator，其中迭代器接口提供了遍歷集合的方法。
迭代的邏輯嵌入在集合本身中，它可以幫助客戶端程序輕鬆地對其進行迭代。Iterator 對象包含公共方法，以允許客戶端對像在容器內的對象列表迭代。


* Iterator
 定義 interface 用來迭代或存取的接口

* ConcreteIterator
implement Iterator interface
tracking the current position in the traversal of the aggregate.

* Aggregate
定義用於創建 Iterator 對象的接口。

* ConcreteAggregate
實現 Iterator 創建接口以返回正確的 ConcreteIterator 的實例。

 - 當想提供一種標準方法來迭代集合併隱藏客戶端程序的實現邏輯時。
 - 當您需要訪問聚合對象的內容而不暴露其內部表示時。
 - 支持聚合對象的多次遍歷。
 - 為遍歷不同的聚合結構提供統一的接口（即支持多態迭代）。

