---
title: "DesignPattern - Structural - Flyweight"
author: Bill.Lin
date: 2018-08-07T12:15:57+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Flyweight

Flyweight 中，我們重複使用對象，而不是創建大量相似的對象。我們可以使用它來減少內存需求和實例化時間以及相關成本。

在我們應用 Flyweight 之前，我們需要考慮以下因素：

 - 如果應用程序中所需的對像數量巨大。
 - 如果對象創建佔用大量內存並且也可能很耗時。
 - 太多的對象會降低應用程序的性能。顯然，太多的對象可能會消耗更大的內存。此外，它們可能會降低應用程序的速度，甚至可能導致內存不足問題。
 - 在應用程序中控制它。當我們有很多相似的對象並且池中的兩個對象之間沒有太多差異時，尤其如此。

有時，應用程序中的對象可能具有很大的相似性並且屬於相似類型（此處的相似類型意味著它們的大多數屬性具有相似的值，並且只有少數屬性值不同）。如果它們也是要創建的重物，應用程序開發人員應該控制它們。否則，它們可能會消耗大量內存並最終減慢整個應用程序的速度。

Flyweight 旨在控制此類對象的創建，並為您提供基本的緩存機制。它允許您為每種類型創建一個對象（此處的類型因該對象的屬性而異），如果您請求具有相同屬性的對象（已創建），它將返回相同的對象而不是創建一個新的對象一。

```java

    public interface Msg {
        public void show(String msg);
    }

    public class EmergentMsg implements Msg {

        private String key;
        EmergentMsg(String key) {
            this.key = key;
            System.out.println("send " + key + " emergent msg");
        }
        public void show(String msg) {
            System.out.println(msg);
        }
    }


    public class MsgFactory {

        private static MsgFactory FACTORY = new MsgFactory();
        private static Map<String, Msg> msgs = new HashMap<>();

        public static MsgFactory getInstance() {
            // 看要不要 double lock check
            return FACTORY;
        }

        public Msg getMsg(String key) {
            Msg msg = (Msg)msgs.get(key);

            if (msg != null) {
                System.out.println("msg " + key + " exist");
            } else {
                msg = new EmergentMsg(key);
                msgs.put(key, msg);
            }
            return msg;
        }
    }

```


有點像資源重複使用 maybe, service locator pattern !?

