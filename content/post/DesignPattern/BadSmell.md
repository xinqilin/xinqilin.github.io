---
title: "BadSmell"
author: Bill.Lin
date: 2022-03-17T22:50:11+08:00
draft: false
tags: []
Description: ""
Categories: ["bad smell"]
DisableComments: false
---

### Rigidity, 難以變更

任何變更, 都需要去改其他的東西, 造成一個小小的需求就要去更改另個很大的東西

### Fragility, 容易壞掉

任何變更都會導致其他有相依或無相依的東西超出想象的破壞, 改一個小東西, 結果其他重要的東西壞掉

### Immobility, 難以複用

系統中相依情況嚴重, 造成想要移出code 寫成 function 的成本 高於打掉重寫的成本

### Viscosity, 難以正確修改

系統變更時, 因成本考量大多會以 治標不治本的方式改完需求,而非從源頭處修改
