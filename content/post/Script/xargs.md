---
title: "Xargs"
author: Bill.Lin
date: 2022-11-02T23:05:25+08:00
draft: false
tags: []
Description: ""
Categories: ["Tools"]
DisableComments: false
---

### xargs extended arguments

pipeline 中間操作, 將輸入的資料切割成多個字串，並將這些字串當成指定指令

若沒給 command 則 default echo 並濾掉 換行符號\tab\空白

```zsh

    $ xargs a b
    $ c
    $ d 
    ctrl + D
    $ a b c d


    $ echo a b c d e f | xargs
    $ a b c d e f

    find / -perm +700 -name 'good.txt' | xargs ls -al

```

- -t 先 print 再執行
- -n 參數來指定每一次執行指令所使用的參數個數上限值
- -p 參數，讓指令在實際執行指令之前可以先進行確認的動作 y/n (逐行確認執行 有點像 debug mode)
- -r 避免空字串作為參數來執行指令 no-run-if-empty 
- -L/-l {int} 一次讀取幾行給 command
- -d{string} 自訂 split 字元 
- -I/-i '{}' 換成下一個 command 中的 {}
- -P Parallel mode: run at most maxprocs invocations of utility at once. If maxprocs is set to 0, xargs will run as many processes as possible.

```zsh

    $ echo a b c d e f | xargs -n 2
    $ a b 
    $ c d
    $ e f

    $ echo a b c d e f | xargs -p -n 2
    # 逐行確認...

    $ echo a b c d e f  | xargs -t
    $ /bin/echo a b c d e f
    $ a b c d e f


    $ echo "name1name1name1name" | xargs -d1
    $ name name name name

    $ echo aaa bbb ccc | xargs -I {} echo $* {} -l 
    $ aaa bbb ccc -l
    

    # 高階技巧 from Mosky
    $ seq 1 5 | shuf | xargs -P 5 -I {} sh -c 'sleep {} && echo {}'
    $ 1
    $ 2
    $ 3
    $ 4
    $ 5

```


#### 常與 find 一起使用
若要執行的檔案中有空格 ex: "Program File.txt"

使用 -print0 印出 full name 給 pipe
xargs 加上 -0

find . -name "*.txt" -print0 | xargs -0 rm -rf

```zsh

    find ~/project -name "*.txt" | xargs rm -f

```



#### reference:  <br>
[GT.Wang部落格 - Unix/Linux 的 find 指令使用教學、技巧與範例整理](https://blog.gtwang.org/linux/unix-linux-find-command-examples/)






