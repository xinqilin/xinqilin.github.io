---
title: "DesignPattern - Structural - Facade"
author: Bill.Lin
date: 2018-08-07T12:16:02+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Facade

為子系統中的一組 interface 提供統一的入口。Facade Pattern 定義了一個更高級別的接口，使子系統更易於使用
Facade 並沒有封裝子系統類或接口；它只是為其功能提供了一個簡化的界面。
此外，客戶端可以直接訪問這些類。它仍然為可能需要它的客戶公開系統的全部功能。簡而言之，它只是為子系統的複雜接口提供了一層，使其更易於使用。

外觀設計模式是促進鬆散耦合的其他設計模式之一。它強調了設計中最重要的一個方面，即抽象。通過隱藏它背後的複雜性並暴露一個簡單的接口，它實現了抽象。
Facade 和 Adapter 一樣可以封裝多個類，但是 Facade 使用接口來簡化複雜接口的使用，而 Adapter 用於將接口轉換為客戶端期望的接口。
在抽象方面，中介者設計模式可能看起來與外觀設計模式非常相似。Mediator 以類似於外觀模式的方式抽象子系統的功能。然而，在中介者模式的實現中，子系統或對等點的組件都知道中介者並與之交互。但是在外觀模式的情況下，子系統不知道外觀的存在。只有外觀與子系統對話。

```java

    public class Service1 {
        public int doSth(int x) {
            // 複雜的業務邏輯...
            return x + x;
        }
    }

    public class Service2 {
      public int doSth2(int x, int y) {
        // 複雜的業務邏輯...
        return x + y;
      }
    }

    public class Service3 {
       public int doSth3(int x, int y, double z) {
        // 複雜的業務邏輯...
        return x + y + Integer.parseInt(z);
       }
    }

    public class Facade {

      public int sum(int x) {
         Service1 s = new Service1();
         return s.doSth(x + 1);
      }

      public int cut(int x) {
        Service1 s = new Service1();
        Service2 s2 = new Service2();
         return s.doSth(x) + s3.doSth(x, 0);
      }

      public int multiply(int x) {
         return Service3.doSth3(x, 2, 3.0);
      }
    }

```

```java

      public static void main(String[] args) {
         Facade facade = new Facade();
         int x = 3;
         System.out.println("Cube of " + x + ":" + facade.sum(100));
         System.out.println("Cube of " + x + " times 2:" + facade.cut(100));
         System.out.println(x + " multiply class1 & class2 :" + facade.multiply(100));
      }

```

 - 子系統接口不知道 Facade，它們不應該有任何 Facade 接口的引用。
 - 子系統可以相互依賴。在這種情況下，外觀可以充當協調器並解耦子系統之間的依賴關係。
 - 外觀模式更像是客戶端應用程序的助手；它不會對客戶端隱藏子系統接口。是否使用 Facade 完全取決於客戶端代碼。
 - 外觀模式可以應用於任何開發點，通常是在接口數量增加和系統變得複雜時。
 - 外觀模式應該應用於類似類型的接口；它的目的是提供一個接口而不是多個接口來完成類似的工作。
 - 可以使用帶有 Facade 的工廠模式來為客戶端系統提供更好的接口。

