---
title: "TreeTraversal"
author: Bill.Lin
date: 2021-11-21T20:11:03+08:00
draft: false
tags: []
Description: ""
Categories: ["Tree","InOrder","PostOrder"]
DisableComments: false
---


```

    4
   / \
  2   6
 / \ / \
1  3 5  7

```

inorder: 左 -> 中 -> 右
1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 

### PostOrder

左 -> 右 -> 中
1 -> 3 -> 2 -> 5 -> 7 -> 6 -> 4

```java
    class Solution {
    public TreeNode buildTree(int[] in, int[] post) {
        if (in == null || in.length == 0 || post == null || post.length == 0) { return null; }
        return helper(post, post.length - 1, in, 0, in.length - 1);
    }
    private TreeNode helper(int[] post, int idx, int[] in, int start, int end) {
        if (start > end || idx < 0) { return null; }
        TreeNode root = new TreeNode(post[idx]);
        int i;
        for (i = start; i <= end; i++) {
        if (in[i] == root.val) {
            break;
        }
        }
        root.left = helper(post, idx - (end - i  + 1), in, start, i - 1);
        root.right = helper(post, idx - 1, in, i + 1, end);
        
        return root;    
    }
    }
```


### PreOrder

中 -> 左 -> 右
4 -> 2 -> 1 -> 3 -> 6 -> 5 -> 7

```java
    public TreeNode buildTree(int[] preorder, int[] inorder) {
      return helper(preorder, inorder, 0, 0, inorder.length - 1);    
    }
    
    TreeNode helper(int[] preorder, int[] inorder, int ppos, int is, int ie){
      if(ppos > preorder.length - 1 || is > ie) return null;
      TreeNode node = new TreeNode(preorder[ppos]); 
      int pipos = 0;
      for(int i = is; i <= ie; i++){
        if(inorder[i] == preorder[ppos]) pipos = i;  
      }
      node.left = helper(preorder, inorder, ppos + 1, is, pipos - 1);
      node.right = helper(preorder, inorder, ppos + 1 + pipos - is, pipos + 1, ie);
      return node;
    }
```

