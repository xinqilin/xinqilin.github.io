---
title: "Ubuntu"
author: Bill.Lin
date: 2022-10-29T00:10:56+08:00
draft: false
tags: []
Description: ""
Categories: ["Linux", "Ubuntu"]
DisableComments: false
---

### Ubuntu env

```zsh

    docker pull ubuntu
    docker network create ubuntu-n
    docker run -dit -p 2222:22 -p 8000:8000 --network ubuntu-n --name ubuntu-c ubuntu
    docker exec -it ubuntu-c bash
    yes | unminimize && apt install curl gawk git htop less lsof man-db rsync strace tmux vim ssh -y
    apt install jq -y
    apt install pip -y



    docker stop ubuntu-c
    docker rm ubuntu-c

    # restart
    docker start ubuntu-c

```


