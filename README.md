# 📝 Bill.Lin's Notes - Hugo 技術部落格

> 一個使用 Hugo 建構的技術分享部落格，專注於演算法、後端開發、架構設計等技術領域的學習筆記與實踐心得。

[![Hugo](https://img.shields.io/badge/Hugo-Extended-FF4088?style=flat&logo=hugo)](https://gohugo.io/)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-222?style=flat&logo=github)](https://xinqilin.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

🌐 **Live Demo**: [https://xinqilin.github.io/](https://xinqilin.github.io/)

---

## 📋 目錄

- [🚀 快速開始](#-快速開始)
- [📁 專案結構](#-專案結構)
- [⚡ 開發流程](#-開發流程)
- [📝 內容管理](#-內容管理)
- [🎨 主題特色](#-主題特色)
- [🔧 進階設定](#-進階設定)

---

## 🚀 快速開始

### 前置需求

- [Hugo Extended](https://gohugo.io/installation/) v0.110.0+
- [Git](https://git-scm.com/) v2.0+
- [Node.js](https://nodejs.org/) (可選，用於主題開發)

### clone 專案

```bash
# 1. 克隆主專案 (包含 submodule)
git clone --recurse-submodules git@github.com:xinqilin/blog-simple-version-source-code.git project-blog

cd project-blog

# 2. 如果遺漏了 submodule，手動初始化
git submodule init
git submodule update
```

### 本地開發

```bash
# 啟動開發伺服器
hugo server -D

# 瀏覽器開啟 http://localhost:1313
```

### 部署到 GitHub Pages

```bash
# 一鍵部署 (建構 + 推送到 GitHub Pages)
./deploy.sh "更新內容: 新增 XXX 文章"
```

---

## 📁 專案結構

```
project-blog/
├── 📄 hugo.yaml                 # Hugo 主配置檔
├── 📄 deploy.sh                 # 自動部署腳本
├── 📄 README.md                 # 專案說明文件
├── 📁 content/                  # 內容目錄
│   ├── 📁 post/                 # 技術文章
│   │   ├── 📁 Algorithm/        # 演算法與資料結構
│   │   ├── 📁 Backend/          # 後端開發技術
│   │   ├── 📁 Frontend/         # 前端開發技術
│   │   ├── 📁 DevOps/           # 開發營運技術
│   │   ├── 📁 Architecture/     # 架構設計模式
│   │   └── 📁 Tools/            # 開發工具腳本
│   └── 📄 about.md              # 關於頁面
├── 📁 themes/                   # Hugo 主題
│   └── 📁 minimal-clean/        # 自訂主題 (基於 minimal-clean)
│       ├── 📁 layouts/          # 網頁範本
│       ├── 📁 assets/           # CSS/JS 資源
│       └── 📁 static/           # 靜態資源
├── 📁 static/                   # 全域靜態檔案
│   ├── 📄 favicon.ico           # 網站圖示
│   ├── 📄 CNAME                 # GitHub Pages 域名設定
│   └── 📁 images/               # 圖片資源
└── 📁 public/                   # 生成的靜態網站 (Git Submodule)
    └── [GitHub Pages Repository]
```

### Repository 架構

| Repository | 用途 | 網址 |
|------------|------|------|
| **Source Code** | Hugo 原始碼、文章內容、主題 | [blog-simple-version-source-code](https://github.com/xinqilin/blog-simple-version-source-code) |
| **GitHub Pages** | 編譯後的靜態網站 | [xinqilin.github.io](https://github.com/xinqilin/xinqilin.github.io) |

---

## ⚡ 開發流程

### 1. 本地開發

```bash
# 📝 編寫文章
# 編輯 content/post/CategoryName/your-article.md

# 🔍 即時預覽
hugo server -D
# 瀏覽器自動重新載入: http://localhost:1313

# 🏗️ 建構網站 (可選)
hugo
```

### 2. 部署流程

```bash
# 🚀 自動部署 (推薦)
./deploy.sh "新增文章: React Hooks 使用指南"

# 📋 手動部署流程
# 1. 建構靜態網站
hugo

# 2. 推送到 GitHub Pages
cd public
git add .
git commit -m "更新網站內容"
git push origin main

# 3. 更新主專案 submodule 參考
cd ..
git add public
git commit -m "更新網站: $(date)"
git push origin main
```

### 3. 重要提醒

⚠️ **開發注意事項**:
- 本地開發時需要先執行 `hugo`，再執行 `hugo server -D`
- 修改主題檔案後，重新啟動開發伺服器才會生效
- 新增文章後，記得更新分類標籤

---

## 📝 內容管理

### 新增文章

```bash
# 方法 1: 手動建立
touch content/post/Backend/spring-boot-tutorial.md

# 方法 2: 使用 Hugo 指令
hugo new post/Backend/spring-boot-tutorial.md

hugo --gc && hugo build && hugo server -D
```

### 文章格式

```yaml
---
title: "Spring Boot 入門指南"
date: 2024-01-15T10:00:00+08:00
lastmod: 2024-01-15T10:00:00+08:00
draft: false
categories: ["Backend"]
tags: ["Spring Boot", "Java", "教學"]
description: "從零開始學習 Spring Boot 框架開發"
---

# 文章內容

這裡開始撰寫你的技術文章...
```

### 分類系統

| 分類 | 主題色彩 | 內容範圍 |
|------|----------|----------|
| 📊 **Algorithm** | 紫色 | 演算法實作、資料結構、LeetCode 解題 |
| ⚙️ **Backend** | 藍色 | Java、Spring、資料庫、API 設計 |
| 🎨 **Frontend** | 橙色 | Vue.js、React、JavaScript、CSS |
| 🚀 **DevOps** | 綠色 | Docker、CI/CD、雲端部署 |
| 🏗️ **Architecture** | 粉色 | 設計模式、系統架構、微服務 |
| 🛠️ **Tools** | 青色 | 開發工具、腳本、效率技巧 |

---

## 🎨 主題特色

### 視覺設計

- ✨ **現代化介面**: 簡潔優雅的卡片式設計
- � **彩色分類**: 每個技術領域都有專屬色彩主題
- 📱 **響應式佈局**: 完美適配桌面、平板、手機
- 🎭 **個人化元素**: 自訂 favicon 和 Q 版頭像

### 功能特色

- 🔍 **智慧搜尋**: 支援標題、內容、標籤搜尋
- 🏷️ **標籤系統**: 多維度文章分類與篩選
- 📊 **統計資訊**: 文章數量、字數統計
- 🌙 **深色模式**: 護眼深色主題 (規劃中)

### 效能最佳化

- ⚡ **靜態生成**: Hugo 超快速網站建構
- 🎯 **SEO 友善**: 結構化資料、sitemap、robots.txt
- 📈 **Analytics**: Google Analytics 整合
- 🚀 **CDN 加速**: GitHub Pages 全球加速

---

## 🔧 進階設定

### 自訂主題

如果需要修改網站外觀，主要檔案位置：

```
themes/minimal-clean/
├── layouts/
│   ├── _default/
│   │   ├── baseof.html          # 網頁基礎範本
│   │   ├── list.html            # 首頁範本
│   │   └── single.html          # 文章頁面範本
│   ├── partials/
│   │   ├── header.html          # 導航列
│   │   └── footer.html          # 頁尾
│   └── categories/
│       ├── terms.html           # 分類總覽頁面
│       └── list.html            # 個別分類頁面
└── assets/css/
    └── style.css                # 主要樣式檔案
```

### 重要檔案說明

| 檔案 | 功能 | 修改影響 |
|------|------|----------|
| `hugo.yaml` | 網站主配置 | 網站基本資訊、選單、SEO 設定 |
| `themes/minimal-clean/layouts/_default/list.html` | 首頁範本 | 首頁版面配置與內容 |
| `themes/minimal-clean/assets/css/style.css` | 主樣式表 | 網站整體視覺效果 |
| `content/about.md` | 關於頁面 | 個人簡介與網站說明 |
| `static/favicon.ico` | 網站圖示 | 瀏覽器標籤頁圖示 |

### SEO 設定

在 `hugo.yaml` 中已預設配置：

```yaml
params:
  author: "Bill Lin"
  description: "技術學習筆記與實踐分享"
  keywords: ["技術部落格", "程式開發", "學習筆記"]
  og_image: "/images/og-image.png"
  twitter_card: "summary_large_image"
```

---

### Q: Git Submodule 同步問題？

```bash
# 更新 submodule 到最新版本
git submodule update --remote --merge

# 重置 submodule 到正確狀態
git submodule deinit -f public
git submodule update --init
```

### Q: 部署後網站樣式異常？

```bash
# 檢查 Hugo 建構日誌
hugo --verbose

# 確認 baseURL 設定正確
grep baseURL hugo.yaml
```

---

## 📄 License

本專案採用 [MIT License](LICENSE) 授權。

## 🤝 Contributing

歡迎提交 Issue 或 Pull Request 來改善這個專案！

---

**Made with ❤️ by [Bill Lin](https://github.com/xinqilin)**