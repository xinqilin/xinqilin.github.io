---
title: "DesignPattern - Behavioral - Visitor"
author: Bill.Lin
date: 2018-08-07T22:38:06+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Visitor

當必須對一組相似類型的對象執行操作時，我們使用訪問者模式。借助 visitor pattern，我們可以將操作邏輯從對象轉移到另一個類。例如，考慮一個購物車，我們可以在其中添加不同類型的商品（元素），當我們點擊結帳按鈕時，它會計算出我們需要支付的總金額。現在，我們可以在項目類中包含計算邏輯，或者我們可以使用 visitor pattern 將此邏輯移到另一個類中。因此，使用 visitor pattern，我們可以將邏輯移到另一個類。

visitor pattern 允許在不更改集合中任何對象的類的情況下定義操作。為此，visitor pattern 建議在稱為 visitor類的單獨類中定義操作。這將操作與其操作的對象集合分開。對於要定義的每個新操作，都會創建一個新的訪問者類。由於操作將在一組對像上執行，因此訪問者需要一種訪問這些對象的公共成員的方法。

 - Visitor：為對象結構中的每個 ConcreteElement 類聲明一個訪問操作。操作的名稱和簽名標識向訪問者發送訪問請求的類。這讓訪問者可以確定被訪問元素的具體類。然後訪問者可以通過其特定的界面直接訪問該元素。
 - ConcreteVisitor：實現訪問者聲明的每個操作。每個操作都實現了為結構中的相應對像類定義的算法片段。ConcreteVisitor 為算法提供上下文並存儲其本地狀態。這種狀態通常會在結構的遍歷過程中累積結果。
 - Element：定義一個接受訪問者作為參數的操作。
 - ConcreteElement：實現以訪問者為參數的 Accept 操作。

ObjectStructure: 

* 可以枚舉它的元素。
* 可以提供高級界面以允許訪問者訪問其元素。
* 可以是組合或集合，例如列表或集合。


```java

    public interface ShoppingCartElement {

        public int accept(ShoppingCartVisitor visitor);
    }


    public class Beef implements ShoppingCartElement {

        private int price;
        private double weight;

        // constructor , getter , setter

        @Override
        //Notice the implementation of accept() method in concrete classes, 
        //its calling visit() method of Visitor and passing itself as argument.
        public int accept(ShoppingCartVisitor visitor) {
            return visitor.visit(this);
        }
    }

    public class Fruit implements ShoppingCartElement {

        private int pricePerKg;
        private int weight;
        private String name;

        // constructor , getter , setter

        @Override
        public int accept(ShoppingCartVisitor visitor) {
            return visitor.visit(this);
        }
    }

```

```java

    public interface ShoppingCartVisitor {

      int visit(Beef book);
      int visit(Fruit fruit);
    }

    public class ShoppingCartVisitorImpl implements ShoppingCartVisitor {

      @Override
      public int visit(Beef beef) {
         var cost = 0;
         //apply 5$ discount if book price is greater than 50
         if(beef.getPrice() > 50){
            cost = beef.getPrice() - 5;
         } else {
            cost = beef.getPrice();
         }
        
        log.info("beef: {}", beef);

        return cost;
      }

      @Override
      public int visit(Fruit fruit) {
         var cost = fruit.getPricePerKg() * fruit.getWeight();

         log.info("cost: " + cost);

         return cost;
      }
    }

```

```java

    public static void main(String[] args) {

        var items = new ShoppingCartElement[]{
                new Beef(20, 2.0),
                new Beef(100, 3.0),
                new Fruit(10, 2, "Apple"), 
                new Fruit(5, 5, "Banana")
            };

        int total = calculatePrice(items);
        log.info("total: " + total);
    }

    private static int calculatePrice(ShoppingCartElement[] items) {

        var visitor = new ShoppingCartVisitorImpl();
        int sum = 0;
        for(ShoppingCartElement item : items){
            sum += item.accept(visitor);
        }
        return sum;
    }

```

 - 一個對象結構包含許多具有不同接口的對像類，並且您希望對這些對象執行依賴於它們的具體類的操作。
 - 當我們需要對對象結構中的對象執行許多不同且不相關的操作時，我們希望避免這些操作 "污染" 它們的 class。訪問者允許您通過在一個類中定義相關操作來將它們保持在一起。當我們需要與許多應用程序共享對象結構時，使用訪問者將操作放在那些需要它們的應用程序中。
 - 定義對象結構的類很少更改，但您經常希望在該結構上定義新操作。但是，更改對象結構類需要重新定義所有訪問者的接口，這可能是昂貴的。如果對象結構類經常更改，那麼最好在這些類中定義操作。