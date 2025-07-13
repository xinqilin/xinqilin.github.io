---
title: "Dig 命令完整指南：DNS 查詢與網路診斷的強大工具"
author: Bill.Lin
date: 2021-01-08T21:39:14+08:00
draft: false
tags: ["Linux", "Dig", "DNS", "Network", "Debugging", "System Administration", "Command Line"]
Description: "深入解析 dig 命令的完整用法，包含 DNS 記錄查詢、網路診斷、效能分析與故障排除技巧"
Categories: ["Tools"]
DisableComments: false
---

## 概述

`dig`（Domain Information Groper）是一個功能強大的命令行 DNS 查詢工具，用於執行 DNS 查詢並顯示詳細的查詢結果。它是網路管理員、系統管理員和開發者進行 DNS 診斷、網路故障排除和域名解析分析的必備工具。

### 核心特徵

- **靈活的查詢選項**：支援各種 DNS 記錄類型查詢
- **詳細的輸出資訊**：提供完整的 DNS 響應詳情
- **多種輸出格式**：支援簡潔、詳細和自訂格式
- **強大的診斷功能**：追蹤查詢路徑和效能分析
- **腳本友好**：適合自動化和批次處理

## 安裝與環境準備

### 各系統安裝方法

```bash
# Ubuntu/Debian
sudo apt-get install dnsutils

# CentOS/RHEL/Fedora
sudo yum install bind-utils          # CentOS 7 及以下
sudo dnf install bind-utils          # Fedora/CentOS 8+

# macOS (通常已預裝)
brew install bind

# 驗證安裝
dig -v
```

### 基本語法

```bash
dig [@server] [domain] [type] [options]
```

## 基本使用

### 簡單 DNS 查詢

```bash
# 基本查詢（A 記錄）
dig google.com

# 指定記錄類型
dig google.com A
dig google.com AAAA
dig google.com MX
dig google.com NS
dig google.com TXT

# 簡潔輸出
dig google.com +short

# 只顯示答案部分
dig google.com +noall +answer
```

### 查詢結果解析

標準 dig 輸出包含以下部分：

```bash
dig www.google.com

; <<>> DiG 9.16.1 <<>> www.google.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096

;; QUESTION SECTION:        # 查詢問題
;www.google.com.           IN      A

;; ANSWER SECTION:          # 查詢答案
www.google.com.     299     IN      A       142.250.191.68

;; Query time: 15 msec      # 查詢時間
;; SERVER: 8.8.8.8#53(8.8.8.8)  # DNS 伺服器
;; WHEN: Mon Jan 08 21:40:50 CST 2024
;; MSG SIZE  rcvd: 59        # 響應大小
```

## DNS 記錄類型查詢

### A 和 AAAA 記錄

```bash
# IPv4 地址記錄（A）
dig example.com A
dig example.com A +short

# IPv6 地址記錄（AAAA）
dig example.com AAAA
dig example.com AAAA +short

# 同時查詢 A 和 AAAA
dig example.com A AAAA
```

### MX 記錄（郵件交換）

```bash
# 查詢郵件伺服器
dig google.com MX
dig google.com MX +short

# 查詢特定域名的郵件配置
dig gmail.com MX +noall +answer

# 顯示優先級和郵件伺服器
dig yahoo.com MX | grep -E "^[^;].*MX"
```

### NS 記錄（名稱伺服器）

```bash
# 查詢域名伺服器
dig google.com NS
dig google.com NS +short

# 查詢根域名伺服器
dig . NS +short

# 查詢特定 TLD 的名稱伺服器
dig com NS +short
```

### TXT 記錄（文本記錄）

```bash
# 查詢 TXT 記錄
dig google.com TXT
dig google.com TXT +short

# 查詢 SPF 記錄
dig _spf.google.com TXT

# 查詢 DKIM 記錄
dig selector1._domainkey.example.com TXT

# 查詢 DMARC 記錄
dig _dmarc.example.com TXT
```

### SOA 記錄（授權起始）

```bash
# 查詢 SOA 記錄
dig google.com SOA
dig google.com SOA +short

# 詳細 SOA 信息
dig google.com SOA +noall +answer +multiline
```

### CNAME 記錄（別名）

```bash
# 查詢 CNAME 記錄
dig www.github.com CNAME
dig www.github.com CNAME +short

# 追蹤 CNAME 鏈
dig www.example.com +trace
```

### PTR 記錄（反向查詢）

```bash
# 反向 DNS 查詢
dig -x 8.8.8.8
dig -x 8.8.8.8 +short

# 手動 PTR 查詢
dig 8.8.8.8.in-addr.arpa PTR

# IPv6 反向查詢
dig -x 2001:4860:4860::8888
```

## 進階查詢選項

### 指定 DNS 伺服器

```bash
# 使用 Google DNS
dig @8.8.8.8 google.com

# 使用 Cloudflare DNS
dig @1.1.1.1 google.com

# 使用多個 DNS 伺服器比較
dig @8.8.8.8 google.com +short
dig @1.1.1.1 google.com +short
dig @208.67.222.222 google.com +short  # OpenDNS
```

### 查詢追蹤

```bash
# 追蹤 DNS 解析路徑
dig google.com +trace

# 追蹤特定記錄類型
dig google.com MX +trace

# 簡化追蹤輸出
dig google.com +trace +short

# 追蹤並顯示所有步驟
dig google.com +trace +additional +all
```

### 輸出格式控制

```bash
# 簡潔輸出
dig google.com +short
dig google.com +noall +answer

# 多行格式化輸出
dig google.com SOA +multiline

# 隱藏特定部分
dig google.com +nocomments +noquestion +noauthority +noadditional +nostats

# 自訂輸出組合
dig google.com +nocmd +noall +answer +multiline
```

## 網路診斷與故障排除

### DNS 效能測試

```bash
# 測量查詢時間
dig google.com | grep "Query time"

# 批次效能測試
for i in {1..10}; do
    dig google.com +stats | grep "Query time"
done

# 比較不同 DNS 伺服器效能
dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222")
for server in "${dns_servers[@]}"; do
    echo "Testing $server:"
    dig @$server google.com +stats | grep "Query time"
done
```

### DNS 快取分析

```bash
# 檢查 TTL 值
dig google.com +noall +answer

# 監控 TTL 變化
watch -n 5 'dig google.com +noall +answer'

# 檢查快取狀態
dig google.com +norecurse
```

### 域名可用性檢查

```bash
# 檢查域名是否存在
dig example.com ANY +short

# 檢查域名狀態
dig example.com +short > /dev/null && echo "Domain exists" || echo "Domain not found"

# 批次域名檢查
domains=("google.com" "example.com" "nonexistent-domain-12345.com")
for domain in "${domains[@]}"; do
    if dig "$domain" +short > /dev/null 2>&1; then
        echo "$domain: EXISTS"
    else
        echo "$domain: NOT FOUND"
    fi
done
```

### DNSSEC 驗證

```bash
# 檢查 DNSSEC 支援
dig google.com +dnssec +multiline

# 驗證 DNSSEC 簽名
dig google.com DNSKEY +dnssec

# 檢查 DS 記錄
dig google.com DS +dnssec

# 驗證鏈
dig +trace +dnssec google.com
```

## 實戰應用場景

### 1. 郵件伺服器診斷

```bash
#!/bin/bash
# mail_server_check.sh - 郵件伺服器診斷腳本

check_mail_server() {
    local domain="$1"
    
    echo "=== Mail Server Diagnosis for $domain ==="
    
    # 檢查 MX 記錄
    echo "MX Records:"
    dig "$domain" MX +noall +answer
    
    # 檢查 SPF 記錄
    echo -e "\nSPF Record:"
    dig "$domain" TXT +short | grep -i spf
    
    # 檢查 DMARC 記錄
    echo -e "\nDMARC Record:"
    dig "_dmarc.$domain" TXT +short
    
    # 檢查常見 DKIM 選擇器
    echo -e "\nDKIM Records:"
    selectors=("default" "selector1" "selector2" "google" "k1")
    for selector in "${selectors[@]}"; do
        result=$(dig "${selector}._domainkey.$domain" TXT +short 2>/dev/null)
        if [ -n "$result" ]; then
            echo "$selector: $result"
        fi
    done
}

# 使用範例
check_mail_server "gmail.com"
```

### 2. 網站可用性監控

```bash
#!/bin/bash
# website_dns_monitor.sh - 網站 DNS 監控腳本

monitor_website() {
    local domain="$1"
    local log_file="${2:-dns_monitor.log}"
    
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 檢查 A 記錄
    a_record=$(dig "$domain" A +short | head -1)
    
    # 檢查 AAAA 記錄
    aaaa_record=$(dig "$domain" AAAA +short | head -1)
    
    # 測量查詢時間
    query_time=$(dig "$domain" | grep "Query time" | awk '{print $4}')
    
    # 檢查 DNS 伺服器響應
    dns_server=$(dig "$domain" | grep "SERVER:" | awk '{print $2}')
    
    # 記錄結果
    log_entry="$timestamp | $domain | A: $a_record | AAAA: $aaaa_record | Time: ${query_time}ms | Server: $dns_server"
    echo "$log_entry" | tee -a "$log_file"
    
    # 檢查異常
    if [ -z "$a_record" ]; then
        echo "WARNING: No A record found for $domain" | tee -a "$log_file"
    fi
    
    if [ "${query_time:-0}" -gt 1000 ]; then
        echo "WARNING: Slow DNS response (${query_time}ms) for $domain" | tee -a "$log_file"
    fi
}

# 監控多個網站
websites=("google.com" "github.com" "stackoverflow.com")
for site in "${websites[@]}"; do
    monitor_website "$site"
done
```

### 3. DNS 伺服器效能比較

```bash
#!/bin/bash
# dns_performance_test.sh - DNS 效能測試腳本

dns_performance_test() {
    local domain="${1:-google.com}"
    local test_count="${2:-10}"
    
    # DNS 伺服器列表
    declare -A dns_servers=(
        ["Google"]="8.8.8.8"
        ["Cloudflare"]="1.1.1.1"
        ["OpenDNS"]="208.67.222.222"
        ["Quad9"]="9.9.9.9"
    )
    
    echo "DNS Performance Test for $domain"
    echo "=================================="
    
    for name in "${!dns_servers[@]}"; do
        server="${dns_servers[$name]}"
        echo -e "\nTesting $name ($server):"
        
        total_time=0
        successful_queries=0
        
        for i in $(seq 1 $test_count); do
            query_time=$(dig @"$server" "$domain" +stats 2>/dev/null | grep "Query time" | awk '{print $4}')
            
            if [ -n "$query_time" ]; then
                total_time=$((total_time + query_time))
                successful_queries=$((successful_queries + 1))
                echo -n "."
            else
                echo -n "x"
            fi
        done
        
        if [ $successful_queries -gt 0 ]; then
            average_time=$((total_time / successful_queries))
            echo -e "\nAverage: ${average_time}ms (${successful_queries}/${test_count} successful)"
        else
            echo -e "\nFailed: No successful queries"
        fi
    done
}

# 執行測試
dns_performance_test "google.com" 5
```

### 4. 域名變更追蹤

```bash
#!/bin/bash
# dns_change_tracker.sh - DNS 變更追蹤腳本

track_dns_changes() {
    local domain="$1"
    local record_type="${2:-A}"
    local interval="${3:-300}"  # 5分鐘
    local log_file="dns_changes_${domain}_${record_type}.log"
    
    echo "Tracking DNS changes for $domain ($record_type record)"
    echo "Log file: $log_file"
    
    previous_result=""
    
    while true; do
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        current_result=$(dig "$domain" "$record_type" +short | sort | tr '\n' ' ')
        
        if [ "$current_result" != "$previous_result" ]; then
            if [ -n "$previous_result" ]; then
                echo "$timestamp | CHANGE DETECTED" | tee -a "$log_file"
                echo "$timestamp | Old: $previous_result" | tee -a "$log_file"
                echo "$timestamp | New: $current_result" | tee -a "$log_file"
                echo "$timestamp | ---" | tee -a "$log_file"
            else
                echo "$timestamp | Initial: $current_result" | tee -a "$log_file"
            fi
            previous_result="$current_result"
        else
            echo "$timestamp | No change: $current_result"
        fi
        
        sleep "$interval"
    done
}

# 使用範例
# track_dns_changes "example.com" "A" 60
```

### 5. 批次域名分析

```bash
#!/bin/bash
# batch_domain_analysis.sh - 批次域名分析腳本

analyze_domains() {
    local domain_file="$1"
    local output_file="${2:-domain_analysis_$(date +%Y%m%d_%H%M%S).csv}"
    
    # CSV 標題
    echo "Domain,A_Record,MX_Record,NS_Record,TXT_Count,Query_Time_ms,Status" > "$output_file"
    
    while IFS= read -r domain; do
        # 跳過空行和註解
        [[ -z "$domain" || "$domain" =~ ^[[:space:]]*# ]] && continue
        
        echo "Analyzing: $domain"
        
        # 查詢各種記錄
        a_record=$(dig "$domain" A +short | head -1)
        mx_record=$(dig "$domain" MX +short | head -1 | awk '{print $2}')
        ns_record=$(dig "$domain" NS +short | head -1)
        txt_count=$(dig "$domain" TXT +short | wc -l)
        
        # 測量查詢時間
        query_time=$(dig "$domain" | grep "Query time" | awk '{print $4}')
        
        # 判斷狀態
        if [ -n "$a_record" ]; then
            status="Active"
        elif dig "$domain" +short > /dev/null 2>&1; then
            status="Registered"
        else
            status="Not Found"
        fi
        
        # 寫入 CSV
        echo "$domain,$a_record,$mx_record,$ns_record,$txt_count,$query_time,$status" >> "$output_file"
        
    done < "$domain_file"
    
    echo "Analysis complete. Results saved to: $output_file"
}

# 建立範例域名列表
cat > domains.txt << EOF
google.com
github.com
stackoverflow.com
example.com
nonexistent-domain-12345.com
EOF

# 執行分析
analyze_domains "domains.txt"
```

## 進階技巧與最佳化

### 1. 自訂查詢腳本

```bash
#!/bin/bash
# dig_wrapper.sh - dig 包裝器腳本

# 彩色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

enhanced_dig() {
    local domain="$1"
    local record_type="${2:-A}"
    
    echo -e "${BLUE}=== Enhanced DNS Query: $domain ($record_type) ===${NC}"
    
    # 基本查詢
    echo -e "\n${GREEN}Basic Query:${NC}"
    dig "$domain" "$record_type" +noall +answer
    
    # 查詢時間和伺服器資訊
    echo -e "\n${GREEN}Performance Info:${NC}"
    dig "$domain" "$record_type" | grep -E "(Query time|SERVER:)"
    
    # 權威伺服器查詢
    echo -e "\n${GREEN}Authoritative Servers:${NC}"
    dig "$domain" NS +short
    
    # 如果是 A 記錄，也顯示反向查詢
    if [ "$record_type" = "A" ]; then
        echo -e "\n${GREEN}Reverse DNS:${NC}"
        ip=$(dig "$domain" A +short | head -1)
        if [ -n "$ip" ]; then
            dig -x "$ip" +short
        fi
    fi
}

# 使用範例
enhanced_dig "google.com" "A"
```

### 2. DNS 健康檢查

```bash
#!/bin/bash
# dns_health_check.sh - DNS 健康檢查腳本

dns_health_check() {
    local domain="$1"
    
    echo "DNS Health Check for: $domain"
    echo "============================="
    
    # 檢查項目計數
    local total_checks=0
    local passed_checks=0
    
    # 1. 檢查 A 記錄
    echo -n "Checking A record... "
    total_checks=$((total_checks + 1))
    if dig "$domain" A +short > /dev/null 2>&1; then
        echo "✓ PASS"
        passed_checks=$((passed_checks + 1))
    else
        echo "✗ FAIL"
    fi
    
    # 2. 檢查 NS 記錄
    echo -n "Checking NS records... "
    total_checks=$((total_checks + 1))
    ns_count=$(dig "$domain" NS +short | wc -l)
    if [ "$ns_count" -ge 2 ]; then
        echo "✓ PASS ($ns_count nameservers)"
        passed_checks=$((passed_checks + 1))
    else
        echo "✗ FAIL (only $ns_count nameserver)"
    fi
    
    # 3. 檢查 SOA 記錄
    echo -n "Checking SOA record... "
    total_checks=$((total_checks + 1))
    if dig "$domain" SOA +short > /dev/null 2>&1; then
        echo "✓ PASS"
        passed_checks=$((passed_checks + 1))
    else
        echo "✗ FAIL"
    fi
    
    # 4. 檢查查詢時間
    echo -n "Checking query performance... "
    total_checks=$((total_checks + 1))
    query_time=$(dig "$domain" | grep "Query time" | awk '{print $4}')
    if [ "${query_time:-9999}" -lt 1000 ]; then
        echo "✓ PASS (${query_time}ms)"
        passed_checks=$((passed_checks + 1))
    else
        echo "✗ FAIL (${query_time}ms - too slow)"
    fi
    
    # 5. 檢查權威伺服器一致性
    echo -n "Checking authoritative server consistency... "
    total_checks=$((total_checks + 1))
    ns_servers=$(dig "$domain" NS +short)
    consistent=true
    
    if [ -n "$ns_servers" ]; then
        first_result=$(dig @$(echo "$ns_servers" | head -1) "$domain" A +short | sort)
        
        while IFS= read -r server; do
            current_result=$(dig @"$server" "$domain" A +short | sort)
            if [ "$current_result" != "$first_result" ]; then
                consistent=false
                break
            fi
        done <<< "$ns_servers"
        
        if $consistent; then
            echo "✓ PASS"
            passed_checks=$((passed_checks + 1))
        else
            echo "✗ FAIL (inconsistent results)"
        fi
    else
        echo "✗ FAIL (no nameservers found)"
    fi
    
    # 總結
    echo
    echo "Health Check Summary: $passed_checks/$total_checks passed"
    
    if [ "$passed_checks" -eq "$total_checks" ]; then
        echo "Status: ✓ HEALTHY"
        return 0
    else
        echo "Status: ✗ ISSUES DETECTED"
        return 1
    fi
}

# 使用範例
dns_health_check "google.com"
```

### 3. 配置檔案管理

建立 `~/.digrc` 配置檔案：

```bash
# ~/.digrc - dig 預設配置
+noall +answer
+time=5
+tries=3
```

或使用環境變數：

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中添加
export DIG_DEFAULT_OPTS="+short +time=3"

# 使用別名
alias digs='dig +short'
alias digt='dig +trace'
alias digx='dig +short +time=1'
```

## 常見問題與解決方案

### 1. 查詢超時問題

```bash
# 調整超時設定
dig google.com +time=10 +tries=3

# 使用 TCP 查詢
dig google.com +tcp

# 檢查網路連接
dig google.com +trace | grep -E "(SERVFAIL|TIMEOUT)"
```

### 2. DNS 伺服器問題

```bash
# 測試多個 DNS 伺服器
dns_test() {
    local domain="$1"
    for server in 8.8.8.8 1.1.1.1 208.67.222.222; do
        echo "Testing $server:"
        dig @$server "$domain" +short +time=3 || echo "Failed"
    done
}
```

### 3. 記錄解析問題

```bash
# 檢查完整的解析路徑
dig google.com +trace +all

# 驗證 DNSSEC
dig google.com +dnssec +multiline

# 檢查快取污染
dig google.com @8.8.8.8 +norecurse
```

## 與其他工具整合

### 1. 與 nslookup 比較

```bash
# dig 格式
dig google.com A +short

# nslookup 格式
nslookup google.com | grep "Address:" | tail -1 | awk '{print $2}'

# 轉換腳本
dig2nslookup() {
    local domain="$1"
    echo "Server: $(dig google.com | grep SERVER | awk '{print $2}' | cut -d# -f1)"
    echo "Address: $(dig google.com | grep SERVER | awk '{print $2}')"
    echo
    echo "Name: $domain"
    dig "$domain" A +short | while read ip; do
        echo "Address: $ip"
    done
}
```

### 2. 與監控系統整合

```bash
# Nagios 檢查腳本
check_dns_record() {
    local domain="$1"
    local expected="$2"
    local timeout="${3:-5}"
    
    result=$(dig "$domain" A +short +time="$timeout" 2>/dev/null | head -1)
    
    if [ "$result" = "$expected" ]; then
        echo "OK - DNS record matches: $result"
        exit 0
    elif [ -z "$result" ]; then
        echo "CRITICAL - No DNS record found"
        exit 2
    else
        echo "WARNING - DNS record mismatch. Expected: $expected, Got: $result"
        exit 1
    fi
}

# Prometheus 指標生成
generate_dns_metrics() {
    local domain="$1"
    
    query_time=$(dig "$domain" | grep "Query time" | awk '{print $4}')
    record_count=$(dig "$domain" A +short | wc -l)
    
    echo "dns_query_duration_ms{domain=\"$domain\"} $query_time"
    echo "dns_record_count{domain=\"$domain\",type=\"A\"} $record_count"
}
```

## 總結

### 核心優勢

1. **功能完整**：支援所有 DNS 記錄類型和查詢選項
2. **輸出詳細**：提供完整的 DNS 響應資訊
3. **診斷能力**：強大的網路故障排除功能
4. **腳本友好**：適合自動化和批次處理
5. **標準工具**：廣泛支援和良好的文檔

### 最佳實踐

1. **適當的超時設定**：避免查詢掛起
2. **使用追蹤功能**：診斷複雜的 DNS 問題
3. **驗證多個來源**：比較不同 DNS 伺服器的結果
4. **記錄和監控**：建立 DNS 變更的歷史記錄
5. **安全考慮**：驗證 DNSSEC 和檢查 DNS 劫持

### 常用命令速查

```bash
# 基本查詢
dig domain.com                    # 標準查詢
dig domain.com +short            # 簡潔輸出
dig domain.com +trace            # 追蹤解析路徑

# 記錄類型
dig domain.com A                 # IPv4 地址
dig domain.com AAAA              # IPv6 地址
dig domain.com MX                # 郵件交換
dig domain.com NS                # 名稱伺服器
dig domain.com TXT               # 文本記錄

# 進階選項
dig @8.8.8.8 domain.com          # 指定 DNS 伺服器
dig -x 8.8.8.8                   # 反向查詢
dig domain.com +dnssec           # DNSSEC 驗證
dig domain.com +norecurse        # 非遞歸查詢
```

dig 是網路管理和 DNS 診斷的核心工具，掌握其使用技巧能夠大幅提升網路問題診斷和域名管理的效率。記住：理解 DNS 系統的工作原理是有效使用 dig 的基礎。

## 參考資料

- [BIND 9 Administrator Reference Manual](https://bind9.readthedocs.io/)
- [RFC 1035 - Domain Names](https://tools.ietf.org/html/rfc1035)
- [DNS and BIND on IPv6](https://www.isc.org/dns/)
- [DNSSEC Guide](https://dnssec-guide.readthedocs.io/)
- [Linux dig Command Tutorial](https://www.tecmint.com/10-linux-dig-domain-information-groper-commands/)