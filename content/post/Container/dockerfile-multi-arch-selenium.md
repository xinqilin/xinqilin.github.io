---
title: "Selenium Grid Multi-Architecture Docker 映像建構"
author: "Bill.Lin"
date: 2021-07-25T02:21:13+08:00
draft: false
tags: ["Docker", "Dockerfile", "Multi-stage Build", "Selenium", "Node.js", "DevOps", "Cross-platform"]
Description: "使用 Dockerfile 建構跨 linux/amd64 與 linux/arm64 的 Selenium 多架構映像，處理 NVM 路徑設定與多階段建構"
Categories: ["DevOps"]
DisableComments: false
aliases:
  - /post/DevOps/Dockerfile-docker_in_docker/

---

> **檔名說明**：本文原名 `Dockerfile-docker_in_docker.md`，但實際內容是 Selenium 多架構映像建構，與 DinD（Docker in Docker）技術無關。標題已更正以符合實際內容。

## 概述

在自動化測試和網路爬蟲等場景中，經常需要將應用程式與瀏覽器自動化工具 (如 Selenium) 打包到同一個 Docker 容器中。此外，為了支援不同的運行環境（例如 ARM64 或 x86_64 架構，以及 Firefox 或 Chrome 瀏覽器），我們需要一個靈活的建構流程。

本文將深入解析一個多階段 Dockerfile，它展示了如何：
1.  建構一個包含 Node.js 應用程式的基礎映像檔。
2.  利用這個基礎映像檔，為不同的 CPU 架構和瀏覽器環境建立多個最終的 Selenium 應用程式映像檔。
3.  透過一個通用的 `entrypoint.sh` 腳本，在容器啟動時自動判斷環境並執行對應的測試。

## Dockerfile 詳解

這個 Dockerfile 採用了多階段建構 (Multi-stage Builds) 的方式，以確保最終映像檔的輕量化和模組化。

### 第一階段：應用程式建構 (`build` 階段)

這個階段負責準備 Node.js 環境並打包應用程式。

```dockerfile
FROM ubuntu:22.04 AS build

# 設定環境變數
ENV NVM_DIR /opt/nvm          # NVM (Node Version Manager) 的安裝目錄
ENV NODE_VERSION v16.13.2     # 指定要安裝的 Node.js 版本
ENV APP_DIR /app              # 應用程式的工作目錄

# 建立必要的目錄
RUN [ -d $APP_DIR ] || mkdir -p $APP_DIR
RUN [ -d $NVM_DIR ] || mkdir -p $NVM_DIR

# 更新套件列表並安裝 curl (用於下載 NVM)
RUN apt-get update && apt-get install curl -y

# 安裝 NVM 和指定版本的 Node.js
# 從 GitHub 下載 NVM 安裝腳本
RUN curl -o $NVM_DIR/install.sh https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh
# 執行 NVM 安裝腳本（只安裝 NVM 本身，尚未安裝 Node.js）
RUN /bin/bash $NVM_DIR/install.sh
# 使用 NVM 安裝並啟用指定版本的 Node.js（必須在 PATH 設定前完成）
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm use $NODE_VERSION && nvm alias default $NODE_VERSION
# 安裝完成後再設定 PATH，確保路徑實際存在
ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

# 複製應用程式檔案
COPY test /app/test          # 複製 'test' 目錄
COPY *.js /app/              # 複製所有 .js 檔案
COPY *.json /app/            # 複製所有 .json 檔案
COPY *.sh /app/              # 複製所有 .sh 腳本
RUN chmod 0755 /app/*.sh     # 為腳本添加執行權限

# 設定工作目錄並安裝 Node.js 依賴
WORKDIR $APP_DIR
RUN npm install
```

### 第二階段：Selenium 瀏覽器映像檔建構 (多個 `FROM` 階段)

這個 Dockerfile 為不同的 CPU 架構 (ARM64, x86_64) 和瀏覽器 (Firefox, Chrome) 定義了多個最終映像檔。每個階段都從一個預先建構好的 Selenium 映像檔開始，並將第一階段建構好的應用程式複製進來。

#### ARM64 架構 - Firefox 瀏覽器

```dockerfile
FROM seleniarm/standalone-firefox:latest AS arm64-firefox

# 設定終端機和語言環境變數
ENV TERM="xterm-color"
ENV LANG='en_US.UTF-8'
ENV LANGUAGE='en_US.UTF-8'

# 重新設定 NVM 和應用程式目錄 (因為是新的 FROM 階段)
ENV NVM_DIR /opt/nvm
ENV NODE_VERSION v16.13.2
ENV APP_DIR /app

# 建立目錄並調整權限 (使用 sudo 和 chown 是因為基礎映像檔可能以非 root 用戶運行)
RUN [ -d $APP_DIR ] || (sudo mkdir -p $APP_DIR && sudo chown `whoami`:`id -g -n` $APP_DIR)
RUN [ -d $NVM_DIR ] || (sudo mkdir -p $NVM_DIR && sudo chown `whoami`:`id -g -n` $NVM_DIR)

# 從 'build' 階段複製 NVM 安裝腳本並執行
COPY --from=build $NVM_DIR/install.sh $NVM_DIR
RUN /bin/bash $NVM_DIR/install.sh

# 設定 PATH 環境變數
ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

# 從 'build' 階段複製應用程式檔案
COPY --from=build $APP_DIR $APP_DIR
# 調整應用程式目錄的擁有者為 'seluser' (Selenium 映像檔的預設用戶)
RUN chown seluser:seluser $APP_DIR

# 設定工作目錄
WORKDIR $APP_DIR

# 定義容器啟動時執行的命令 (將由 entrypoint.sh 腳本處理)
CMD [ "/app/entrypoint.sh" ]
```

#### ARM64 架構 - Chrome 瀏覽器

```dockerfile
FROM seleniarm/standalone-chromium:latest AS arm64-chrome
# ... (與 arm64-firefox 階段類似的環境變數、目錄建立、NVM 安裝、應用程式複製和權限調整) ...
CMD [ "/app/entrypoint.sh" ]
```

#### x86_64 架構 - Firefox 瀏覽器

```dockerfile
FROM selenium/standalone-firefox:latest AS x86_64-firefox
# ... (與 arm64-firefox 階段類似的環境變數、目錄建立、NVM 安裝、應用程式複製和權限調整) ...
CMD [ "/app/entrypoint.sh" ]
```

#### x86_64 架構 - Chrome 瀏覽器

```dockerfile
FROM selenium/standalone-chrome:latest AS x86_64-chrome
# ... (與 arm64-firefox 階段類似的環境變數、目錄建立、NVM 安裝、應用程式複製和權限調整) ...
CMD [ "/app/entrypoint.sh" ]
```

## `entrypoint.sh` 腳本詳解

這個腳本是容器啟動時執行的入口點，它負責根據運行環境動態判斷要執行的 `npm` 腳本，並確保 Selenium 服務已啟動。

```bash
#!/bin/bash

# 根據容器中存在的瀏覽器可執行檔來設定 SCRIPTS 變數
# 如果找到 firefox，則 SCRIPTS 為 "docker-firefox"
[ -f /usr/bin/firefox ] && export SCRIPTS="docker-firefox"
# 如果找到 chromium-browser 或 google-chrome，則 SCRIPTS 為 "docker-chrome"
[ -f /usr/bin/chromium-browser ] && export SCRIPTS="docker-chrome"
[ -f /usr/bin/google-chrome ] && export SCRIPTS="docker-chrome"

# 判斷 CPU 架構 (uname -m 會回傳機器硬體名稱)
uu=`uname -m`
echo 'uname -m:' $uu
if [ "$uu" = "arm64" ] || [ "$uu" = "aarch64" ];then
    # 如果是 ARM64 架構，則在 SCRIPTS 後面加上 "-arm64"
    export SCRIPTS="$SCRIPTS-arm64"
fi

# 啟動 Selenium 服務的入口點腳本 (通常由基礎映像檔提供)
# 將標準輸出和標準錯誤重定向到 /dev/null，使其在背景靜默運行
/opt/bin/entry_point.sh > /dev/null 2>&1 &

# 等待 Selenium 服務啟動 (檢查 localhost:4444 是否可訪問)
for number in {1..120} # 最多等待 120 秒
do
    if curl -s http://localhost:4444; then # -s 靜默模式，不顯示進度或錯誤
        break # 如果成功訪問，則跳出迴圈
    fi
    echo "Waiting selenium service," $number # 顯示等待訊息
    sleep 1 # 每秒檢查一次
done

# 再次檢查 Selenium 服務是否成功啟動，如果沒有則退出並報錯
if ! curl -s http://localhost:4444; then
    echo "Selenium service failed to start."
    exit 1
fi

# 進入應用程式目錄
cd /app
# 執行對應的 npm 腳本
echo "npm run $SCRIPTS"
npm run $SCRIPTS
```

## 最佳實踐與考量

*   **多階段建構**：此 Dockerfile 充分利用了多階段建構的優勢，將建構環境與運行環境分離，顯著減小了最終映像檔的大小，並提高了安全性。
*   **跨平台支援**：透過為不同 CPU 架構和瀏覽器建立獨立的階段，實現了單一 Dockerfile 支援多種運行環境的能力。
*   **權限管理**：在複製應用程式檔案後，使用 `chown` 調整檔案擁有者，確保應用程式以非 `root` 用戶運行，這是一個重要的安全實踐。
*   **健壯的啟動腳本**：`entrypoint.sh` 腳本包含了等待外部服務 (Selenium) 啟動的邏輯，這使得容器的啟動更加健壯和可靠。
*   **環境變數**：合理使用 `ENV` 指令來管理版本號和路徑，提高了 Dockerfile 的可維護性。

透過這個詳細的 Dockerfile 和啟動腳本，您可以高效地建構和部署跨平台的 Selenium 自動化測試應用程式。