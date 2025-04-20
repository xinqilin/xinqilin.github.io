---
title: "Mysql"
author: Bill.Lin
date: 2022-01-18T23:56:44+08:00
draft: false
tags: []
Description: ""
Categories: ["mysql"]
DisableComments: false
---

### mysql

```zsh
    docker run --name mysql -e MYSQL_ROOT_PASSWORD=123456 -dp 3306:3306 mysql/mysql-server --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --skip-character-set-client-handshake
```
等於

```
    [client]
    default-character-set=utf8mb4
    [mysql]
    default-character-set=utf8mb4
    [mysqld]
    collation-server = utf8mb4_unicode_ci
    character-set-server = utf8mb4
```

```zsh
    docker exec -it mysql /bin/bash -c "mysql -uroot -p123456"
```

