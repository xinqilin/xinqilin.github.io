---
title: "FileExpress"
author: Bill.Lin
date: 2022-10-01T21:25:56+08:00
draft: false
tags: []
Description: ""
Categories: ["Tools"]
DisableComments: false
---

### File relations (文件表達式)

[ -e xxx] 

```
    // return true / false

    -e filename 如果 filename file存在
    -d filename 如果 filename 為 dir
    -f filename 如果 filename 為常規文件
    -L filename 如果 filename 為符號連接
    -r filename 如果 filename 可讀取
    -w filename 如果 filename 可寫入
    -x filename 如果 filename 可執行
    -s filename 如果 大小不為 0
    -h filename 如果 是 link

    f1 -nt f2 f1 是否比 f2 新
    f1 -ot f2 f1 是否比 f2 舊

```

```

    -eq  '='
    -ne  '!='
    -gt  '>'
    -ge  '>='
    -lt  '<'
    -le  '<='

```


#### exercise

``` 

    if  [ -n $string  ]          
    if  [ -z $string  ]   
    if  [ $sting ]                
    if [ ! express ]
    if [ ! -d $num ]
    if [ express1  –a  express2 ]
    if [ express1 –o express2 ]

```