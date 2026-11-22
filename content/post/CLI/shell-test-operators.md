---
title: "Shell 檔案與字串表達式詳解"
author: "Bill.Lin"
date: 2022-10-01T21:25:56+08:00
draft: false
tags: ["Shell", "Bash", "File System", "Scripting"]
description: "本文提供 Shell Script 中常用的檔案、目錄及字串測試表達式，包含語法說明與實用範例，幫助您更有效地撰寫腳本。"
categories: ["CLI"]
disableComments: false
aliases:
  - /post/Tools/FileExpress/

---

## 概述

在撰寫 Shell Script 時，我們經常需要對檔案、目錄或字串的狀態進行判斷，例如檢查檔案是否存在、是否可讀，或判斷字串是否為空。這時就需要使用測試表達式 `[ ... ]` 或 `test` 指令。本文將詳細介紹這些常用的表達式及其用法。

## 檔案測試表達式

檔案測試表達式用於判斷檔案的類型或權限狀態。其回傳值為布林值（`true` 或 `false`），可搭配 `if` 條件式使用。

### 語法

```bash
if [ -<operator> <filename> ]; then
  # do something
fi
```

### 常用運算子

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `-e` | 如果檔案存在 (exist)，則為 `true` | `[ -e /etc/hosts ]` |
| `-d` | 如果檔案是目錄 (directory)，則為 `true` | `[ -d /home/user ]` |
| `-f` | 如果檔案是常規檔案 (regular file)，則為 `true` | `[ -f /etc/passwd ]` |
| `-L` | 如果檔案是符號連結 (symbolic link)，則為 `true` | `[ -L /usr/bin/python ]` |
| `-h` | 與 `-L` 相同，如果檔案是符號連結，則為 `true` | `[ -h /usr/bin/python ]` |
| `-r` | 如果檔案可讀 (readable)，則為 `true` | `[ -r /etc/shadow ]` |
| `-w` | 如果檔案可寫 (writable)，則為 `true` | `[ -w /tmp/test.log ]` |
| `-x` | 如果檔案可執行 (executable)，則為 `true` | `[ -x ./deploy.sh ]` |
| `-s` | 如果檔案大小不為 0，則為 `true` | `[ -s /var/log/syslog ]` |

### 檔案比較運算子

用於比較兩個檔案的新舊關係。

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `f1 -nt f2` | 如果檔案 `f1` 比 `f2` 新 (newer than)，則為 `true` | `[ file1.log -nt file2.log ]` |
| `f1 -ot f2` | 如果檔案 `f1` 比 `f2` 舊 (older than)，則為 `true` | `[ file1.log -ot file2.log ]` |

## 字串與數值測試表達式

除了檔案，測試表達式也常用於比較數值或判斷字串狀態。

### 數值比較

| 運算子 | 說明 | 等價符號 |
| :--- | :--- | :--- |
| `-eq` | 等於 (equal) | `==` |
| `-ne` | 不等於 (not equal) | `!=` |
| `-gt` | 大於 (greater than) | `>` |
| `-ge` | 大於或等於 (greater or equal) | `>=` |
| `-lt` | 小於 (less than) | `<` |
| `-le` | 小於或等於 (less or equal) | `<=` |

### 字串比較

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `-n` | 如果字串長度不為 0，則為 `true` | `[ -n "$my_var" ]` |
| `-z` | 如果字串長度為 0 (zero)，則為 `true` | `[ -z "$my_var" ]` |
| `$string` | 如果字串不為空，則為 `true` (與 `-n` 效果相同) | `[ "$my_var" ]` |

## `[[ ]]` vs `[ ]`

**強烈建議使用 `[[ ]]`（bash built-in）而非 `[ ]`（POSIX sh）**：

| 特性 | `[[ ]]` | `[ ]` |
|------|---------|-------|
| 字串比較 | 不需引號 | 變數必須引號保護 |
| Pattern matching | `[[ $str == foo* ]]` | 不支援 |
| Regex | `[[ $str =~ ^foo ]]` | 不支援 |
| 邏輯運算子 | `&&`、`\|\|` | `-a`、`-o`（已不推薦） |
| 空字串安全 | `[[ -z $var ]]` 不需引號 | `[ -z "$var" ]` 必須引號 |

**避免使用 `-a` / `-o`（POSIX deprecated）**：
```bash
# 不推薦（-a/-o 在複雜表達式中行為不一致）
[ -f "$file" -a -r "$file" ]

# 推薦（&& 更直觀）
[[ -f "$file" && -r "$file" ]]
# 或 POSIX 相容寫法（兩個獨立的 test）
[ -f "$file" ] && [ -r "$file" ]
```

## 邏輯運算子

用於組合多個表達式。

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `!` | **NOT**：反轉表達式的結果 | `[ ! -d /tmp/non_existent ]` |
| `-a` | **AND**：兩個表達式都為 `true` 時，結果才為 `true` | `[ -r "$file" -a -s "$file" ]` |
| `-o` | **OR**：兩個表達式只要有一個為 `true`，結果就為 `true` | `[ -d "$dir" -o -f "$dir" ]` |

**注意**：建議使用 `&&` 和 `||` 來取代 `-a` 和 `-o`，因為它們更符合現代 Shell 的標準且更安全。

```bash
# 使用 && (AND)
if [ -r "$file" ] && [ -s "$file" ]; then
  echo "檔案可讀且內容不為空"
fi

# 使用 || (OR)
if [ -d "$path" ] || [ -f "$path" ]; then
  echo "路徑是一個目錄或檔案"
fi
```

## 實用範例

### 範例 1：檢查目錄是否存在，若不存在則建立

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"

if [ ! -d "$LOG_DIR" ]; then
  echo "日誌目錄不存在，正在建立: $LOG_DIR"
  mkdir -p "$LOG_DIR"
else
  echo "日誌目錄已存在。"
fi
```

### 範例 2：檢查字串變數是否為空

```bash
#!/bin/bash

USERNAME=""

# ... 從某處讀取使用者名稱 ...

if [ -z "$USERNAME" ]; then
  echo "錯誤：使用者名稱不能為空！"
  exit 1
fi

# 另一種寫法
if [ ! "$USERNAME" ]; then
  echo "錯誤：使用者名稱不能為空！"
  exit 1
fi
```

### 範例 3：結合多個條件

```bash
#!/bin/bash

CONFIG_FILE="config.conf"

if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
  echo "設定檔存在且可讀取，載入設定..."
  source "$CONFIG_FILE"
else
  echo "警告：找不到設定檔或無法讀取。"
fi
```