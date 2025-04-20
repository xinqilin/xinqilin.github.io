---
title: "DesignPattern - Structural - Bridge"
author: Bill.Lin
date: 2018-08-07T12:16:14+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Bridge

在接口和實現中都有接口層次結構時，使用 Bridge 設計模式將接口與實現分離，並對客戶端程序隱藏實現細節。

根據 GoF 橋的設計模式是：`將抽象與其實現分離，以便兩者可以獨立變化`。

將抽象及其實現分開，並為抽象和實現者開發單獨的繼承結構。抽像是接口或抽像類，同樣實現者是接口或抽像類。抽象包含對實現者的引用。抽象的孩子被稱為精煉抽象，實現者的孩子是具體的實現者。由於我們可以在抽像中更改對實現者的引用，因此我們可以在運行時更改抽象的實現者。但是，對實現者的更改不會影響客戶端代碼。

Bridge 的目的是將抽象和實現放入兩個不同的類層次結構中，以便兩者都可以獨立擴展。
Bridge 幫助兩個不兼容的 類一起工作。但是 Bridge 通過創建兩個不同的層次結構來分離抽象和實現。

```java

    /**
    * abstraction in Bridge pattern
    * */
    public abstract class Vehicle {
        protected VehicleType type1;
        protected VehicleType type2;

        public Vehicle(VehicleType type1, VehicleType type2) {
            this.type1 = type1;
            this.type2 = type2;
        }

        abstract public void purchase();
    }

    /**
    * Implementor for Bridge pattern
    * */
    public interface VehicleType {
        abstract public void book();
    }

    /**
    * Refine abstraction 1 in Bridge pattern
    */
    public class Car extends Vehicle {

        public Car(VehicleType type1, VehicleType type2) {
            super(type1, type2);
        }

        @Override
        public void purchase() {
            System.out.print("Car");
            type1.book();
            type2.book();
        }
    }

    /**
    * Refine abstraction 2 in Bridge pattern
    */
    public class Bike extends Vehicle {

        public Bike(VehicleType type1, VehicleType type2) {
            super(type1, type2);
        }

        @Override
        public void purchase() {
            System.out.print("Bike");
            type1.book();
            type2.book();
        }
    }

    /**
    * Concrete implementation 1 for Bridge pattern
    * */
    public class NewVehicle implements VehicleType {

        @Override
        public void book() {
            System.out.print(" : New Vehicle");
        }
    }

    /**
    * Concrete implementation 2 for Bridge pattern
    * */
    public class OldVehicle implements VehicleType {

        @Override
        public void book() {
            System.out.println(" : Old Vehicle");
        }
    }

```

```java

      public static void main(String[] args) {

         Vehicle vehicle1= new Car(new NewVehicle(),new OldVehicle());
         vehicle1.purchase();

         Bike vehicle2 = new Bike(new NewVehicle(),new OldVehicle());
         vehicle2.purchase();
      }

```

 - 多個實現時最好使用。
 - 需要在運行時切換實現時應該使用。
 - 如果抽象的實現有修改，客戶端不應該受到影響。
 - 創建兩個不同的層次結構。一個用於抽象，另一個用於實現。
 - 通過消除抽象和實現之間的依賴關係來避免永久綁定, 創建了一個在抽象和實現之間協調的橋樑。
 - 抽象和實現可以分開擴展。
