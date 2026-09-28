---
title: "GitHub SSH 金鑰設定"
author: Bill.Lin
date: 2022-02-09T19:46:19+08:00
draft: false
tags: ["Git", "GitHub", "SSH", "PAT", "Authentication"]
Description: "GitHub SSH 金鑰設定、Classic vs Fine-grained PAT 比較，以及 SSH vs HTTPS 選型指南"
Categories: ["Git"]
DisableComments: false
aliases:
  - /post/Others/Github-ssh/
  - /post/tools/github-ssh/

---

### GitHub SSH Setting

```bash

    cd ~/
    mkdir .ssh 
    ssh-keygen -t ed25519 -C "your_email@example.com"
    
    (是否要用預設檔名) enter >> (密碼) enter >> (密碼確認) enter

    cat .ssh/id_ed25519.pub
    >> 跑出公鑰 貼到 github 上

    ssh -T git@github.com
    >> 測試連線 >> "Hi xinqilin! You've successfully authenticated, but GitHub does not provide shell access."

```


### 重設 remote url => https 改 ssh

```bash
    git remote rm origin
    git remote add origin [url]
```

### 應用程式要用的 token

Settings → Developer settings → Personal access tokens → Generate new token

## Personal Access Token (PAT) 類型

### Classic PAT vs Fine-grained PAT

| | Classic PAT | Fine-grained PAT（推薦） |
|--|------------|------------------------|
| 存取範圍 | 帳號層級，可存取全部 repo | 指定 repo 或 org |
| 過期時間 | 可設定，可永不過期 | 最長 1 年 |
| 細粒度權限 | 粗粒度（read:repo、write:packages） | 細粒度（如只有 contents:read） |
| 推薦場景 | 舊系統整合 | 新開發，CI/CD |

### 建立 Fine-grained PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 選擇 Resource owner（個人或 org）
3. 選擇 Repository access（Only select repositories）
4. 配置最小 Permissions（原則：最小權限）
5. 設定過期日期（建議 90 天，配合 CI 定期 rotate）

### SSH Key vs HTTPS PAT

| | SSH Key | HTTPS + PAT |
|--|---------|------------|
| 設定複雜度 | 略高（需管理 key pair） | 低 |
| CI/CD | 需安全存放私鑰 | Token 存 secret，較方便 |
| 互動操作 | 推薦（無需每次輸入） | 需搭配 credential helper |
| Fine-grained 控制 | 無（key 綁定整個帳號） | Fine-grained PAT 支援 |

## 參考資料

- [GitHub SSH 金鑰產生與加入 ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Fine-grained PAT 文件](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)