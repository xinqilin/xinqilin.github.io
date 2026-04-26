---
title: "Docker Compose V2 遷移指南"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "Docker Compose V1 到 V2 的差異對照、version 欄位廢棄原因、depends_on 健康檢查與 compose watch 熱更新實戰"
categories: ["Container"]
tags: ["Docker", "Docker Compose", "Container", "Migration", "DevOps"]
---

## V1 vs V2 的本質差異

| | V1 | V2 |
|--|----|----|
| 執行檔 | `docker-compose`（Python） | `docker compose`（Go，Docker CLI plugin）|
| 安裝方式 | 獨立 binary，另行安裝 | Docker Desktop 內建；Linux 用 `docker compose plugin` |
| `version:` 欄位 | 必填（決定語法版本）| **已廢棄**，出現時忽略並發出警告 |
| 網路命名 | `<project>_default`（底線）| `<project>-default`（連字號）|
| 啟動指令 | `docker-compose up` | `docker compose up` |

V1 已於 **2023 年 7 月正式 EOL**，不再維護。

---

## 移除 `version:` 欄位

V1 時代的 `version: "3.9"` 決定 Compose 文件語法版本。V2 不再有版本差異，統一支援最新語法。

```yaml
# V1 寫法（過時，V2 會警告）
version: "3.9"
services:
  app:
    image: my-app:latest

# V2 正確寫法（刪除 version 欄位）
services:
  app:
    image: my-app:latest
```

移除後不影響任何功能，僅消除 `the attribute version is obsolete` 警告。

---

## `depends_on` 加上健康檢查

V1 的 `depends_on` 只等 container 啟動，不等服務就緒：

```yaml
# V1（不可靠）：MySQL container 啟動了，但 MySQL 程序可能還在初始化
depends_on:
  - db
```

V2 支援 `condition`，搭配 `healthcheck` 確保服務真的就緒：

```yaml
services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s  # 給 MySQL 初始化的緩衝時間

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 2s
      retries: 5
```

`condition` 值：

| condition | 含義 |
|-----------|------|
| `service_started` | container 已啟動（預設，等同 V1 行為）|
| `service_healthy` | healthcheck 回報 healthy |
| `service_completed_successfully` | container 正常退出（code 0），用於初始化容器 |

---

## `docker compose watch`（V2.22+）

開發環境熱更新，不需要掛載整個 source volume：

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
          ignore:
            - node_modules/
        - action: rebuild
          path: package.json   # 依賴變更時重建 image
        - action: rebuild
          path: pom.xml
```

```bash
# 啟動並開啟 watch 模式
docker compose up --watch
# 或
docker compose watch
```

`action` 類型：

| action | 行為 |
|--------|------|
| `sync` | 將變更的檔案同步進 container（不重啟）|
| `rebuild` | 重新 build image 並重啟 container |
| `sync+restart` | 同步後重啟 container（不重建 image）|

---

## Profiles：環境差異化服務

```yaml
services:
  app:
    build: .
    # 無 profiles → 預設啟動

  db:
    image: mysql:8.0
    # 無 profiles → 預設啟動

  adminer:
    image: adminer
    ports:
      - "8080:8080"
    profiles: [dev]     # 只在 dev profile 啟動

  prometheus:
    image: prom/prometheus
    profiles: [monitoring]

  grafana:
    image: grafana/grafana
    profiles: [monitoring]
```

```bash
# 只啟動預設服務（app + db）
docker compose up

# 啟動 dev profile（app + db + adminer）
docker compose --profile dev up

# 啟動多個 profile
docker compose --profile dev --profile monitoring up
```

---

## 遷移 Checklist

### 指令替換

```bash
# 全域替換腳本中的指令
grep -r "docker-compose" ./scripts/ ./Makefile ./ci/ .github/
# 將所有 docker-compose 改為 docker compose
```

常見出現位置：

- `Makefile` 中的 `docker-compose up -d`
- CI/CD pipeline（GitHub Actions、GitLab CI）
- 部署腳本（`deploy.sh`、`start.sh`）
- `README.md` 的使用說明

### compose.yaml vs docker-compose.yaml

V2 優先讀取 `compose.yaml`，其次是 `docker-compose.yaml`（向下相容）。建議新專案用 `compose.yaml`：

```bash
# 查看 Docker 讀取的 compose 設定
docker compose config
```

### 常用指令對照

| V1 | V2 |
|----|-----|
| `docker-compose up -d` | `docker compose up -d` |
| `docker-compose down -v` | `docker compose down -v` |
| `docker-compose logs -f app` | `docker compose logs -f app` |
| `docker-compose exec app bash` | `docker compose exec app bash` |
| `docker-compose ps` | `docker compose ps` |
| `docker-compose build --no-cache` | `docker compose build --no-cache` |
| `docker-compose pull` | `docker compose pull` |

---

## 完整範例：Spring Boot + MySQL + Redis

```yaml
# compose.yaml（V2，無 version 欄位）
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://db:3306/mydb
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: secret
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    develop:
      watch:
        - action: rebuild
          path: pom.xml
        - action: sync+restart
          path: ./src/main/resources

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: mydb
      MYSQL_USER: app
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "app", "-psecret"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 2s
      retries: 5

  adminer:
    image: adminer
    ports:
      - "8081:8080"
    profiles: [dev]

volumes:
  mysql-data:
```

---

## 小結

- **立即行動**：移除 `version:` 欄位、將 `docker-compose` 替換為 `docker compose`。
- **depends_on + healthcheck** 是防止「DB 還沒好 App 就先啟動」的正確方式。
- `compose watch` 讓開發循環更快，適合前後端同時開發的場景。
- `profiles` 讓同一份 `compose.yaml` 服務多個環境，減少維護多份設定的負擔。
