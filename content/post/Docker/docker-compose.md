---
title: "Docker Compose"
author: Bill.Lin
date: 2021-07-26T02:21:13+08:00
draft: false
tags: []
Description: ""
Categories: ["Docker", "docker-compose"]
DisableComments: false
---


### docker-compose.yml

```zsh

docker-compose --version
docker-compose -h # 查看help
docker-compose up
docker-compose up -d # 背景
docker-compose down
docker-compose exec {自訂義的service id} /bin/bash
docker-compose ps # 查看目前運行的 status
docker-compose top # container 進程？
docker-compose logs {id} # container log
docker-compose config # 檢查 config
docker-compose config -q # 檢查 config, 有error 才 alert
docker-compose restart
docker-compose start
docker-compose stop


docker-compose config -q && docker-compose down &&  docker-compose up -d 

```

```yaml

# 選3之後的
version: "3"

services:
    # 自訂服務名
    microService:
        image: my_image:1.0
        container_name: ms_01
        ports:
            - "8081:8080"
        volumes:
            - /Users/bill/microService:/app
        networks:
            - my_network
        # 這個service，必須在 depends_on 的服務啟動後再執行, 不保證完全起起來, 只是順序而已
        # 可搭配 https://github.com/vishnubob/wait-for-it 這個 shell
        depends_on:
            - redis
            - mysql
# docker run -d -p 8081:8080 -v /Users/bill/microService:/app --network my_network

    redis: 
        image: redis:6.0.8
        ports:
            - "6379:6379"
        volumes:
            - /app/redis/redis.conf:/etc/redis/redis.conf
            - /app/redis/data:/data
        networks:
            - my_network
        command: redis-server /etc/redis/redis.conf
    
    mysql:
        image: mysql:5.7
        environment:
            MYSQL_ROOT_PASSWORD: '123456'
            MYSQL_ALLOW_EMPTY_PASSWORD: 'no'
            MYSQL_DATABASE: 'my_test_db'
            MYSQL_USER: 'bill'
            MYSQL_PASSWORD: 'user_pwd'
        ports:
            - "3306:3306"
        volumes:
            - /app/mysql/db:/var/lib/mysql
            - /app/mysql/conf/my.cnf:/etc/my.cnf
            - /app/mysql/init:/docker-entrypoint-initdb.d
        networks:
            - my_network
        command: --default-authentication-plugin=mysql_native_password # 解決外部無法 access

    
networks:
    my_network:

# 純記錄 (沒用到)
volumes:
    my_data:


```