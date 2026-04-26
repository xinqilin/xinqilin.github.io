---
title: "Docker MySQL：容器化部署與設定"
author: "Bill.Lin"
date: 2022-01-18T23:56:44+08:00
draft: false
tags: ["Docker", "MySQL", "DevOps", "Database", "Containerization"]
Description: "本指南詳細介紹如何使用 Docker 容器化部署 MySQL 資料庫，包含常用啟動指令、資料持久化、字元集設定及連接方式，助您快速建立開發與測試環境。"
Categories: ["DevOps"]
DisableComments: false
---

## 概述

在現代開發流程中，使用 Docker 部署資料庫已成為主流。將 MySQL 運行在 Docker 容器中，可以帶來許多好處：環境隔離、快速部署、版本控制、以及方便的遷移。這篇文章將引導您如何在 Docker 中設定和管理 MySQL 容器。

## 啟動 MySQL 容器

> **鏡像選擇**：`mysql/mysql-server` 是 Oracle 的私有版本（不同於 Docker Hub 官方鏡像），現已標記為 deprecated。請使用官方 `mysql` 鏡像（`docker.io/library/mysql`）。

使用 `docker run` 指令可以快速啟動一個 MySQL 容器。以下是一個常用的範例，包含了密碼設定、埠映射和字元集設定。

```bash
docker run \
    --name mysql-server \
    -e MYSQL_ROOT_PASSWORD=your_strong_password \
    -p 3306:3306 \
    -d \
    mysql:8.0 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci \
    --skip-character-set-client-handshake
```

### 指令參數說明

*   `--name mysql-server`: 為容器指定一個易於識別的名稱，這裡命名為 `mysql-server`。
*   `-e MYSQL_ROOT_PASSWORD=your_strong_password`: 設定 MySQL `root` 使用者的密碼。**請務必將 `your_strong_password` 替換為您自己的強密碼**。
*   `-p 3306:3306`: 將主機的 3306 埠映射到容器的 3306 埠。這樣您就可以從主機透過 3306 埠連接到容器內的 MySQL 服務。
*   `-d`: 以背景模式 (detached mode) 運行容器，讓容器在背景執行。
*   `mysql:8.0`: 指定要使用的 Docker 映像檔。使用 Docker Hub 官方 `mysql` 鏡像。
*   `--character-set-server=utf8mb4`: 設定 MySQL 伺服器的預設字元集為 `utf8mb4`，以支援更廣泛的字元，包括表情符號。
*   `--collation-server=utf8mb4_unicode_ci`: 設定伺服器的預設排序規則為 `utf8mb4_unicode_ci`，這是一種不區分大小寫和重音的排序規則。
*   `--skip-character-set-client-handshake`: 禁用客戶端字元集握手。這有助於確保客戶端和伺服器之間的字元集一致性，避免亂碼問題。

### 字元集設定的等效配置

上述字元集相關的 `docker run` 參數，在 MySQL 的配置檔 (`my.cnf`) 中，等效於以下設定：

```ini
[client]
default-character-set=utf8mb4

[mysql]
default-character-set=utf8mb4

[mysqld]
collation-server = utf8mb4_unicode_ci
character-set-server = utf8mb4
```

## 資料持久化 (Data Persistence)

對於資料庫容器，資料持久化是至關重要的。如果沒有將資料儲存到主機上，一旦容器被移除，所有資料都將丟失。Docker 提供了兩種主要方式來實現資料持久化：**綁定掛載 (Bind Mounts)** 和 **具名儲存卷 (Named Volumes)**。

### 使用具名儲存卷 (推薦)

具名儲存卷由 Docker 管理，是持久化資料的最佳方式。

```bash
docker run \
    --name mysql-server \
    -e MYSQL_ROOT_PASSWORD=your_strong_password \
    -p 3306:3306 \
    -d \
    -v mysql_data:/var/lib/mysql \
    mysql:8.0 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci \
    --skip-character-set-client-handshake
```

*   `-v mysql_data:/var/lib/mysql`: 這裡 `mysql_data` 是一個具名儲存卷。Docker 會自動創建並管理這個儲存卷，將容器內 `/var/lib/mysql` (MySQL 資料預設儲存路徑) 的資料持久化到這個儲存卷中。

您可以透過 `docker volume ls` 查看所有具名儲存卷，並透過 `docker volume inspect mysql_data` 查看其詳細資訊。

### 使用綁定掛載

綁定掛載允許您將主機上的任意目錄直接掛載到容器中。

```bash
docker run \
    --name mysql-server \
    -e MYSQL_ROOT_PASSWORD=your_strong_password \
    -p 3306:3306 \
    -d \
    -v /path/to/your/mysql_data:/var/lib/mysql \
    mysql:8.0 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci \
    --skip-character-set-client-handshake
```

*   `-v /path/to/your/mysql_data:/var/lib/mysql`: 將主機上的 `/path/to/your/mysql_data` 目錄掛載到容器內的 `/var/lib/mysql`。**請將 `/path/to/your/mysql_data` 替換為您主機上的實際路徑**。

## 連接到 MySQL 容器

一旦 MySQL 容器運行起來，您有多種方式可以連接到它。

### 從主機連接

如果您的主機上安裝了 MySQL 客戶端，可以直接透過 `localhost` 和映射的埠連接：

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p
```

然後輸入您在 `docker run` 指令中設定的 `MYSQL_ROOT_PASSWORD`。

### 進入容器內部連接

您可以使用 `docker exec` 指令進入運行中的容器，然後在容器內部使用 MySQL 客戶端：

```bash
# 進入容器的 bash shell
docker exec -it mysql-server /bin/bash

# 在容器內部執行 MySQL 客戶端
mysql -u root -p
```

然後輸入密碼。

### Apple Silicon（M1/M2/M3）注意事項

MySQL 官方鏡像自 8.0.27+ 提供多架構支援（`linux/amd64` + `linux/arm64`），無需指定 platform。
若使用較舊版本或遇到相容性問題：

```bash
docker run --platform linux/amd64 mysql:8.0 ...
```

M1/M2 上也可考慮使用 ARM 原生版本：

```yaml
services:
  db:
    image: mysql:8.0
    platform: linux/arm64  # M1/M2 原生效能較好
```

## Docker Compose 搭配 healthcheck

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: mydb
    volumes:
      - mysql_data:/var/lib/mysql  # 資料持久化
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:  # named volume，由 Docker 管理
```

## 最佳實踐與考量

*   **密碼安全**：在生產環境中，請勿將密碼直接寫在 `docker run` 指令中。考慮使用 Docker Secrets 或環境變數檔案 (`.env`) 來管理敏感資訊。
*   **資源限制**：對於生產環境，建議為 MySQL 容器設定 CPU 和記憶體限制，以避免其佔用過多主機資源。
*   **日誌管理**：監控 MySQL 容器的日誌 (`docker logs mysql-server`) 對於故障排除非常重要。
*   **Docker Compose**：對於多服務應用程式，強烈建議使用 Docker Compose 來定義和管理 MySQL 服務，這會讓整個應用程式的部署和管理更加便捷。

透過 Docker 容器化部署 MySQL，您可以更高效、更靈活地管理您的資料庫環境。