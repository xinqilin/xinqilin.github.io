---
title: "YAML 語法從入門到實踐"
author: "Bill.Lin"
date: 2021-06-29T13:45:56+08:00
draft: false
tags: ["YAML", "Configuration", "Kubernetes", "Spring Boot", "DevOps"]
Description: "本文詳細介紹了 YAML 的核心語法，包括鍵值對、陣列、物件等資料結構，並透過與 JSON 的比較，幫助您快速上手，應用於 Kubernetes、Spring Boot 等現代開發場景。"
Categories: ["Tools"]
DisableComments: false
aliases:
  - /post/Tools/Yaml/

---

## 前言

在現代軟體開發中，設定檔是不可或缺的一環。從 Java 的 Spring Boot 框架 (Spring MVC 過往使用大量的 XML)，到我目前使用的 Hugo 靜態網站產生器，都能看到 `.properties`、`.yml` 或 `.toml` 等格式的身影。

雖然這些格式各有優勢，但在雲原生領域，特別是設定 Kubernetes (K8s) 資源時，YAML (YAML Ain't Markup Language) 已成為事實上的標準。因此，掌握 YAML 的語法至關重要。

## 核心語法

YAML 的設計目標是易於人類閱讀和撰寫。它的語法主要基於縮排和幾個簡單的符號。

- **註解**: 使用 `#` 號標示單行註解。
- **文件開頭**: 使用三個連字號 `---` 作為文件的開始符號 (選用)。

### 鍵值對 (Key-Value Pair)

YAML 的基本組成單位是鍵值對，格式為 `key: value` (注意冒號後面需要一個空格)。

```yaml
apiVersion: v1
```

### 階層/物件 (Objects)

透過換行和縮排 (建議使用兩個空格) 來表示階層關係。這在 JSON 中相當於一個物件。

以下範例等同於 `spring.datasource.username = "root"`。

```yaml
spring:
  datasource:
    username: root
```

### 陣列/列表 (Arrays/Lists)

陣列有兩種常見的表示方式：

1.  **塊序列 (Block Sequence)**: 透過換行、縮排，並在每個元素前加上 `-` (連字號 + 空格) 來表示。這種形式更易讀，且元素可以是複雜的物件。

    ```yaml
    args:
      - "parameter1"
      - "parameter2"
    ```

2.  **流序列 (Flow Sequence)**: 將所有元素放在方括號 `[]` 中，並用逗號分隔。適合表示簡單的一維陣列。

    ```yaml
    items: [1, 2, 3, 4, 5]
    args: ["parameter1", "parameter2"]
    ```

## 綜合範例

讓我們來看一個更完整的範例，這個範例來自 [CloudBees YAML Tutorial](https://www.cloudbees.com/blog/yaml-tutorial-everything-you-need-get-started)。

### YAML 格式

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

### 等效的 JSON 格式

這個 YAML 結構可以完全對應到以下的 JSON 物件，展示了其清晰的資料表達能力。

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

## 參考資料

- [CloudBees YAML Tutorial](https://www.cloudbees.com/blog/yaml-tutorial-everything-you-need-get-started)
- [菜鳥教程 - YAML 簡介](https://www.runoob.com/w3cnote/yaml-intro.html)