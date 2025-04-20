---
title: "Github Ssh"
author: Bill.Lin
date: 2022-02-09T19:46:19+08:00
draft: false
tags: []
Description: ""
Categories: ["github", "ssh"]
DisableComments: false
---

<a href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent" alt="GitHub 教學">GitHub 教學 </a>

### GitHub SSH Setting

```zsh

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

```zsh
    git remote rm origin
    git remote add origin [url]
```

### 應用程式要用的 token

setting -> developer setting -> personal access token -> generate new token

