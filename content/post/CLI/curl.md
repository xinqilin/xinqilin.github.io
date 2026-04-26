---
title: "cURL 完整指南：HTTP 客戶端工具與 API 測試利器"
author: Bill.Lin
date: 2021-08-03T10:23:31+08:00
draft: false
tags: ["cURL", "HTTP", "API", "REST", "Web Development", "Command Line", "Network"]
Description: "深入解析 cURL 工具的完整用法，包含 HTTP 請求、API 測試、檔案傳輸與網路除錯的專業應用"
Categories: ["Tools"]
DisableComments: false
aliases:
  - /post/Tools/Curl/

---

## 概述

cURL（Client URL）是一個功能強大的命令行工具和函式庫，用於傳輸各種網路協定的資料。它支援 HTTP、HTTPS、FTP、SFTP、TELNET 等多種協定，是開發者進行 API 測試、網路除錯和自動化腳本的必備工具。

### 核心特徵

- **多協定支援**：HTTP/HTTPS、FTP、SFTP、SMTP、POP3 等
- **豐富的選項**：支援各種 HTTP 方法、標頭、認證方式
- **跨平台**：適用於 Linux、macOS、Windows 等系統
- **腳本友好**：輸出格式化，適合自動化處理
- **安全性**：支援 SSL/TLS、各種認證機制

## 基本語法

```bash
curl [選項] [URL]
```

### 簡單範例

```bash
# 基本 GET 請求
curl https://httpbin.org/get

# 查看 HTTP 響應標頭
curl -I https://google.com

# 下載檔案
curl -o filename.html https://example.com

# 靜默模式
curl -s https://api.github.com/users/octocat
```

## 核心選項詳解

### 基本操作選項

```bash
# 輸出控制
-o, --output <file>         # 將輸出寫入檔案
-O, --remote-name          # 使用遠程檔案名稱儲存
-s, --silent               # 靜默模式，不顯示進度
-S, --show-error           # 顯示錯誤訊息
-v, --verbose              # 詳細輸出模式
-w, --write-out <format>   # 自訂輸出格式

# 基本範例
curl -o index.html https://example.com
curl -O https://example.com/file.zip
curl -s https://api.example.com/data
curl -v https://httpbin.org/get
```

### HTTP 方法選項

```bash
# 請求方法
-X, --request <method>     # 指定 HTTP 方法
-G, --get                  # 強制使用 GET 方法
-I, --head                 # 只獲取 HTTP 標頭 (HEAD 方法)

# 範例
curl -X POST https://httpbin.org/post
curl -X PUT https://httpbin.org/put
curl -X DELETE https://httpbin.org/delete
curl -X PATCH https://httpbin.org/patch
curl -I https://httpbin.org/headers
```

### 資料傳送選項

```bash
# 資料傳送
-d, --data <data>          # 發送 POST 資料
-d @filename               # 從檔案讀取資料
-F, --form <name=content>  # 表單資料 (multipart/form-data)
-T, --upload-file <file>   # 上傳檔案

# JSON 資料範例
curl -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "age": 30}'

# 表單資料範例
curl -X POST https://httpbin.org/post \
  -F "name=John" \
  -F "file=@upload.txt"

# 從檔案讀取資料
curl -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d @data.json
```

### HTTP 標頭選項

```bash
# 標頭設定
-H, --header <header>      # 添加自訂標頭
-A, --user-agent <agent>   # 設定 User-Agent
-e, --referer <URL>        # 設定 Referer
-i, --include              # 在輸出中包含響應標頭

# 範例
curl -H "Authorization: Bearer token123" https://api.example.com
curl -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     https://api.example.com

curl -A "MyApp/1.0" https://httpbin.org/user-agent
curl -e "https://google.com" https://httpbin.org/headers
curl -i https://httpbin.org/get
```

## HTTP 方法應用

### GET 請求

```bash
# 基本 GET 請求
curl https://jsonplaceholder.typicode.com/posts

# 帶查詢參數的 GET
curl "https://jsonplaceholder.typicode.com/posts?userId=1"

# 使用 -G 和 -d 構建查詢字串
curl -G -d "userId=1" -d "id=1" https://jsonplaceholder.typicode.com/posts

# 帶認證的 GET
curl -H "Authorization: Bearer your-token" https://api.example.com/user

# 自訂 User-Agent
curl -A "Mozilla/5.0 (Custom Agent)" https://httpbin.org/user-agent
```

### POST 請求

```bash
# JSON 資料 POST
curl -X POST https://jsonplaceholder.typicode.com/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Post",
    "body": "This is the content",
    "userId": 1
  }'

# 表單資料 POST
curl -X POST https://httpbin.org/post \
  -d "username=john" \
  -d "password=secret"

# 檔案上傳 POST
curl -X POST https://httpbin.org/post \
  -F "file=@document.pdf" \
  -F "description=Important document"

# URL 編碼資料
curl -X POST https://httpbin.org/post \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John%20Doe&email=john%40example.com"
```

### PUT 和 PATCH 請求

```bash
# PUT 更新資源
curl -X PUT https://jsonplaceholder.typicode.com/posts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "title": "Updated Title",
    "body": "Updated content",
    "userId": 1
  }'

# PATCH 部分更新
curl -X PATCH https://jsonplaceholder.typicode.com/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Partially Updated Title"}'

# 檔案替換上傳
curl -X PUT https://api.example.com/files/document.pdf \
  -T document.pdf \
  -H "Authorization: Bearer token"
```

### DELETE 請求

```bash
# 基本 DELETE
curl -X DELETE https://jsonplaceholder.typicode.com/posts/1

# 帶認證的 DELETE
curl -X DELETE https://api.example.com/users/123 \
  -H "Authorization: Bearer your-token"

# 帶確認資料的 DELETE
curl -X DELETE https://api.example.com/dangerous-action \
  -H "Content-Type: application/json" \
  -d '{"confirm": true, "reason": "No longer needed"}'
```

## 認證與安全

### 基本認證

```bash
# HTTP Basic Authentication
curl -u username:password https://httpbin.org/basic-auth/username/password

# 從提示輸入密碼
curl -u username https://httpbin.org/basic-auth/username/password

# 使用 Base64 編碼
curl -H "Authorization: Basic $(echo -n username:password | base64)" \
     https://httpbin.org/basic-auth/username/password
```

### Bearer Token 認證

```bash
# JWT Token
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.example.com/protected

# API Key in Header
curl -H "X-API-Key: your-api-key" https://api.example.com/data

# API Key in Query
curl "https://api.example.com/data?api_key=your-api-key"
```

### OAuth 2.0

```bash
# 獲取存取令牌
curl -X POST https://oauth.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret"

# 使用存取令牌
curl -H "Authorization: Bearer access-token" \
     https://api.example.com/protected-resource
```

### SSL/TLS 選項

```bash
# SSL 相關選項
-k, --insecure             # 允許不安全的 SSL 連接
--cert <certificate>       # 客戶端證書
--key <private-key>        # 私鑰檔案
--cacert <CA-certificate>  # CA 證書檔案

# 範例
curl -k https://self-signed.example.com
curl --cert client.crt --key client.key https://secure.example.com
curl --cacert ca-bundle.crt https://secure.example.com
```

## Cookie 處理

### Cookie 基本操作

```bash
# 發送 Cookie
curl -b "session=abc123; user=john" https://httpbin.org/cookies

# 從檔案讀取 Cookie
curl -b cookies.txt https://httpbin.org/cookies

# 儲存 Cookie 到檔案
curl -c cookies.txt https://httpbin.org/cookies/set/session/abc123

# 同時讀取和儲存 Cookie
curl -b cookies.txt -c cookies.txt https://example.com/login

# Cookie Jar 格式
curl -b cookie-jar.txt -c cookie-jar.txt https://example.com
```

### 會話管理

```bash
# 登入並保持會話
curl -c session.txt -d "username=john&password=secret" \
     https://example.com/login

# 使用會話訪問受保護頁面
curl -b session.txt https://example.com/dashboard

# 登出並清除會話
curl -b session.txt -c /dev/null https://example.com/logout
```

## 檔案傳輸

### 檔案下載

```bash
# 基本下載
curl -O https://example.com/file.zip

# 自訂檔案名
curl -o myfile.zip https://example.com/file.zip

# 斷點續傳
curl -C - -O https://example.com/largefile.zip

# 限制下載速度
curl --limit-rate 100k -O https://example.com/file.zip

# 下載多個檔案
curl -O https://example.com/file1.zip -O https://example.com/file2.zip

# 使用範圍下載
curl -r 0-1023 https://example.com/file.txt  # 下載前 1024 位元組
```

### 檔案上傳

```bash
# FTP 上傳
curl -T localfile.txt ftp://ftp.example.com/remote/

# HTTP PUT 上傳
curl -T document.pdf https://api.example.com/upload

# 表單檔案上傳
curl -F "file=@document.pdf" -F "title=My Document" \
     https://example.com/upload

# 多檔案上傳
curl -F "file1=@doc1.pdf" -F "file2=@doc2.pdf" \
     https://example.com/upload

# 帶進度條的上傳
curl -# -T largefile.zip https://api.example.com/upload
```

## 進階功能

### 輸出格式化

```bash
# 自訂輸出格式
curl -w "Status: %{http_code}\nTime: %{time_total}s\nSize: %{size_download} bytes\n" \
     -o /dev/null -s https://example.com

# 常用格式變數
%{http_code}           # HTTP 狀態碼
%{time_total}          # 總耗時
%{time_connect}        # 連接時間
%{time_starttransfer}  # 開始傳輸時間
%{size_download}       # 下載大小
%{size_upload}         # 上傳大小
%{speed_download}      # 下載速度
%{speed_upload}        # 上傳速度

# 效能測試範例
curl -w "@curl-format.txt" -o /dev/null -s https://example.com
```

建立 `curl-format.txt` 檔案：
```
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
```

### 重定向處理

```bash
# 跟隨重定向
curl -L https://bit.ly/shortened-url

# 限制重定向次數
curl -L --max-redirs 5 https://example.com

# 顯示重定向過程
curl -L -v https://bit.ly/shortened-url

# 不跟隨重定向（預設）
curl https://bit.ly/shortened-url
```

### 代理設定

```bash
# HTTP 代理
curl --proxy http://proxy.example.com:8080 https://httpbin.org/ip

# SOCKS 代理
curl --socks5 localhost:1080 https://httpbin.org/ip

# 代理認證
curl --proxy-user username:password \
     --proxy http://proxy.example.com:8080 \
     https://httpbin.org/ip

# 排除代理
curl --noproxy localhost,127.0.0.1 https://localhost:8080/api
```

### 並行請求

```bash
# 背景執行
curl https://api1.example.com &
curl https://api2.example.com &
curl https://api3.example.com &
wait

# 使用 xargs 並行
echo -e "https://api1.example.com\nhttps://api2.example.com" | \
xargs -n 1 -P 2 curl -s

# 循環請求
for i in {1..5}; do
  curl -s "https://api.example.com/data/$i" &
done
wait
```

## API 測試實戰

### REST API 測試

```bash
# 使用者管理 API 測試
BASE_URL="https://jsonplaceholder.typicode.com"

# 1. 獲取所有使用者
curl -s "$BASE_URL/users" | jq '.[0:3]'

# 2. 獲取特定使用者
curl -s "$BASE_URL/users/1" | jq '.'

# 3. 創建新使用者
curl -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com"
  }' | jq '.'

# 4. 更新使用者
curl -X PUT "$BASE_URL/users/1" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "name": "Jane Doe",
    "username": "janedoe",
    "email": "jane@example.com"
  }' | jq '.'

# 5. 刪除使用者
curl -X DELETE "$BASE_URL/users/1" -w "Status: %{http_code}\n"
```

### API 效能測試

```bash
# 響應時間測試
test_api_performance() {
  local url="$1"
  local requests="$2"
  
  echo "Testing $url with $requests requests..."
  
  for i in $(seq 1 $requests); do
    curl -w "%{time_total}\n" -o /dev/null -s "$url"
  done | awk '{sum+=$1; count++} END {print "Average:", sum/count "s"}'
}

test_api_performance "https://httpbin.org/delay/1" 5

# 並發測試
concurrent_test() {
  local url="$1"
  local concurrent="$2"
  local total="$3"
  
  echo "Concurrent test: $concurrent parallel requests, $total total"
  
  seq 1 $total | xargs -n 1 -P $concurrent -I {} \
    curl -w "Request {}: %{time_total}s\n" -o /dev/null -s "$url"
}

concurrent_test "https://httpbin.org/delay/1" 3 10
```

### API 健康檢查

```bash
#!/bin/bash
# api_health_check.sh

check_api_health() {
  local name="$1"
  local url="$2"
  local expected_status="$3"
  
  echo -n "Checking $name... "
  
  response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url")
  http_code=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
  body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    echo "✓ OK (HTTP $http_code)"
    return 0
  else
    echo "✗ FAIL (HTTP $http_code)"
    echo "Response: $body"
    return 1
  fi
}

# 健康檢查
check_api_health "Main API" "https://api.example.com/health" 200
check_api_health "User Service" "https://api.example.com/users/1" 200
check_api_health "Auth Service" "https://api.example.com/auth/status" 200
```

## 除錯與監控

### 詳細除錯

```bash
# 詳細模式
curl -v https://httpbin.org/get

# 追蹤 ASCII 格式
curl --trace-ascii debug.txt https://httpbin.org/get

# 追蹤二進位格式
curl --trace debug.bin https://httpbin.org/get

# 只顯示標頭
curl -I https://httpbin.org/get

# 顯示請求和響應標頭
curl -D headers.txt https://httpbin.org/get
```

### 網路診斷

```bash
# DNS 解析時間
curl -w "DNS lookup: %{time_namelookup}s\n" -o /dev/null -s https://example.com

# 連接時間分析
curl -w "Connect: %{time_connect}s, Start transfer: %{time_starttransfer}s, Total: %{time_total}s\n" \
     -o /dev/null -s https://example.com

# 檢查 SSL 證書
curl -vI https://example.com 2>&1 | grep -E "(SSL|TLS|certificate)"

# 測試不同 HTTP 版本
curl --http1.1 -I https://example.com
curl --http2 -I https://example.com
```

### 錯誤處理

```bash
# 基本錯誤處理
if curl -s --fail https://api.example.com/data; then
  echo "Request successful"
else
  echo "Request failed with exit code $?"
fi

# 詳細錯誤資訊
curl -s -w "Status: %{http_code}, Exit: %{exitcode}\n" \
     https://httpbin.org/status/404

# 重試機制
retry_curl() {
  local url="$1"
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts..."
    
    if curl -s --fail "$url"; then
      echo "Success on attempt $attempt"
      return 0
    fi
    
    echo "Failed attempt $attempt"
    ((attempt++))
    sleep 2
  done
  
  echo "All attempts failed"
  return 1
}

retry_curl "https://unstable-api.example.com"
```

## 實用腳本範例

### 1. API 批次測試腳本

```bash
#!/bin/bash
# api_batch_test.sh

API_BASE="https://jsonplaceholder.typicode.com"
AUTH_TOKEN="your-auth-token"

# 測試配置
declare -A TESTS=(
  ["GET /users"]="$API_BASE/users"
  ["GET /posts"]="$API_BASE/posts"
  ["GET /user/1"]="$API_BASE/users/1"
  ["POST /posts"]="$API_BASE/posts"
)

# 執行測試
run_tests() {
  echo "Starting API batch tests..."
  echo "=========================="
  
  local passed=0
  local failed=0
  
  for test_name in "${!TESTS[@]}"; do
    local url="${TESTS[$test_name]}"
    echo -n "Testing $test_name... "
    
    if [[ "$test_name" == "POST"* ]]; then
      # POST 測試
      response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{"title":"Test","body":"Test content","userId":1}')
    else
      # GET 測試
      response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$url")
    fi
    
    http_code=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      echo "✓ PASS (HTTP $http_code)"
      ((passed++))
    else
      echo "✗ FAIL (HTTP $http_code)"
      ((failed++))
    fi
  done
  
  echo "=========================="
  echo "Results: $passed passed, $failed failed"
}

run_tests
```

### 2. 檔案同步腳本

```bash
#!/bin/bash
# file_sync.sh

LOCAL_DIR="./local_files"
REMOTE_BASE="https://api.example.com/files"
AUTH_TOKEN="your-token"

sync_files() {
  echo "Starting file synchronization..."
  
  # 獲取遠程檔案列表
  remote_files=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
    "$REMOTE_BASE" | jq -r '.[].filename')
  
  for file in $remote_files; do
    local_file="$LOCAL_DIR/$file"
    remote_url="$REMOTE_BASE/$file"
    
    echo -n "Checking $file... "
    
    if [ -f "$local_file" ]; then
      # 比較檔案雜湊
      local_hash=$(sha256sum "$local_file" | cut -d' ' -f1)
      remote_hash=$(curl -s -I -H "Authorization: Bearer $AUTH_TOKEN" \
        "$remote_url" | grep -i "x-file-hash" | cut -d' ' -f2 | tr -d '\r')
      
      if [ "$local_hash" = "$remote_hash" ]; then
        echo "✓ Up to date"
        continue
      fi
    fi
    
    # 下載檔案
    echo "⬇ Downloading..."
    curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
      -o "$local_file" "$remote_url"
    
    if [ $? -eq 0 ]; then
      echo "✓ Downloaded successfully"
    else
      echo "✗ Download failed"
    fi
  done
}

mkdir -p "$LOCAL_DIR"
sync_files
```

### 3. 網站監控腳本

```bash
#!/bin/bash
# website_monitor.sh

SITES=(
  "https://example.com"
  "https://api.example.com/health"
  "https://cdn.example.com"
)

TIMEOUT=10
LOG_FILE="/var/log/website_monitor.log"

log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_site() {
  local url="$1"
  local name=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||')
  
  response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
    --max-time "$TIMEOUT" "$url")
  
  if [ $? -eq 0 ]; then
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
      log_message "✓ $name - OK (${time_total}s)"
    else
      log_message "⚠ $name - HTTP $http_code (${time_total}s)"
    fi
  else
    log_message "✗ $name - TIMEOUT or ERROR"
  fi
}

log_message "Starting website monitoring..."

for site in "${SITES[@]}"; do
  check_site "$site"
done

log_message "Monitoring completed"
```

## 效能最佳化

### 連接重用

```bash
# HTTP/1.1 Keep-Alive
curl --keepalive-time 30 https://api.example.com/endpoint1
curl --keepalive-time 30 https://api.example.com/endpoint2

# HTTP/2 多路復用
curl --http2 https://example.com/resource1
curl --http2 https://example.com/resource2

# 連接池配置
curl --max-time 30 --connect-timeout 10 https://api.example.com
```

### 快取與壓縮

```bash
# 啟用壓縮
curl -H "Accept-Encoding: gzip, deflate" https://example.com

# 條件請求
curl -H "If-Modified-Since: Wed, 21 Oct 2015 07:28:00 GMT" \
     https://example.com/data

# ETag 支援
curl -H "If-None-Match: \"33a64df551425fcc55e4d42a148795d9f25f89d4\"" \
     https://example.com/resource
```

### 批次優化

```bash
# 並行下載
urls=(
  "https://api.example.com/data1"
  "https://api.example.com/data2"  
  "https://api.example.com/data3"
)

for url in "${urls[@]}"; do
  curl -s "$url" > "$(basename "$url").json" &
done
wait

# 限制並行數
printf "%s\n" "${urls[@]}" | xargs -n 1 -P 3 -I {} \
  sh -c 'curl -s "{}" > "$(basename "{}").json"'
```

## 常見問題與解決方案

### SSL/TLS 問題

```bash
# 證書驗證問題
curl -k https://self-signed.example.com  # 跳過驗證（不推薦）
curl --cacert /path/to/ca-bundle.crt https://example.com  # 指定 CA

# 檢查證書資訊
curl -vI https://example.com 2>&1 | grep -A 10 "Server certificate"

# 測試 SSL 配置
curl --tlsv1.2 --ciphers HIGH https://example.com
```

### 編碼問題

```bash
# UTF-8 編碼
curl -H "Accept-Charset: utf-8" https://example.com

# URL 編碼
curl "https://example.com/search?q=$(echo '中文查詢' | curl -Gso /dev/null -w %{url_effective} --data-urlencode @- | cut -c3-)"

# 處理特殊字元
curl -G -d "query=hello world" https://example.com/search
```

### 超時與重試

```bash
# 超時設定
curl --connect-timeout 10 --max-time 30 https://slow-api.example.com

# 自動重試
curl --retry 3 --retry-delay 5 https://unstable-api.example.com

# 指數退避
curl --retry 3 --retry-delay 1 --retry-max-time 60 \
     https://api.example.com
```

## 總結

### 核心優勢

1. **多功能性**：支援多種協定和操作方式
2. **靈活性**：豐富的選項和配置能力  
3. **可程式性**：適合自動化和腳本處理
4. **跨平台**：在各種系統上表現一致
5. **效能**：高效的網路通訊和傳輸

### 最佳實踐

1. **安全第一**：正確處理認證和 SSL 驗證
2. **錯誤處理**：實作適當的重試和錯誤恢復機制
3. **效能優化**：使用連接重用和並行處理
4. **日誌記錄**：保留詳細的請求和響應日誌
5. **測試自動化**：將 API 測試整合到 CI/CD 流程

### 常用模式記憶

```bash
# API 測試基本模式
curl -X POST https://api.example.com/resource \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"key": "value"}'

# 檔案操作模式
curl -O https://example.com/file.zip           # 下載
curl -T file.txt https://api.example.com/upload # 上傳

# 除錯模式
curl -v -I https://example.com                 # 詳細標頭
curl -w "%{http_code}\n" https://example.com   # 狀態碼

# 效能測試模式
curl -w "@curl-format.txt" -o /dev/null -s https://example.com
```

cURL 是現代開發者工具箱中不可或缺的利器，掌握其核心功能和進階技巧，能夠大幅提升 API 開發、測試和維護的效率。記住：實務中最重要的是理解 HTTP 協定基礎，並善用 cURL 的豐富選項來解決實際問題。

## 參考資料

- [cURL 官方文檔](https://curl.se/docs/)
- [cURL Tutorial](https://curl.se/docs/tutorial.html)
- [HTTP/1.1 規範](https://tools.ietf.org/html/rfc7231)
- [REST API 設計指南](https://restfulapi.net/)
- [JSON API 規範](https://jsonapi.org/)