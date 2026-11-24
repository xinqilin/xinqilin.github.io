---
title: "Dockerfile 基礎：建構 Docker 映像檔的核心指令"
author: "Bill.Lin"
date: 2021-07-24T02:21:13+08:00
draft: false
tags: ["Docker", "Dockerfile", "DevOps", "Containerization", "Image Build"]
description: "本指南深入介紹 Dockerfile 的基本指令與最佳實踐，從基礎映像檔選擇到多階段建構，助您高效、安全地建構 Docker 映像檔。"
categories: ["Container"]
aliases:
  - /post/DevOps/Dockerfile-basic/

---

## 概述

Dockerfile 是一個包含一系列指令的文字檔案，Docker 引擎會讀取這些指令，並自動建構出 Docker 映像檔 (Image)。它定義了映像檔的內容、運行環境以及啟動時執行的指令。理解 Dockerfile 是掌握 Docker 容器化技術的關鍵一步。

## Dockerfile 核心指令詳解

### 1. 基礎指令

*   `FROM`：指定基礎映像檔。Dockerfile 的第一條指令必須是 `FROM`。
    *   **語法**：`FROM <image>[:<tag>]`
    *   **範例**：`FROM ubuntu:18.04` (使用 Ubuntu 18.04 作為基礎映像檔)
    *   **注意**：如果未指定 `tag`，預設為 `latest`。建議明確指定版本，以確保建構的可重複性。

*   `MAINTAINER`：指定映像檔的維護者資訊。
    *   **語法**：`MAINTAINER <name> [email]`
    *   **範例**：`MAINTAINER Your Name <you@example.com>`
    *   **注意**：此指令已過時，建議使用 `LABEL` 指令來替代，例如 `LABEL maintainer="Your Name <you@example.com>"`。

### 2. 執行指令

*   `RUN`：在建構映像檔時執行命令。每個 `RUN` 指令都會在映像檔中建立一個新的層 (layer)。
    *   **語法**：
        *   `RUN <command>` (shell 模式，預設使用 `/bin/sh -c` 執行)
        *   `RUN ["executable", "param1", "param2"]` (exec 模式，直接執行可執行檔)
    *   **範例 (shell 模式)**：
        ```dockerfile
        RUN apt-get update -y \
            && apt-get install nginx -y
        ```
        *   **注意**：使用 `&&` 將多個命令串聯起來，可以減少映像檔層數，優化映像檔大小。
    *   **範例 (exec 模式)**：
        ```dockerfile
        RUN ["./test.php", "dev", "offline"]
        # 等同於在容器內執行 `./test.php dev offline`
        ```

*   `CMD`：設定容器啟動時預設執行的命令。如果 `docker run` 命令後帶有參數，`CMD` 的命令會被覆蓋。一個 Dockerfile 中只能有一個 `CMD`，多個 `CMD` 只有最後一個生效。
    *   **語法**：
        *   `CMD ["executable", "param1", "param2"]` (exec 模式，推薦)
        *   `CMD ["param1", "param2"]` (作為 `ENTRYPOINT` 的預設參數)
        *   `CMD command param1 param2` (shell 模式)
    *   **範例**：`CMD ["nginx", "-g", "daemon off;"]` (啟動 Nginx 並保持在前台運行)
    *   **注意**：`CMD` 會被 `docker run <image> <command>` 中的 `<command>` 覆蓋。

*   `ENTRYPOINT`：設定容器啟動時執行的命令。`ENTRYPOINT` 不會被 `docker run` 後的參數覆蓋，而是將這些參數作為 `ENTRYPOINT` 命令的參數。
    *   **語法**：`ENTRYPOINT ["executable", "param1", "param2"]` (exec 模式，推薦)
    *   **範例**：`ENTRYPOINT ["docker-entrypoint.sh"]`
    *   **`CMD` 與 `ENTRYPOINT` 組合使用**：
        當 `ENTRYPOINT` 和 `CMD` 都使用 exec 模式時，`CMD` 的內容會作為 `ENTRYPOINT` 的參數。
        ```dockerfile
        FROM nginx
        ENTRYPOINT ["nginx", "-c"]
        CMD ["/etc/nginx/nginx.conf"]
        # 容器啟動時實際執行：nginx -c /etc/nginx/nginx.conf
        ```
        這種組合常用於設定固定的啟動命令，同時允許使用者透過 `CMD` 或 `docker run` 參數來提供預設或自訂的參數。

### 3. 環境設定

*   `WORKDIR`：設定工作目錄。後續的 `RUN`, `CMD`, `ENTRYPOINT`, `COPY`, `ADD` 指令都會在這個目錄下執行。
    *   **語法**：`WORKDIR /path/to/workdir`
    *   **範例**：
        ```dockerfile
        WORKDIR /app
        COPY . /app # 將建構上下文中的檔案複製到容器的 /app 目錄
        ```

*   `USER`：指定運行容器時的用戶或用戶組。
    *   **語法**：`USER <user>[:<group>]`
    *   **範例**：`USER nobody` (以非 root 用戶運行，提高安全性)
    *   **注意**：預設為 `root`。在生產環境中，建議使用非 root 用戶運行應用程式。

*   `VOLUME`：建立一個掛載點，將容器內的路徑標記為外部掛載點，用於持久化資料或共享資料。
    *   **語法**：`VOLUME ["/data"]`
    *   **範例**：`VOLUME /var/lib/mysql` (將 MySQL 資料目錄標記為儲存卷)

*   `ARG`：定義建構時的變數。這些變數只在 `docker build` 過程中有效，不會保留在最終的映像檔中。
    *   **語法**：`ARG <name>[=<default value>]`
    *   **範例**：
        ```dockerfile
        ARG VERSION=1.0
        FROM myapp:${VERSION}
        ```
    *   **使用**：`docker build --build-arg VERSION=2.0 .`

*   `ENV`：設定環境變數。這些變數會保留在最終的映像檔中，並在容器運行時可用。
    *   **語法**：`ENV <key>=<value> ...`
    *   **範例**：
        ```dockerfile
        ENV MY_PATH /usr/local
        WORKDIR $MY_PATH # WORKDIR 可以使用 ENV 定義的變數
        ```

*   `EXPOSE`：聲明容器運行時監聽的埠。這只是一個文件說明，並不會實際發布埠。要發布埠，需要在 `docker run` 或 `docker-compose.yml` 中使用 `-p` 或 `ports`。
    *   **語法**：`EXPOSE <port> [<port>...]`
    *   **範例**：`EXPOSE 8080` (聲明容器會監聽 8080 埠)

### 4. 檔案操作

*   `COPY`：將建構上下文中的檔案或目錄複製到映像檔中。
    *   **語法**：`COPY <src>... <dest>`
    *   **範例**：`COPY ./target/mms.war /app/mms.war` (將主機 `target` 目錄下的 `mms.war` 複製到容器的 `/app` 目錄)
    *   **注意**：`COPY` 只能複製本地建構上下文中的檔案。

*   `ADD`：與 `COPY` 類似，但 `ADD` 具有額外的功能：
    *   如果 `<src>` 是一個壓縮檔 (如 `.tar`, `.gz`, `.zip`)，它會自動解壓縮到 `<dest>`。
    *   如果 `<src>` 是一個 URL，它會從該 URL 下載檔案。
    *   **語法**：`ADD <src>... <dest>`
    *   **範例**：`ADD https://example.com/app.tar.gz /app/`
    *   **注意**：由於 `ADD` 的自動解壓縮和 URL 下載功能可能導致不確定性，通常建議優先使用 `COPY`，除非您明確需要 `ADD` 的特殊功能。

## Docker Build 流程

使用 `docker build` 命令來建構 Docker 映像檔。

*   **語法**：`docker build [OPTIONS] PATH | URL | -`
*   **範例**：`docker build -t my-app:1.0 .`
    *   `-t my-app:1.0`：為映像檔指定名稱和標籤。
    *   `.`：指定建構上下文的路徑。Docker 會將此路徑下的所有檔案發送到 Docker Daemon，作為建構過程的上下文。

## 範例：Java Spring Boot 應用程式的多階段建構

多階段建構 (Multi-stage Builds) 允許您在一個 Dockerfile 中使用多個 `FROM` 指令。每個 `FROM` 指令都可以使用不同的基礎映像檔，並且每個階段都可以獨立地建構。最終的映像檔只包含您需要的最終產物，大大減少了映像檔的大小。

```dockerfile
# --- 第一階段：建構應用程式 ---
# 使用一個包含 Java 開發工具包 (JDK) 的映像檔來編譯和打包應用程式
FROM openjdk:11-jdk-slim AS build

# 設定工作目錄
WORKDIR /app

# 將 Maven 的設定檔複製到容器中 (如果有的話)
# COPY settings.xml /root/.m2/

# 將專案的 pom.xml 複製到容器中，並下載依賴，利用 Docker 層快取
COPY pom.xml .
RUN mvn dependency:go-offline

# 將所有原始碼複製到容器中
COPY src ./src

# 編譯並打包應用程式，生成 JAR 檔案
RUN mvn clean package -DskipTests

# --- 第二階段：運行應用程式 ---
# 使用一個輕量級的 Java 運行環境 (JRE) 映像檔來運行應用程式
FROM openjdk:11-jre-slim

# 設定環境變數，指定應用程式的 JAR 檔案路徑
ENV APP_HOME=/app

# 設定工作目錄
WORKDIR $APP_HOME

# 從第一階段複製編譯好的 JAR 檔案
COPY --from=build /app/target/*.jar app.jar

# 暴露應用程式監聽的埠
EXPOSE 8080

# 定義容器啟動時執行的命令
ENTRYPOINT ["java", "-jar", "app.jar"]
```

這個範例展示了如何使用多階段建構來：
1.  在第一個階段 (`build`) 中編譯 Java 應用程式，生成一個 JAR 檔案。
2.  在第二個階段中，只複製最終的 JAR 檔案到一個更小的 JRE 基礎映像檔中。

這樣可以避免將編譯工具、原始碼等不必要的內容包含在最終的運行映像檔中，從而顯著減小映像檔大小，提高安全性和部署效率。

透過熟練掌握 Dockerfile 的各項指令和最佳實踐，您可以更有效地建構和管理您的 Docker 映像檔。

## 進階最佳實踐

### .dockerignore 減少 build context

```dockerignore
# .dockerignore
node_modules/
.git/
*.log
target/
.env
```

沒有 `.dockerignore` 時，`docker build` 會把整個目錄（含 `node_modules`、`.git`）送到 Docker daemon，大幅增加 build 時間。

### Layer Cache 最佳化排序

**依賴的 layer 改變頻率越低，放越前面**：

```dockerfile
# 不好的順序（程式碼變動 -> 重新 COPY package.json -> 重新 npm install）
COPY . .
RUN npm install

# 好的順序（package.json 不動 -> npm install 從 cache 讀取）
COPY package.json package-lock.json ./
RUN npm install
COPY . .
```

### Distroless / Scratch 映像（最小化）

```dockerfile
# Multi-stage build + distroless（Google）
FROM eclipse-temurin:21 AS builder
COPY . .
RUN ./gradlew bootJar

FROM gcr.io/distroless/java21-debian12
COPY --from=builder /app/build/libs/app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

Distroless 映像：
- 無 shell（無法 `docker exec sh`）→ 安全性高
- 映像大小大幅減少（約 50-80MB vs JDK 映像 500MB+）
- 適合生產環境；開發環境仍用完整 JDK 映像