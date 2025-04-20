---
title: "GraphAccountMerge"
author: Bill.Lin
date: 2021-11-29T22:24:03+08:00
draft: false
tags: ["Algorithm"]
Description: ""
Categories: ["Algorithm"]
DisableComments: false
---

### `#721`

```
Input: accounts = 
[
    ["John","johnsmith@mail.com","john_newyork@mail.com"],
    ["John","johnsmith@mail.com","john00@mail.com"],
    ["Mary","mary@mail.com"],
    ["John","johnnybravo@mail.com"]
]

Output: 
[
    ["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],
    ["Mary","mary@mail.com"],
    ["John","johnnybravo@mail.com"]
]
Explanation:
The first and second John's are the same person as they have the common email "johnsmith@mail.com".
The third John and Mary are different people as none of their email addresses are used by other accounts.
We could return these lists in any order, for example the answer [['Mary', 'mary@mail.com'], ['John', 'johnnybravo@mail.com'], 
['John', 'john00@mail.com', 'john_newyork@mail.com', 'johnsmith@mail.com']] would still be accepted.

```


### Sol:

Graph + DFS
ref: <a href="https://leetcode.com/problems/accounts-merge/discuss/109158/Java-Solution-(Build-graph-%2B-DFS-search)">click me!</a>

```
Use these edges to build some components. Common email addresses are like the intersections that connect each single component for each account.
Because each component represents a merged account, do DFS search for each components and add into a list. Before add the name into this list, sort the emails. Then add name string into it.
Examples: Assume we have three accounts, we connect them like this in order to use DFS.
{Name, 1, 2, 3} => Name -- 1 -- 2 -- 3
{Name, 2, 4, 5} => Name -- 2 -- 4 -- 5 (The same graph node 2 appears)
{Name, 6, 7, 8} => Name -- 6 -- 7 -- 8
(Where numbers represent email addresses).

```

```java
class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
         List<List<String>> result = new ArrayList<>();
        if(accounts==null || accounts.size()==0)
            return result;
        
        Map<String, String> names = new HashMap<String, String>(); //email - username
        Map<String, Set<String>> map = new HashMap<String, Set<String>>(); //email - neighbors
        Set<String> emails = new HashSet<String>(); 
        
        for(List<String> list : accounts){
            String name = list.get(0);
            for(int i=1; i<list.size(); i++){
                String email = list.get(i);
                emails.add( email ); 
                names.put( email, name );
                map.putIfAbsent( email, new HashSet<String>() );
                
                if(i==1)
                    continue;
                
                //build the "edge" between two adjacent email-nodes
                map.get( list.get(i-1) ).add( email );
                map.get( email ).add( list.get(i-1) );
            }
        }
        
        Set<String> visited = new HashSet<String>();
        for(String s : emails)
            if( !visited.contains(s) ){
                visited.add(s);
                List<String> buffer = new ArrayList<String>();
                buffer.add(s);
                helper(s, map, visited, buffer);
                Collections.sort(buffer);
                buffer.add(0, names.get(s));
                result.add(buffer);
            }
        return result; 
    }
    
    private void helper(String s, Map<String, Set<String>> map, Set<String> visited, List<String> buffer){
        for(String node : map.get(s))
            if( !visited.contains(node) ){
                visited.add(node);
                buffer.add(node);
                helper(node, map, visited, buffer);
            }
    }
}

```

### BFS

```java
public List<List<String>> accountsMerge(List<List<String>> accounts) {
        HashMap<String,String> emailName = new HashMap<>();
        HashMap<String, List<String>> graph = new HashMap<>();
        for(List<String> account: accounts){
            String name = account.get(0);
            graph.putIfAbsent(account.get(1), new LinkedList<>());
            emailName.put(account.get(1), name);
            for(int i = 2; i < account.size(); i++){
                emailName.put(account.get(i), name);
                graph.putIfAbsent(account.get(i), new LinkedList<>());
                graph.get(account.get(i)).add(account.get(1));
                graph.get(account.get(1)).add(account.get(i));
            }
        }
        
        List<List<String>> res = new LinkedList<>();
        HashSet<String> visited = new HashSet<>();
        
        for(String email: graph.keySet()){
            if(visited.contains(email)) continue;
            visited.add(email);
            String name = emailName.get(email);
            List<String> emails = new LinkedList<>();
            Queue<String> queue = new LinkedList<>();
            queue.offer(email);
            while(!queue.isEmpty()){
                String cur = queue.poll();
                emails.add(cur);
                for(String next: graph.get(cur)){
                    if(!visited.contains(next)){
                        queue.offer(next);
                        visited.add(next);
                    }
                }
            }
            Collections.sort(emails);
            emails.add(0,name);
            res.add(emails);
        }
        return res;
    }
```
