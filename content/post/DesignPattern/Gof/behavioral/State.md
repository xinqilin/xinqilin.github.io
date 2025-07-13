---
title: "DesignPattern - Behavioral - State"
author: Bill.Lin
date: 2018-08-07T22:37:58+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# State

當對像在其內部狀態改變時改變其行為時，我們使用狀態設計模式。我們可以將對象的狀態定義為其在任何給定時間點的確切條件，具體取決於其屬性或屬性的值。一個類實現的一組方法構成了它的實例的行為。每當其屬性值發生變化時，我們就說對象的狀態發生了變化。

首次創建 Context 對象時，它會使用其初始 State 對像對其自身進行初始化。此 State 對象成為上下文的當前 State 對象。通過用新的 State 對象替換當前的 State 對象，上下文轉換到新的狀態。當應用程序對象調用 Context 方法（行為）時，它會將方法調用轉發到其當前的 State 對象。

 - 上下文：定義客戶感興趣的接口。此外，它維護了一個定義當前狀態的 ConcreteState 子類的實例。
 - State：  定義一個接口，用於封裝與 Context 的特定狀態相關的行為。
 - ConcreteState 子類：每個子類實現與上下文狀態相關聯的行為。

在狀態模式中，我們有一個 Context 類，並且這個類有一個對具體狀態實例的狀態引用。State 接口聲明了表示特定狀態行為的特定方法。具體國家實施這些行為。通過改變上下文的具體狀態，我們改變了它的行為。本質上，在狀態模式中，一個類（上下文）應該根據其狀態表現得像不同的類。狀態模式避免使用 switch 和 if 語句來改變行為。


```java

    public interface MacState {
        public void getState();
    }

    public class Lighting implements MacState {

      @Override
      public void getState() {
         System.out.println("mac bright!");
      }
    }

    public class Close implements MacState {

      @Override
      public void getState() {
         System.out.println("Mac is shut down");
      }
    }

```

```java

    public class MacContext implements MacState {

        private MacState macState;

        // constructor , setter , getter

        public void getState(){
            macState.getState();
        }
    }

```

```java

      public static void main(String[] args) {
            var ctx = new MacContext(new Lighting());
            ctx.getState();
            ctx.getState();
            
            ctx.setMacState(new Close());
            ctx.getState();
            ctx.getState();
            ctx.getState();
      }

```

狀態模式的好處之一是多態行為的實現，這是清晰可見的。因此，出錯的可能性較小。此外，很容易為其他行為添加更多狀態，使其更加健壯、易於維護和靈活。此外，在這種情況下，狀態模式有助於避免 if-else 或 switch-case 條件邏輯。


 - 當對象的行為取決於其狀態時，它必須在運行時根據其狀態改變其行為。
 - 當操作具有依賴於對象狀態的大型、多部分條件語句時。這種狀態通常由一個或多個枚舉常量表示。通常，多個操作將包含相同的條件結構。狀態模式將條件的每個分支放在一個單獨的類中。 
 - 這讓我們可以將對象的狀態視為一個可以獨立於其他對像變化的對象。