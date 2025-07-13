---
title: "DesignPattern - Behavioral - Observer"
author: Bill.Lin
date: 2018-08-07T22:37:21+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Observer (pub-sub)

在觀察者設計模式中，多個觀察者對象向一個主題註冊以獲取通知中的任何更改。當主題的狀態發生變化時，它會通知觀察者。監聽或觀察變化的對象稱為觀察者，被觀察的對象稱為主體。

主題為觀察者提供了一個接口，可以在主題中註冊和註銷自己。
主題知道它的訂閱者是誰。
多個觀察者可以訂閱通知。
主題發布通知。
主題只是發送通知說狀態已更改。它不傳遞任何狀態信息。
一旦收到來自主題的通知，觀察者就會調用主題並獲取更改的數據。

 * Subject，  註冊觀察者。對象使用此接口註冊為觀察者，也可以將自己從觀察者中移除。
 * Observer為對象定義了一個更新接口，這些接口應該被通知主題的變化。但是，所有的觀察者都需要實現 Observer 接口。該接口有一個方法 update()，當 Subject 的狀態發生變化時會調用該方法。
 * ConcreteSubject，將感興趣的狀態存儲到 ConcreteObserver 對象。當它的狀態改變時，它會向它的觀察者發送一個通知。此外，一個具體的主題總是實現主題接口。我們使用  * notifyObservers() 方法在狀態發生變化時更新所有當前的觀察者。
 * ConcreateObserver 維護對 ConcreteSubject 對象的引用並實現 Observer 接口。每個觀察者註冊一個具體的主題以接收更新。


```java

    public interface Subject {

        public void registerObserver(Observer observer);
        public void notifyObserver();
        public void unregisterObserver(Observer observer);
        public Object getUpdate();
    }



    public interface Observer {

      public void update();
      public void setSubject(Subject sub);
    }



    //Concrete Subject
    public class Blog implements Subject {

      List<Observer> observersList;
      private boolean stateChange;

      public Blog() {
         this.observersList = new ArrayList();
         stateChange = false;
      }

      @Override
      public void registerObserver(Observer observer) {
         observersList.add(observer);
      }

      @Override
      public void notifyObserver() {
         if (stateChange) {
           for(Observer observer : observersList) {
              observer.update();
              System.out.println("Observer notified !");
           }
         }
      }

      @Override
      public void unregisterObserver(Observer observer) {
         observersList.remove(observer);
      }

      @Override
      public Object getUpdate() {
         Object changedState = null;
         // should have logic to send the state change to querying observer
         if (stateChange) {
           changedState = "Observer Design Pattern";
         }
       return changedState;
      }

      public void postNewArticle() {
         stateChange = true;
         notifyObserver();
      }
    }



    //Concrete Observer
    public class User implements Observer {

      private String article;
      private Subject blog; 
      
      @Override
      public void update() {
         System.out.println("State change reported by Subject.");
         article = (String) blog.getUpdate();
      }

      @Override
      public void setSubject(Subject blog) {
         this.blog = blog;
         article = "No New Article!";
      }

      public String getArticle() {
         return article;
      }
    }

```


```java

    public static void main(String[] args) {
        Blog blog = new Blog();
        User user1 = new User();
        User user2 = new User();
        blog.registerObserver(user1);
        blog.registerObserver(user2);
        user1.setSubject(blog);
        user2.setSubject(blog);
        System.out.println(user1.getArticle()); 
        blog.postNewArticle();
        System.out.println(user1.getArticle());
    }

```

 - 當一個抽像有兩個方面時，一個依賴於另一個。將這些方面封裝在單獨的對像中可以讓您獨立地改變和重用它們。
 - 當對一個對象的更改需要更改其他對象時，您不知道需要更改多少個對象？
 - 當一個對象應該能夠通知其他對象而不假設這些對像是誰。換句話說，您不希望這些對象緊密耦合。



 reference: https://javatechonline.com/behavioral-design-patterns-in-java/#Template_Method_Design_Pattern