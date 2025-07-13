---
title: "DesignPattern - Behavioral - Mediator"
author: Bill.Lin
date: 2018-08-07T22:36:43+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Mediator

Mediator 通過阻止對象顯式地相互引用來促進鬆散耦合，並且它允許您獨立地改變它們的交互。
我們使用中介者設計模式在系統中的不同對象之間提供集中的通信媒介。

中介者模式專注於在對象之間提供一個中介者進行互動，並幫助實現對象之間的丟失耦合。對像要求中介者代表它們進行交互，而不是直接相互交互。它導致可重用性和鬆散耦合。此外，它封裝了對象之間的交互，使它們相互獨立。這也允許他們通過實現不同的中介以完全不同的方式改變與其他對象的交互。調解器有助於降低類的複雜性。此外，每個對像不再需要詳細了解如何與其他對象交互。對象之間的耦合從緊緻僵硬到鬆散優雅。
中介者設計模式在多個對象相互交互的企業應用程序中非常有用。如果對象直接相互交互，系統組件就會相互緊密耦合。它們還使可維護性成本更高，並且不能靈活地輕鬆擴展。

例如，空中交通管制員是調解員模式的一個很好的例子，其中機場控制室充當不同航班之間通信的調解員。中介作為對象之間的路由器工作，它可以有自己的邏輯來提供通信方式。

 * Mediator: 定義一個與同事對象通信的 interface
 * ConcreteMediator: 通過協調 Colleague 對象來實現協作行為。它還了解並維護其同事。
 * Colleague Classes: 每個 Colleague class 都知道它的 Mediator 對象。每位同事在本應與另一位同事溝通時都會與其調解員溝通。


 ```java

    public interface IMediator {
        public void talk();
        public void fight();
        public void registerA(ColleagueA a);
        public void registerB(ColleagueB b);
    }

    public class ConcreteMediator implements IMediator {

      ColleagueA talk;
      ColleagueB fight;

      @Override
      public void talk() {
        System.out.println("Mediator is talking");
      }

      @Override
      public void fight() {
         System.out.println("Mediator is fighting");
      }

      @Override
      public void registerA(ColleagueA a) {
         this.talk = a;
      }

      @Override
      public void registerB(ColleagueB b) {
         this.fight = b;
      }
    }

    // ===========


    public abstract class Colleague {
      IMediator mediator;
      public abstract void doSomething();
    }

    public class ColleagueA extends Colleague {

      public ColleagueA(IMediator mediator) {
         this.mediator = mediator;
         this.mediator.registerA(this);
      }

      @Override
      public void doSomething() {
         this.mediator.talk();
      }
    }

    public class ColleagueB extends Colleague {

      public ColleagueB(IMediator mediator) {
         this.mediator = mediator;
         this.mediator.registerB(this);
      }

      @Override     
      public void doSomething() {
         this.mediator.fight();
      }
    }

 ```

 ```java

    public static void main(String[] args) {
        IMediator mediator = new ConcreteMediator();

        ColleagueA talkColleague= new ColleagueA(mediator);
        talkColleague.doSomething();

        ColleagueB fightColleague = new ColleagueB(mediator);
        fightColleague.doSomething();
    }

 ```

 - 一組對像以定義明確但複雜的方式進行互動。由此產生的相互依賴是非結構化的並且難以理解。
 - 重用一個對像很困難，因為它引用了許多其他對象並與之互動。
 - 分佈在多個類之間的行為應該是可定制的，無需大量子類化。
