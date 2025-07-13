---
title: "Dig"
author: Bill.Lin
date: 2021-01-08T21:39:14+08:00
draft: false
tags: []
Description: ""
Categories: ["Tools"]
DisableComments: false
---

### Ubuntu

```zsh
    # 安裝 bind-utils 套件（Ubuntu）
    sudo apt install dnsutils
```

```zsh

dig www.google.com

; <<>> DiG 9.10.6 <<>> www.google.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 21511
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:   ### 請求
;www.google.com.			IN	A

;; ANSWER SECTION:    ### 回覆
www.google.com.		147	IN	A	172.217.163.36

;; Query time: 54 msec
;; SERVER: 192.168.0.1#53(192.168.0.1)
;; WHEN: Sun Jan 08 21:40:50 CST 2023
;; MSG SIZE  rcvd: 59

```

```zsh

# 只輸出答案資訊
dig www.google.com +noall +answer
# 關閉註解
dig +nocmd www.google.com +noall +answer
# trace
dig www.google.com +trace

```


```zsh

# 反查
dig -x 172.217.160.68

```

```zsh

# 過 DNS
dig @8.8.4.4 www.google.com

```

```zsh

# 預設是 A record; including: A、AAAA、CNAME、MX、TXT、NS、SOA
dig google.com a +short

# 查全部 DNS: any
dig google.com any

```

#### 實用技

```zsh

watch -n 10 dig google.com

```