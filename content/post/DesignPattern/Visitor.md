---
title: "訪問者模式 (Visitor Pattern) 企業級實作指南：AST 處理、Spring Boot 驗證與現代化訪問者實現最佳實踐"
author: Bill.Lin
date: 2018-08-07T22:38:06+08:00
draft: false
tags: ["Design Pattern", "Visitor Pattern", "Behavioral Pattern", "AST Processing", "Spring Boot", "Bean Validation", "Enterprise Architecture", "Code Analysis", "Compiler Design", "Tree Traversal", "Object Structure", "Double Dispatch", "Polymorphism", "Java", "Best Practices"]
Description: "深入探討訪問者模式的企業級實作指南，包含 AST 處理、Spring Boot 驗證框架整合與現代化訪問者模式實現最佳實踐"
Categories: ["DesignPattern"]
DisableComments: false
---

## 訪問者模式 (Visitor Pattern) 企業級實作指南

### 模式概述

訪問者模式是一種行為設計模式，它允許在不改變既有類結構的情況下，為對象層次結構添加新的操作。該模式將操作邏輯從對象中分離出來，放置在專門的訪問者類中，實現了算法與數據結構的分離。在企業級應用中，訪問者模式廣泛應用於 AST 處理、編譯器設計、數據驗證和複雜業務規則處理等場景。

### 核心概念

#### 1. 訪問者模式解決的問題

- **操作與數據分離**：將複雜的操作邏輯從數據結構中分離出來
- **擴展性**：在不修改現有類的情況下添加新操作
- **雙分派**：通過雙重分派機制實現類型安全的操作調用
- **複雜遍歷**：處理複雜的對象結構遍歷和操作
- **企業級驗證**：實現複雜的業務規則和驗證邏輯

#### 2. 訪問者模式架構

```java
/**
 * 訪問者接口 - 定義對各種元素的訪問操作
 */
public interface Visitor<T> {
    T visit(ConcreteElementA element);
    T visit(ConcreteElementB element);
    T visit(ConcreteElementC element);
}

/**
 * 元素接口 - 定義接受訪問者的方法
 */
public interface Element {
    <T> T accept(Visitor<T> visitor);
}

/**
 * 抽象元素基類
 */
public abstract class AbstractElement implements Element {
    protected String name;
    protected Map<String, Object> attributes;
    
    public AbstractElement(String name) {
        this.name = name;
        this.attributes = new HashMap<>();
    }
    
    public String getName() { return name; }
    public void setAttribute(String key, Object value) { attributes.put(key, value); }
    public Object getAttribute(String key) { return attributes.get(key); }
    public Map<String, Object> getAttributes() { return Collections.unmodifiableMap(attributes); }
}

/**
 * 具體元素實現
 */
public class ConcreteElementA extends AbstractElement {
    private String specificDataA;
    
    public ConcreteElementA(String name, String specificDataA) {
        super(name);
        this.specificDataA = specificDataA;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public String getSpecificDataA() { return specificDataA; }
    public void setSpecificDataA(String specificDataA) { this.specificDataA = specificDataA; }
}

public class ConcreteElementB extends AbstractElement {
    private Integer specificDataB;
    
    public ConcreteElementB(String name, Integer specificDataB) {
        super(name);
        this.specificDataB = specificDataB;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public Integer getSpecificDataB() { return specificDataB; }
    public void setSpecificDataB(Integer specificDataB) { this.specificDataB = specificDataB; }
}

public class ConcreteElementC extends AbstractElement {
    private List<Element> children;
    
    public ConcreteElementC(String name) {
        super(name);
        this.children = new ArrayList<>();
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public void addChild(Element child) { children.add(child); }
    public List<Element> getChildren() { return Collections.unmodifiableList(children); }
}
```

## 基礎實作範例

### 1. 企業級文件處理系統

```java
/**
 * 文件系統元素接口
 */
public interface FileSystemElement extends Element {
    String getPath();
    long getSize();
    LocalDateTime getLastModified();
    String getOwner();
    Set<String> getPermissions();
}

/**
 * 文件實現
 */
public class File extends AbstractElement implements FileSystemElement {
    private final String path;
    private final long size;
    private final LocalDateTime lastModified;
    private final String owner;
    private final Set<String> permissions;
    private final String extension;
    private final String mimeType;
    
    public File(String name, String path, long size, String owner, Set<String> permissions) {
        super(name);
        this.path = path;
        this.size = size;
        this.lastModified = LocalDateTime.now();
        this.owner = owner;
        this.permissions = new HashSet<>(permissions);
        this.extension = extractExtension(name);
        this.mimeType = determineMimeType(extension);
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    private String extractExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1) : "";
    }
    
    private String determineMimeType(String extension) {
        switch (extension.toLowerCase()) {
            case "txt": return "text/plain";
            case "pdf": return "application/pdf";
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "xml": return "application/xml";
            case "json": return "application/json";
            default: return "application/octet-stream";
        }
    }
    
    // Getters
    @Override public String getPath() { return path; }
    @Override public long getSize() { return size; }
    @Override public LocalDateTime getLastModified() { return lastModified; }
    @Override public String getOwner() { return owner; }
    @Override public Set<String> getPermissions() { return permissions; }
    public String getExtension() { return extension; }
    public String getMimeType() { return mimeType; }
}

/**
 * 目錄實現
 */
public class Directory extends AbstractElement implements FileSystemElement {
    private final String path;
    private final String owner;
    private final Set<String> permissions;
    private final LocalDateTime lastModified;
    private final List<FileSystemElement> children;
    
    public Directory(String name, String path, String owner, Set<String> permissions) {
        super(name);
        this.path = path;
        this.owner = owner;
        this.permissions = new HashSet<>(permissions);
        this.lastModified = LocalDateTime.now();
        this.children = new ArrayList<>();
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public void addChild(FileSystemElement child) { children.add(child); }
    public List<FileSystemElement> getChildren() { return Collections.unmodifiableList(children); }
    
    @Override
    public long getSize() {
        return children.stream()
            .mapToLong(FileSystemElement::getSize)
            .sum();
    }
    
    // Getters
    @Override public String getPath() { return path; }
    @Override public LocalDateTime getLastModified() { return lastModified; }
    @Override public String getOwner() { return owner; }
    @Override public Set<String> getPermissions() { return permissions; }
}

/**
 * 符號連結實現
 */
public class SymbolicLink extends AbstractElement implements FileSystemElement {
    private final String path;
    private final String targetPath;
    private final String owner;
    private final Set<String> permissions;
    private final LocalDateTime lastModified;
    
    public SymbolicLink(String name, String path, String targetPath, String owner, Set<String> permissions) {
        super(name);
        this.path = path;
        this.targetPath = targetPath;
        this.owner = owner;
        this.permissions = new HashSet<>(permissions);
        this.lastModified = LocalDateTime.now();
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    @Override
    public long getSize() { return 0; } // 符號連結本身不占用空間
    
    // Getters
    @Override public String getPath() { return path; }
    @Override public LocalDateTime getLastModified() { return lastModified; }
    @Override public String getOwner() { return owner; }
    @Override public Set<String> getPermissions() { return permissions; }
    public String getTargetPath() { return targetPath; }
}
```

### 2. 文件系統訪問者實現

```java
/**
 * 文件系統訪問者接口
 */
public interface FileSystemVisitor<T> extends Visitor<T> {
    T visit(File file);
    T visit(Directory directory);
    T visit(SymbolicLink symbolicLink);
}

/**
 * 文件大小計算訪問者
 */
public class FileSizeCalculatorVisitor implements FileSystemVisitor<Long> {
    private final Logger logger = LoggerFactory.getLogger(FileSizeCalculatorVisitor.class);
    
    @Override
    public Long visit(File file) {
        logger.debug("計算文件大小: {} = {} bytes", file.getName(), file.getSize());
        return file.getSize();
    }
    
    @Override
    public Long visit(Directory directory) {
        long totalSize = 0;
        logger.debug("計算目錄大小: {}", directory.getName());
        
        for (FileSystemElement child : directory.getChildren()) {
            totalSize += child.accept(this);
        }
        
        logger.debug("目錄總大小: {} = {} bytes", directory.getName(), totalSize);
        return totalSize;
    }
    
    @Override
    public Long visit(SymbolicLink symbolicLink) {
        logger.debug("符號連結大小: {} = 0 bytes", symbolicLink.getName());
        return 0L;
    }
}

/**
 * 文件權限檢查訪問者
 */
public class FilePermissionCheckerVisitor implements FileSystemVisitor<Boolean> {
    private final String requiredPermission;
    private final Logger logger = LoggerFactory.getLogger(FilePermissionCheckerVisitor.class);
    
    public FilePermissionCheckerVisitor(String requiredPermission) {
        this.requiredPermission = requiredPermission;
    }
    
    @Override
    public Boolean visit(File file) {
        boolean hasPermission = file.getPermissions().contains(requiredPermission);
        logger.debug("檢查文件權限: {} - {} = {}", file.getName(), requiredPermission, hasPermission);
        return hasPermission;
    }
    
    @Override
    public Boolean visit(Directory directory) {
        boolean hasPermission = directory.getPermissions().contains(requiredPermission);
        logger.debug("檢查目錄權限: {} - {} = {}", directory.getName(), requiredPermission, hasPermission);
        return hasPermission;
    }
    
    @Override
    public Boolean visit(SymbolicLink symbolicLink) {
        boolean hasPermission = symbolicLink.getPermissions().contains(requiredPermission);
        logger.debug("檢查符號連結權限: {} - {} = {}", symbolicLink.getName(), requiredPermission, hasPermission);
        return hasPermission;
    }
}

/**
 * 文件報告生成訪問者
 */
public class FileReportGeneratorVisitor implements FileSystemVisitor<FileReport> {
    private final Logger logger = LoggerFactory.getLogger(FileReportGeneratorVisitor.class);
    
    @Override
    public FileReport visit(File file) {
        FileReport report = new FileReport();
        report.setName(file.getName());
        report.setPath(file.getPath());
        report.setType("FILE");
        report.setSize(file.getSize());
        report.setOwner(file.getOwner());
        report.setPermissions(file.getPermissions());
        report.setLastModified(file.getLastModified());
        report.setExtension(file.getExtension());
        report.setMimeType(file.getMimeType());
        
        logger.debug("生成文件報告: {}", file.getName());
        return report;
    }
    
    @Override
    public FileReport visit(Directory directory) {
        FileReport report = new FileReport();
        report.setName(directory.getName());
        report.setPath(directory.getPath());
        report.setType("DIRECTORY");
        report.setSize(directory.getSize());
        report.setOwner(directory.getOwner());
        report.setPermissions(directory.getPermissions());
        report.setLastModified(directory.getLastModified());
        report.setChildCount(directory.getChildren().size());
        
        // 遞歸生成子項目報告
        List<FileReport> childReports = new ArrayList<>();
        for (FileSystemElement child : directory.getChildren()) {
            childReports.add(child.accept(this));
        }
        report.setChildren(childReports);
        
        logger.debug("生成目錄報告: {} (包含 {} 子項目)", directory.getName(), childReports.size());
        return report;
    }
    
    @Override
    public FileReport visit(SymbolicLink symbolicLink) {
        FileReport report = new FileReport();
        report.setName(symbolicLink.getName());
        report.setPath(symbolicLink.getPath());
        report.setType("SYMBOLIC_LINK");
        report.setSize(0L);
        report.setOwner(symbolicLink.getOwner());
        report.setPermissions(symbolicLink.getPermissions());
        report.setLastModified(symbolicLink.getLastModified());
        report.setTargetPath(symbolicLink.getTargetPath());
        
        logger.debug("生成符號連結報告: {}", symbolicLink.getName());
        return report;
    }
}

/**
 * 文件報告 DTO
 */
public class FileReport {
    private String name;
    private String path;
    private String type;
    private Long size;
    private String owner;
    private Set<String> permissions;
    private LocalDateTime lastModified;
    private String extension;
    private String mimeType;
    private String targetPath;
    private Integer childCount;
    private List<FileReport> children;
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public Set<String> getPermissions() { return permissions; }
    public void setPermissions(Set<String> permissions) { this.permissions = permissions; }
    public LocalDateTime getLastModified() { return lastModified; }
    public void setLastModified(LocalDateTime lastModified) { this.lastModified = lastModified; }
    public String getExtension() { return extension; }
    public void setExtension(String extension) { this.extension = extension; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public String getTargetPath() { return targetPath; }
    public void setTargetPath(String targetPath) { this.targetPath = targetPath; }
    public Integer getChildCount() { return childCount; }
    public void setChildCount(Integer childCount) { this.childCount = childCount; }
    public List<FileReport> getChildren() { return children; }
    public void setChildren(List<FileReport> children) { this.children = children; }
}
```

### 3. 使用範例

```java
/**
 * 文件系統訪問者模式使用範例
 */
public class FileSystemVisitorExample {
    
    public static void main(String[] args) {
        // 建立文件系統結構
        Directory root = createFileSystemStructure();
        
        // 1. 計算總大小
        System.out.println("=== 文件系統大小計算 ===");
        demonstrateSizeCalculation(root);
        
        // 2. 權限檢查
        System.out.println("\n=== 權限檢查 ===");
        demonstratePermissionCheck(root);
        
        // 3. 生成報告
        System.out.println("\n=== 報告生成 ===");
        demonstrateReportGeneration(root);
    }
    
    private static Directory createFileSystemStructure() {
        Directory root = new Directory("root", "/", "admin", Set.of("read", "write", "execute"));
        
        Directory documents = new Directory("documents", "/documents", "user", Set.of("read", "write"));
        File readme = new File("readme.txt", "/documents/readme.txt", 1024, "user", Set.of("read"));
        File config = new File("config.xml", "/documents/config.xml", 2048, "user", Set.of("read", "write"));
        documents.addChild(readme);
        documents.addChild(config);
        
        Directory images = new Directory("images", "/images", "user", Set.of("read"));
        File photo1 = new File("photo1.jpg", "/images/photo1.jpg", 1048576, "user", Set.of("read"));
        File photo2 = new File("photo2.png", "/images/photo2.png", 2097152, "user", Set.of("read"));
        images.addChild(photo1);
        images.addChild(photo2);
        
        SymbolicLink link = new SymbolicLink("docs_link", "/docs_link", "/documents", "user", Set.of("read"));
        
        root.addChild(documents);
        root.addChild(images);
        root.addChild(link);
        
        return root;
    }
    
    private static void demonstrateSizeCalculation(Directory root) {
        FileSizeCalculatorVisitor sizeCalculator = new FileSizeCalculatorVisitor();
        Long totalSize = root.accept(sizeCalculator);
        System.out.println("總大小: " + formatBytes(totalSize));
    }
    
    private static void demonstratePermissionCheck(Directory root) {
        FilePermissionCheckerVisitor writeChecker = new FilePermissionCheckerVisitor("write");
        FilePermissionCheckerVisitor executeChecker = new FilePermissionCheckerVisitor("execute");
        
        System.out.println("根目錄寫入權限: " + root.accept(writeChecker));
        System.out.println("根目錄執行權限: " + root.accept(executeChecker));
    }
    
    private static void demonstrateReportGeneration(Directory root) {
        FileReportGeneratorVisitor reportGenerator = new FileReportGeneratorVisitor();
        FileReport report = root.accept(reportGenerator);
        
        System.out.println("文件系統報告:");
        printReport(report, 0);
    }
    
    private static void printReport(FileReport report, int depth) {
        String indent = "  ".repeat(depth);
        System.out.println(String.format("%s%s (%s) - %s", 
            indent, report.getName(), report.getType(), formatBytes(report.getSize())));
        
        if (report.getChildren() != null) {
            for (FileReport child : report.getChildren()) {
                printReport(child, depth + 1);
            }
        }
    }
    
    private static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024) + " KB";
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)) + " MB";
        return (bytes / (1024 * 1024 * 1024)) + " GB";
    }
}
```

## AST 處理應用

### 1. 表達式 AST 節點定義

```java
/**
 * 表達式 AST 節點基類
 */
public abstract class ExpressionNode implements Element {
    protected final String nodeType;
    protected final int line;
    protected final int column;
    
    public ExpressionNode(String nodeType, int line, int column) {
        this.nodeType = nodeType;
        this.line = line;
        this.column = column;
    }
    
    public String getNodeType() { return nodeType; }
    public int getLine() { return line; }
    public int getColumn() { return column; }
    
    @Override
    public abstract <T> T accept(Visitor<T> visitor);
}

/**
 * 數值字面值節點
 */
public class NumberLiteralNode extends ExpressionNode {
    private final double value;
    
    public NumberLiteralNode(double value, int line, int column) {
        super("NUMBER_LITERAL", line, column);
        this.value = value;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public double getValue() { return value; }
}

/**
 * 變數節點
 */
public class VariableNode extends ExpressionNode {
    private final String name;
    
    public VariableNode(String name, int line, int column) {
        super("VARIABLE", line, column);
        this.name = name;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public String getName() { return name; }
}

/**
 * 二元運算節點
 */
public class BinaryOperatorNode extends ExpressionNode {
    private final ExpressionNode left;
    private final String operator;
    private final ExpressionNode right;
    
    public BinaryOperatorNode(ExpressionNode left, String operator, ExpressionNode right, int line, int column) {
        super("BINARY_OPERATOR", line, column);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public ExpressionNode getLeft() { return left; }
    public String getOperator() { return operator; }
    public ExpressionNode getRight() { return right; }
}

/**
 * 函式呼叫節點
 */
public class FunctionCallNode extends ExpressionNode {
    private final String functionName;
    private final List<ExpressionNode> arguments;
    
    public FunctionCallNode(String functionName, List<ExpressionNode> arguments, int line, int column) {
        super("FUNCTION_CALL", line, column);
        this.functionName = functionName;
        this.arguments = new ArrayList<>(arguments);
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    public String getFunctionName() { return functionName; }
    public List<ExpressionNode> getArguments() { return Collections.unmodifiableList(arguments); }
}
```

### 2. AST 訪問者實現

```java
/**
 * 表達式訪問者接口
 */
public interface ExpressionVisitor<T> extends Visitor<T> {
    T visit(NumberLiteralNode node);
    T visit(VariableNode node);
    T visit(BinaryOperatorNode node);
    T visit(FunctionCallNode node);
}

/**
 * 表達式計算訪問者
 */
public class ExpressionEvaluatorVisitor implements ExpressionVisitor<Double> {
    private final Map<String, Double> variables;
    private final Map<String, Function<List<Double>, Double>> functions;
    private final Logger logger = LoggerFactory.getLogger(ExpressionEvaluatorVisitor.class);
    
    public ExpressionEvaluatorVisitor() {
        this.variables = new HashMap<>();
        this.functions = new HashMap<>();
        initializeBuiltinFunctions();
    }
    
    public void setVariable(String name, double value) {
        variables.put(name, value);
    }
    
    public void setFunction(String name, Function<List<Double>, Double> function) {
        functions.put(name, function);
    }
    
    private void initializeBuiltinFunctions() {
        functions.put("sin", args -> Math.sin(args.get(0)));
        functions.put("cos", args -> Math.cos(args.get(0)));
        functions.put("sqrt", args -> Math.sqrt(args.get(0)));
        functions.put("max", args -> Collections.max(args));
        functions.put("min", args -> Collections.min(args));
        functions.put("avg", args -> args.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
    }
    
    @Override
    public Double visit(NumberLiteralNode node) {
        logger.debug("計算數值字面值: {}", node.getValue());
        return node.getValue();
    }
    
    @Override
    public Double visit(VariableNode node) {
        Double value = variables.get(node.getName());
        if (value == null) {
            throw new RuntimeException("未定義的變數: " + node.getName() + " at line " + node.getLine());
        }
        logger.debug("取得變數值: {} = {}", node.getName(), value);
        return value;
    }
    
    @Override
    public Double visit(BinaryOperatorNode node) {
        Double leftValue = node.getLeft().accept(this);
        Double rightValue = node.getRight().accept(this);
        
        double result;
        switch (node.getOperator()) {
            case "+":
                result = leftValue + rightValue;
                break;
            case "-":
                result = leftValue - rightValue;
                break;
            case "*":
                result = leftValue * rightValue;
                break;
            case "/":
                if (rightValue == 0) {
                    throw new RuntimeException("除零錯誤 at line " + node.getLine());
                }
                result = leftValue / rightValue;
                break;
            case "^":
                result = Math.pow(leftValue, rightValue);
                break;
            default:
                throw new RuntimeException("不支援的運算子: " + node.getOperator() + " at line " + node.getLine());
        }
        
        logger.debug("計算二元運算: {} {} {} = {}", leftValue, node.getOperator(), rightValue, result);
        return result;
    }
    
    @Override
    public Double visit(FunctionCallNode node) {
        Function<List<Double>, Double> function = functions.get(node.getFunctionName());
        if (function == null) {
            throw new RuntimeException("未定義的函式: " + node.getFunctionName() + " at line " + node.getLine());
        }
        
        List<Double> argValues = new ArrayList<>();
        for (ExpressionNode arg : node.getArguments()) {
            argValues.add(arg.accept(this));
        }
        
        double result = function.apply(argValues);
        logger.debug("呼叫函式: {}({}) = {}", node.getFunctionName(), argValues, result);
        return result;
    }
}

/**
 * 表達式格式化訪問者
 */
public class ExpressionFormatterVisitor implements ExpressionVisitor<String> {
    private final Logger logger = LoggerFactory.getLogger(ExpressionFormatterVisitor.class);
    
    @Override
    public String visit(NumberLiteralNode node) {
        return String.valueOf(node.getValue());
    }
    
    @Override
    public String visit(VariableNode node) {
        return node.getName();
    }
    
    @Override
    public String visit(BinaryOperatorNode node) {
        String leftStr = node.getLeft().accept(this);
        String rightStr = node.getRight().accept(this);
        
        // 根據運算子優先權決定是否加括號
        if (needsParentheses(node.getLeft(), node.getOperator())) {
            leftStr = "(" + leftStr + ")";
        }
        if (needsParentheses(node.getRight(), node.getOperator())) {
            rightStr = "(" + rightStr + ")";
        }
        
        return leftStr + " " + node.getOperator() + " " + rightStr;
    }
    
    @Override
    public String visit(FunctionCallNode node) {
        StringBuilder sb = new StringBuilder();
        sb.append(node.getFunctionName()).append("(");
        
        for (int i = 0; i < node.getArguments().size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(node.getArguments().get(i).accept(this));
        }
        
        sb.append(")");
        return sb.toString();
    }
    
    private boolean needsParentheses(ExpressionNode node, String parentOperator) {
        if (!(node instanceof BinaryOperatorNode)) {
            return false;
        }
        
        BinaryOperatorNode binaryNode = (BinaryOperatorNode) node;
        return getOperatorPrecedence(binaryNode.getOperator()) < getOperatorPrecedence(parentOperator);
    }
    
    private int getOperatorPrecedence(String operator) {
        switch (operator) {
            case "+":
            case "-":
                return 1;
            case "*":
            case "/":
                return 2;
            case "^":
                return 3;
            default:
                return 0;
        }
    }
}

/**
 * 表達式分析訪問者
 */
public class ExpressionAnalyzerVisitor implements ExpressionVisitor<ExpressionAnalysisResult> {
    private final Logger logger = LoggerFactory.getLogger(ExpressionAnalyzerVisitor.class);
    
    @Override
    public ExpressionAnalysisResult visit(NumberLiteralNode node) {
        return new ExpressionAnalysisResult()
            .setDepth(0)
            .setNodeCount(1)
            .addLiteral(node.getValue());
    }
    
    @Override
    public ExpressionAnalysisResult visit(VariableNode node) {
        return new ExpressionAnalysisResult()
            .setDepth(0)
            .setNodeCount(1)
            .addVariable(node.getName());
    }
    
    @Override
    public ExpressionAnalysisResult visit(BinaryOperatorNode node) {
        ExpressionAnalysisResult leftResult = node.getLeft().accept(this);
        ExpressionAnalysisResult rightResult = node.getRight().accept(this);
        
        return new ExpressionAnalysisResult()
            .setDepth(Math.max(leftResult.getDepth(), rightResult.getDepth()) + 1)
            .setNodeCount(leftResult.getNodeCount() + rightResult.getNodeCount() + 1)
            .addOperator(node.getOperator())
            .merge(leftResult)
            .merge(rightResult);
    }
    
    @Override
    public ExpressionAnalysisResult visit(FunctionCallNode node) {
        ExpressionAnalysisResult result = new ExpressionAnalysisResult()
            .setDepth(0)
            .setNodeCount(1)
            .addFunction(node.getFunctionName());
        
        for (ExpressionNode arg : node.getArguments()) {
            ExpressionAnalysisResult argResult = arg.accept(this);
            result.setDepth(Math.max(result.getDepth(), argResult.getDepth() + 1));
            result.setNodeCount(result.getNodeCount() + argResult.getNodeCount());
            result.merge(argResult);
        }
        
        return result;
    }
}

/**
 * 表達式分析結果
 */
public class ExpressionAnalysisResult {
    private int depth;
    private int nodeCount;
    private Set<String> variables = new HashSet<>();
    private Set<String> functions = new HashSet<>();
    private Set<String> operators = new HashSet<>();
    private Set<Double> literals = new HashSet<>();
    
    public ExpressionAnalysisResult setDepth(int depth) {
        this.depth = depth;
        return this;
    }
    
    public ExpressionAnalysisResult setNodeCount(int nodeCount) {
        this.nodeCount = nodeCount;
        return this;
    }
    
    public ExpressionAnalysisResult addVariable(String variable) {
        variables.add(variable);
        return this;
    }
    
    public ExpressionAnalysisResult addFunction(String function) {
        functions.add(function);
        return this;
    }
    
    public ExpressionAnalysisResult addOperator(String operator) {
        operators.add(operator);
        return this;
    }
    
    public ExpressionAnalysisResult addLiteral(double literal) {
        literals.add(literal);
        return this;
    }
    
    public ExpressionAnalysisResult merge(ExpressionAnalysisResult other) {
        this.variables.addAll(other.variables);
        this.functions.addAll(other.functions);
        this.operators.addAll(other.operators);
        this.literals.addAll(other.literals);
        return this;
    }
    
    // Getters
    public int getDepth() { return depth; }
    public int getNodeCount() { return nodeCount; }
    public Set<String> getVariables() { return variables; }
    public Set<String> getFunctions() { return functions; }
    public Set<String> getOperators() { return operators; }
    public Set<Double> getLiterals() { return literals; }
}
```

### 3. AST 應用範例

```java
/**
 * AST 訪問者模式應用範例
 */
public class ASTVisitorExample {
    
    public static void main(String[] args) {
        // 建立表達式 AST: (x + 2) * sin(y)
        ExpressionNode expression = createExpressionAST();
        
        // 1. 表達式計算
        System.out.println("=== 表達式計算 ===");
        demonstrateExpressionEvaluation(expression);
        
        // 2. 表達式格式化
        System.out.println("\n=== 表達式格式化 ===");
        demonstrateExpressionFormatting(expression);
        
        // 3. 表達式分析
        System.out.println("\n=== 表達式分析 ===");
        demonstrateExpressionAnalysis(expression);
    }
    
    private static ExpressionNode createExpressionAST() {
        // 創建 (x + 2) * sin(y)
        VariableNode x = new VariableNode("x", 1, 1);
        NumberLiteralNode two = new NumberLiteralNode(2.0, 1, 5);
        BinaryOperatorNode xPlus2 = new BinaryOperatorNode(x, "+", two, 1, 3);
        
        VariableNode y = new VariableNode("y", 1, 15);
        FunctionCallNode sinY = new FunctionCallNode("sin", Arrays.asList(y), 1, 11);
        
        return new BinaryOperatorNode(xPlus2, "*", sinY, 1, 9);
    }
    
    private static void demonstrateExpressionEvaluation(ExpressionNode expression) {
        ExpressionEvaluatorVisitor evaluator = new ExpressionEvaluatorVisitor();
        evaluator.setVariable("x", 3.0);
        evaluator.setVariable("y", Math.PI / 6); // 30 度
        
        double result = expression.accept(evaluator);
        System.out.println("表達式結果: " + result);
    }
    
    private static void demonstrateExpressionFormatting(ExpressionNode expression) {
        ExpressionFormatterVisitor formatter = new ExpressionFormatterVisitor();
        String formatted = expression.accept(formatter);
        System.out.println("格式化表達式: " + formatted);
    }
    
    private static void demonstrateExpressionAnalysis(ExpressionNode expression) {
        ExpressionAnalyzerVisitor analyzer = new ExpressionAnalyzerVisitor();
        ExpressionAnalysisResult analysis = expression.accept(analyzer);
        
        System.out.println("表達式分析結果:");
        System.out.println("- 深度: " + analysis.getDepth());
        System.out.println("- 節點數: " + analysis.getNodeCount());
        System.out.println("- 變數: " + analysis.getVariables());
        System.out.println("- 函式: " + analysis.getFunctions());
        System.out.println("- 運算子: " + analysis.getOperators());
        System.out.println("- 字面值: " + analysis.getLiterals());
    }
}
```

## Spring Boot 整合

### 1. 企業級驗證系統

```java
/**
 * 驗證元素接口
 */
public interface ValidatableElement extends Element {
    String getElementName();
    String getElementPath();
    Object getValue();
    String getValidationGroup();
}

/**
 * 企業級用戶實體
 */
@Entity
@Table(name = "users")
public class User implements ValidatableElement {
    
    @Id
    private String userId;
    
    @NotBlank
    @Size(min = 2, max = 50)
    private String name;
    
    @NotBlank
    @Email
    private String email;
    
    @NotNull
    @Min(18)
    @Max(120)
    private Integer age;
    
    @NotBlank
    @Pattern(regexp = "^\\+?[0-9. ()-]{7,25}$")
    private String phoneNumber;
    
    @NotNull
    @Past
    private LocalDate birthDate;
    
    @Valid
    private Address address;
    
    @ElementCollection
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();
    
    // Constructors
    public User() {}
    
    public User(String userId, String name, String email, Integer age) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.age = age;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    @Override
    public String getElementName() { return "User"; }
    
    @Override
    public String getElementPath() { return "/users/" + userId; }
    
    @Override
    public Object getValue() { return this; }
    
    @Override
    public String getValidationGroup() { return "user-validation"; }
    
    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
}

/**
 * 地址實體
 */
@Embeddable
public class Address implements ValidatableElement {
    
    @NotBlank
    @Size(max = 100)
    private String street;
    
    @NotBlank
    @Size(max = 50)
    private String city;
    
    @NotBlank
    @Size(max = 50)
    private String state;
    
    @NotBlank
    @Pattern(regexp = "^\\d{5}(-\\d{4})?$")
    private String zipCode;
    
    @NotBlank
    @Size(max = 50)
    private String country;
    
    // Constructors
    public Address() {}
    
    public Address(String street, String city, String state, String zipCode, String country) {
        this.street = street;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.country = country;
    }
    
    @Override
    public <T> T accept(Visitor<T> visitor) {
        return visitor.visit(this);
    }
    
    @Override
    public String getElementName() { return "Address"; }
    
    @Override
    public String getElementPath() { return "/address"; }
    
    @Override
    public Object getValue() { return this; }
    
    @Override
    public String getValidationGroup() { return "address-validation"; }
    
    // Getters and setters
    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
}

/**
 * 角色枚舉
 */
public enum Role {
    ADMIN("管理員"),
    USER("一般用戶"),
    MODERATOR("版主"),
    GUEST("訪客");
    
    private final String description;
    
    Role(String description) {
        this.description = description;
    }
    
    public String getDescription() { return description; }
}
```

### 2. Spring Boot 驗證訪問者

```java
/**
 * 驗證訪問者接口
 */
public interface ValidationVisitor<T> extends Visitor<T> {
    T visit(User user);
    T visit(Address address);
}

/**
 * Bean 驗證訪問者
 */
@Component
public class BeanValidationVisitor implements ValidationVisitor<ValidationResult> {
    
    private final Validator validator;
    private final Logger logger = LoggerFactory.getLogger(BeanValidationVisitor.class);
    
    public BeanValidationVisitor(Validator validator) {
        this.validator = validator;
    }
    
    @Override
    public ValidationResult visit(User user) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        
        ValidationResult result = new ValidationResult();
        result.setElementName("User");
        result.setElementPath(user.getElementPath());
        result.setValid(violations.isEmpty());
        
        for (ConstraintViolation<User> violation : violations) {
            ValidationError error = new ValidationError();
            error.setField(violation.getPropertyPath().toString());
            error.setMessage(violation.getMessage());
            error.setInvalidValue(violation.getInvalidValue());
            error.setErrorCode(violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName());
            result.addError(error);
        }
        
        // 驗證嵌套的地址對象
        if (user.getAddress() != null) {
            ValidationResult addressResult = user.getAddress().accept(this);
            result.merge(addressResult);
        }
        
        logger.debug("驗證用戶: {} - 結果: {}", user.getUserId(), result.isValid());
        return result;
    }
    
    @Override
    public ValidationResult visit(Address address) {
        Set<ConstraintViolation<Address>> violations = validator.validate(address);
        
        ValidationResult result = new ValidationResult();
        result.setElementName("Address");
        result.setElementPath(address.getElementPath());
        result.setValid(violations.isEmpty());
        
        for (ConstraintViolation<Address> violation : violations) {
            ValidationError error = new ValidationError();
            error.setField("address." + violation.getPropertyPath().toString());
            error.setMessage(violation.getMessage());
            error.setInvalidValue(violation.getInvalidValue());
            error.setErrorCode(violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName());
            result.addError(error);
        }
        
        logger.debug("驗證地址: {} - 結果: {}", address.getCity(), result.isValid());
        return result;
    }
}

/**
 * 業務規則驗證訪問者
 */
@Component
public class BusinessRuleValidationVisitor implements ValidationVisitor<ValidationResult> {
    
    private final UserService userService;
    private final Logger logger = LoggerFactory.getLogger(BusinessRuleValidationVisitor.class);
    
    public BusinessRuleValidationVisitor(UserService userService) {
        this.userService = userService;
    }
    
    @Override
    public ValidationResult visit(User user) {
        ValidationResult result = new ValidationResult();
        result.setElementName("User");
        result.setElementPath(user.getElementPath());
        result.setValid(true);
        
        // 檢查郵箱是否已被使用
        if (userService.existsByEmail(user.getEmail())) {
            ValidationError error = new ValidationError();
            error.setField("email");
            error.setMessage("郵箱地址已被其他用戶使用");
            error.setInvalidValue(user.getEmail());
            error.setErrorCode("DUPLICATE_EMAIL");
            result.addError(error);
        }
        
        // 檢查年齡與角色的一致性
        if (user.getAge() != null && user.getAge() < 18 && user.getRoles().contains(Role.ADMIN)) {
            ValidationError error = new ValidationError();
            error.setField("roles");
            error.setMessage("未成年用戶不能擁有管理員角色");
            error.setInvalidValue(user.getRoles());
            error.setErrorCode("INVALID_ROLE_FOR_AGE");
            result.addError(error);
        }
        
        // 檢查生日與年齡的一致性
        if (user.getBirthDate() != null && user.getAge() != null) {
            int calculatedAge = Period.between(user.getBirthDate(), LocalDate.now()).getYears();
            if (Math.abs(calculatedAge - user.getAge()) > 1) {
                ValidationError error = new ValidationError();
                error.setField("age");
                error.setMessage("年齡與生日不符");
                error.setInvalidValue(user.getAge());
                error.setErrorCode("AGE_BIRTHDATE_MISMATCH");
                result.addError(error);
            }
        }
        
        result.setValid(result.getErrors().isEmpty());
        logger.debug("業務規則驗證用戶: {} - 結果: {}", user.getUserId(), result.isValid());
        return result;
    }
    
    @Override
    public ValidationResult visit(Address address) {
        ValidationResult result = new ValidationResult();
        result.setElementName("Address");
        result.setElementPath(address.getElementPath());
        result.setValid(true);
        
        // 檢查國家與郵遞區號格式的一致性
        if ("US".equals(address.getCountry()) && !address.getZipCode().matches("^\\d{5}(-\\d{4})?$")) {
            ValidationError error = new ValidationError();
            error.setField("zipCode");
            error.setMessage("美國郵遞區號格式不正確");
            error.setInvalidValue(address.getZipCode());
            error.setErrorCode("INVALID_US_ZIPCODE");
            result.addError(error);
        }
        
        result.setValid(result.getErrors().isEmpty());
        logger.debug("業務規則驗證地址: {} - 結果: {}", address.getCity(), result.isValid());
        return result;
    }
}

/**
 * 驗證結果
 */
public class ValidationResult {
    private String elementName;
    private String elementPath;
    private boolean valid;
    private List<ValidationError> errors;
    private LocalDateTime validatedAt;
    
    public ValidationResult() {
        this.errors = new ArrayList<>();
        this.validatedAt = LocalDateTime.now();
    }
    
    public void addError(ValidationError error) {
        errors.add(error);
        this.valid = false;
    }
    
    public void merge(ValidationResult other) {
        this.errors.addAll(other.errors);
        if (!other.valid) {
            this.valid = false;
        }
    }
    
    // Getters and setters
    public String getElementName() { return elementName; }
    public void setElementName(String elementName) { this.elementName = elementName; }
    public String getElementPath() { return elementPath; }
    public void setElementPath(String elementPath) { this.elementPath = elementPath; }
    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public List<ValidationError> getErrors() { return errors; }
    public void setErrors(List<ValidationError> errors) { this.errors = errors; }
    public LocalDateTime getValidatedAt() { return validatedAt; }
    public void setValidatedAt(LocalDateTime validatedAt) { this.validatedAt = validatedAt; }
}

/**
 * 驗證錯誤
 */
public class ValidationError {
    private String field;
    private String message;
    private Object invalidValue;
    private String errorCode;
    
    // Getters and setters
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Object getInvalidValue() { return invalidValue; }
    public void setInvalidValue(Object invalidValue) { this.invalidValue = invalidValue; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
}
```

### 3. Spring Boot 服務層

```java
/**
 * 用戶服務接口
 */
public interface UserService {
    boolean existsByEmail(String email);
    User save(User user);
    User findById(String userId);
    List<User> findAll();
    void deleteById(String userId);
}

/**
 * 用戶服務實現
 */
@Service
@Transactional
public class UserServiceImpl implements UserService {
    
    private final UserRepository userRepository;
    private final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    
    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    
    @Override
    public User save(User user) {
        return userRepository.save(user);
    }
    
    @Override
    public User findById(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("用戶不存在: " + userId));
    }
    
    @Override
    public List<User> findAll() {
        return userRepository.findAll();
    }
    
    @Override
    public void deleteById(String userId) {
        userRepository.deleteById(userId);
    }
}

/**
 * 驗證服務
 */
@Service
public class ValidationService {
    
    private final BeanValidationVisitor beanValidationVisitor;
    private final BusinessRuleValidationVisitor businessRuleValidationVisitor;
    private final Logger logger = LoggerFactory.getLogger(ValidationService.class);
    
    public ValidationService(BeanValidationVisitor beanValidationVisitor,
                           BusinessRuleValidationVisitor businessRuleValidationVisitor) {
        this.beanValidationVisitor = beanValidationVisitor;
        this.businessRuleValidationVisitor = businessRuleValidationVisitor;
    }
    
    /**
     * 完整驗證
     */
    public ValidationResult validateComplete(ValidatableElement element) {
        ValidationResult beanResult = element.accept(beanValidationVisitor);
        ValidationResult businessResult = element.accept(businessRuleValidationVisitor);
        
        ValidationResult combinedResult = new ValidationResult();
        combinedResult.setElementName(element.getElementName());
        combinedResult.setElementPath(element.getElementPath());
        combinedResult.setValid(beanResult.isValid() && businessResult.isValid());
        
        combinedResult.merge(beanResult);
        combinedResult.merge(businessResult);
        
        logger.info("完整驗證 {}: {} - 錯誤數: {}", 
            element.getElementName(), 
            combinedResult.isValid() ? "通過" : "失敗", 
            combinedResult.getErrors().size());
        
        return combinedResult;
    }
    
    /**
     * 僅 Bean 驗證
     */
    public ValidationResult validateBeanOnly(ValidatableElement element) {
        ValidationResult result = element.accept(beanValidationVisitor);
        
        logger.info("Bean 驗證 {}: {} - 錯誤數: {}", 
            element.getElementName(), 
            result.isValid() ? "通過" : "失敗", 
            result.getErrors().size());
        
        return result;
    }
    
    /**
     * 僅業務規則驗證
     */
    public ValidationResult validateBusinessRulesOnly(ValidatableElement element) {
        ValidationResult result = element.accept(businessRuleValidationVisitor);
        
        logger.info("業務規則驗證 {}: {} - 錯誤數: {}", 
            element.getElementName(), 
            result.isValid() ? "通過" : "失敗", 
            result.getErrors().size());
        
        return result;
    }
    
    /**
     * 批量驗證
     */
    public List<ValidationResult> validateBatch(List<ValidatableElement> elements) {
        return elements.stream()
            .map(this::validateComplete)
            .collect(Collectors.toList());
    }
}

/**
 * 用戶存儲庫
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.age BETWEEN :minAge AND :maxAge")
    List<User> findByAgeRange(@Param("minAge") int minAge, @Param("maxAge") int maxAge);
    
    @Query("SELECT u FROM User u WHERE u.roles IN :roles")
    List<User> findByRoles(@Param("roles") Collection<Role> roles);
    
    @Query("SELECT u FROM User u WHERE u.address.city = :city")
    List<User> findByCity(@Param("city") String city);
}
```

### 4. REST API 控制器

```java
/**
 * 用戶 REST API
 */
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {
    
    private final UserService userService;
    private final ValidationService validationService;
    
    public UserController(UserService userService, ValidationService validationService) {
        this.userService = userService;
        this.validationService = validationService;
    }
    
    /**
     * 創建用戶
     */
    @PostMapping
    public ResponseEntity<UserCreationResponse> createUser(@RequestBody @Valid CreateUserRequest request) {
        // 將請求轉換為 User 實體
        User user = mapToUser(request);
        
        // 執行完整驗證
        ValidationResult validationResult = validationService.validateComplete(user);
        
        if (!validationResult.isValid()) {
            return ResponseEntity.badRequest()
                .body(UserCreationResponse.validationFailed(validationResult));
        }
        
        // 保存用戶
        User savedUser = userService.save(user);
        
        return ResponseEntity.ok(UserCreationResponse.success(savedUser));
    }
    
    /**
     * 驗證用戶資料
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidationResult> validateUser(@RequestBody @Valid ValidateUserRequest request) {
        User user = mapToUser(request);
        
        ValidationResult result = switch (request.getValidationType()) {
            case "bean" -> validationService.validateBeanOnly(user);
            case "business" -> validationService.validateBusinessRulesOnly(user);
            default -> validationService.validateComplete(user);
        };
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * 批量驗證用戶
     */
    @PostMapping("/validate/batch")
    public ResponseEntity<BatchValidationResponse> validateUsers(@RequestBody @Valid BatchValidateRequest request) {
        List<ValidatableElement> elements = request.getUsers().stream()
            .map(this::mapToUser)
            .collect(Collectors.toList());
        
        List<ValidationResult> results = validationService.validateBatch(elements);
        
        return ResponseEntity.ok(new BatchValidationResponse(results));
    }
    
    /**
     * 獲取用戶
     */
    @GetMapping("/{userId}")
    public ResponseEntity<User> getUser(@PathVariable String userId) {
        User user = userService.findById(userId);
        return ResponseEntity.ok(user);
    }
    
    /**
     * 更新用戶
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserUpdateResponse> updateUser(@PathVariable String userId,
                                                        @RequestBody @Valid UpdateUserRequest request) {
        User existingUser = userService.findById(userId);
        
        // 更新用戶資料
        updateUserFromRequest(existingUser, request);
        
        // 執行驗證
        ValidationResult validationResult = validationService.validateComplete(existingUser);
        
        if (!validationResult.isValid()) {
            return ResponseEntity.badRequest()
                .body(UserUpdateResponse.validationFailed(validationResult));
        }
        
        User updatedUser = userService.save(existingUser);
        
        return ResponseEntity.ok(UserUpdateResponse.success(updatedUser));
    }
    
    /**
     * 刪除用戶
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable String userId) {
        userService.deleteById(userId);
        return ResponseEntity.noContent().build();
    }
    
    private User mapToUser(CreateUserRequest request) {
        User user = new User();
        user.setUserId(request.getUserId());
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setAge(request.getAge());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setBirthDate(request.getBirthDate());
        user.setRoles(request.getRoles());
        
        if (request.getAddress() != null) {
            Address address = new Address();
            address.setStreet(request.getAddress().getStreet());
            address.setCity(request.getAddress().getCity());
            address.setState(request.getAddress().getState());
            address.setZipCode(request.getAddress().getZipCode());
            address.setCountry(request.getAddress().getCountry());
            user.setAddress(address);
        }
        
        return user;
    }
    
    private User mapToUser(ValidateUserRequest request) {
        return mapToUser((CreateUserRequest) request);
    }
    
    private void updateUserFromRequest(User user, UpdateUserRequest request) {
        if (request.getName() != null) user.setName(request.getName());
        if (request.getAge() != null) user.setAge(request.getAge());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getBirthDate() != null) user.setBirthDate(request.getBirthDate());
        if (request.getRoles() != null) user.setRoles(request.getRoles());
        
        if (request.getAddress() != null) {
            if (user.getAddress() == null) {
                user.setAddress(new Address());
            }
            
            Address address = user.getAddress();
            if (request.getAddress().getStreet() != null) address.setStreet(request.getAddress().getStreet());
            if (request.getAddress().getCity() != null) address.setCity(request.getAddress().getCity());
            if (request.getAddress().getState() != null) address.setState(request.getAddress().getState());
            if (request.getAddress().getZipCode() != null) address.setZipCode(request.getAddress().getZipCode());
            if (request.getAddress().getCountry() != null) address.setCountry(request.getAddress().getCountry());
        }
    }
}
```

## 繼續完善中...

*接下來將添加完整的 DTO 類和測試策略等內容。*