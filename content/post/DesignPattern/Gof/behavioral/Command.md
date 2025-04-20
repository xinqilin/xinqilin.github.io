---
title: "DesignPattern - Behavioral - Command"
author: Bill.Lin
date: 2018-08-07T22:37:50+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# Command

Command Pattern 是一種行為對象設計模式。在 Command Pattern 中，命令接口聲明了用於執行特定操作的方法。具體的 Command 類實現了 Command interface 的 execute()方法，這個execute()方法調用了具體 Command 類所包含的 Receiver 類的相應動作方法。此外，Receiver 類執行特定的操作。但是，客戶端類負責創建具體命令並設置具體命令的接收者。此外，Invoker 類包含對 Command 的引用，並具有執行 Command 的方法。

在命令模式中，調用者與接收者執行的動作分離。調用者不知道接收者。調用者調用命令，命令執行接收者的適當動作。因此，調用者可以在不知道要執行的動作的細節的情況下調用命令。此外，這種解耦意味著對接收者動作的更改不會直接影響動作的調用。

我們甚至可以使用命令模式來執行“撤消”功能。在這種情況下，Command 接口應該包含一個方法，例如 unexecuted() 方法。

不用說，它還幫助我們在請求-響應模型中實現松耦合。簡而言之，請求被發送給調用者，調用者將其傳遞給封裝的 命令對象。命令對象將請求傳遞給 Receiver的適當方法以執行特定操作。客戶端程序創建接收器對象，然後將其附加到命令。然後，它創建調用程序對象並附加命令對像以執行操作。現在，當客戶端程序執行動作時，它會根據命令和接收器對象進行處理。

* Command是一個帶有 execute() 方法的接口。它是契約的核心。
* Client 創建一個命令實現的實例並將其與接收器相關聯。
* Invoker指示命令執行操作。
* 命令實現的實例在接收者和動作之間創建一個綁定。
* Receiver 是知道執行操作的實際步驟的對象。任何類都可以作為接收者。


```java

    // command pattern 起手式
    public interface Command {

        public void execute();
    }

    public class Homework {

      public void writeHomework(){
         System.out.println("write HW right now!");
      }
    }

    // Receiver
    public class HomeworkCommand implements Command {

      Homework homework;

      public HomeworkCommand(Homework homework) {
         this.homework = homework;
      }

      @Override
      public void execute() {
         homework.writeHomework();
      }
    }

    // Receiver
    public class ClassmateCommand implements Command {

      Classmate classmate;

      public ClassmateCommand(Classmate classmate) {
         this.classmate = classmate;
      }

      @Override
      public void execute() {
         classmate.writeHomeworkTogether();
      }
    }


    // Invoker
    public class Invoker {

      Command command;

      public Invoker(Command command) {
         this.command = command;
      }

      public void setCommand(Command command) {
         this.command = command;
      }

      public void invoke() {
         command.execute();
      }
    }

```

```java

    public static void main(String[] args) {

        var homework = new Homework(); // receiver
        Command homeworkCommand = new HomeworkCommand(homework); // concrete command

        var classmate = new Classmate(); // receiver
        Command classmateCommand = new ClassmateCommand(classmate); // concrete command

        Invoker invoker = new Invoker(); // invoker
        invoker.setCommand(homeworkCommand);
        invoker.invoke();

        invoker.setCommand(classmateCommand);
        invoker.invoke();
    }

```

 - 通過要執行的操作參數化對象。
 - 圍繞基於原語操作的高級操作構建系統。這種結構在支持事務的信息系統中很常見。此外，命令模式提供了一種對事務建模的方法。命令有一個通用接口，讓您以相同的方式調用所有事務。該模式還使得使用新事務擴展系統變得容易。
 - 命令的執行操作可以存儲狀態以在命令本身中反轉其效果。Command 接口必須有一個添加的 Un-execute 操作，它可以逆轉先前調用 Execute 的效果。我們可以將執行的命令存儲在歷史列表中。此外，我們可以通過分別調用 Un-execute 和 Execute 來回遍歷這個列表來實現無限級別的撤消和重做。它也支持撤消。