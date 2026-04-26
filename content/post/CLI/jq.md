---
title: "jq — 命令列 JSON 處理"
author: Bill.Lin
date: 2024-01-15
draft: false
description: "jq 完整使用指南：從基本過濾器到 map、select、string interpolation，以及 CI/CD 實戰範例與常見陷阱"
categories: ["CLI"]
tags: ["CLI", "jq", "JSON", "Shell", "DevOps"]
---

## 安裝

```bash
# macOS
brew install jq

# Ubuntu / Debian
sudo apt install jq

# Alpine（Docker 常用）
apk add jq

# 確認版本
jq --version
# jq-1.7.1
```

---

## 基本過濾器

```bash
# Pretty print（最常用：curl 結果格式化）
curl -s https://api.github.com/repos/spring-projects/spring-boot | jq '.'

# 取特定欄位
jq '.name'
jq '.stargazers_count'

# 取陣列元素
jq '.[0]'         # 第一個元素
jq '.[-1]'        # 最後一個元素
jq '.[2:5]'       # index 2 到 4（slice）

# 展開陣列（iterate）
jq '.[]'          # 輸出陣列每個元素，各佔一行

# 巢狀欄位
jq '.user.email'
jq '.address.city'

# 多個欄位 → 新物件
jq '{name: .name, email: .user.email}'

# 多個欄位 → array
jq '[.name, .email]'
```

### 空值安全

```bash
# 欄位不存在時回傳 null，不報錯
jq '.nonexistent'

# 提供預設值（若為 null 則用 "unknown"）
jq '.name // "unknown"'

# optional operator（? 表示若不適用則忽略，不報錯）
jq '.items[]? | .name'
```

---

## 陣列操作

```bash
# map：對每個元素套用 filter
jq 'map(.name)'
# 等同於
jq '[.[] | .name]'

# select：過濾符合條件的元素
jq '.[] | select(.age > 18)'
jq '.[] | select(.status == "active")'
jq '.[] | select(.role == "admin" or .role == "superuser")'

# length：陣列長度 / 字串長度 / 物件 key 數
jq 'length'
jq '.items | length'

# sort_by
jq 'sort_by(.name)'
jq 'sort_by(.age) | reverse'   # 降序

# unique_by
jq 'unique_by(.type)'
jq '[.[].type] | unique'        # 取所有 type 的唯一值列表

# group_by
jq 'group_by(.department)'

# flatten（展開巢狀陣列）
jq 'flatten'
jq 'flatten(1)'  # 只展開一層

# first / last
jq 'first(.[] | select(.active))'
```

---

## 字串與格式化

```bash
# String interpolation（@string format）
jq '.[] | "\(.name): \(.email)"'

# 傳入變數（避免 shell injection）
jq --arg status "active" '.[] | select(.status == $status)'
jq --argjson min_age 18 '.[] | select(.age > $min_age)'

# 數值格式
jq '.price * 100 | round'       # 四捨五入
jq '.size / 1024 / 1024'        # MB

# 字串操作
jq '.name | ascii_upcase'
jq '.name | ascii_downcase'
jq '.name | ltrimstr("Mr. ")'   # 移除前綴
jq '.name | split(" ") | .[0]'  # 取第一個 token
jq '.tags | join(", ")'         # 陣列轉字串

# 輸出純字串（不含 JSON 引號）
jq -r '.name'
```

---

## 物件操作

```bash
# keys / values
jq 'keys'
jq 'values'
jq 'to_entries'     # [{key: "a", value: 1}, ...]
jq 'from_entries'   # [{key,value}] → {a:1}

# has：判斷是否有某 key
jq 'has("email")'
jq '.[] | select(has("avatar_url"))'

# 合併物件
jq '. + {"extra": "field"}'
jq 'reduce .[] as $item ({}; . + $item)'

# del：刪除欄位
jq 'del(.password)'
jq 'del(.users[].password)'

# 重新命名欄位
jq '{id: .user_id, email: .user_email}'
```

---

## 進階：reduce 與 env

```bash
# reduce：摺疊陣列
# 計算總和
jq 'reduce .[] as $x (0; . + $x)'

# 讀取環境變數
jq -n 'env.HOME'
jq -n 'env | keys'

# null input（不從 stdin 讀，直接建構）
jq -n '{"timestamp": now | todate, "host": env.HOSTNAME}'

# any / all
jq 'any(.[]; .active)'   # 有任何元素 active
jq 'all(.[]; .verified)' # 所有元素都 verified
```

---

## CI/CD 實戰範例

### GitHub API

```bash
# 取最新 release tag
gh api repos/spring-projects/spring-boot/releases/latest | jq -r '.tag_name'

# 列出所有 PR 的 title 與 number
gh api repos/owner/repo/pulls | jq '.[] | "\(.number): \(.title)"'

# 找出所有 open PR 的 author
gh api repos/owner/repo/pulls | jq '[.[] | select(.state == "open") | .user.login] | unique'

# CI 判斷：若無 open issue 則繼續
OPEN_COUNT=$(gh api repos/owner/repo/issues | jq '[.[] | select(.state == "open")] | length')
if [ "$OPEN_COUNT" -gt 0 ]; then echo "Has open issues"; fi
```

### Docker

```bash
# 取 image 支援的平台
docker manifest inspect nginx:latest | \
  jq '[.manifests[].platform | "\(.os)/\(.architecture)"]'

# 列出所有 running container 的 name 與 image
docker ps --format '{{json .}}' | jq -s '[.[] | {name: .Names, image: .Image}]'
```

### AWS CLI

```bash
# 列出所有 EC2 instance 的 ID 與狀態
aws ec2 describe-instances | \
  jq '.Reservations[].Instances[] | {id: .InstanceId, state: .State.Name, type: .InstanceType}'

# 只列出 running 的 instance
aws ec2 describe-instances | \
  jq '[.Reservations[].Instances[] | select(.State.Name == "running") | .InstanceId]'

# 取 ECS service 的 desired / running count
aws ecs describe-services --cluster my-cluster --services my-service | \
  jq '.services[0] | {desired: .desiredCount, running: .runningCount}'

# 從 Secrets Manager 取值（已解碼的 JSON secret）
aws secretsmanager get-secret-value --secret-id my-secret | \
  jq -r '.SecretString' | jq '.DB_PASSWORD'
```

### Kubernetes

```bash
# 列出所有 pod 及其狀態
kubectl get pods -o json | \
  jq '.items[] | {name: .metadata.name, status: .status.phase}'

# 找出 Crash 的 pod
kubectl get pods -o json | \
  jq '[.items[] | select(.status.phase == "CrashLoopBackOff") | .metadata.name]'
```

### Helm / 部署腳本

```bash
# 比較兩個 JSON 的差異
diff <(jq -S '.' file1.json) <(jq -S '.' file2.json)

# 從 package.json 取版本號
VERSION=$(jq -r '.version' package.json)
docker build -t "my-app:${VERSION}" .
```

---

## jq vs 其他工具

| 工具 | 優點 | 缺點 | 適用 |
|------|------|------|------|
| `jq` | 快速、語法簡潔、shell-friendly | 學習曲線、複雜邏輯難讀 | CLI 腳本、CI/CD |
| `python -m json.tool` | 無需安裝、pretty print | 只能格式化，無法過濾 | 純格式化 |
| `fx` | 互動式、支援 JS 語法 | 需要 Node.js | 互動探索 |
| `gron` | 把 JSON 變成 grep-able 行 | 需要配合 grep/sed | 搜尋特定值 |
| Python/`requests` | 完整語言能力 | 需要寫腳本 | 複雜邏輯 |

---

## 常見陷阱

### 數值精度

```bash
# jq 使用 IEEE 754 double，大整數會失去精度
echo '{"id": 9007199254740993}' | jq '.id'
# 輸出：9007199254740992  ← 精度丟失！

# 解法：用字串處理大整數
echo '{"id": "9007199254740993"}' | jq '.id'
# 輸出："9007199254740993"  ← 正確
```

`2^53 = 9007199254740992`，超過此值的整數用 jq 處理會失去精度，Twitter ID、雪花算法 ID 等大整數要特別注意。

### 輸出含引號

```bash
# 預設輸出含 JSON 引號
echo '{"name":"Alice"}' | jq '.name'
# "Alice"

# -r（--raw-output）去掉引號，傳給 shell 變數
NAME=$(echo '{"name":"Alice"}' | jq -r '.name')
echo $NAME
# Alice
```

### null 與空陣列的差異

```bash
echo 'null' | jq 'length'       # 0
echo '[]' | jq 'length'         # 0
echo '{}' | jq 'length'         # 0
echo '"hello"' | jq 'length'    # 5

# null 在算術中傳播
echo 'null' | jq '. + 1'        # 1（null + 數字 = 數字）
echo 'null' | jq '. + "str"'    # "str"
```
