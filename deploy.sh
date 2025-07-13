#!/bin/bash

# 檢查是否提供了 commit 訊息
if [ -z "$1" ]; then
    echo "錯誤: 請提供 commit 訊息"
    echo "使用方式: ./deploy.sh \"您的 commit 訊息\""
    exit 1
fi

commit_message="$1"

# 建構 public/
echo "正在建構 Hugo 網站..."
hugo

# 檢查建構是否成功
if [ $? -ne 0 ]; then
    echo "錯誤: Hugo 建構失敗"
    exit 1
fi

# 推送 public 網站到 GitHub Pages (submodule)
echo "正在部署到 GitHub Pages..."
cd public/
git add . -A

# 檢查是否有變更需要提交
if git diff --staged --quiet; then
    echo "沒有變更需要部署到 GitHub Pages"
else
    git commit -m "$commit_message"
    git push
    
    # 檢查 GitHub Pages 推送是否成功
    if [ $? -ne 0 ]; then
        echo "錯誤: GitHub Pages 推送失敗"
        cd ..
        exit 1
    fi
    echo "✅ GitHub Pages 部署成功"
fi

cd ..

# 更新主專案中的 submodule 參考
echo "正在更新 submodule 參考..."
git add public .gitmodules

# 推送 source code 到 GitHub
echo "正在備份 source code..."
git add . -A
git commit -m "$commit_message"
git push

# 檢查 source code 推送是否成功
if [ $? -ne 0 ]; then
    echo "錯誤: Source code 推送失敗"
    exit 1
fi

echo "🎉 部署完成！"
echo "📄 GitHub Pages: https://xinqilin.github.io/"
echo "📁 Source Code: https://github.com/xinqilin/blog-simple-version-source-code"
echo "📦 Generated Site: https://github.com/xinqilin/xinqilin.github.io"