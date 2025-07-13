---
title: "DesignPattern - Structural - Adapter"
author: Bill.Lin
date: 2018-08-07T12:12:36+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Adapter
> 將一個類別的介面 轉換成另一個類別的介面供客戶使用 讓介面不相容的類別可以合作

有時，可能會出現兩個對像不適合在一起的情況，或者在代碼中更改第 3 方 API 時，可能會出現這種情況。
顯然，這是由於兩個不適合在一起的對象的接口不兼容造成的。

正如適配器一詞所暗示的那樣，適配器設計模式 是 使兩個不相關的接口協同工作的結構設計模式之一。此外，連接這些不相關接口的對象稱為適配器，就像中介一樣。

在適配器模式中，一個包裝類（adapter）用於將請求從它轉換到另一個類（adoptee）。實際上，適配器提供了與被收養者不直接提供的特定交互。

適配器模式可以採用兩種形式：繼承或組合形式。在第一種形式中，“類適配器”利用繼承。類適配器擴展了被收養類並將所需的方法添加到適配器中。
這些方法可以在接口（即“目標”接口）中聲明。但是，在第二種形式中；"對象 adapter" 利用組合。對象 adapter 包含被收養者並實現目標接口以與被收養者交互。


* Client: 你使用Target介面
* Target: 定義 User 所呼叫的 interface 
* Adaptor(core): 將 Adaptee 轉換成要用的介面
* Adaptee: 需要被轉換的介面


```java

    public class Apple {

        public void getAppleColor(String color){
            System.out.println("Apple color is : " +color);
        }
    }

    public class Orange {

      public void getOrangeColor(String color){
         System.out.println("Orange color is : " +color);
      }
    }

    public class AppleAdapter extends Apple {

      //The purpose of the sample problem is to adapt an orange as an apple.
      private Orange orange;

      // This is the main logic of Adapter pattern
      public AppleAdapter(Orange orange){
         this.orange = orange;
      }

      public void getColor(String color){
         orange.getOrangeColor(color);
      }
    }

```

```java

    public class AdapterPatternTest {

        public static void main(String[] args) {

            Apple apple = new Apple();
            apple.getAppleColor("green");

            Orange orange = new Orange();
            AppleAdapter adapter = new AppleAdapter(orange);
            adapter.getAppleColor("red");
        }
    }

```


 - 有一個現有的類，它的接口與需要的不匹配。
 - 想要創建一個可重用的類，它與不相關或不可預見的類（即不一定具有兼容接口的類）協作。
 - 有幾個現有的子類可供使用，但通過對每個子類進行子類化來調整它們的接口是不切實際的。對象適配器可以適配其父類的接口。



 ### more sample


Adapter 模式將 Adaptee 類別的 specificRequest() 方法包裝成 Target 接口的 request() 方法。<br>
Client 類別可以通過呼叫 Target 接口的 request() 方法來發送請求，而不用知道底層使用的是 Adaptee 類別的 specificRequest() 方法。<br>
通過使用 Adapter 模式，我們可以讓不兼容的類別一起工作，這對於在現有系統中加入新功能非常有用。

 ```java

    // Target interface
    public interface Target {
    void request();
    }

    // Adaptee class
    public class Adaptee {
    public void specificRequest() {
        // Perform some specific request
    }
    }

    // Adapter class
    public class Adapter implements Target {
    private Adaptee adaptee;

    public Adapter(Adaptee adaptee) {
        this.adaptee = adaptee;
    }

    @Override
    public void request() {
        adaptee.specificRequest();
    }
    }

    // Client
    public class Client {
    public void makeRequest(Target target) {
        target.request();
    }
    }

    // Usage
    Adaptee adaptee = new Adaptee();
    Target target = new Adapter(adaptee);
    Client client = new Client();
    client.makeRequest(target);


 ```