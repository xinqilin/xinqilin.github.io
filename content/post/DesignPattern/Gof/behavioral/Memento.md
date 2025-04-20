---
title: "DesignPattern - Behavioral - Memento"
author: Bill.Lin
date: 2018-08-07T22:39:01+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Memento

當我們想要保存對象的狀態以便以後恢復它時，我們使用備忘錄設計模式。備忘錄模式有助於以這樣一種方式實現這一點，即對象的已保存狀態數據在對像外部無法訪問；這保護了已保存狀態數據的完整性。

實現 Memento 模式的想法始於兩個對象—— Originator 和 Caretaker。Originator是需要保存和恢復狀態的對象，它使用一個內部類來保存Object的狀態。內部類稱為 Memento 及其私有，因此無法從其他對象訪問。

 `Caretaker` 是幫助類，負責通過 Memento 對象存儲和恢復 Originator 的狀態。由於 Memento 對 Originator 是私有的，因此 Caretaker 無法訪問它，並且它作為 Object 存儲在 caretaker 中。

現實生活中最好的例子之一是 IDE, 我們可以隨時保存其數據並使用撤消將其恢復到以前保存的狀態。


 - 必須保存對象狀態（某些部分）的快照，以便以後可以將其恢復到該狀態，並且
 - 獲取狀態的直接接口會暴露實現細節並破壞對象的封裝。