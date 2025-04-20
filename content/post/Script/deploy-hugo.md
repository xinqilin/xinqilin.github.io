---
title: "Deploy Hugo"
author: Bill.Lin
date: 2020-06-28T12:36:19+08:00
draft: false
tags: ["Script"]
Description: ""
Categories: ["Script","hugo"]
DisableComments: false
---

# Deploy Hugo

<p>
設定好 hugo 後，new post 後通常都要 build 一次，讓 public 資料夾重新渲染一次獲得新的 html
</p>
<br>

```console
hugo -t <你的theme>
```
<p>
再來因為有設定 submodule 的關係，所以要分別對這兩個不同的 git repository 做 add-commit-push 的動作，有時會敲一敲感覺很煩躁，那不如簡化這個流程吧 !
</p>
<br>

# Flow


先確定一次流程

1. build 出 public 檔
1. add-commit-push  -> static website repository
1. add-commit-push -> backup repository 

<br>

# 製作 Script

先 touch 一個 **deploy.sh**
上述其實就三個步驟，把它的 command line 都填入 **deploy.sh**
<br>

接著我想要執行這個 **deploy.sh** 這個時順便填寫 git commit 的 message
<br>

先宣告一個變數吧 <**commit_message**>  =>
``commit_message = "$1"``
接著在需要用的變數的地方就可以直接使用 ``commit_message`` 來操縱
<br>
<br>

完成版:

```script

# build public/
hugo -t <你的theme>

commit_message = "$1"

# push public website
cd public/
git add . -A
git commit -m "$commit_message"
git push
cd ..

# push github backup
git add . -A
git commit -m "$commit_message"
git push

```


之後有新 post 要部屬上 github 時
就執行 script 檔就行了 !
<br>

```script

. deploy.sh <你要留的 commit message>

```

<br>
<br>

昨天電腦關機後想到的，之後看可不可以再改進腳本，讓他更方便



