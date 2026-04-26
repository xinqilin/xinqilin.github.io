---
title: "Docker Compose 完整指南：多容器應用程式的定義與執行"
author: "Bill.Lin"
date: 2021-07-26T02:21:13+08:00
draft: false
tags: ["Docker", "Docker Compose", "DevOps", "Containerization", "Microservices", "YAML"]
Description: "深入解析 Docker Compose 的核心概念、常用指令與 `docker-compose.yml` 設定檔的撰寫方式，幫助您輕鬆定義與管理多容器應用程式的生命週期。"
Categories: ["DevOps"]
DisableComments: false
aliases:
  - /post/DevOps/Docker-compose/

---

## 概述

在現代應用程式開發中，一個專案往往由多個服務組成，例如前端、後端 API、資料庫、快取等。這些服務各自運行在不同的容器中，而 Docker Compose 正是為了解決這種多容器應用程式的定義與管理而生。

Docker Compose 允許您使用一個 YAML 檔案 (`docker-compose.yml`) 來定義應用程式的所有服務、網路和儲存卷，然後透過單一指令啟動、停止或管理整個應用程式堆疊。這極大地簡化了開發、測試和部署的流程。

## 常用 Docker Compose 指令

以下是 Docker Compose 的一些常用指令，用於管理您的多容器應用程式：

| 指令 | 說明 | 範例 |
| :--- | :--- | :--- |
| `docker-compose --version` | 顯示 Docker Compose 的版本資訊。 | `docker-compose --version` |
| `docker-compose -h` | 顯示 Docker Compose 的幫助訊息。 | `docker-compose -h` |
| `docker-compose up` | 啟動並建立所有服務的容器。如果容器已存在，則會重新建立。 | `docker-compose up` |
| `docker-compose up -d` | 在背景模式 (detached mode) 啟動並建立所有服務的容器。 | `docker-compose up -d` |
| `docker-compose down` | 停止並移除所有服務的容器、網路和預設儲存卷。 | `docker-compose down` |
| `docker-compose exec <service_name> <command>` | 在指定服務的容器中執行指令。 | `docker-compose exec microService /bin/bash` |
| `docker-compose ps` | 列出所有服務的容器狀態。 | `docker-compose ps` |
| `docker-compose top` | 顯示服務容器的運行進程。 | `docker-compose top` |
| `docker-compose logs <service_name>` | 顯示指定服務容器的日誌輸出。 | `docker-compose logs microService` |
| `docker-compose config` | 驗證 `docker-compose.yml` 檔案的語法是否正確，並顯示解析後的配置。 | `docker-compose config` |
| `docker-compose config -q` | 靜默模式驗證配置，只在有錯誤時輸出訊息。 | `docker-compose config -q` |
| `docker-compose restart <service_name>` | 重新啟動指定服務的容器。若未指定服務，則重新啟動所有服務。 | `docker-compose restart microService` |
| `docker-compose start <service_name>` | 啟動指定服務的容器。若未指定服務，則啟動所有已停止的服務。 | `docker-compose start microService` |
| `docker-compose stop <service_name>` | 停止指定服務的容器。若未指定服務，則停止所有運行中的服務。 | `docker-compose stop microService` |

### 常用組合指令

```bash
# 驗證配置後，停止並重新啟動所有服務
docker-compose config -q && docker-compose down && docker-compose up -d
```

## `docker-compose.yml` 檔案結構詳解

`docker-compose.yml` 是 Docker Compose 的核心配置檔案，它使用 YAML 語法來定義應用程式的服務。

```yaml
# 指定 Docker Compose 檔案格式的版本，建議使用最新穩定版 (目前為 '3.x')
version: "3.8" # 建議使用 3.8 或更高版本，以支援更多功能

# 定義應用程式中的所有服務 (即容器)
services:
    # 自訂服務名稱，例如 'microService'、'web'、'db' 等
    microService:
        # 指定服務所使用的 Docker 映像檔
        image: my_image:1.0
        # 定義容器的名稱，方便識別和管理
        container_name: ms_01
        # 埠映射：將主機埠映射到容器埠 (HOST_PORT:CONTAINER_PORT)
        ports:
            - "8081:8080" # 將主機的 8081 埠映射到容器的 8080 埠
        # 儲存卷映射：將主機路徑映射到容器路徑 (HOST_PATH:CONTAINER_PATH)
        volumes:
            - /Users/bill/microService:/app # 將主機的 /Users/bill/microService 目錄映射到容器的 /app 目錄
        # 指定服務所連接的網路
        networks:
            - my_network # 連接到名為 'my_network' 的網路
        # 定義服務的啟動順序依賴關係
        # 注意：depends_on 只保證服務啟動順序，不保證服務內部應用程式完全就緒
        # 可搭配 https://github.com/vishnubob/wait-for-it 或其他健康檢查機制確保服務可用
        depends_on:
            - redis # microService 服務會在 redis 服務啟動後才啟動
            - mysql # microService 服務會在 mysql 服務啟動後才啟動
        # 範例：等同於 `docker run -d -p 8081:8080 -v /Users/bill/microService:/app --network my_network`

    redis:
        image: redis:6.0.8 # 使用 Redis 6.0.8 映像檔
        ports:
            - "6379:6379" # 映射 Redis 預設埠
        volumes:
            # 映射 Redis 配置檔，讓容器使用自訂配置
            - /app/redis/redis.conf:/etc/redis/redis.conf
            # 映射 Redis 資料目錄，實現資料持久化
            - /app/redis/data:/data
        networks:
            - my_network
        # 覆寫容器的預設啟動指令，讓 Redis 使用指定的配置檔啟動
        command: redis-server /etc/redis/redis.conf

    mysql:
        image: mysql:5.7 # 使用 MySQL 5.7 映像檔
        # 設定 MySQL 容器的環境變數
        environment:
            MYSQL_ROOT_PASSWORD: '123456' # 設定 root 使用者的密碼
            MYSQL_ALLOW_EMPTY_PASSWORD: 'no' # 不允許 root 密碼為空
            MYSQL_DATABASE: 'my_test_db' # 建立一個名為 'my_test_db' 的資料庫
            MYSQL_USER: 'bill' # 建立一個名為 'bill' 的使用者
            MYSQL_PASSWORD: 'user_pwd' # 設定 'bill' 使用者的密碼
        ports:
            - "3306:3306" # 映射 MySQL 預設埠
        volumes:
            # 映射 MySQL 資料目錄，實現資料持久化
            - /app/mysql/db:/var/lib/mysql
            # 映射 MySQL 配置檔
            - /app/mysql/conf/my.cnf:/etc/my.cnf
            # 映射初始化腳本目錄，容器啟動時會執行此目錄下的 .sh 或 .sql 腳本
            - /app/mysql/init:/docker-entrypoint-initdb.d
        networks:
            - my_network
        # 解決 MySQL 8.0 之後預設認證插件導致外部客戶端無法連接的問題
        command: --default-authentication-plugin=mysql_native_password

# 定義應用程式使用的網路
networks:
    my_network: # 自訂網路名稱，所有服務將在此網路中互相通訊

# 定義應用程式使用的儲存卷 (可選，如果服務中直接使用匿名卷或綁定掛載則不需要在此定義)
# volumes:
#     my_data: # 自訂儲存卷名稱
