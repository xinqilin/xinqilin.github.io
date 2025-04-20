---
title: "@Autowired is not recommended"
author: Bill.Lin
date: 2021-07-10T20:27:20+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring"]
DisableComments: false
---


``intellij 在使用 Bean Autowired 會跳出的警告 (Eclipse 不會)``

```

Field injection is not recommended 
Inspection info: Spring Team recommends: 
"Always use constructor based dependency injection in your beans. 
 Always use assertions for mandatory dependencies".
 
 ```
<br>

這與 Spring 注入的方法有關
- Field injection 
- Setter 
- Constructor injection

### Field injection 

```java

    @Autowired
    BillService billService;

    // 簡潔有力。
    // 1. 但當把 Field injection 轉換成 Constructor injection 會發現，這個建構子也太多參數了吧，顯然他做了很多事，違背了 SOLID 單一職責原則（SRP）
    // 2. 受容器管理的類不應該去依賴容器所使用的依賴，單元測試中例項化這個類而不必去啟動依賴注入容器，實現測試分離
    // 3. 小心 "new"
    //ex: 

    public class BillService {
        public void becomeRich(){
            System.out.println("Bill become rich");
        }
    }

    //=======================

    public class Bill {

        @Autowired
        private BillService billService;

        public void execute(){
            billService.becomeRich();
        }
    }

    //=======================

    public class Test {
        public static void main(String[] args) {
            Bill bill = new Bill();
            bill.execute();
        }
    }

    // 完了!  掛了  BillService 這時還沒有被建出來，沒有 becomeRich 直接吃 NPE

```
<br>

``Setter 跟 Constructor injection 差在 Setter 可以在沒有提供依賴時 ，順利執行，但 Constructor injection則會要求要強制依賴才能正常運轉``

### Setter 

```java

    private BillService billService;

    public void setBillService(BillService billService) {
        this.billService = billService;
    }

```

### Constructor injection 

```java

    private BillService billService;
    
    public BillController(BillService billService) {
        this.billService = billService;
    }

```
