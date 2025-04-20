---
title: "Find"
author: Bill.Lin
date: 2022-11-01T21:59:56+08:00
draft: false
tags: []
Description: ""
Categories: ["Script"]
DisableComments: false
---

# find

```zsh

    find {目錄path} -name {fileName}
    find . -name test.txt
    find . -iname test.txt // 不分大小寫

```

### -type

 - d: dir
 - p: pipeline
 - f: file
 - -empty (空檔案)
 - -user  (特定使用者)

```zsh

    find / -type d -name Script
    find . -type f -name "*.kt"
    find . -type d -empty
    find . -type f -empty
    find . -user linxinqi -name test.txt
    find . -user root -name test.txt

```

### -perm (感覺少用)

```zsh

    find . -type f -perm 0755

```

### -exec 
find 之後可接 -exec 做其他指令
最後接 `{} \;`

```zsh

    find . -type f -name "test.txt" -exec rm -f {} \;

```

### 日期時間

m: modify
a: access
s: last update time
time: 天
min: 分鐘

- -mtime 
- -mmin 
- -atime 
- -amin 
- -ctime 
- -cmin 

```zsh

    find . -mtime 3  // 三天前有被改過的
    find . -mtime -3 // 三天內有被改過的
    find . -mtime +3 // 三天以上有被改過的
    find . -mtime +3 -mtime -5 // 三天上, 五天以內 有被改過的

```

### file size

-size

```zsh

    find . -size 50M
    find . -size +50M -size -100M
    find . -size +100M -exec rm -rf {} \;
```


#### reference:  <br>
[GT.Wang部落格 - Unix/Linux 的 find 指令使用教學、技巧與範例整理](https://blog.gtwang.org/linux/unix-linux-find-command-examples/)