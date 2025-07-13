---
title: "sed"
author: Bill.Lin
date: 2019-01-18T10:23:31+08:00
draft: false
tags: []
Description: ""
Categories: ["Tools"]
DisableComments: false
---

### sed

sed [options] '[地址定界] command' file(s)
sed 	-e	'1,8	s/	[Tt]he/	THE/	g'	MyFile.txt 

```

   -n：不輸出模式空間內容到螢幕，即不自動列印，只列印匹配到的行
   -e：參數指定要執行的編輯指令
   -f：把Script寫到檔案當中，在執行sed時-f 指定檔案路徑，如果是多個Script，換行寫
   -r：支援擴充套件的正則表達式
   -i：直接處理檔案
   -i.bak：在將處理的結果寫入檔案之前備份一份
   
   不給地址：對全文進行處理
   單地址：
   #: 指定的行
   /pattern/：被此處模式所能夠匹配到的每一行
   地址範圍：
   #,#
   #,+#
   /pat1/,/pat2/
   #,/pat1/
   ~：步進
    sed -n '1~2p'  只列印奇數行 （1~2 從第1行，一次加2行）
    sed -n '2~2p'  只列印偶數行

```

```
   d：刪除模式空間匹配的行，並立即啓用下一輪回圈
   p：列印當前模式空間內容，追加到預設輸出之後
   a：在指定行後面追加文字，支援使用\n實現多行追加
   i：在行前面插入文字，支援使用\n實現多行追加
   c：替換行爲單行或多行文字，支援使用\n實現多行追加
   w：儲存模式匹配的行至指定檔案
   r：讀取指定檔案的文字至模式空間中匹配到的行後
   =：爲模式空間中的行列印行號
   !：模式空間中匹配行取反處理
   s///：查詢替換，支援使用其它分隔符，如：s@@@，s###；
   加g表示行內全域性替換；
   在替換時，可以加一下命令，實現大小寫轉換
   \l：把下個字元轉換成小寫。
   \L：把replacement字母轉換成小寫，直到\U或\E出現。
   \u：把下個字元轉換成大寫。
   \U：把replacement字母轉換成大寫，直到\L或\E出現。
   \E：停止以\L或\U開始的大小寫轉換
 ```


### example

sed -e 's/word1/word2/g'

```zsh

# s/find/replace/g
# s: 5s 只處理第五行, 5,10s 五到十行
# g: 全部, 不打: 只換第一個, 2: 換第二個, gi: ignore case

sed -i -e 's/word1/word2/g' input.txt

# 將所有英文字轉為大寫
sed -i -e 's/.*/\U&/' input.txt

# 將所有英文字轉為小寫
sed -i -e 's/.*/\L&/' input.txt

find . -name '*.ts' -type f -exec sed -i 's/pattern\([s]\)/要換的字\1/g' '{}' \;

```


reference: 
   <a href="https://tw511.com/a/01/11537.html" alt="TW511教學網" target="_blank">TW511教學網</a>
   <a href="https://officeguide.cc/linux-sed-find-and-replace-text-in-file-tutorial-examples/" alt="office" target="_blank">office</a>

