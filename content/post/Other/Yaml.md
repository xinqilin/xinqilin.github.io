---
title: "Yaml"
author: Bill.Lin
date: 2021-06-29T13:45:56+08:00
draft: false
tags: []
Description: ""
Categories: ["Yaml","Script"]
DisableComments: false
---

# 前情提要

在 Java 常用的 framework spring boot 中 (~~Spring MVC 沒有 它還是用一大狗票 Xml...~~)，常可以看到 .properties 與 .yml 檔案做設定，連現在使用的 hugo 也可以使用 yaml 與 toml 設定，並不是唯一，但如果今天要去配置 K8S 的話， yaml 就不得不學了


### Yaml

Basic
```yaml
# 註解
---  開始符號
```

接著就是有點像 JSON 的 key-value 表示

```yaml
apiVersion: v1
```


階層關西的話 => 換行加縮排 <br>
以下等於  spring.datasource.username = root

```yaml
spring:
  datasource:
    username: root
```

常見陣列 => 換行 縮排並在開頭加上 "-" 並空一格<br>
內容可用來包 複雜物件

```yaml
args:
 - "parameter1"
 - "parameter2"

```

但陣列好像也可以這樣 (簡單模式)

```yaml
items: [ 1, 2, 3, 4, 5 ]
args: [ "parameter1", "parameter2" ]
```

<br>

以下範例 參考 <a href="https://www.cloudbees.com/blog/yaml-tutorial-everything-you-need-get-started"> CloudBee YAML Tutorial</a>

<br>

```yaml
---
 doe: "a deer, a female deer"
 ray: "a drop of golden sun"
 pi: 3.14159
 xmas: true
 french-hens: 3
 calling-birds:
   - huey
   - dewey
   - louie
   - fred
 xmas-fifth-day:
   calling-birds: four
   french-hens: 3
   golden-rings: 5
   partridges:
     count: 1
     location: "a pear tree"
   turtle-doves: two

```

相等於 JSON

```json
{
  "doe": "a deer, a female deer",
  "ray": "a drop of golden sun",
  "pi": 3.14159,
  "xmas": true,
  "french-hens": 3,
  "calling-birds": [
     "huey",
     "dewey",
     "louie",
     "fred"
  ],
  "xmas-fifth-day": {
  "calling-birds": "four",
  "french-hens": 3,
  "golden-rings": 5,
  "partridges": {
    "count": 1,
    "location": "a pear tree"
  },
  "turtle-doves": "two"
  }
}
```

