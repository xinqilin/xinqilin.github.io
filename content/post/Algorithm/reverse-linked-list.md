---
title: "鏈表反轉（Reverse Linked List）完整解析"
author: Bill.Lin
date: 2022-09-28T21:19:26+08:00
draft: false
tags: ["Algorithm", "LinkedList", "Recursion", "Java", "Pointer"]
description: "鏈表反轉的迭代與遞迴兩種寫法，附指標移動圖解與複雜度分析；進階涵蓋反轉前 N 個節點、指定區間（LeetCode 92）、K 個一組反轉（LeetCode 25），以及虛擬頭節點等實作技巧。"
categories: ["Algorithm"]
aliases:
  - /post/Algorithm/ReverseLinkedList/

---

## 概述

鏈表反轉是數據結構與演算法中的經典問題，要求將單向鏈表的指向關係完全反轉。這個問題看似簡單，但涉及到指標操作的細節，是考驗編程基本功的重要題型。

## 問題定義

給定一個單向鏈表，將其反轉並回傳新的頭節點。

**範例**：
```
輸入：1 -> 2 -> 3 -> 4 -> 5 -> NULL
輸出：5 -> 4 -> 3 -> 2 -> 1 -> NULL
```

### 鏈表節點定義

```java
public class ListNode {
    int val;
    ListNode next;
    
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { 
        this.val = val; 
        this.next = next; 
    }
}
```

## 解法一：迭代實作

### 基本思路

使用三個指標 `prev`、`current`、`next` 來逐步改變每個節點的指向關係。

### 算法步驟

1. 初始化 `prev = null`，`current = head`
2. 當 `current != null` 時：
   - 保存 `current.next` 到 `next`
   - 將 `current.next` 指向 `prev`
   - 移動 `prev` 和 `current` 指標
3. 回傳 `prev`（新的頭節點）

### 實作代碼

```java
public class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode current = head;
        
        while (current != null) {
            ListNode next = current.next;  // 保存下一個節點
            current.next = prev;           // 反轉指標
            prev = current;                // 移動 prev
            current = next;                // 移動 current
        }
        
        return prev;  // prev 現在是新的頭節點
    }
}
```

### 圖解過程

```
初始狀態：
prev = null, current = 1
null    1 -> 2 -> 3 -> 4 -> 5 -> null

第一步：
next = 2, current.next = prev
null <- 1    2 -> 3 -> 4 -> 5 -> null
      prev  current

第二步：
next = 3, current.next = prev  
null <- 1 <- 2    3 -> 4 -> 5 -> null
           prev  current

...

最終狀態：
null <- 1 <- 2 <- 3 <- 4 <- 5    null
                           prev  current
```

## 解法二：遞歸實作

### 基本思路

使用遞歸的方式，從鏈表尾部開始反轉，利用遞歸回溯的特性來改變指標指向。

### 算法步驟

1. 遞歸到鏈表最後一個節點
2. 在回溯過程中，逐步反轉每個節點的指向
3. 回傳原鏈表的尾節點（新的頭節點）

### 實作代碼

```java
public class Solution {
    public ListNode reverseList(ListNode head) {
        // 基礎情況：空節點或只有一個節點
        if (head == null || head.next == null) {
            return head;
        }
        
        // 遞歸反轉子鏈表
        ListNode newHead = reverseList(head.next);
        
        // 反轉當前節點的指向
        head.next.next = head;
        head.next = null;
        
        return newHead;
    }
}
```

### 遞歸過程分析

```
原鏈表：1 -> 2 -> 3 -> 4 -> 5 -> null

遞歸調用棧：
reverseList(1) -> reverseList(2) -> ... -> reverseList(5)

回溯階段：
1. reverseList(5) 回傳 5
2. reverseList(4)：
   - newHead = 5
   - 4.next.next = 4 (即 5.next = 4)
   - 4.next = null
   - 回傳 5
3. reverseList(3)：
   - newHead = 5  
   - 3.next.next = 3 (即 4.next = 3)
   - 3.next = null
   - 回傳 5
...

最終結果：5 -> 4 -> 3 -> 2 -> 1 -> null
```

## 時間與空間複雜度分析

| 方法 | 時間複雜度 | 空間複雜度 | 優點 | 缺點 |
|------|-----------|-----------|------|------|
| 迭代 | O(n) | O(1) | 空間效率高，直觀易懂 | 需要處理多個指標 |
| 遞歸 | O(n) | O(n) | 代碼簡潔，邏輯清晰 | 使用額外堆疊空間 |

## 進階應用

### 1. 反轉鏈表的前 N 個節點

**問題**：反轉鏈表的前 N 個節點。

```java
public class Solution {
    private ListNode successor = null;  // 後驅節點
    
    public ListNode reverseN(ListNode head, int n) {
        if (n == 1) {
            // 記錄第 n+1 個節點
            successor = head.next;
            return head;
        }
        
        // 以 head.next 為起點，需要反轉前 n-1 個節點
        ListNode last = reverseN(head.next, n - 1);
        
        head.next.next = head;
        head.next = successor;  // 讓反轉之後的 head 節點和後面的節點連起來
        
        return last;
    }
}
```

### 2. 反轉鏈表的指定區間（LeetCode 92）

**問題**：反轉從位置 m 到 n 的鏈表。請使用一趟掃描完成反轉。

```java
public class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        // 創建虛擬頭節點
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        
        // 找到 left 的前一個節點
        ListNode prev = dummy;
        for (int i = 0; i < left - 1; i++) {
            prev = prev.next;
        }
        
        // 開始反轉
        ListNode current = prev.next;
        ListNode next = null;
        
        for (int i = 0; i < right - left; i++) {
            next = current.next;
            current.next = next.next;
            next.next = prev.next;
            prev.next = next;
        }
        
        return dummy.next;
    }
}
```

### 3. K 個一組反轉鏈表（LeetCode 25）

**問題**：給定一個鏈表，每 k 個節點一組進行反轉。

```java
public class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        if (head == null) return null;
        
        // 檢查剩餘節點是否足夠 k 個
        ListNode a = head, b = head;
        for (int i = 0; i < k; i++) {
            if (b == null) return head;  // 不足 k 個，直接返回
            b = b.next;
        }
        
        // 反轉前 k 個元素
        ListNode newHead = reverse(a, b);
        
        // 遞歸反轉後續的鏈表並連接
        a.next = reverseKGroup(b, k);
        
        return newHead;
    }
    
    // 反轉 [a, b) 區間的鏈表
    private ListNode reverse(ListNode a, ListNode b) {
        ListNode prev = null;
        ListNode current = a;
        
        while (current != b) {
            ListNode next = current.next;
            current.next = prev;
            prev = current;
            current = next;
        }
        
        return prev;
    }
}
```

## 實作技巧與注意事項

### 1. 邊界條件處理

```java
// 檢查空鏈表和單節點鏈表
if (head == null || head.next == null) {
    return head;
}
```

### 2. 使用虛擬頭節點

在處理鏈表頭部變化的問題時，虛擬頭節點可以簡化邏輯：

```java
ListNode dummy = new ListNode(0);
dummy.next = head;
// ... 操作
return dummy.next;
```

### 3. 指標操作的順序

在改變指標指向時，必須先保存下一個節點：

```java
ListNode next = current.next;  // 先保存
current.next = prev;           // 再修改
```

### 4. 遞歸終止條件

確保遞歸有明確的終止條件：

```java
if (head == null || head.next == null) {
    return head;  // 基礎情況
}
```

## 常見變體問題

### 1. 判斷鏈表是否為回文

```java
public boolean isPalindrome(ListNode head) {
    if (head == null) return true;
    
    // 找到中點
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // 反轉後半部分
    ListNode secondHalf = reverseList(slow.next);
    
    // 比較前後兩部分
    ListNode p1 = head, p2 = secondHalf;
    while (p2 != null) {
        if (p1.val != p2.val) return false;
        p1 = p1.next;
        p2 = p2.next;
    }
    
    return true;
}
```

### 2. 兩兩交換鏈表中的節點

```java
public ListNode swapPairs(ListNode head) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode prev = dummy;
    
    while (prev.next != null && prev.next.next != null) {
        ListNode first = prev.next;
        ListNode second = prev.next.next;
        
        // 交換
        prev.next = second;
        first.next = second.next;
        second.next = first;
        
        // 移動 prev
        prev = first;
    }
    
    return dummy.next;
}
```

## 最佳實踐

1. **選擇合適的方法**：對於簡單的鏈表反轉，推薦使用迭代方法
2. **注意空間複雜度**：在空間受限的環境下避免使用遞歸
3. **處理邊界情況**：始終檢查空鏈表和單節點情況
4. **使用虛擬節點**：簡化頭節點的處理邏輯
5. **測試充分**：測試各種邊界情況和特殊輸入

## 總結

鏈表反轉是一個看似簡單但細節豐富的問題。掌握這個問題的關鍵在於：

1. **理解指標操作**：正確處理節點間的指向關係
2. **選擇合適方法**：根據場景選擇迭代或遞歸實作
3. **處理邊界情況**：確保算法在各種輸入下都能正確運行
4. **靈活應用**：將基本技巧應用到更複雜的變體問題中

通過反復練習和理解，鏈表反轉將成為解決更複雜鏈表問題的基礎技能。

## 參考資料

- [LeetCode 206. Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
- [LeetCode 92. Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/)
- [LeetCode 25. Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)
- [LeetCode 234. Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)
- [演算法導論 - 鏈表操作](https://mitpress.mit.edu/books/introduction-algorithms)