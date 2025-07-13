---
title: "DesignPattern - Behavioral - Chain Of Responsibility"
author: Bill.Lin
date: 2018-08-07T22:37:08+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Chain Of Responsibility

當有多個對象可以處理或滿足客戶端請求時，責任鏈模式建議給這些對像中的每一個以某種順序處理請求的機會。在這種情況下應用該模式，這些潛在的處理程序中的每一個都可以以鏈的形式排列，每個對像都具有對鏈中下一個對象的引用。鏈中的第一個對象接收請求並決定處理請求或將其傳遞給鏈中的下一個對象。請求一個接一個地流過鏈中的所有對象，直到請求被鏈中的一個處理程序處理或請求到達鏈的末端而沒有得到處理。

顯然，責任鏈模式用於在軟件設計中實現鬆散耦合，其中來自客戶端的請求被傳遞到對象鏈以處理它們。然後鏈中的對象將自行決定誰將處理請求以及是否需要將請求發送到鏈中的下一個對象。

* 多個類別繼承或實作抽象, 並使用, 實作中不是自己的就 next 下去, 是自己的就 action

```java

    // This's the request object.
    public class Number {

        private int number;

        public int getNumber() {
            return number;
        }

        public Number(int num){
            number=num;
        }
    }

    // interface that acts as a chain link.
    public interface Chain {
      public void setNext(Chain nextInChain);
      public void process(Number request);
    }   

    public class PositiveNumberProcessor implements Chain {

      private Chain nextInChain;

      @Override
      public void setNext(Chain c) { 
         nextInChain = c;
      }

      @Override
      public void process(Number request) {

        if (request.getNumber() > 0) {
            System.out.println("PositiveNumberProcessor : " + request.getNumber());
        } else {
            nextInChain.process(request);
        }
     }
    }

    public class NegativeNumberProcessor implements Chain {

      private Chain nextInChain;

      @Override
      public void setNext(Chain c) {
         nextInChain = c;
      }

      @Override
      public void process(Number request) {

         if (request.getNumber() < 0) {
             System.out.println("NegativeNumberProcessor : " + request.getNumber());
         } else {
             nextInChain.process(request);
         }
      }
    } 

    public class ZeroProcessor implements Chain {

      private Chain nextInChain;

      @Override
      public void setNext(Chain c) {
         nextInChain = c;
      }

      @Override
      public void process(Number request) {

         if (request.getNumber() == 0) {
            System.out.println("ZeroProcessor : " + request.getNumber());
         } else {
            nextInChain.process(request);
         }
      }
    }

```

```java

      public static void main(String[] args) {

        //  Chain c1 = new NegativeNumberProcessor();
        //  Chain c2 = new ZeroProcessor();
        //  Chain c3 = new PositiveNumberProcessor();
        //  c1.setNext(c2);
        //  c2.setNext(c3);

        // chain
        Chain c = new Chain(new NegativeNumberProcessor(new ZeroProcessor(new PositiveNumberProcessor())))

        //calling chain of responsibility
         c1.process(new Number(99));
         c1.process(new Number(-30));
         c1.process(new Number(0));
         c1.process(new Number(100));
      }

```

 - 多個對象可以處理一個請求，並且處理程序是先驗未知的。應自動確定處理程序。
 - 您想向多個對象之一發出請求，而不明確指定接收者。
 - 應該動態指定可以處理請求的對象集。