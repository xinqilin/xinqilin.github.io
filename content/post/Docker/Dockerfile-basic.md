---
title: "Dockerfile"
author: Bill.Lin
date: 2021-07-24T02:21:13+08:00
draft: false
tags: []
Description: ""
Categories: ["DevOps"]
DisableComments: false
---

### Dockerfile Basic

```dockerfile

# 首行必須要為指定的基礎映像檔，這裏使用的是ubuntu作為基礎映像檔，
# 版本18.04，若不給版本號則會是latest。
FROM ubuntu:18.04


# 維護者資訊想必也是不可少，此地方也可輸入E-mail資訊，
# 注意此資訊會寫入產出映像檔的Author名稱屬性中。
MAINTAINER Bill


# RUN 是在 build 階段運行
# 最重要的部分，想要在映像檔上設定或安裝都須將命令寫於此，
# 格式須依RUN<command>，為RUN 指令後面放 Linux 指令，如果指令太長可以使用\來進行換行。
# 在此指令為先更新確認軟件包是最新的接者安裝nginx，而-y為同意指令進行中所有出現的問題。
RUN apt-get update -y\
    && apt-get install nginx -y

# Shell / exec 模式
RUN ["./test.php", "dev", "offline"] 
# 等於 RUN ./test.php dev offline


# 容器創建後, default 進來的地方
# ex: ubuntu 進去是 '/', tomcat 進去後是 '/usr/local/tomcat'
WORKDIR /app

# 指定該 image 用什麼 user 去執行, default: root (一般來說用不到)
USER 

# -v 要 mount 出去的 外面:容器
VOLUME

# 只能活在 build image (ARG 與 ENV 都是給值)
ARG 

# 設一些環境變數
ENV MY_TEST_PATH /usr/my_test
WORKDIR $MY_TEST_PATH

# 設定運行時容器提供服務的通道。
EXPOSE 80


# docker cp, copy 文件至容器中
COPY --from=build $NVM_DIR/install.sh $NVM_DIR

# ADD = COPY + unzip 合體 （習慣用 ADD）
ADD 


##### 以下 runtime

# shell & exec
# 最後就是當啟用指定容器時(container)預設執行的指令，exec mode: CMD["command", ”param1”, "param2"]。
# 可以有多個 CMD 但只有最後一個有效 會覆蓋前面的
# CMD 會被 docker run 之後的 參數替換 ＊＊＊ 比如 docker run -it -p 8080:8080 {image} /bin/bash 這時會蓋掉 CMD 的 command
CMD ["nginx", "-g", "daemon off;"]
CMD ./catalina/start.sh


# exec 
# 不會被 run 後面的參數覆蓋, 且這些參數會被當作 ENTRYPOINT 的參數運作
# 可跟 CMD 一起用 此時, CMD 會變成傳參數給 ENTRYPOINT
ENTRYPOINT ["docker-entrypoint.sh"]


### CMD & ENTRYPOINT 一起用, 會變成 ENTRYPOINT 定義參數, CMD 傳遞參數
FROM nginx

ENTRYPOINT ["nginx", "-c"] 
CMD ["/etc/nginx/nginx.conf"]

### 會變成 nginx -c /etc/nginx/nginx.conf


```

### docker build

```bash

    # build 格式
    # docker build [option]內容路徑

    docker build -t bill/first_image .

    # 即為在使用此目錄下（注意最後的點 .）的dockerfile進行建立的動作，
    # 也可以使用-f選項來指定想要建立的dockerfile路徑位置，使用-t為建置映像檔的標籤資訊，
    # 此為 bill/first_image。
```


### sample

```dockerfile

FROM centos
MAINTAINER Bill.Lin<zzx123bill@gmail.com>

ENV MY_PATH /usr/local
WORKDIR $MY_PATH

# 安裝環境
RUN yum -y install vim
# 可 ifconfig 看 ip
RUN yum -y install net-tools
RUN mkdir $MY_PATH/java
ADD jdk-11-tar-gz $MY_PATH/

# 配置環境變數
ENV JAVA_HOME $MY_PATH/jdk-11
ENV JRE_HOME $JAVA_HOME/jre
ENV CLASSPATH $JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar:$JRE_HOME/lib:$CLASSPATH
ENV PATH $JAVA_HOME/bin:$PATH

EXPOSE 80

CMD echo $MY_PATH
CMD echo java --version
CMD echo 'success...'
CMD /bin/bash

```

### sample2

```dockerfile

FROM openjdk:8-jdk-alpine

RUN apk add --no-cache bash

# https://github.com/vishnubob/wait-for-it 
COPY wait-for-it.sh /wait-for-it.sh

RUN chmod +x /wait-for-it.sh

ADD /target/mms.war .

EXPOSE 8080

```

### sample3

```dockerfile

FROM ubuntu
MAINTAINER Bill.Lin

ENV MY_PATH /usr/local
WORKDIR $MY_PATH

RUN apt-get update
RUN apt-get install net-tools
# RUN apt-get update -y && apt install -y sudo telnetd vim systemctl  && apt-get clean

EXPOSE 80

CMD echo $MY_PATH
CMD echo "build success ------"
CMD /bin/bash

```

### build

```bash

    # docker build -t {name}:{tag} {path}
    docker build -t java-test:latest .

```

#### build image with google Jib

mvn / gradle 後 clean package (或直接install) build 出 jar

```dockerfile

    FROM openjdk:11
    COPY ./target/*.jar C:/ideaProjects/docker-workspace/xxx.jar
    WORKDIR C:/ideaProjects/docker-workspace
    RUN sh -c 'touch xxx.jar'
    ENTRYPOINT ["java","-jar","xxx.jar"]

```

### 刪除 none image

```bash
docker image prune
```

other sample: <br>
[docker-library/tomcat](https://github.com/docker-library/tomcat/blob/master/9.0/jdk11/corretto-al2/Dockerfile)
