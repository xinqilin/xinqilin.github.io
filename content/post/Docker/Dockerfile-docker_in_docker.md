---
title: "Dockerfile - docker in docker"
author: Bill.Lin
date: 2021-07-25T02:21:13+08:00
draft: false
tags: []
Description: ""
Categories: ["DevOps"]
DisableComments: false
---

### Docker in Docker

```dockerfile

    FROM ubuntu:22.04 AS build

    ENV NVM_DIR /opt/nvm
    ENV NODE_VERSION v16.13.2
    ENV APP_DIR /app

    RUN [ -d $APP_DIR ] || mkdir -p $APP_DIR
    RUN [ -d $NVM_DIR ] || mkdir -p $NVM_DIR

    RUN apt-get update
    RUN apt-get install curl -y

    # install nvm & node.js
    # RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh |bash
    RUN curl -o $NVM_DIR/install.sh https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh
    RUN /bin/bash $NVM_DIR/install.sh
    ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

    # install application
    COPY test /app/test
    COPY *.js /app/
    COPY *.json /app/
    COPY *.sh /app/
    RUN chmod 0755 /app/*.sh

    WORKDIR $APP_DIR
    RUN npm install

    #####
    # arm64-firefox: seleniarm/standalone-firefox:latest
    #####
    FROM seleniarm/standalone-firefox:latest AS arm64-firefox

    ENV TERM="xterm-color"
    ENV LANG='en_US.UTF-8'
    ENV LANGUAGE='en_US.UTF-8'

    ENV NVM_DIR /opt/nvm
    ENV NODE_VERSION v16.13.2
    ENV APP_DIR /app

    RUN [ -d $APP_DIR ] || (sudo mkdir -p $APP_DIR && sudo chown `whoami`:`id -g -n` $APP_DIR)
    RUN [ -d $NVM_DIR ] || (sudo mkdir -p $NVM_DIR && sudo chown `whoami`:`id -g -n` $NVM_DIR)

    COPY --from=build $NVM_DIR/install.sh $NVM_DIR
    RUN /bin/bash $NVM_DIR/install.sh

    ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

    COPY --from=build $APP_DIR $APP_DIR
    RUN chown seluser:seluser $APP_DIR

    WORKDIR $APP_DIR

    CMD [ "/app/entrypoint.sh" ]

    #####
    # arm64-chrome:  seleniarm/standalone-chromium:latest
    #####
    FROM seleniarm/standalone-chromium:latest AS arm64-chrome

    ENV TERM="xterm-color"
    ENV LANG='en_US.UTF-8'
    ENV LANGUAGE='en_US.UTF-8'

    ENV NVM_DIR /opt/nvm
    ENV NODE_VERSION v16.13.2
    ENV APP_DIR /app

    RUN [ -d $APP_DIR ] || (sudo mkdir -p $APP_DIR && sudo chown `whoami`:`id -g -n` $APP_DIR)
    RUN [ -d $NVM_DIR ] || (sudo mkdir -p $NVM_DIR && sudo chown `whoami`:`id -g -n` $NVM_DIR)

    COPY --from=build $NVM_DIR/install.sh $NVM_DIR
    RUN /bin/bash $NVM_DIR/install.sh

    ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

    COPY --from=build $APP_DIR $APP_DIR
    RUN chown seluser:seluser $APP_DIR

    WORKDIR $APP_DIR

    CMD [ "/app/entrypoint.sh" ]

    #####
    # x86_64-firefox: selenium/standalone-firefox:latest
    #####
    FROM selenium/standalone-firefox:latest AS x86_64-firefox

    ENV TERM="xterm-color"
    ENV LANG='en_US.UTF-8'
    ENV LANGUAGE='en_US.UTF-8'

    ENV NVM_DIR /opt/nvm
    ENV NODE_VERSION v16.13.2
    ENV APP_DIR /app

    RUN [ -d $APP_DIR ] || (sudo mkdir -p $APP_DIR && sudo chown `whoami`:`id -g -n` $APP_DIR)
    RUN [ -d $NVM_DIR ] || (sudo mkdir -p $NVM_DIR && sudo chown `whoami`:`id -g -n` $NVM_DIR)

    COPY --from=build $NVM_DIR/install.sh $NVM_DIR
    RUN /bin/bash $NVM_DIR/install.sh

    ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

    COPY --from=build $APP_DIR $APP_DIR
    RUN chown seluser:seluser $APP_DIR

    WORKDIR $APP_DIR

    CMD [ "/app/entrypoint.sh" ]

    #####
    # x86_64-chrome:  selenium/standalone-chrome:latest
    #####
    FROM selenium/standalone-chrome:latest AS x86_64-chrome

    ENV TERM="xterm-color"
    ENV LANG='en_US.UTF-8'
    ENV LANGUAGE='en_US.UTF-8'

    ENV NVM_DIR /opt/nvm
    ENV NODE_VERSION v16.13.2
    ENV APP_DIR /app

    RUN [ -d $APP_DIR ] || (sudo mkdir -p $APP_DIR && sudo chown `whoami`:`id -g -n` $APP_DIR)
    RUN [ -d $NVM_DIR ] || (sudo mkdir -p $NVM_DIR && sudo chown `whoami`:`id -g -n` $NVM_DIR)

    COPY --from=build $NVM_DIR/install.sh $NVM_DIR
    RUN /bin/bash $NVM_DIR/install.sh

    ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

    COPY --from=build $APP_DIR $APP_DIR
    RUN chown seluser:seluser $APP_DIR

    WORKDIR $APP_DIR

    CMD [ "/app/entrypoint.sh" ]

```

```sh

    #!/bin/bash

    [ -f /usr/bin/firefox ] && export SCRIPTS="docker-firefox"
    [ -f /usr/bin/chromium-browser ] && export SCRIPTS="docker-chrome"
    [ -f /usr/bin/google-chrome ] && export SCRIPTS="docker-chrome"


    uu=`uname -m`
    echo 'uname -m:' $uu
    if [ "$uu" = "arm64" ] || [ "$uu" = "aarch64" ];then
        export SCRIPTS="$SCRIPTS-arm64"
    fi

    /opt/bin/entry_point.sh > /dev/null 2>&1 &

    for number in {1..120}
    do
        if curl http://localhost:4444; then
            break
        fi
    echo "Waiting selenium service," $number
        sleep 1
    done

    if ! curl http://localhost:4444; then
    exit 1
    fi


    cd /app
    echo "npm run $SCRIPTS"
    npm run $SCRIPTS
```
