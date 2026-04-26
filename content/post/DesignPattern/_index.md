---
title: "DesignPattern"
description: "GoF 23 種設計模式完整解析：Creational、Structural、Behavioral，含 Java 實作與 Spring 真實案例"
---

## 設計模式分類

### Creational（建立型，5 種）
| Pattern | 一句話 | 何時用 |
|---|---|---|
| [Singleton](singleton/) | 保證類別只有一個實例 | 共享資源（設定檔、連線池）；Spring Bean 預設即 Singleton |
| [Factory Method](factory/) | 子類別決定要建立哪種物件 | 需要延遲物件建立決策到子類別時 |
| [Abstract Factory](factory/) | 建立相關物件的家族 | 需要確保一組物件來自同一家族（跨平台 UI） |
| [Builder](builder/) | 逐步建構複雜物件 | 物件有多個可選參數（Lombok `@Builder` 即此模式） |
| [Prototype](prototype/) | 複製現有物件 | 建立成本高、需要快速取得相似物件 |

### Structural（結構型，7 種）
| Pattern | 一句話 | 何時用 |
|---|---|---|
| [Adapter](adapter/) | 讓不相容的介面能一起工作 | 整合第三方 SDK、Legacy API |
| [Bridge](bridge/) | 抽象與實作分離，各自獨立演化 | 避免「類別爆炸」（多維度變化） |
| [Composite](composite/) | 用樹狀結構表示部分與整體 | 檔案系統、組織結構、選單階層 |
| [Decorator](decorator/) | 動態為物件添加功能 | Spring AOP、Java I/O Stream |
| [Facade](facade/) | 提供複雜子系統的統一介面 | 簡化 API、API Gateway |
| [Flyweight](flyweight/) | 共享大量細粒度物件 | 大量相似物件（文字編輯器字元、遊戲粒子） |
| [Proxy](proxy/) | 為物件提供代理以控制存取 | Spring AOP（JDK Proxy / CGLIB）、Lazy Loading |

### Behavioral（行為型，10 種）
| Pattern | 一句話 | 何時用 |
|---|---|---|
| [Chain of Responsibility](chain-of-responsibility/) | 讓多個物件有機會處理請求 | 過濾鏈、Spring Security Filter |
| [Command](command/) | 將請求封裝成物件 | Undo/Redo、CQRS Command Bus |
| [Iterator](iterator/) | 逐一存取集合元素 | Java `Iterable`、Spring Data 分頁 |
| [Mediator](mediator/) | 用中介者協調物件互動 | Spring Events、MQ |
| [Memento](memento/) | 儲存與還原物件狀態 | Undo、草稿自動儲存 |
| [Observer](observer/) | 物件狀態改變時通知訂閱者 | Spring Events、Reactor、RxJava |
| [State](state/) | 根據狀態改變行為 | 訂單狀態機、工作流引擎 |
| [Strategy](strategy/) | 封裝演算法，讓它們可互換 | 排序策略、支付方式選擇 |
| [Template Method](template-method/) | 定義演算法骨架，子類別填充步驟 | Spring 各種 Template（JdbcTemplate） |
| [Visitor](visitor/) | 在不修改類別的情況下新增操作 | AST 處理、Bean Validation |
| [Interpreter](interpreter/) | 定義語言的文法並直譯 | Spring SpEL、規則引擎 |
