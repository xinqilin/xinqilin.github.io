---
title: "grep — 文字搜尋、正規表達式與 Log 排查命令列指南"
author: Bill.Lin
date: 2026-11-01
draft: false
description: "grep 完整指令筆記：-i -v -w -o -c 等常用旗標、前後文與遞迴搜尋、BRE/ERE/PCRE 正規表達式、macOS BSD 與 GNU grep 差異，以及 Log 排查實戰"
categories: ["CLI"]
tags: ["CLI", "grep", "Regex", "Shell", "Linux", "macOS"]
---

`grep` 幾乎每天都在用，但多數時候只用到 `grep 字串 檔案`。真正讓排查變快的是那些旗標組合：`-i`、`-v`、`-o`、`-A`、`-r --include`、`-q`。本文整理這些進階但常用的功能。所有範例都對同一份範例資料實際跑過，輸出原樣貼在 `#` 註解裡；macOS 內建的 BSD grep 和 GNU grep 行為不同的地方會另外標註。

---

## 先確認你用的是哪個 grep

同樣叫 `grep`，不同系統上的實作不一樣：

```bash
grep --version
# grep (BSD grep, GNU compatible) 2.6.0-FreeBSD   <- macOS 內建
# grep (GNU grep) 3.12                             <- Linux 發行版、Homebrew 的 ggrep
```

| 環境 | 實作 | 備註 |
|---|---|---|
| macOS | BSD grep | 號稱 GNU compatible，但**沒有 `-P`**，部分長選項不支援 |
| Ubuntu / Debian / RHEL | GNU grep | 功能最完整 |
| Alpine container | BusyBox grep | 選項更少，寫 Dockerfile 腳本時要注意 |

macOS 想用 GNU grep：

```bash
brew install grep
ggrep --version        # Homebrew 裝成 ggrep，不會蓋掉系統的 grep
```

Homebrew 的安裝說明（caveats）寫得很清楚：所有指令都加了 `g` 前綴。想直接用 `grep` 這個名字呼叫 GNU 版，把 gnubin 目錄加到 PATH 最前面：

```bash
export PATH="/opt/homebrew/opt/grep/libexec/gnubin:$PATH"
```

不過這樣會讓本機腳本「剛好能動」、換到別台 Mac 卻壞掉。比較保險的做法是保留系統的 `grep`，需要 GNU 功能時明確打 `ggrep`。

原則：**本機互動式查詢用什麼都行；寫進 CI 或伺服器腳本的，只用兩邊共通的語法**。下面遇到差異都會標「GNU 限定」或「BSD 限定」。

---

## 範例資料

全文範例都對這兩個檔案操作。`app.log` 是簡化過的 Spring Boot log（含一段 stack trace），`access.log` 是 nginx access log：

```bash
cat > app.log <<'EOF'
2026-11-01 09:00:01.123  INFO [main] c.e.o.OrderApplication : Starting OrderApplication v1.4.2 using Java 21
2026-11-01 09:00:04.567  INFO [main] c.e.o.OrderApplication : Started OrderApplication in 3.444 seconds
2026-11-01 09:01:10.001 DEBUG [exec-1] c.e.o.web.OrderController : traceId=a1b2c3 GET /api/orders/1001
2026-11-01 09:01:10.050  INFO [exec-1] c.e.o.service.OrderService : traceId=a1b2c3 order 1001 found, took 49ms
2026-11-01 09:01:15.200  WARN [exec-2] c.e.o.client.PaymentClient : traceId=d4e5f6 payment API slow, took 2350ms
2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
java.lang.IllegalStateException: Payment declined
	at com.example.order.service.OrderService.create(OrderService.java:88)
	at com.example.order.web.OrderController.create(OrderController.java:42)
Caused by: java.net.SocketTimeoutException: Read timed out
	at java.base/sun.nio.ch.NioSocketImpl.timedRead(NioSocketImpl.java:288)
2026-11-01 09:01:20.000 DEBUG [exec-3] o.s.b.a.health.HealthEndpoint : GET /actuator/health UP
2026-11-01 09:01:30.000  INFO [exec-4] c.e.o.service.OrderService : traceId=g7h8i9 user_id=7 order 1002 created, took 120ms
2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
EOF

cat > access.log <<'EOF'
10.0.0.1 - - [01/Nov/2026:09:01:10 +0800] "GET /api/orders/1001 HTTP/1.1" 200 512 "-" "curl/8.7.1"
10.0.0.2 - - [01/Nov/2026:09:01:15 +0800] "POST /api/orders HTTP/1.1" 500 87 "-" "okhttp/4.12.0"
10.0.0.1 - - [01/Nov/2026:09:01:20 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"
10.0.0.3 - - [01/Nov/2026:09:01:30 +0800] "POST /api/orders HTTP/1.1" 201 256 "-" "okhttp/4.12.0"
10.0.0.10 - - [01/Nov/2026:09:01:35 +0800] "GET /api/orders/9999 HTTP/1.1" 404 64 "-" "curl/8.7.1"
10.0.0.2 - - [01/Nov/2026:09:01:40 +0800] "GET /api/orders/1002 HTTP/1.1" 502 157 "-" "okhttp/4.12.0"
10.0.0.1 - - [01/Nov/2026:09:01:50 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"
10.0.0.3 - - [01/Nov/2026:09:02:00 +0800] "GET /api/orders/1001 HTTP/1.1" 200 512 "-" "curl/8.7.1"
EOF
```

（stack trace 的 `at` 前面是 tab，跟真實 Java log 一樣。）

---

## 常用組合速查

| 指令 | 用途 |
|---|---|
| `grep -i error app.log` | 不分大小寫 |
| `grep -v DEBUG app.log` | 反向：排除符合的行 |
| `grep -n ERROR app.log` | 顯示行號 |
| `grep -c ERROR app.log` | 計算符合的**行數** |
| `grep -oE 'took [0-9]+ms' app.log` | 只印出符合的片段 |
| `grep -w id app.log` | 只比對完整的字 |
| `grep -F '[ERROR]' app.log` | 當成純字串，不解析 regex |
| `grep -E 'ERROR\|WARN' app.log` | 多選一（ERE） |
| `grep -A 4 -B 1 'Exception' app.log` | 顯示前後文 |
| `grep -rn --include='*.java' RestTemplate src/` | 遞迴搜尋 + 篩副檔名 |
| `grep -rl RestTemplate src/` | 只列出有符合的檔名 |
| `grep -q UP <<< "$body" && echo ok` | 只看 exit code，不輸出 |
| `grep -m1 'Started' app.log` | 找到第一筆就停 |
| `tail -f app.log \| grep --line-buffered ERROR` | 即時追蹤 log |
| `ps aux \| grep '[j]ava'` | 找 process 又不抓到 grep 自己 |
| `grep -vE '^[[:space:]]*(#\|$)' nginx.conf` | 去掉註解和空行 |

---

## 基本語法

```bash
grep [OPTIONS] PATTERN [FILE...]
grep [OPTIONS] -e PATTERN -e PATTERN ... [FILE...]
grep [OPTIONS] -f PATTERN_FILE [FILE...]
```

沒給檔案就讀 stdin，所以 `grep` 最常出現在 pipe 的中間。給多個檔案時，每一行前面會自動加上 `檔名:`；`-h` 關掉、`-H` 強制加上（單一檔案也加）：

```bash
grep ERROR app.log access.log
# app.log:2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# app.log:2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502

grep -h POST app.log access.log
# 10.0.0.2 - - [01/Nov/2026:09:01:15 +0800] "POST /api/orders HTTP/1.1" 500 87 "-" "okhttp/4.12.0"
# 10.0.0.3 - - [01/Nov/2026:09:01:30 +0800] "POST /api/orders HTTP/1.1" 201 256 "-" "okhttp/4.12.0"
```

### Pattern 一律加單引號

shell 會先處理 `*`、`?`、`[]`、`$`、`\`，再把結果交給 grep。zsh（macOS 預設 shell）更嚴格，glob 沒有對應的檔案就直接報錯：

```bash
grep took.*ms app.log
# zsh: no matches found: took.*ms        <- grep 根本沒被執行

grep 'took.*ms' app.log                  # 正確
```

bash 預設會把沒對應到檔案的 glob 原樣傳下去，所以「剛好能動」，但哪天目錄裡出現一個符合的檔名就會出錯。養成單引號的習慣最保險。

### Pattern 以 `-` 開頭

`grep '-v'` 會被當成 `-v` 選項。用 `-e` 明確指定 pattern，或用 `--` 表示選項到此結束：

```bash
echo '-v is a flag' | grep -e '-v'
# -v is a flag

echo '-v is a flag' | grep -- '-v'
# -v is a flag
```

---

## 比對控制

### `-i`：不分大小寫

```bash
grep -i error app.log
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# 2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

第二行是某個 logger 用了小寫 `error`，不加 `-i` 就會漏掉。搭配 `-o` 時，印出的是原文的大小寫：

```bash
grep -io error app.log
# ERROR
# error
# ERROR
```

### `-v`：反向，排除雜訊

`-v` 印出**不符合**的行。多個條件用 `-e` 疊加，或用 ERE 的 `|`：

```bash
grep -vE 'DEBUG|^[[:space:]]+at ' app.log
# 2026-11-01 09:00:01.123  INFO [main] c.e.o.OrderApplication : Starting OrderApplication v1.4.2 using Java 21
# 2026-11-01 09:00:04.567  INFO [main] c.e.o.OrderApplication : Started OrderApplication in 3.444 seconds
# 2026-11-01 09:01:10.050  INFO [exec-1] c.e.o.service.OrderService : traceId=a1b2c3 order 1001 found, took 49ms
# 2026-11-01 09:01:15.200  WARN [exec-2] c.e.o.client.PaymentClient : traceId=d4e5f6 payment API slow, took 2350ms
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# java.lang.IllegalStateException: Payment declined
# Caused by: java.net.SocketTimeoutException: Read timed out
# 2026-11-01 09:01:30.000  INFO [exec-4] c.e.o.service.OrderService : traceId=g7h8i9 user_id=7 order 1002 created, took 120ms
# 2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

一口氣去掉 DEBUG 和 stack trace 的 `at ...` 行，只留下例外的標題。實務上常見的是「先抓、再排除」的 pipeline：

```bash
grep -E 'ERROR|WARN' app.log | grep -v PaymentClient
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

### `-w`：只比對完整的字

```bash
grep id app.log
# 2026-11-01 09:01:30.000  INFO [exec-4] c.e.o.service.OrderService : traceId=g7h8i9 user_id=7 order 1002 created, took 120ms
# 2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55

grep -w id app.log
# 2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
```

`-w` 要求符合的字串前後**不是**「字母、數字、底線」。`user_id` 裡的 `id` 前面是 `_`，所以不算一個獨立的字。（`traceId` 是大寫 `I`，本來就不符合。）

找 IP 時特別有用。`10.0.0.1` 會連 `10.0.0.10` 一起抓到：

```bash
grep -F '10.0.0.1' access.log
# 10.0.0.1 - - [01/Nov/2026:09:01:10 +0800] "GET /api/orders/1001 HTTP/1.1" 200 512 "-" "curl/8.7.1"
# 10.0.0.1 - - [01/Nov/2026:09:01:20 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"
# 10.0.0.10 - - [01/Nov/2026:09:01:35 +0800] "GET /api/orders/9999 HTTP/1.1" 404 64 "-" "curl/8.7.1"
# 10.0.0.1 - - [01/Nov/2026:09:01:50 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"

grep -Fw '10.0.0.1' access.log
# 10.0.0.1 - - [01/Nov/2026:09:01:10 +0800] "GET /api/orders/1001 HTTP/1.1" 200 512 "-" "curl/8.7.1"
# 10.0.0.1 - - [01/Nov/2026:09:01:20 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"
# 10.0.0.1 - - [01/Nov/2026:09:01:50 +0800] "GET /actuator/health HTTP/1.1" 200 15 "-" "kube-probe/1.31"
```

### `-x`：整行完全符合

```bash
grep -x 'java.lang.IllegalStateException: Payment declined' app.log
# java.lang.IllegalStateException: Payment declined
```

### `-F`：當成純字串

pattern 裡有 `.`、`[`、`*`、`$` 這類 regex 特殊字元時，用 `-F` 就不必一個個跳脫。最經典的坑是 `[ERROR]`：

```bash
grep '[ERROR]' app.log | head -3
# 2026-11-01 09:00:01.123  INFO [main] c.e.o.OrderApplication : Starting OrderApplication v1.4.2 using Java 21
# 2026-11-01 09:00:04.567  INFO [main] c.e.o.OrderApplication : Started OrderApplication in 3.444 seconds
# 2026-11-01 09:01:10.001 DEBUG [exec-1] c.e.o.web.OrderController : traceId=a1b2c3 GET /api/orders/1001

grep -F '[ERROR]' app.log
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

不加 `-F` 時，`[ERROR]` 是 bracket expression，意思是「E、R、O 任一個字元」，幾乎每一行都符合。同理，`grep '10.0.0.1'` 裡的 `.` 是「任意字元」，連 `10a0b0c1` 都會符合。

### `-e` / `-f`：多個 pattern

`-f` 從檔案讀 pattern，一行一個。適合把「要排除的雜訊」整理成檔案：

```bash
printf 'DEBUG\nHealthEndpoint\n' > noise.txt
grep -F -f noise.txt app.log
# 2026-11-01 09:01:10.001 DEBUG [exec-1] c.e.o.web.OrderController : traceId=a1b2c3 GET /api/orders/1001
# 2026-11-01 09:01:20.000 DEBUG [exec-3] o.s.b.a.health.HealthEndpoint : GET /actuator/health UP

grep -v -F -f noise.txt app.log | wc -l
#       13
```

`-Fxf` 加 `-v` 還能當集合運算用（交集、差集），比寫程式快：

```bash
printf 'alice\nbob\ncarol\ndave\n' > users.txt
printf 'bob\ndave\nmallory\n' > blocked.txt

grep -Fxf blocked.txt users.txt      # 交集：users 裡被封鎖的
# bob
# dave

grep -vFxf blocked.txt users.txt     # 差集：users 裡沒被封鎖的
# alice
# carol
```

---

## 輸出控制

### `-n`：行號

```bash
grep -n -i timeout app.log
# 10:Caused by: java.net.SocketTimeoutException: Read timed out
# 14:2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
```

### `-c`：計的是「行數」，不是出現次數

```bash
grep -ci timeout app.log
# 2

grep -oi timeout app.log | wc -l
#        3
```

第 14 行有兩個 `timeout`，但 `-c` 只算一行。要算**出現次數**，用 `-o` 把每個符合的片段各印成一行，再交給 `wc -l`。

順帶一提，`grep -c '' file` 等於 `wc -l`（空字串符合每一行）。

### `-l` / `-L`：只要檔名

```bash
grep -l ERROR app.log access.log     # 有符合的檔案
# app.log

grep -L ERROR app.log access.log     # 沒有符合的檔案
# access.log
```

### `-o`：只印符合的片段

搭配 `-E` 從 log 裡抽資料，是 `-o` 最常見的用法：

```bash
grep -oE 'took [0-9]+ms' app.log
# took 49ms
# took 2350ms
# took 120ms

grep -oE 'traceId=[a-z0-9]+' app.log | sort -u
# traceId=a1b2c3
# traceId=d4e5f6
# traceId=g7h8i9
# traceId=j1k2l3
```

### `-m NUM`：找到 N 筆就停

不必讀完整個檔案，對大檔很有感。例如抓 Spring Boot 啟動花了多久：

```bash
grep -m1 'Started .* in' app.log
# 2026-11-01 09:00:04.567  INFO [main] c.e.o.OrderApplication : Started OrderApplication in 3.444 seconds
```

在 131 MB 的檔案上實測，macOS BSD grep 加 `-m1` 只要 0.01 秒，不加則要 0.30 秒（見後面「效能」一節）。

### `-q` / `-s`：腳本用

`-q` 什麼都不印，只回傳 exit code，而且找到第一筆就結束。`-s` 不印「檔案不存在」這類錯誤訊息：

```bash
grep -q ERROR app.log; echo "exit=$?"
# exit=0

grep -q FATAL app.log; echo "exit=$?"
# exit=1

grep ERROR nope.log; echo "exit=$?"
# grep: nope.log: No such file or directory
# exit=2

grep -s ERROR nope.log; echo "exit=$?"
# exit=2
```

### `--color`：搭配 less

輸出到 pipe 時，`--color=auto` 會自動關閉顏色。想在 `less` 裡保留標示，要強制開啟並讓 `less` 解讀色碼：

```bash
grep --color=always -n ERROR app.log | less -R
```

---

## 前後文：`-A` / `-B` / `-C`

| 旗標 | 意思 |
|---|---|
| `-A N` | After：符合行之後 N 行 |
| `-B N` | Before：符合行之前 N 行 |
| `-C N` | Context：前後各 N 行 |

抓 Java stack trace 最實用。ERROR 那行之後通常就是例外內容：

```bash
grep -A 4 'ERROR \[' app.log
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# java.lang.IllegalStateException: Payment declined
# 	at com.example.order.service.OrderService.create(OrderService.java:88)
# 	at com.example.order.web.OrderController.create(OrderController.java:42)
# Caused by: java.net.SocketTimeoutException: Read timed out
```

pattern 寫成 `'ERROR \['` 是為了排除 `[ERROR]` 那行；`[` 在 regex 裡是特殊字元，要用 `\[` 跳脫。

想知道 `Caused by` 是哪一行丟出來的，往前看一行：

```bash
grep -B 1 'Caused by' app.log
# 	at com.example.order.web.OrderController.create(OrderController.java:42)
# Caused by: java.net.SocketTimeoutException: Read timed out
```

多個符合的區塊不相鄰時，grep 會在中間插入 `--` 分隔：

```bash
grep -A 1 WARN app.log
# 2026-11-01 09:01:15.200  WARN [exec-2] c.e.o.client.PaymentClient : traceId=d4e5f6 payment API slow, took 2350ms
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# --
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

GNU 限定：`--no-group-separator` 拿掉 `--`，`--group-separator=XXX` 換成自訂字串。BSD grep 不支援：

```bash
grep --no-group-separator -A1 WARN app.log      # macOS
# grep: unrecognized option `--no-group-separator'
```

```bash
ggrep --group-separator='=====' -A1 WARN app.log      # GNU grep
# 2026-11-01 09:01:15.200  WARN [exec-2] c.e.o.client.PaymentClient : traceId=d4e5f6 payment API slow, took 2350ms
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
# =====
# 2026-11-01 09:01:40.000  WARN [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR] upstream returned 502
```

stack trace 長度不固定時，`-A` 很難抓得剛好。這種「從某行開始，到下一個時間戳記為止」的需求交給 [awk](/post/cli/awk/) 比較適合。

---

## 正規表達式：BRE / ERE / PCRE

grep 支援三種 regex 語法：

| 旗標 | 語法 | 說明 |
|---|---|---|
| （預設）`-G` | BRE（Basic） | `+ ? \| ( ) { }` 要加反斜線才有特殊意義 |
| `-E` | ERE（Extended） | 上述符號直接有特殊意義，**建議預設用這個** |
| `-P` | PCRE（Perl） | 支援 `\d`、lookaround、非貪婪；**GNU 限定** |

`egrep` 等於 `grep -E`、`fgrep` 等於 `grep -F`，但新版 GNU grep 已經會對這兩個指令印出過時警告，直接用 `-E` / `-F` 就好：

```bash
gegrep -c ERROR app.log         # Homebrew 安裝的 GNU egrep
# gegrep: warning: gegrep is obsolescent; using ggrep -E
# 2
```

### BRE vs ERE 對照

| 意思 | BRE | ERE |
|---|---|---|
| 一次以上 | `\+` | `+` |
| 零或一次 | `\?` | `?` |
| 多選一 | `\\|` | `\|` |
| 群組 | `\( \)` | `( )` |
| 次數 | `\{2,4\}` | `{2,4}` |

```bash
grep 'took [0-9]\+ms' app.log         # BRE
grep -E 'took [0-9]+ms' app.log       # ERE，結果相同

grep 'ERROR\|WARN' app.log            # BRE
grep -E 'ERROR|WARN' app.log          # ERE，結果相同
```

BRE 的 `\+`、`\?`、`\|` 其實是 GNU 擴充，POSIX 標準沒有定義。macOS 的 BSD grep 實測也支援，但要可攜就直接用 `-E`。

### 字元類別與詞界

| 寫法 | 意思 | 可攜性 |
|---|---|---|
| `[0-9]`、`[[:digit:]]` | 數字 | POSIX，到處都能用 |
| `[[:alpha:]]`、`[[:alnum:]]`、`[[:upper:]]` | 字母、字母數字、大寫 | POSIX |
| `[[:space:]]` | 空白（含 tab） | POSIX |
| `\w`、`\s` | 字元（字母數字底線）、空白 | GNU 擴充；macOS BSD grep 實測支援 |
| `\b`、`\<`、`\>` | 詞界、字首、字尾 | GNU 擴充；macOS BSD grep 實測支援 |

```bash
grep -oE '[[:digit:]]{4,}ms' app.log        # 四位數以上的耗時
# 2350ms

grep -oE 'traceId=\w+' app.log | head -2
# traceId=a1b2c3
# traceId=a1b2c3

grep -E '\bid\b' app.log
# 2026-11-01 09:01:31.000 error [sched-1] c.e.o.job.SyncJob : sync timeout (timeout=30s), id=55
```

### Backreference：找重複

`\1` 代表「第一個群組實際比對到的內容」。抓連續重複的字：

```bash
echo 'retry retry failed' | grep -oE '\b([a-z]+) \1\b'
# retry retry
```

### 貪婪比對

`*` 和 `+` 會盡量吃多。想抓 `[...]` 的內容時，`.*` 會從第一個 `[` 一路吃到最後一個 `]`：

```bash
grep -oE '\[.*\]' app.log | tail -1
# [exec-5] c.e.o.web.OrderController : traceId=j1k2l3 [ERROR]

grep -oE '\[[^]]*\]' app.log | tail -2       # 可攜寫法：中間不能出現 ]
# [exec-5]
# [ERROR]
```

PCRE 可以直接寫非貪婪的 `.*?`，見下一節。

### `-P`：PCRE（GNU 限定）

PCRE 最有用的是 lookaround：條件要符合，但不算進輸出。從 `took 2350ms` 只取出數字：

```bash
ggrep -oP '(?<=took )\d+(?=ms)' app.log
# 49
# 2350
# 120
```

`\K` 的意思是「前面比對到的都丟掉」，比 lookbehind 好寫（lookbehind 要求固定長度，`\K` 沒有這個限制）：

```bash
ggrep -oP 'traceId=\K\w+' app.log | sort -u
# a1b2c3
# d4e5f6
# g7h8i9
# j1k2l3

ggrep -oP '\[.*?\]' app.log | tail -2        # 非貪婪
# [exec-5]
# [ERROR]
```

macOS 內建的 grep 沒有 `-P`：

```bash
grep -oP '(?<=took )\d+(?=ms)' app.log
# grep: invalid option -- P
```

在 macOS 上的替代做法：

```bash
# 1. ERE 先抽出片段，再抽一次數字（兩邊都能跑，最可攜）
grep -oE 'took [0-9]+ms' app.log | grep -oE '[0-9]+'
# 49
# 2350
# 120

# 2. perl（macOS 內建）
perl -nle 'print $1 if /took (\d+)ms/' app.log
# 49
# 2350
# 120

# 3. 安裝 GNU grep 後用 ggrep -P
# 4. ripgrep：rg -oP '(?<=took )\d+(?=ms)' app.log
```

### 陷阱：`\d` 在 Mac 能用，上了伺服器就壞

這個坑剛好跟 `-P` 相反。macOS 的 BSD grep 在 `-E` 模式下也認得 `\d`：

```bash
grep -oE '\d+ms' app.log         # macOS BSD grep
# 49ms
# 2350ms
# 120ms
```

同一行指令丟到 GNU grep：

```bash
ggrep -oE '\d+ms' app.log; echo "exit=$?"    # GNU grep 3.12
# ggrep: warning: stray \ before d
# exit=1
```

GNU grep 3.8 起會對這種沒有定義的跳脫印出警告，而且什麼都比對不到。

本機測試通過、丟上 Linux 就失效，非常難查。**ERE 裡一律用 `[0-9]`**，`\d` 只在 `-P` 裡用。

---

## 遞迴搜尋與檔案篩選

範例專案結構：

```text
proj/
├── .git/ORIG                         RestTemplate in git
├── application.yml                   resttemplate: enabled
├── src/main/java/com/example/A.java  class A { RestTemplate rt; }
├── src/main/java/com/example/B.java  class B { WebClient wc; }
└── target/
    ├── A.class.txt                   RestTemplate cached
    └── blob.bin                      （二進位檔，內含 RestTemplate）
```

### `-r` 加上篩選

不篩選的話，`.git`、`target` 全部會被翻出來：

```bash
grep -rn RestTemplate proj
# proj/target/A.class.txt:1:RestTemplate cached
# Binary file proj/target/blob.bin matches
# proj/.git/ORIG:1:RestTemplate in git
# proj/src/main/java/com/example/A.java:1:class A { RestTemplate rt; }
```

`--include` 限定檔名、`--exclude` 排除檔名、`--exclude-dir` 排除目錄：

```bash
grep -rn --include='*.java' RestTemplate proj
# proj/src/main/java/com/example/A.java:1:class A { RestTemplate rt; }

grep -rn --exclude-dir={target,.git} RestTemplate proj
# proj/src/main/java/com/example/A.java:1:class A { RestTemplate rt; }

grep -rln --exclude-dir={target,.git} -i resttemplate proj
# proj/application.yml
# proj/src/main/java/com/example/A.java
```

`{target,.git}` 是 **shell 的花括號展開**，實際傳給 grep 的是 `--exclude-dir=target --exclude-dir=.git`。bash 和 zsh 都支援，但 POSIX `sh` 不支援，寫在 `#!/bin/sh` 腳本裡要拆開寫。`--include='*.java'` 一定要加引號，否則 shell 會先展開成目前目錄下的 `.java` 檔。

### 二進位檔：`-I` / `-a`

grep 判斷是二進位檔時，只會印 `Binary file ... matches`。`-I` 直接跳過二進位檔，`-a` 則強制當成文字處理：

```bash
grep -rI --exclude-dir=.git RestTemplate proj
# proj/target/A.class.txt:RestTemplate cached
# proj/src/main/java/com/example/A.java:class A { RestTemplate rt; }
```

### 不給路徑時

`grep -r pattern` 沒給路徑時，BSD 和 GNU 都會搜目前目錄，但輸出的路徑格式不同：

```bash
cd proj && grep -r WebClient           # macOS BSD grep
# ./src/main/java/com/example/B.java:class B { WebClient wc; }
```

```bash
cd proj && ggrep -r WebClient          # GNU grep
# src/main/java/com/example/B.java:class B { WebClient wc; }
```

### `-r` vs `-R`：symbolic link

範例：`rtest/` 底下有一個一般檔案 `real.txt`，以及一個指向 `proj/src` 的 symlink `src-link`。

```bash
ggrep -r RestTemplate rtest                 # GNU：遞迴時不跟隨 symlink
# rtest/real.txt:RestTemplate here

ggrep -R RestTemplate rtest                 # GNU：-R 跟隨所有 symlink
# rtest/real.txt:RestTemplate here
# rtest/src-link/main/java/com/example/A.java:class A { RestTemplate rt; }

ggrep -r RestTemplate rtest/src-link        # GNU：命令列直接給的 symlink，-r 也會跟
# rtest/src-link/main/java/com/example/A.java:class A { RestTemplate rt; }
```

macOS 的 BSD grep 不一樣：`-r` 和 `-R` 都不跟隨 symlink，連命令列直接給的也不跟，要再加 BSD 限定的 `-S` 才會跟：

```bash
grep -R RestTemplate rtest/src-link; echo "exit=$?"
# exit=1

grep -RS RestTemplate rtest/src-link
# rtest/src-link/main/java/com/example/A.java:class A { RestTemplate rt; }
```

| | 遞迴途中遇到的 symlink | 命令列直接給的 symlink |
|---|---|---|
| GNU `-r` | 不跟隨 | 跟隨 |
| GNU `-R` | 跟隨 | 跟隨 |
| BSD `-r` / `-R` | 不跟隨 | 不跟隨 |
| BSD `-R -S` | 跟隨 | 跟隨 |

專案裡的 `node_modules`、monorepo 的 workspace 常常是 symlink，搜不到東西時先想到這一點。

### 搭配 xargs / sed 批次修改

找出檔案再交給 `sed` 取代，是重構時的常用招。檔名可能有空白，所以用 `--null` 讓檔名以 `\0` 分隔，再交給 `xargs -0`：

```bash
grep -rl --null --include='*.java' RestTemplate src \
  | xargs -0 sed -i '' 's/RestTemplate/RestClient/g'     # macOS sed
# Linux 的 GNU sed 寫 sed -i 's/.../.../g'（-i 後面不接空字串）
```

注意 `-Z` 在兩邊**意思不同**：GNU 的 `-Z` 是 `--null`，BSD 的 `-Z` 卻是「解壓縮後再搜尋」（等於 `zgrep`）。實測 macOS：

```bash
grep -l --null ERROR app.log access.log | od -c | head -1
# 0000000    a   p   p   .   l   o   g  \0           <- 以 \0 結尾

grep -lZ ERROR app.log access.log | od -c | head -1
# 0000000    a   p   p   .   l   o   g  \n           <- 還是換行，-Z 根本不是 --null
```

可攜寫法：**一律寫 `--null`**。`xargs` 與 `sed` 的細節見 [xargs](/post/cli/xargs/) 和 [sed](/post/cli/sed/)。

### `git grep`：在 Git repo 裡更好用

只搜 Git 追蹤中的檔案，自動略過 `.git`、build 產物和 `.gitignore` 裡的東西，速度也快：

```bash
git grep -n baseURL -- '*.yaml'
# hugo.yaml:1:baseURL: https://xinqilin.github.io/
```

需要依修改時間、檔案大小篩選時，改用 [find](/post/cli/find/) 搭配 grep：

```bash
find . -name '*.log' -mtime -1 -exec grep -l ERROR {} +
```

---

## Exit code 與 shell 腳本

| Exit code | 意思 |
|---|---|
| 0 | 有找到 |
| 1 | 沒找到 |
| 2 | 發生錯誤（檔案不存在、regex 語法錯誤等） |

`if` 判斷直接吃 exit code，搭配 `-q` 最乾淨：

```bash
if grep -q FATAL app.log; then
  echo "found FATAL"
else
  echo "not found, script continues"
fi
# not found, script continues
```

### `set -euo pipefail` 下的陷阱

「沒找到」也是非 0 的 exit code。在開了 `set -e` 和 `pipefail` 的腳本裡，這會直接讓腳本中斷，而且**沒有任何錯誤訊息**：

```bash
set -euo pipefail
n=$(grep FATAL app.log | wc -l)
echo "count=$n"          # 永遠不會執行到，腳本已經以 exit 1 結束
```

「找不到是正常情況」時，要明確吞掉 exit code：

```bash
set -euo pipefail
n=$(grep -c FATAL app.log || true)
echo "count=$n"
# count=0
```

`-c` 找不到時會印出 `0`，但 exit code 仍然是 1：

```bash
grep -c FATAL app.log; echo "exit=$?"
# 0
# exit=1
```

---

## 後端實戰

### 用 traceId 串起一個請求

```bash
grep traceId=d4e5f6 app.log
# 2026-11-01 09:01:15.200  WARN [exec-2] c.e.o.client.PaymentClient : traceId=d4e5f6 payment API slow, took 2350ms
# 2026-11-01 09:01:15.210 ERROR [exec-2] c.e.o.service.OrderService : traceId=d4e5f6 create order failed
```

先用 ERROR 找到 traceId，再用 traceId 撈出同一個請求的所有 log，是排查分散式系統問題最快的路徑。

### 找慢請求

```bash
grep -oE 'took [0-9]+ms' app.log | grep -oE '[0-9]+' | sort -n | tail -1
# 2350

grep -oE 'took [0-9]+ms' app.log | grep -oE '[0-9]+' | awk '$1 > 100'
# 2350
# 120
```

### access log 統計

狀態碼分布：

```bash
grep -oE '" [0-9]{3} ' access.log | sort | uniq -c | sort -nr
#    4 " 200
#    1 " 502
#    1 " 500
#    1 " 404
#    1 " 201
```

pattern 前面的 `" ` 是為了錨定在 `"GET ... HTTP/1.1"` 之後，避免抓到 body 大小欄位的數字。只看 5xx：

```bash
grep -E '" 5[0-9]{2} ' access.log
# 10.0.0.2 - - [01/Nov/2026:09:01:15 +0800] "POST /api/orders HTTP/1.1" 500 87 "-" "okhttp/4.12.0"
# 10.0.0.2 - - [01/Nov/2026:09:01:40 +0800] "GET /api/orders/1002 HTTP/1.1" 502 157 "-" "okhttp/4.12.0"
```

每分鐘請求數（時間戳記截到分鐘再 `uniq -c`）：

```bash
grep -oE '[0-9]{2}/[A-Za-z]{3}/[0-9]{4}:[0-9]{2}:[0-9]{2}' access.log | uniq -c
#    7 01/Nov/2026:09:01
#    1 01/Nov/2026:09:02
```

最常被呼叫的 endpoint：

```bash
grep -oE '"[A-Z]+ [^ ]+' access.log | sort | uniq -c | sort -nr
#    2 "POST /api/orders
#    2 "GET /api/orders/1001
#    2 "GET /actuator/health
#    1 "GET /api/orders/9999
#    1 "GET /api/orders/1002
```

需要依欄位做更複雜的統計時，交給 [awk](/post/cli/awk/)。

### 即時追蹤：`--line-buffered`

```bash
tail -f app.log | grep --line-buffered ERROR | tee errors.log
```

grep 的輸出接到 pipe 時會改成區塊緩衝（累積到一定大小才輸出），下游的 `tee` 可能好幾分鐘都看不到東西。`--line-buffered` 強制每一行就輸出一次。如果 grep 是 pipeline 的最後一個（直接輸出到終端機），就不需要加。

### 搜尋壓縮過的 log

被 logrotate 壓縮的 `.gz` 直接 grep 是搜不到的：

```bash
gzip -c app.log > app.log.1.gz

grep -c 'Payment declined' app.log.1.gz
# 0

zgrep -c ERROR app.log.1.gz
# 2
```

### 找 process 又不抓到 grep 自己

`ps aux | grep java` 的結果裡會出現 `grep java` 這個 process 本身，因為它的命令列也包含 `java`。把 pattern 改成 `[j]ava` 就能避開：regex `[j]ava` 會符合 `java`，但 grep 自己的命令列是 `grep [j]ava`，字面上的 `[j]ava` 並不符合 regex `[j]ava`。用模擬的 `ps` 輸出示範：

```bash
printf 'bill  123  java -jar order.jar\nbill  456  grep java\n' | grep 'java'
# bill  123  java -jar order.jar
# bill  456  grep java                <- 抓到自己

printf 'bill  123  java -jar order.jar\nbill  456  grep [j]ava\n' | grep '[j]ava'
# bill  123  java -jar order.jar
```

不過更直接的做法是用 `pgrep -fl java`，它本來就會排除自己。

### 清掉設定檔的註解與空行

```bash
printf '# nginx\n\nworker_processes 4;\n  # comment\nevents {\n    worker_connections 1024;\n}\n' > nginx.conf

grep -vE '^[[:space:]]*(#|$)' nginx.conf
# worker_processes 4;
# events {
#     worker_connections 1024;
# }
```

`^[[:space:]]*(#|$)` 的意思是「行首可以有空白，接著是 `#`（註解）或直接結束（空行）」，再用 `-v` 反向排除。

### 容器與 Kubernetes

以下指令需要對應的環境，僅列寫法：

```bash
kubectl get pods -A | grep -v Running              # 找出不健康的 pod
kubectl logs deploy/order-service --since=10m | grep -E 'ERROR|WARN'
docker logs order-service 2>&1 | grep ERROR        # 容器寫到 stderr 的 log，docker logs 也從 stderr 輸出，要加 2>&1
env | grep -i proxy                                # 確認 proxy 環境變數
```

---

## 效能

用範例 `app.log` 複製成 131 MB（1,474,560 行）的檔案，在同一台 Mac（Apple Silicon）上比較 macOS BSD grep 和 GNU grep 3.12，各跑兩次，取較穩定的數字：

| 指令 | BSD grep | GNU grep |
|---|---|---|
| `grep -c 'Payment declined'` | 0.30s | 0.06s |
| `grep -cF 'Payment declined'` | 0.30s | 0.06s |
| `grep -ci 'payment declined'` | 2.62s | 0.13s |
| `LC_ALL=C grep -ci 'payment declined'` | 2.54s | 0.06s |
| `grep -cE 'took [0-9]+ms'` | 0.74s | 0.13s |
| `grep -m1 'Payment declined'` | 0.01s | 0.01s |

觀察：

- GNU grep 整體快了約 5 倍。在 Mac 上要翻 GB 等級的 log，裝 `ggrep` 很值得。
- `-i` 在 BSD grep 上慢了將近 9 倍，在 GNU grep 上慢了約 2 倍。
- `LC_ALL=C` 在 GNU grep 上能把 `-i` 的額外成本抵銷（UTF-8 locale 下的大小寫轉換比較貴），在 BSD grep 上則幾乎沒有效果。只在資料確定是 ASCII 時使用，否則中文等多位元組字元的比對結果可能不同。
- `-F` 對純字串沒有差別，兩邊對字面字串本來就有最佳化；`-F` 的價值在「不必跳脫特殊字元」。
- `-m` / `-q` 提早結束的效果遠大於其他任何調整。
- 檔案數量很多（整個 monorepo）時，瓶頸在走訪目錄而不是比對，改用 `git grep` 或 `rg`。

**量測陷阱**：GNU grep 發現輸出被導向 `/dev/null` 時，會跟 `-q` 一樣找到第一筆就結束。`time grep -c ... > /dev/null` 量到的會是 0.01 秒，數字完全失真。量效能時要把輸出導到一般檔案。


---

## BSD grep vs GNU grep 差異對照

本文實測到的差異整理（macOS BSD grep 2.6.0-FreeBSD vs GNU grep 3.12）：

| 項目 | macOS BSD grep | GNU grep |
|---|---|---|
| `-P`（PCRE） | 不支援 | 支援 |
| `-E` 裡的 `\d` | 當成數字 | 警告 `stray \ before d`，比對不到 |
| `-Z` | 解壓縮後搜尋（等於 `zgrep`） | 等於 `--null` |
| `--null` | 支援 | 支援 |
| `--group-separator` / `--no-group-separator` | 不支援 | 支援 |
| `-r` 不給路徑 | 搜目前目錄，路徑帶 `./` | 搜目前目錄，路徑不帶 `./` |
| symlink | `-r`、`-R` 都不跟隨，加 `-S` 才跟隨 | `-r` 只跟隨命令列上的，`-R` 全部跟隨 |
| BRE 的 `\+`、`\?`、`\\|` | 支援 | 支援 |
| `\w`、`\s`、`\b`、`\<`、`\>` | 支援 | 支援 |
| 輸出導向 `/dev/null` | 照常執行 | 找到第一筆就結束 |
| 效能（131 MB，`-ci`） | 2.62s | 0.13s |

寫要在兩邊都能跑的腳本：用 `-E` 加 `[0-9]`、`[[:space:]]`，檔名分隔用 `--null`，不要用 `-P`、`-Z` 和 `--group-separator`。

---

## 什麼時候該換工具

| 需求 | 工具 |
|---|---|
| 在大型 repo 裡找程式碼 | `rg`（ripgrep）：預設遞迴、尊重 `.gitignore`、跳過二進位檔、速度快，`brew install ripgrep` |
| 只搜 Git 追蹤的檔案 | `git grep` |
| 需要依欄位判斷、加總、格式化 | [awk](/post/cli/awk/) |
| 找到之後要取代 | [sed](/post/cli/sed/) |
| 資料是 JSON | [jq](/post/cli/jq/)，不要用 grep 硬抓 JSON |
| 依檔案屬性（時間、大小）篩選 | [find](/post/cli/find/) |

---

## 參考資料

- [GNU grep manual](https://www.gnu.org/software/grep/manual/grep.html)
- [FreeBSD grep(1) manual](https://man.freebsd.org/cgi/man.cgi?query=grep)（macOS 的 grep 源自 FreeBSD，本機可用 `man grep`）
- [POSIX Regular Expressions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap09.html)
- [ripgrep User Guide](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)
