#!/bin/bash

# 檢查是否提供了 commit 訊息
if [ -z "$1" ]; then
    echo "錯誤: 請提供 commit 訊息"
    echo "使用方式: ./deploy.sh \"您的 commit 訊息\""
    exit 1
fi

commit_message="$1"

# 建構 Hugo 網站
echo "🔨 正在建構 Hugo 網站..."
hugo build

# 檢查建構是否成功
if [ $? -ne 0 ]; then
    echo "❌ 錯誤: Hugo 建構失敗"
    exit 1
fi

echo "✅ Hugo 建構完成"

# 在 public/ 資料夾中提交並推送 html 網站到 GitHub Pages 
cd public
git add .
git commit -m "$commit_message"
git push origin master


# 推送 source code 到 GitHub
cd ..
echo "正在備份 hugo source code..."
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