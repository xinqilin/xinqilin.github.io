---
title: "ReverseLinkedList"
author: Bill.Lin
date: 2022-09-28T21:19:26+08:00
draft: false
tags: ["Java", "Recursion"]
Description: ""
Categories: ["Algorithm"]
DisableComments: false
---


### reverse Linked List

#### positive

```java

    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode node = head;
        ListNode next = null;
        
        while(node != null){
            next = node.next;
            node.next = prev;
            prev = node;
            node = next;
        }
        
        head = prev; 
        
        return head;
    }

```


#### recursive

```java

    public ListNode reverseList(ListNode head) {
        if(head == null || head.next == null) return head;
        
        ListNode result = reverseList(head.next);
        head.next.next = head;
        head.next = null;
        return result;
    }

```
