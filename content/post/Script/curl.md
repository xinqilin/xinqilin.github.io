---
title: "Curl"
author: Bill.Lin
date: 2021-08-03T10:23:31+08:00
draft: false
tags: ["CURL"]
Description: ""
Categories: ["Script", "curl"]
DisableComments: false
---

### 參數

```
    -X/--request [GET|POST|PUT|DELETE|PATCH]  使用指定的 http method 來發出 http request
    -H/--header                           設定 request 裡所攜帶的 header
    -i/--include                          在 output 顯示 response 的 header
    -d/--data                             攜帶 HTTP POST Data 
    -v/--verbose                          輸出更多的訊息方便 debug / 顯示接收及發送的訊息
    - trace-ascii [fileName] [URL]        顯示更多詳細訊息
    -u/--user                             攜帶使用者帳號、密碼
    -b/--cookie                           攜帶 cookie（可以是參數或是檔案位置）
    -o [fileName] [URL]                   下載若沒填 [fileName] 會直接用 source 原名
```

### 常用

```
    curl [URL]
    curl -X POST/PUT [URL] -H "Content-Type: application/json" -d '{"key" : "value" }'
    curl -u [URL] <Account>:<Password>
```


reference: 
<br>
<a href="https://blog.techbridge.cc/2019/02/01/linux-curl-command-tutorial/">Linux Curl Command 指令與基本操作入門教學</a><br>

<a href="https://miahsuwork.medium.com/curl-%E5%9F%BA%E6%9C%AC%E6%93%8D%E4%BD%9C%E8%88%87%E6%8C%87%E4%BB%A4-%E6%90%AD%E9%85%8D-lidemy-http-challenge-%E5%AF%A6%E4%BD%9C-39b79511eb9e">[curl] 基本操作與指令 — 搭配 Lidemy HTTP Challenge 實作</a>

