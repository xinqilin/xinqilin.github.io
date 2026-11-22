---
title: "Docker 網路模式詳解：容器間通訊與外部連接"
author: "Bill.Lin"
date: 2021-07-26T02:21:13+08:00
draft: false
tags: ["Docker", "Network", "DevOps", "Containerization", "Bridge", "Host"]
description: "深入解析 Docker 提供的各種網路模式，包括 Bridge、Host、None 和 Container 模式，並詳細說明如何建立自訂網路以實現容器間的順暢通訊與外部連接。"
categories: ["Container"]
disableComments: false
aliases:
  - /post/DevOps/Docker-Network/
  - /post/devops/network/

---

## 概述

Docker 網路是容器化應用程式的基石，它決定了容器如何與外部世界通訊，以及容器之間如何互相連接。理解 Docker 的網路模式對於建構穩健、可擴展的容器化應用程式至關重要。本文將詳細介紹 Docker 提供的幾種主要網路模式及其應用場景。

## Docker 網路模式

Docker 提供了多種網路驅動程式，每種驅動程式都提供不同的網路功能。最常用的包括 `bridge`、`host`、`none` 和 `container`。

### 1. Bridge (橋接模式)

*   **說明**：這是 Docker 的預設網路模式。當您不指定網路模式時，Docker 會自動為容器分配一個 IP 位址，並將其連接到一個名為 `docker0` 的虛擬橋接器上。每個容器都會獲得一個獨立的網路堆疊。
*   **工作原理**：
    *   Docker 會在主機上建立一個名為 `docker0` 的虛擬橋接器。
    *   每個容器都會建立一對虛擬乙太網卡 (veth pair)，其中一端連接到容器內的 `eth0`，另一端連接到 `docker0` 橋接器。
    *   容器可以透過 `docker0` 橋接器與同一橋接器上的其他容器通訊，也可以透過主機的網路介面與外部網路通訊。
*   **優點**：提供良好的隔離性，容器間預設不直接暴露埠。
*   **缺點**：容器需要透過埠映射才能從外部訪問。

### 2. Host (主機模式)

*   **說明**：在主機模式下，容器不會有自己的獨立網路堆疊，而是直接使用主機的網路堆疊。這意味著容器會直接使用主機的 IP 位址和埠。
*   **工作原理**：容器內的應用程式會直接綁定到主機的網路介面和埠上。
*   **優點**：網路效能最佳，因為沒有額外的網路層。
*   **缺點**：
    *   容器不再與主機隔離，容器內應用程式使用的埠不能與主機上已佔用的埠衝突。
    *   安全性較低，因為容器直接暴露在主機網路中。
*   **使用方式**：`--network host`

### 3. None (無網路模式)

*   **說明**：在無網路模式下，容器會建立一個獨立的網路堆疊，但不會對其進行任何網路配置。容器將沒有網路介面，無法與外部通訊。
*   **工作原理**：容器只包含一個 `lo` (loopback) 介面。
*   **優點**：適用於只需要計算資源而不需要網路連接的特殊場景，或者需要手動配置網路的進階情況。
*   **缺點**：容器無法進行任何網路通訊，除非手動配置。
*   **使用方式**：`--network none`

### 4. Container (容器模式)

*   **說明**：在容器模式下，新建立的容器不會有自己的網路堆疊，而是與另一個已存在的容器共享其網路堆疊。這意味著兩個容器會共享同一個 IP 位址和埠空間。
*   **工作原理**：兩個容器共享同一個網路命名空間。
*   **優點**：適用於需要緊密協同工作的應用程式，例如主應用程式容器和一個代理或日誌收集容器。
*   **缺點**：兩個容器會共享埠，可能導致埠衝突。
*   **使用方式**：`--network container:<name_or_id>`

## 常用 Docker 網路指令

| 指令 | 說明 | 範例 |
| :--- | :--- | :--- |
| `docker network ls` | 列出所有 Docker 網路。 | `docker network ls` |
| `docker network prune` | 刪除所有未使用的網路。 | `docker network prune` |
| `docker network inspect <network_name_or_id>` | 顯示指定網路的詳細資訊，包括連接到該網路的容器。 | `docker network inspect bridge` |
| `docker inspect <container_id>` | 顯示指定容器的詳細資訊，包括其網路配置。 | `docker inspect <container_id>` |

## 自訂網路 (User-defined Bridge Networks)

雖然 Docker 預設的 `bridge` 網路 (`docker0`) 已經足夠應付許多情況，但強烈建議您建立**自訂橋接網路 (User-defined Bridge Networks)**。自訂網路提供了更好的隔離性、內建的 DNS 解析和更靈活的配置。

### 優點

*   **內建 DNS 解析**：在自訂網路中，容器可以透過服務名稱（而不是 IP 位址）互相通訊，因為 Docker 會為自訂網路提供內建的 DNS 解析服務。這使得容器的 IP 位址變化不再是問題。
*   **更好的隔離性**：自訂網路中的容器預設只能與同一網路中的其他容器通訊，提供了更好的安全性。
*   **可移植性**：在 Docker Compose 中，自訂網路是預設行為，這使得多容器應用程式的定義更加簡潔和可移植。

### 建立自訂網路

```bash
# 建立一個名為 'my_network' 的自訂橋接網路
docker network create my_network
```

### 將容器連接到自訂網路

在啟動容器時，使用 `--network` 參數指定自訂網路名稱：

```bash
# 啟動第一個 Tomcat 容器，連接到 'my_network'
docker run -d -p 8080:8080 --network my_network --name tomcat_1 tomcat

# 啟動第二個 Tomcat 容器，連接到 'my_network'
docker run -d -p 8081:8080 --network my_network --name tomcat_2 tomcat
```

現在，`tomcat_1` 和 `tomcat_2` 容器都在 `my_network` 中，它們可以透過彼此的容器名稱（`tomcat_1` 和 `tomcat_2`）互相通訊，例如：

```bash
# 進入 tomcat_1 容器內部
docker exec -it tomcat_1 bash

# 在 tomcat_1 容器內部 ping tomcat_2
ping tomcat_2
```

### 容器模式的限制與自訂網路的優勢

您原先的範例中，嘗試讓兩個 Tomcat 容器共享網路，但由於埠衝突而失敗：

```bash
# 坑 （下面起不起來因兩台 tomcat 都用 8080 映射出去）
# 借用 tomcat_1 網路
docker run -d -p 8080:8080 --name tomcat_1 tomcat
docker run -d -p 8081:8080 --network container:tomcat_1 --name tomcat_2 tomcat # 會失敗，因為 tomcat_2 試圖使用 tomcat_1 的 8080 埠
```

這是因為在 `container` 模式下，兩個容器共享同一個網路命名空間，包括埠空間。如果 `tomcat_1` 已經佔用了 8080 埠，那麼 `tomcat_2` 就無法再使用這個埠。

相比之下，使用自訂網路則沒有這個問題。每個容器在自訂網路中仍然擁有自己的獨立網路堆疊和埠空間，只是它們可以透過網路名稱互相發現和通訊。這使得自訂網路成為多容器應用程式之間通訊的更優雅和健壯的解決方案。

透過理解和善用 Docker 網路模式，您可以更有效地設計和管理您的容器化應用程式。

## 跨平台注意事項

### --network host 在 macOS / Windows 無效

`--network host` 讓容器直接使用宿主機的網路 namespace，跳過 Docker 虛擬網路：

```bash
docker run --network host nginx
```

**限制**：
- **Linux**：完全支援，容器直接使用主機網路介面
- **macOS / Windows**：**無效**！Docker Desktop 在 Linux VM 中運行，`--network host` 讓容器共用的是 Linux VM 的網路，而非 macOS/Windows 主機的網路。等同於 `bridge` 模式。

### DNS Round-Robin 的限制

Docker 的嵌入式 DNS 對同名服務做 round-robin，但有幾個限制：
- DNS 快取可能讓 round-robin 失效（client 端 JVM 的 DNS 快取預設為永久）
- 不等同於負載均衡（沒有健康檢查、不考慮節點負載）
- 生產環境建議搭配 HAProxy、Nginx 或 Traefik 做 L7 負載均衡

```yaml
services:
  api:
    image: my-api
    deploy:
      replicas: 3
    # DNS round-robin 在 Swarm mode 生效
    # 在一般 Compose 中，多個 replica 共用服務名但 DNS 可能只返回一個
```

## 網路模式比較

| 模式 | 用途 | 限制 |
|------|------|------|
| `bridge`（預設）| 容器互通，對外需 port mapping | 效能略有開銷 |
| `host` | 容器共用 host 網路 | Linux-only；Windows/macOS 實際是 VM 網路 |
| `none` | 完全隔離 | 需手動設定所有網路 |
| `overlay` | Swarm 跨節點通訊 | 需要 Swarm mode |
| `macvlan` | 容器取得獨立 MAC/IP | 需要 promiscuous mode，雲端常不支援 |
