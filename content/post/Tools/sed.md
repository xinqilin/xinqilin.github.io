---
title: "Sed 流編輯器完整指南：Linux 文本處理的強大工具"
author: Bill.Lin
date: 2019-01-18T10:23:31+08:00
draft: false
tags: ["Linux", "Sed", "Stream Editor", "Text Processing", "Regular Expression", "Shell", "Unix"]
Description: "深入解析 sed 流編輯器的完整用法，包含文本替換、行操作、正規表達式與實戰應用場景"
Categories: ["Tools"]
DisableComments: false
---

## 概述

`sed`（Stream Editor，流編輯器）是 Unix/Linux 系統中功能強大的文本處理工具。它能夠對文本流進行非互動式的編輯操作，包括搜尋、替換、插入、刪除等功能。作為管道處理的重要工具，sed 在自動化腳本和批次文本處理中扮演關鍵角色。

### 核心特徵

- **流式處理**：逐行處理文本，適合大檔案操作
- **非互動式**：可在腳本中自動執行
- **正規表達式**：支援強大的模式匹配
- **原地編輯**：可直接修改原始檔案
- **管道友好**：適合與其他命令組合使用

## 基本語法

```bash
sed [選項] '地址定界command' file(s)
sed [選項] -e 'script1' -e 'script2' file(s)
sed [選項] -f script.sed file(s)
```

### 常用選項

```bash
-n          # 安靜模式，不自動列印處理結果
-e script   # 指定要執行的腳本命令
-f file     # 從檔案讀取腳本命令
-i[suffix]  # 直接修改檔案（可選備份後綴）
-r 或 -E    # 使用擴展正規表達式
-s          # 將多個檔案視為獨立處理
--debug     # 偵錯模式，顯示執行過程
```

### 基本範例

```bash
# 基本文本替換
sed 's/old/new/' file.txt          # 替換每行第一個匹配
sed 's/old/new/g' file.txt         # 替換所有匹配
sed 's/old/new/2' file.txt         # 替換每行第二個匹配

# 直接修改檔案
sed -i 's/old/new/g' file.txt      # 直接修改原檔案
sed -i.bak 's/old/new/g' file.txt  # 修改前先備份
```

## 地址定界

地址定界用於指定 sed 命令作用的行範圍：

### 基本地址類型

```bash
# 行號地址
sed '3d' file.txt                  # 刪除第3行
sed '1,5d' file.txt               # 刪除第1到5行
sed '3,$d' file.txt               # 刪除第3行到檔案結尾

# 模式地址
sed '/pattern/d' file.txt         # 刪除包含pattern的行
sed '/start/,/end/d' file.txt     # 刪除從start到end之間的行

# 特殊地址
sed '$d' file.txt                 # 刪除最後一行
sed '0,/pattern/d' file.txt       # 刪除到第一個匹配pattern的行
```

### 進階地址定界

```bash
# 步進地址
sed -n '1~2p' file.txt            # 列印奇數行（從第1行開始，每2行一次）
sed -n '2~2p' file.txt            # 列印偶數行
sed -n '1~3p' file.txt            # 每三行列印一次

# 地址取反
sed '3!d' file.txt                # 刪除除第3行外的所有行
sed '/pattern/!d' file.txt        # 只保留包含pattern的行

# 複雜地址組合
sed '1,3d; 5,7d' file.txt         # 刪除1-3行和5-7行
sed '/^#/d; /^$/d' file.txt       # 刪除註釋行和空行
```

## 核心命令詳解

### 1. 替換命令 (s)

sed 最常用的命令，語法：`s/pattern/replacement/flags`

#### 基本替換

```bash
# 基本替換語法
sed 's/pattern/replacement/' file.txt          # 替換每行第一個匹配
sed 's/pattern/replacement/g' file.txt         # 全域替換
sed 's/pattern/replacement/2' file.txt         # 替換第二個匹配
sed 's/pattern/replacement/2g' file.txt        # 從第二個開始全部替換

# 使用不同分隔符
sed 's#/old/path#/new/path#g' file.txt         # 使用 # 作為分隔符
sed 's|old|new|g' file.txt                     # 使用 | 作為分隔符
sed 's@old@new@g' file.txt                     # 使用 @ 作為分隔符
```

#### 進階替換功能

```bash
# 大小寫轉換
sed 's/.*/\U&/' file.txt                       # 全部轉大寫
sed 's/.*/\L&/' file.txt                       # 全部轉小寫
sed 's/\([a-z]\)/\U\1/g' file.txt             # 每個字母轉大寫
sed 's/\b\w/\U&/g' file.txt                   # 單詞首字母大寫

# 使用捕獲群組
sed 's/\([0-9]*\)-\([0-9]*\)/\2-\1/' file.txt # 交換數字順序
sed 's/\(.*\): \(.*\)/\2 - \1/' file.txt      # 重新排列格式

# 條件替換
sed '/pattern/s/old/new/g' file.txt            # 只在包含pattern的行中替換
sed '1,10s/old/new/g' file.txt                 # 只在第1-10行中替換
```

### 2. 刪除命令 (d)

```bash
# 基本刪除
sed '3d' file.txt                              # 刪除第3行
sed '1,5d' file.txt                            # 刪除第1-5行
sed '$d' file.txt                              # 刪除最後一行

# 模式刪除
sed '/pattern/d' file.txt                      # 刪除包含pattern的行
sed '/^$/d' file.txt                           # 刪除空行
sed '/^#/d' file.txt                           # 刪除註釋行
sed '/^[[:space:]]*$/d' file.txt               # 刪除空行和只有空白的行

# 範圍刪除
sed '/start/,/end/d' file.txt                  # 刪除start到end之間的行
sed '/BEGIN/,/END/d' file.txt                  # 刪除BEGIN到END區塊
```

### 3. 列印命令 (p)

```bash
# 基本列印（通常與-n一起使用）
sed -n '3p' file.txt                           # 只列印第3行
sed -n '1,5p' file.txt                         # 只列印第1-5行
sed -n '$p' file.txt                           # 只列印最後一行

# 模式列印
sed -n '/pattern/p' file.txt                   # 只列印包含pattern的行
sed -n '/^#/p' file.txt                        # 只列印註釋行

# 複製列印
sed 'p' file.txt                               # 每行列印兩次
sed '/pattern/p' file.txt                      # 匹配行列印兩次
```

### 4. 插入和附加命令 (i, a, c)

```bash
# 插入命令 (i) - 在指定行前插入
sed '3i\New line before line 3' file.txt      # 在第3行前插入
sed '/pattern/i\New line' file.txt            # 在匹配行前插入

# 附加命令 (a) - 在指定行後附加
sed '3a\New line after line 3' file.txt       # 在第3行後附加
sed '/pattern/a\New line' file.txt            # 在匹配行後附加
sed '$a\Last line' file.txt                   # 在檔案末尾附加

# 替換命令 (c) - 替換整行
sed '3c\Replacement line' file.txt            # 替換第3行
sed '/pattern/c\New content' file.txt         # 替換匹配行

# 多行操作
sed '3i\Line 1\nLine 2\nLine 3' file.txt      # 插入多行
```

### 5. 檔案操作命令 (r, w)

```bash
# 讀取檔案 (r)
sed '3r insert.txt' file.txt                  # 在第3行後插入檔案內容
sed '/pattern/r header.txt' file.txt          # 在匹配行後插入檔案

# 寫入檔案 (w)
sed -n '1,10w output.txt' file.txt            # 將第1-10行寫入檔案
sed -n '/pattern/w matches.txt' file.txt      # 將匹配行寫入檔案
sed '/ERROR/w errors.log' file.txt            # 將錯誤行寫入日誌
```

## 正規表達式進階應用

### 基本正規表達式 (BRE)

```bash
# 基本元字元
sed 's/^/> /' file.txt                         # 在每行開頭加上 "> "
sed 's/$/!/' file.txt                          # 在每行結尾加上 "!"
sed 's/./X/g' file.txt                         # 將每個字元替換為X

# 字元類別
sed 's/[0-9]/X/g' file.txt                     # 替換所有數字
sed 's/[a-zA-Z]/X/g' file.txt                  # 替換所有字母
sed 's/[[:digit:]]/X/g' file.txt               # 使用POSIX字元類別
```

### 擴展正規表達式 (ERE)

```bash
# 使用 -E 或 -r 選項
sed -E 's/([0-9]+)-([0-9]+)/\2-\1/' file.txt   # 交換連字號分隔的數字
sed -E 's/\b[a-z]+/\U&/g' file.txt             # 單詞首字母大寫
sed -E 's/(.*\.)(jpg|png)/\1webp/' file.txt    # 改變檔案副檔名

# 量詞使用
sed -E 's/a+/A/g' file.txt                     # 一個或多個a
sed -E 's/a?/A/g' file.txt                     # 零個或一個a
sed -E 's/a{3}/AAA/g' file.txt                 # 恰好三個a
sed -E 's/a{2,4}/A/g' file.txt                 # 2到4個a
```

## 實戰應用場景

### 1. 檔案內容清理

```bash
# 清理空行和註釋
sed '/^$/d; /^#/d' file.txt                    # 刪除空行和註釋行
sed '/^[[:space:]]*$/d' file.txt               # 刪除空行和只有空白的行
sed 's/[[:space:]]*$//' file.txt               # 刪除行尾空白
sed 's/^[[:space:]]*//' file.txt               # 刪除行首空白

# 清理特殊字元
sed 's/\r$//' file.txt                         # 刪除Windows換行符
sed 's/\t/ /g' file.txt                        # 將tab替換為空格
sed 's/[[:cntrl:]]//g' file.txt                # 刪除控制字元
```

### 2. 資料格式轉換

```bash
# CSV處理
sed 's/,/\t/g' data.csv                        # CSV轉TSV
sed 's/;/,/g' file.csv                         # 更改分隔符
sed '1d' data.csv                              # 刪除標題行

# 日期格式轉換
sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\3\/\2\/\1/g' file.txt
# 2023-12-25 -> 25/12/2023

# 電話號碼格式化
sed -E 's/([0-9]{3})([0-9]{3})([0-9]{4})/(\1) \2-\3/' file.txt
# 1234567890 -> (123) 456-7890
```

### 3. 程式碼處理

```bash
# 批次重構程式碼
find . -name "*.java" -exec sed -i 's/oldClassName/newClassName/g' {} \;

# 移除偵錯程式碼
sed '/console\.log/d' script.js                # 刪除console.log行
sed '/DEBUG/,/END_DEBUG/d' code.c              # 刪除DEBUG區塊

# 添加授權標題
sed '1i\// Copyright 2023 Company Name' *.js   # 在每個JS檔案開頭添加版權
```

### 4. 日誌分析

```bash
# 提取特定時間範圍的日誌
sed -n '/2023-12-01/,/2023-12-31/p' access.log

# 過濾錯誤日誌
sed -n '/ERROR\|FATAL/p' application.log       # 只顯示錯誤和致命錯誤
sed '/INFO\|DEBUG/d' application.log           # 隱藏資訊和偵錯訊息

# 日誌格式化
sed 's/\[\([^]]*\)\]/\1/g' syslog              # 移除方括號
sed -E 's/^([^ ]+) ([^ ]+)/[\1] \2:/' log.txt   # 重新格式化時間戳
```

### 5. 設定檔管理

```bash
# 修改設定值
sed -i 's/^port=.*/port=8080/' config.ini      # 修改連接埠設定
sed -i '/^#.*debug/s/^#//' config.conf         # 取消註釋debug設定
sed -i '/^debug=/s/false/true/' config.conf    # 啟用debug模式

# 添加設定項目
sed -i '/\[database\]/a\timeout=30' config.ini # 在[database]段落後添加設定
sed -i '$a\new_setting=value' config.conf      # 在檔案末尾添加設定
```

## 進階技巧

### 1. 多命令處理

```bash
# 使用分號分隔命令
sed '1d; s/old/new/g; $a\EOF' file.txt

# 使用-e選項
sed -e '1d' -e 's/old/new/g' -e '$a\EOF' file.txt

# 使用大括號組合命令
sed '/pattern/{s/old/new/; p;}' file.txt
```

### 2. 條件處理

```bash
# 分支和標籤
sed ':label; s/\([0-9]*\),\([0-9]\)/\1\2,/; t label' file.txt  # 移除數字中的逗號

# 測試命令
sed 's/old/new/; t end; s/fallback/replacement/; :end' file.txt

# 複雜條件邏輯
sed '/pattern1/{s/old/new/; b}; /pattern2/s/old/different/' file.txt
```

### 3. 保持空間 (Hold Space)

```bash
# 基本保持空間操作
sed -n '1h; 2g; 2p' file.txt                   # 將第1行複製到第2行位置顯示
sed -n '1h; 1!H; $!d; x; p' file.txt           # 反轉檔案行順序

# 複雜的保持空間範例
sed -n '/pattern/{h; n; s/old/new/; H; x; s/\n/ - /; p;}' file.txt
```

### 4. 腳本檔案

建立 `script.sed` 檔案：

```sed
# 這是一個sed腳本檔案
# 刪除空行
/^$/d

# 刪除註釋行
/^#/d

# 替換特定模式
s/old_pattern/new_pattern/g

# 在檔案末尾添加內容
$a\
Processing completed.
```

使用腳本：

```bash
sed -f script.sed input.txt
```

## 效能優化與最佳實踐

### 1. 效能優化技巧

```bash
# 使用quit命令提早退出
sed '10q' file.txt                             # 只處理前10行後退出
sed '/pattern/q' file.txt                      # 找到匹配後立即退出

# 避免不必要的處理
sed -n '/pattern/p' file.txt                   # 使用-n避免自動列印
sed '/pattern/!d' file.txt                     # 只保留匹配行

# 組合多個操作
sed 's/old1/new1/g; s/old2/new2/g' file.txt   # 一次執行多個替換
```

### 2. 記憶體使用優化

```bash
# 處理大檔案時的注意事項
sed '1,1000d' hugefile.txt > output.txt        # 分段處理大檔案
sed -n '1000,2000p' hugefile.txt               # 只處理特定範圍

# 使用管道減少中間檔案
cat input.txt | sed 's/old/new/g' | sed '/pattern/d' > output.txt
```

### 3. 錯誤處理

```bash
# 備份重要檔案
sed -i.backup 's/old/new/g' important.txt      # 自動備份

# 測試命令
sed 's/old/new/g' file.txt > test_output.txt   # 先測試輸出
diff file.txt test_output.txt                  # 檢查差異

# 檢查檔案存在
[ -f file.txt ] && sed -i 's/old/new/g' file.txt
```

## 常見錯誤與除錯

### 1. 常見錯誤

```bash
# 錯誤：未轉義特殊字元
sed 's/file.txt/newfile.txt/' file             # 錯誤：.匹配任意字元
sed 's/file\.txt/newfile.txt/' file            # 正確：轉義.字元

# 錯誤：地址範圍問題
sed '1,$s/old/new/' file.txt                   # 可能造成混淆
sed '1,$ s/old/new/' file.txt                  # 更清楚的寫法

# 錯誤：忘記分隔符轉義
sed 's/http://old.com/http://new.com/' file    # 錯誤：分隔符衝突
sed 's#http://old.com#http://new.com#' file    # 正確：使用不同分隔符
```

### 2. 除錯技巧

```bash
# 使用偵錯模式
sed --debug 's/old/new/g' file.txt

# 逐步測試
sed -n 'l' file.txt                            # 顯示不可見字元
sed = file.txt | sed 'N; s/\n/\t/'             # 顯示行號

# 測試正規表達式
echo "test string" | sed 's/pattern/replacement/'
```

## 與其他工具整合

### 1. 與 find 組合

```bash
# 批次處理檔案
find . -name "*.txt" -exec sed -i 's/old/new/g' {} \;
find . -name "*.conf" -exec sed -i '/^#/d' {} \;

# 使用 xargs 提升效能
find . -name "*.txt" | xargs sed -i 's/old/new/g'
```

### 2. 與 awk 組合

```bash
# sed處理格式，awk處理邏輯
sed 's/,/ /g' data.csv | awk '{print $1, $3}'

# 管道組合處理
cat log.txt | sed '/ERROR/!d' | awk '{print $1, $4}'
```

### 3. 與 grep 組合

```bash
# 先過濾再處理
grep "pattern" file.txt | sed 's/old/new/g'

# 組合條件處理
sed -n '/start/,/end/p' file.txt | grep "important"
```

## 實用腳本範例

### 1. 日誌清理腳本

```bash
#!/bin/bash
# log_cleanup.sh - 清理和格式化日誌檔案

LOG_FILE="$1"
OUTPUT_FILE="${LOG_FILE}.clean"

sed -e '/^$/d' \
    -e '/^#/d' \
    -e 's/[[:space:]]*$//' \
    -e 's/\t/ /g' \
    -e '/DEBUG/d' \
    "$LOG_FILE" > "$OUTPUT_FILE"

echo "清理完成：$OUTPUT_FILE"
```

### 2. 設定檔更新腳本

```bash
#!/bin/bash
# config_update.sh - 批次更新設定檔

CONFIG_DIR="/etc/myapp"
BACKUP_DIR="/etc/myapp/backup"

# 備份設定檔
mkdir -p "$BACKUP_DIR"
cp "$CONFIG_DIR"/*.conf "$BACKUP_DIR"/

# 更新設定
find "$CONFIG_DIR" -name "*.conf" -exec sed -i \
    -e 's/^port=.*/port=8080/' \
    -e 's/^debug=false/debug=true/' \
    -e '/^#.*logging/s/^#//' \
    {} \;

echo "設定更新完成"
```

### 3. 程式碼重構腳本

```bash
#!/bin/bash
# refactor.sh - 批次重構程式碼

OLD_CLASS="$1"
NEW_CLASS="$2"

if [ $# -ne 2 ]; then
    echo "用法: $0 <舊類別名> <新類別名>"
    exit 1
fi

# 更新Java檔案
find . -name "*.java" -exec sed -i \
    -e "s/class $OLD_CLASS/class $NEW_CLASS/g" \
    -e "s/new $OLD_CLASS(/new $NEW_CLASS(/g" \
    -e "s/$OLD_CLASS\.class/$NEW_CLASS.class/g" \
    {} \;

echo "重構完成：$OLD_CLASS -> $NEW_CLASS"
```

## 總結

### 核心優勢

1. **高效率**：流式處理，記憶體使用量小
2. **靈活性**：支援複雜的文本操作
3. **自動化**：適合腳本和批次處理
4. **標準化**：跨平台一致性好

### 最佳實踐

1. **測試先行**：重要操作前先測試輸出
2. **備份重要檔案**：使用 `-i.backup` 選項
3. **善用正規表達式**：提升處理效率
4. **組合工具**：與其他命令協作使用
5. **腳本化**：將複雜操作封裝為腳本

### 學習建議

```bash
# 常用操作記憶口訣
sed 's/old/new/g'     # 替換：substitute
sed '3d'              # 刪除：delete  
sed '3p'              # 列印：print
sed '3a\text'         # 附加：append
sed '3i\text'         # 插入：insert
sed '3c\text'         # 改變：change
```

sed 是文本處理的瑞士軍刀，掌握其核心概念和常用操作，能夠大幅提升 Linux 系統管理和自動化腳本的效率。記住：實務中最重要的是理解模式空間的概念，並善用地址定界來精確控制操作範圍。

## 參考資料

- [GNU sed Manual](https://www.gnu.org/software/sed/manual/sed.html)
- [sed & awk by O'Reilly](https://www.oreilly.com/library/view/sed-awk/1565922255/)
- [Advanced Bash-Scripting Guide](https://tldp.org/LDP/abs/html/)
- [Regular Expressions Info](https://www.regular-expressions.info/)