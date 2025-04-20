---
title: "DesignPattern - Basic - Prototype"
author: Bill.Lin
date: 2018-08-07T02:27:13+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Prototype

一種對象創建機制。

假設有一個從 DB 加載數據的對象。現在，我們需要在程序中多次修改這些數據。因此，使用 new 關鍵字創建對象並再次從數據庫中加載所有數據並不是一個好主意。因此，更好的方法是將現有對象 clone 為新對象，然後進行數據操作。

但是，原型設計模式要求您正在復制的對象應提供複製功能。顯然，它不應該由任何其他類來完成。但是，是使用 Object 屬性的淺拷貝還是深拷貝取決於需求，這是一個設計決定。

例如，讓我們看看這有什麼用處。如果創建原始對象時使用的資源（例如數據流）在需要對象克隆時可能不可用。另一個例子是，如果原始對象創建涉及大量時間投入，例如從數據庫或通過網絡讀取數據。

object clone
利用 clone() 方法和 implements Cloneable interface。默認情況下，clone() 執行淺拷貝。此外，Serializable 可用於簡化深度複製。
BTW, 可以實現自己的原型模式。為此，創建一個具有 doClone () 方法的 Prototype 接口。

```java

    public class Pc implements Cloneable {

        private String keyboard;
        private String mouse;
        private String screen;

        public Pc() {
            keyboard = "機械";
            mouse = "羅技";
            screen = "Dell";
        }

        public Pc clone(){
            return new Pc();
        }

        public void makeAmericaStyle(){
            keyboard = "Magic Keyboard";
            mouse = "Apple Mouse";
            screen = "Apple Screen";
        }

        public String getMouse(){
            return mouse;
        }
    }

```

```java

    public class PrototypeTest {

       public Bike getUSAPc(Pc basicPc){
          pc.makeAmericaStyle();
          return basicBike;
       }

       public static void main(String[] args) {

          Pc pc = new Pc();
          Pc basicPc = pc.clone();

          PrototypeTest prototype = new PrototypeTest();
          Pc americaPc = prototype.getUSAPc(basicPc);

          System.out.println("overwrite method " + americaPc.getMouse());
          System.out.println("all attribute" + americaPc.toString());
       }
    }

```

 - 當在運行時指定要實例化的類時，例如，通過動態加載
 - 避免建立與產品類層次結構平行的工廠類層次結構
 - 當類的實例可以具有僅有的幾種不同狀態組合之一時。但是，安裝相應數量的原型並克隆它們可能更方便，而不是每次使用適當的狀態手動實例化類。
