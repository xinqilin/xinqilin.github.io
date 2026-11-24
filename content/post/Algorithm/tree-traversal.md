---
title: "二元樹遍歷（Binary Tree Traversal）完整指南"
author: Bill.Lin
date: 2021-11-21T20:11:03+08:00
draft: false
tags: ["Algorithm", "Tree", "遞歸", "Java"]
description: "二元樹前序、中序、後序遍歷的順序與實作，延伸到層序遍歷（BFS）與 O(1) 空間的 Morris 遍歷，並示範如何用前序加中序、中序加後序的遍歷結果重建二元樹。"
categories: ["Algorithm"]
aliases:
  - /post/Algorithm/TreeTraversal/

---

## 概述

二元樹遍歷是資料結構與演算法中的基本概念，主要有三種遍歷方式：**前序遍歷（PreOrder）**、**中序遍歷（InOrder）**、**後序遍歷（PostOrder）**。每種遍歷方式都有其特定的應用場景和優勢。

## 基本概念

考慮以下二元樹結構：

```
        4
       / \
      2   6
     / \ / \
    1  3 5  7
```

### 三種遍歷方式的順序

1. **前序遍歷（PreOrder）**：中 → 左 → 右
   - 遍歷順序：4 → 2 → 1 → 3 → 6 → 5 → 7
   
2. **中序遍歷（InOrder）**：左 → 中 → 右  
   - 遍歷順序：1 → 2 → 3 → 4 → 5 → 6 → 7
   - 對於**二元搜尋樹**，中序遍歷可得到**有序序列**
   
3. **後序遍歷（PostOrder）**：左 → 右 → 中
   - 遍歷順序：1 → 3 → 2 → 5 → 7 → 6 → 4

## 遍歷實作

### 1. 中序遍歷（InOrder Traversal）

中序遍歷在二元搜尋樹中特別有用，因為它會按**升序**訪問所有節點。

#### 遞歸實作

```java
public void inorderTraversal(TreeNode root) {
    if (root == null) return;
    
    inorderTraversal(root.left);   // 遍歷左子樹
    System.out.print(root.val + " "); // 處理根節點
    inorderTraversal(root.right);  // 遍歷右子樹
}
```

#### 迭代實作（使用堆疊）

```java
public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    TreeNode current = root;
    
    while (current != null || !stack.isEmpty()) {
        // 將所有左子節點推入堆疊
        while (current != null) {
            stack.push(current);
            current = current.left;
        }
        
        // 處理堆疊頂部節點
        current = stack.pop();
        result.add(current.val);
        
        // 移動到右子樹
        current = current.right;
    }
    
    return result;
}
```

### 2. 前序遍歷（PreOrder Traversal）

前序遍歷適用於**複製樹結構**或**建立表達式樹**等場景。

#### 遞歸實作

```java
public void preorderTraversal(TreeNode root) {
    if (root == null) return;
    
    System.out.print(root.val + " "); // 處理根節點
    preorderTraversal(root.left);   // 遍歷左子樹
    preorderTraversal(root.right);  // 遍歷右子樹
}
```

#### 迭代實作

```java
public List<Integer> preorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    
    Stack<TreeNode> stack = new Stack<>();
    stack.push(root);
    
    while (!stack.isEmpty()) {
        TreeNode current = stack.pop();
        result.add(current.val);
        
        // 注意：先推入右子節點，再推入左子節點
        // 這樣確保左子節點先被處理
        if (current.right != null) {
            stack.push(current.right);
        }
        if (current.left != null) {
            stack.push(current.left);
        }
    }
    
    return result;
}
```

### 3. 後序遍歷（PostOrder Traversal）

後序遍歷適用於**計算樹的大小**、**刪除節點**或**計算表達式值**等場景。

#### 遞歸實作

```java
public void postorderTraversal(TreeNode root) {
    if (root == null) return;
    
    postorderTraversal(root.left);  // 遍歷左子樹
    postorderTraversal(root.right); // 遍歷右子樹
    System.out.print(root.val + " "); // 處理根節點
}
```

#### 迭代實作

```java
public List<Integer> postorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    
    Stack<TreeNode> stack = new Stack<>();
    TreeNode lastVisited = null;
    TreeNode current = root;
    
    while (current != null || !stack.isEmpty()) {
        if (current != null) {
            stack.push(current);
            current = current.left;
        } else {
            TreeNode peekNode = stack.peek();
            // 如果右子節點存在且未被訪問過
            if (peekNode.right != null && lastVisited != peekNode.right) {
                current = peekNode.right;
            } else {
                result.add(peekNode.val);
                lastVisited = stack.pop();
            }
        }
    }
    
    return result;
}
```

## 實際應用：從遍歷序列重建二元樹

### 1. 從中序與後序遍歷重建二元樹

**LeetCode 106. Construct Binary Tree from Inorder and Postorder Traversal**

```java
public class Solution {
    public TreeNode buildTree(int[] inorder, int[] postorder) {
        if (inorder == null || inorder.length == 0 || 
            postorder == null || postorder.length == 0) {
            return null;
        }
        return helper(postorder, postorder.length - 1, inorder, 0, inorder.length - 1);
    }
    
    private TreeNode helper(int[] postorder, int postIndex, 
                           int[] inorder, int inStart, int inEnd) {
        if (inStart > inEnd || postIndex < 0) {
            return null;
        }
        
        // 後序遍歷的最後一個元素是根節點
        TreeNode root = new TreeNode(postorder[postIndex]);
        
        // 在中序遍歷中找到根節點的位置
        int rootIndex = 0;
        for (int i = inStart; i <= inEnd; i++) {
            if (inorder[i] == root.val) {
                rootIndex = i;
                break;
            }
        }
        
        // 遞歸建構左右子樹
        // 注意：先建構右子樹，因為後序遍歷是左-右-根
        root.right = helper(postorder, postIndex - 1, 
                           inorder, rootIndex + 1, inEnd);
        root.left = helper(postorder, postIndex - (inEnd - rootIndex + 1), 
                          inorder, inStart, rootIndex - 1);
        
        return root;
    }
}
```

### 2. 從前序與中序遍歷重建二元樹

**LeetCode 105. Construct Binary Tree from Preorder and Inorder Traversal**

```java
public class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        return helper(preorder, inorder, 0, 0, inorder.length - 1);
    }
    
    private TreeNode helper(int[] preorder, int[] inorder, 
                           int preStart, int inStart, int inEnd) {
        if (preStart > preorder.length - 1 || inStart > inEnd) {
            return null;
        }
        
        // 前序遍歷的第一個元素是根節點
        TreeNode root = new TreeNode(preorder[preStart]);
        
        // 在中序遍歷中找到根節點的位置
        int rootIndex = 0;
        for (int i = inStart; i <= inEnd; i++) {
            if (inorder[i] == preorder[preStart]) {
                rootIndex = i;
                break;
            }
        }
        
        // 遞歸建構左右子樹
        root.left = helper(preorder, inorder, preStart + 1, 
                          inStart, rootIndex - 1);
        root.right = helper(preorder, inorder, preStart + rootIndex - inStart + 1, 
                           rootIndex + 1, inEnd);
        
        return root;
    }
}
```

## 時間與空間複雜度

| 遍歷方式 | 時間複雜度 | 空間複雜度（遞歸） | 空間複雜度（迭代） |
|---------|-----------|-------------------|-------------------|
| 前序遍歷 | O(n) | O(h) | O(h) |
| 中序遍歷 | O(n) | O(h) | O(h) |
| 後序遍歷 | O(n) | O(h) | O(h) |

其中 `n` 是節點數量，`h` 是樹的高度（最壞情況下 h = n，最佳情況下 h = log n）。

## 應用場景總結

1. **前序遍歷**：複製樹、序列化樹結構、建立表達式樹
2. **中序遍歷**：二元搜尋樹的有序輸出、驗證二元搜尋樹
3. **後序遍歷**：計算樹的大小、刪除樹、計算表達式值、釋放記憶體

## 層序遍歷（BFS）

```java
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

## Morris 遍歷（O(1) 空間）

Morris 遍歷利用葉節點的空 right 指標儲存 predecessor，實現不用 stack 的中序遍歷：

```java
public List<Integer> inorderMorris(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    TreeNode curr = root;

    while (curr != null) {
        if (curr.left == null) {
            result.add(curr.val);
            curr = curr.right;
        } else {
            TreeNode pred = curr.left;
            while (pred.right != null && pred.right != curr) {
                pred = pred.right;
            }
            if (pred.right == null) {
                pred.right = curr;   // 建立 thread
                curr = curr.left;
            } else {
                pred.right = null;   // 恢復樹結構
                result.add(curr.val);
                curr = curr.right;
            }
        }
    }
    return result;
}
```

時間 O(n)，空間 O(1)（修改指標後恢復原始結構）。

## 遍歷方法比較

| 方法 | 時間 | 空間 | 適用場景 |
|------|------|------|---------|
| 遞迴 | O(n) | O(h) call stack | 程式碼簡潔，h = 樹高 |
| 迭代 + Stack | O(n) | O(h) | 避免 stack overflow（深樹） |
| Morris | O(n) | O(1) | 空間嚴格限制 |
| BFS | O(n) | O(w) | 層序、最短路（w = 最寬層） |

## 參考資料

- [LeetCode 94. Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)
- [LeetCode 144. Binary Tree Preorder Traversal](https://leetcode.com/problems/binary-tree-preorder-traversal/)
- [LeetCode 145. Binary Tree Postorder Traversal](https://leetcode.com/problems/binary-tree-postorder-traversal/)
- [演算法導論 - 二元樹的基本操作](https://mitpress.mit.edu/books/introduction-algorithms)