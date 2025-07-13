---
title: "DesignPattern - Behavioral - Strategy"
author: Bill.Lin
date: 2018-08-07T22:37:39+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Strategy

當存在一組相關算法並且客戶端對象需要能夠從該組中動態挑選適合其當前需求的算法時，策略設計模式很有用。策略模式建議將每個算法的實現保留在一個單獨的類中。封裝在單獨類中的每個此類算法稱為策略。使用 Strategy 對象的對象通常稱為上下文對象。

當我們為特定任務有多種算法並且客戶端決定在運行時使用的實際實現時，我們使用策略模式。策略模式也稱為策略模式。我們定義了多種算法，並讓客戶端應用程序傳遞算法以用作參數。例如，此模式的最佳示例之一是 Collections.sort () 方法，該方法採用 Comparator 參數。基於 Comparator 接口的不同實現，對像以不同的方式排序。

策略模式是我們可以使用組合作為子分類的替代方法的一種方式。策略模式不是通過子類覆蓋父類中的方法來提供不同的行為，而是允許將不同的行為放置在共享公共策略接口的具體策略類中。Context 對象包含對 Strategy 的引用。通過改變上下文的策略，我們可以獲得不同的行為。


```java

    public interface CreditCardStrategy {

        public void pay(BigDecimal money);
    }

    public class CTBC implements CreditCardStrategy {

      @Override
      public void pay(BigDecimal money) {
         System.out.println("CTBC pay");
      }
    }

    public class MEGA implements CreditCardStrategy {

      @Override
      public void pay(BigDecimal money) {
         System.out.println("MEGA pay");
      }
    }

    public class NCCC implements CreditCardStrategy {

      @Override
      public void pay(BigDecimal money) {
         System.out.println("NCCC pay");
      }
    }


    // base
    public class Context {

      private CreditCardStrategy strategy;

      public Context(CreditCardStrategy strategy){
         this.strategy = strategy;
      }

      public void apply(BigDecimal money){
         strategy.pay(money);
      }
    }

```

```java

    public static void main(String[] args) {

        var money = new BigDecimal("100");

         // DI 注入 （constructor or setter）
        Context ctx = new Context(new CTBC());
        ctx.pay(money);

        // change strategy
        ctx = new Context(new MEGA()); 
        ctx.apu(money);
      }

```

 - 為策略提供了一種使用多種行為之一配置類的方法。
 - 算法使用客戶不應該知道的數據。使用策略模式來避免暴露複雜的、特定於算法的數據結構。 （封裝時做的細節）
 - 一個類定義了許多行為，這些行為在其操作中表現為多個條件語句。將相關的條件分支移到它們自己的 Strategy 類中，而不是許多條件。