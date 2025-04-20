---
title: "DesignPattern - Behavioral - Template Method"
author: Bill.Lin
date: 2018-08-07T12:18:20+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Template Method

Template Method pattern 定義了操作中算法的骨架，將一些步驟推遲到子類。
Template Method讓子類在不改變算法結構的情況下重新定義算法的某些步驟。
可以在有算法的情況下使用Template Method pattern，其中一些步驟可以以多種不同的方式實現。在這種情況下，Template Method pattern 建議將算法的大綱保留在一個單獨的方法中，該方法稱為類中的Template方法。我們可以將其稱為Template類，將算法的變體部分（可以以多種不同方式實現的步驟）的具體實現留給該類的不同子類。

Template 類不必將實現完全留給它的子類。相反，作為提供算法大綱的一部分，Template 類還可以提供一些實現，我們可以認為這些實現在不同的實現中是不變的。如果合適，它甚至可以為可變部分提供默認實現。我們只在不同的子類中實現特定的細節。這種類型的實現消除了重複代碼的需要，這意味著要編寫的代碼量最少。

* 大多數都是子類別呼叫父類別方法, 但在Template Method中，父類別 Template 調用子類的方法 => 好萊塢原則—— "Don’t call us, we’ll call you."


```java

    public abstract class OrderTemplate {

      // 定義是否要覆寫
      public abstract boolean hook(){
         return true; // 是否複寫
      }
      // 只開放  overwrite 給會變的
      public abstract void doSelect();
      public abstract void doPayment();
      public abstract void doDelivery();

      // 樣板中不變的 （重複的）
      public final void doPack(){
         System.out.println("Gift wrap done.");
      }
      
      public final void processOrder() {
         doSelect();
         doPayment();
         doPack();
         doDelivery();
      }
    }

    public class PhysicalStoreOrder extends OrderTemplate {

      @Override
      public void doSelect() {
         System.out.println("David buy it ");
      }

      @Override
      public void doPayment() {
         System.out.println("David pay it by credit card");
      }

      @Override
      public void doDelivery() {
         System.out.println("David call Paul to delivery");
      }
    }

    public class OnlineOrder extends OrderTemplate {

      @Override
      public void doSelect() {
         System.out.println("select item on website");
         System.out.println("add to cart");
      }

      @Override
      public void doPayment() {
         System.out.println("Online pay");
      }

      @Override
      public void doDelivery() {
         System.out.println("write the address");
         System.out.println("pay delivery fee online");
      }
    }

```

```java

      public static void main(String[] args) {
         var online = new OnlineOrder();
         online.processOrder();

         var store = new StoreOrder();
         store.processOrder();
      }

```

 - 減少複製貼上（寫重複code） 的機會
 - 一次實現算法的不變部分並將其留給子類來實現可以變化的行為。
 - 當子類之間的共同行為應該在一個共同的類中被分解和本地化以避免代碼重複時。應該先識別現有 code 中的差異，然後區分新操作中的差異。最後，用調用這些新操作之一的模板方法替換不同的代碼。