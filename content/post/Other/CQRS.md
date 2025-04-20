---
title: "CQRS"
author: Bill.Lin
date: 2021-05-16T21:18:11+08:00
draft: false
tags: []
Description: ""
Categories: ["DDD", "CQRS"]
DisableComments: false
---


### CQRS  (Command Query Responsibility Segregation)

 - Command: 命令
    - 會對系統產生『影響』的動作
    - 沒有『結果』回傳
 - Query: 查詢
    - 不會對系統產生『影響』的動作
    - 會回傳『結果』

#### CQS 原則的限制
 
當查詢所回傳的結果只有短暫的存在意義時便不適用 => Queue.poll(), Stack.pop()

CQS: 適用於方法
CQRS: 適用於模型類別


### Event Sourcing

```
    事件源（Event Sourcing）常與 CQRS 一併提及，此設計模式的用意，根據 Martin Fowler 的說法，是要讓應用程式能夠將異動資料的事件按照發生的時間順序全部記錄下來；如此一來，我們不只能夠查詢過去任意時間點的資料狀態，也能夠重現特定時間範圍之間所發生的事件過程。比如說，採用 Event Sourcing 的銀行交易系統可以讓使用者得知帳戶餘額是如何變成目前的狀態的。Event Sourcing 常與 CQRS 一起搭配運用，但採用 CQRS 模式的應用程式並不一定需要使用 Event Sourcing。
```

reference: <a href="https://www.huanlintalk.com/2015/07/designing-layered-application-4-cqrs.html" target="_blank" alt="cqrs">huanlintalk</a>

