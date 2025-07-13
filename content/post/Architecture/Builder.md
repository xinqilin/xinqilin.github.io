---
title: "DesignPattern  - Basic - Builder"
author: Bill.Lin
date: 2018-08-07T02:16:32+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Builder

對象構造的細節，實例化和初始化構成對象的組件，都保存在對像中，通常作為其構造函數的一部分。這種類型的設計將對象構造過程與構成對象的組件緊密聯繫在一起。但是，只要構造對像簡單，對象構造過程明確，並且總是產生對象的相同表示，這種方法就適用。

此外，當被創建的對像很複雜並且構成對象創建過程的一系列步驟可以以不同的方式實現時，這種設計可能無效。因此，產生對象的不同表示。因為構造過程的不同實現都保存在對像中，所以對象可能變得龐大（構造膨脹）並且模塊化程度較低。隨後，添加新實現或更改現有實現需要更改現有代碼。

Builder 的目的是將復雜對象的構造與其表示分離，以便相同的構造過程可以創建不同的表示。這種類型的分離減小了對象的大小。該設計變得更加模塊化，每個實現都包含在不同的構建器對像中。因此，添加一個新的實現（即添加一個新的構建器）變得更容易了。此外，對象構造過程變得獨立於構成對象的組件。這提供了對對象構造過程的更多控制。

它指定了一個抽象接口，用於創建 Product 對象的各個部分。構建器模式建議將構建邏輯從對像類移到一個單獨的類，稱為構建器類。但是，可以有多個這樣的構建器類，每個構建器類對於構建對象的一系列步驟都有不同的實現。此外，每個構建器實現都會導致對象的不同表示。

#### ConcreteBuilder

 - 通過實現 Builder 接口來構造和組裝產品的各個部分。
 - 定義並跟踪它創建的表示。
 - 提供用於檢索產品的接口。

 #### Director

 它使用 Builder 接口構造一個對象。Builder 模式建議使用稱為 Director 的專用對象，它負責調用構建最終對象所需的不同構建器方法。此外，不同的客戶端對象可以利用 Director 對象來創建所需的對象。一旦構造了對象，客戶端對象就可以直接向構造器請求完整構造的對象。為了方便這個過程，可以在公共Builder接口中聲明一個新方法getObject()，由不同的具體builder實現。


 ```java

    public interface PcBuilder {

        public void buildKeyboard();
        public void buildMouse();
        public void buildScreen();

        public Pc getPc();
    }


    public class Pc {

        private String keyboard;
        private String mouse;
        private String screen;

        // Getter / Setter / toString method
    }

    public class AcerPcBuilder implements PcBuilder {

      Pc pc;

      public AcerPcBuilder(){
         pc = new Pc();
      }

      @Override
      public void buildKeyboard() {
         pc.setKeyboard("Acer keyyyyyyyyy");
      }

      @Override
      public void buildMouse() {
         pc.setMouse("Acer micky mouse");
      }

      @Override
      public void buildScreen() {
         pc.setScreen("Acer 24 inch screen");
      }

      @Override
      public Pc getPc() {
         return pc;
      }
    }   

 ```


Director

```java

    public class PcDirector {

       private PcDirector pcDirector = null;

       public PcDirector(PcBuilder pcBuilder) {
          this.pcBuilder = pcBuilder;
       }

       public void constructPc() {
          pcBuilder.buildKeyboard();
          pcBuilder.buildMouse();
          pcBuilder.buildScreen();
       }

       public Meal getPc(){
          return pcBuilder.getPc();
       }
    }

```

```java

      public static void main(String[] args) {

         PcBuilder acerPcBuilder = new AcerPcBuilder();
         PcDirector pcDirector = new PcDirector(acerPcBuilder);
         pcDirector.constructPc();
         Pc pc = pcDirector.getPc();

         log.info("acer pc builder ~");
      }

```


### 其他版本 Builder

有一個具有一長串屬性的對象。這些屬性中的大多數都是可選的。
用戶不是直接創建所需的對象，而是調用具有所有必需參數的構造函數並獲取構建器對象。然後，用戶在構建器對像上調用類似 setter 的方法來設置每個感興趣的可選參數。最後，用戶調用無參數構建方法來生成對象。

需要創建一個靜態類，然後將所有參數從外部類複製到 Builder 類。
接下來，Builder 類應該有一個公共構造函數，其中包含所有必需的屬性作為參數。
Builder 類應該具有設置可選參數的方法，並且在設置可選屬性後它應該返回相同的 Builder 對象。
最後，我們需要在構建器類中提供一個 build() 方法，該方法將返回客戶端程序所需的 Object。
為了做到這一點，需要在 Class 中有一個以 Builder 類作為參數的私有構造函數。


```java

public class Pc{

    private final String keyboard; 
    private final String mouse; 
    private final String screen;
    private final int screenCount; 
    private final double price;  // in real case, you should use BigDecimal XD

    public static class Builder {

        private String keyboard; 
        private String mouse; 
        private String screen;
        private int screenCount; 
        private double price;

         //builder methods for setter
         public Builder keyboard(String keyboard){this.keyboard = keyboard; return this; }
         public Builder mouse(String mouse){this.butter = cup; return this; }
         public Builder screen(String screen){this.eggs = number; return this; }
         public Builder screenCount(int screenCount){this.vanila = spoon; return this; }
         public Builder price(double price){this.flour = cup; return this; }

         // already build object
         public Pc build() {
            return new Pc(this);
         }
      }

    //private constructor to enforce object creation through builder
      private Pc(Builder builder) {
         this.keyboard = builder.keyboard;
         this.mouse = builder.mouse;
         this.screen = builder.screen;
         this.screenCount = builder.screenCount;
         this.price = builder.price;
      }
}

```

```java


      public static void main(String[] args) {
      
      Pc pc = new Pc.Builder().keyboard("機械鍵盤").mouse("羅技").screen("Dell").build();
      log.info("pc: {}", pc);

      }

```

 - 何時創建複雜對象的算法應該獨立於構成對象的部分以及它們的組裝方式。
 - 當構造過程必須允許構造對象的不同表示時。