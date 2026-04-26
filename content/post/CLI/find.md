---
title: "Find 命令完整指南：Linux 檔案搜尋與管理的瑞士軍刀"
author: Bill.Lin
date: 2022-11-01T21:59:56+08:00
draft: false
tags: ["Linux", "Find", "Command Line", "File Search", "System Administration", "Shell", "Unix"]
Description: "深入解析 Linux find 命令的完整用法，包含檔案搜尋、條件過濾、批次操作與實戰應用場景"
Categories: ["Tools"]
DisableComments: false
aliases:
  - /post/Tools/Find/

---

## 概述

`find` 是 Linux/Unix 系統中最強大且最常用的檔案搜尋命令之一。它不僅能夠根據各種條件搜尋檔案和目錄，還能對搜尋結果執行各種操作，是系統管理員和開發者必備的核心工具。

### 核心特徵

- **遞歸搜尋**：可深入子目錄進行搜尋
- **多重條件**：支援檔名、類型、大小、時間等多種搜尋條件
- **動作執行**：可對搜尋結果執行各種操作
- **邏輯組合**：支援 AND、OR、NOT 等邏輯運算
- **高效能**：針對大型檔案系統優化

## 基本語法

```bash
find [搜尋路徑] [搜尋條件] [動作]
```

### 基本使用範例

```bash
# 在當前目錄搜尋檔案
find . -name "test.txt"

# 在指定目錄搜尋
find /home/user -name "*.log"

# 忽略大小寫搜尋
find . -iname "README.md"

# 搜尋多個目錄
find /var/log /tmp -name "*.tmp"
```

## 依據檔案名稱搜尋

### 基本檔名搜尋

```bash
# 精確檔名匹配
find /home -name "config.conf"

# 萬用字元搜尋
find . -name "*.txt"           # 所有 .txt 檔案
find . -name "test*"           # 以 test 開頭的檔案
find . -name "*backup*"        # 包含 backup 的檔案

# 忽略大小寫
find . -iname "*.PDF"          # 不分大小寫搜尋 PDF 檔案
find . -iname "readme*"        # 不分大小寫搜尋 readme 開頭的檔案
```

### 進階檔名搜尋

```bash
# 使用正規表達式
find . -regex ".*\.\(jpg\|png\|gif\)$"    # 搜尋圖片檔案
find . -iregex ".*\.\(mp3\|mp4\|avi\)$"   # 不分大小寫搜尋媒體檔案

# 排除特定檔案
find . -name "*.txt" ! -name "temp*"      # 搜尋 txt 但排除 temp 開頭
find . ! -name ".*"                       # 排除隱藏檔案

# 多個條件組合
find . \( -name "*.log" -o -name "*.tmp" \) # OR 條件
find . -name "*.txt" -a -size +1M         # AND 條件
```

## 依據檔案類型搜尋

### 基本檔案類型

```bash
# 檔案類型參數說明
# f: 一般檔案    d: 目錄
# l: 符號連結    p: 命名管道 (FIFO)
# s: socket      b: 區塊裝置
# c: 字元裝置

# 搜尋目錄
find /var -type d -name "log*"

# 搜尋一般檔案
find . -type f -name "*.sh"

# 搜尋符號連結
find /usr/bin -type l

# 搜尋空檔案
find /tmp -type f -empty

# 搜尋空目錄
find /home -type d -empty
```

### 實際應用範例

```bash
# 找出所有 shell 腳本
find /usr/local/bin -type f -name "*.sh" -executable

# 找出所有損壞的符號連結
find /usr -type l ! -exec test -e {} \; -print

# 找出包含特定副檔名的目錄
find . -type d -exec sh -c 'ls "$1"/*.log >/dev/null 2>&1' _ {} \; -print
```

## 依據檔案大小搜尋

### 基本大小搜尋

```bash
# 大小單位說明
# c: bytes     k: KB (1024 bytes)
# M: MB        G: GB
# +: 大於      -: 小於      精確值: 等於

# 基本大小搜尋
find . -size 50M                    # 等於 50MB
find . -size +100M                  # 大於 100MB
find . -size -1G                    # 小於 1GB
find /var/log -size +10M -size -100M # 10MB 到 100MB 之間
```

### 進階大小操作

```bash
# 找出最大的檔案（前 10 個）
find /home -type f -exec ls -la {} \; | sort -k5 -nr | head -10

# 找出超過 1GB 的檔案並顯示大小
find / -size +1G -type f -exec du -h {} \; 2>/dev/null

# 找出空檔案並刪除
find /tmp -type f -empty -delete

# 找出大檔案並詢問是否刪除
find /var/log -size +100M -type f -ok rm {} \;

# 按大小範圍分類顯示
find . -type f -size +10M -size -100M -printf "%s %p\n" | sort -nr
```

## 依據時間搜尋

### 時間類型說明

```bash
# 時間類型
# mtime: 修改時間 (modify time)
# atime: 存取時間 (access time)  
# ctime: 狀態改變時間 (change time)

# 時間單位
# 預設單位: 天 (24小時)
# +n: n天之前
# -n: n天之內
# n:  恰好n天前
```

### 基本時間搜尋

```bash
# 修改時間搜尋
find . -mtime 3                     # 恰好 3 天前修改
find . -mtime -7                    # 7 天內修改
find . -mtime +30                   # 30 天前修改
find . -mtime +7 -mtime -30         # 7-30 天前修改

# 存取時間搜尋
find /home -atime -1                # 1 天內被存取
find /tmp -atime +7                 # 7 天以上未被存取

# 狀態改變時間
find . -ctime -1                    # 1 天內狀態改變
```

### 精確時間搜尋

```bash
# 分鐘為單位的時間搜尋
find /var/log -mmin -60             # 60 分鐘內修改
find . -amin +120                   # 120 分鐘前存取
find /tmp -cmin -30                 # 30 分鐘內狀態改變

# 比較檔案時間
find . -newer reference.txt         # 比 reference.txt 新的檔案
find . -cnewer backup.tar           # 狀態比 backup.tar 新

# 指定日期範圍
find /var/log -newermt "2023-01-01" ! -newermt "2023-12-31"

# 今天修改的檔案
find . -daystart -mtime 0

# 昨天修改的檔案
find . -daystart -mtime 1
```

## 依據權限搜尋

### 基本權限搜尋

```bash
# 精確權限匹配
find /home -perm 755                # 權限恰好是 755
find . -perm 644                    # 權限恰好是 644

# 包含指定權限
find /usr/bin -perm -755            # 至少有 755 權限
find . -perm -u+x                   # 擁有者有執行權限

# 任一符合權限
find /tmp -perm /222                # 任何人有寫入權限
find . -perm /u+w,g+w,o+w          # 任何人有寫入權限

# 可執行檔案
find /usr/local/bin -type f -executable
find . -type f -perm -u+x           # 擁有者可執行
```

### 進階權限搜尋

```bash
# 找出 SUID 檔案
find /usr -perm -4000 -type f 2>/dev/null

# 找出 SGID 檔案
find /usr -perm -2000 -type f 2>/dev/null

# 找出 sticky bit 目錄
find /tmp -perm -1000 -type d

# 找出可寫的檔案（安全檢查）
find /etc -type f -writable 2>/dev/null

# 找出無權限讀取的檔案
find /home -type f ! -readable 2>/dev/null
```

## 依據擁有者搜尋

### 基本擁有者搜尋

```bash
# 依據使用者搜尋
find /home -user john               # 屬於 john 的檔案
find /var -user root                # 屬於 root 的檔案
find . -user $(whoami)              # 屬於當前使用者的檔案

# 依據群組搜尋
find /home -group developers        # 屬於 developers 群組
find /var/www -group www-data       # 屬於 www-data 群組

# 依據 UID/GID 搜尋
find /home -uid 1000                # UID 為 1000 的檔案
find /var -gid 100                  # GID 為 100 的檔案
```

### 進階擁有者搜尋

```bash
# 找出無主檔案（孤兒檔案）
find /home -nouser                  # 沒有對應使用者的檔案
find /var -nogroup                  # 沒有對應群組的檔案

# 組合條件搜尋
find /home -user john -group staff  # 屬於 john 且群組是 staff
find /tmp -user root ! -group root  # 屬於 root 但群組不是 root

# 找出特定使用者的大檔案
find /home -user john -size +100M -type f
```

## 執行動作 (-exec 和 -ok)

### 基本 -exec 用法

```bash
# 基本語法：-exec command {} \;
# {} 代表找到的檔案
# \; 表示命令結束

# 刪除找到的檔案
find /tmp -name "*.tmp" -exec rm {} \;

# 複製檔案
find . -name "*.txt" -exec cp {} backup/ \;

# 移動檔案
find . -name "*.log" -exec mv {} /var/log/ \;

# 修改權限
find /var/www -type f -exec chmod 644 {} \;
find /var/www -type d -exec chmod 755 {} \;
```

### 進階 -exec 用法

```bash
# 使用 -exec {} + 提高效能（批次處理）
find . -name "*.txt" -exec grep "pattern" {} +
find /tmp -name "*.tmp" -exec rm {} +

# 執行複雜命令
find . -type f -name "*.sh" -exec sh -c 'echo "Processing: $1"; chmod +x "$1"' _ {} \;

# 在找到的目錄中執行命令
find /var/log -type d -exec sh -c 'echo "Directory: $1"; ls -la "$1"' _ {} \;

# 條件執行
find . -name "*.txt" -exec test -s {} \; -exec echo "Non-empty: {}" \;
```

### 互動式 -ok 用法

```bash
# -ok 會在執行前詢問確認
find /tmp -name "*.old" -ok rm {} \;

# 互動式移動檔案
find . -name "*.bak" -ok mv {} backup/ \;

# 互動式權限修改
find /home -name "*.sh" -ok chmod +x {} \;
```

## 邏輯運算符

### 基本邏輯運算

```bash
# AND 運算（預設）
find . -name "*.txt" -size +1M      # 名稱是 *.txt 且大小 > 1M
find . -type f -user john           # 是檔案且屬於 john

# OR 運算
find . \( -name "*.txt" -o -name "*.md" \)  # txt 或 md 檔案
find . -type f \( -name "*.log" -o -name "*.tmp" \)

# NOT 運算
find . -type f ! -name "*.txt"      # 不是 txt 的檔案
find . ! -path "*/.*"               # 排除隱藏目錄
```

### 複雜邏輯組合

```bash
# 複雜條件組合
find . \( -name "*.txt" -o -name "*.md" \) -a -size +1k -a ! -path "*/tmp/*"

# 多重排除條件
find /var/log \( ! -name "*.gz" ! -name "*.old" \) -type f -mtime -7

# 巢狀邏輯條件
find . \( \( -name "*.c" -o -name "*.h" \) -a -mtime -7 \) -o \( -name "*.py" -a -size +10k \)
```

## 輸出格式化

### 使用 -printf 格式化輸出

```bash
# 基本格式化
find . -type f -printf "%f\n"                    # 只顯示檔名
find . -type f -printf "%p\t%s\n"               # 路徑和大小
find . -type f -printf "%M %u %g %s %p\n"       # 權限、擁有者、群組、大小、路徑

# 時間格式化
find . -type f -printf "%TY-%Tm-%Td %TH:%TM %p\n"  # 修改時間和路徑
find . -type f -printf "%Ac %p\n"                   # 存取時間

# 大小格式化
find . -type f -printf "%10s %p\n" | sort -nr       # 按大小排序
```

### 格式化參數說明

```bash
# 常用格式化參數
# %p: 檔案路徑
# %f: 檔案名稱
# %s: 檔案大小（bytes）
# %M: 檔案權限
# %u: 擁有者名稱
# %g: 群組名稱
# %T: 時間相關（需配合時間格式）
# %h: 目錄路徑
# %d: 檔案深度
```

## 實戰應用場景

### 系統清理與維護

```bash
# 清理臨時檔案
find /tmp -type f -atime +7 -delete                # 刪除 7 天未存取的檔案
find /var/log -name "*.log" -size +100M -delete    # 刪除大日誌檔案

# 清理快取檔案
find ~/.cache -type f -atime +30 -delete           # 清理舊快取

# 備份前清理
find /backup -name "*.tar.gz" -mtime +30 -delete   # 刪除 30 天前的備份
```

### 檔案整理與歸檔

```bash
# 按日期歸檔檔案
find /data -type f -name "*.log" -mtime +1 -exec gzip {} \;

# 按大小分類檔案
find /home -type f -size +1G -exec ls -lh {} \;

# 移動舊檔案到歸檔目錄
find /project -type f -mtime +90 -exec mv {} /archive/ \;
```

### 安全檢查

```bash
# 檢查 SUID/SGID 檔案
find /usr -type f \( -perm -4000 -o -perm -2000 \) -exec ls -l {} \;

# 檢查可寫檔案
find /etc -type f -writable 2>/dev/null

# 檢查無主檔案
find /home -nouser -o -nogroup

# 檢查異常權限
find /var/www -type f ! -perm 644 -o -type d ! -perm 755
```

### 開發與除錯

```bash
# 搜尋程式碼
find . -name "*.java" -exec grep -l "className" {} \;

# 找出編譯產生的檔案
find . \( -name "*.class" -o -name "*.o" -o -name "*.pyc" \) -delete

# 統計不同類型檔案數量
find . -type f -name "*.java" | wc -l
find . -type f -name "*.py" -exec wc -l {} + | tail -1

# 檢查程式碼行數
find . -name "*.py" -exec wc -l {} + | sort -nr | head -10
```

### 監控與分析

```bash
# 找出最近修改的檔案
find /var/log -type f -mmin -60 -exec ls -lt {} \;

# 監控檔案系統變化
find /etc -newer /tmp/baseline -type f

# 分析磁碟使用
find /home -type f -printf "%s %p\n" | sort -nr | head -20

# 找出重複檔案（基於大小）
find /data -type f -printf "%s %p\n" | sort | uniq -d -w 10
```

## 效能優化技巧

### 提升搜尋效能

```bash
# 限制搜尋深度
find /usr -maxdepth 3 -name "*.conf"

# 排除不必要的目錄
find / -path /proc -prune -o -path /sys -prune -o -name "*.txt" -print

# 使用更具體的路徑
find /var/log -name "*.log"    # 好
find / -name "*.log"           # 較慢

# 將最具選擇性的條件放在前面
find . -name "*.txt" -size +1M  # 好
find . -size +1M -name "*.txt"  # 也可以，但順序影響效能
```

### 批次處理優化

```bash
# 使用 {} + 而非 {} \; 提升效能
find . -name "*.txt" -exec wc -l {} +     # 快
find . -name "*.txt" -exec wc -l {} \;    # 慢

# 使用管道處理大量結果
find /var/log -name "*.log" -print0 | xargs -0 grep "ERROR"

# 並行處理
find . -name "*.jpg" -print0 | xargs -0 -P 4 -I {} convert {} {}.thumb.jpg
```

## 常見錯誤與解決方案

### 權限錯誤處理

```bash
# 忽略權限錯誤
find /var -name "*.log" 2>/dev/null

# 只搜尋有權限的目錄
find /var -readable -name "*.log"

# 使用 sudo 搜尋受保護的目錄
sudo find /root -name "*.conf"
```

### 特殊字元處理

```bash
# 處理檔名中的空格
find . -name "* *" -print0 | xargs -0 ls -l

# 處理特殊字元
find . -name "file[1-3].txt"
find . -name "*.txt" -not -name "*\&*"
```

### 記憶體使用優化

```bash
# 避免一次載入過多結果
find /large_dir -name "*.txt" | head -100

# 使用 -quit 在找到第一個結果後停止
find . -name "target.txt" -quit

# 分段處理大目錄
find /huge_dir -maxdepth 1 -type d | while read dir; do
    find "$dir" -name "*.txt"
done
```

## 與其他工具組合

### 與 grep 組合

```bash
# 在檔案中搜尋內容
find . -name "*.txt" -exec grep -l "pattern" {} \;

# 搜尋並顯示匹配行
find . -name "*.log" -exec grep -Hn "ERROR" {} \;

# 使用 xargs 提升效能
find . -name "*.txt" | xargs grep "pattern"
find . -name "*.txt" -print0 | xargs -0 grep "pattern"
```

### 與 tar 組合

```bash
# 備份找到的檔案
find /home -name "*.doc" -print0 | tar -czf backup.tar.gz --null -T -

# 歸檔舊檔案
find /data -mtime +30 -print0 | tar -czf old_files.tar.gz --null -T -
```

### 與 rsync 組合

```bash
# 同步找到的檔案
find /source -name "*.txt" -print0 | rsync -av --files-from=- --from0 /source/ /destination/
```

## 總結

### 核心優勢

1. **強大的搜尋能力**：支援多種條件組合搜尋
2. **批次操作**：可對搜尋結果執行各種動作
3. **高度可配置**：豐富的參數和選項
4. **跨平台相容**：在各種 Unix-like 系統中一致

### 最佳實踐

1. **明確搜尋範圍**：使用具體的路徑而非根目錄
2. **合理使用條件**：將最具選擇性的條件放在前面
3. **善用邏輯運算**：合理組合 AND、OR、NOT 條件
4. **注意效能**：大目錄搜尋時考慮使用 -maxdepth 限制
5. **安全操作**：使用 -ok 而非 -exec 進行危險操作

### 常用技巧記憶

```bash
# 日常最常用的模式
find . -name "*.txt"                    # 基本檔名搜尋
find . -type f -size +100M              # 大檔案搜尋
find . -mtime -7                        # 最近修改檔案
find . -name "*.tmp" -delete            # 清理臨時檔案
find . -name "*.sh" -exec chmod +x {} \; # 批次修改權限
```

`find` 命令的強大之處在於其靈活性和可組合性。熟練掌握這個工具，能夠大幅提升 Linux 系統管理和日常工作的效率。記住：實務中最重要的是理解各種條件的組合邏輯，並根據實際需求選擇最適合的搜尋策略。

## 參考資料

- [GNU Findutils Manual](https://www.gnu.org/software/findutils/manual/html_mono/find.html)
- [Linux man find](https://linux.die.net/man/1/find)
- [Advanced Bash-Scripting Guide](https://tldp.org/LDP/abs/html/)
- [Unix Power Tools](https://www.oreilly.com/library/view/unix-power-tools/0596003307/)