---
title: "DesignPattern - Behavioral - Interpreter"
author: Bill.Lin
date: 2018-08-07T22:38:42+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Interpreter

用它來定義一種語言的語法表示，它提供了一個解釋器來處理語法。這種模式的最佳示例是 java 編譯器，它將 java 源代碼解釋為 JVM 可以理解的字節碼。google translation 也是Interpreter 的一個例子，其中輸入可以是任何語言，我們可以得到另一種語言的解釋輸出。

為了 Interpreter，我們需要創建 Interpreter 上下文引擎來完成解釋工作。然後，我們需要創建不同的 Expression 實現，這些實現將使用解釋器上下文提供的功能。最後，我們需要創建客戶端，該客戶端將從用戶那裡獲取輸入並決定使用哪個表達式，然後為用戶生成輸出。

* 語法很簡單。對於復雜的語法，語法的類層次結構變得龐大且難以管理。在這種情況下，解析器生成器等工具是更好的選擇。他們可以在不構建抽象語法樹 (AST) 的情況下解釋表達式，這也可以節省空間和時間。
* 效率不是關鍵問題。最有效的解釋器通常不是通過直接解釋解析樹來實現，而是首先將它們翻譯成另一種形式。例如，正則表達式經常被轉換為狀態機。但即便如此，我們也可以藉助解釋器模式來實現翻譯器，因此該模式仍然適用。
