# Bill.Lin's Notes

後端工程的技術筆記：演算法、架構、資料庫、Spring、System Design 等。

網站：https://bill-lin.dev/

## 技術

- [Astro](https://astro.build/) 靜態網站，pnpm 管理套件
- GitHub Actions 建置並部署到 GitHub Pages（`.github/workflows/deploy.yml`）
- 留言：[Giscus](https://giscus.app/)（GitHub Discussions）
- 站內搜尋：建置時產生 `/index.json`，瀏覽器端搜尋

## 本機開發

需要 Node.js 22.23.4 以上與 pnpm。

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # 輸出到 dist/，並檢查每篇文章的 front matter
```

## 寫文章

在 `content/post/<分類>/<slug>.md` 新增檔案：

```yaml
---
title: "文章標題"
date: 2026-01-15
draft: false
description: "60-120 字的摘要"
categories: ["Spring"]     # 恰好一個，等於所在資料夾名稱
tags: ["Spring Boot", "JPA", "Hibernate"]   # 至少 3 個
---
```

- 檔名用小寫英文 kebab-case，網址是 `/post/<分類小寫>/<檔名>/`
- 搬移或改名時，把舊網址加進 `aliases`
- 單篇關閉留言：`comments: false`

## 部署

push 到 `master` 就會自動建置並部署。
