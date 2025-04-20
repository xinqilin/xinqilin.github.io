---
title: "TopologicalSort"
author: Bill.Lin
date: 2021-12-26T12:53:14+08:00
draft: false
tags: []
Description: ""
Categories: ["TopologicalSort", "Java"]
DisableComments: false
---


### 2115. Find All Possible Recipes from Given Supplies

<a href="https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/">Link Click Me</a>

### Example

```
Input: recipes = ["bread"], ingredients = [["yeast","flour"]], supplies = ["yeast","flour","corn"]
Output: ["bread"]
Explanation:
We can create "bread" since we have the ingredients "yeast" and "flour".

```

```
Input: recipes = ["bread","sandwich"], ingredients = [["yeast","flour"],["bread","meat"]], supplies = ["yeast","flour","meat"]
Output: ["bread","sandwich"]
Explanation:
We can create "bread" since we have the ingredients "yeast" and "flour".
We can create "sandwich" since we have the ingredient "meat" and can create the ingredient "bread".
```

```
Input: recipes = ["bread","sandwich","burger"], ingredients = [["yeast","flour"],["bread","meat"],["sandwich","meat","bread"]], supplies = ["yeast","flour","meat"]
Output: ["bread","sandwich","burger"]
Explanation:
We can create "bread" since we have the ingredients "yeast" and "flour".
We can create "sandwich" since we have the ingredient "meat" and can create the ingredient "bread".
We can create "burger" since we have the ingredient "meat" and can create the ingredients "bread" and "sandwich".
```


### Solution

```java
    private static final int NOT_VISITED = 0;
    private static final int VISITING = 1;
    private static final int VISITED = 2;
    
    public List<String> findAllRecipes(String[] recipes, List<List<String>> ingredients, String[] supplies) {
        Map<String, Integer> status = new HashMap<>();
        Map<String, List<String>> prereqs = new HashMap<>();
        
        for (int i = 0; i < recipes.length; ++ i) {
            status.put(recipes[i], NOT_VISITED);
            prereqs.put(recipes[i], ingredients.get(i));
        }
        
        for (String s: supplies) {
            status.put(s, VISITED);
        }
        
        List<String> output = new ArrayList<>();
        for (String s: recipes) {
            dfs (s, prereqs, status, output);
        }
        
        return output;
    }
    
    public boolean dfs(String s, Map<String, List<String>> prereqs, Map<String, Integer> status, List<String> output) {
        if (!status.containsKey(s)) {
            return false;
        }
        
        if (status.get(s) == VISITING) {
            return false;
        }
        
        if (status.get(s) == VISITED) {
            return true;
        }
        
        status.put(s, VISITING);
        for (String p: prereqs.get(s)) {
            if (!dfs(p, prereqs, status, output)) {
                return false;
            }
        }
        status.put(s, VISITED);
        output.add(s);
        
        return true;
    }
```
