---
title: "AWK 程式設計完整指南：Linux 文本處理與資料分析利器"
author: Bill.Lin
date: 2019-04-06T23:18:56+08:00
draft: false
tags: ["Linux", "AWK", "Text Processing", "Data Analysis", "Pattern Scanning", "Shell", "Unix"]
description: "深入解析 AWK 程式語言的完整用法，包含模式匹配、資料處理、內建變數與實戰應用場景"
categories: ["CLI"]
disableComments: false
aliases:
  - /post/Tools/Awk/

---

## 概述

AWK 是一種強大的模式掃描和處理語言，由 Alfred Aho、Peter Weinberger 和 Brian Kernighan 於 1977 年在貝爾實驗室開發。AWK 特別適合處理結構化文本資料，能夠進行複雜的文本分析、報表生成和資料提取。

### 核心特徵

- **模式-動作程式設計**：基於模式匹配執行相應動作
- **自動欄位分割**：自動將輸入行分割為欄位
- **強大的內建變數**：提供豐富的環境資訊
- **數學運算能力**：支援完整的算術和字串操作
- **正規表達式支援**：強大的模式匹配功能

## 相容性注意事項

### macOS vs Linux 差異
macOS 內建的 `awk` 是 **BSD awk**（One True AWK），而 Linux 發行版通常是 **GNU awk (gawk)**。兩者差異：

| 功能 | GNU awk (gawk) | BSD awk (macOS) |
|------|---------------|-----------------|
| `gensub()` | 支援 | 不支援 |
| TCP/IP 連線 (`/inet/tcp`) | 支援 | 不支援 |
| `PROCINFO` | 支援 | 不支援 |
| `printf "%'d"` 千位分隔 | 支援 | 不支援 |
| 正規表達式 interval (`{n,m}`) | 支援 | 不支援（需 --re-interval） |

**gawk-only 功能請明確標注**，或提供替代寫法。macOS 用戶如需完整功能：`brew install gawk`。

### POSIX awk
POSIX 標準的 awk 功能最小但最廣泛相容。跨平台腳本應優先使用 POSIX awk 功能。

## 基本語法

```bash
awk 'pattern { action }' file(s)
awk -f script.awk file(s)
command | awk 'pattern { action }'
```

### AWK 程式結構

```bash
awk 'BEGIN { 初始化動作 } 
     pattern { 主要處理動作 } 
     END { 結束動作 }' file
```

### 基本範例

```bash
# 列印整個檔案
awk '{print}' file.txt              # 等同於 awk '{print $0}' file.txt

# 列印特定欄位
awk '{print $1, $3}' file.txt       # 列印第1和第3欄位

# 簡單過濾
awk '/pattern/ {print}' file.txt    # 列印包含 pattern 的行

# 計算統計
awk '{sum += $1} END {print sum}' file.txt  # 計算第1欄位總和
```

## 欄位和記錄

### 欄位處理

AWK 自動將每行輸入分割為欄位，預設分隔符為空白字元：

```bash
# 欄位變數
$0      # 整行內容
$1      # 第1個欄位
$2      # 第2個欄位
$NF     # 最後一個欄位
$(NF-1) # 倒數第2個欄位

# 實際範例
echo "apple banana cherry" | awk '{print $2}'        # banana
echo "1 2 3 4 5" | awk '{print $NF}'                 # 5
echo "a:b:c:d" | awk -F: '{print $3}'                # c
```

### 自訂分隔符

```bash
# 使用 -F 選項
awk -F: '{print $1, $3}' /etc/passwd                 # 使用冒號作分隔符
awk -F',' '{print $2}' data.csv                      # CSV 檔案處理
awk -F'[,:]' '{print $1, $3}' file.txt               # 多個分隔符

# 在程式中設定
awk 'BEGIN {FS=","} {print $1, $2}' data.csv         # 在 BEGIN 中設定
awk '{FS=","} NR>1 {print $1, $2}' data.csv          # 動態改變分隔符
```

### 輸出欄位分隔符

```bash
# 設定輸出分隔符
awk 'BEGIN {OFS="\t"} {print $1, $2, $3}' file.txt   # 使用 tab 分隔輸出
awk 'BEGIN {OFS=" | "} {print $1, $2}' file.txt      # 使用 " | " 分隔

# 重建行
awk '{$1=$1; print}' file.txt                        # 重新格式化空白
awk 'BEGIN {OFS=","} {$1=$1; print}' file.txt        # 轉換為 CSV 格式
```

## 內建變數

### 核心內建變數

```bash
# 記錄相關
NR      # 總記錄數（行號）
FNR     # 當前檔案的記錄數
NF      # 當前記錄的欄位數

# 分隔符相關
FS      # 輸入欄位分隔符
OFS     # 輸出欄位分隔符
RS      # 輸入記錄分隔符
ORS     # 輸出記錄分隔符

# 檔案相關
FILENAME    # 當前處理的檔案名
ARGC        # 命令行參數個數
ARGV        # 命令行參數陣列
```

### 實用範例

```bash
# 使用 NR 添加行號
awk '{print NR, $0}' file.txt

# 使用 NF 檢查欄位數
awk 'NF != 3 {print "Line " NR " has " NF " fields"}' file.txt

# 處理多個檔案時使用 FNR
awk '{print FILENAME, FNR, $0}' file1.txt file2.txt

# 使用 ARGC 和 ARGV
awk 'BEGIN {
    print "Total arguments:", ARGC
    for (i=0; i<ARGC; i++) print "ARGV[" i "]:", ARGV[i]
}' file1 file2
```

### 特殊變數

```bash
# 數字格式
OFMT        # 數字輸出格式（預設 "%.6g"）
CONVFMT     # 字串轉換格式

# 模式匹配
RSTART      # match() 函數匹配的起始位置
RLENGTH     # match() 函數匹配的長度

# 其他
SUBSEP      # 下標分隔符（用於多維陣列）
ENVIRON     # 環境變數陣列
```

## 模式匹配

### 基本模式

```bash
# 正規表達式模式
awk '/pattern/ {print}' file.txt              # 匹配包含 pattern 的行
awk '/^[0-9]/ {print}' file.txt               # 匹配以數字開頭的行
awk '/\.txt$/ {print}' file.txt               # 匹配以 .txt 結尾的行

# 關係表達式模式
awk '$1 > 100 {print}' file.txt               # 第1欄位 > 100
awk 'NF == 5 {print}' file.txt                # 有5個欄位的行
awk 'length($0) > 80 {print}' file.txt        # 行長度 > 80

# 範圍模式
awk '/start/,/end/ {print}' file.txt          # 從 start 到 end 的行
awk 'NR==5,NR==10 {print}' file.txt           # 第5到10行
```

### 進階模式

```bash
# 組合模式
awk '/error/ && $3 > 100 {print}' file.txt    # AND 條件
awk '/warn/ || /error/ {print}' file.txt      # OR 條件
awk '!/debug/ {print}' file.txt               # NOT 條件

# 欄位模式匹配
awk '$2 ~ /pattern/ {print}' file.txt         # 第2欄位匹配 pattern
awk '$1 !~ /^[0-9]/ {print}' file.txt         # 第1欄位不以數字開頭

# 複雜條件
awk '$1=="ERROR" && $3>threshold {count++} END {print count}' file.txt
```

## 動作和控制結構

### 基本動作

```bash
# 列印動作
awk '{print}' file.txt                        # 列印整行
awk '{print $1, $2}' file.txt                 # 列印特定欄位
awk '{printf "%s: %d\n", $1, $2}' file.txt    # 格式化列印

# 賦值動作
awk '{$1="NEW"; print}' file.txt              # 修改欄位值
awk '{sum += $1} END {print sum}' file.txt    # 累加計算
```

### 控制結構

#### if-else 語句

```bash
# 基本 if 語句
awk '{
    if ($1 > 100) 
        print "Large:", $0
    else 
        print "Small:", $0
}' file.txt

# 多重條件
awk '{
    if ($1 >= 90) grade = "A"
    else if ($1 >= 80) grade = "B"
    else if ($1 >= 70) grade = "C"
    else grade = "F"
    print $0, grade
}' scores.txt
```

#### 迴圈結構

```bash
# for 迴圈
awk '{
    for (i=1; i<=NF; i++) {
        print "Field " i ":", $i
    }
}' file.txt

# while 迴圈
awk '{
    i = 1
    while (i <= NF) {
        print $i
        i++
    }
}' file.txt

# for-in 迴圈（陣列）
awk '{
    for (i in array) {
        print i, array[i]
    }
}' file.txt
```

## 函數應用

### 字串函數

```bash
# length() - 字串長度
awk '{print length($0)}' file.txt                     # 每行長度
awk 'length($0) > 80' file.txt                        # 長度超過80的行

# substr() - 子字串
awk '{print substr($1, 1, 3)}' file.txt               # 第1欄位前3個字元
awk '{print substr($0, 5)}' file.txt                  # 從第5個字元開始

# index() - 查找位置
awk '{print index($0, "pattern")}' file.txt           # pattern 的位置

# split() - 分割字串
awk '{n=split($0, array, ","); print n}' file.txt     # 用逗號分割

# gsub() 和 sub() - 替換
awk '{gsub(/old/, "new"); print}' file.txt            # 全域替換
awk '{sub(/old/, "new"); print}' file.txt             # 只替換第一個

# tolower() 和 toupper() - 大小寫轉換
awk '{print tolower($0)}' file.txt                    # 轉小寫
awk '{print toupper($1)}' file.txt                    # 第1欄位轉大寫
```

### 數學函數

```bash
# 基本數學函數
awk '{print sqrt($1)}' file.txt                       # 平方根
awk '{print int($1)}' file.txt                        # 取整數
awk '{print sin($1), cos($1)}' file.txt               # 三角函數

# 統計函數
awk '{
    sum += $1
    count++
} END {
    print "Average:", sum/count
    print "Total:", sum
}' file.txt

# 最大值和最小值
awk '{
    if (NR==1 || $1 > max) max = $1
    if (NR==1 || $1 < min) min = $1
} END {
    print "Max:", max, "Min:", min
}' file.txt
```

### 自訂函數

```bash
# 定義函數
awk '
function factorial(n) {
    if (n <= 1) return 1
    return n * factorial(n-1)
}
{
    print $1, factorial($1)
}' file.txt

# 字串處理函數
awk '
function trim(str) {
    gsub(/^[ \t]+|[ \t]+$/, "", str)
    return str
}
{
    print trim($0)
}' file.txt
```

## 陣列應用

### 一維陣列

```bash
# 基本陣列操作
awk '{
    arr[NR] = $0
} END {
    for (i=1; i<=NR; i++) {
        print i, arr[i]
    }
}' file.txt

# 關聯陣列
awk '{
    count[$1]++
} END {
    for (item in count) {
        print item, count[item]
    }
}' file.txt

# 陣列排序
awk '{
    arr[NR] = $1
} END {
    n = asort(arr)  # 排序值
    for (i=1; i<=n; i++) {
        print arr[i]
    }
}' file.txt
```

### 多維陣列

```bash
# 使用 SUBSEP 分隔多維索引
awk 'BEGIN {SUBSEP = ":"} {
    matrix[$1,$2] = $3
} END {
    for (key in matrix) {
        print key, matrix[key]
    }
}' file.txt

# 二維統計
awk '{
    sales[$1][$2] += $3
} END {
    for (region in sales) {
        for (product in sales[region]) {
            print region, product, sales[region][product]
        }
    }
}' sales_data.txt
```

## 實戰應用場景

### 1. 日誌分析

```bash
# 存取日誌分析
awk '{
    # 統計狀態碼
    status[$9]++
    
    # 統計 IP 地址
    ip[$1]++
    
    # 計算總流量
    if ($10 != "-") bytes += $10
} END {
    print "=== Status Code Statistics ==="
    for (code in status) {
        print code, status[code]
    }
    
    print "\n=== Top 10 IP Addresses ==="
    PROCINFO["sorted_in"] = "@val_num_desc"
    n = 0
    for (addr in ip) {
        if (++n <= 10) print addr, ip[addr]
    }
    
    print "\nTotal Bytes:", bytes
}' access.log

# 錯誤日誌監控
awk '
BEGIN { print "Error Analysis Report" }
/ERROR|FATAL/ {
    split($1, date, "-")
    errors[date[1] "-" date[2]]++
    error_details[NR] = $0
}
END {
    print "Errors by Month:"
    for (month in errors) {
        print month, errors[month]
    }
}' error.log
```

### 2. 資料處理和統計

```bash
# CSV 資料分析
awk -F, '
NR==1 { 
    # 跳過標題行
    next 
}
{
    # 銷售資料統計
    total_sales += $3
    sales_by_region[$2] += $3
    
    if ($3 > max_sale) {
        max_sale = $3
        max_sale_record = $0
    }
}
END {
    print "Total Sales: $" total_sales
    print "Average Sale: $" total_sales/(NR-1)
    print "Largest Sale: $" max_sale
    print "Record:", max_sale_record
    
    print "\nSales by Region:"
    for (region in sales_by_region) {
        print region ": $" sales_by_region[region]
    }
}' sales.csv

# 成績統計
awk '{
    # 計算每個學生的平均分
    sum = 0
    for (i=2; i<=NF; i++) {
        sum += $i
        subject_total[i-1] += $i
    }
    avg = sum / (NF-1)
    print $1, avg
    
    if (avg >= 90) grade_count["A"]++
    else if (avg >= 80) grade_count["B"]++
    else if (avg >= 70) grade_count["C"]++
    else grade_count["F"]++
    
    student_count++
}
END {
    print "\nGrade Distribution:"
    for (grade in grade_count) {
        printf "%s: %d (%.1f%%)\n", grade, grade_count[grade], 
               grade_count[grade]/student_count*100
    }
}' grades.txt
```

### 3. 系統監控

```bash
# 程序監控
ps aux | awk '
NR>1 {
    # 跳過標題行
    cpu[$11] += $3  # 依程式名稱累加 CPU 使用率
    mem[$11] += $4  # 依程式名稱累加記憶體使用率
    proc_count[$11]++
}
END {
    print "Process Resource Usage:"
    printf "%-20s %s %s %s\n", "PROCESS", "COUNT", "CPU%", "MEM%"
    for (proc in cpu) {
        printf "%-20s %5d %6.1f %6.1f\n", proc, proc_count[proc], cpu[proc], mem[proc]
    }
}'

# 磁碟使用分析
df -h | awk '
NR>1 {
    # 解析使用百分比
    gsub(/%/, "", $5)
    usage = $5
    
    if (usage >= 90) {
        critical[++crit_count] = $6 " (" usage "%)"
    } else if (usage >= 80) {
        warning[++warn_count] = $6 " (" usage "%)"
    }
}
END {
    if (crit_count > 0) {
        print "CRITICAL: High disk usage detected!"
        for (i=1; i<=crit_count; i++) {
            print "  " critical[i]
        }
    }
    
    if (warn_count > 0) {
        print "WARNING: Moderate disk usage:"
        for (i=1; i<=warn_count; i++) {
            print "  " warning[i]
        }
    }
}'
```

### 4. 文件格式轉換

```bash
# JSON 簡單生成
awk -F, '
BEGIN { print "{" }
NR>1 {
    printf "  \"%s\": {\n", $1
    printf "    \"name\": \"%s\",\n", $2
    printf "    \"age\": %d,\n", $3
    printf "    \"city\": \"%s\"\n", $4
    printf "  }%s\n", (NR<total_lines ? "," : "")
}
END { print "}" }' data.csv

# HTML 表格生成
awk -F, '
BEGIN {
    print "<table border=\"1\">"
}
NR==1 {
    print "<tr>"
    for (i=1; i<=NF; i++) {
        print "<th>" $i "</th>"
    }
    print "</tr>"
}
NR>1 {
    print "<tr>"
    for (i=1; i<=NF; i++) {
        print "<td>" $i "</td>"
    }
    print "</tr>"
}
END {
    print "</table>"
}' data.csv

# 配置檔轉換
awk '
/^[^#]/ && /=/ {
    split($0, pair, "=")
    key = pair[1]
    value = pair[2]
    gsub(/^[ \t]+|[ \t]+$/, "", key)   # trim
    gsub(/^[ \t]+|[ \t]+$/, "", value)
    print key ": \"" value "\""
}' config.ini
```

### 5. 報表生成

```bash
# 銷售報表
awk -F, '
BEGIN {
    print "Sales Report"
    print "============"
    total = 0
}
NR>1 {
    date = $1
    product = $2
    amount = $3
    
    # 按日期統計
    daily_sales[date] += amount
    
    # 按產品統計
    product_sales[product] += amount
    
    total += amount
}
END {
    print "\nDaily Sales:"
    PROCINFO["sorted_in"] = "@ind_str_asc"
    for (date in daily_sales) {
        printf "%-12s: $%8.2f\n", date, daily_sales[date]
    }
    
    print "\nProduct Sales:"
    PROCINFO["sorted_in"] = "@val_num_desc"
    for (product in product_sales) {
        printf "%-15s: $%8.2f (%4.1f%%)\n", 
               product, product_sales[product], 
               product_sales[product]/total*100
    }
    
    printf "\nTotal Sales: $%.2f\n", total
}' sales.csv

# 網站流量報表
awk '{
    # 解析日期時間
    gsub(/\[|\]/, "", $4)
    split($4, datetime, ":")
    date = datetime[1]
    hour = datetime[2]
    
    # 統計
    daily_hits[date]++
    hourly_hits[hour]++
    
    if ($9 == "404") not_found++
    if ($9 ~ /^[45]/) errors++
    
    total_hits++
}
END {
    print "Website Traffic Report"
    print "====================="
    
    print "\nDaily Traffic:"
    for (date in daily_hits) {
        printf "%s: %d hits\n", date, daily_hits[date]
    }
    
    print "\nHourly Distribution:"
    for (h=0; h<24; h++) {
        printf "%02d:00: %d hits\n", h, hourly_hits[h]
    }
    
    printf "\nError Summary:\n"
    printf "404 Errors: %d (%.1f%%)\n", not_found, not_found/total_hits*100
    printf "5xx Errors: %d (%.1f%%)\n", errors, errors/total_hits*100
}' access.log
```

## 進階技巧

### 1. 多檔案處理

```bash
# 比較兩個檔案
awk '
FNR==NR {
    # 處理第一個檔案
    file1[FNR] = $0
    next
}
{
    # 處理第二個檔案
    if (file1[FNR] != $0) {
        print "Line " FNR " differs:"
        print "File1: " file1[FNR]
        print "File2: " $0
    }
}' file1.txt file2.txt

# 合併檔案資料
awk '
FNR==NR {
    # 第一個檔案：建立索引
    lookup[$1] = $2
    next
}
{
    # 第二個檔案：查找並合併
    if ($1 in lookup) {
        print $0, lookup[$1]
    }
}' lookup.txt data.txt
```

### 2. 複雜文本解析

```bash
# XML 簡單解析
awk '
/<([^>]+)>([^<]*)<\/\1>/ {
    match($0, /<([^>]+)>([^<]*)<\/\1>/, arr)
    print "Tag:", arr[1], "Content:", arr[2]
}' simple.xml

# 配置檔解析
awk '
/^\[.*\]$/ {
    # 區段標題
    gsub(/\[|\]/, "")
    section = $0
    next
}
/^[^#].*=/ {
    # 鍵值對
    split($0, kv, "=")
    key = kv[1]
    value = kv[2]
    gsub(/^[ \t]+|[ \t]+$/, "", key)
    gsub(/^[ \t]+|[ \t]+$/, "", value)
    config[section][key] = value
}
END {
    for (sect in config) {
        print "[" sect "]"
        for (k in config[sect]) {
            print k " = " config[sect][k]
        }
        print ""
    }
}' config.ini
```

### 3. 效能優化

```bash
# 避免重複計算
awk '{
    # 好的做法：儲存計算結果
    len = length($0)
    if (len > max_len) {
        max_len = len
        longest_line = $0
    }
}' file.txt

# 使用陣列而非字串連接
awk '{
    # 好的做法：使用陣列
    lines[NR] = $0
} END {
    for (i=NR; i>=1; i--) {
        print lines[i]
    }
}' file.txt

# 提早退出
awk '{
    if (found_count >= 10) exit
    if (/pattern/) {
        print
        found_count++
    }
}' large_file.txt
```

## 腳本檔案

建立 `script.awk` 檔案：

```awk
#!/usr/bin/awk -f

BEGIN {
    FS = ","
    OFS = "\t"
    print "Processing CSV file..."
}

# 跳過空行
/^$/ { next }

# 處理標題行
NR == 1 {
    print "Headers:", $0
    next
}

# 主要處理邏輯
{
    # 資料驗證
    if (NF != 4) {
        print "Warning: Line " NR " has " NF " fields" > "/dev/stderr"
        next
    }
    
    # 處理資料
    name = $1
    age = $2
    salary = $3
    department = $4
    
    # 統計
    total_salary += salary
    dept_count[department]++
    employee_count++
    
    # 輸出處理結果
    print name, age, salary, department
}

END {
    print "\n=== Summary ==="
    print "Total employees:", employee_count
    print "Average salary:", total_salary/employee_count
    
    print "\nDepartment distribution:"
    for (dept in dept_count) {
        printf "%-15s: %d\n", dept, dept_count[dept]
    }
}
```

使用腳本：

```bash
chmod +x script.awk
./script.awk data.csv
# 或
awk -f script.awk data.csv
```

## 常見錯誤與除錯

### 1. 常見錯誤

```bash
# 錯誤：字串比較使用數值運算子
awk '$1 > "50"' file.txt           # 錯誤：字串比較
awk '$1 + 0 > 50' file.txt         # 正確：強制數值比較

# 錯誤：陣列索引問題
awk '{arr[0] = $1}' file.txt       # 注意：AWK 陣列從1開始習慣使用

# 錯誤：未初始化變數
awk '{sum += $1} END {print sum/count}' file.txt  # count 未初始化
awk '{sum += $1; count++} END {print sum/count}' file.txt  # 正確
```

### 2. 除錯技巧

```bash
# 添加除錯輸出
awk '{
    print "Debug: NR=" NR ", NF=" NF ", $0=" $0 > "/dev/stderr"
    # 主要邏輯
}' file.txt

# 使用條件除錯
awk '{
    if (debug) print "Processing:", $0
    # 主要邏輯
}' debug=1 file.txt

# 分步驗證
awk '{print "Line " NR ": " $1}' file.txt | head -5
```

## 與其他工具整合

### 1. 與 grep 和 sed 組合

```bash
# 過濾後處理
grep "ERROR" log.txt | awk '{print $1, $3}'

# 多步處理
cat data.txt | grep -v "^#" | sed 's/,/ /g' | awk '{print $1, $2}'
```

### 2. 與 sort 組合

```bash
# 排序後統計
awk '{print $1}' file.txt | sort | uniq -c | awk '{print $2, $1}'

# 管道處理
awk '{print $3, $0}' file.txt | sort -nr | awk '{$1=""; print}'
```

### 3. 與資料庫整合

```bash
# 生成 SQL 插入語句
awk -F, '
NR>1 {
    printf "INSERT INTO users (name, age, city) VALUES (\"%s\", %d, \"%s\");\n",
           $1, $2, $3
}' data.csv

# 生成批次更新腳本
awk '{
    print "UPDATE table SET status=1 WHERE id=" $1 ";"
}' ids.txt
```

## 總結

### 核心優勢

1. **強大的模式匹配**：支援複雜的正規表達式
2. **豐富的內建功能**：字串處理、數學運算、陣列操作
3. **高效的文本處理**：適合大量資料處理
4. **靈活的程式結構**：支援完整的程式設計概念

### 最佳實踐

1. **善用 BEGIN 和 END**：初始化和清理工作
2. **合理使用陣列**：避免記憶體過度使用
3. **模式化程式設計**：將常用邏輯封裝為函數
4. **輸入驗證**：檢查資料格式和欄位數量
5. **錯誤處理**：適當的錯誤檢查和恢復機制

### 學習路徑

```bash
# 基礎階段
awk '{print $1}' file.txt                    # 欄位處理
awk '/pattern/ {print}' file.txt             # 模式匹配
awk '{sum += $1} END {print sum}' file.txt   # 基本統計

# 進階階段
awk -F, '{arr[$1] += $2} END {for(i in arr) print i, arr[i]}' file.csv  # 陣列應用
awk 'function f(x) {return x*x} {print f($1)}' file.txt  # 自訂函數

# 專家階段
awk '/start/,/end/ {if(/important/) print}' file.txt  # 複雜模式
awk 'BEGIN{PROCINFO["sorted_in"]="@val_num_desc"} ...'  # 高級特性
```

AWK 是文本處理和資料分析的強大工具，掌握其核心概念和常用技巧，能夠大幅提升資料處理的效率和準確性。記住：AWK 的核心在於模式-動作程式設計思維，善用這個特性能夠解決複雜的文本處理問題。

## 參考資料

- [GAWK Manual](https://www.gnu.org/software/gawk/manual/gawk.html)
- [The AWK Programming Language](https://www.amazon.com/AWK-Programming-Language-Alfred-Aho/dp/020107981X)
- [Advanced Bash-Scripting Guide](https://tldp.org/LDP/abs/html/)
- [POSIX AWK Specification](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/awk.html)