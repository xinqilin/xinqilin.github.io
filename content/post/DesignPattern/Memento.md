---
title: "DesignPattern - Behavioral - Memento"
author: Bill.Lin
date: 2018-08-07T22:39:01+08:00
draft: false
tags: ["Design Pattern", "Behavioral Pattern", "Memento", "State Management", "Command Pattern", "Spring Boot Audit"]
Description: "深入探討 Memento 模式：從基本實現到企業級應用，包含命令模式整合、Spring Boot 審計、企業狀態管理等現代化實現"
Categories: ["DesignPattern"]
DisableComments: false
---

# Memento 模式 - 企業級狀態管理與審計系統

## 模式概述

Memento（備忘錄）模式是一種行為型設計模式，用於在不破壞對象封裝的前提下，捕獲並外部化一個對象的內部狀態，以便之後可以將該對象恢復到這個狀態。該模式通過三個核心角色實現：原發器（Originator）、備忘錄（Memento）和管理者（Caretaker）。

### 核心概念

**原發器（Originator）**：
- 創建包含當前狀態快照的備忘錄
- 使用備忘錄恢復其內部狀態
- 負責狀態的創建和恢復邏輯

**備忘錄（Memento）**：
- 儲存原發器的內部狀態
- 防止原發器以外的對象訪問備忘錄
- 提供必要的介面給原發器存取狀態

**管理者（Caretaker）**：
- 負責保存備忘錄，但不檢查備忘錄的內容
- 管理備忘錄的生命週期和存取
- 提供撤銷/重做等操作介面

## 使用場景

### 適用條件
- 需要保存和恢復對象狀態
- 直接訪問對象狀態會暴露實現細節
- 需要提供撤銷/重做功能
- 需要實現檢查點和回滾機制

### 實際應用場景
- 文本編輯器的撤銷/重做功能
- 遊戲中的存檔和讀檔
- 資料庫事務回滾
- 企業系統的狀態審計
- 工作流程的狀態管理

## 基本實現

### 1. 備忘錄介面

```java
/**
 * 備忘錄介面定義了訪問備忘錄狀態的契約
 */
public interface Memento {
    /**
     * 獲取備忘錄的創建時間
     * @return 創建時間
     */
    LocalDateTime getTimestamp();
    
    /**
     * 獲取備忘錄的描述
     * @return 描述信息
     */
    String getDescription();
    
    /**
     * 獲取備忘錄的唯一標識
     * @return 備忘錄ID
     */
    String getId();
}
```

### 2. 原發器實現

```java
/**
 * 文檔原發器 - 管理文檔狀態
 */
public class DocumentOriginator {
    private String title;
    private String content;
    private String author;
    private LocalDateTime lastModified;
    private Map<String, Object> metadata;
    
    public DocumentOriginator(String title, String content, String author) {
        this.title = title;
        this.content = content;
        this.author = author;
        this.lastModified = LocalDateTime.now();
        this.metadata = new HashMap<>();
    }
    
    /**
     * 創建備忘錄
     * @param description 備忘錄描述
     * @return 備忘錄對象
     */
    public Memento createMemento(String description) {
        return new DocumentMemento(
            title, content, author, lastModified, 
            new HashMap<>(metadata), description
        );
    }
    
    /**
     * 從備忘錄恢復狀態
     * @param memento 備忘錄對象
     */
    public void restoreFromMemento(Memento memento) {
        if (memento instanceof DocumentMemento documentMemento) {
            this.title = documentMemento.getTitle();
            this.content = documentMemento.getContent();
            this.author = documentMemento.getAuthor();
            this.lastModified = documentMemento.getLastModified();
            this.metadata = new HashMap<>(documentMemento.getMetadata());
        }
    }
    
    /**
     * 更新文檔內容
     * @param newContent 新內容
     */
    public void updateContent(String newContent) {
        this.content = newContent;
        this.lastModified = LocalDateTime.now();
    }
    
    /**
     * 更新標題
     * @param newTitle 新標題
     */
    public void updateTitle(String newTitle) {
        this.title = newTitle;
        this.lastModified = LocalDateTime.now();
    }
    
    /**
     * 添加元數據
     * @param key 鍵
     * @param value 值
     */
    public void addMetadata(String key, Object value) {
        this.metadata.put(key, value);
        this.lastModified = LocalDateTime.now();
    }
    
    // Getters
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getAuthor() { return author; }
    public LocalDateTime getLastModified() { return lastModified; }
    public Map<String, Object> getMetadata() { return new HashMap<>(metadata); }
    
    @Override
    public String toString() {
        return String.format("Document[title=%s, author=%s, lastModified=%s, contentLength=%d]",
                           title, author, lastModified, content.length());
    }
    
    /**
     * 內部備忘錄類 - 僅原發器可訪問
     */
    private static class DocumentMemento implements Memento {
        private final String title;
        private final String content;
        private final String author;
        private final LocalDateTime lastModified;
        private final Map<String, Object> metadata;
        private final String description;
        private final LocalDateTime timestamp;
        private final String id;
        
        public DocumentMemento(String title, String content, String author, 
                             LocalDateTime lastModified, Map<String, Object> metadata,
                             String description) {
            this.title = title;
            this.content = content;
            this.author = author;
            this.lastModified = lastModified;
            this.metadata = metadata;
            this.description = description;
            this.timestamp = LocalDateTime.now();
            this.id = UUID.randomUUID().toString();
        }
        
        @Override
        public LocalDateTime getTimestamp() { return timestamp; }
        
        @Override
        public String getDescription() { return description; }
        
        @Override
        public String getId() { return id; }
        
        // Package-private getters for DocumentOriginator
        String getTitle() { return title; }
        String getContent() { return content; }
        String getAuthor() { return author; }
        LocalDateTime getLastModified() { return lastModified; }
        Map<String, Object> getMetadata() { return metadata; }
    }
}
```

### 3. 管理者實現

```java
/**
 * 備忘錄管理者 - 管理備忘錄的生命週期
 */
public class MementoCaretaker {
    private final Deque<Memento> mementos = new ArrayDeque<>();
    private final Deque<Memento> redoStack = new ArrayDeque<>();
    private final int maxHistorySize;
    private final AtomicLong operationCount = new AtomicLong(0);
    
    public MementoCaretaker(int maxHistorySize) {
        this.maxHistorySize = maxHistorySize;
    }
    
    /**
     * 保存備忘錄
     * @param memento 備忘錄對象
     */
    public void saveMemento(Memento memento) {
        // 清空重做堆疊
        redoStack.clear();
        
        // 添加到歷史記錄
        mementos.addLast(memento);
        operationCount.incrementAndGet();
        
        // 限制歷史記錄大小
        if (mementos.size() > maxHistorySize) {
            mementos.removeFirst();
        }
        
        System.out.println("備忘錄已保存: " + memento.getDescription() + 
                          " (ID: " + memento.getId() + ")");
    }
    
    /**
     * 獲取最近的備忘錄（撤銷）
     * @return 備忘錄對象或null
     */
    public Memento getLastMemento() {
        if (mementos.isEmpty()) {
            return null;
        }
        
        Memento memento = mementos.removeLast();
        redoStack.addLast(memento);
        
        System.out.println("撤銷到備忘錄: " + memento.getDescription() + 
                          " (ID: " + memento.getId() + ")");
        return memento;
    }
    
    /**
     * 重做操作
     * @return 備忘錄對象或null
     */
    public Memento getRedoMemento() {
        if (redoStack.isEmpty()) {
            return null;
        }
        
        Memento memento = redoStack.removeLast();
        mementos.addLast(memento);
        
        System.out.println("重做到備忘錄: " + memento.getDescription() + 
                          " (ID: " + memento.getId() + ")");
        return memento;
    }
    
    /**
     * 檢查是否可以撤銷
     * @return 是否可以撤銷
     */
    public boolean canUndo() {
        return !mementos.isEmpty();
    }
    
    /**
     * 檢查是否可以重做
     * @return 是否可以重做
     */
    public boolean canRedo() {
        return !redoStack.isEmpty();
    }
    
    /**
     * 獲取歷史記錄
     * @return 歷史記錄列表
     */
    public List<Memento> getHistory() {
        return new ArrayList<>(mementos);
    }
    
    /**
     * 清空歷史記錄
     */
    public void clearHistory() {
        mementos.clear();
        redoStack.clear();
        operationCount.set(0);
        System.out.println("歷史記錄已清空");
    }
    
    /**
     * 獲取統計信息
     * @return 統計信息
     */
    public MementoStatistics getStatistics() {
        return new MementoStatistics(
            mementos.size(),
            redoStack.size(),
            operationCount.get(),
            maxHistorySize
        );
    }
    
    /**
     * 備忘錄統計信息
     */
    public static class MementoStatistics {
        private final int undoCount;
        private final int redoCount;
        private final long totalOperations;
        private final int maxHistorySize;
        
        public MementoStatistics(int undoCount, int redoCount, long totalOperations, int maxHistorySize) {
            this.undoCount = undoCount;
            this.redoCount = redoCount;
            this.totalOperations = totalOperations;
            this.maxHistorySize = maxHistorySize;
        }
        
        public int getUndoCount() { return undoCount; }
        public int getRedoCount() { return redoCount; }
        public long getTotalOperations() { return totalOperations; }
        public int getMaxHistorySize() { return maxHistorySize; }
        
        @Override
        public String toString() {
            return String.format("Statistics[undo=%d, redo=%d, total=%d, max=%d]",
                               undoCount, redoCount, totalOperations, maxHistorySize);
        }
    }
}
```

### 4. 使用示例

```java
/**
 * 備忘錄模式使用示例
 */
public class MementoExample {
    
    public static void main(String[] args) {
        // 創建文檔和管理者
        DocumentOriginator document = new DocumentOriginator("設計模式", "這是一個關於設計模式的文檔。", "Bill");
        MementoCaretaker caretaker = new MementoCaretaker(10);
        
        // 保存初始狀態
        caretaker.saveMemento(document.createMemento("初始版本"));
        
        System.out.println("=== 初始狀態 ===");
        System.out.println(document);
        
        // 第一次修改
        document.updateContent("這是一個關於設計模式的文檔。\n\n1. 創建型模式\n2. 結構型模式\n3. 行為型模式");
        caretaker.saveMemento(document.createMemento("添加模式分類"));
        
        System.out.println("\n=== 第一次修改後 ===");
        System.out.println(document);
        
        // 第二次修改
        document.updateTitle("GoF 設計模式詳解");
        document.addMetadata("category", "技術文檔");
        document.addMetadata("version", "1.0");
        caretaker.saveMemento(document.createMemento("更新標題和元數據"));
        
        System.out.println("\n=== 第二次修改後 ===");
        System.out.println(document);
        System.out.println("元數據: " + document.getMetadata());
        
        // 撤銷操作
        System.out.println("\n=== 撤銷操作 ===");
        if (caretaker.canUndo()) {
            document.restoreFromMemento(caretaker.getLastMemento());
            System.out.println("撤銷後: " + document);
        }
        
        if (caretaker.canUndo()) {
            document.restoreFromMemento(caretaker.getLastMemento());
            System.out.println("再次撤銷後: " + document);
        }
        
        // 重做操作
        System.out.println("\n=== 重做操作 ===");
        if (caretaker.canRedo()) {
            document.restoreFromMemento(caretaker.getRedoMemento());
            System.out.println("重做後: " + document);
        }
        
        // 顯示統計信息
        System.out.println("\n=== 統計信息 ===");
        System.out.println(caretaker.getStatistics());
        
        // 顯示歷史記錄
        System.out.println("\n=== 歷史記錄 ===");
        caretaker.getHistory().forEach(memento -> 
            System.out.println("- " + memento.getDescription() + " (" + memento.getTimestamp() + ")")
        );
    }
}
```

## 命令模式整合

### 1. 可撤銷命令介面

```java
/**
 * 可撤銷命令介面
 */
public interface UndoableCommand {
    /**
     * 執行命令
     */
    void execute();
    
    /**
     * 撤銷命令
     */
    void undo();
    
    /**
     * 重做命令
     */
    void redo();
    
    /**
     * 獲取命令描述
     * @return 命令描述
     */
    String getDescription();
    
    /**
     * 獲取命令ID
     * @return 命令ID
     */
    String getId();
    
    /**
     * 獲取執行時間
     * @return 執行時間
     */
    LocalDateTime getExecutionTime();
}
```

### 2. 抽象命令實現

```java
/**
 * 抽象可撤銷命令
 */
public abstract class AbstractUndoableCommand implements UndoableCommand {
    protected final String id;
    protected final String description;
    protected final LocalDateTime executionTime;
    protected boolean executed = false;
    
    public AbstractUndoableCommand(String description) {
        this.id = UUID.randomUUID().toString();
        this.description = description;
        this.executionTime = LocalDateTime.now();
    }
    
    @Override
    public final void execute() {
        if (!executed) {
            doExecute();
            executed = true;
        }
    }
    
    @Override
    public final void undo() {
        if (executed) {
            doUndo();
            executed = false;
        }
    }
    
    @Override
    public final void redo() {
        if (!executed) {
            doRedo();
            executed = true;
        }
    }
    
    protected abstract void doExecute();
    protected abstract void doUndo();
    protected abstract void doRedo();
    
    @Override
    public String getDescription() { return description; }
    
    @Override
    public String getId() { return id; }
    
    @Override
    public LocalDateTime getExecutionTime() { return executionTime; }
}
```

### 3. 文檔命令實現

```java
/**
 * 更新內容命令
 */
public class UpdateContentCommand extends AbstractUndoableCommand {
    private final DocumentOriginator document;
    private final String newContent;
    private final MementoCaretaker caretaker;
    private Memento backupMemento;
    
    public UpdateContentCommand(DocumentOriginator document, String newContent, 
                               MementoCaretaker caretaker) {
        super("更新內容: " + newContent.substring(0, Math.min(50, newContent.length())));
        this.document = document;
        this.newContent = newContent;
        this.caretaker = caretaker;
    }
    
    @Override
    protected void doExecute() {
        // 創建備份
        backupMemento = document.createMemento("更新內容前的備份");
        
        // 執行更新
        document.updateContent(newContent);
        
        // 保存新狀態
        caretaker.saveMemento(document.createMemento(getDescription()));
        
        System.out.println("執行命令: " + getDescription());
    }
    
    @Override
    protected void doUndo() {
        // 恢復到備份狀態
        if (backupMemento != null) {
            document.restoreFromMemento(backupMemento);
            System.out.println("撤銷命令: " + getDescription());
        }
    }
    
    @Override
    protected void doRedo() {
        // 重新執行
        document.updateContent(newContent);
        System.out.println("重做命令: " + getDescription());
    }
}

/**
 * 更新標題命令
 */
public class UpdateTitleCommand extends AbstractUndoableCommand {
    private final DocumentOriginator document;
    private final String newTitle;
    private final MementoCaretaker caretaker;
    private Memento backupMemento;
    
    public UpdateTitleCommand(DocumentOriginator document, String newTitle, 
                             MementoCaretaker caretaker) {
        super("更新標題: " + newTitle);
        this.document = document;
        this.newTitle = newTitle;
        this.caretaker = caretaker;
    }
    
    @Override
    protected void doExecute() {
        backupMemento = document.createMemento("更新標題前的備份");
        document.updateTitle(newTitle);
        caretaker.saveMemento(document.createMemento(getDescription()));
        System.out.println("執行命令: " + getDescription());
    }
    
    @Override
    protected void doUndo() {
        if (backupMemento != null) {
            document.restoreFromMemento(backupMemento);
            System.out.println("撤銷命令: " + getDescription());
        }
    }
    
    @Override
    protected void doRedo() {
        document.updateTitle(newTitle);
        System.out.println("重做命令: " + getDescription());
    }
}

/**
 * 添加元數據命令
 */
public class AddMetadataCommand extends AbstractUndoableCommand {
    private final DocumentOriginator document;
    private final String key;
    private final Object value;
    private final MementoCaretaker caretaker;
    private Memento backupMemento;
    
    public AddMetadataCommand(DocumentOriginator document, String key, Object value, 
                             MementoCaretaker caretaker) {
        super("添加元數據: " + key + " = " + value);
        this.document = document;
        this.key = key;
        this.value = value;
        this.caretaker = caretaker;
    }
    
    @Override
    protected void doExecute() {
        backupMemento = document.createMemento("添加元數據前的備份");
        document.addMetadata(key, value);
        caretaker.saveMemento(document.createMemento(getDescription()));
        System.out.println("執行命令: " + getDescription());
    }
    
    @Override
    protected void doUndo() {
        if (backupMemento != null) {
            document.restoreFromMemento(backupMemento);
            System.out.println("撤銷命令: " + getDescription());
        }
    }
    
    @Override
    protected void doRedo() {
        document.addMetadata(key, value);
        System.out.println("重做命令: " + getDescription());
    }
}
```

### 4. 命令調度器

```java
/**
 * 命令調度器 - 整合命令模式和備忘錄模式
 */
public class CommandInvoker {
    private final Deque<UndoableCommand> commandHistory = new ArrayDeque<>();
    private final Deque<UndoableCommand> redoStack = new ArrayDeque<>();
    private final int maxHistorySize;
    private final AtomicLong commandCount = new AtomicLong(0);
    
    public CommandInvoker(int maxHistorySize) {
        this.maxHistorySize = maxHistorySize;
    }
    
    /**
     * 執行命令
     * @param command 命令對象
     */
    public void executeCommand(UndoableCommand command) {
        // 執行命令
        command.execute();
        
        // 清空重做堆疊
        redoStack.clear();
        
        // 添加到歷史記錄
        commandHistory.addLast(command);
        commandCount.incrementAndGet();
        
        // 限制歷史記錄大小
        if (commandHistory.size() > maxHistorySize) {
            commandHistory.removeFirst();
        }
        
        System.out.println("命令已執行: " + command.getDescription());
    }
    
    /**
     * 撤銷最後一個命令
     */
    public void undoLastCommand() {
        if (commandHistory.isEmpty()) {
            System.out.println("沒有可撤銷的命令");
            return;
        }
        
        UndoableCommand command = commandHistory.removeLast();
        command.undo();
        redoStack.addLast(command);
        
        System.out.println("命令已撤銷: " + command.getDescription());
    }
    
    /**
     * 重做最後一個撤銷的命令
     */
    public void redoLastCommand() {
        if (redoStack.isEmpty()) {
            System.out.println("沒有可重做的命令");
            return;
        }
        
        UndoableCommand command = redoStack.removeLast();
        command.redo();
        commandHistory.addLast(command);
        
        System.out.println("命令已重做: " + command.getDescription());
    }
    
    /**
     * 檢查是否可以撤銷
     * @return 是否可以撤銷
     */
    public boolean canUndo() {
        return !commandHistory.isEmpty();
    }
    
    /**
     * 檢查是否可以重做
     * @return 是否可以重做
     */
    public boolean canRedo() {
        return !redoStack.isEmpty();
    }
    
    /**
     * 獲取命令歷史記錄
     * @return 命令歷史記錄
     */
    public List<UndoableCommand> getCommandHistory() {
        return new ArrayList<>(commandHistory);
    }
    
    /**
     * 清空命令歷史記錄
     */
    public void clearHistory() {
        commandHistory.clear();
        redoStack.clear();
        commandCount.set(0);
        System.out.println("命令歷史記錄已清空");
    }
    
    /**
     * 獲取統計信息
     * @return 統計信息
     */
    public CommandStatistics getStatistics() {
        return new CommandStatistics(
            commandHistory.size(),
            redoStack.size(),
            commandCount.get(),
            maxHistorySize
        );
    }
    
    /**
     * 命令統計信息
     */
    public static class CommandStatistics {
        private final int undoCount;
        private final int redoCount;
        private final long totalCommands;
        private final int maxHistorySize;
        
        public CommandStatistics(int undoCount, int redoCount, long totalCommands, int maxHistorySize) {
            this.undoCount = undoCount;
            this.redoCount = redoCount;
            this.totalCommands = totalCommands;
            this.maxHistorySize = maxHistorySize;
        }
        
        public int getUndoCount() { return undoCount; }
        public int getRedoCount() { return redoCount; }
        public long getTotalCommands() { return totalCommands; }
        public int getMaxHistorySize() { return maxHistorySize; }
        
        @Override
        public String toString() {
            return String.format("CommandStats[undo=%d, redo=%d, total=%d, max=%d]",
                               undoCount, redoCount, totalCommands, maxHistorySize);
        }
    }
}
```

### 5. 整合示例

```java
/**
 * 命令模式與備忘錄模式整合示例
 */
public class CommandMementoExample {
    
    public static void main(String[] args) {
        // 創建文檔和管理者
        DocumentOriginator document = new DocumentOriginator("新文檔", "空白內容", "Admin");
        MementoCaretaker caretaker = new MementoCaretaker(10);
        CommandInvoker invoker = new CommandInvoker(10);
        
        // 保存初始狀態
        caretaker.saveMemento(document.createMemento("初始狀態"));
        
        System.out.println("=== 初始狀態 ===");
        System.out.println(document);
        
        // 執行一系列命令
        System.out.println("\n=== 執行命令 ===");
        
        // 更新標題
        invoker.executeCommand(new UpdateTitleCommand(document, "設計模式學習筆記", caretaker));
        System.out.println("更新標題後: " + document);
        
        // 更新內容
        invoker.executeCommand(new UpdateContentCommand(document, 
            "# 設計模式學習筆記\n\n## 創建型模式\n- 工廠模式\n- 建造者模式\n- 原型模式", caretaker));
        System.out.println("更新內容後: " + document);
        
        // 添加元數據
        invoker.executeCommand(new AddMetadataCommand(document, "category", "學習筆記", caretaker));
        invoker.executeCommand(new AddMetadataCommand(document, "priority", "高", caretaker));
        System.out.println("添加元數據後: " + document);
        System.out.println("元數據: " + document.getMetadata());
        
        // 撤銷操作
        System.out.println("\n=== 撤銷操作 ===");
        invoker.undoLastCommand();
        System.out.println("撤銷後: " + document);
        System.out.println("元數據: " + document.getMetadata());
        
        invoker.undoLastCommand();
        System.out.println("再次撤銷後: " + document);
        System.out.println("元數據: " + document.getMetadata());
        
        // 重做操作
        System.out.println("\n=== 重做操作 ===");
        invoker.redoLastCommand();
        System.out.println("重做後: " + document);
        System.out.println("元數據: " + document.getMetadata());
        
        // 顯示統計信息
        System.out.println("\n=== 統計信息 ===");
        System.out.println("命令統計: " + invoker.getStatistics());
        System.out.println("備忘錄統計: " + caretaker.getStatistics());
        
        // 顯示命令歷史記錄
        System.out.println("\n=== 命令歷史記錄 ===");
        invoker.getCommandHistory().forEach(command -> 
            System.out.println("- " + command.getDescription() + " (" + command.getExecutionTime() + ")")
        );
    }
}
```

## Spring Boot 審計系統

### 1. 審計實體模型

```java
/**
 * 審計實體基類
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;
    
    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;
    
    @LastModifiedBy
    @Column(name = "modified_by")
    private String modifiedBy;
    
    @Version
    private Long version;
    
    // Getters and setters
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getModifiedAt() { return modifiedAt; }
    public void setModifiedAt(LocalDateTime modifiedAt) { this.modifiedAt = modifiedAt; }
    
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    
    public String getModifiedBy() { return modifiedBy; }
    public void setModifiedBy(String modifiedBy) { this.modifiedBy = modifiedBy; }
    
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}

/**
 * 審計事件實體
 */
@Entity
@Table(name = "audit_events")
public class AuditEvent extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "event_type", nullable = false)
    private String eventType;
    
    @Column(name = "entity_type", nullable = false)
    private String entityType;
    
    @Column(name = "entity_id", nullable = false)
    private String entityId;
    
    @Column(name = "user_id")
    private String userId;
    
    @Column(name = "session_id")
    private String sessionId;
    
    @Column(name = "old_values", columnDefinition = "TEXT")
    private String oldValues;
    
    @Column(name = "new_values", columnDefinition = "TEXT")
    private String newValues;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(name = "user_agent")
    private String userAgent;
    
    // Constructors
    public AuditEvent() {}
    
    public AuditEvent(String eventType, String entityType, String entityId,
                     String userId, String description) {
        this.eventType = eventType;
        this.entityType = entityType;
        this.entityId = entityId;
        this.userId = userId;
        this.description = description;
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getOldValues() { return oldValues; }
    public void setOldValues(String oldValues) { this.oldValues = oldValues; }
    
    public String getNewValues() { return newValues; }
    public void setNewValues(String newValues) { this.newValues = newValues; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
}
```

### 2. Spring Boot 審計配置

```java
/**
 * 審計配置類
 */
@Configuration
@EnableJpaAuditing
public class AuditConfig {
    
    @Bean
    public AuditorAware<String> auditorProvider() {
        return new SpringSecurityAuditorAware();
    }
    
    @Bean
    public ObjectMapper auditObjectMapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
    
    /**
     * Spring Security 審計提供者
     */
    public static class SpringSecurityAuditorAware implements AuditorAware<String> {
        
        @Override
        public Optional<String> getCurrentAuditor() {
            return Optional.ofNullable(SecurityContextHolder.getContext())
                          .map(SecurityContext::getAuthentication)
                          .filter(Authentication::isAuthenticated)
                          .map(Authentication::getName);
        }
    }
}
```

### 3. 審計服務實現

```java
/**
 * 審計服務接口
 */
public interface AuditService {
    void logEvent(String eventType, String entityType, String entityId, 
                  Object oldValues, Object newValues, String description);
    
    void logStateChange(String entityType, String entityId, 
                       Memento oldState, Memento newState, String description);
    
    List<AuditEvent> getAuditTrail(String entityType, String entityId);
    
    List<AuditEvent> getAuditTrail(String entityType, String entityId, 
                                  LocalDateTime startTime, LocalDateTime endTime);
    
    void archiveOldAuditEvents(int daysToKeep);
}

/**
 * 審計服務實現
 */
@Service
@Transactional
public class AuditServiceImpl implements AuditService {
    
    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;
    private final HttpServletRequest request;
    
    public AuditServiceImpl(AuditEventRepository auditEventRepository,
                           ObjectMapper objectMapper,
                           @Autowired(required = false) HttpServletRequest request) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
        this.request = request;
    }
    
    @Override
    public void logEvent(String eventType, String entityType, String entityId,
                        Object oldValues, Object newValues, String description) {
        try {
            AuditEvent auditEvent = new AuditEvent(eventType, entityType, entityId,
                                                  getCurrentUserId(), description);
            
            // 序列化舊值和新值
            if (oldValues != null) {
                auditEvent.setOldValues(objectMapper.writeValueAsString(oldValues));
            }
            if (newValues != null) {
                auditEvent.setNewValues(objectMapper.writeValueAsString(newValues));
            }
            
            // 設置會話信息
            if (request != null) {
                auditEvent.setSessionId(request.getSession().getId());
                auditEvent.setIpAddress(getClientIpAddress());
                auditEvent.setUserAgent(request.getHeader("User-Agent"));
            }
            
            auditEventRepository.save(auditEvent);
            
        } catch (Exception e) {
            // 記錄審計失敗不應影響業務流程
            System.err.println("審計記錄失敗: " + e.getMessage());
        }
    }
    
    @Override
    public void logStateChange(String entityType, String entityId,
                              Memento oldState, Memento newState, String description) {
        Map<String, Object> oldValues = null;
        Map<String, Object> newValues = null;
        
        if (oldState != null) {
            oldValues = Map.of(
                "id", oldState.getId(),
                "timestamp", oldState.getTimestamp(),
                "description", oldState.getDescription()
            );
        }
        
        if (newState != null) {
            newValues = Map.of(
                "id", newState.getId(),
                "timestamp", newState.getTimestamp(),
                "description", newState.getDescription()
            );
        }
        
        logEvent("STATE_CHANGE", entityType, entityId, oldValues, newValues, description);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<AuditEvent> getAuditTrail(String entityType, String entityId) {
        return auditEventRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
            entityType, entityId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<AuditEvent> getAuditTrail(String entityType, String entityId,
                                         LocalDateTime startTime, LocalDateTime endTime) {
        return auditEventRepository.findByEntityTypeAndEntityIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            entityType, entityId, startTime, endTime);
    }
    
    @Override
    public void archiveOldAuditEvents(int daysToKeep) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        int deletedCount = auditEventRepository.deleteByCreatedAtBefore(cutoffDate);
        System.out.println("已刪除 " + deletedCount + " 條過期審計記錄");
    }
    
    private String getCurrentUserId() {
        return Optional.ofNullable(SecurityContextHolder.getContext())
                      .map(SecurityContext::getAuthentication)
                      .filter(Authentication::isAuthenticated)
                      .map(Authentication::getName)
                      .orElse("anonymous");
    }
    
    private String getClientIpAddress() {
        if (request == null) return null;
        
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
```

### 4. 審計事件存儲庫

```java
/**
 * 審計事件存儲庫
 */
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    
    List<AuditEvent> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
        String entityType, String entityId);
    
    List<AuditEvent> findByEntityTypeAndEntityIdAndCreatedAtBetweenOrderByCreatedAtDesc(
        String entityType, String entityId, LocalDateTime startTime, LocalDateTime endTime);
    
    List<AuditEvent> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<AuditEvent> findByEventTypeAndCreatedAtBetween(
        String eventType, LocalDateTime startTime, LocalDateTime endTime);
    
    @Modifying
    @Query("DELETE FROM AuditEvent a WHERE a.createdAt < :cutoffDate")
    int deleteByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    @Query("SELECT COUNT(a) FROM AuditEvent a WHERE a.createdAt >= :startTime")
    long countEventsAfter(@Param("startTime") LocalDateTime startTime);
}
```

### 5. 審計註解

```java
/**
 * 審計註解
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {
    
    /**
     * 事件類型
     */
    String eventType() default "";
    
    /**
     * 實體類型
     */
    String entityType() default "";
    
    /**
     * 描述
     */
    String description() default "";
    
    /**
     * 是否記錄參數
     */
    boolean logParameters() default true;
    
    /**
     * 是否記錄返回值
     */
    boolean logReturnValue() default true;
}

/**
 * 審計切面
 */
@Aspect
@Component
public class AuditAspect {
    
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    
    public AuditAspect(AuditService auditService, ObjectMapper objectMapper) {
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }
    
    @Around("@annotation(auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        String eventType = auditable.eventType().isEmpty() ? 
                          joinPoint.getSignature().getName() : auditable.eventType();
        String entityType = auditable.entityType().isEmpty() ? 
                           joinPoint.getTarget().getClass().getSimpleName() : auditable.entityType();
        String description = auditable.description().isEmpty() ? 
                            eventType : auditable.description();
        
        Object[] args = joinPoint.getArgs();
        Map<String, Object> parameters = null;
        
        if (auditable.logParameters() && args.length > 0) {
            parameters = new HashMap<>();
            for (int i = 0; i < args.length; i++) {
                parameters.put("arg" + i, args[i]);
            }
        }
        
        Object result = null;
        Exception exception = null;
        
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Exception e) {
            exception = e;
            throw e;
        } finally {
            // 記錄審計事件
            Map<String, Object> auditData = new HashMap<>();
            if (parameters != null) {
                auditData.put("parameters", parameters);
            }
            if (auditable.logReturnValue() && result != null) {
                auditData.put("returnValue", result);
            }
            if (exception != null) {
                auditData.put("exception", exception.getMessage());
            }
            
            String entityId = extractEntityId(args);
            auditService.logEvent(eventType, entityType, entityId, 
                                 null, auditData, description);
        }
    }
    
    private String extractEntityId(Object[] args) {
        // 嘗試從參數中提取實體ID
        for (Object arg : args) {
            if (arg instanceof String) {
                return (String) arg;
            }
            if (arg instanceof Number) {
                return String.valueOf(arg);
            }
        }
        return "unknown";
    }
}
```

## 企業級狀態管理

### 1. 企業文檔管理系統

```java
/**
 * 企業文檔實體
 */
@Entity
@Table(name = "enterprise_documents")
public class EnterpriseDocument extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "title", nullable = false)
    private String title;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "document_type")
    private String documentType;
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "tags")
    private String tags;
    
    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;
    
    @Column(name = "checksum")
    private String checksum;
    
    // Constructors
    public EnterpriseDocument() {}
    
    public EnterpriseDocument(String title, String content, String documentType) {
        this.title = title;
        this.content = content;
        this.documentType = documentType;
        this.status = DocumentStatus.DRAFT;
        this.checksum = calculateChecksum();
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { 
        this.title = title;
        this.checksum = calculateChecksum();
    }
    
    public String getContent() { return content; }
    public void setContent(String content) { 
        this.content = content;
        this.checksum = calculateChecksum();
    }
    
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    
    public DocumentStatus getStatus() { return status; }
    public void setStatus(DocumentStatus status) { this.status = status; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    
    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
    
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    
    private String calculateChecksum() {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String data = title + content + documentType;
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(System.currentTimeMillis());
        }
    }
}

/**
 * 文檔狀態枚舉
 */
public enum DocumentStatus {
    DRAFT, REVIEW, APPROVED, PUBLISHED, ARCHIVED, DELETED
}
```

### 2. 企業狀態管理服務

```java
/**
 * 企業狀態管理服務
 */
@Service
@Transactional
public class EnterpriseStateManager {
    
    private final EnterpriseDocumentRepository documentRepository;
    private final DocumentSnapshotRepository snapshotRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    
    public EnterpriseStateManager(EnterpriseDocumentRepository documentRepository,
                                 DocumentSnapshotRepository snapshotRepository,
                                 AuditService auditService,
                                 ObjectMapper objectMapper) {
        this.documentRepository = documentRepository;
        this.snapshotRepository = snapshotRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }
    
    /**
     * 創建文檔快照
     */
    @Auditable(eventType = "CREATE_SNAPSHOT", entityType = "EnterpriseDocument")
    public DocumentSnapshot createSnapshot(Long documentId, String description) {
        EnterpriseDocument document = documentRepository.findById(documentId)
                                                       .orElseThrow(() -> new EntityNotFoundException("文檔不存在"));
        
        DocumentSnapshot snapshot = new DocumentSnapshot();
        snapshot.setDocumentId(documentId);
        snapshot.setTitle(document.getTitle());
        snapshot.setContent(document.getContent());
        snapshot.setDocumentType(document.getDocumentType());
        snapshot.setStatus(document.getStatus());
        snapshot.setCategory(document.getCategory());
        snapshot.setTags(document.getTags());
        snapshot.setMetadata(document.getMetadata());
        snapshot.setChecksum(document.getChecksum());
        snapshot.setDescription(description);
        snapshot.setVersion(document.getVersion());
        
        return snapshotRepository.save(snapshot);
    }
    
    /**
     * 恢復文檔到指定快照
     */
    @Auditable(eventType = "RESTORE_SNAPSHOT", entityType = "EnterpriseDocument")
    public void restoreToSnapshot(Long documentId, Long snapshotId) {
        EnterpriseDocument document = documentRepository.findById(documentId)
                                                       .orElseThrow(() -> new EntityNotFoundException("文檔不存在"));
        
        DocumentSnapshot snapshot = snapshotRepository.findById(snapshotId)
                                                     .orElseThrow(() -> new EntityNotFoundException("快照不存在"));
        
        if (!document.getId().equals(snapshot.getDocumentId())) {
            throw new IllegalArgumentException("快照與文檔不匹配");
        }
        
        // 創建恢復前的快照
        DocumentSnapshot preRestoreSnapshot = createSnapshot(documentId, "恢復前自動快照");
        
        // 恢復狀態
        document.setTitle(snapshot.getTitle());
        document.setContent(snapshot.getContent());
        document.setDocumentType(snapshot.getDocumentType());
        document.setStatus(snapshot.getStatus());
        document.setCategory(snapshot.getCategory());
        document.setTags(snapshot.getTags());
        document.setMetadata(snapshot.getMetadata());
        document.setChecksum(snapshot.getChecksum());
        
        documentRepository.save(document);
        
        // 記錄審計
        auditService.logEvent("RESTORE", "EnterpriseDocument", documentId.toString(),
                             preRestoreSnapshot, snapshot, "恢復到快照: " + snapshot.getDescription());
    }
    
    /**
     * 獲取文檔版本歷史
     */
    @Transactional(readOnly = true)
    public List<DocumentSnapshot> getDocumentHistory(Long documentId) {
        return snapshotRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }
    
    /**
     * 比較兩個快照
     */
    @Transactional(readOnly = true)
    public DocumentComparison compareSnapshots(Long snapshot1Id, Long snapshot2Id) {
        DocumentSnapshot snapshot1 = snapshotRepository.findById(snapshot1Id)
                                                      .orElseThrow(() -> new EntityNotFoundException("快照1不存在"));
        DocumentSnapshot snapshot2 = snapshotRepository.findById(snapshot2Id)
                                                      .orElseThrow(() -> new EntityNotFoundException("快照2不存在"));
        
        return new DocumentComparison(snapshot1, snapshot2);
    }
    
    /**
     * 清理過期快照
     */
    @Scheduled(cron = "0 0 2 * * *") // 每天凌晨2點執行
    public void cleanupOldSnapshots() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90);
        int deletedCount = snapshotRepository.deleteByCreatedAtBefore(cutoffDate);
        System.out.println("已刪除 " + deletedCount + " 個過期快照");
    }
}
```

### 3. 文檔快照實體

```java
/**
 * 文檔快照實體
 */
@Entity
@Table(name = "document_snapshots")
public class DocumentSnapshot extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "document_id", nullable = false)
    private Long documentId;
    
    @Column(name = "title", nullable = false)
    private String title;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "document_type")
    private String documentType;
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "tags")
    private String tags;
    
    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;
    
    @Column(name = "checksum")
    private String checksum;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "version")
    private Long version;
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    
    public DocumentStatus getStatus() { return status; }
    public void setStatus(DocumentStatus status) { this.status = status; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    
    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
    
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
```

### 4. 文檔比較工具

```java
/**
 * 文檔比較結果
 */
public class DocumentComparison {
    private final DocumentSnapshot snapshot1;
    private final DocumentSnapshot snapshot2;
    private final List<FieldDifference> differences;
    
    public DocumentComparison(DocumentSnapshot snapshot1, DocumentSnapshot snapshot2) {
        this.snapshot1 = snapshot1;
        this.snapshot2 = snapshot2;
        this.differences = calculateDifferences();
    }
    
    private List<FieldDifference> calculateDifferences() {
        List<FieldDifference> diffs = new ArrayList<>();
        
        // 比較標題
        if (!Objects.equals(snapshot1.getTitle(), snapshot2.getTitle())) {
            diffs.add(new FieldDifference("title", snapshot1.getTitle(), snapshot2.getTitle()));
        }
        
        // 比較內容
        if (!Objects.equals(snapshot1.getContent(), snapshot2.getContent())) {
            diffs.add(new FieldDifference("content", 
                                        truncateContent(snapshot1.getContent()), 
                                        truncateContent(snapshot2.getContent())));
        }
        
        // 比較狀態
        if (!Objects.equals(snapshot1.getStatus(), snapshot2.getStatus())) {
            diffs.add(new FieldDifference("status", 
                                        snapshot1.getStatus().toString(), 
                                        snapshot2.getStatus().toString()));
        }
        
        // 比較類別
        if (!Objects.equals(snapshot1.getCategory(), snapshot2.getCategory())) {
            diffs.add(new FieldDifference("category", snapshot1.getCategory(), snapshot2.getCategory()));
        }
        
        // 比較標籤
        if (!Objects.equals(snapshot1.getTags(), snapshot2.getTags())) {
            diffs.add(new FieldDifference("tags", snapshot1.getTags(), snapshot2.getTags()));
        }
        
        return diffs;
    }
    
    private String truncateContent(String content) {
        if (content == null) return null;
        return content.length() > 100 ? content.substring(0, 100) + "..." : content;
    }
    
    public DocumentSnapshot getSnapshot1() { return snapshot1; }
    public DocumentSnapshot getSnapshot2() { return snapshot2; }
    public List<FieldDifference> getDifferences() { return differences; }
    
    public boolean hasChanges() {
        return !differences.isEmpty();
    }
    
    /**
     * 欄位差異
     */
    public static class FieldDifference {
        private final String fieldName;
        private final String oldValue;
        private final String newValue;
        
        public FieldDifference(String fieldName, String oldValue, String newValue) {
            this.fieldName = fieldName;
            this.oldValue = oldValue;
            this.newValue = newValue;
        }
        
        public String getFieldName() { return fieldName; }
        public String getOldValue() { return oldValue; }
        public String getNewValue() { return newValue; }
        
        @Override
        public String toString() {
            return String.format("%s: '%s' -> '%s'", fieldName, oldValue, newValue);
        }
    }
}
```

### 5. REST API 控制器

```java
/**
 * 企業文檔 REST API
 */
@RestController
@RequestMapping("/api/enterprise/documents")
public class EnterpriseDocumentController {
    
    private final EnterpriseDocumentRepository documentRepository;
    private final EnterpriseStateManager stateManager;
    private final AuditService auditService;
    
    public EnterpriseDocumentController(EnterpriseDocumentRepository documentRepository,
                                       EnterpriseStateManager stateManager,
                                       AuditService auditService) {
        this.documentRepository = documentRepository;
        this.stateManager = stateManager;
        this.auditService = auditService;
    }
    
    /**
     * 創建快照
     */
    @PostMapping("/{id}/snapshots")
    @Auditable(eventType = "CREATE_SNAPSHOT", entityType = "EnterpriseDocument")
    public ResponseEntity<DocumentSnapshot> createSnapshot(@PathVariable Long id,
                                                          @RequestParam String description) {
        DocumentSnapshot snapshot = stateManager.createSnapshot(id, description);
        return ResponseEntity.ok(snapshot);
    }
    
    /**
     * 恢復到快照
     */
    @PostMapping("/{id}/restore/{snapshotId}")
    @Auditable(eventType = "RESTORE_SNAPSHOT", entityType = "EnterpriseDocument")
    public ResponseEntity<Void> restoreToSnapshot(@PathVariable Long id,
                                                 @PathVariable Long snapshotId) {
        stateManager.restoreToSnapshot(id, snapshotId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * 獲取文檔歷史
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<List<DocumentSnapshot>> getDocumentHistory(@PathVariable Long id) {
        List<DocumentSnapshot> history = stateManager.getDocumentHistory(id);
        return ResponseEntity.ok(history);
    }
    
    /**
     * 比較快照
     */
    @GetMapping("/snapshots/{id1}/compare/{id2}")
    public ResponseEntity<DocumentComparison> compareSnapshots(@PathVariable Long id1,
                                                              @PathVariable Long id2) {
        DocumentComparison comparison = stateManager.compareSnapshots(id1, id2);
        return ResponseEntity.ok(comparison);
    }
    
    /**
     * 獲取審計記錄
     */
    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditEvent>> getAuditTrail(@PathVariable Long id) {
        List<AuditEvent> auditTrail = auditService.getAuditTrail("EnterpriseDocument", id.toString());
        return ResponseEntity.ok(auditTrail);
    }
    
    /**
     * 更新文檔
     */
    @PutMapping("/{id}")
    @Auditable(eventType = "UPDATE_DOCUMENT", entityType = "EnterpriseDocument")
    public ResponseEntity<EnterpriseDocument> updateDocument(@PathVariable Long id,
                                                            @RequestBody EnterpriseDocument updatedDocument) {
        EnterpriseDocument document = documentRepository.findById(id)
                                                       .orElseThrow(() -> new EntityNotFoundException("文檔不存在"));
        
        // 創建更新前的快照
        stateManager.createSnapshot(id, "更新前自動快照");
        
        // 更新文檔
        document.setTitle(updatedDocument.getTitle());
        document.setContent(updatedDocument.getContent());
        document.setStatus(updatedDocument.getStatus());
        document.setCategory(updatedDocument.getCategory());
        document.setTags(updatedDocument.getTags());
        document.setMetadata(updatedDocument.getMetadata());
        
        EnterpriseDocument savedDocument = documentRepository.save(document);
        
        // 創建更新後的快照
        stateManager.createSnapshot(id, "更新後自動快照");
        
        return ResponseEntity.ok(savedDocument);
    }
}
```

---

## 7. 效能監控與指標 (Performance Monitoring & Metrics)

### 7.1 Memento 效能監控

```java
@Component
public class MementoMetrics {
    private final MeterRegistry meterRegistry;
    private final Counter mementoCreationCounter;
    private final Timer mementoCreationTimer;
    private final Gauge mementoSizeGauge;
    private final Timer mementoRestoreTimer;
    private final DistributionSummary mementoSizeDistribution;
    
    public MementoMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.mementoCreationCounter = Counter.builder("memento.creation.count")
            .description("Number of mementos created")
            .tag("pattern", "memento")
            .register(meterRegistry);
        
        this.mementoCreationTimer = Timer.builder("memento.creation.duration")
            .description("Time taken to create memento")
            .register(meterRegistry);
        
        this.mementoRestoreTimer = Timer.builder("memento.restore.duration")
            .description("Time taken to restore from memento")
            .register(meterRegistry);
        
        this.mementoSizeDistribution = DistributionSummary.builder("memento.size.bytes")
            .description("Size of memento in bytes")
            .baseUnit("bytes")
            .register(meterRegistry);
    }
    
    public void recordMementoCreation(long durationNanos, long sizeBytes) {
        mementoCreationCounter.increment();
        mementoCreationTimer.record(durationNanos, TimeUnit.NANOSECONDS);
        mementoSizeDistribution.record(sizeBytes);
    }
    
    public void recordMementoRestore(long durationNanos) {
        mementoRestoreTimer.record(durationNanos, TimeUnit.NANOSECONDS);
    }
    
    public void recordMementoPoolSize(int size) {
        Gauge.builder("memento.pool.size")
            .description("Current size of memento pool")
            .register(meterRegistry, size, Number::intValue);
    }
}
```

### 7.2 效能優化的 Memento 工廠

```java
@Component
public class OptimizedMementoFactory {
    private final MementoMetrics metrics;
    private final ObjectMapper objectMapper;
    private final CompressionService compressionService;
    private final ExecutorService executorService;
    private final Map<String, ObjectPool<byte[]>> bufferPools;
    
    public OptimizedMementoFactory(MementoMetrics metrics) {
        this.metrics = metrics;
        this.objectMapper = new ObjectMapper();
        this.compressionService = new CompressionService();
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
        this.bufferPools = new ConcurrentHashMap<>();
    }
    
    public <T> CompletableFuture<Memento<T>> createMementoAsync(T state, String type) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.nanoTime();
            
            try {
                // 序列化狀態
                byte[] serializedState = objectMapper.writeValueAsBytes(state);
                
                // 壓縮數據
                byte[] compressedState = compressionService.compress(serializedState);
                
                // 創建 Memento
                Memento<T> memento = new CompressedMemento<>(
                    UUID.randomUUID().toString(),
                    compressedState,
                    type,
                    Instant.now(),
                    serializedState.length
                );
                
                // 記錄指標
                long duration = System.nanoTime() - startTime;
                metrics.recordMementoCreation(duration, compressedState.length);
                
                return memento;
                
            } catch (Exception e) {
                throw new MementoCreationException("Failed to create memento", e);
            }
        }, executorService);
    }
    
    public <T> CompletableFuture<T> restoreFromMementoAsync(Memento<T> memento, Class<T> type) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.nanoTime();
            
            try {
                if (memento instanceof CompressedMemento<T> compressedMemento) {
                    // 解壓縮數據
                    byte[] decompressedState = compressionService.decompress(
                        compressedMemento.getCompressedData()
                    );
                    
                    // 反序列化狀態
                    T restoredState = objectMapper.readValue(decompressedState, type);
                    
                    // 記錄指標
                    long duration = System.nanoTime() - startTime;
                    metrics.recordMementoRestore(duration);
                    
                    return restoredState;
                }
                
                throw new IllegalArgumentException("Unsupported memento type");
                
            } catch (Exception e) {
                throw new MementoRestoreException("Failed to restore from memento", e);
            }
        }, executorService);
    }
    
    // 對象池管理
    private ObjectPool<byte[]> getBufferPool(String key) {
        return bufferPools.computeIfAbsent(key, k -> 
            new GenericObjectPool<>(new ByteArrayPoolFactory())
        );
    }
}
```

### 7.3 分散式 Memento 儲存

```java
@Service
public class DistributedMementoStore {
    private final RedisTemplate<String, Object> redisTemplate;
    private final MementoMetrics metrics;
    private final ConsistentHashRouter hashRouter;
    
    public DistributedMementoStore(RedisTemplate<String, Object> redisTemplate,
                                 MementoMetrics metrics) {
        this.redisTemplate = redisTemplate;
        this.metrics = metrics;
        this.hashRouter = new ConsistentHashRouter();
    }
    
    @Async
    public CompletableFuture<Void> storeMemento(String key, Memento<?> memento) {
        String node = hashRouter.getNode(key);
        String nodeKey = node + ":" + key;
        
        return CompletableFuture.runAsync(() -> {
            try {
                // 存儲到 Redis 集群
                redisTemplate.opsForValue().set(
                    nodeKey, 
                    memento, 
                    Duration.ofHours(24)
                );
                
                // 記錄分散式存儲指標
                metrics.recordDistributedStore(node, key);
                
            } catch (Exception e) {
                throw new MementoStoreException("Failed to store memento", e);
            }
        });
    }
    
    @Async
    public CompletableFuture<Memento<?>> retrieveMemento(String key) {
        String node = hashRouter.getNode(key);
        String nodeKey = node + ":" + key;
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                Memento<?> memento = (Memento<?>) redisTemplate.opsForValue().get(nodeKey);
                
                if (memento != null) {
                    metrics.recordDistributedRetrieve(node, key, true);
                } else {
                    metrics.recordDistributedRetrieve(node, key, false);
                }
                
                return memento;
                
            } catch (Exception e) {
                throw new MementoRetrieveException("Failed to retrieve memento", e);
            }
        });
    }
}
```

## 8. 現代化 Java 特性整合 (Modern Java Features)

### 8.1 使用 Records 的 Memento 實現

```java
// 使用 Record 定義不可變的 Memento
public record DocumentMemento(
    String id,
    String content,
    String formatting,
    Instant timestamp,
    Map<String, Object> metadata
) implements Memento<DocumentState> {
    
    // 驗證構造函數
    public DocumentMemento {
        Objects.requireNonNull(id, "Id cannot be null");
        Objects.requireNonNull(content, "Content cannot be null");
        Objects.requireNonNull(timestamp, "Timestamp cannot be null");
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }
    
    // 便利方法
    public static DocumentMemento from(DocumentState state) {
        return new DocumentMemento(
            state.getId(),
            state.getContent(),
            state.getFormatting(),
            Instant.now(),
            state.getMetadata()
        );
    }
    
    public DocumentState toState() {
        return new DocumentState(id, content, formatting, metadata);
    }
}

// 使用 Sealed Interface 限制 Memento 類型
public sealed interface MementoSnapshot 
    permits DocumentMemento, ImageMemento, VideoMemento {
    
    String getId();
    Instant getTimestamp();
    
    default boolean isExpired(Duration maxAge) {
        return Instant.now().minus(maxAge).isAfter(getTimestamp());
    }
}
```

### 8.2 Virtual Threads 的 Memento 處理

```java
@Service
public class VirtualThreadMementoProcessor {
    private final ExecutorService virtualThreadExecutor;
    private final MementoStore store;
    
    public VirtualThreadMementoProcessor(MementoStore store) {
        this.store = store;
        this.virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
    }
    
    public CompletableFuture<List<Memento<?>>> processBatchMementos(
            List<Object> states, 
            String batchId) {
        
        return CompletableFuture.supplyAsync(() -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                
                // 為每個狀態創建 Virtual Thread 任務
                var futures = states.stream()
                    .map(state -> scope.fork(() -> {
                        return createMementoWithVirtualThread(state, batchId);
                    }))
                    .toList();
                
                // 等待所有任務完成
                scope.join();
                scope.throwIfFailed();
                
                // 收集結果
                return futures.stream()
                    .map(Future::resultNow)
                    .collect(Collectors.toList());
                
            } catch (Exception e) {
                throw new MementoProcessingException("Batch processing failed", e);
            }
        }, virtualThreadExecutor);
    }
    
    private Memento<?> createMementoWithVirtualThread(Object state, String batchId) {
        // Virtual Thread 中執行 I/O 密集操作
        Thread.ofVirtual()
            .name("memento-processor-" + batchId)
            .start(() -> {
                // 模擬 I/O 操作
                try {
                    Thread.sleep(100); // 在 Virtual Thread 中不會阻塞平台線程
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        
        return store.createMemento(state);
    }
}
```

### 8.3 Pattern Matching 的 Memento 恢復

```java
public class PatternMatchingMementoHandler {
    
    public <T> T restoreFromMemento(Memento<T> memento) {
        return switch (memento) {
            case DocumentMemento doc -> {
                yield (T) new DocumentState(
                    doc.id(),
                    doc.content(),
                    doc.formatting(),
                    doc.metadata()
                );
            }
            
            case ImageMemento img -> {
                yield (T) new ImageState(
                    img.id(),
                    img.imageData(),
                    img.format(),
                    img.dimensions()
                );
            }
            
            case VideoMemento video -> {
                yield (T) new VideoState(
                    video.id(),
                    video.videoData(),
                    video.duration(),
                    video.quality()
                );
            }
            
            case null -> throw new IllegalArgumentException("Memento cannot be null");
            
            default -> throw new IllegalArgumentException(
                "Unsupported memento type: " + memento.getClass().getSimpleName()
            );
        };
    }
    
    public String getMementoInfo(Memento<?> memento) {
        return switch (memento) {
            case DocumentMemento doc -> 
                "Document: " + doc.id() + " (" + doc.content().length() + " chars)";
            
            case ImageMemento img -> 
                "Image: " + img.id() + " (" + img.format() + ")";
            
            case VideoMemento video -> 
                "Video: " + video.id() + " (" + video.duration() + "s)";
            
            case null -> "Null memento";
            
            default -> "Unknown memento type";
        };
    }
}
```

### 8.4 Functional Programming 風格的 Memento 操作

```java
public class FunctionalMementoOperations {
    
    // 使用 Stream API 進行批量操作
    public static <T> List<Memento<T>> createMementosBatch(List<T> states) {
        return states.parallelStream()
            .filter(Objects::nonNull)
            .map(state -> switch (state) {
                case DocumentState doc -> DocumentMemento.from(doc);
                case ImageState img -> ImageMemento.from(img);
                case VideoState video -> VideoMemento.from(video);
                default -> throw new IllegalArgumentException("Unsupported state type");
            })
            .collect(Collectors.toList());
    }
    
    // 使用 Optional 處理可能為空的 Memento
    public static <T> Optional<T> safeRestore(Memento<T> memento) {
        return Optional.ofNullable(memento)
            .filter(m -> !m.isExpired(Duration.ofHours(24)))
            .map(m -> {
                try {
                    return restoreFromMemento(m);
                } catch (Exception e) {
                    return null;
                }
            });
    }
    
    // 使用 Function 組合進行 Memento 轉換
    public static <T, R> Function<T, Optional<R>> createMementoTransformer(
            Function<T, Memento<T>> mementoCreator,
            Function<Memento<T>, R> mementoProcessor) {
        
        return state -> Optional.ofNullable(state)
            .map(mementoCreator)
            .map(mementoProcessor);
    }
    
    // 使用 Predicate 過濾 Memento
    public static <T> List<Memento<T>> filterMementos(
            List<Memento<T>> mementos,
            Predicate<Memento<T>> filter) {
        
        return mementos.stream()
            .filter(filter)
            .collect(Collectors.toList());
    }
}
```

## 9. 最佳實踐與反模式 (Best Practices & Anti-Patterns)

### 9.1 最佳實踐

#### 9.1.1 記憶體管理

```java
@Component
public class MemoryEfficientMementoManager {
    private final WeakHashMap<String, SoftReference<Memento<?>>> mementoCache;
    private final ScheduledExecutorService cleanupExecutor;
    
    public MemoryEfficientMementoManager() {
        this.mementoCache = new WeakHashMap<>();
        this.cleanupExecutor = Executors.newScheduledThreadPool(1);
        
        // 定期清理過期的 Memento
        cleanupExecutor.scheduleAtFixedRate(
            this::cleanupExpiredMementos,
            1, 1, TimeUnit.HOURS
        );
    }
    
    public void storeMemento(String key, Memento<?> memento) {
        // 使用 SoftReference 允許在記憶體不足時回收
        mementoCache.put(key, new SoftReference<>(memento));
    }
    
    public Optional<Memento<?>> retrieveMemento(String key) {
        SoftReference<Memento<?>> reference = mementoCache.get(key);
        
        if (reference != null) {
            Memento<?> memento = reference.get();
            if (memento != null && !memento.isExpired(Duration.ofHours(24))) {
                return Optional.of(memento);
            }
        }
        
        return Optional.empty();
    }
    
    private void cleanupExpiredMementos() {
        mementoCache.entrySet().removeIf(entry -> {
            SoftReference<Memento<?>> reference = entry.getValue();
            Memento<?> memento = reference.get();
            
            return memento == null || memento.isExpired(Duration.ofHours(24));
        });
    }
}
```

#### 9.1.2 序列化最佳實踐

```java
public class SerializationBestPractices {
    private final ObjectMapper objectMapper;
    
    public SerializationBestPractices() {
        this.objectMapper = new ObjectMapper()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .registerModule(new JavaTimeModule())
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }
    
    // 使用版本化序列化
    public byte[] serializeWithVersion(Object object) {
        try {
            VersionedWrapper wrapper = new VersionedWrapper(
                "1.0",
                object.getClass().getSimpleName(),
                object
            );
            
            return objectMapper.writeValueAsBytes(wrapper);
            
        } catch (JsonProcessingException e) {
            throw new SerializationException("Failed to serialize object", e);
        }
    }
    
    // 安全的反序列化
    public <T> T deserializeWithVersion(byte[] data, Class<T> targetType) {
        try {
            VersionedWrapper wrapper = objectMapper.readValue(data, VersionedWrapper.class);
            
            // 版本兼容性檢查
            if (!isVersionCompatible(wrapper.getVersion())) {
                throw new IncompatibleVersionException(
                    "Incompatible version: " + wrapper.getVersion()
                );
            }
            
            return objectMapper.convertValue(wrapper.getData(), targetType);
            
        } catch (JsonProcessingException e) {
            throw new DeserializationException("Failed to deserialize object", e);
        }
    }
    
    private boolean isVersionCompatible(String version) {
        // 實現版本兼容性邏輯
        return "1.0".equals(version);
    }
}
```

#### 9.1.3 異步和並發處理

```java
@Service
public class ConcurrentMementoService {
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final Map<String, Memento<?>> mementoStore = new ConcurrentHashMap<>();
    private final CompletableFuture<Void> backgroundCleanup;
    
    public ConcurrentMementoService() {
        this.backgroundCleanup = startBackgroundCleanup();
    }
    
    public CompletableFuture<Void> storeMemento(String key, Memento<?> memento) {
        return CompletableFuture.runAsync(() -> {
            lock.writeLock().lock();
            try {
                mementoStore.put(key, memento);
            } finally {
                lock.writeLock().unlock();
            }
        });
    }
    
    public CompletableFuture<Optional<Memento<?>>> retrieveMemento(String key) {
        return CompletableFuture.supplyAsync(() -> {
            lock.readLock().lock();
            try {
                return Optional.ofNullable(mementoStore.get(key));
            } finally {
                lock.readLock().unlock();
            }
        });
    }
    
    private CompletableFuture<Void> startBackgroundCleanup() {
        return CompletableFuture.runAsync(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Thread.sleep(TimeUnit.MINUTES.toMillis(30));
                    cleanupExpiredMementos();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });
    }
}
```

### 9.2 反模式與避免方式

#### 9.2.1 記憶體洩漏反模式

```java
// ❌ 錯誤：無限制地保存 Memento
public class MemoryLeakAntiPattern {
    private final List<Memento<?>> allMementos = new ArrayList<>(); // 永遠不清理
    
    public void addMemento(Memento<?> memento) {
        allMementos.add(memento); // 記憶體洩漏
    }
}

// ✅ 正確：限制大小並定期清理
public class MemoryEfficientPattern {
    private final Map<String, Memento<?>> mementos = new LinkedHashMap<String, Memento<?>>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Memento<?>> eldest) {
            return size() > MAX_SIZE; // 限制大小
        }
    };
    
    private static final int MAX_SIZE = 1000;
}
```

#### 9.2.2 深度複製反模式

```java
// ❌ 錯誤：簡單引用複製
public class ShallowCopyAntiPattern {
    public Memento<List<String>> createMemento(List<String> data) {
        return new SimpleMemento<>(data); // 淺拷貝，容易被修改
    }
}

// ✅ 正確：深度複製
public class DeepCopyPattern {
    public Memento<List<String>> createMemento(List<String> data) {
        List<String> immutableCopy = List.copyOf(data);
        return new SimpleMemento<>(immutableCopy);
    }
}
```

#### 9.2.3 序列化反模式

```java
// ❌ 錯誤：使用 Java 原生序列化
public class JavaSerializationAntiPattern {
    public byte[] serialize(Object obj) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ObjectOutputStream oos = new ObjectOutputStream(baos)) {
            
            oos.writeObject(obj); // 安全問題且效率低
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}

// ✅ 正確：使用 JSON 或其他安全格式
public class JsonSerializationPattern {
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public byte[] serialize(Object obj) {
        try {
            return objectMapper.writeValueAsBytes(obj);
        } catch (JsonProcessingException e) {
            throw new SerializationException("Failed to serialize", e);
        }
    }
}
```

## 10. 測試策略 (Testing Strategies)

### 10.1 單元測試

```java
@ExtendWith(MockitoExtension.class)
class MementoPatternTest {
    
    @Mock
    private MementoStore mementoStore;
    
    @InjectMocks
    private DocumentOriginator originator;
    
    @Test
    @DisplayName("應該能夠創建和恢復 Memento")
    void shouldCreateAndRestoreMemento() {
        // Given
        String originalContent = "Original content";
        originator.setContent(originalContent);
        
        // When
        Memento<String> memento = originator.createMemento();
        originator.setContent("Modified content");
        originator.restoreFromMemento(memento);
        
        // Then
        assertThat(originator.getContent()).isEqualTo(originalContent);
    }
    
    @Test
    @DisplayName("應該能夠處理空的 Memento")
    void shouldHandleNullMemento() {
        // Given
        String originalContent = "Original content";
        originator.setContent(originalContent);
        
        // When & Then
        assertThatThrownBy(() -> originator.restoreFromMemento(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Memento cannot be null");
    }
    
    @Test
    @DisplayName("應該能夠處理過期的 Memento")
    void shouldHandleExpiredMemento() {
        // Given
        Memento<String> expiredMemento = new ExpiredMemento<>();
        
        // When & Then
        assertThatThrownBy(() -> originator.restoreFromMemento(expiredMemento))
            .isInstanceOf(MementoExpiredException.class);
    }
}
```

### 10.2 整合測試

```java
@SpringBootTest
@TestPropertySource(locations = "classpath:test.properties")
class MementoIntegrationTest {
    
    @Autowired
    private MementoService mementoService;
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("應該能夠透過 REST API 創建和恢復 Memento")
    void shouldCreateAndRestoreMementoViaRestApi() {
        // Given
        DocumentState originalState = new DocumentState("1", "Test content", "plain");
        
        // When - 創建 Memento
        ResponseEntity<String> createResponse = restTemplate.postForEntity(
            "/api/documents/1/memento",
            originalState,
            String.class
        );
        
        // Then
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String mementoId = createResponse.getBody();
        
        // When - 恢復 Memento
        ResponseEntity<DocumentState> restoreResponse = restTemplate.getForEntity(
            "/api/documents/1/memento/" + mementoId,
            DocumentState.class
        );
        
        // Then
        assertThat(restoreResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(restoreResponse.getBody().getContent()).isEqualTo("Test content");
    }
    
    @Test
    @DisplayName("應該能夠處理大量並發請求")
    void shouldHandleConcurrentRequests() throws InterruptedException {
        // Given
        int numberOfThreads = 10;
        int numberOfRequests = 100;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfRequests);
        AtomicInteger successCount = new AtomicInteger(0);
        
        // When
        for (int i = 0; i < numberOfRequests; i++) {
            final int requestId = i;
            executorService.submit(() -> {
                try {
                    DocumentState state = new DocumentState(
                        String.valueOf(requestId),
                        "Content " + requestId,
                        "plain"
                    );
                    
                    ResponseEntity<String> response = restTemplate.postForEntity(
                        "/api/documents/" + requestId + "/memento",
                        state,
                        String.class
                    );
                    
                    if (response.getStatusCode().is2xxSuccessful()) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // 記錄錯誤但不拋出異常
                } finally {
                    latch.countDown();
                }
            });
        }
        
        // Then
        latch.await(30, TimeUnit.SECONDS);
        assertThat(successCount.get()).isGreaterThan(numberOfRequests * 0.9); // 90% 成功率
    }
}
```

### 10.3 效能測試

```java
@Test
@DisplayName("Memento 創建效能測試")
void mementoCreationPerformanceTest() {
    // Given
    int numberOfMementos = 10000;
    List<DocumentState> states = IntStream.range(0, numberOfMementos)
        .mapToObj(i -> new DocumentState(String.valueOf(i), "Content " + i, "plain"))
        .collect(Collectors.toList());
    
    // When
    long startTime = System.currentTimeMillis();
    
    List<Memento<DocumentState>> mementos = states.parallelStream()
        .map(state -> mementoService.createMemento(state))
        .collect(Collectors.toList());
    
    long endTime = System.currentTimeMillis();
    
    // Then
    assertThat(mementos).hasSize(numberOfMementos);
    
    long totalTime = endTime - startTime;
    double averageTime = (double) totalTime / numberOfMementos;
    
    System.out.println("創建 " + numberOfMementos + " 個 Memento 花費時間: " + totalTime + "ms");
    System.out.println("平均每個 Memento 創建時間: " + averageTime + "ms");
    
    // 確保效能在可接受範圍內
    assertThat(averageTime).isLessThan(1.0); // 每個 Memento 創建時間應少於 1ms
}
```

## 11. 總結 (Summary)

### 11.1 Memento 模式的核心價值

Memento 模式在現代軟體開發中提供了以下核心價值：

1. **封裝性保護**：在不破壞對象封裝的前提下，捕獲和恢復對象的內部狀態
2. **狀態管理**：提供了一種優雅的方式來管理對象狀態的變化和恢復
3. **撤銷/重做功能**：為應用程式提供了實現撤銷和重做操作的基礎
4. **審計和版本控制**：支援狀態變化的追蹤和歷史記錄

### 11.2 現代實現要點

1. **Spring Boot 整合**：充分利用 Spring 的依賴注入、事件驅動和 AOP 特性
2. **異步處理**：使用 CompletableFuture 和 Virtual Threads 提升性能
3. **分散式支援**：結合 Redis 和一致性哈希實現分散式 Memento 存儲
4. **監控和指標**：整合 Micrometer 提供完整的監控和分析能力

### 11.3 企業級考量

1. **效能優化**：記憶體管理、序列化優化、並發處理
2. **可靠性**：異常處理、事務管理、資料一致性
3. **可維護性**：清晰的接口設計、完善的文檔和測試
4. **擴展性**：模組化設計、插件化架構、配置驅動

### 11.4 未來發展方向

1. **AI 輔助**：機器學習驅動的狀態優化和預測
2. **雲原生**：Kubernetes 原生的 Memento 服務
3. **實時同步**：基於 WebSocket 的即時狀態同步
4. **邊緣計算**：分散式邊緣節點的狀態管理

通過以上完整的實現和分析，我們可以看到 Memento 模式在現代 Java 企業級應用中的強大威力和廣泛應用前景。正確使用這個模式能夠大幅提升應用程式的可靠性、可維護性和用戶體驗。

---

*Memento 模式實現完成 - 涵蓋基礎概念、Spring Boot 整合、企業級功能、效能監控、現代化特性、最佳實踐、測試策略等全方位內容*