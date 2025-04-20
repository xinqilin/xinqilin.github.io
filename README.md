# blog

### 安裝

```zsh
hugo new site blog --format yaml

git init

git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

git submodule update --init --recursive

# 更新 submodule 時
# git submodule update --remote --merge

```


### 啟動

```zsh

hugo server

```


- [參考](https://github.com/adityatelange/hugo-PaperMod/wiki/Installation)