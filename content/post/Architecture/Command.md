---
title: "DesignPattern - Behavioral - Command Pattern"
author: Bill.Lin
date: 2018-08-07T22:37:50+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Command Pattern 命令模式

Command Pattern 是行為型設計模式之一，它將一個請求封裝為一個對象，從而讓你可以用不同的請求對客戶端進行參數化、對請求排隊或記錄請求日誌，以及支持可撤銷的操作。

## 核心概念

命令模式將發出請求的對象與處理請求的對象分離開來。這個模式的關鍵在於引入了命令對象，它封裝了一個行為或一組行為，使得可以在不同的時間、不同的上下文中執行這些行為。

### 主要組成部分

1. **Command (命令接口)**: 定義執行操作的接口
2. **ConcreteCommand (具體命令)**: 實現命令接口，綁定接收者和動作
3. **Receiver (接收者)**: 執行實際操作的對象
4. **Invoker (調用者)**: 調用命令對象執行請求
5. **Client (客戶端)**: 創建具體命令對象並設置接收者

### 主要優勢

- **解耦**: 調用者和接收者之間完全解耦
- **可撤銷**: 支持撤銷和重做操作
- **宏命令**: 支持命令的組合和批處理
- **日誌記錄**: 便於記錄和審計操作
- **隊列處理**: 支持請求的排隊和延遲執行

## 1. 基礎命令模式實現

### 基本命令接口

```java
// 命令接口
public interface Command {
    void execute();
    void undo();
    String getDescription();
}

// 空命令實現 - 空對象模式
public class NoCommand implements Command {
    @Override
    public void execute() {
        // 什麼都不做
    }
    
    @Override
    public void undo() {
        // 什麼都不做
    }
    
    @Override
    public String getDescription() {
        return "No Command";
    }
}

// 抽象命令基類
public abstract class AbstractCommand implements Command {
    protected final String description;
    protected final LocalDateTime timestamp;
    
    public AbstractCommand(String description) {
        this.description = description;
        this.timestamp = LocalDateTime.now();
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    @Override
    public String toString() {
        return String.format("%s [%s]", description, timestamp);
    }
}
```

### 文本編輯器命令範例

```java
// 接收者 - 文本編輯器
public class TextEditor {
    private StringBuilder content;
    private int cursor;
    
    public TextEditor() {
        this.content = new StringBuilder();
        this.cursor = 0;
    }
    
    public void insertText(String text) {
        content.insert(cursor, text);
        cursor += text.length();
    }
    
    public void deleteText(int length) {
        int startPos = Math.max(0, cursor - length);
        content.delete(startPos, cursor);
        cursor = startPos;
    }
    
    public void setCursor(int position) {
        this.cursor = Math.max(0, Math.min(position, content.length()));
    }
    
    public String getContent() {
        return content.toString();
    }
    
    public int getCursor() {
        return cursor;
    }
    
    public void clear() {
        content.setLength(0);
        cursor = 0;
    }
}

// 具體命令實現
public class InsertTextCommand extends AbstractCommand {
    private final TextEditor editor;
    private final String text;
    private final int savedCursor;
    
    public InsertTextCommand(TextEditor editor, String text) {
        super("Insert: " + text);
        this.editor = editor;
        this.text = text;
        this.savedCursor = editor.getCursor();
    }
    
    @Override
    public void execute() {
        editor.insertText(text);
    }
    
    @Override
    public void undo() {
        editor.setCursor(savedCursor + text.length());
        editor.deleteText(text.length());
    }
}

public class DeleteTextCommand extends AbstractCommand {
    private final TextEditor editor;
    private final int length;
    private final int savedCursor;
    private String deletedText;
    
    public DeleteTextCommand(TextEditor editor, int length) {
        super("Delete: " + length + " chars");
        this.editor = editor;
        this.length = length;
        this.savedCursor = editor.getCursor();
    }
    
    @Override
    public void execute() {
        int startPos = Math.max(0, savedCursor - length);
        deletedText = editor.getContent().substring(startPos, savedCursor);
        editor.deleteText(length);
    }
    
    @Override
    public void undo() {
        editor.setCursor(savedCursor - length);
        editor.insertText(deletedText);
    }
}

public class ClearCommand extends AbstractCommand {
    private final TextEditor editor;
    private String savedContent;
    private int savedCursor;
    
    public ClearCommand(TextEditor editor) {
        super("Clear all");
        this.editor = editor;
    }
    
    @Override
    public void execute() {
        savedContent = editor.getContent();
        savedCursor = editor.getCursor();
        editor.clear();
    }
    
    @Override
    public void undo() {
        editor.clear();
        editor.insertText(savedContent);
        editor.setCursor(savedCursor);
    }
}
```

### 命令調用者和歷史管理

```java
// 命令調用者
public class CommandInvoker {
    private final Stack<Command> undoStack = new Stack<>();
    private final Stack<Command> redoStack = new Stack<>();
    private final int maxHistorySize;
    
    public CommandInvoker(int maxHistorySize) {
        this.maxHistorySize = maxHistorySize;
    }
    
    public void executeCommand(Command command) {
        command.execute();
        
        // 添加到撤銷堆棧
        undoStack.push(command);
        
        // 清空重做堆棧
        redoStack.clear();
        
        // 限制歷史大小
        if (undoStack.size() > maxHistorySize) {
            undoStack.removeElementAt(0);
        }
    }
    
    public boolean canUndo() {
        return !undoStack.isEmpty();
    }
    
    public boolean canRedo() {
        return !redoStack.isEmpty();
    }
    
    public void undo() {
        if (canUndo()) {
            Command command = undoStack.pop();
            command.undo();
            redoStack.push(command);
        }
    }
    
    public void redo() {
        if (canRedo()) {
            Command command = redoStack.pop();
            command.execute();
            undoStack.push(command);
        }
    }
    
    public List<Command> getUndoHistory() {
        return new ArrayList<>(undoStack);
    }
    
    public List<Command> getRedoHistory() {
        return new ArrayList<>(redoStack);
    }
    
    public void clearHistory() {
        undoStack.clear();
        redoStack.clear();
    }
}
```

### 基礎使用範例

```java
public class BasicCommandDemo {
    public static void main(String[] args) {
        // 創建文本編輯器和命令調用者
        TextEditor editor = new TextEditor();
        CommandInvoker invoker = new CommandInvoker(10);
        
        // 執行一系列命令
        invoker.executeCommand(new InsertTextCommand(editor, "Hello"));
        System.out.println("After insert 'Hello': " + editor.getContent());
        
        invoker.executeCommand(new InsertTextCommand(editor, " World"));
        System.out.println("After insert ' World': " + editor.getContent());
        
        invoker.executeCommand(new DeleteTextCommand(editor, 5));
        System.out.println("After delete 5 chars: " + editor.getContent());
        
        // 撤銷操作
        System.out.println("\n=== Undo Operations ===");
        while (invoker.canUndo()) {
            System.out.println("Undoing...");
            invoker.undo();
            System.out.println("Content: " + editor.getContent());
        }
        
        // 重做操作
        System.out.println("\n=== Redo Operations ===");
        while (invoker.canRedo()) {
            System.out.println("Redoing...");
            invoker.redo();
            System.out.println("Content: " + editor.getContent());
        }
        
        // 顯示歷史記錄
        System.out.println("\n=== Command History ===");
        invoker.getUndoHistory().forEach(System.out::println);
    }
}
```

## 2. 宏命令和複合命令

### 宏命令實現

```java
// 宏命令 - 組合多個命令
public class MacroCommand extends AbstractCommand {
    private final List<Command> commands = new ArrayList<>();
    
    public MacroCommand(String description) {
        super(description);
    }
    
    public void addCommand(Command command) {
        commands.add(command);
    }
    
    public void removeCommand(Command command) {
        commands.remove(command);
    }
    
    @Override
    public void execute() {
        for (Command command : commands) {
            command.execute();
        }
    }
    
    @Override
    public void undo() {
        // 反向執行撤銷操作
        for (int i = commands.size() - 1; i >= 0; i--) {
            commands.get(i).undo();
        }
    }
    
    public List<Command> getCommands() {
        return new ArrayList<>(commands);
    }
}

// 條件命令 - 根據條件執行
public class ConditionalCommand extends AbstractCommand {
    private final Command command;
    private final Supplier<Boolean> condition;
    
    public ConditionalCommand(String description, Command command, Supplier<Boolean> condition) {
        super(description);
        this.command = command;
        this.condition = condition;
    }
    
    @Override
    public void execute() {
        if (condition.get()) {
            command.execute();
        }
    }
    
    @Override
    public void undo() {
        if (condition.get()) {
            command.undo();
        }
    }
}
```

### 使用範例

```java
public class MacroCommandDemo {
    public static void main(String[] args) {
        TextEditor editor = new TextEditor();
        CommandInvoker invoker = new CommandInvoker(10);
        
        // 創建宏命令
        MacroCommand formatTextMacro = new MacroCommand("Format Text");
        formatTextMacro.addCommand(new InsertTextCommand(editor, "public class HelloWorld {"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "\n"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "    public static void main(String[] args) {"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "\n"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "        System.out.println(\"Hello, World!\");"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "\n"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "    }"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "\n"));
        formatTextMacro.addCommand(new InsertTextCommand(editor, "}"));
        
        // 執行宏命令
        invoker.executeCommand(formatTextMacro);
        System.out.println("After macro execution:");
        System.out.println(editor.getContent());
        
        // 撤銷宏命令
        invoker.undo();
        System.out.println("\nAfter undo macro:");
        System.out.println(editor.getContent());
    }
}
```

## 3. CQRS (Command Query Responsibility Segregation)

### CQRS 基礎結構

```java
// 命令基類
public abstract class CommandBase {
    private final String commandId;
    private final LocalDateTime timestamp;
    
    public CommandBase() {
        this.commandId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
    }
    
    public String getCommandId() { return commandId; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

// 查詢基類
public abstract class QueryBase<T> {
    private final String queryId;
    private final LocalDateTime timestamp;
    
    public QueryBase() {
        this.queryId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
    }
    
    public String getQueryId() { return queryId; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

// 用戶領域模型
public class User {
    private String id;
    private String email;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public User(String id, String email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public void updateName(String newName) {
        this.name = newName;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void updateEmail(String newEmail) {
        this.email = newEmail;
        this.updatedAt = LocalDateTime.now();
    }
    
    // getters
    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
```

### CQRS 命令定義

```java
// 用戶命令
public class CreateUserCommand extends CommandBase {
    private final String email;
    private final String name;
    
    public CreateUserCommand(String email, String name) {
        super();
        this.email = email;
        this.name = name;
    }
    
    public String getEmail() { return email; }
    public String getName() { return name; }
}

public class UpdateUserNameCommand extends CommandBase {
    private final String userId;
    private final String newName;
    
    public UpdateUserNameCommand(String userId, String newName) {
        super();
        this.userId = userId;
        this.newName = newName;
    }
    
    public String getUserId() { return userId; }
    public String getNewName() { return newName; }
}

public class UpdateUserEmailCommand extends CommandBase {
    private final String userId;
    private final String newEmail;
    
    public UpdateUserEmailCommand(String userId, String newEmail) {
        super();
        this.userId = userId;
        this.newEmail = newEmail;
    }
    
    public String getUserId() { return userId; }
    public String getNewEmail() { return newEmail; }
}

public class DeleteUserCommand extends CommandBase {
    private final String userId;
    
    public DeleteUserCommand(String userId) {
        super();
        this.userId = userId;
    }
    
    public String getUserId() { return userId; }
}
```

### CQRS 查詢定義

```java
// 用戶查詢
public class GetUserByIdQuery extends QueryBase<User> {
    private final String userId;
    
    public GetUserByIdQuery(String userId) {
        super();
        this.userId = userId;
    }
    
    public String getUserId() { return userId; }
}

public class GetUserByEmailQuery extends QueryBase<User> {
    private final String email;
    
    public GetUserByEmailQuery(String email) {
        super();
        this.email = email;
    }
    
    public String getEmail() { return email; }
}

public class GetAllUsersQuery extends QueryBase<List<User>> {
    private final int page;
    private final int size;
    
    public GetAllUsersQuery(int page, int size) {
        super();
        this.page = page;
        this.size = size;
    }
    
    public int getPage() { return page; }
    public int getSize() { return size; }
}
```

### CQRS 命令和查詢處理器

```java
// 命令處理器接口
public interface CommandHandler<T extends CommandBase> {
    void handle(T command);
}

// 查詢處理器接口
public interface QueryHandler<Q extends QueryBase<R>, R> {
    R handle(Q query);
}

// 用戶命令處理器
@Component
public class UserCommandHandler implements
    CommandHandler<CreateUserCommand>,
    CommandHandler<UpdateUserNameCommand>,
    CommandHandler<UpdateUserEmailCommand>,
    CommandHandler<DeleteUserCommand> {
    
    private final Map<String, User> userStore = new ConcurrentHashMap<>();
    
    @Override
    public void handle(CreateUserCommand command) {
        String userId = UUID.randomUUID().toString();
        User user = new User(userId, command.getEmail(), command.getName());
        userStore.put(userId, user);
        System.out.println("User created: " + userId);
    }
    
    @Override
    public void handle(UpdateUserNameCommand command) {
        User user = userStore.get(command.getUserId());
        if (user != null) {
            user.updateName(command.getNewName());
            System.out.println("User name updated: " + command.getUserId());
        } else {
            throw new IllegalArgumentException("User not found: " + command.getUserId());
        }
    }
    
    @Override
    public void handle(UpdateUserEmailCommand command) {
        User user = userStore.get(command.getUserId());
        if (user != null) {
            user.updateEmail(command.getNewEmail());
            System.out.println("User email updated: " + command.getUserId());
        } else {
            throw new IllegalArgumentException("User not found: " + command.getUserId());
        }
    }
    
    @Override
    public void handle(DeleteUserCommand command) {
        User user = userStore.remove(command.getUserId());
        if (user != null) {
            System.out.println("User deleted: " + command.getUserId());
        } else {
            throw new IllegalArgumentException("User not found: " + command.getUserId());
        }
    }
    
    public Map<String, User> getUserStore() {
        return new HashMap<>(userStore);
    }
}

// 用戶查詢處理器
@Component
public class UserQueryHandler implements
    QueryHandler<GetUserByIdQuery, User>,
    QueryHandler<GetUserByEmailQuery, User>,
    QueryHandler<GetAllUsersQuery, List<User>> {
    
    private final UserCommandHandler userCommandHandler;
    
    public UserQueryHandler(UserCommandHandler userCommandHandler) {
        this.userCommandHandler = userCommandHandler;
    }
    
    @Override
    public User handle(GetUserByIdQuery query) {
        return userCommandHandler.getUserStore().get(query.getUserId());
    }
    
    @Override
    public User handle(GetUserByEmailQuery query) {
        return userCommandHandler.getUserStore().values().stream()
            .filter(user -> user.getEmail().equals(query.getEmail()))
            .findFirst()
            .orElse(null);
    }
    
    @Override
    public List<User> handle(GetAllUsersQuery query) {
        List<User> allUsers = new ArrayList<>(userCommandHandler.getUserStore().values());
        int start = query.getPage() * query.getSize();
        int end = Math.min(start + query.getSize(), allUsers.size());
        
        if (start >= allUsers.size()) {
            return Collections.emptyList();
        }
        
        return allUsers.subList(start, end);
    }
}
```

## 4. 命令總線 (Command Bus)

### 命令總線接口

```java
// 命令總線接口
public interface CommandBus {
    <T extends CommandBase> void send(T command);
    <T extends CommandBase> CompletableFuture<Void> sendAsync(T command);
}

// 查詢總線接口
public interface QueryBus {
    <Q extends QueryBase<R>, R> R send(Q query);
    <Q extends QueryBase<R>, R> CompletableFuture<R> sendAsync(Q query);
}

// 命令總線實現
@Component
public class SimpleCommandBus implements CommandBus {
    private final Map<Class<?>, CommandHandler<?>> handlers = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    @SuppressWarnings("unchecked")
    public <T extends CommandBase> void registerHandler(Class<T> commandType, CommandHandler<T> handler) {
        handlers.put(commandType, handler);
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public <T extends CommandBase> void send(T command) {
        CommandHandler<T> handler = (CommandHandler<T>) handlers.get(command.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("No handler found for command: " + command.getClass());
        }
        
        try {
            handler.handle(command);
        } catch (Exception e) {
            throw new RuntimeException("Command handling failed: " + e.getMessage(), e);
        }
    }
    
    @Override
    public <T extends CommandBase> CompletableFuture<Void> sendAsync(T command) {
        return CompletableFuture.runAsync(() -> send(command), executorService);
    }
    
    public void shutdown() {
        executorService.shutdown();
    }
}

// 查詢總線實現
@Component
public class SimpleQueryBus implements QueryBus {
    private final Map<Class<?>, QueryHandler<?, ?>> handlers = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    @SuppressWarnings("unchecked")
    public <Q extends QueryBase<R>, R> void registerHandler(Class<Q> queryType, QueryHandler<Q, R> handler) {
        handlers.put(queryType, handler);
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public <Q extends QueryBase<R>, R> R send(Q query) {
        QueryHandler<Q, R> handler = (QueryHandler<Q, R>) handlers.get(query.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("No handler found for query: " + query.getClass());
        }
        
        try {
            return handler.handle(query);
        } catch (Exception e) {
            throw new RuntimeException("Query handling failed: " + e.getMessage(), e);
        }
    }
    
    @Override
    public <Q extends QueryBase<R>, R> CompletableFuture<R> sendAsync(Q query) {
        return CompletableFuture.supplyAsync(() -> send(query), executorService);
    }
    
    public void shutdown() {
        executorService.shutdown();
    }
}
```

### 命令總線配置

```java
// 命令總線配置
@Configuration
public class CommandBusConfiguration {
    
    @Bean
    public SimpleCommandBus commandBus(UserCommandHandler userCommandHandler) {
        SimpleCommandBus commandBus = new SimpleCommandBus();
        
        // 註冊命令處理器
        commandBus.registerHandler(CreateUserCommand.class, userCommandHandler);
        commandBus.registerHandler(UpdateUserNameCommand.class, userCommandHandler);
        commandBus.registerHandler(UpdateUserEmailCommand.class, userCommandHandler);
        commandBus.registerHandler(DeleteUserCommand.class, userCommandHandler);
        
        return commandBus;
    }
    
    @Bean
    public SimpleQueryBus queryBus(UserQueryHandler userQueryHandler) {
        SimpleQueryBus queryBus = new SimpleQueryBus();
        
        // 註冊查詢處理器
        queryBus.registerHandler(GetUserByIdQuery.class, userQueryHandler);
        queryBus.registerHandler(GetUserByEmailQuery.class, userQueryHandler);
        queryBus.registerHandler(GetAllUsersQuery.class, userQueryHandler);
        
        return queryBus;
    }
}
```

## 5. 審計和日誌記錄

### 審計命令裝飾器

```java
// 審計信息
public class AuditInfo {
    private final String userId;
    private final String sessionId;
    private final String ipAddress;
    private final LocalDateTime timestamp;
    
    public AuditInfo(String userId, String sessionId, String ipAddress) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.ipAddress = ipAddress;
        this.timestamp = LocalDateTime.now();
    }
    
    // getters
    public String getUserId() { return userId; }
    public String getSessionId() { return sessionId; }
    public String getIpAddress() { return ipAddress; }
    public LocalDateTime getTimestamp() { return timestamp; }
}

// 可審計的命令
public interface AuditableCommand {
    void setAuditInfo(AuditInfo auditInfo);
    AuditInfo getAuditInfo();
}

// 增強的命令基類
public abstract class AuditableCommandBase extends CommandBase implements AuditableCommand {
    private AuditInfo auditInfo;
    
    @Override
    public void setAuditInfo(AuditInfo auditInfo) {
        this.auditInfo = auditInfo;
    }
    
    @Override
    public AuditInfo getAuditInfo() {
        return auditInfo;
    }
}

// 審計記錄
public class AuditRecord {
    private final String recordId;
    private final String commandId;
    private final String commandType;
    private final String userId;
    private final String sessionId;
    private final String ipAddress;
    private final LocalDateTime timestamp;
    private final String details;
    private final boolean success;
    private final String errorMessage;
    
    public AuditRecord(String commandId, String commandType, String userId, String sessionId,
                      String ipAddress, LocalDateTime timestamp, String details, 
                      boolean success, String errorMessage) {
        this.recordId = UUID.randomUUID().toString();
        this.commandId = commandId;
        this.commandType = commandType;
        this.userId = userId;
        this.sessionId = sessionId;
        this.ipAddress = ipAddress;
        this.timestamp = timestamp;
        this.details = details;
        this.success = success;
        this.errorMessage = errorMessage;
    }
    
    // getters
    public String getRecordId() { return recordId; }
    public String getCommandId() { return commandId; }
    public String getCommandType() { return commandType; }
    public String getUserId() { return userId; }
    public String getSessionId() { return sessionId; }
    public String getIpAddress() { return ipAddress; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getDetails() { return details; }
    public boolean isSuccess() { return success; }
    public String getErrorMessage() { return errorMessage; }
    
    @Override
    public String toString() {
        return String.format("[%s] %s by %s at %s - %s", 
            success ? "SUCCESS" : "FAILED", commandType, userId, timestamp, details);
    }
}
```

### 審計命令總線

```java
// 帶審計功能的命令總線
@Component
public class AuditableCommandBus implements CommandBus {
    private final SimpleCommandBus commandBus;
    private final List<AuditRecord> auditRecords = new ArrayList<>();
    
    public AuditableCommandBus(SimpleCommandBus commandBus) {
        this.commandBus = commandBus;
    }
    
    @Override
    public <T extends CommandBase> void send(T command) {
        String commandId = command.getCommandId();
        String commandType = command.getClass().getSimpleName();
        
        AuditInfo auditInfo = null;
        if (command instanceof AuditableCommand) {
            auditInfo = ((AuditableCommand) command).getAuditInfo();
        }
        
        boolean success = false;
        String errorMessage = null;
        
        try {
            commandBus.send(command);
            success = true;
        } catch (Exception e) {
            errorMessage = e.getMessage();
            throw e;
        } finally {
            // 記錄審計信息
            AuditRecord record = new AuditRecord(
                commandId,
                commandType,
                auditInfo != null ? auditInfo.getUserId() : "unknown",
                auditInfo != null ? auditInfo.getSessionId() : "unknown",
                auditInfo != null ? auditInfo.getIpAddress() : "unknown",
                LocalDateTime.now(),
                generateCommandDetails(command),
                success,
                errorMessage
            );
            
            auditRecords.add(record);
            System.out.println("Audit: " + record);
        }
    }
    
    @Override
    public <T extends CommandBase> CompletableFuture<Void> sendAsync(T command) {
        return CompletableFuture.runAsync(() -> send(command));
    }
    
    private String generateCommandDetails(CommandBase command) {
        // 使用反射生成命令詳情
        StringBuilder details = new StringBuilder();
        details.append(command.getClass().getSimpleName()).append(" {");
        
        try {
            Field[] fields = command.getClass().getDeclaredFields();
            for (Field field : fields) {
                field.setAccessible(true);
                Object value = field.get(command);
                if (value != null && !field.getName().equals("commandId") && !field.getName().equals("timestamp")) {
                    details.append(field.getName()).append("=").append(value).append(", ");
                }
            }
        } catch (Exception e) {
            details.append("details unavailable");
        }
        
        details.append("}");
        return details.toString();
    }
    
    public List<AuditRecord> getAuditRecords() {
        return new ArrayList<>(auditRecords);
    }
    
    public List<AuditRecord> getAuditRecords(String userId) {
        return auditRecords.stream()
            .filter(record -> record.getUserId().equals(userId))
            .collect(Collectors.toList());
    }
}
```

## 6. Spring Boot 集成

### Spring Boot 命令控制器

```java
// 用戶 REST 控制器
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final CommandBus commandBus;
    private final QueryBus queryBus;
    
    public UserController(CommandBus commandBus, QueryBus queryBus) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
    }
    
    @PostMapping
    public ResponseEntity<String> createUser(@RequestBody CreateUserRequest request, 
                                           HttpServletRequest httpRequest) {
        try {
            CreateUserCommand command = new CreateUserCommand(request.getEmail(), request.getName());
            
            // 設置審計信息
            if (command instanceof AuditableCommand) {
                AuditInfo auditInfo = new AuditInfo(
                    "current-user-id", // 從安全上下文獲取
                    httpRequest.getSession().getId(),
                    httpRequest.getRemoteAddr()
                );
                ((AuditableCommand) command).setAuditInfo(auditInfo);
            }
            
            commandBus.send(command);
            return ResponseEntity.ok("User created successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to create user: " + e.getMessage());
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        try {
            GetUserByIdQuery query = new GetUserByIdQuery(id);
            User user = queryBus.send(query);
            
            if (user != null) {
                return ResponseEntity.ok(user);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(@RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        try {
            GetAllUsersQuery query = new GetAllUsersQuery(page, size);
            List<User> users = queryBus.send(query);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}/name")
    public ResponseEntity<String> updateUserName(@PathVariable String id, 
                                                @RequestBody UpdateUserNameRequest request,
                                                HttpServletRequest httpRequest) {
        try {
            UpdateUserNameCommand command = new UpdateUserNameCommand(id, request.getName());
            
            // 設置審計信息
            if (command instanceof AuditableCommand) {
                AuditInfo auditInfo = new AuditInfo(
                    "current-user-id",
                    httpRequest.getSession().getId(),
                    httpRequest.getRemoteAddr()
                );
                ((AuditableCommand) command).setAuditInfo(auditInfo);
            }
            
            commandBus.send(command);
            return ResponseEntity.ok("User name updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update user name: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable String id,
                                           HttpServletRequest httpRequest) {
        try {
            DeleteUserCommand command = new DeleteUserCommand(id);
            
            // 設置審計信息
            if (command instanceof AuditableCommand) {
                AuditInfo auditInfo = new AuditInfo(
                    "current-user-id",
                    httpRequest.getSession().getId(),
                    httpRequest.getRemoteAddr()
                );
                ((AuditableCommand) command).setAuditInfo(auditInfo);
            }
            
            commandBus.send(command);
            return ResponseEntity.ok("User deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to delete user: " + e.getMessage());
        }
    }
}

// 請求 DTO
public class CreateUserRequest {
    private String email;
    private String name;
    
    // getters and setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

public class UpdateUserNameRequest {
    private String name;
    
    // getter and setter
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
```

## 7. 命令模式的高級特性

### 異步命令處理

```java
// 異步命令處理器
@Component
public class AsyncCommandProcessor {
    private final CommandBus commandBus;
    private final ExecutorService executorService = Executors.newFixedThreadPool(5);
    
    public AsyncCommandProcessor(CommandBus commandBus) {
        this.commandBus = commandBus;
    }
    
    public <T extends CommandBase> CompletableFuture<Void> processAsync(T command) {
        return CompletableFuture.runAsync(() -> {
            try {
                commandBus.send(command);
            } catch (Exception e) {
                throw new RuntimeException("Async command processing failed", e);
            }
        }, executorService);
    }
    
    public <T extends CommandBase> CompletableFuture<Void> processWithDelay(T command, long delayMs) {
        return CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(delayMs);
                commandBus.send(command);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Command processing interrupted", e);
            } catch (Exception e) {
                throw new RuntimeException("Delayed command processing failed", e);
            }
        }, executorService);
    }
    
    public void shutdown() {
        executorService.shutdown();
    }
}
```

### 命令驗證和中間件

```java
// 命令驗證器
public interface CommandValidator<T extends CommandBase> {
    ValidationResult validate(T command);
}

// 驗證結果
public class ValidationResult {
    private final boolean valid;
    private final List<String> errors;
    
    public ValidationResult(boolean valid, List<String> errors) {
        this.valid = valid;
        this.errors = errors != null ? errors : Collections.emptyList();
    }
    
    public static ValidationResult success() {
        return new ValidationResult(true, null);
    }
    
    public static ValidationResult failure(List<String> errors) {
        return new ValidationResult(false, errors);
    }
    
    public boolean isValid() { return valid; }
    public List<String> getErrors() { return errors; }
}

// 用戶命令驗證器
@Component
public class UserCommandValidator implements CommandValidator<CreateUserCommand> {
    
    @Override
    public ValidationResult validate(CreateUserCommand command) {
        List<String> errors = new ArrayList<>();
        
        if (command.getEmail() == null || command.getEmail().trim().isEmpty()) {
            errors.add("Email is required");
        } else if (!isValidEmail(command.getEmail())) {
            errors.add("Invalid email format");
        }
        
        if (command.getName() == null || command.getName().trim().isEmpty()) {
            errors.add("Name is required");
        } else if (command.getName().length() < 2) {
            errors.add("Name must be at least 2 characters");
        }
        
        return errors.isEmpty() ? ValidationResult.success() : ValidationResult.failure(errors);
    }
    
    private boolean isValidEmail(String email) {
        return email.contains("@") && email.contains(".");
    }
}

// 帶驗證的命令總線
@Component
public class ValidatingCommandBus implements CommandBus {
    private final CommandBus commandBus;
    private final Map<Class<?>, CommandValidator<?>> validators = new ConcurrentHashMap<>();
    
    public ValidatingCommandBus(CommandBus commandBus) {
        this.commandBus = commandBus;
    }
    
    @SuppressWarnings("unchecked")
    public <T extends CommandBase> void registerValidator(Class<T> commandType, CommandValidator<T> validator) {
        validators.put(commandType, validator);
    }
    
    @Override
    @SuppressWarnings("unchecked")
    public <T extends CommandBase> void send(T command) {
        // 執行驗證
        CommandValidator<T> validator = (CommandValidator<T>) validators.get(command.getClass());
        if (validator != null) {
            ValidationResult result = validator.validate(command);
            if (!result.isValid()) {
                throw new IllegalArgumentException("Command validation failed: " + result.getErrors());
            }
        }
        
        // 執行命令
        commandBus.send(command);
    }
    
    @Override
    public <T extends CommandBase> CompletableFuture<Void> sendAsync(T command) {
        return CompletableFuture.runAsync(() -> send(command));
    }
}
```

## 8. 命令模式的最佳實踐

### 錯誤處理和重試

```java
// 命令執行結果
public class CommandResult {
    private final boolean success;
    private final String message;
    private final Exception exception;
    
    public CommandResult(boolean success, String message, Exception exception) {
        this.success = success;
        this.message = message;
        this.exception = exception;
    }
    
    public static CommandResult success(String message) {
        return new CommandResult(true, message, null);
    }
    
    public static CommandResult failure(String message, Exception exception) {
        return new CommandResult(false, message, exception);
    }
    
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public Exception getException() { return exception; }
}

// 帶重試的命令總線
@Component
public class RetryableCommandBus implements CommandBus {
    private final CommandBus commandBus;
    private final int maxRetries;
    private final long retryDelayMs;
    
    public RetryableCommandBus(CommandBus commandBus, int maxRetries, long retryDelayMs) {
        this.commandBus = commandBus;
        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }
    
    @Override
    public <T extends CommandBase> void send(T command) {
        int attempts = 0;
        Exception lastException = null;
        
        while (attempts <= maxRetries) {
            try {
                commandBus.send(command);
                return; // 成功執行
            } catch (Exception e) {
                lastException = e;
                attempts++;
                
                if (attempts <= maxRetries) {
                    System.out.println("Command failed, retrying... (attempt " + attempts + "/" + maxRetries + ")");
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Command retry interrupted", ie);
                    }
                }
            }
        }
        
        throw new RuntimeException("Command failed after " + maxRetries + " retries", lastException);
    }
    
    @Override
    public <T extends CommandBase> CompletableFuture<Void> sendAsync(T command) {
        return CompletableFuture.runAsync(() -> send(command));
    }
}
```

### 命令模式測試

```java
@ExtendWith(MockitoExtension.class)
class CommandPatternTest {
    
    @Test
    void shouldExecuteCommandSuccessfully() {
        // Given
        TextEditor editor = new TextEditor();
        Command command = new InsertTextCommand(editor, "Hello World");
        
        // When
        command.execute();
        
        // Then
        assertEquals("Hello World", editor.getContent());
    }
    
    @Test
    void shouldUndoCommandSuccessfully() {
        // Given
        TextEditor editor = new TextEditor();
        Command command = new InsertTextCommand(editor, "Hello World");
        
        // When
        command.execute();
        command.undo();
        
        // Then
        assertEquals("", editor.getContent());
    }
    
    @Test
    void shouldHandleCommandHistory() {
        // Given
        TextEditor editor = new TextEditor();
        CommandInvoker invoker = new CommandInvoker(10);
        
        // When
        invoker.executeCommand(new InsertTextCommand(editor, "Hello"));
        invoker.executeCommand(new InsertTextCommand(editor, " World"));
        
        // Then
        assertEquals("Hello World", editor.getContent());
        assertTrue(invoker.canUndo());
        
        invoker.undo();
        assertEquals("Hello", editor.getContent());
        
        assertTrue(invoker.canRedo());
        invoker.redo();
        assertEquals("Hello World", editor.getContent());
    }
}

// CQRS 測試
@SpringBootTest
class CQRSTest {
    
    @Autowired
    private CommandBus commandBus;
    
    @Autowired
    private QueryBus queryBus;
    
    @Test
    void shouldHandleCreateUserCommand() {
        // Given
        CreateUserCommand command = new CreateUserCommand("test@example.com", "Test User");
        
        // When
        commandBus.send(command);
        
        // Then
        GetUserByEmailQuery query = new GetUserByEmailQuery("test@example.com");
        User user = queryBus.send(query);
        
        assertNotNull(user);
        assertEquals("test@example.com", user.getEmail());
        assertEquals("Test User", user.getName());
    }
    
    @Test
    void shouldHandleUpdateUserNameCommand() {
        // Given
        CreateUserCommand createCommand = new CreateUserCommand("test@example.com", "Test User");
        commandBus.send(createCommand);
        
        GetUserByEmailQuery query = new GetUserByEmailQuery("test@example.com");
        User user = queryBus.send(query);
        
        // When
        UpdateUserNameCommand updateCommand = new UpdateUserNameCommand(user.getId(), "Updated Name");
        commandBus.send(updateCommand);
        
        // Then
        User updatedUser = queryBus.send(new GetUserByIdQuery(user.getId()));
        assertEquals("Updated Name", updatedUser.getName());
    }
}
```

## 9. 總結

### 適用場景

1. **GUI 應用**: 實現菜單操作、工具欄按鈕等
2. **撤銷重做**: 需要支持撤銷重做功能的系統
3. **宏操作**: 需要錄製和回放一系列操作
4. **事務處理**: 需要將操作封裝為事務的系統
5. **異步處理**: 需要將請求排隊處理的系統

### 關鍵要點

- **封裝請求**: 將請求封裝為對象
- **解耦調用者和接收者**: 調用者無需知道接收者的具體實現
- **支持撤銷重做**: 通過 undo 方法實現撤銷功能
- **支持日誌和審計**: 便於記錄操作歷史
- **支持宏命令**: 可以組合多個命令

### 企業級應用

- **CQRS**: 分離命令和查詢的職責
- **命令總線**: 統一管理命令的分發和處理
- **審計日誌**: 記錄所有命令的執行情況
- **異步處理**: 支持命令的異步執行
- **驗證和重試**: 確保命令執行的可靠性

### 與其他模式的關係

- **策略模式**: 命令模式封裝動作，策略模式封裝算法
- **觀察者模式**: 命令執行後可以通知觀察者
- **職責鏈模式**: 可以將命令沿著職責鏈傳遞
- **備忘錄模式**: 結合使用實現複雜的撤銷重做功能

命令模式在現代企業級應用中扮演著重要角色，特別是在 CQRS 架構和事件驅動系統中。結合 Spring Boot 和現代 Java 特性，可以構建出高度可維護和可擴展的系統架構。