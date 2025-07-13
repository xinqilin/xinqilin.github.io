---
title: "DesignPattern - Basic - Factory"
author: Bill.Lin
date: 2018-08-07T01:07:16+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Factory

一個具有多個子類的父類別並且基於輸入，我們需要返回其中一個子類時，使用工廠設計模式。這種模式將類從客戶端程序實例化到工廠類的責任。
工廠模式中的超類可以是 interface，也可以是 abstract class，也可以是普通的 Java class。

```java

    public interface ICellPhone {
        public void open();
        public void close();
        public void call();
    }

    public class ApplePhone implements ICellPhone {

      @Override
      public void open() {
         System.out.println("apple open");
      }

      @Override 
      public void close() {
         System.out.println("apple close");
      }

      @Override
      public void call() {
         System.out.println("apple phone call David");
      }
    }

    public class SamsungPhone implements ICellPhone {

      @Override
      public void open() {
        // ...
      }

      @Override
      public void close() {
        // ...
      }

      @Override
      public void call() {
        // ...
      }
    }

```

Factory

```java

public class CellPhoneFactory {

      public CellPhoneFactory(){

      }

      ICellPhone createCellPhone(String type){
         ICellPhone cellPhone = null;
         if("apple".equalsIgnoreCase(type)){
            cellPhone = new ApplePhone();
            System.out.println("apple cell phone created");
         }else if("samsung".equalsIgnoreCase(type)){
            cellPhone = new SamsungPhone();
            System.out.println("three start cell phone created");
         }
         return cellPhone;
      }

    }

```

```java

      public static void main(String[] args) {

         var factory = new CellPhoneFactory();
         ApplePhone apple = (ApplePhone)factory.createCellPhone("apple");
         len.open();

         SamsungPhone threeStarts = (SamsungPhone)factory.createCellPhone("samsung");
         sam.close();
      }
```

小節

 - 工廠模式為接口而不是實現提供了一種代碼方法。
 - 工廠模式從客戶端代碼中刪除了實際實現類的實例化，使其更健壯、耦合更少且易於擴展。例如，我們可以很容易地更改類的實現，因為客戶端不知道它。
 - 工廠模式還通過繼承在實現類和客戶端類之間提供抽象。


### Abstract Factory

幾乎類似於 工廠模式，除了它更像工廠的工廠。
一個 Factory 類，它根據提供的輸入返回不同的子類。通常，工廠類使用 if-else 或 switch-case 語句來實現這一點。
但是，在抽象工廠模式中，擺脫了 if-else 塊，並為每個子類創建了一個工廠類，然後是一個抽象工廠類，該類將根據輸入工廠類返回子類。

實際上，抽象工廠就是返回工廠的工廠。為什麼這個抽象層有用？普通工廠可用於創建相關對象集。抽象工廠返回工廠。因此，抽象工廠用於返回可用於創建相關對象集的工廠。

```java

    public interface ICellPhoneFactory {

        ICellPhoneFactory createPhone(String type);
    }


    // 抽象工廠 => 生產工廠
    public class CellPhoneFactory implements ICellPhoneFactory {

        @Override  
        ICellPhoneFactory createPhone(String type){
            ICellPhoneFactory cellPhoneFactory = null;
            if("apple".equalsIgnoreCase(type)){
                cellPhoneFactory = new AppleCellPhoneFactory();
                System.out.println("apple factory created");
            }else if("samsung".equalsIgnoreCase(type)){
                cellPhoneFactory = new AppleCellPhoneFactory();
                System.out.println("three start factory created");
            }
            return cellPhone;
        }
    }

```

```java

    public class AppleCellPhoneFactory extends CellPhoneFactory {

        AppleCellPhone createApplePhone(){
            return new AppleCellPhone();
        }
    }

```

```java

    public class AbstractFactoryTest {

        public static void main(String[] args) {
            CellPhoneFactory factory = new CellPhoneFactory();
            AppleCellPhoneFactory apple = (AppleCellPhoneFactory)factory.createPhone("apple");
            AppleCellPhone apple = (AppleCellPhone)apple.createApplePhone();
            apple.call();
        }
    }

```

 - 抽象工廠模式還提供了一種為接口而不是實現編寫代碼的方法。
 - 工廠模式是 "工廠中的工廠"，可以輕鬆擴展以容納更多產品。例如，可以添加另一個子類 "HTC" 和工廠 "TwCellPhoneFactory"。
 - 抽象工廠模式是強大的，它消除了與工廠模式不同的條件邏輯。