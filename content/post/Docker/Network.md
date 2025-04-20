---
title: "Network"
author: Bill.Lin
date: 2021-07-26T02:21:13+08:00
draft: false
tags: []
Description: ""
Categories: ["Docker", "Network"]
DisableComments: false
---


### Docker network

- bridge: 為一個容器配置 ip, 並配置 docker0（虛擬橋接, default 為該模式） 
  - network bridge 指定, default 用 docker0
- host: 容器不會虛擬出自己的網卡, 用 Machine 的
  - --network host 指定
- none: 容器有獨立的網卡, 但不對其進行任何配置（少用）
  - --network none 指定
- container: 新創建的容器不會有自己的網卡, ip 而是與其他容器共用 ip, port
  - --network container:NAME 或容器 ID 指定

```zsh

docker network ls  # bridge, host, none, container
docker network prune
docker network inspect {bridge, host, my_network}

docker network inspect bridge | grep name

docker inspect {containerID}
# bridge 不寫就是 bridge
### ens33 -> bridge (docker0) -> container
###         veth             -> eth0

# host
### 直接用 local 端的 ip & port, 重複則遞增

# none 
### 什麼都沒有, 須自己配置

# container 
# 坑 （下面起不起來因兩台 tomcat 都用 8080 映射出去）
# 借用 tomcat_1 網路
docker run -d -p 8080:8080 --name tomcat_1 tomcat
docker run -d -p 8081:8080 --network container:tomcat_1 --name tomcat_2 tomcat

# 這就可以了
docker run -it --name alpine_1 alpine /bin/sh
docker run -it --network container:alpine_1 --name alpine_2 alpine /bin/sh


#============
# 容器內 ip 會變
# 直接起兩台 tomcat ip addr 看 ip 後, 互 ping 是會通的, 但 ip 會變, 所以要用自定義網路名
docker network create my_network # 自己創見網路
docker run -d -p 8080:8080 --network my_network --name tomcat_1 tomcat
docker run -d -p 8081:8080 --network my_network --name tomcat_2 tomcat


```