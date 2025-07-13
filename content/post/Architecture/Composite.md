---
title: "DesignPattern - Structural - Composite"
author: Bill.Lin
date: 2018-08-07T12:15:31+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Composite

Composite 讓客戶可以統一處理單個對象和對象的組合，這就是 Composite Pattern 的意圖。
在復合模式中，存在一個樹結構，可以在葉子和節點上執行相同的操作。樹中的節點是可以有孩子的類。節點類是“複合”類。樹上的葉子是沒有孩子的“原始”類。
組合的子節點可以是葉子或其他組合。
葉類和復合類共享一個通用的 "Composite" interface，該接口定義了可以在葉和復合上執行的通用操作。當對組合執行操作時，將對組合的所有子節點執行此操作，無論它們是葉子還是組合。因此，複合模式可用於對組成樹的對象執行常見操作。

 - Base Component: 是組合中所有對象的接口。客戶端程序使用基本組件來處理組合中的對象。此外，它可以是一個 interface 或 abstract class，其中包含所有對象共有的一些方法。
 - Leaf: 定義組合中元素的行為。它是組合的構建塊並實現基本組件。雖然，它沒有對其他組件的引用。
 - Composite: 它由葉元素組成，並在基本組件中實現操作。

 ```java

    /**
    * Manager(Composite)
    * Developer(Leaf)
    * Employee(Component)
    */

    public interface Employee {

        public void add(Employee emp);
        public void remove(Employee emp);
        public Employee getChild(int i);
        public String getName();
        public double getSalary();
        public void print();
    }

    // 現在我們將創建 Manager (Composite)。這裡的關鍵點是所有通用方法都將其操作委託給子對象。它具有訪問和修改其子級的方法。
    public class Manager implements Employee {

        private String name; 
        private double salary;

        public Manager(String name, double salary) {
        this.name = name;
        this.salary = salary;
        }

        var employees = new ArrayList<Employee>(); 

        @Override
        public void add(Employee emp) {
            employees.add(emp);
        }

        @Override
        public void remove(Employee emp) {
            employees.remove(emp);
        }

        @Override
        public Employee getChild(int i) {
            return employees.get(i);
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public double getSalary() {
            return salary;
        }

        @Override
        public void print() {
            System.out.println("Name = " + getName());
            System.out.println("Salary = " + getSalary());
            System.out.println("-------------"); 

            Iterator<Employee> empIterator = employees.iterator();
            while(empIterator.hasNext()){
                var emp = empIterator.next();
                emp.print();
            }
        }
    }

    public class Manager implements Employee {

        private String name; 
        private double salary;

        public Manager(String name, double salary) {
            this.name = name;
            this.salary = salary;
        }

        var employees = new ArrayList<Employee>(); 

        @Override
        public void add(Employee emp) {
            employees.add(emp);
        }

        @Override
        public void remove(Employee emp) {
            employees.remove(emp);
        }

        @Override
        public Employee getChild(int i) {
            return employees.get(i);
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public double getSalary() {
            return salary;
        }

        @Override
        public void print() {
            System.out.println("Name = " + getName());
            System.out.println("Salary = " + getSalary());
            System.out.println("-------------"); 

            Iterator<Employee> empIterator = employees.iterator();
            while(empIterator.hasNext()){
                Employee emp= empIterator.next();
                emp.print();
            }
        }
    }

 ```

 ```java

    public class CompositePatternTest {

        public static void main(String[] args) {

        Employee emp1 = new Developer("Bill", 10000);
        Employee emp2 = new Developer("David", 15000);
        Employee manager1 = new Manager("Paul", 25000);

        manager1.add(emp1);
        manager1.add(emp2);

        Employee emp3 = new Developer("Lag", 20000);
        Manager generalManager = new Manager("Howard", 50000);

        generalManager.add(emp3);
        generalManager.add(manager1);

        generalManager.print();

        }
    }

 ```

 - 當我們想要表示對象的部分整體層次結構時。
 - 當我們希望客戶能夠忽略對象組合和單個對象之間的差異時。客戶端將統一對待複合結構中的所有對象。

