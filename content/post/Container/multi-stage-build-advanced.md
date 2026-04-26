---
title: "Dockerfile 進階多階段建構"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "Dockerfile cache mount 加速建構、secret mount 防洩漏、distroless 與 jlink 最小化 JRE，以及 ARG vs ENV 的差異"
categories: ["Container"]
tags: ["Docker", "Dockerfile", "Multi-stage Build", "Security", "Performance"]
---

## 基礎複習：Builder + Runtime 模式

```dockerfile
# Stage 1: 建構
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -q -DskipTests

# Stage 2: 執行（只複製 jar，不含 JDK 與 source code）
FROM eclipse-temurin:21-jre-jammy
COPY --from=builder /app/target/app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

多階段建構的目的：**最終 image 只含執行所需的檔案**，不含原始碼、建構工具、測試依賴。

---

## Cache Mount：加速重複建構

每次 `docker build` 若依賴沒有改變，Maven/npm 都會重新下載套件，非常耗時。`--mount=type=cache` 讓套件管理器的 cache 跨 build 持久化。

### Maven

```dockerfile
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY pom.xml mvnw ./
COPY .mvn .mvn
# 先只複製 pom.xml，cache mount 讓 ~/.m2 跨 build 保留
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:go-offline -q

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -q -DskipTests
```

先 `COPY pom.xml` 再下載依賴，只有 `pom.xml` 改變時才重新下載，source 變更不影響依賴層的 cache。

### npm / pnpm

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# npm cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# pnpm cache
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
```

### Gradle

```dockerfile
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon -q

RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon -q
```

---

## Secret Mount：機密不進 Layer

不要把機密寫入 image layer（即使之後 `RUN rm ~/.npmrc`，layer history 仍保留）：

```dockerfile
# 錯誤：機密殘留在 layer history
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc \
    && npm install \
    && rm ~/.npmrc
# docker history 或 docker save 仍可找到 .npmrc

# 正確：secret 只在 build 期間存在，不進 image
RUN --mount=type=secret,id=npmtoken \
    NPM_TOKEN=$(cat /run/secrets/npmtoken) \
    npm config set //registry.npmjs.org/:_authToken "${NPM_TOKEN}" \
    && npm install
```

```bash
# 建構時傳入 secret
docker build --secret id=npmtoken,src=./npm-token.txt -t my-app .
# 或從環境變數
docker build --secret id=npmtoken,env=NPM_TOKEN -t my-app .
```

**私有 Maven Repository**：

```dockerfile
RUN --mount=type=secret,id=maven-settings,dst=/root/.m2/settings.xml \
    --mount=type=cache,target=/root/.m2/repository \
    ./mvnw package -q -DskipTests
```

---

## Distroless：最小攻擊面

`gcr.io/distroless` 系列 image 不含 shell、套件管理器、不必要的系統工具，大幅減少攻擊面：

```dockerfile
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -q -DskipTests

# 無 shell，無套件管理器
FROM gcr.io/distroless/java21-debian12
COPY --from=builder /app/target/app.jar /app.jar
# ENTRYPOINT 必須用 exec form（JSON array），不能用 shell form
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**注意**：distroless 無 `sh`，`docker exec -it container bash` 會失敗。偵錯需用：

```bash
# 用 debug variant（含 busybox shell）
docker run --rm gcr.io/distroless/java21-debian12:debug sh
# 或在建構時加入 debug stage
```

---

## jlink：自訂最小 JRE

`jlink` 可以從 JDK 模組中抽出應用實際需要的部分，生成自訂 JRE：

```dockerfile
FROM eclipse-temurin:21-jdk AS jlink-builder
# 先分析 jar 需要哪些模組
RUN java -jar /opt/java/openjdk/lib/ct.sym 2>/dev/null; \
    jdeps --ignore-missing-deps \
          --print-module-deps \
          --multi-release 21 \
          app.jar > /tmp/modules.txt || true

# 建構自訂 JRE（已知模組清單）
RUN jlink \
    --add-modules java.base,java.logging,java.net.http,java.sql,java.management,jdk.crypto.ec \
    --output /jre-custom \
    --strip-debug \
    --no-header-files \
    --no-man-pages \
    --compress=2

# 最終 image：基於 slim debian，只含自訂 JRE
FROM debian:12-slim
COPY --from=jlink-builder /jre-custom /opt/jre
COPY --from=builder /app/target/app.jar /app.jar
ENV PATH="/opt/jre/bin:$PATH"
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

---

## 各 Image 大小比較

| 基礎 Image | 大約大小 |
|-----------|---------|
| `eclipse-temurin:21-jdk-jammy` | ~460 MB |
| `eclipse-temurin:21-jre-jammy` | ~260 MB |
| `eclipse-temurin:21-jre-alpine` | ~190 MB |
| `gcr.io/distroless/java21-debian12` | ~145 MB |
| debian:12-slim + jlink 自訂 JRE | ~90–120 MB |
| scratch + jlink 靜態 binary（GraalVM native）| ~50 MB |

小 image 帶來的優勢：
- **更快 pull**：CI/CD 縮短部署時間
- **更小攻擊面**：無不必要的二進位檔
- **更便宜**：Container Registry 儲存費用

---

## ARG vs ENV

```dockerfile
# ARG：只在 build 階段存在，不進入最終 image
ARG APP_VERSION=1.0.0
ARG BUILD_DATE

# ENV：在 image 和 container 執行時都存在
ENV JAVA_OPTS="-Xmx512m -Xms256m"
ENV APP_HOME=/app

# 使用 ARG
RUN echo "Building version: ${APP_VERSION}"

# ARG 可以傳給 ENV（讓 build-time 值進入 runtime）
ARG GIT_COMMIT
ENV GIT_COMMIT_SHA=${GIT_COMMIT}
```

```bash
# 傳入 ARG
docker build --build-arg APP_VERSION=2.0.1 --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t my-app .
```

**安全注意**：`ARG` 值雖然不在最終 image 的 env 中，但會出現在 `docker history` 的 build 命令裡。**不要用 ARG 傳遞機密**，改用 `--mount=type=secret`。

```bash
# ARG 值可在 docker history 看到
docker history my-app
# IMAGE          CREATED BY
# ...            /bin/sh -c #(nop) ARG APP_VERSION=2.0.1  ← 可見
```

---

## 完整 Spring Boot 生產 Dockerfile

```dockerfile
# Stage 1: 下載依賴（利用 cache layer）
FROM eclipse-temurin:21-jdk-alpine AS deps
WORKDIR /app
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:go-offline -q

# Stage 2: 建構
FROM deps AS builder
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -q -DskipTests
# Spring Boot Layered Jar
RUN java -Djarmode=tools -jar target/app.jar extract --layers --destination target/extracted

# Stage 3: 執行（distroless）
FROM gcr.io/distroless/java21-debian12 AS runtime
ARG APP_VERSION=unknown
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"

WORKDIR /app
# Layered jar：dependencies 變動較少，先 COPY 利用 Docker cache
COPY --from=builder /app/target/extracted/dependencies/ ./
COPY --from=builder /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/target/extracted/application/ ./

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Spring Boot Layered Jar 讓 `application` layer（最常變動）與 `dependencies` layer（不常變動）分開，大幅提升 CI 建構時的 Docker layer cache 命中率。

---

## 小結

- **`--mount=type=cache`** 讓 Maven/npm 跨 build 重用套件，節省數分鐘建構時間。
- **`--mount=type=secret`** 是傳遞機密的唯一安全方式，不進 layer history。
- **distroless** 是生產環境的首選 runtime image，無 shell 攻擊面小。
- **jlink** 可進一步縮小 JRE，適合對 image size 有要求的場景。
- **ARG 只給 build-time 使用**，機密永遠用 secret mount，不用 ARG 或 ENV。
