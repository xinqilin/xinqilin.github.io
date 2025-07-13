---
title: "回溯演算法（Backtracking）完整指南"
author: Bill.Lin
date: 2022-05-10T23:34:53+08:00
draft: false
tags: ["Algorithm", "Backtracking", "Recursion"]
Description: "深入探討回溯演算法的原理、實作技巧與經典題型解析"
Categories: ["Algorithm"]
DisableComments: false
---

## 概述

回溯演算法（Backtracking）是一種透過試錯來尋找問題解決方案的算法策略。它系統性地搜尋所有可能的候選解，當發現候選解不可能完成有效解時，會放棄該候選解並「回溯」到上一步。

## 基本原理

回溯演算法遵循三個核心步驟：

1. **選擇（Choose）**：從當前狀態的可選項中做出選擇
2. **探索（Explore）**：Recursion地探索這個選擇的後果
3. **撤銷（Un-choose）**：撤銷選擇，恢復到選擇前的狀態

### 演算法模板

```java
void backtrack(路徑, 選擇列表) {
    if (滿足結束條件) {
        result.add(路徑);
        return;
    }
    
    for (選擇 : 選擇列表) {
        做選擇;           // Choose
        backtrack(路徑, 選擇列表);  // Explore
        撤銷選擇;         // Un-choose
    }
}
```

### 時間複雜度

一般情況下，回溯演算法的時間複雜度為 **O(b^d)**，其中：
- `b` 是分支因子（每個節點的平均子節點數）
- `d` 是搜尋深度

## 經典應用題型

### 1. 子集問題（Subsets）

**問題描述**：給定一個整數陣列 `nums`，回傳該陣列所有可能的子集（冪集合）。

**解題思路**：
- 對於每個元素，我們都有「選擇」或「不選擇」兩種決策
- 使用回溯法遍歷所有可能的組合
- 每次Recursion都將當前路徑加入結果集

```java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(nums); // 排序便於處理
    backtrack(result, new ArrayList<>(), nums, 0);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, 
                      int[] nums, int startIndex) {
    // 每個狀態都是一個有效的子集
    result.add(new ArrayList<>(currentPath));
    
    // 從 startIndex 開始遍歷，避免重複組合
    for (int i = startIndex; i < nums.length; i++) {
        // 做選擇：將當前元素加入路徑
        currentPath.add(nums[i]);
        
        // Recursion探索：繼續選擇下一個元素
        backtrack(result, currentPath, nums, i + 1);
        
        // 撤銷選擇：移除當前元素，回溯
        currentPath.remove(currentPath.size() - 1);
    }
}
```

**時間複雜度**：O(2^n)，其中 n 是陣列長度，因為每個元素都有選或不選兩種狀態。

### 2. 子集問題 II（Subsets II - 含重複元素）

**問題描述**：給定一個可能包含重複整數的陣列 `nums`，回傳該陣列所有可能的子集（不包含重複的子集）。

**解題思路**：
- 基於子集問題的解法，但需要處理重複元素
- 先排序陣列，讓相同元素相鄰
- 透過跳過重複元素來避免產生重複的子集

```java
public List<List<Integer>> subsetsWithDup(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(nums); // 排序是關鍵，讓重複元素相鄰
    backtrack(result, new ArrayList<>(), nums, 0);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, 
                      int[] nums, int startIndex) {
    // 每個狀態都是一個有效的子集
    result.add(new ArrayList<>(currentPath));
    
    for (int i = startIndex; i < nums.length; i++) {
        // 跳過重複元素：當前元素與前一個元素相同，且不是起始位置
        if (i > startIndex && nums[i] == nums[i - 1]) {
            continue; // 跳過重複元素避免產生重複子集
        }
        
        // 做選擇
        currentPath.add(nums[i]);
        
        // Recursion探索
        backtrack(result, currentPath, nums, i + 1);
        
        // 撤銷選擇
        currentPath.remove(currentPath.size() - 1);
    }
}
```

**去重關鍵**：`i > startIndex && nums[i] == nums[i-1]` 這個條件確保在同一層Recursion中跳過重複元素。

### 3. 全排列（Permutations）

**問題描述**：給定一個不含重複數字的陣列 `nums`，回傳其所有可能的全排列。

**解題思路**：
- 全排列需要用到陣列中的每一個元素，且順序不同結果不同
- 使用 `contains` 檢查避免重複使用同一個元素
- 當路徑長度等於陣列長度時，找到一個完整的排列

```java
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(result, new ArrayList<>(), nums);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, int[] nums) {
    // 達到目標長度，找到一個完整的排列
    if (currentPath.size() == nums.length) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    // 嘗試添加每一個元素
    for (int i = 0; i < nums.length; i++) {
        // 跳過已經使用的元素
        if (currentPath.contains(nums[i])) {
            continue; // 該元素已在當前路徑中，跳過
        }
        
        // 做選擇
        currentPath.add(nums[i]);
        
        // Recursion探索
        backtrack(result, currentPath, nums);
        
        // 撤銷選擇
        currentPath.remove(currentPath.size() - 1);
    }
}
```

**效能優化**：使用 `boolean[] used` 陣列取代 `contains` 方法可以提升效能：

```java
private void backtrackOptimized(List<List<Integer>> result, List<Integer> currentPath, 
                               int[] nums, boolean[] used) {
    if (currentPath.size() == nums.length) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue; // O(1) 時間檢查
        
        used[i] = true;
        currentPath.add(nums[i]);
        backtrackOptimized(result, currentPath, nums, used);
        currentPath.remove(currentPath.size() - 1);
        used[i] = false;
    }
}
```

**時間複雜度**：O(n × n!)，其中 n! 是排列的數量，n 是複製每個排列所需的時間。

### 4. 全排列 II（Permutations II - 含重複元素）

**問題描述**：給定一個可包含重複數字的序列 `nums`，按任意順序回傳所有不重複的全排列。

**解題思路**：
- 在全排列的基礎上增加去重邏輯
- 先排序讓相同元素相鄰
- 使用剪枝條件避免產生重複的排列

```java
public List<List<Integer>> permuteUnique(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(nums); // 排序是去重的關鍵
    boolean[] used = new boolean[nums.length];
    backtrack(result, new ArrayList<>(), nums, used);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, 
                      int[] nums, boolean[] used) {
    // 達到目標長度，找到一個完整的排列
    if (currentPath.size() == nums.length) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    for (int i = 0; i < nums.length; i++) {
        // 跳過已使用的元素
        if (used[i]) continue;
        
        // 去重關鍵：跳過重複元素
        // 當前元素與前一個元素相同，且前一個元素未被使用
        if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) {
            continue;
        }
        
        // 做選擇
        used[i] = true;
        currentPath.add(nums[i]);
        
        // Recursion探索
        backtrack(result, currentPath, nums, used);
        
        // 撤銷選擇
        currentPath.remove(currentPath.size() - 1);
        used[i] = false;
    }
}
```

**去重原理**：`!used[i-1]` 確保在同一層Recursion中，相同的元素只會被選擇一次，從而避免重複排列。

### 5. 組合總和（Combination Sum - 可重複使用元素）

**問題描述**：給定一個無重複元素的陣列 `candidates` 和一個目標數 `target`，找出所有使元素和為 `target` 的組合。同一個數字可以被重複選擇。

**解題思路**：
- 每個元素都可以被無限次重複使用
- 使用 `startIndex` 避免產生重複組合（如 [2,3] 和 [3,2]）
- 當剩餘目標值為 0 時找到一個有效組合

```java
public List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(candidates); // 排序便於剪枝
    backtrack(result, new ArrayList<>(), candidates, target, 0);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, 
                      int[] candidates, int remainingTarget, int startIndex) {
    // 剪枝：剩餘目標值小於 0，無效路徑
    if (remainingTarget < 0) {
        return;
    }
    
    // 找到一個有效組合
    if (remainingTarget == 0) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    for (int i = startIndex; i < candidates.length; i++) {
        // 剪枝優化：如果當前元素已經大於剩餘目標值，後面的元素也會更大
        if (candidates[i] > remainingTarget) {
            break;
        }
        
        // 做選擇
        currentPath.add(candidates[i]);
        
        // Recursion探索：注意這裡傳入 i 而不是 i+1，因為可以重複使用同一元素
        backtrack(result, currentPath, candidates, remainingTarget - candidates[i], i);
        
        // 撤銷選擇
        currentPath.remove(currentPath.size() - 1);
    }
}
```

**關鍵點**：
- Recursion時傳入 `i` 而非 `i+1`，允許重複使用當前元素
- 排序後可以進行剪枝優化，提早終止無效分支

### 6. 組合總和 II（Combination Sum II - 含重複元素但不可重複使用）

**問題描述**：給定一個陣列 `candidates` 和一個目標數 `target`，找出所有使元素和為 `target` 的組合。陣列中每個元素只能使用一次，但陣列中可能包含重複元素。

**解題思路**：
- 每個元素只能使用一次，需要跳過重複元素避免重複組合
- 排序後使用去重邏輯
- Recursion時傳入 `i+1` 確保每個位置的元素只能使用一次

```java
public List<List<Integer>> combinationSum2(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(candidates); // 排序是去重的前提
    backtrack(result, new ArrayList<>(), candidates, target, 0);
    return result;
}

private void backtrack(List<List<Integer>> result, List<Integer> currentPath, 
                      int[] candidates, int remainingTarget, int startIndex) {
    // 剪枝：剩餘目標值小於 0
    if (remainingTarget < 0) {
        return;
    }
    
    // 找到一個有效組合
    if (remainingTarget == 0) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    for (int i = startIndex; i < candidates.length; i++) {
        // 跳過重複元素：避免在同一層Recursion中使用相同的元素
        if (i > startIndex && candidates[i] == candidates[i - 1]) {
            continue; // 跳過重複元素
        }
        
        // 剪枝優化
        if (candidates[i] > remainingTarget) {
            break;
        }
        
        // 做選擇
        currentPath.add(candidates[i]);
        
        // Recursion探索：傳入 i+1 確保每個元素只使用一次
        backtrack(result, currentPath, candidates, remainingTarget - candidates[i], i + 1);
        
        // 撤銷選擇
        currentPath.remove(currentPath.size() - 1);
    }
}
```

**與 Combination Sum 的差異**：
- Recursion時傳入 `i+1` 而非 `i`，每個元素只能使用一次
- 增加去重邏輯處理陣列中的重複元素


### 7. 回文字串分割（Palindrome Partitioning）

**問題描述**：給定一個字串 `s`，將 `s` 分割成一些子字串，使得每個子字串都是回文字串。回傳所有可能的分割方案。

**解題思路**：
- 透過回溯法嘗試所有可能的分割點
- 對於每個分割點，檢查子字串是否為回文
- 只有當子字串是回文時，才繼續Recursion分割

```java
public List<List<String>> partition(String s) {
    List<List<String>> result = new ArrayList<>();
    backtrack(result, new ArrayList<>(), s, 0);
    return result;
}

private void backtrack(List<List<String>> result, List<String> currentPath, 
                      String s, int startIndex) {
    // 達到字串結尾，找到一個完整的分割方案
    if (startIndex == s.length()) {
        result.add(new ArrayList<>(currentPath));
        return;
    }
    
    // 嘗試所有可能的分割點
    for (int endIndex = startIndex; endIndex < s.length(); endIndex++) {
        // 檢查當前子字串是否為回文
        if (isPalindrome(s, startIndex, endIndex)) {
            // 做選擇：將回文子字串加入路徑
            currentPath.add(s.substring(startIndex, endIndex + 1));
            
            // Recursion探索：繼續分割剩餘部分
            backtrack(result, currentPath, s, endIndex + 1);
            
            // 撤銷選擇
            currentPath.remove(currentPath.size() - 1);
        }
    }
}

/**
 * 檢查字串的指定範圍是否為回文
 */
private boolean isPalindrome(String s, int left, int right) {
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
```

**優化技巧**：可以預處理回文判斷結果，使用動態規劃建立回文查詢表：

```java
// 預處理優化版本
private boolean[][] precomputePalindromes(String s) {
    int n = s.length();
    boolean[][] isPalin = new boolean[n][n];
    
    // 單個字元都是回文
    for (int i = 0; i < n; i++) {
        isPalin[i][i] = true;
    }
    
    // 檢查長度為 2 的子字串
    for (int i = 0; i < n - 1; i++) {
        isPalin[i][i + 1] = (s.charAt(i) == s.charAt(i + 1));
    }
    
    // 檢查長度大於 2 的子字串
    for (int len = 3; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            isPalin[i][j] = (s.charAt(i) == s.charAt(j)) && isPalin[i + 1][j - 1];
        }
    }
    
    return isPalin;
}
```

## 最佳實踐與技巧

### 1. 剪枝優化
- **提早終止**：當發現當前路徑不可能產生有效解時，立即返回
- **排序優化**：對輸入進行排序，便於跳過重複元素和進行範圍剪枝
- **邊界檢查**：在Recursion前檢查邊界條件，避免無效Recursion

### 2. 去重技巧
回溯問題中的去重通常有兩種情況：
1. **樹枝去重**：避免在同一條路徑上重複使用同一個元素
2. **樹層去重**：避免在同一層Recursion中產生重複的選擇

```java
// 樹層去重（適用於有重複元素的組合問題）
if (i > startIndex && nums[i] == nums[i-1]) continue;

// 樹枝去重（適用於排列問題）
if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
```

### 3. 效能優化
- 使用 `boolean[]` 取代 `List.contains()` 進行元素查找
- 預處理計算結果（如回文判斷表）
- 合理選擇資料結構（如使用 `StringBuilder` 處理字串）

## 常見錯誤與陷阱

1. **忘記撤銷選擇**：這是回溯演算法最常見的錯誤
2. **重複解處理不當**：沒有正確實現去重邏輯
3. **邊界條件錯誤**：Recursion終止條件設置不正確
4. **索引使用錯誤**：在組合和排列問題中混淆 `i` 和 `i+1` 的使用

## 總結

回溯演算法是解決組合、排列、分割等問題的重要工具。掌握以下要點：

1. **理解模板**：Choose → Explore → Un-choose 三步驟
2. **識別問題類型**：子集、排列、組合、分割等不同類型有不同的處理方式
3. **掌握去重技巧**：樹層去重和樹枝去重的區別和應用
4. **善用剪枝**：透過剪枝大幅提升演算法效能
5. **細心實作**：注意邊界條件和索引使用

透過大量練習和理解這些經典題型，能夠幫助我們更好地掌握回溯演算法的精髓。
