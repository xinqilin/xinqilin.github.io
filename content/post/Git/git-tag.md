---
title: "Git Tag 使用指南"
author: Bill.Lin
date: 2021-03-01T21:16:29+08:00
draft: false
tags: ["Git", "Tag", "CI/CD"]
description: "Git tag 實用指南：annotated 與 lightweight tag 的差異，建立、推送、刪除本機與遠端 tag 的完整流程，依語意化版本排序列出 tag，以及在 CI/CD 中用 tag 標記部署環境。"
categories: ["Git"]
aliases:
  - /post/Others/Git/
  - /post/tools/git/

---

## CI/CD 部署 Tag

```bash
git tag deploy/{env_name}/{feature_name}
git push origin deploy/{env_name}/{feature_name}

git tag -d deploy/{env_name}/{feature_name}
git push origin --delete deploy/{env_name}/{feature_name}
git push origin :{tagname}

git describe --always HEAD
```

## Remote 資訊

```bash
git remote show origin
```

## 完整 Tag Workflow

```bash
# 建立 annotated tag（推薦：有作者、日期、訊息）
git tag -a v1.2.0 -m "release: v1.2.0 — JWT security fixes"

# 對特定 commit 打 tag
git tag -a v1.1.0 abc1234 -m "release: v1.1.0"

# 推送單一 tag
git push origin v1.2.0

# 推送所有 local tag
git push origin --tags

# 刪除 local tag
git tag -d v1.2.0

# 刪除 remote tag
git push origin --delete v1.2.0

# 列出所有 tag（依 semver 排序）
git tag -l --sort=-version:refname

# 查看 tag 詳細資訊
git show v1.2.0
```

## Annotated vs Lightweight Tag

| | Annotated | Lightweight |
|--|----------|------------|
| 建立 | `git tag -a v1.0 -m "msg"` | `git tag v1.0` |
| 儲存 | 完整 Git object（含 tagger、日期、訊息） | 只是 commit 的指標 |
| `git describe` | 能被找到 | 需加 `--tags` 才能找到 |
| 推薦用途 | Release、版本里程碑 | 個人臨時標記 |

**GitHub Releases 必須使用 annotated tag**（lightweight tag 無法建立 Release）。

