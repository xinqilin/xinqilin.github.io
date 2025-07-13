# Bill.Lin's Hugo Blog

這是一個使用 Hugo 建構的技術部落格，採用 **Git Submodule** 架構來管理 source code 和生成的靜態網站。

## 專案架構

```
主專案 (Source Code)
├── content/          # Markdown 文章
├── themes/          # Hugo 主題
├── hugo.yaml        # Hugo 配置
├── deploy.sh        # 部署腳本
└── public/          # Git Submodule -> GitHub Pages Repository
```

## Repository 結構

- **Source Code**: [`https://github.com/xinqilin/blog-simple-version-source-code`](https://github.com/xinqilin/blog-simple-version-source-code)
- **GitHub Pages**: [`https://github.com/xinqilin/xinqilin.github.io`](https://github.com/xinqilin/xinqilin.github.io)
- **Live Site**: [`https://xinqilin.github.io/`](https://xinqilin.github.io/)

## 部署方式

### 1. 基本部署
```bash
./deploy.sh "您的 commit 訊息"
```

### 2. 部署流程說明
1. 執行 `hugo` 指令建構靜態網站
2. 將生成的檔案推送到 GitHub Pages repository (public/ submodule)
3. 更新主專案中的 submodule 參考
4. 將 source code 推送到主 repository

## 初始設定 (僅需執行一次)

### 複製專案
```bash
git clone --recurse-submodules git@github.com:xinqilin/blog-simple-version-source-code.git
cd blog-simple-version-source-code
```

### 如果已經複製但沒有 submodule
```bash
git submodule init
git submodule update
```

## 新增文章

1. 在 `content/post/` 目錄下新增 Markdown 檔案
2. 使用 `./deploy.sh "新增文章: 文章標題"` 部署

## 本地開發

```bash
# 啟動本地開發伺服器
hugo server -D

# 瀏覽器開啟 http://localhost:1313
```

## Git Submodule 優勢

✅ **清晰分離**: Source code 和生成的網站完全分離  
✅ **獨立版本控制**: 每個 repository 都有自己的歷史記錄  
✅ **自動部署**: 一個指令同時更新兩個 repository  
✅ **便於管理**: 避免混淆 source code 和 generated code  

## 主題資訊

- **主題**: minimal-clean
- **語言**: 繁體中文 (zh-tw)
- **特色**: 簡潔、現代化的技術部落格介面

---

## 原始安裝記錄

### 安裝

```zsh
hugo new site blog --format yaml

git init

git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

git submodule update --init --recursive

# 更新 submodule 時
# git submodule update --remote --merge
```

### 啟動

```zsh
hugo server
```

- [參考](https://github.com/adityatelange/hugo-PaperMod/wiki/Installation)