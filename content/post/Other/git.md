---
title: "Git"
author: Bill.Lin
date: 2021-03-01T21:16:29+08:00
draft: false
tags: []
Description: "recording the tag use in CI process"
Categories: ["Tools"]
DisableComments: false
---

### Git

> tag

```zsh

    git tag deploy/{env_name}/{feature_name}
    git push origin deploy/{env_name}/{feature_name}

    git tag -d/--delete deploy/{env_name}/{feature_name}
    git push origin --delete deploy/{env_name}/{feature_name}
    git push origin :{tagname}

    git describe --always HEAD  

```

> remote info

```zsh

    git remote show origin

```

