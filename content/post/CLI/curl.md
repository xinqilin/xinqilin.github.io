---
title: "curl — HTTP 請求、API 測試與網路除錯命令列指南"
author: Bill.Lin
date: 2021-08-03T10:23:31+08:00
draft: false
description: "curl 完整指令筆記：-sS、-fsSL、-v 輸出解讀等常用旗標組合，送 JSON 與表單、認證、--resolve 連線控制、retry 與 timeout、-w 效能量測與 exit code 實戰"
categories: ["CLI"]
tags: ["CLI", "curl", "HTTP", "API", "Network", "Debugging"]
aliases:
  - /post/Tools/Curl/
---

curl 是命令列上送 HTTP 請求的標準工具：測 API、看 header、下載檔案、排查連線問題都靠它。常看到別人打 `curl -sS`、`curl -fsSL`、`curl -v`，這些旗標組合其實各有明確的用途。本文整理實務上最常用的組合與進階功能，範例都用 macOS 內建的 curl 8.7.1 實際跑過，輸出原樣貼在 `#` 註解裡（測試端點是 [httpbin.org](https://httpbin.org) 和 example.com）。只有新版才有的功能會標註「(curl X.Y+)」。

---

## 先確認版本與功能

```bash
curl --version
# curl 8.7.1 (x86_64-apple-darwin26.0) libcurl/8.7.1 (SecureTransport) LibreSSL/3.3.6 zlib/1.2.12 nghttp2/1.69.0
# Release-Date: 2024-03-27
# Protocols: dict file ftp ftps gopher gophers http https imap imaps ipfs ipns ldap ldaps mqtt pop3 pop3s rtsp smb smbs smtp smtps telnet tftp
# Features: alt-svc AsynchDNS GSS-API HSTS HTTP2 HTTPS-proxy IPv6 Kerberos Largefile libz MultiSSL NTLM SPNEGO SSL threadsafe UnixSockets
```

- 第一行的 `SecureTransport`、`LibreSSL` 是 TLS 實作。macOS 的 LibreSSL 跟正牌 OpenSSL 的差異見 [openssl](/post/cli/openssl/)。
- `Features` 決定能用哪些功能。這裡有 `HTTP2`，但**沒有 `HTTP3`**，所以 `--http3` 在 macOS 內建 curl 上不能用。

想用最新版就裝 Homebrew 的 curl。它是 keg-only，也就是**不會**蓋掉系統的 `/usr/bin/curl`，要用完整路徑或自己加進 PATH：

```bash
brew install curl
/opt/homebrew/opt/curl/bin/curl --version
```

各 Linux 發行版內建的 curl 版本差很多，寫進 CI 或伺服器腳本的指令要確認目標機器的版本支援，例如 `--json` 需要 7.82 以上。

---

## 輸出模型：stdout 與 stderr

這是理解所有旗標組合的關鍵：

| 內容 | 輸出到 |
|---|---|
| response body | stdout |
| 進度條、錯誤訊息、`-v` 的除錯資訊 | stderr |

curl 發現 stdout 是終端機時，會自動關掉進度條，避免跟 body 混在一起。但只要 stdout 被導到檔案或 pipe，進度條就會出現在 stderr：

```bash
curl https://example.com > /dev/null
#   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
#                                  Dload  Upload   Total   Spent    Left  Speed
# 100   577    0   577    0     0   6321      0 --:--:-- --:--:-- --:--:--  6340
```

所以在腳本裡、或接 `| jq` 時，幾乎都要加 `-s`。問題是 `-s` 會連錯誤訊息一起吞掉，這就是下一節 `-sS` 的由來。

---

## 常用旗標組合

### `-s`、`-S`、`-sS`

| 旗標 | 進度條 | 錯誤訊息 |
|---|---|---|
| （無） | 有（stdout 不是終端機時） | 有 |
| `-s`（silent） | 無 | **無** |
| `-sS`（silent + show-error） | 無 | 有 |

對一個不存在的網域實測：

```bash
curl https://nonexistent.invalid > out.html
#   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
#                                  Dload  Upload   Total   Spent    Left  Speed
#   0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0curl: (6) Could not resolve host: nonexistent.invalid

curl -s https://nonexistent.invalid; echo "exit=$?"
# exit=6                    <- 什麼訊息都沒有

curl -sS https://nonexistent.invalid; echo "exit=$?"
# curl: (6) Could not resolve host: nonexistent.invalid
# exit=6
```

`-s` 單獨用時，失敗了什麼都看不到，只能靠 `$?` 猜。**腳本裡請用 `-sS`**：成功時安靜，失敗時告訴你原因。

### `-f`：讓 HTTP 錯誤變成失敗

curl 的觀點是「成功收到 HTTP 回應」就算成功，就算回應是 404 或 500，exit code 也是 0：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://httpbin.org/status/404; echo "exit=$?"
# 404
# exit=0
```

加上 `-f`（`--fail`），HTTP 400 以上就會讓 curl 以非 0 的 exit code 結束，而且不輸出 body。man page 寫的是 exit code 22，但 macOS 內建的 curl 8.7.1 實測，**走 HTTP/2 時回傳的是 56**：

```bash
curl -sS -f --http1.1 -o /dev/null https://httpbin.org/status/404; echo "exit=$?"
# curl: (22) The requested URL returned error: 404
# exit=22

curl -sS -f --http2 -o /dev/null https://httpbin.org/status/404; echo "exit=$?"
# curl: (56) The requested URL returned error: 404
# exit=56
```

HTTPS 預設會協商成 HTTP/2，所以在這個版本上，大部分 `-f` 失敗其實都是 56（另外有人在 ALT Linux 回報了同樣的 8.7.1 行為）。**腳本判斷「非 0 就是失敗」最保險，不要寫死 `$? -eq 22`。**

`-f` 不輸出 body，排查時反而少了線索。`--fail-with-body`（curl 7.76+）會保留 body，而且實測不論 HTTP/1.1 或 HTTP/2 都正確回傳 22：

```bash
curl -sS --fail-with-body https://httpbin.org/status/418; echo "exit=$?"
# curl: (22) The requested URL returned error: 418
#
#     -=[ teapot ]=-
#
#        _...._
#      .'  _ _ `.
#     | ."` ^ `". _,
#     \_;`"---"`|//
#       |       ;/
#       \_     _/
#         `"""`
# exit=22
```

man page 特別提醒：`-f` 並非萬無一失，遇到需要認證的 401、407 時，偶爾還是會漏掉。

### `-L`：跟隨 redirect

curl 預設**不會**跟著 3xx 走，只會把 redirect 的回應原樣給你。加 `-L` 才會跟過去：

```bash
curl -sS -o /dev/null -w '%{http_code} redirects=%{num_redirects} final=%{url_effective}\n' \
  -L https://httpbin.org/redirect/3
# 200 redirects=3 final=https://httpbin.org/get

curl -sS -o /dev/null -L --max-redirs 2 https://httpbin.org/redirect/3
# curl: (47) Maximum (2) redirects followed
```

**POST 遇到 redirect 的行為**是常見的坑。依 man page：回應是 301、302、303 時，curl 會把下一個請求改成 GET（跟瀏覽器一樣）；其他 3xx（307、308）則用原本的方法重送。用 httpbin 的 `/anything`（會回傳收到的 method 和 body）實測：

```bash
# 302：改成 GET，body 消失
curl -sS -L -d 'a=1' 'https://httpbin.org/redirect-to?url=/anything&status_code=302' | jq -c '{method, form}'
# {"method":"GET","form":{}}

# 加了 -X POST：method 被強制成 POST，但 body 一樣消失（最難查的狀況）
curl -sS -L -X POST -d 'a=1' 'https://httpbin.org/redirect-to?url=/anything&status_code=302' | jq -c '{method, form}'
# {"method":"POST","form":{}}

# --post302：維持 POST 並重送 body
curl -sS -L --post302 -d 'a=1' 'https://httpbin.org/redirect-to?url=/anything&status_code=302' | jq -c '{method, form}'
# {"method":"POST","form":{"a":"1"}}

# 307：本來就維持方法與 body
curl -sS -L -d 'a=1' 'https://httpbin.org/redirect-to?url=/anything&status_code=307' | jq -c '{method, form}'
# {"method":"POST","form":{"a":"1"}}
```

結論：**`-L` 不要搭配 `-X POST`**。需要在 301/302/303 後維持 POST，用 `--post301`、`--post302`、`--post303`。

跨網域 redirect 時憑證會不會跟著送出去，也要注意。man page 的說法是：`-u` 的帳密只會送給原本的 host；用 `-H` 自訂的 header 則會在 `-L` 之後跟著送到其他 host，敏感 header 要小心。用 httpbin 轉到 example.com 實測（`-v` 輸出中只留 `>` 開頭的 request 行）：

```bash
# -u 的帳密：只送給 httpbin.org
curl -sS -L -u demo:demo-pass 'https://httpbin.org/redirect-to?url=https://example.com/' -v -o /dev/null 2>&1 \
  | grep -E '^> (GET|Host|Authorization)'
# > GET /redirect-to?url=https://example.com/ HTTP/2
# > Host: httpbin.org
# > Authorization: Basic ZGVtbzpkZW1vLXBhc3M=
# > GET / HTTP/2
# > Host: example.com

# 自訂的 Authorization header：同樣沒有送給 example.com
curl -sS -L -H 'Authorization: Bearer demo-token' 'https://httpbin.org/redirect-to?url=https://example.com/' -v -o /dev/null 2>&1 \
  | grep -E '^> (GET|Host|Authorization)'
# > GET /redirect-to?url=https://example.com/ HTTP/2
# > Host: httpbin.org
# > Authorization: Bearer demo-token
# > GET / HTTP/2
# > Host: example.com

# 其他自訂 header（例如 API key）：會跟著送到 example.com
curl -sS -L -H 'X-Api-Key: demo-key' 'https://httpbin.org/redirect-to?url=https://example.com/' -v -o /dev/null 2>&1 \
  | grep -E '^> (GET|Host|X-Api-Key)'
# > GET /redirect-to?url=https://example.com/ HTTP/2
# > Host: httpbin.org
# > X-Api-Key: demo-key
# > GET / HTTP/2
# > Host: example.com
# > X-Api-Key: demo-key           <- 洩漏到另一個網域
```

curl 對 `Authorization` 有特別保護，但 `X-Api-Key` 這種自訂名稱的 header 不會被擋。**用 header 帶 API key 時，盡量不要搭配 `-L`**，或確認 redirect 的目標都在自己掌控之下。

### `-fsSL`：install script 的慣用寫法

很多工具的安裝說明長這樣：

```bash
curl -fsSL https://example.com/install.sh | bash
```

拆開來看：

| 旗標 | 作用 | 少了會怎樣 |
|---|---|---|
| `-f` | HTTP 錯誤時失敗、不輸出 body | 404 的 HTML 錯誤頁會被當成 shell script 交給 bash 執行 |
| `-s` | 不顯示進度條 | 進度條混進終端機輸出 |
| `-S` | 但要顯示錯誤 | 下載失敗時完全沒有訊息 |
| `-L` | 跟隨 redirect | GitHub release、短網址這類會 redirect 的 URL 拿到的是空的 3xx 回應 |

`curl ... | bash` 的風險在於你執行了自己沒看過的程式碼。比較安全的做法是先下載、看過再執行：

```bash
curl -fsSL -o install.sh https://example.com/install.sh
less install.sh
bash install.sh
```

### 看 header 的三種方式

| 寫法 | 送出的 method | 輸出 |
|---|---|---|
| `-i` | GET | header + body |
| `-I` | **HEAD** | 只有 header |
| `-sS -D - -o /dev/null` | GET | 只有 header |

```bash
curl -sS -I https://example.com
# HTTP/2 200
# date: Sun, 01 Nov 2026 12:01:47 GMT
# content-type: text/html; charset=utf-8
# server: cloudflare
# last-modified: Thu, 29 Oct 2026 13:15:03 GMT
# allow: GET, HEAD
# ...

curl -sS -D - -o /dev/null https://example.com
# HTTP/2 200
# date: Sun, 01 Nov 2026 12:01:47 GMT
# content-type: text/html; charset=utf-8
# server: cloudflare
# ...
```

`-i` 的 header 部分跟 `-D -` 一樣，只是後面接著 body。這個例子裡 HEAD 和 GET 回的 header 相同，但並不保證都是這樣。

`-I` 送的是 HEAD，不是 GET。有些伺服器、CDN 或框架對 HEAD 的處理跟 GET 不同（例如沒實作 HEAD 而回 405，或 header 內容不同）。想確認「GET 真正回什麼 header」，用 `-D -`（把 header 寫到 stdout）搭配 `-o /dev/null`（丟掉 body）。

另外，**不要用 `-X HEAD` 取代 `-I`**。`-X` 只改 request line 上的方法名稱，curl 仍然會等待 body：

```bash
curl -sS -X HEAD -m 5 https://httpbin.org/get
# curl: (18) transfer closed with 201 bytes remaining to read
```

### 速查

| 組合 | 意思 | 用途 |
|---|---|---|
| `-sS` | 安靜，但顯示錯誤 | 腳本、接 `jq` |
| `-fsS` | 再加上 HTTP 錯誤時失敗 | health check、CI |
| `-fsSL` | 再加上跟隨 redirect | 下載檔案、install script |
| `-sS -o /dev/null -w '%{http_code}\n'` | 只看狀態碼 | 監控、快速確認 |
| `-sS -D - -o /dev/null` | 只看 GET 的 response header | 除錯 |
| `-v` / `-sv` | 完整連線過程 | 除錯 |

---

## `-v` 輸出逐行解讀

`-v` 會印出整個連線過程，排查問題時最先用的就是它。加 `-s` 拿掉進度條，`-o /dev/null` 丟掉 body，只留下除錯資訊：

```bash
curl -sv https://example.com -o /dev/null
# * Host example.com:443 was resolved.
# * IPv6: (none)
# * IPv4: 104.20.23.154, 172.66.147.243
# *   Trying 104.20.23.154:443...
# * Connected to example.com (104.20.23.154) port 443
# * ALPN: curl offers h2,http/1.1
# * (304) (OUT), TLS handshake, Client hello (1):
# } [316 bytes data]
# *  CAfile: /etc/ssl/cert.pem
# *  CApath: none
# * (304) (IN), TLS handshake, Server hello (2):
# { [122 bytes data]
# * (304) (IN), TLS handshake, Unknown (8):
# { [19 bytes data]
# * (304) (IN), TLS handshake, Certificate (11):
# { [3686 bytes data]
# * (304) (IN), TLS handshake, CERT verify (15):
# { [80 bytes data]
# * (304) (IN), TLS handshake, Finished (20):
# { [36 bytes data]
# * (304) (OUT), TLS handshake, Finished (20):
# } [36 bytes data]
# * SSL connection using TLSv1.3 / AEAD-CHACHA20-POLY1305-SHA256 / [blank] / UNDEF
# * ALPN: server accepted h2
# * Server certificate:
# *  subject: CN=example.com
# *  start date: Sep 26 22:49:11 2026 GMT
# *  expire date: Dec 25 22:56:35 2026 GMT
# *  subjectAltName: host "example.com" matched cert's "example.com"
# *  issuer: C=US; O=SSL Corporation; CN=Cloudflare TLS Issuing ECC CA 3
# *  SSL certificate verify ok.
# * using HTTP/2
# * [HTTP/2] [1] OPENED stream for https://example.com/
# * [HTTP/2] [1] [:method: GET]
# * [HTTP/2] [1] [:scheme: https]
# * [HTTP/2] [1] [:authority: example.com]
# * [HTTP/2] [1] [:path: /]
# * [HTTP/2] [1] [user-agent: curl/8.7.1]
# * [HTTP/2] [1] [accept: */*]
# > GET / HTTP/2
# > Host: example.com
# > User-Agent: curl/8.7.1
# > Accept: */*
# >
# * Request completely sent off
# < HTTP/2 200
# < date: Sun, 01 Nov 2026 12:01:39 GMT
# < content-type: text/html; charset=utf-8
# < server: cloudflare
# < last-modified: Thu, 29 Oct 2026 13:15:03 GMT
# < allow: GET, HEAD
# < accept-ranges: bytes
# < age: 6024
# < cf-cache-status: HIT
# < cf-ray: a53abefadc0e5aa6-KHH
# < alt-svc: h3=":443"; ma=86400
# <
# { [577 bytes data]
# * Connection #0 to host example.com left intact
```

（以上是 macOS 內建 curl 的輸出。Linux 上以 OpenSSL 編譯的 curl，TLS 那幾行的寫法會不太一樣。）

每一行開頭的符號代表不同的資訊：

| 開頭 | 意思 |
|---|---|
| `*` | curl 自己的資訊：DNS 解析結果、連到哪個 IP、TLS 版本與憑證、ALPN 協商出的 HTTP 版本 |
| `>` | 送出去的 request：request line 和 header |
| `<` | 收到的 response：status line 和 header |
| `{ [N bytes data]` | 收到 N bytes 資料（`}` 是送出），只顯示數量不顯示內容 |

排查時的閱讀順序：

1. **連到哪裡**：`IPv4:` 列出 DNS 解析到的所有 IP，`Connected to` 是實際連上的那一個。是不是預期的機器？DNS 有沒有解析到舊 IP？
2. **TLS**：`Server certificate` 底下的 subject、issuer、到期日對不對？`ALPN: server accepted h2` 表示協商出 HTTP/2。
3. **送了什麼**：`>` 開頭的 header 是不是你以為的（Content-Type、Authorization、Host）？
4. **收到什麼**：`<` 開頭的 status 和 header。上面的 `cf-cache-status: HIT` 就表示這個回應來自 Cloudflare 的快取，而不是源站。
5. **連線有沒有保留**：`left intact` 表示連線還開著，同一個指令的下一個請求可以重用（見後面「連線重用」）。

### 搭配 grep

`-v` 的輸出走 stderr，要先用 `2>&1` 導到 stdout 才能 grep。加 `-s` 可以拿掉進度條但保留 verbose 資訊：

```bash
curl -sv https://example.com -o /dev/null 2>&1 | grep -E '^[<>] '
```

### 想看 body：`--trace-ascii`

`-v` 不顯示傳送的資料內容。要看 request body 實際送了什麼，用 `--trace-ascii -`（`-` 代表輸出到 stdout），加 `--trace-time` 會在每行前面加上時間。trace 的輸出很長（連 TLS handshake 的位元組都會印出來），下面只節錄送出 request 的部分：

```bash
curl -s --trace-ascii - --json '{"a":1}' https://httpbin.org/post -o /dev/null
# ...
# => Send header, 141 bytes (0x8d)
# 0000: POST /post HTTP/2
# 0013: Host: httpbin.org
# 0026: User-Agent: curl/8.7.1
# 003e: Content-Type: application/json
# 005e: Accept: application/json
# 0078: Content-Length: 7
# 008b:
# => Send data, 7 bytes (0x7)
# 0000: {"a":1}
# ...
```

`=> Send` 是送出、`<= Recv` 是收到。最左邊那欄是 byte offset，不是行號。

curl 8.3+ 還有 `--trace-config`，可以只開啟特定元件的追蹤訊息，例如 `--trace-config ids,http/2`。

### 安全提醒

`-v` 會把 `Authorization`、`Cookie`、`Proxy-Authorization` 這些 header 原樣印出來。如果你的環境有設定需要認證的 proxy（`HTTPS_PROXY=http://user:pass@...`），連 proxy 的帳密都會出現在輸出裡。**把 `-v` 的輸出貼到 issue、Slack 或截圖之前，一定要先遮掉。**

---

## 送資料

### `-d` 家族

| 選項 | 行為 |
|---|---|
| `-d` / `--data` | 送出 `application/x-www-form-urlencoded`；`@file` 會讀檔，而且**去掉換行** |
| `--data-raw` | 跟 `-d` 一樣，但 `@` 開頭不會被當成檔名 |
| `--data-binary` | `@file` 原封不動送出，保留換行 |
| `--data-urlencode` | 幫你做 URL encode |

用了任何一個 `-d` 系列，method 就自動變成 POST，**不需要再加 `-X POST`**。預設的 Content-Type 是表單格式：

```bash
curl -sS -d 'name=bill&lang=zh' https://httpbin.org/post | jq -c '{form, ct: .headers["Content-Type"]}'
# {"form":{"lang":"zh","name":"bill"},"ct":"application/x-www-form-urlencoded"}
```

`-d @file` 會吃掉換行，送 log、CSV 或簽章內容時會出問題：

```bash
printf 'line1\nline2\n' > two-lines.txt

curl -sS -d @two-lines.txt https://httpbin.org/post | jq -c '{form}'
# {"form":{"line1line2":""}}

curl -sS --data-binary @two-lines.txt https://httpbin.org/post | jq -c '{form}'
# {"form":{"line1\nline2\n":""}}
```

資料本身剛好以 `@` 開頭時，`-d` 會去找檔案：

```bash
curl -sS -d '@not-a-file' https://httpbin.org/post; echo "exit=$?"
# curl: option -d: error encountered when reading a file
# curl: try 'curl --help' or 'curl --manual' for more information
# exit=26

curl -sS --data-raw '@not-a-file' https://httpbin.org/post | jq -c .form
# {"@not-a-file":""}
```

值裡有 `&`、`=`、空白或中文時，用 `--data-urlencode`：

```bash
curl -sS --data-urlencode 'msg=a&b=c 中文' https://httpbin.org/post | jq -c .form
# {"msg":"a&b=c 中文"}
```

### `--json`：送 JSON（curl 7.82+）

`--json` 等於 `--data-binary` 加上 `Content-Type: application/json` 和 `Accept: application/json` 兩個 header：

```bash
curl -sS --json '{"name":"bill","age":30}' https://httpbin.org/post \
  | jq -c '{json, ct: .headers["Content-Type"], accept: .headers.Accept}'
# {"json":{"age":30,"name":"bill"},"ct":"application/json","accept":"application/json"}
```

7.82 以前的寫法是自己加 header：

```bash
curl -sS -H 'Content-Type: application/json' -d '{"name":"bill"}' https://httpbin.org/post
```

JSON 比較長時，用 heredoc 從 stdin 讀（`@-`），就不用跟 shell 的引號奮鬥：

```bash
curl -sS --json @- https://httpbin.org/post <<'EOF' | jq -c .json
{"orderId": 1001, "items": [{"sku": "A-1", "qty": 2}]}
EOF
# {"items":[{"qty":2,"sku":"A-1"}],"orderId":1001}
```

### JSON 裡要放變數：用 jq 組

`'{"name":"$NAME"}'` 在單引號裡，`$NAME` 不會展開；改成雙引號又要跳脫一堆 `\"`，而且值裡有引號就會產生壞掉的 JSON。用 `jq -n --arg` 組出 JSON，跳脫交給 jq 處理：

```bash
NAME='Bill "the dev"'
jq -n --arg name "$NAME" '{name: $name}' | curl -sS --json @- https://httpbin.org/post | jq -c .json
# {"name":"Bill \"the dev\""}
```

### Query string

`-G` 把 `-d` 的資料改成接在 URL 後面（變成 GET）：

```bash
curl -sS -G -d 'q=curl' -d 'page=2' https://httpbin.org/get | jq -c .args
# {"page":"2","q":"curl"}

curl -sS -G --data-urlencode 'q=中文 查詢' -d page=2 https://httpbin.org/get | jq -c '{args, url}'
# {"args":{"page":"2","q":"中文 查詢"},"url":"https://httpbin.org/get?q=%e4%b8%ad%e6%96%87+%e6%9f%a5%e8%a9%a2&page=2"}
```

`--url-query`（curl 7.87+）不必切換成 `-G` 模式，可以跟 `-d` 的 POST body 並存：

```bash
curl -sS --url-query 'q=a&b' --url-query page=1 https://httpbin.org/get | jq -c '{args, url}'
# {"args":{"page":"1","q":"a&b"},"url":"https://httpbin.org/get?q=a%26b&page=1"}
```

### multipart 表單：`-F`

上傳檔案用 `-F`，`@` 表示讀檔，`;type=` 指定該欄位的 Content-Type：

```bash
printf 'hello upload\n' > note.txt

curl -sS -F 'file=@note.txt;type=text/plain' -F 'desc=demo' https://httpbin.org/post \
  | jq -c '{files, form, ct: .headers["Content-Type"][0:30]}'
# {"files":{"file":"hello upload\n"},"form":{"desc":"demo"},"ct":"multipart/form-data; boundary="}
```

### PUT / PATCH / DELETE

`-T` 直接把檔案當 body，用 PUT 上傳：

```bash
curl -sS -T note.txt https://httpbin.org/put | jq -c '{data}'
# {"data":"hello upload\n"}
```

沒有專屬選項的方法才用 `-X`：

```bash
curl -sS -X PATCH --json '{"status":"PAID"}' https://httpbin.org/patch
curl -sS -X DELETE -o /dev/null -w '%{http_code}\n' https://httpbin.org/delete
# 200
```

man page 對 `-X` 的說明值得記住：它**只改變 request line 上的方法名稱，不改變 curl 的行為**。所以 `-X POST` 不會讓 curl 送出 body，`-X HEAD` 也不會讓 curl 停止等待 body。

---

## Header 操作

| 寫法 | 效果 |
|---|---|
| `-H 'X-Trace: abc'` | 新增 header；名稱跟內建 header 相同時會覆蓋 |
| `-H 'User-Agent:'` | 冒號後面空白：**移除** curl 預設會送的 header |
| `-H 'X-Empty;'` | 分號結尾：送出一個值為空的 header |
| `-A 'name/1.0'` | 設定 User-Agent |
| `-H @headers.txt` | 從檔案讀 header，一行一個 |

```bash
curl -sS -H 'User-Agent:' -H 'X-Empty;' -H 'X-Trace: abc' https://httpbin.org/headers \
  | jq -c '.headers | {ua: ."User-Agent", empty: ."X-Empty", trace: ."X-Trace"}'
# {"ua":null,"empty":"","trace":"abc"}

curl -sS -A 'order-service/1.4.2' https://httpbin.org/user-agent
# {
#   "user-agent": "order-service/1.4.2"
# }

printf 'X-Client: order-service\nAccept: application/json\n' > headers.txt
curl -sS -H @headers.txt https://httpbin.org/headers | jq -c '.headers | {"X-Client", Accept}'
# {"X-Client":"order-service","Accept":"application/json"}
```

`-H @file` 的另一個好處是 token 不會出現在命令列上，見下一節。

---

## 認證

### 先處理「機密出現在命令列」的問題

`curl -u bill:password` 或 `-H "Authorization: Bearer $TOKEN"` 展開後的完整命令列，同一台機器上的其他使用者用 `ps` 就看得到，直接打在終端機上的話還會留在 shell history。幾種避開的方法：

| 方法 | 寫法 |
|---|---|
| 互動輸入密碼 | `curl -u bill https://...`（只給帳號，curl 會提示輸入密碼） |
| `.netrc` | `curl --netrc-file ~/.netrc https://...`，檔案權限設成 600 |
| header 檔 | `curl -H @auth-headers.txt https://...` |
| 環境變數展開（curl 8.3+） | `curl --variable %API_TOKEN --expand-header 'Authorization: Bearer {{API_TOKEN}}' https://...` |

`.netrc` 的格式：

```text
machine api.example.com
  login bill
  password your-password
```

`--variable %NAME` 會匯入環境變數 `NAME`，再用 `--expand-` 前綴的選項以 `{{NAME}}` 展開。值是 curl 自己讀進來的，不會出現在 `ps` 看得到的參數裡。環境變數沒設定時會直接報錯，不會送出空的 header：

```bash
curl -sS --variable %NOT_SET_VAR --expand-header 'X-A: {{NOT_SET_VAR}}' https://httpbin.org/headers
# curl: option --variable: variable expansion failure
# curl: try 'curl --help' or 'curl --manual' for more information
```

### Basic / Bearer / API Key

```bash
# HTTP Basic：curl 會自動做 base64 並送出 Authorization: Basic ...
curl -u username:password https://api.example.com/user

# Bearer token（JWT 等）
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/protected
curl --oauth2-bearer "$TOKEN" https://api.example.com/protected     # 等價寫法

# API Key 放 header（不要放在 query string，會留在 access log 和瀏覽紀錄裡）
curl -H "X-API-Key: $API_KEY" https://api.example.com/data
```

### OAuth 2.0 client credentials

先拿 token、再呼叫 API，用 `jq -r` 取出 token 存進變數：

```bash
TOKEN=$(curl -fsS -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d grant_type=client_credentials \
  https://auth.example.com/oauth2/token | jq -r .access_token)

curl -fsS -H "Authorization: Bearer $TOKEN" https://api.example.com/orders
```

`-f` 很重要：拿 token 失敗時，curl 會直接失敗，而不是把錯誤頁交給 `jq` 解析出 `null`，再拿 `null` 去呼叫 API。

### mTLS（client certificate）

```bash
curl --cert client.crt --key client.key --cacert ca.crt https://secure.example.com
```

---

## Cookie 與 session

| 選項 | 作用 |
|---|---|
| `-b 'k=v; k2=v2'` | 直接送出 cookie |
| `-b jar.txt` | 從檔案讀 cookie |
| `-c jar.txt` | 把收到的 cookie 寫進檔案（cookie jar） |

```bash
curl -sS -c jar.txt -o /dev/null 'https://httpbin.org/cookies/set?theme=dark'
grep -v '^#' jar.txt | grep -v '^$'
# httpbin.org	FALSE	/	FALSE	0	theme	dark

curl -sS -b jar.txt https://httpbin.org/cookies | jq -c .cookies
# {"theme":"dark"}

curl -sS -b 'theme=dark; lang=zh' https://httpbin.org/cookies | jq -c .cookies
# {"lang":"zh","theme":"dark"}
```

模擬登入後操作的流程：

```bash
# 登入，保存 session cookie
curl -c session.txt -d 'username=john&password=secret' https://example.com/login

# 帶著 session 存取需要登入的頁面；同時用 -c 更新 cookie
curl -b session.txt -c session.txt https://example.com/dashboard
```

---

## 下載與上傳

### 下載

```bash
curl -O https://example.com/file.zip                 # 用遠端檔名存檔
curl -o myfile.zip https://example.com/file.zip      # 自訂檔名
curl -C - -O https://example.com/large.iso           # 斷點續傳
curl --limit-rate 1M -O https://example.com/file.zip # 限速
curl -# -O https://example.com/file.zip              # 簡潔的進度條
```

`--output-dir`（curl 7.73+）指定存放目錄，搭配 `--create-dirs` 自動建立目錄：

```bash
curl -sS --output-dir dl --create-dirs -O https://httpbin.org/robots.txt && ls dl
# robots.txt
```

`-r` 只下載指定的 byte 範圍（伺服器要支援 Range）：

```bash
curl -sS -r 0-9 https://httpbin.org/range/100; echo
# abcdefghij
```

### 失敗時不要留下壞檔案

不加 `-f` 時，伺服器的錯誤頁會被當成檔案內容存下來。下面這個例子 500 的 body 剛好是空的，結果就是留下一個 0 byte 的「下載成功」檔案：

```bash
curl -sS -o bad.json https://httpbin.org/status/500; ls -l bad.json | awk '{print $5, $NF}'
# 0 bad.json
```

`-f` 加上 `--remove-on-error`（curl 7.83+），失敗時就不會留下檔案：

```bash
curl -sS -f --remove-on-error -o bad.json https://httpbin.org/status/500; ls bad.json
# curl: (56) The requested URL returned error: 500
# ls: bad.json: No such file or directory
```

### 有變更才下載：ETag（curl 7.68+）

```bash
curl -sS --etag-save etag.txt -o /dev/null -w '%{http_code}\n' https://httpbin.org/etag/v1; cat etag.txt
# 200
# v1

curl -sS --etag-compare etag.txt -o /dev/null -w '%{http_code}\n' https://httpbin.org/etag/v1
# 304
```

第二次請求帶上 `If-None-Match`，伺服器回 304 表示沒變，不必重新下載。

### URL globbing

curl 自己就支援 `[1-10]` 範圍和 `{a,b}` 列舉，輸出檔名可以用 `#1` 引用第一個 glob 的值：

```bash
curl -sS --create-dirs -o 'out/item_#1.json' 'https://httpbin.org/anything/[1-3]' && ls out
# item_1.json
# item_2.json
# item_3.json

curl -sS -o /dev/null -w '%{url_effective} %{http_code}\n' 'https://httpbin.org/status/{200,404}'
# https://httpbin.org/status/200 200
# https://httpbin.org/status/404 404
```

副作用是 URL 裡真的有 `[]` 時（例如 `a[0]=x` 這種 query），會被當成 glob 而報錯。用 `-g` 關掉 globbing：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' 'https://httpbin.org/anything?a[0]=x'
# curl: (3) bad range in URL position 32:
# https://httpbin.org/anything?a[0]=x
#                                ^

curl -sS -g -o /dev/null -w '%{http_code}\n' 'https://httpbin.org/anything?a[0]=x'
# 200
```

---

## 連線與 DNS 控制

### `--resolve`：不改 hosts 檔，指定要連的 IP

情境：新機器上線前想先驗證、DNS 切換前想先測新 IP、想繞過 load balancer 直接打其中一台。`--resolve host:port:ip` 只對這一次請求生效。前面 `-v` 的輸出顯示 example.com 解析出兩個 IP（`IPv4: 104.20.23.154, 172.66.147.243`），用 `--resolve` 指定其中一個：

```bash
curl -sS --resolve example.com:443:172.66.147.243 -o /dev/null -w '%{remote_ip} %{http_code}\n' https://example.com
# 172.66.147.243 200

curl -sv --resolve example.com:443:172.66.147.243 https://example.com -o /dev/null 2>&1 \
  | grep -iE 'added|connected to|subject:|^> host'
# * Added example.com:443:172.66.147.243 to DNS cache
# * Connected to example.com (172.66.147.243) port 443
# *  subject: CN=example.com
# > Host: example.com
```

`-v` 裡可以看到 curl 把這筆對應加進 DNS cache，而憑證和 `Host` header 都還是 example.com。

### 為什麼不能只改 `Host` header

直覺做法是「連 IP，再用 `-H 'Host: ...'` 指定網域」。在 HTTP 上可行，但在 HTTPS 上會失敗：TLS handshake 發生在送出 `Host` header **之前**，那時 curl 只知道 URL 裡的 IP。SNI 不能放 IP，所以 curl 不會送 SNI，憑證也是拿 IP 去比對：

```bash
curl -sS -H 'Host: example.com' -o /dev/null https://172.66.147.243/
# curl: (35) LibreSSL/3.3.6: error:1404B410:SSL routines:ST_CONNECT:sslv3 alert handshake failure

curl -sS -k -H 'Host: example.com' -o /dev/null https://172.66.147.243/
# curl: (35) LibreSSL/3.3.6: error:1404B410:SSL routines:ST_CONNECT:sslv3 alert handshake failure
```

連 `-k` 都救不了：Cloudflare 這類 CDN 收到沒有 SNI 的連線，會直接拒絕 handshake（exit 35）。其他伺服器可能會回傳一張預設憑證，再因為名稱不符而失敗（exit 60）。

`--resolve` 讓 URL 維持原本的網域，SNI、憑證驗證和 `Host` header 全都正確，只有「連到哪個 IP」被換掉。

### `--connect-to`：把 host:port 對應到另一個 host:port

比 `--resolve` 更彈性，目標可以是另一個主機名稱或不同的 port，格式是 `原host:原port:新host:新port`：

```bash
curl -sS --connect-to example.com:443:172.66.147.243:443 -o /dev/null -w '%{remote_ip} %{http_code}\n' https://example.com
# 172.66.147.243 200

# 典型用法：打 LB 後面的某一台，或打到另一個 port 上的新版服務
curl --connect-to api.example.com:443:api-node-2.internal:8443 https://api.example.com/actuator/health
```

### 其他連線控制

```bash
curl -sS -4 -o /dev/null -w '%{remote_ip}\n' https://example.com   # 只用 IPv4
# 172.66.147.243

curl -6 https://example.com        # 只用 IPv6

# 透過 Unix domain socket 呼叫 Docker Engine API（需要 Docker daemon，僅列寫法）
curl -sS --unix-socket /var/run/docker.sock http://localhost/containers/json | jq '.[].Names'
```

### Proxy

```bash
curl -x http://proxy.example.com:8080 https://httpbin.org/ip              # 指定 HTTP proxy
curl --socks5-hostname localhost:1080 https://httpbin.org/ip              # SOCKS5，DNS 也交給 proxy 解析
curl --proxy-user username:password -x http://proxy.example.com:8080 https://httpbin.org/ip
curl --noproxy '*' https://internal.example.com                           # 這次請求不走 proxy
```

curl 會自動讀取 `HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` 這些環境變數（`-v` 會印出 `Uses proxy env variable ...`）。但不是每個工具都會這樣做，例如 JVM 就不讀這些環境變數，要另外用 `-Dhttps.proxyHost` 這類 system property 設定。所以「curl 連得到、Java 程式連不到」時，可以先往 proxy 設定的方向查。

---

## Timeout 與 Retry

### 兩種 timeout

| 選項 | 管的範圍 |
|---|---|
| `--connect-timeout N` | 只管建立連線（DNS + TCP + TLS） |
| `-m N` / `--max-time N` | 整個請求的總時間上限 |

```bash
curl -sS -m 2 https://httpbin.org/delay/5
# curl: (28) Operation timed out after 2005 milliseconds with 0 bytes received
```

`--connect-timeout` 用在「對方完全沒回應」的情況，例如防火牆直接丟掉封包。對一個不會回應的 IP 實測：

```bash
curl -sS --connect-timeout 2 http://10.255.255.1/
# curl: (28) Failed to connect to 10.255.255.1 port 80 after 2004 ms: Timeout was reached
```

對照之下，port 沒開的時候對方會立刻拒絕連線，那是 exit 7，不會等到 timeout：

```bash
curl -sS http://127.0.0.1:9/
# curl: (7) Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server
```

**腳本裡一定要設 `-m`**。curl 預設沒有總時間上限，遇到對方卡住，腳本就會一直掛著。

### `--retry`：預設就是指數退避

依 man page，`--retry N` 只會在**暫時性錯誤**時重試：timeout、HTTP 408、429、500、502、503、504。等待時間從 1 秒開始，每次加倍，最多到 10 分鐘；如果回應有 `Retry-After` header，會照著它的時間等。

```bash
curl --retry 2 -o /dev/null https://httpbin.org/status/503 2>&1 | grep Warning
# Warning: Problem : HTTP error. Will retry in 1 seconds. 2 retries left.
# Warning: Problem : HTTP error. Will retry in 2 seconds. 1 retries left.
```

加上 `--retry-delay` 會**關閉指數退避**，改成固定間隔：

```bash
curl --retry 2 --retry-delay 3 -o /dev/null https://httpbin.org/status/503 2>&1 | grep Warning
# Warning: Problem : HTTP error. Will retry in 3 seconds. 2 retries left.
# Warning: Problem : HTTP error. Will retry in 3 seconds. 1 retries left.
```

（這兩次實測，總耗時分別是 4 秒和 8 秒。）

404 這類用戶端錯誤不屬於暫時性錯誤，所以不會重試：

```bash
curl --retry 2 -sS -o /dev/null -w '%{http_code}\n' https://httpbin.org/status/404
# 404                      <- 沒有任何重試
```

其他相關選項：

| 選項 | 作用 |
|---|---|
| `--retry-max-time N` | 重試的總時間上限（秒） |
| `--retry-connrefused`（7.52+） | 連線被拒（服務還沒起來）也算暫時性錯誤 |
| `--retry-all-errors`（7.71+） | 任何錯誤都重試 |

`--retry-all-errors` 要搭配 `-f`，否則 404 對 curl 來說根本不是錯誤。man page 稱它為重試的「大鐵鎚」，不建議當成預設值：對非冪等的請求（例如建立訂單的 POST）重試，可能會重複送出資料。

```bash
# 連線被拒：預設不重試，加了 --retry-connrefused 才會（共 3 次嘗試）
curl -sS --retry 2 --retry-connrefused http://127.0.0.1:9/
# curl: (7) Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server
# curl: (7) Failed to connect to 127.0.0.1 port 9 after 0 ms: Couldn't connect to server
# curl: (7) Failed to connect to 127.0.0.1 port 9 after 1 ms: Couldn't connect to server

# 404：-f 讓它變成錯誤，--retry-all-errors 讓它被重試（56 的原因見前面 -f 一節）
curl -sS -f --retry 2 --retry-all-errors -o /dev/null https://httpbin.org/status/404
# curl: (56) The requested URL returned error: 404
# curl: (56) The requested URL returned error: 404
# curl: (56) The requested URL returned error: 404
```

---

## `-w`：輸出指定的資訊

`-w`（`--write-out`）在請求完成後，依指定格式輸出變數。最常用的是只看狀態碼：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://httpbin.org/status/503
# 503
```

### 延遲拆解

`time_*` 系列變數都是**從請求開始累計**的時間，要相減才能得到各階段各花多久：

| 變數 | 累計到 |
|---|---|
| `time_namelookup` | DNS 解析完成 |
| `time_connect` | TCP 連線建立 |
| `time_appconnect` | TLS handshake 完成 |
| `time_pretransfer` | 準備開始傳送 |
| `time_starttransfer` | 收到第一個 byte（TTFB） |
| `time_total` | 全部完成 |

```bash
curl -sS -o /dev/null \
  -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total}\n' \
  https://httpbin.org/delay/1 \
| awk '{printf "dns=%.3f tcp=%.3f tls=%.3f server=%.3f transfer=%.3f total=%.3f\n",
        $1, $2-$1, $3-$2, $4-$3, $5-$4, $5}'
# dns=0.007 tcp=0.217 tls=0.292 server=1.221 transfer=0.001 total=1.737
```

`server` 那一段（TLS 完成到收到第一個 byte）大致就是伺服器處理請求的時間。這裡打的是 `/delay/1`（伺服器刻意延遲 1 秒），所以 `server` 約 1.2 秒；`tcp` 和 `tls` 各花了 0.2～0.3 秒，是因為 httpbin 的機器在美國，光是往返就很久。API 慢的時候，先用這個確認是網路、TLS 還是伺服器本身慢。

常用的格式也可以存成檔案，用 `-w @檔名` 讀取。建立 `curl-format.txt`：

```text
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
```

```bash
curl -w "@curl-format.txt" -o /dev/null -s https://example.com
```

多跑幾次取平均：

```bash
for i in $(seq 1 10); do
  curl -sS -o /dev/null -w '%{time_total}\n' https://example.com
done | awk '{sum += $1} END {printf "avg=%.3fs\n", sum/NR}'
```

### 其他實用變數

| 變數 | 內容 |
|---|---|
| `%{http_code}` / `%{response_code}` | 狀態碼 |
| `%{url_effective}` | 最終 URL（跟過 redirect 之後） |
| `%{num_redirects}` | redirect 次數 |
| `%{remote_ip}` / `%{remote_port}` | 實際連到的 IP 與 port |
| `%{http_version}` | 實際使用的 HTTP 版本 |
| `%{exitcode}` / `%{errormsg}`（7.75+） | curl 的 exit code 和錯誤訊息 |
| `%header{name}`（7.84+） | 某個 response header 的值 |
| `%{header_json}`（7.83+） | 所有 response header，JSON 格式 |
| `%{json}`（7.70+） | 所有 `-w` 變數，JSON 格式 |

```bash
curl -sS -o /dev/null -w '%header{content-type}\n' https://httpbin.org/get
# application/json

curl -sS -m 2 -o /dev/null -w 'exit=%{exitcode} msg=%{errormsg}\n' https://httpbin.org/delay/5
# curl: (28) Operation timed out after 2001 milliseconds with 0 bytes received
# exit=28 msg=Operation timed out after 2001 milliseconds with 0 bytes received
```

`%{json}` 搭配 jq 最方便，挑出需要的欄位就好：

```bash
curl -sS -o /dev/null -w '%{json}' https://example.com \
  | jq -c '{response_code, http_version, remote_ip, time_total, num_connects, exitcode}'
# {"response_code":200,"http_version":"2","remote_ip":"172.66.147.243","time_total":0.095061,"num_connects":1,"exitcode":0}
```

順便可以查出你的 curl 版本支援哪些變數（8.7.1 的結果）：

```bash
curl -sS -o /dev/null -w '%{json}' https://httpbin.org/get | jq -r 'keys | join(" ")'
# certs conn_id content_type curl_version errormsg exitcode filename_effective ftp_entry_path http_code http_connect http_version local_ip local_port method num_certs num_connects num_headers num_redirects proxy_ssl_verify_result proxy_used redirect_url referer remote_ip remote_port response_code scheme size_download size_header size_request size_upload speed_download speed_upload ssl_verify_result time_appconnect time_connect time_namelookup time_pretransfer time_redirect time_starttransfer time_total url url.fragment url.host url.options url.password url.path url.port url.query url.scheme url.user url.zoneid url_effective urle.fragment urle.host urle.options urle.password urle.path urle.port urle.query urle.scheme urle.user urle.zoneid urlnum xfer_id
```

版本差異確實存在。例如 `%{num_retries}` 是比 8.7.1 更新的版本才有的：

```bash
curl -sS --retry 2 -o /dev/null -w '%{http_code} retries=%{num_retries}\n' https://httpbin.org/status/404
# curl: unknown --write-out variable: 'num_retries'
# 404 retries=
```

---

## 連線重用、並行與壓縮

### 連線重用只發生在同一個 curl 指令裡

分開執行的兩個 `curl` 是兩個獨立的 process，彼此不會共用連線。要重用連線，得在**同一個 curl 指令**裡放多個 URL：

```bash
curl -sv https://example.com/ https://example.com/ -o /dev/null -o /dev/null 2>&1 \
  | grep -iE 'connected to|re-?us|left intact'
# * Connected to example.com (172.66.147.243) port 443
# * Connection #0 to host example.com left intact
# * Re-using existing connection with host example.com
# * Connection #0 to host example.com left intact
```

第二個請求直接沿用 `Connection #0`，省掉 DNS、TCP 和 TLS handshake。從上一節的延遲拆解來看，光是 TCP + TLS 就可能是好幾百毫秒，批次呼叫時差別很大。

另外，`--keepalive-time` 常被誤會成 HTTP Keep-Alive。依 man page，它設定的是 **TCP keepalive probe**：連線閒置多久之後開始送 probe 偵測斷線，跟 HTTP 層的連線重用無關。

### `-Z`：原生並行（curl 7.66+）

不用 `&` 或 `xargs -P`，curl 自己就能並行。`--parallel-max` 控制同時進行的數量（預設 50）：

```bash
curl -sS -Z --parallel-max 2 -o /dev/null 'https://httpbin.org/delay/1?n=[1-4]'
# 實測總耗時約 3 秒

curl -sS -o /dev/null -o /dev/null -o /dev/null -o /dev/null 'https://httpbin.org/delay/1?n=[1-4]'
# 不加 -Z 依序執行，實測約 5 秒
```

### `--compressed`：不要手動設 Accept-Encoding

手動加 `Accept-Encoding: gzip` header，伺服器真的回傳 gzip，但 curl **不會**幫你解壓縮，終端機就會印出二進位的亂碼：

```bash
curl -sS -H 'Accept-Encoding: gzip' https://httpbin.org/gzip | head -c 16 | od -c | head -1
# 0000000  037 213  \b  \0  \0  \0  \0  \0  \0 377   L 316   A   ʃ  **   0
```

開頭的 `037 213`（0x1f 0x8b）就是 gzip 的 magic number。用 `--compressed`，curl 會自己送 Accept-Encoding，收到後自動解壓縮：

```bash
curl -sS --compressed https://httpbin.org/gzip | jq -c '{gzipped}'
# {"gzipped":true}
```

### HTTP 版本

```bash
curl --http1.1 https://example.com               # 強制 HTTP/1.1
curl --http2 https://example.com                 # HTTPS 預設就會透過 ALPN 嘗試 h2
curl --http2-prior-knowledge http://localhost:8080   # 明文 HTTP/2（h2c），常見於內部服務
curl -sS -o /dev/null -w '%{http_version}\n' https://example.com   # 看實際用了哪一版

curl -sS --http3 https://example.com             # macOS 內建 curl 不支援
# curl: option --http3: the installed libcurl version doesn't support this
```

---

## Exit code 對照

腳本裡判斷失敗原因，看 exit code 最直接。常見的幾個（完整清單見 `man curl` 的 EXIT CODES 一節）：

| Exit code | 意思 | 常見原因 |
|---|---|---|
| 3 | URL 格式錯誤 | URL 裡有 `[]` 沒加 `-g` |
| 6 | 無法解析主機名稱 | DNS 問題、網域打錯 |
| 7 | 無法連線 | port 沒開、服務還沒起來 |
| 18 | 傳輸不完整 | 用了 `-X HEAD` |
| 22 | HTTP 回應 ≥ 400 | 搭配 `-f` 時才會出現；macOS curl 8.7.1 走 HTTP/2 時實測會變成 56 |
| 26 | 讀取本機檔案失敗 | `-d @檔名`、`-T` 的檔案不存在 |
| 28 | 逾時 | `-m` 或 `--connect-timeout` 時間到 |
| 35 | TLS handshake 失敗 | 協定或加密套件不相容 |
| 47 | redirect 次數超過上限 | `--max-redirs` |
| 52 | 伺服器沒有回應任何內容 | 服務在回應前就斷線 |
| 56 | 接收資料失敗 | 連線被重設；也見上面 22 那一列 |
| 60 | 憑證驗證失敗 | 過期、自簽、網域不符 |

憑證過期的實測：

```bash
curl -sS https://expired.badssl.com/
# curl: (60) SSL certificate problem: certificate has expired
# More details here: https://curl.se/docs/sslcerts.html
#
# curl failed to verify the legitimacy of the server and therefore could not
# establish a secure connection to it. To learn more about this situation and
# how to fix it, please visit the web page mentioned above.
```

在腳本裡取得 exit code，記得在 `else` 分支第一行就讀 `$?`：

```bash
if body=$(curl -fsS --max-time 2 https://httpbin.org/delay/5); then
  echo "$body" | jq .
else
  rc=$?
  echo "request failed: exit=$rc"
fi
# curl: (28) Operation timed out after 2004 milliseconds with 0 bytes received
# request failed: exit=28
```

---

## 設定檔：`.curlrc` 與 `-K`

curl 啟動時會自動讀 `~/.curlrc`。格式是一行一個選項，不需要前面的 `--`：

```text
silent
show-error
max-time = 10
```

`-K` 指定要讀的設定檔：

```bash
printf 'silent\nshow-error\nmax-time = 10\n' > myrc
curl -K myrc -o /dev/null -w '%{http_code}\n' https://httpbin.org/get
# 200
```

`.curlrc` 方便，但也危險：裡面如果寫了 `insecure` 或 `retry-all-errors`，會默默影響每一次 curl。寫給別人用的腳本，**把 `-q` 放在第一個參數**，就不會讀 `.curlrc`，行為才可以重現：

```bash
curl -q -fsS https://api.example.com/health
```

---

## TLS 相關

### `-k` / `--insecure`

`-k` 跳過憑證驗證，等於關掉 HTTPS 防中間人攻擊（MITM）的保護。只該出現在本機測試自簽憑證的環境。正確做法是告訴 curl 要信任哪個 CA：

```bash
curl --cacert /path/to/ca.crt https://internal-service/
SSL_CERT_FILE=/path/to/ca-bundle.crt curl https://internal-service/
```

（`--ca-native` 可以改用作業系統的憑證庫，但依 8.7.1 的 man page，這個選項只在 Windows 上有效。）

### 指定 TLS 版本

```bash
curl --tlsv1.2 https://example.com                    # 最低 TLS 1.2
curl --tlsv1.2 --tls-max 1.2 https://example.com      # 剛好 TLS 1.2（--tls-max 是 7.54+）
```

用來確認伺服器還支不支援舊版 TLS，或是排查「某個用戶端連不上」的問題。

### 看憑證

`-w '%{certs}'`（curl 7.88+）直接印出憑證鏈的細節，不必另外開 openssl：

```bash
curl -sS -w '%{certs}' -o /dev/null https://example.com | head -12
# Subject:CN = example.com
# Issuer:C = US, O = SSL Corporation, CN = Cloudflare TLS Issuing ECC CA 3
# Version:2
# Serial Number:01eee6aabb521d5e14fc315fd9985690
# Signature Algorithm:ecdsa-with-SHA256
# Public Key Algorithm:id-ecPublicKey
# X509v3 Basic Constraints:CA:FALSE
# X509v3 Authority Key Identifier:keyid:83:03:FD:E7:F6:F5:4A:4D:15:41:F4:ED:22:16:D3:32:0A:3E:CA:66
# Authority Information Access:CA Issuers - URI:http://i.cf-i.ssl.com/Cloudflare-TLS-I-E3.cer
# OCSP - URI:http://o.cf-i.ssl.com
# X509v3 Subject Alternative Name:DNS:example.com, DNS:*.example.com
# X509v3 Certificate Policies:Policy: 2.23.140.1.2.1
```

依 man page，這個變數只支援 OpenSSL、GnuTLS、Schannel 和 Secure Transport 這幾種 TLS 實作。

更完整的憑證檢查（憑證鏈、到期日、SAN）用 `openssl s_client`，見 [openssl](/post/cli/openssl/)。

### HSTS

curl 支援 HSTS，但要自己指定快取檔（`--hsts file`，7.74+），也沒有瀏覽器內建的 preload 清單。所以「curl 用 http:// 打得到」不代表瀏覽器也會用 http://：網域在 HSTS 清單上的話，瀏覽器會強制升級成 HTTPS。

---

## 後端實戰情境

### Spring Boot Actuator health check

```bash
curl -fsS -m 5 http://localhost:8080/actuator/health | jq -e '.status == "UP"' > /dev/null \
  && echo healthy || echo unhealthy
```

`jq -e` 會依結果設定 exit code，`true` 為 0、`false` 或 `null` 為 1：

```bash
echo '{"status":"UP"}' | jq -e '.status == "UP"' > /dev/null; echo "exit=$?"
# exit=0

echo '{"status":"DOWN"}' | jq -e '.status == "UP"' > /dev/null; echo "exit=$?"
# exit=1
```

這樣就能直接放進 CI、Kubernetes 的 exec probe 或部署腳本。jq 的用法見 [jq](/post/cli/jq/)。

### CI / docker compose 裡等服務啟動

```bash
curl -fsS --retry 30 --retry-delay 2 --retry-connrefused -m 5 -o /dev/null \
  http://localhost:8080/actuator/health
```

服務還在啟動時，連線會被拒（exit 7）；`--retry-connrefused` 讓這種情況也會重試。固定每 2 秒重試一次，最多 30 次（約 1 分鐘）。

### 驗證新機器或藍綠部署

```bash
curl -fsS --resolve api.example.com:443:10.0.1.23 https://api.example.com/actuator/info
```

DNS 還沒切換前，先確認新機器上的服務、憑證和設定都正確。

### Kubernetes 裡的服務

需要叢集環境，僅列寫法：

```bash
# 從本機打叢集內的 service
kubectl port-forward svc/order-service 8080:80 &
curl -sS localhost:8080/actuator/info

# 從另一個 pod 裡面打（確認叢集內部的 DNS 與網路）
kubectl exec -it deploy/order-service -- curl -sS http://payment-service/actuator/health
```

### 批次呼叫

globbing、`-Z` 和 `-w` 組合起來，一行就能批次確認一組資源：

```bash
curl -sS -Z -o /dev/null -w '%{http_code} %{url_effective}\n' \
  'https://api.example.com/orders/{1001,1002,1003}'
```

### 重放請求

- **重放 webhook**：把收到的 payload 存成檔案，用 `curl --json @payload.json https://...` 重送。
- **Copy as cURL**：瀏覽器 DevTools 的 Network 面板，在請求上按右鍵就能「Copy as cURL」，把前端遇到的問題完整地在終端機重現。複製出來的指令通常有一大堆 header，可以逐一刪除，找出是哪個 header 造成問題。

---

## 常見陷阱

### URL 沒加引號

```bash
curl https://httpbin.org/get?a=1&b=2
```

在 zsh 裡，`?` 是 glob 字元，會直接報錯：

```text
zsh: no matches found: https://httpbin.org/get?a=1
```

在 bash 裡更隱晦：`&` 會把 `curl https://httpbin.org/get?a=1` 丟到背景執行，`b=2` 則變成一個變數設定。結果是請求只帶了 `a=1`，而且沒有任何錯誤訊息。**URL 一律加單引號。**

### 用 `-d` 打 JSON API

`-d` 的預設 Content-Type 是 `application/x-www-form-urlencoded`。Spring 的 `@RequestBody` 端點收到這個 Content-Type，會回 `415 Unsupported Media Type`。送 JSON 用 `--json`（7.82+），或明確加上 `-H 'Content-Type: application/json'`。

### `-X GET -d`

這樣會送出一個帶 body 的 GET，大部分伺服器會忽略 body。想把參數放在 query string，用 `-G -d` 或 `--url-query`。

### 解析 header 時的 `\r`

HTTP header 每行以 CRLF（`\r\n`）結尾。用 `-D -` 或 `-i` 取出 header 再用 shell 處理時，值的尾巴會多一個 `\r`：

```bash
curl -sS -D - -o /dev/null https://httpbin.org/get | grep -i '^content-type' | od -c | tail -2
# 0000020    p   l   i   c   a   t   i   o   n   /   j   s   o   n  \r  \n
```

拿去做字串比對時永遠不會相等。加上 `tr -d '\r'`，或直接改用 `-w '%header{content-type}'`。

### 單引號裡的變數不會展開

`-d '{"name":"$NAME"}'` 送出的就是字面上的 `$NAME`。用前面介紹的 `jq -n --arg` 組 JSON。

---

## 參考資料

- [curl man page](https://curl.se/docs/manpage.html)（本機：`man curl`）
- [Everything curl](https://everything.curl.dev/)
- [cURL Tutorial](https://curl.se/docs/tutorial.html)
- [libcurl error codes](https://curl.se/libcurl/c/libcurl-errors.html)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [httpbin.org](https://httpbin.org/)（本文的測試端點）
- [REST API 設計指南](https://restfulapi.net/)
- [JSON API 規範](https://jsonapi.org/)
