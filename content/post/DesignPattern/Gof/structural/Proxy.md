---
title: "DesignPattern - Structural - Proxy"
author: Bill.Lin
date: 2018-08-07T12:15:41+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Proxy 

Proxy pattern 為另一個對象 create a representative object that controls access to another object。
事實上，Proxy pattern 是用來創建一個代表對象來控制對另一個對象的訪問。成本高或需要保護以至於存取消費較大。

控制對對象的訪問的一個原因是將其創建和初始化的全部成本推遲到我們真正需要使用它時。另一個原因可能是充當位於不同 JVM 中的對象的本地代表。此外，代理在控制對原始對象的訪問方面非常有用，尤其是當對象應該具有不同的訪問權限時。

在代理設計模式中，客戶端不直接與原始對像對話，它將調用委託給代理對象，代理對象調用原始對象的方法。此外，重要的一點是客戶端不知道代理。代理充當客戶端的原始對象。但是這種方法有很多變體，我們很快就會看到。

代理模式有三種主要變體：

1. proxy 為不同 remote address 的對象提供 local access (跳板)。
2. A virtual proxy creates expensive objects on demand.
3. 保護代理控制對原始對象的訪問。當對象應該具有不同的訪問權限時，保護代理很有用。

```java

    public class User {

        String userName;
        String password;

        // Getter, Setter, Constructor
    }

    public interface IFolder {
        public void performOperations();
    }

    public class Folder implements IFolder {
        @Override
        public void performOperations() {
            // 訪問 folder 並執行各種操作
            System.out.println("execute sth in folder");
        }
    }

    public class FolderProxy implements IFolder {

      Folder folder;
      User user;

      public FolderProxy(User user){
         this.user = user;
      }

      @Override
      public void performOperations() {
        if (("dev").equals(user.getUserName()) && ("dev").equals(user.getPassword())) {
            folder = new Folder();
            folder.performOperations();
         } else {
             System.out.println("can't access this folder");
         }
      } 
    }

```

```java

    public static void main(String[] args) {

        var user = new User("dev", "dev");
        FolderProxy folderProxy = new FolderProxy(user);
        folderProxy.performOperations();

        System.out.println("------------------------------------");
        // if we give wrong userName and Password
        var userWrong = new User("staging", "staging");
        FolderProxy folderProxyWrong = new FolderProxy(userWrong);
        folderProxyWrong.performOperations();
    }

```

 - 有一個現有的類，它的接口與您需要的不匹配。
 - 想創建一個可重用的類，它與不相關或不可預見的類（即不一定具有兼容接口的類）協作。
 - 有幾個現有的子類可供使用，但通過對每個子類進行子類化來調整它們的接口是不切實際的。對象 adapter 可以適配其父類的接口。
