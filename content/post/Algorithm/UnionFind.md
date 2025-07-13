---
title: "UnionFind"
author: Bill.Lin
date: 2022-09-26T22:15:44+08:00
draft: false
tags: ["Algorithm"]
Description: ""
Categories: ["Algorithm"]
DisableComments: false
---

# Union Find

### 990

[LC 990](990. Satisfiability of Equality Equations) <br>
滿足所有等式<br>
ex: <br>
&emsp;&emsp;a==b, b==a return true<br>
ex2: <br>
&emsp;&emsp;a!=b, b==a return false<br>
ex3:<br>
&emsp;&emsp;a==b, a==c, b!=c return false<br>

```java

    class Solution {
        private int[] groups = new int[26];
        public boolean equationsPossible(String[] equations) {
            for(int i = 0; i < 26; i++) {
                groups[i] = i;
            }
            for(String s : equations) {
                if(s.charAt(1) == '=') {
                    union(s.charAt(0), s.charAt(3));
                }
            }
            
            for(String s : equations) {
                if(s.charAt(1) == '!') {
                    if(find(s.charAt(0) - 'a') == find(s.charAt(3) - 'a')) return false;
                }
            }
            return true;
        }
        
        private void union(Character a, Character b) {
            groups[find(a -'a')] = groups[find(b - 'a')];
        }
        
        private int find(int x) {
            if(x == groups[x]) return x;
            return groups[x] = find(groups[x]);
        }
    }

```


### 2275

[LC 2275](2275. Largest Combination With Bitwise AND Greater Than Zero)



### Others 
547<br>
200<br>
684<br>
1319<br>
399<br>
952<br>

