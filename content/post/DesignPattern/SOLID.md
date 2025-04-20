---
title: "SOLID"
author: Bill.Lin
date: 2021-07-08T21:20:39+08:00
draft: false
tags: []
Description: ""
Categories: ["DesignPattern"]
DisableComments: false
---

# SOLID

<table>
    <tr>
        <th>   首字母   </th>
        <th>   代表   </th>
        <th>     概念     </th>
    </tr>
    <tr>
        <td>   S   </td>
        <td>單一職責原則:   </td>
        <td>「物件應該僅具有一種單一功能」的概念。</td>
    </tr>
    <tr>
        <td>   O   </td>
        <td>開閉原則:   </td>
        <td>「軟體體應該是對於擴充開放的，但是對於修改封閉的」的概念</td>
    </tr>
    <tr>
        <td>   L   </td>
        <td>里氏替換原則:   </td>
        <td>「程式中的物件應該是可以在不改變程式正確性的前提下被它的子類所替換的」</td>
    </tr>
    <tr>
        <td>   I   </td>
        <td>介面隔離原則:   </td>
        <td>「多個特定客戶端介面要好於一個寬泛用途的介面」</td>
    </tr>
    <tr>
        <td>   D   </td>
        <td>依賴反轉原則   </td>
        <td>一個方法應該遵從「依賴於抽象而不是一個實例」的概念。依賴注入是該原則的一種實現方式。</td>
    </tr>
</table>


### SRP Single Responsibility Principle

```

A class should have only reason to change it
只能有一個理由去改變它，若有多個邏輯寫在一個method 中 不符合

```


- 複雜度降低
- 可讀性高
- 可維護姓提升
- 只有改這個才有影響
- 這個類別只做這件事
- 一個一個 component 不是他的事 他別碰
<br>

### Dependency inversion principle 依賴反轉

```

high-level should not depend on low-level module.
Both should depend on abstraction
中間應該以介面做連結

```

- 並行開發的穩定性
- 增加單元測試的可能 有interface 就能mock
<br>

### Liskov substitution principle 李式替換

```

sub-class should change super-class on no reason
子類可無條件更換父類

```

- 增加強健性

### Interface segregation principle 介面隔離原則

```

不同的事，應該用不同介面區隔，不應用一大包介面

```

- 介面越少，對系統的影響風險也少
- 當需求變更時，有更多靈活性

### Open-Close principle 開關原則

```

code should be open for extension , but close for modification

```

- code 比較不容易壞掉，因為沒去更改到

