---
title: "DesignPattern - Structural - Decorator"
author: Bill.Lin
date: 2018-08-07T12:16:24+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Decorator

Decorator 的主要目的是動態地為對象附加額外的職責。Decorator 為擴展功能提供了一種靈活的替代子類的方法。

當我們需要動態擴展對象的功能而無需更改原始類源或使用繼承時，Decorator 為我們提供了便利。這是通過在實際對象周圍創建一個稱為裝飾器的對象包裝器來實現的。

Decorator 對象與底層對象具有相同的接口。這允許客戶端對像以與底層實際對象完全相同的方式與裝飾器對象交互。Decorator 對象包含對實際對象的引用。Decorator 對象接收來自客戶端的所有請求（調用）。反過來，它將這些調用轉發到底層對象。Decorator 對像在將請求轉發到底層對象之前或之後添加了一些附加功能。這確保了附加功能可以在運行時從外部添加到給定對象，而無需修改其結構。

`使用繼承或組合來擴展對象的行為，但這是在編譯時完成的，它適用於類的所有實例。不能在運行時添加任何新功能或刪除任何現有行為——這就是裝飾器模式出現的時候。`

```java

    public interface Pc {

        public String buyPc();
    }

    public class SimplePc implements Pc {
      @Override
      public String buyPc() {
          return "spend 1000";
      }
    }

    // 裝飾器類實現了組件接口，它與組件接口具有HAS-A關係。
    // 子裝飾器類應該可以訪問組件變量，因此保護這個變量。例如，下面的 IcecreamDecorator 類將在我們的例子中用作裝飾器。

    public class PcDecorator implements Pc {

       protected Pc specialPc;

       public PcDecorator(Pc specialPc){
          this.specialPc = specialPc;
       }

       @Override
       public String buyPc() {
          return specialPc.buyPc();
      }
    }

    public class UsaDecorator extends PcDecorator {

      public UsaDecorator(Pc specialPc) {
         super(specialPc);
      }

      public String buyPc(){
         return specialPc.buyPc() + addFee();
      }

      private String addFee() {
         return " + 2000";
      }
    }

    // 在裝飾一層
    public class TaiwanDecorator extends PcDecorator {

      public TaiwanDecorator(Pc specialPc) {
         super(specialPc);
      }

      public String buyPc(){
         return specialPc.buyPc() + addFee();
      }

      private String addFee() {
         return " + 5000";
      }
    }

```

```java

    public static void main(String[] args) {
        Pc pc = new TaiwanDecorator(new UsaDecorator(new SimplePc()));
        System.out.println(pc.buyPc());
    }

```

 - 動態且透明地向單個對象添加職責，即不影響其他對象。
 - 對於可以撤回的責任。
 - 當通過子分類擴展是不切實際的。有時大量的獨立擴展是可能的，並且會產生大量的子類來支持每種組合。或者一個類定義可能被隱藏或不能用於子分類。
 - 當選擇的數量更多時，它很容易維護和擴展。