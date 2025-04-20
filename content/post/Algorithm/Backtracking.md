---
title: "Backtracking"
author: Bill.Lin
date: 2022-05-10T23:34:53+08:00
draft: false
tags: ["Algorithm"]
Description: ""
Categories: ["Backtracking", "Algorithm"]
DisableComments: false
---

### Backtracking 複習大全

 - choose
 - explore
 - un-choose

##### Subsets

```java

    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> list = new ArrayList<>();
        Arrays.sort(nums);
        bt(list, new ArrayList<>(), nums, 0);
        return list;
    }

    private void bt(List<List<Integer>> list , List<Integer> tempList, int [] nums, int start){
        list.add(new ArrayList<>(tempList));
        for(int i = start; i < nums.length; i++){
            tempList.add(nums[i]);
            bt(list, tempList, nums, i + 1);
            tempList.remove(tempList.size() - 1);
        }
    }

```

##### Subsets II (可重複)

```java

    public List<List<Integer>> subsetsWithDup(int[] nums) {
        List<List<Integer>> list = new ArrayList<>();
        Arrays.sort(nums);
        bt(list, new ArrayList<>(), nums, 0);
        return list;
    }

    private void bt(List<List<Integer>> list, List<Integer> tempList, int [] nums, int start){
        list.add(new ArrayList<>(tempList));
        for(int i = start; i < nums.length; i++){
            if(i > start && nums[i] == nums[i-1]) continue; // skip duplicates
            tempList.add(nums[i]);
            bt(list, tempList, nums, i + 1);
            tempList.remove(tempList.size() - 1);
        }
    }

```

##### Permutations

```java

    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> list = new ArrayList<>();
        bt(list, new ArrayList<>(), nums);
        return list;
    }

    private void bt(List<List<Integer>> list, List<Integer> tempList, int [] nums){
        if(tempList.size() == nums.length){
            list.add(new ArrayList<>(tempList));
            return;
        
        for(int i = 0; i < nums.length; i++){ 
            if(tempList.contains(nums[i])) continue; // element already exists, skip
            tempList.add(nums[i]);
            bt(list, tempList, nums);
            tempList.remove(tempList.size() - 1);
        }
    } 

```

##### Permutations II (可重複)

```java

    class Solution {
    public List<List<Integer>> permuteUnique(int[] nums) {
        var ans = new ArrayList<List<Integer>>();
        Arrays.sort(nums);  // 重點！！！
        bt(ans, nums, 0, new ArrayList<Integer>(), new boolean[nums.length]);
        return ans;
    }
    
    void bt(List<List<Integer>> ans, int[] nums, int start, List<Integer> curr, boolean[] visited){
        if(start == nums.length){
            ans.add(new ArrayList<>(curr));
            return;
        }
        
        for(var i = 0; i < nums.length; i++){
            if(visited[i]) continue;
            if (i > 0 && nums[i] == nums[i - 1] && !visited[i - 1]) continue;
            
            visited[i] = true;
            curr.add(nums[i]);
            bt(ans, nums, start + 1, curr, visited);
            visited[i] = false;
            curr.remove(curr.size() - 1);
        }
    }
}

```

##### Combination Sum (可重複)

```java

    public List<List<Integer>> combinationSum(int[] nums, int target) {
        List<List<Integer>> list = new ArrayList<>();
        Arrays.sort(nums);
        backtrack(list, new ArrayList<>(), nums, target, 0);
        return list;
    }

    private void backtrack(List<List<Integer>> list, List<Integer> tempList, int [] nums, int remain, int start){
        if(remain < 0) return;
        else if(remain == 0) list.add(new ArrayList<>(tempList));
        else{ 
            for(int i = start; i < nums.length; i++){
                tempList.add(nums[i]);
                backtrack(list, tempList, nums, remain - nums[i], i); // not i + 1 because we can reuse same elements
                tempList.remove(tempList.size() - 1);
            }
        }
    }

```


##### Combination Sum II

```java

    public List<List<Integer>> combinationSum2(int[] nums, int target) {
        List<List<Integer>> list = new ArrayList<>();
        Arrays.sort(nums);
        backtrack(list, new ArrayList<>(), nums, target, 0);
        return list;
        
    }

    private void backtrack(List<List<Integer>> list, List<Integer> tempList, int [] nums, int remain, int start){
        if(remain < 0) return;
        else if(remain == 0) list.add(new ArrayList<>(tempList));
        else{
            for(int i = start; i < nums.length; i++){
                if(i > start && nums[i] == nums[i-1]) continue; // skip duplicates
                tempList.add(nums[i]);
                backtrack(list, tempList, nums, remain - nums[i], i + 1);
                tempList.remove(tempList.size() - 1); 
            }
        }
    } 

```


##### Palindrome Partitioning

```java

    public List<List<String>> partition(String s) {
        List<List<String>> list = new ArrayList<>();
        backtrack(list, new ArrayList<>(), s, 0);
        return list;
    }

    public void backtrack(List<List<String>> list, List<String> tempList, String s, int start){
        if(start == s.length())
            list.add(new ArrayList<>(tempList));
        else{
            for(int i = start; i < s.length(); i++){
                if(isPalindrome(s, start, i)){
                    tempList.add(s.substring(start, i + 1));
                    backtrack(list, tempList, s, i + 1);
                    tempList.remove(tempList.size() - 1);
                }
            }
        }
    }

    public boolean isPalindrome(String s, int low, int high){
        while(low < high)
            if(s.charAt(low++) != s.charAt(high--)) return false;
        return true;
    } 

```
