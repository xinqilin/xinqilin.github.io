---
title: "DesignPattern - Behavioral - Interpreter"
author: Bill.Lin
date: 2018-08-07T22:38:42+08:00
draft: false
tags: ["Design Pattern", "Behavioral", "Interpreter", "Spring Expression Language", "Rule Engine", "DSL"]
Description: "深入探討 Interpreter 模式的現代實現，包含 Spring Expression Language、規則引擎、企業 DSL 模式、效能優化等完整內容"
Categories: ["DesignPattern"]
DisableComments: false
---

# Interpreter 模式 - 企業級解釋器實現

## 1. 模式概述 (Pattern Overview)

### 1.1 定義與目的

Interpreter 模式是一種行為型設計模式，用於定義語言的語法表示並提供解釋器來處理這些語法。它通過構建抽象語法樹(AST)來解釋和執行特定語言的句子。

**核心目的：**
- 定義語言的語法和語義
- 提供解釋執行機制
- 支援動態語言特性
- 實現領域特定語言(DSL)

### 1.2 現代應用場景

在現代軟體開發中，Interpreter 模式廣泛應用於：

- **Spring Expression Language (SpEL)**：動態表達式計算
- **規則引擎**：業務規則的動態執行
- **配置語言**：動態配置解析
- **查詢語言**：自定義查詢DSL
- **工作流引擎**：流程定義語言
- **API 網關**：路由規則解析

## 2. 核心結構與實現 (Core Structure & Implementation)

### 2.1 基礎 Interpreter 架構

```java
// 抽象表達式接口
public interface Expression {
    Object interpret(Context context);
    
    default boolean matches(String input) {
        return false;
    }
    
    default ExpressionType getType() {
        return ExpressionType.UNKNOWN;
    }
}

// 上下文接口
public interface Context {
    Object getValue(String variable);
    void setValue(String variable, Object value);
    boolean hasVariable(String variable);
    Context createChild();
    Context getParent();
}

// 表達式類型枚舉
public enum ExpressionType {
    TERMINAL, NON_TERMINAL, OPERATOR, FUNCTION, VARIABLE, LITERAL, UNKNOWN
}

// 基礎上下文實現
public class BaseContext implements Context {
    private final Map<String, Object> variables;
    private final Context parent;
    
    public BaseContext() {
        this(null);
    }
    
    public BaseContext(Context parent) {
        this.variables = new ConcurrentHashMap<>();
        this.parent = parent;
    }
    
    @Override
    public Object getValue(String variable) {
        Object value = variables.get(variable);
        if (value == null && parent != null) {
            return parent.getValue(variable);
        }
        return value;
    }
    
    @Override
    public void setValue(String variable, Object value) {
        variables.put(variable, value);
    }
    
    @Override
    public boolean hasVariable(String variable) {
        return variables.containsKey(variable) || 
               (parent != null && parent.hasVariable(variable));
    }
    
    @Override
    public Context createChild() {
        return new BaseContext(this);
    }
    
    @Override
    public Context getParent() {
        return parent;
    }
}
```

### 2.2 終端表達式實現

```java
// 變量表達式
public class VariableExpression implements Expression {
    private final String variableName;
    
    public VariableExpression(String variableName) {
        this.variableName = variableName;
    }
    
    @Override
    public Object interpret(Context context) {
        Object value = context.getValue(variableName);
        if (value == null) {
            throw new InterpreterException("Variable '" + variableName + "' not found");
        }
        return value;
    }
    
    @Override
    public boolean matches(String input) {
        return input.equals(variableName);
    }
    
    @Override
    public ExpressionType getType() {
        return ExpressionType.VARIABLE;
    }
    
    public String getVariableName() {
        return variableName;
    }
}

// 字面量表達式
public class LiteralExpression implements Expression {
    private final Object value;
    private final Class<?> type;
    
    public LiteralExpression(Object value) {
        this.value = value;
        this.type = value != null ? value.getClass() : Object.class;
    }
    
    @Override
    public Object interpret(Context context) {
        return value;
    }
    
    @Override
    public ExpressionType getType() {
        return ExpressionType.LITERAL;
    }
    
    public Object getValue() {
        return value;
    }
    
    public Class<?> getValueType() {
        return type;
    }
}

// 數字表達式
public class NumberExpression extends LiteralExpression {
    public NumberExpression(Number value) {
        super(value);
    }
    
    @Override
    public Object interpret(Context context) {
        return (Number) super.interpret(context);
    }
    
    @Override
    public boolean matches(String input) {
        try {
            Double.parseDouble(input);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}

// 字符串表達式
public class StringExpression extends LiteralExpression {
    public StringExpression(String value) {
        super(value);
    }
    
    @Override
    public Object interpret(Context context) {
        return (String) super.interpret(context);
    }
    
    @Override
    public boolean matches(String input) {
        return input.startsWith("\"") && input.endsWith("\"");
    }
}
```

### 2.3 非終端表達式實現

```java
// 抽象二元運算表達式
public abstract class BinaryOperatorExpression implements Expression {
    protected final Expression leftExpression;
    protected final Expression rightExpression;
    protected final String operator;
    
    public BinaryOperatorExpression(Expression leftExpression, 
                                   Expression rightExpression, 
                                   String operator) {
        this.leftExpression = leftExpression;
        this.rightExpression = rightExpression;
        this.operator = operator;
    }
    
    @Override
    public ExpressionType getType() {
        return ExpressionType.OPERATOR;
    }
    
    protected abstract Object performOperation(Object left, Object right);
    
    @Override
    public Object interpret(Context context) {
        Object left = leftExpression.interpret(context);
        Object right = rightExpression.interpret(context);
        
        return performOperation(left, right);
    }
    
    public Expression getLeftExpression() {
        return leftExpression;
    }
    
    public Expression getRightExpression() {
        return rightExpression;
    }
    
    public String getOperator() {
        return operator;
    }
}

// 加法表達式
public class AddExpression extends BinaryOperatorExpression {
    public AddExpression(Expression leftExpression, Expression rightExpression) {
        super(leftExpression, rightExpression, "+");
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            return ((Number) left).doubleValue() + ((Number) right).doubleValue();
        }
        
        if (left instanceof String || right instanceof String) {
            return String.valueOf(left) + String.valueOf(right);
        }
        
        throw new InterpreterException("Cannot add " + left.getClass() + " and " + right.getClass());
    }
}

// 比較表達式
public class ComparisonExpression extends BinaryOperatorExpression {
    public enum ComparisonType {
        EQUAL("=="), NOT_EQUAL("!="), GREATER(">"), LESS("<"), 
        GREATER_EQUAL(">="), LESS_EQUAL("<=");
        
        private final String operator;
        
        ComparisonType(String operator) {
            this.operator = operator;
        }
        
        public String getOperator() {
            return operator;
        }
    }
    
    private final ComparisonType comparisonType;
    
    public ComparisonExpression(Expression leftExpression, 
                               Expression rightExpression, 
                               ComparisonType comparisonType) {
        super(leftExpression, rightExpression, comparisonType.getOperator());
        this.comparisonType = comparisonType;
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        return switch (comparisonType) {
            case EQUAL -> Objects.equals(left, right);
            case NOT_EQUAL -> !Objects.equals(left, right);
            case GREATER -> compareNumbers(left, right) > 0;
            case LESS -> compareNumbers(left, right) < 0;
            case GREATER_EQUAL -> compareNumbers(left, right) >= 0;
            case LESS_EQUAL -> compareNumbers(left, right) <= 0;
        };
    }
    
    private int compareNumbers(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            return Double.compare(((Number) left).doubleValue(), 
                                ((Number) right).doubleValue());
        }
        
        if (left instanceof Comparable && right instanceof Comparable) {
            return ((Comparable<Object>) left).compareTo(right);
        }
        
        throw new InterpreterException("Cannot compare " + left.getClass() + " and " + right.getClass());
    }
}

// 邏輯表達式
public class LogicalExpression extends BinaryOperatorExpression {
    public enum LogicalType {
        AND("&&"), OR("||");
        
        private final String operator;
        
        LogicalType(String operator) {
            this.operator = operator;
        }
        
        public String getOperator() {
            return operator;
        }
    }
    
    private final LogicalType logicalType;
    
    public LogicalExpression(Expression leftExpression, 
                            Expression rightExpression, 
                            LogicalType logicalType) {
        super(leftExpression, rightExpression, logicalType.getOperator());
        this.logicalType = logicalType;
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        boolean leftBoolean = convertToBoolean(left);
        boolean rightBoolean = convertToBoolean(right);
        
        return switch (logicalType) {
            case AND -> leftBoolean && rightBoolean;
            case OR -> leftBoolean || rightBoolean;
        };
    }
    
    private boolean convertToBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        
        if (value instanceof Number) {
            return ((Number) value).doubleValue() != 0;
        }
        
        if (value instanceof String) {
            return !((String) value).isEmpty();
        }
        
        return value != null;
    }
}
```

### 2.4 函數表達式

```java
// 函數表達式接口
public interface FunctionExpression extends Expression {
    String getFunctionName();
    List<Expression> getArguments();
    Object execute(List<Object> arguments, Context context);
    
    @Override
    default Object interpret(Context context) {
        List<Object> argumentValues = getArguments().stream()
            .map(arg -> arg.interpret(context))
            .collect(Collectors.toList());
        
        return execute(argumentValues, context);
    }
    
    @Override
    default ExpressionType getType() {
        return ExpressionType.FUNCTION;
    }
}

// 抽象函數表達式
public abstract class AbstractFunctionExpression implements FunctionExpression {
    protected final String functionName;
    protected final List<Expression> arguments;
    
    public AbstractFunctionExpression(String functionName, List<Expression> arguments) {
        this.functionName = functionName;
        this.arguments = arguments != null ? arguments : new ArrayList<>();
    }
    
    @Override
    public String getFunctionName() {
        return functionName;
    }
    
    @Override
    public List<Expression> getArguments() {
        return new ArrayList<>(arguments);
    }
    
    protected void validateArgumentCount(int expectedCount, int actualCount) {
        if (expectedCount != actualCount) {
            throw new InterpreterException(
                String.format("Function %s expects %d arguments but got %d", 
                            functionName, expectedCount, actualCount)
            );
        }
    }
}

// 數學函數表達式
public class MathFunctionExpression extends AbstractFunctionExpression {
    public MathFunctionExpression(String functionName, List<Expression> arguments) {
        super(functionName, arguments);
    }
    
    @Override
    public Object execute(List<Object> arguments, Context context) {
        return switch (functionName.toLowerCase()) {
            case "abs" -> {
                validateArgumentCount(1, arguments.size());
                yield Math.abs(((Number) arguments.get(0)).doubleValue());
            }
            case "max" -> {
                validateArgumentCount(2, arguments.size());
                yield Math.max(((Number) arguments.get(0)).doubleValue(),
                              ((Number) arguments.get(1)).doubleValue());
            }
            case "min" -> {
                validateArgumentCount(2, arguments.size());
                yield Math.min(((Number) arguments.get(0)).doubleValue(),
                              ((Number) arguments.get(1)).doubleValue());
            }
            case "sqrt" -> {
                validateArgumentCount(1, arguments.size());
                yield Math.sqrt(((Number) arguments.get(0)).doubleValue());
            }
            case "pow" -> {
                validateArgumentCount(2, arguments.size());
                yield Math.pow(((Number) arguments.get(0)).doubleValue(),
                              ((Number) arguments.get(1)).doubleValue());
            }
            default -> throw new InterpreterException("Unknown math function: " + functionName);
        };
    }
}

// 字符串函數表達式
public class StringFunctionExpression extends AbstractFunctionExpression {
    public StringFunctionExpression(String functionName, List<Expression> arguments) {
        super(functionName, arguments);
    }
    
    @Override
    public Object execute(List<Object> arguments, Context context) {
        return switch (functionName.toLowerCase()) {
            case "length" -> {
                validateArgumentCount(1, arguments.size());
                yield String.valueOf(arguments.get(0)).length();
            }
            case "upper" -> {
                validateArgumentCount(1, arguments.size());
                yield String.valueOf(arguments.get(0)).toUpperCase();
            }
            case "lower" -> {
                validateArgumentCount(1, arguments.size());
                yield String.valueOf(arguments.get(0)).toLowerCase();
            }
            case "substring" -> {
                if (arguments.size() == 2) {
                    String str = String.valueOf(arguments.get(0));
                    int start = ((Number) arguments.get(1)).intValue();
                    yield str.substring(start);
                } else if (arguments.size() == 3) {
                    String str = String.valueOf(arguments.get(0));
                    int start = ((Number) arguments.get(1)).intValue();
                    int end = ((Number) arguments.get(2)).intValue();
                    yield str.substring(start, end);
                } else {
                    throw new InterpreterException("substring function expects 2 or 3 arguments");
                }
            }
            case "contains" -> {
                validateArgumentCount(2, arguments.size());
                String str = String.valueOf(arguments.get(0));
                String substring = String.valueOf(arguments.get(1));
                yield str.contains(substring);
            }
            default -> throw new InterpreterException("Unknown string function: " + functionName);
        };
    }
}
```

## 3. 解析器實現 (Parser Implementation)

### 3.1 詞法分析器

```java
// Token 類型
public enum TokenType {
    NUMBER, STRING, IDENTIFIER, OPERATOR, FUNCTION, 
    LEFT_PAREN, RIGHT_PAREN, COMMA, EOF, WHITESPACE
}

// Token 類
public class Token {
    private final TokenType type;
    private final String value;
    private final int position;
    
    public Token(TokenType type, String value, int position) {
        this.type = type;
        this.value = value;
        this.position = position;
    }
    
    // Getters
    public TokenType getType() { return type; }
    public String getValue() { return value; }
    public int getPosition() { return position; }
    
    @Override
    public String toString() {
        return String.format("Token{type=%s, value='%s', position=%d}", 
                           type, value, position);
    }
}

// 詞法分析器
public class Lexer {
    private final String input;
    private int position = 0;
    private final List<Token> tokens = new ArrayList<>();
    
    public Lexer(String input) {
        this.input = input;
    }
    
    public List<Token> tokenize() {
        tokens.clear();
        position = 0;
        
        while (position < input.length()) {
            skipWhitespace();
            
            if (position >= input.length()) {
                break;
            }
            
            char currentChar = input.charAt(position);
            
            if (Character.isDigit(currentChar) || currentChar == '.') {
                tokenizeNumber();
            } else if (currentChar == '"') {
                tokenizeString();
            } else if (Character.isLetter(currentChar) || currentChar == '_') {
                tokenizeIdentifier();
            } else if (isOperator(currentChar)) {
                tokenizeOperator();
            } else if (currentChar == '(') {
                tokens.add(new Token(TokenType.LEFT_PAREN, "(", position));
                position++;
            } else if (currentChar == ')') {
                tokens.add(new Token(TokenType.RIGHT_PAREN, ")", position));
                position++;
            } else if (currentChar == ',') {
                tokens.add(new Token(TokenType.COMMA, ",", position));
                position++;
            } else {
                throw new InterpreterException("Unexpected character: " + currentChar + " at position " + position);
            }
        }
        
        tokens.add(new Token(TokenType.EOF, "", position));
        return new ArrayList<>(tokens);
    }
    
    private void skipWhitespace() {
        while (position < input.length() && Character.isWhitespace(input.charAt(position))) {
            position++;
        }
    }
    
    private void tokenizeNumber() {
        int start = position;
        StringBuilder number = new StringBuilder();
        
        while (position < input.length() && 
               (Character.isDigit(input.charAt(position)) || input.charAt(position) == '.')) {
            number.append(input.charAt(position));
            position++;
        }
        
        tokens.add(new Token(TokenType.NUMBER, number.toString(), start));
    }
    
    private void tokenizeString() {
        int start = position;
        StringBuilder string = new StringBuilder();
        
        position++; // Skip opening quote
        
        while (position < input.length() && input.charAt(position) != '"') {
            if (input.charAt(position) == '\\' && position + 1 < input.length()) {
                position++; // Skip escape character
                char escaped = input.charAt(position);
                switch (escaped) {
                    case 'n' -> string.append('\n');
                    case 't' -> string.append('\t');
                    case 'r' -> string.append('\r');
                    case '\\' -> string.append('\\');
                    case '"' -> string.append('"');
                    default -> string.append(escaped);
                }
            } else {
                string.append(input.charAt(position));
            }
            position++;
        }
        
        if (position >= input.length()) {
            throw new InterpreterException("Unterminated string literal at position " + start);
        }
        
        position++; // Skip closing quote
        tokens.add(new Token(TokenType.STRING, string.toString(), start));
    }
    
    private void tokenizeIdentifier() {
        int start = position;
        StringBuilder identifier = new StringBuilder();
        
        while (position < input.length() && 
               (Character.isLetterOrDigit(input.charAt(position)) || input.charAt(position) == '_')) {
            identifier.append(input.charAt(position));
            position++;
        }
        
        String value = identifier.toString();
        
        // Check if it's a function call
        skipWhitespace();
        if (position < input.length() && input.charAt(position) == '(') {
            tokens.add(new Token(TokenType.FUNCTION, value, start));
        } else {
            tokens.add(new Token(TokenType.IDENTIFIER, value, start));
        }
    }
    
    private void tokenizeOperator() {
        int start = position;
        StringBuilder operator = new StringBuilder();
        
        // Handle multi-character operators
        if (position + 1 < input.length()) {
            String twoChar = input.substring(position, position + 2);
            if (twoChar.equals("==") || twoChar.equals("!=") || 
                twoChar.equals(">=") || twoChar.equals("<=") ||
                twoChar.equals("&&") || twoChar.equals("||")) {
                operator.append(twoChar);
                position += 2;
            } else {
                operator.append(input.charAt(position));
                position++;
            }
        } else {
            operator.append(input.charAt(position));
            position++;
        }
        
        tokens.add(new Token(TokenType.OPERATOR, operator.toString(), start));
    }
    
    private boolean isOperator(char ch) {
        return "+-*/%><=!&|".indexOf(ch) != -1;
    }
}
```

### 3.2 語法分析器

```java
// 語法分析器
public class Parser {
    private final List<Token> tokens;
    private int currentTokenIndex = 0;
    
    public Parser(List<Token> tokens) {
        this.tokens = tokens;
    }
    
    public Expression parse() {
        return parseExpression();
    }
    
    private Expression parseExpression() {
        return parseLogicalOr();
    }
    
    private Expression parseLogicalOr() {
        Expression left = parseLogicalAnd();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               currentToken().getValue().equals("||")) {
            consumeToken();
            Expression right = parseLogicalAnd();
            left = new LogicalExpression(left, right, LogicalExpression.LogicalType.OR);
        }
        
        return left;
    }
    
    private Expression parseLogicalAnd() {
        Expression left = parseEquality();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               currentToken().getValue().equals("&&")) {
            consumeToken();
            Expression right = parseEquality();
            left = new LogicalExpression(left, right, LogicalExpression.LogicalType.AND);
        }
        
        return left;
    }
    
    private Expression parseEquality() {
        Expression left = parseComparison();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               (currentToken().getValue().equals("==") || currentToken().getValue().equals("!="))) {
            String operator = currentToken().getValue();
            consumeToken();
            Expression right = parseComparison();
            
            ComparisonExpression.ComparisonType type = 
                operator.equals("==") ? ComparisonExpression.ComparisonType.EQUAL :
                                       ComparisonExpression.ComparisonType.NOT_EQUAL;
            
            left = new ComparisonExpression(left, right, type);
        }
        
        return left;
    }
    
    private Expression parseComparison() {
        Expression left = parseAddition();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               isComparisonOperator(currentToken().getValue())) {
            String operator = currentToken().getValue();
            consumeToken();
            Expression right = parseAddition();
            
            ComparisonExpression.ComparisonType type = switch (operator) {
                case ">" -> ComparisonExpression.ComparisonType.GREATER;
                case "<" -> ComparisonExpression.ComparisonType.LESS;
                case ">=" -> ComparisonExpression.ComparisonType.GREATER_EQUAL;
                case "<=" -> ComparisonExpression.ComparisonType.LESS_EQUAL;
                default -> throw new InterpreterException("Unknown comparison operator: " + operator);
            };
            
            left = new ComparisonExpression(left, right, type);
        }
        
        return left;
    }
    
    private Expression parseAddition() {
        Expression left = parseMultiplication();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               (currentToken().getValue().equals("+") || currentToken().getValue().equals("-"))) {
            String operator = currentToken().getValue();
            consumeToken();
            Expression right = parseMultiplication();
            
            if (operator.equals("+")) {
                left = new AddExpression(left, right);
            } else {
                left = new SubtractExpression(left, right);
            }
        }
        
        return left;
    }
    
    private Expression parseMultiplication() {
        Expression left = parsePrimary();
        
        while (currentToken().getType() == TokenType.OPERATOR && 
               (currentToken().getValue().equals("*") || currentToken().getValue().equals("/") || 
                currentToken().getValue().equals("%"))) {
            String operator = currentToken().getValue();
            consumeToken();
            Expression right = parsePrimary();
            
            left = switch (operator) {
                case "*" -> new MultiplyExpression(left, right);
                case "/" -> new DivideExpression(left, right);
                case "%" -> new ModuloExpression(left, right);
                default -> throw new InterpreterException("Unknown operator: " + operator);
            };
        }
        
        return left;
    }
    
    private Expression parsePrimary() {
        Token token = currentToken();
        
        return switch (token.getType()) {
            case NUMBER -> {
                consumeToken();
                try {
                    if (token.getValue().contains(".")) {
                        yield new NumberExpression(Double.parseDouble(token.getValue()));
                    } else {
                        yield new NumberExpression(Integer.parseInt(token.getValue()));
                    }
                } catch (NumberFormatException e) {
                    throw new InterpreterException("Invalid number: " + token.getValue());
                }
            }
            
            case STRING -> {
                consumeToken();
                yield new StringExpression(token.getValue());
            }
            
            case IDENTIFIER -> {
                consumeToken();
                yield new VariableExpression(token.getValue());
            }
            
            case FUNCTION -> {
                yield parseFunction();
            }
            
            case LEFT_PAREN -> {
                consumeToken(); // consume '('
                Expression expr = parseExpression();
                
                if (currentToken().getType() != TokenType.RIGHT_PAREN) {
                    throw new InterpreterException("Expected ')' after expression");
                }
                consumeToken(); // consume ')'
                
                yield expr;
            }
            
            default -> throw new InterpreterException("Unexpected token: " + token);
        };
    }
    
    private Expression parseFunction() {
        String functionName = currentToken().getValue();
        consumeToken(); // consume function name
        
        if (currentToken().getType() != TokenType.LEFT_PAREN) {
            throw new InterpreterException("Expected '(' after function name");
        }
        consumeToken(); // consume '('
        
        List<Expression> arguments = new ArrayList<>();
        
        if (currentToken().getType() != TokenType.RIGHT_PAREN) {
            arguments.add(parseExpression());
            
            while (currentToken().getType() == TokenType.COMMA) {
                consumeToken(); // consume ','
                arguments.add(parseExpression());
            }
        }
        
        if (currentToken().getType() != TokenType.RIGHT_PAREN) {
            throw new InterpreterException("Expected ')' after function arguments");
        }
        consumeToken(); // consume ')'
        
        // Determine function type based on name
        if (isMathFunction(functionName)) {
            return new MathFunctionExpression(functionName, arguments);
        } else if (isStringFunction(functionName)) {
            return new StringFunctionExpression(functionName, arguments);
        } else {
            throw new InterpreterException("Unknown function: " + functionName);
        }
    }
    
    private Token currentToken() {
        if (currentTokenIndex < tokens.size()) {
            return tokens.get(currentTokenIndex);
        }
        return tokens.get(tokens.size() - 1); // Return EOF token
    }
    
    private void consumeToken() {
        if (currentTokenIndex < tokens.size() - 1) {
            currentTokenIndex++;
        }
    }
    
    private boolean isComparisonOperator(String operator) {
        return operator.equals(">") || operator.equals("<") || 
               operator.equals(">=") || operator.equals("<=");
    }
    
    private boolean isMathFunction(String functionName) {
        return Set.of("abs", "max", "min", "sqrt", "pow").contains(functionName.toLowerCase());
    }
    
    private boolean isStringFunction(String functionName) {
        return Set.of("length", "upper", "lower", "substring", "contains").contains(functionName.toLowerCase());
    }
}
```

### 3.3 缺失的運算表達式

```java
// 減法表達式
public class SubtractExpression extends BinaryOperatorExpression {
    public SubtractExpression(Expression leftExpression, Expression rightExpression) {
        super(leftExpression, rightExpression, "-");
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            return ((Number) left).doubleValue() - ((Number) right).doubleValue();
        }
        
        throw new InterpreterException("Cannot subtract " + right.getClass() + " from " + left.getClass());
    }
}

// 乘法表達式
public class MultiplyExpression extends BinaryOperatorExpression {
    public MultiplyExpression(Expression leftExpression, Expression rightExpression) {
        super(leftExpression, rightExpression, "*");
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            return ((Number) left).doubleValue() * ((Number) right).doubleValue();
        }
        
        throw new InterpreterException("Cannot multiply " + left.getClass() + " and " + right.getClass());
    }
}

// 除法表達式
public class DivideExpression extends BinaryOperatorExpression {
    public DivideExpression(Expression leftExpression, Expression rightExpression) {
        super(leftExpression, rightExpression, "/");
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            double rightValue = ((Number) right).doubleValue();
            if (rightValue == 0) {
                throw new InterpreterException("Division by zero");
            }
            return ((Number) left).doubleValue() / rightValue;
        }
        
        throw new InterpreterException("Cannot divide " + left.getClass() + " by " + right.getClass());
    }
}

// 取模表達式
public class ModuloExpression extends BinaryOperatorExpression {
    public ModuloExpression(Expression leftExpression, Expression rightExpression) {
        super(leftExpression, rightExpression, "%");
    }
    
    @Override
    protected Object performOperation(Object left, Object right) {
        if (left instanceof Number && right instanceof Number) {
            double rightValue = ((Number) right).doubleValue();
            if (rightValue == 0) {
                throw new InterpreterException("Modulo by zero");
            }
            return ((Number) left).doubleValue() % rightValue;
        }
        
        throw new InterpreterException("Cannot compute modulo of " + left.getClass() + " and " + right.getClass());
    }
}
```

### 3.4 表達式引擎

```java
// 表達式引擎
@Component
public class ExpressionEngine {
    private final Lexer lexer;
    private final Parser parser;
    
    public ExpressionEngine() {
        this.lexer = new Lexer("");
        this.parser = new Parser(new ArrayList<>());
    }
    
    public Object evaluate(String expression) {
        return evaluate(expression, new BaseContext());
    }
    
    public Object evaluate(String expression, Context context) {
        try {
            // 詞法分析
            List<Token> tokens = new Lexer(expression).tokenize();
            
            // 語法分析
            Expression expr = new Parser(tokens).parse();
            
            // 解釋執行
            return expr.interpret(context);
            
        } catch (Exception e) {
            throw new InterpreterException("Failed to evaluate expression: " + expression, e);
        }
    }
    
    public boolean evaluateBoolean(String expression, Context context) {
        Object result = evaluate(expression, context);
        
        if (result instanceof Boolean) {
            return (Boolean) result;
        }
        
        if (result instanceof Number) {
            return ((Number) result).doubleValue() != 0;
        }
        
        if (result instanceof String) {
            return !((String) result).isEmpty();
        }
        
        return result != null;
    }
    
    public Expression parse(String expression) {
        List<Token> tokens = new Lexer(expression).tokenize();
        return new Parser(tokens).parse();
    }
    
    public List<Token> tokenize(String expression) {
        return new Lexer(expression).tokenize();
    }
}
```

## 4. Spring Expression Language 整合 (Spring Expression Language Integration)

### 4.1 Spring Expression Language 簡介

Spring Expression Language (SpEL) 是 Spring Framework 中的一個強大的表達式語言，支援在運行時查詢和操作對象圖。

```java
// Spring Expression Language 配置
@Configuration
@EnableSpringExpressionLanguage
public class SpELConfiguration {
    
    @Bean
    public SpelExpressionParser spelExpressionParser() {
        return new SpelExpressionParser();
    }
    
    @Bean
    public StandardEvaluationContext standardEvaluationContext() {
        StandardEvaluationContext context = new StandardEvaluationContext();
        
        // 註冊自定義函數
        context.registerFunction("randomInt", 
            ReflectionUtils.findMethod(MathUtils.class, "randomInt", int.class, int.class));
        
        context.registerFunction("formatDate", 
            ReflectionUtils.findMethod(DateUtils.class, "formatDate", Date.class, String.class));
        
        // 註冊變量解析器
        context.addPropertyAccessor(new BeanFactoryAccessor());
        context.addPropertyAccessor(new MapAccessor());
        
        return context;
    }
}
```

### 4.2 自定義 SpEL 表達式處理器

```java
// SpEL 表達式處理器
@Component
public class SpelExpressionProcessor {
    private final SpelExpressionParser parser;
    private final StandardEvaluationContext evaluationContext;
    
    public SpelExpressionProcessor(SpelExpressionParser parser, 
                                  StandardEvaluationContext evaluationContext) {
        this.parser = parser;
        this.evaluationContext = evaluationContext;
    }
    
    public <T> T evaluate(String expression, Class<T> resultType) {
        return evaluate(expression, null, resultType);
    }
    
    public <T> T evaluate(String expression, Object rootObject, Class<T> resultType) {
        try {
            Expression expr = parser.parseExpression(expression);
            
            if (rootObject != null) {
                return expr.getValue(evaluationContext, rootObject, resultType);
            } else {
                return expr.getValue(evaluationContext, resultType);
            }
            
        } catch (Exception e) {
            throw new SpelExpressionException("Failed to evaluate SpEL expression: " + expression, e);
        }
    }
    
    public boolean evaluateBoolean(String expression, Object rootObject) {
        return evaluate(expression, rootObject, Boolean.class);
    }
    
    public void setValue(String expression, Object rootObject, Object value) {
        try {
            Expression expr = parser.parseExpression(expression);
            expr.setValue(evaluationContext, rootObject, value);
        } catch (Exception e) {
            throw new SpelExpressionException("Failed to set value using SpEL expression: " + expression, e);
        }
    }
    
    public MethodReference getMethodReference(String expression) {
        try {
            Expression expr = parser.parseExpression(expression);
            return expr.getValue(evaluationContext, MethodReference.class);
        } catch (Exception e) {
            throw new SpelExpressionException("Failed to get method reference: " + expression, e);
        }
    }
}
```

### 4.3 條件表達式處理

```java
// 條件表達式服務
@Service
public class ConditionalExpressionService {
    private final SpelExpressionProcessor spelProcessor;
    
    public ConditionalExpressionService(SpelExpressionProcessor spelProcessor) {
        this.spelProcessor = spelProcessor;
    }
    
    public boolean evaluateCondition(String condition, Map<String, Object> variables) {
        // 創建具有變量的評估上下文
        StandardEvaluationContext context = new StandardEvaluationContext();
        variables.forEach(context::setVariable);
        
        try {
            return spelProcessor.evaluateBoolean(condition, context);
        } catch (Exception e) {
            throw new ConditionalExpressionException("Failed to evaluate condition: " + condition, e);
        }
    }
    
    public <T> T evaluateConditionalValue(String condition, 
                                         String trueExpression, 
                                         String falseExpression, 
                                         Map<String, Object> variables, 
                                         Class<T> resultType) {
        
        boolean conditionResult = evaluateCondition(condition, variables);
        String expression = conditionResult ? trueExpression : falseExpression;
        
        return spelProcessor.evaluate(expression, variables, resultType);
    }
    
    public List<String> extractVariables(String expression) {
        List<String> variables = new ArrayList<>();
        
        try {
            Expression expr = new SpelExpressionParser().parseExpression(expression);
            // 使用 SpEL 的 AST 來提取變量
            extractVariablesFromAst(expr, variables);
        } catch (Exception e) {
            throw new ConditionalExpressionException("Failed to extract variables from: " + expression, e);
        }
        
        return variables.stream().distinct().collect(Collectors.toList());
    }
    
    private void extractVariablesFromAst(Expression expr, List<String> variables) {
        // 實現 AST 遍歷來提取變量名
        // 這裡簡化實現，實際應該遍歷 SpEL 的 AST
        String expressionString = expr.getExpressionString();
        Pattern pattern = Pattern.compile("#(\\w+)");
        Matcher matcher = pattern.matcher(expressionString);
        
        while (matcher.find()) {
            variables.add(matcher.group(1));
        }
    }
}
```

### 4.4 動態方法調用

```java
// 動態方法調用服務
@Service
public class DynamicMethodInvocationService {
    private final SpelExpressionProcessor spelProcessor;
    private final ApplicationContext applicationContext;
    
    public DynamicMethodInvocationService(SpelExpressionProcessor spelProcessor,
                                        ApplicationContext applicationContext) {
        this.spelProcessor = spelProcessor;
        this.applicationContext = applicationContext;
    }
    
    public Object invokeMethod(String beanName, String methodName, Object... args) {
        String expression = String.format("@%s.%s(%s)", 
            beanName, methodName, buildArgumentsExpression(args));
        
        return spelProcessor.evaluate(expression, Object.class);
    }
    
    public Object invokeStaticMethod(Class<?> clazz, String methodName, Object... args) {
        String expression = String.format("T(%s).%s(%s)", 
            clazz.getName(), methodName, buildArgumentsExpression(args));
        
        return spelProcessor.evaluate(expression, Object.class);
    }
    
    public Object getProperty(Object target, String propertyPath) {
        String expression = propertyPath.startsWith("#") ? propertyPath : "#root." + propertyPath;
        return spelProcessor.evaluate(expression, target, Object.class);
    }
    
    public void setProperty(Object target, String propertyPath, Object value) {
        String expression = propertyPath.startsWith("#") ? propertyPath : "#root." + propertyPath;
        spelProcessor.setValue(expression, target, value);
    }
    
    private String buildArgumentsExpression(Object... args) {
        if (args == null || args.length == 0) {
            return "";
        }
        
        return Arrays.stream(args)
            .map(this::formatArgument)
            .collect(Collectors.joining(", "));
    }
    
    private String formatArgument(Object arg) {
        if (arg == null) {
            return "null";
        }
        
        if (arg instanceof String) {
            return "'" + arg.toString().replace("'", "\\'") + "'";
        }
        
        if (arg instanceof Number || arg instanceof Boolean) {
            return arg.toString();
        }
        
        // 對於複雜對象，將其設置為變量
        return "#" + arg.getClass().getSimpleName().toLowerCase();
    }
}
```

## 5. 企業規則引擎 (Enterprise Rule Engine)

### 5.1 規則引擎架構

```java
// 規則接口
public interface Rule {
    String getName();
    String getDescription();
    int getPriority();
    boolean matches(RuleContext context);
    RuleResult execute(RuleContext context);
    
    default boolean isEnabled() {
        return true;
    }
    
    default Set<String> getRequiredVariables() {
        return Set.of();
    }
}

// 規則上下文
public class RuleContext {
    private final Map<String, Object> variables;
    private final Map<String, Object> results;
    private final List<RuleExecutionEvent> events;
    
    public RuleContext() {
        this.variables = new ConcurrentHashMap<>();
        this.results = new ConcurrentHashMap<>();
        this.events = new ArrayList<>();
    }
    
    public RuleContext(Map<String, Object> initialVariables) {
        this();
        this.variables.putAll(initialVariables);
    }
    
    public Object getVariable(String name) {
        return variables.get(name);
    }
    
    public void setVariable(String name, Object value) {
        variables.put(name, value);
    }
    
    public Object getResult(String name) {
        return results.get(name);
    }
    
    public void setResult(String name, Object value) {
        results.put(name, value);
    }
    
    public void addEvent(RuleExecutionEvent event) {
        events.add(event);
    }
    
    public List<RuleExecutionEvent> getEvents() {
        return new ArrayList<>(events);
    }
    
    public Map<String, Object> getVariables() {
        return new HashMap<>(variables);
    }
    
    public Map<String, Object> getResults() {
        return new HashMap<>(results);
    }
}

// 規則執行結果
public class RuleResult {
    private final boolean success;
    private final String message;
    private final Map<String, Object> data;
    private final List<RuleAction> actions;
    
    public RuleResult(boolean success, String message) {
        this(success, message, Map.of(), List.of());
    }
    
    public RuleResult(boolean success, String message, Map<String, Object> data, List<RuleAction> actions) {
        this.success = success;
        this.message = message;
        this.data = data != null ? new HashMap<>(data) : new HashMap<>();
        this.actions = actions != null ? new ArrayList<>(actions) : new ArrayList<>();
    }
    
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public Map<String, Object> getData() { return new HashMap<>(data); }
    public List<RuleAction> getActions() { return new ArrayList<>(actions); }
}

// 規則動作
public interface RuleAction {
    String getName();
    void execute(RuleContext context);
    
    default boolean isAsync() {
        return false;
    }
    
    default int getTimeout() {
        return 5000; // 5 seconds
    }
}
```

### 5.2 表達式規則實現

```java
// 基於表達式的規則
public class ExpressionRule implements Rule {
    private final String name;
    private final String description;
    private final int priority;
    private final String conditionExpression;
    private final List<RuleAction> actions;
    private final ExpressionEngine expressionEngine;
    private final boolean enabled;
    
    public ExpressionRule(String name, String description, int priority,
                         String conditionExpression, List<RuleAction> actions,
                         ExpressionEngine expressionEngine) {
        this.name = name;
        this.description = description;
        this.priority = priority;
        this.conditionExpression = conditionExpression;
        this.actions = actions != null ? new ArrayList<>(actions) : new ArrayList<>();
        this.expressionEngine = expressionEngine;
        this.enabled = true;
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    @Override
    public int getPriority() {
        return priority;
    }
    
    @Override
    public boolean isEnabled() {
        return enabled;
    }
    
    @Override
    public boolean matches(RuleContext context) {
        if (!enabled) {
            return false;
        }
        
        try {
            // 創建表達式上下文
            Context expressionContext = new BaseContext();
            context.getVariables().forEach(expressionContext::setValue);
            
            // 評估條件表達式
            return expressionEngine.evaluateBoolean(conditionExpression, expressionContext);
            
        } catch (Exception e) {
            throw new RuleEvaluationException("Failed to evaluate rule condition: " + name, e);
        }
    }
    
    @Override
    public RuleResult execute(RuleContext context) {
        try {
            List<RuleAction> executedActions = new ArrayList<>();
            
            // 執行所有動作
            for (RuleAction action : actions) {
                action.execute(context);
                executedActions.add(action);
            }
            
            // 記錄執行事件
            context.addEvent(new RuleExecutionEvent(name, true, "Rule executed successfully"));
            
            return new RuleResult(true, "Rule executed successfully", 
                                Map.of("executedActions", executedActions.size()), 
                                executedActions);
            
        } catch (Exception e) {
            context.addEvent(new RuleExecutionEvent(name, false, "Rule execution failed: " + e.getMessage()));
            return new RuleResult(false, "Rule execution failed: " + e.getMessage());
        }
    }
    
    @Override
    public Set<String> getRequiredVariables() {
        // 提取表達式中的變量
        return extractVariablesFromExpression(conditionExpression);
    }
    
    private Set<String> extractVariablesFromExpression(String expression) {
        Set<String> variables = new HashSet<>();
        
        try {
            List<Token> tokens = expressionEngine.tokenize(expression);
            
            for (Token token : tokens) {
                if (token.getType() == TokenType.IDENTIFIER) {
                    variables.add(token.getValue());
                }
            }
            
        } catch (Exception e) {
            // 忽略解析錯誤，返回空集合
        }
        
        return variables;
    }
}
```

### 5.3 規則引擎實現

```java
// 規則引擎接口
public interface RuleEngine {
    RuleExecutionResult execute(List<Rule> rules, RuleContext context);
    RuleExecutionResult execute(String ruleSetName, RuleContext context);
    void addRule(Rule rule);
    void removeRule(String ruleName);
    Rule getRule(String ruleName);
    List<Rule> getAllRules();
    void addRuleSet(String name, List<Rule> rules);
    List<Rule> getRuleSet(String name);
}

// 規則引擎實現
@Service
public class DefaultRuleEngine implements RuleEngine {
    private final Map<String, Rule> rules;
    private final Map<String, List<Rule>> ruleSets;
    private final ExecutorService executorService;
    private final RuleEngineMetrics metrics;
    
    public DefaultRuleEngine(RuleEngineMetrics metrics) {
        this.rules = new ConcurrentHashMap<>();
        this.ruleSets = new ConcurrentHashMap<>();
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
        this.metrics = metrics;
    }
    
    @Override
    public RuleExecutionResult execute(List<Rule> rules, RuleContext context) {
        long startTime = System.currentTimeMillis();
        
        try {
            // 按優先級排序規則
            List<Rule> sortedRules = rules.stream()
                .filter(Rule::isEnabled)
                .sorted(Comparator.comparingInt(Rule::getPriority).reversed())
                .collect(Collectors.toList());
            
            List<RuleResult> results = new ArrayList<>();
            int executedRules = 0;
            
            for (Rule rule : sortedRules) {
                try {
                    if (rule.matches(context)) {
                        RuleResult result = rule.execute(context);
                        results.add(result);
                        executedRules++;
                        
                        metrics.recordRuleExecution(rule.getName(), result.isSuccess());
                    }
                } catch (Exception e) {
                    RuleResult errorResult = new RuleResult(false, 
                        "Rule execution error: " + e.getMessage());
                    results.add(errorResult);
                    
                    metrics.recordRuleExecution(rule.getName(), false);
                }
            }
            
            long executionTime = System.currentTimeMillis() - startTime;
            metrics.recordRuleSetExecution(executionTime, executedRules, results.size());
            
            return new RuleExecutionResult(true, "Rules executed successfully", 
                                         results, executionTime);
            
        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            metrics.recordRuleSetExecution(executionTime, 0, 0);
            
            return new RuleExecutionResult(false, "Rule execution failed: " + e.getMessage(), 
                                         List.of(), executionTime);
        }
    }
    
    @Override
    public RuleExecutionResult execute(String ruleSetName, RuleContext context) {
        List<Rule> rules = ruleSets.get(ruleSetName);
        if (rules == null) {
            throw new RuleSetNotFoundException("Rule set not found: " + ruleSetName);
        }
        
        return execute(rules, context);
    }
    
    @Override
    public void addRule(Rule rule) {
        rules.put(rule.getName(), rule);
    }
    
    @Override
    public void removeRule(String ruleName) {
        rules.remove(ruleName);
    }
    
    @Override
    public Rule getRule(String ruleName) {
        return rules.get(ruleName);
    }
    
    @Override
    public List<Rule> getAllRules() {
        return new ArrayList<>(rules.values());
    }
    
    @Override
    public void addRuleSet(String name, List<Rule> rules) {
        ruleSets.put(name, new ArrayList<>(rules));
    }
    
    @Override
    public List<Rule> getRuleSet(String name) {
        List<Rule> rules = ruleSets.get(name);
        return rules != null ? new ArrayList<>(rules) : new ArrayList<>();
    }
}
```

### 5.4 動態規則載入

```java
// 規則定義 DTO
public class RuleDefinition {
    private String name;
    private String description;
    private int priority;
    private String condition;
    private List<ActionDefinition> actions;
    private boolean enabled;
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
    
    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }
    
    public List<ActionDefinition> getActions() { return actions; }
    public void setActions(List<ActionDefinition> actions) { this.actions = actions; }
    
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}

// 動作定義 DTO
public class ActionDefinition {
    private String name;
    private String type;
    private Map<String, Object> parameters;
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public Map<String, Object> getParameters() { return parameters; }
    public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }
}

// 動態規則載入服務
@Service
public class DynamicRuleLoader {
    private final RuleEngine ruleEngine;
    private final ExpressionEngine expressionEngine;
    private final RuleActionFactory actionFactory;
    private final ObjectMapper objectMapper;
    
    public DynamicRuleLoader(RuleEngine ruleEngine, 
                           ExpressionEngine expressionEngine,
                           RuleActionFactory actionFactory) {
        this.ruleEngine = ruleEngine;
        this.expressionEngine = expressionEngine;
        this.actionFactory = actionFactory;
        this.objectMapper = new ObjectMapper();
    }
    
    public void loadRulesFromJson(String json) {
        try {
            RuleDefinition[] ruleDefinitions = objectMapper.readValue(json, RuleDefinition[].class);
            
            for (RuleDefinition definition : ruleDefinitions) {
                Rule rule = createRuleFromDefinition(definition);
                ruleEngine.addRule(rule);
            }
            
        } catch (Exception e) {
            throw new RuleLoadException("Failed to load rules from JSON", e);
        }
    }
    
    public void loadRulesFromYaml(String yaml) {
        try {
            ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
            RuleDefinition[] ruleDefinitions = yamlMapper.readValue(yaml, RuleDefinition[].class);
            
            for (RuleDefinition definition : ruleDefinitions) {
                Rule rule = createRuleFromDefinition(definition);
                ruleEngine.addRule(rule);
            }
            
        } catch (Exception e) {
            throw new RuleLoadException("Failed to load rules from YAML", e);
        }
    }
    
    public void loadRulesFromDatabase(String ruleSetName) {
        // 從資料庫載入規則定義
        // 這裡簡化實現
        List<RuleDefinition> definitions = loadRuleDefinitionsFromDatabase(ruleSetName);
        
        List<Rule> rules = definitions.stream()
            .map(this::createRuleFromDefinition)
            .collect(Collectors.toList());
        
        ruleEngine.addRuleSet(ruleSetName, rules);
    }
    
    private Rule createRuleFromDefinition(RuleDefinition definition) {
        List<RuleAction> actions = definition.getActions().stream()
            .map(actionFactory::createAction)
            .collect(Collectors.toList());
        
        return new ExpressionRule(
            definition.getName(),
            definition.getDescription(),
            definition.getPriority(),
            definition.getCondition(),
            actions,
            expressionEngine
        );
    }
    
    private List<RuleDefinition> loadRuleDefinitionsFromDatabase(String ruleSetName) {
        // 實際實現中應該從資料庫查詢
        return List.of();
    }
}
```

### 5.5 規則動作工廠

```java
// 規則動作工廠
@Component
public class RuleActionFactory {
    private final Map<String, RuleActionCreator> actionCreators;
    
    public RuleActionFactory() {
        this.actionCreators = new HashMap<>();
        registerDefaultActions();
    }
    
    private void registerDefaultActions() {
        actionCreators.put("set_variable", this::createSetVariableAction);
        actionCreators.put("log_message", this::createLogMessageAction);
        actionCreators.put("send_email", this::createSendEmailAction);
        actionCreators.put("call_service", this::createCallServiceAction);
        actionCreators.put("execute_script", this::createExecuteScriptAction);
    }
    
    public RuleAction createAction(ActionDefinition definition) {
        RuleActionCreator creator = actionCreators.get(definition.getType());
        if (creator == null) {
            throw new IllegalArgumentException("Unknown action type: " + definition.getType());
        }
        
        return creator.create(definition);
    }
    
    public void registerActionCreator(String type, RuleActionCreator creator) {
        actionCreators.put(type, creator);
    }
    
    private RuleAction createSetVariableAction(ActionDefinition definition) {
        String variableName = (String) definition.getParameters().get("name");
        Object value = definition.getParameters().get("value");
        
        return new SetVariableAction(variableName, value);
    }
    
    private RuleAction createLogMessageAction(ActionDefinition definition) {
        String message = (String) definition.getParameters().get("message");
        String level = (String) definition.getParameters().getOrDefault("level", "INFO");
        
        return new LogMessageAction(message, level);
    }
    
    private RuleAction createSendEmailAction(ActionDefinition definition) {
        String to = (String) definition.getParameters().get("to");
        String subject = (String) definition.getParameters().get("subject");
        String body = (String) definition.getParameters().get("body");
        
        return new SendEmailAction(to, subject, body);
    }
    
    private RuleAction createCallServiceAction(ActionDefinition definition) {
        String serviceName = (String) definition.getParameters().get("service");
        String methodName = (String) definition.getParameters().get("method");
        List<Object> parameters = (List<Object>) definition.getParameters().get("parameters");
        
        return new CallServiceAction(serviceName, methodName, parameters);
    }
    
    private RuleAction createExecuteScriptAction(ActionDefinition definition) {
        String script = (String) definition.getParameters().get("script");
        String scriptType = (String) definition.getParameters().getOrDefault("type", "javascript");
        
        return new ExecuteScriptAction(script, scriptType);
    }
}

// 規則動作創建器接口
@FunctionalInterface
public interface RuleActionCreator {
    RuleAction create(ActionDefinition definition);
}
```

### 5.6 具體規則動作實現

```java
// 設置變量動作
public class SetVariableAction implements RuleAction {
    private final String variableName;
    private final Object value;
    
    public SetVariableAction(String variableName, Object value) {
        this.variableName = variableName;
        this.value = value;
    }
    
    @Override
    public String getName() {
        return "set_variable";
    }
    
    @Override
    public void execute(RuleContext context) {
        context.setVariable(variableName, value);
        context.addEvent(new RuleExecutionEvent("set_variable", true, 
            "Set variable " + variableName + " to " + value));
    }
}

// 日誌消息動作
public class LogMessageAction implements RuleAction {
    private final String message;
    private final String level;
    
    public LogMessageAction(String message, String level) {
        this.message = message;
        this.level = level;
    }
    
    @Override
    public String getName() {
        return "log_message";
    }
    
    @Override
    public void execute(RuleContext context) {
        // 這裡應該使用實際的日誌框架
        System.out.println("[" + level + "] " + message);
        context.addEvent(new RuleExecutionEvent("log_message", true, "Logged message"));
    }
}

// 發送郵件動作
public class SendEmailAction implements RuleAction {
    private final String to;
    private final String subject;
    private final String body;
    
    public SendEmailAction(String to, String subject, String body) {
        this.to = to;
        this.subject = subject;
        this.body = body;
    }
    
    @Override
    public String getName() {
        return "send_email";
    }
    
    @Override
    public void execute(RuleContext context) {
        // 這裡應該使用實際的郵件服務
        System.out.println("Sending email to: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body: " + body);
        
        context.addEvent(new RuleExecutionEvent("send_email", true, "Email sent to " + to));
    }
    
    @Override
    public boolean isAsync() {
        return true;
    }
}

// 調用服務動作
public class CallServiceAction implements RuleAction {
    private final String serviceName;
    private final String methodName;
    private final List<Object> parameters;
    
    public CallServiceAction(String serviceName, String methodName, List<Object> parameters) {
        this.serviceName = serviceName;
        this.methodName = methodName;
        this.parameters = parameters != null ? parameters : new ArrayList<>();
    }
    
    @Override
    public String getName() {
        return "call_service";
    }
    
    @Override
    public void execute(RuleContext context) {
        try {
            // 這裡應該使用實際的服務調用邏輯
            String result = "Service " + serviceName + "." + methodName + " called with " + parameters.size() + " parameters";
            
            context.setResult("service_call_result", result);
            context.addEvent(new RuleExecutionEvent("call_service", true, result));
            
        } catch (Exception e) {
            context.addEvent(new RuleExecutionEvent("call_service", false, "Service call failed: " + e.getMessage()));
        }
    }
}

// 執行腳本動作
public class ExecuteScriptAction implements RuleAction {
    private final String script;
    private final String scriptType;
    
    public ExecuteScriptAction(String script, String scriptType) {
        this.script = script;
        this.scriptType = scriptType;
    }
    
    @Override
    public String getName() {
        return "execute_script";
    }
    
    @Override
    public void execute(RuleContext context) {
        try {
            // 這裡應該使用實際的腳本引擎
            Object result = executeScript(script, scriptType, context);
            
            context.setResult("script_result", result);
            context.addEvent(new RuleExecutionEvent("execute_script", true, "Script executed successfully"));
            
        } catch (Exception e) {
            context.addEvent(new RuleExecutionEvent("execute_script", false, "Script execution failed: " + e.getMessage()));
        }
    }
    
    private Object executeScript(String script, String scriptType, RuleContext context) {
        // 簡化實現，實際應該使用 ScriptEngine
        return "Script executed: " + script.length() + " characters";
    }
}
```

## 6. 領域特定語言 (Domain-Specific Language) 模式

### 6.1 DSL 架構設計

```java
// DSL 構建器接口
public interface DSLBuilder<T> {
    T build();
    DSLBuilder<T> reset();
    
    default boolean validate() {
        return true;
    }
    
    default String getDescription() {
        return "Generic DSL Builder";
    }
}

// 流暢接口基類
public abstract class FluentDSLBuilder<T> implements DSLBuilder<T> {
    protected final List<DSLOperation> operations = new ArrayList<>();
    protected final Map<String, Object> context = new HashMap<>();
    
    protected void addOperation(DSLOperation operation) {
        operations.add(operation);
    }
    
    protected void setContext(String key, Object value) {
        context.put(key, value);
    }
    
    protected Object getContext(String key) {
        return context.get(key);
    }
    
    @Override
    public DSLBuilder<T> reset() {
        operations.clear();
        context.clear();
        return this;
    }
    
    @Override
    public boolean validate() {
        return operations.stream().allMatch(DSLOperation::isValid);
    }
}

// DSL 操作接口
public interface DSLOperation {
    String getOperationType();
    Object execute(Context context);
    boolean isValid();
    
    default int getPriority() {
        return 0;
    }
}
```

### 6.2 查詢 DSL 實現

```java
// 查詢 DSL 構建器
public class QueryDSLBuilder extends FluentDSLBuilder<Query> {
    private String fromTable;
    private final List<String> selectFields = new ArrayList<>();
    private final List<WhereCondition> whereConditions = new ArrayList<>();
    private final List<OrderByClause> orderByClauses = new ArrayList<>();
    private final List<GroupByClause> groupByClauses = new ArrayList<>();
    private Integer limit;
    private Integer offset;
    
    public static QueryDSLBuilder query() {
        return new QueryDSLBuilder();
    }
    
    public QueryDSLBuilder select(String... fields) {
        selectFields.addAll(Arrays.asList(fields));
        addOperation(new SelectOperation(fields));
        return this;
    }
    
    public QueryDSLBuilder from(String table) {
        this.fromTable = table;
        addOperation(new FromOperation(table));
        return this;
    }
    
    public QueryDSLBuilder where(String field, String operator, Object value) {
        WhereCondition condition = new WhereCondition(field, operator, value);
        whereConditions.add(condition);
        addOperation(new WhereOperation(condition));
        return this;
    }
    
    public QueryDSLBuilder and(String field, String operator, Object value) {
        return where(field, operator, value);
    }
    
    public QueryDSLBuilder or(String field, String operator, Object value) {
        WhereCondition condition = new WhereCondition(field, operator, value, "OR");
        whereConditions.add(condition);
        addOperation(new WhereOperation(condition));
        return this;
    }
    
    public QueryDSLBuilder orderBy(String field, SortOrder order) {
        OrderByClause clause = new OrderByClause(field, order);
        orderByClauses.add(clause);
        addOperation(new OrderByOperation(clause));
        return this;
    }
    
    public QueryDSLBuilder groupBy(String... fields) {
        GroupByClause clause = new GroupByClause(Arrays.asList(fields));
        groupByClauses.add(clause);
        addOperation(new GroupByOperation(clause));
        return this;
    }
    
    public QueryDSLBuilder limit(int limit) {
        this.limit = limit;
        addOperation(new LimitOperation(limit));
        return this;
    }
    
    public QueryDSLBuilder offset(int offset) {
        this.offset = offset;
        addOperation(new OffsetOperation(offset));
        return this;
    }
    
    @Override
    public Query build() {
        if (fromTable == null) {
            throw new IllegalStateException("FROM clause is required");
        }
        
        return new Query(fromTable, selectFields, whereConditions, 
                        orderByClauses, groupByClauses, limit, offset);
    }
    
    @Override
    public boolean validate() {
        return super.validate() && fromTable != null;
    }
    
    @Override
    public String getDescription() {
        return "Query DSL Builder for SQL-like queries";
    }
}

// 查詢實體類
public class Query {
    private final String fromTable;
    private final List<String> selectFields;
    private final List<WhereCondition> whereConditions;
    private final List<OrderByClause> orderByClauses;
    private final List<GroupByClause> groupByClauses;
    private final Integer limit;
    private final Integer offset;
    
    public Query(String fromTable, List<String> selectFields, 
                List<WhereCondition> whereConditions,
                List<OrderByClause> orderByClauses,
                List<GroupByClause> groupByClauses,
                Integer limit, Integer offset) {
        this.fromTable = fromTable;
        this.selectFields = new ArrayList<>(selectFields);
        this.whereConditions = new ArrayList<>(whereConditions);
        this.orderByClauses = new ArrayList<>(orderByClauses);
        this.groupByClauses = new ArrayList<>(groupByClauses);
        this.limit = limit;
        this.offset = offset;
    }
    
    public String toSQL() {
        StringBuilder sql = new StringBuilder();
        
        // SELECT clause
        sql.append("SELECT ");
        if (selectFields.isEmpty()) {
            sql.append("*");
        } else {
            sql.append(String.join(", ", selectFields));
        }
        
        // FROM clause
        sql.append(" FROM ").append(fromTable);
        
        // WHERE clause
        if (!whereConditions.isEmpty()) {
            sql.append(" WHERE ");
            sql.append(whereConditions.stream()
                .map(WhereCondition::toSQL)
                .collect(Collectors.joining(" ")));
        }
        
        // GROUP BY clause
        if (!groupByClauses.isEmpty()) {
            sql.append(" GROUP BY ");
            sql.append(groupByClauses.stream()
                .map(GroupByClause::toSQL)
                .collect(Collectors.joining(", ")));
        }
        
        // ORDER BY clause
        if (!orderByClauses.isEmpty()) {
            sql.append(" ORDER BY ");
            sql.append(orderByClauses.stream()
                .map(OrderByClause::toSQL)
                .collect(Collectors.joining(", ")));
        }
        
        // LIMIT clause
        if (limit != null) {
            sql.append(" LIMIT ").append(limit);
        }
        
        // OFFSET clause
        if (offset != null) {
            sql.append(" OFFSET ").append(offset);
        }
        
        return sql.toString();
    }
    
    // Getters
    public String getFromTable() { return fromTable; }
    public List<String> getSelectFields() { return new ArrayList<>(selectFields); }
    public List<WhereCondition> getWhereConditions() { return new ArrayList<>(whereConditions); }
    public List<OrderByClause> getOrderByClauses() { return new ArrayList<>(orderByClauses); }
    public List<GroupByClause> getGroupByClauses() { return new ArrayList<>(groupByClauses); }
    public Integer getLimit() { return limit; }
    public Integer getOffset() { return offset; }
}
```

### 6.3 工作流 DSL 實現

```java
// 工作流 DSL 構建器
public class WorkflowDSLBuilder extends FluentDSLBuilder<Workflow> {
    private String workflowName;
    private final List<WorkflowStep> steps = new ArrayList<>();
    private final Map<String, Object> variables = new HashMap<>();
    
    public static WorkflowDSLBuilder workflow(String name) {
        return new WorkflowDSLBuilder().name(name);
    }
    
    public WorkflowDSLBuilder name(String name) {
        this.workflowName = name;
        return this;
    }
    
    public WorkflowDSLBuilder variable(String name, Object value) {
        variables.put(name, value);
        addOperation(new VariableOperation(name, value));
        return this;
    }
    
    public WorkflowDSLBuilder step(String name) {
        WorkflowStep step = new WorkflowStep(name);
        steps.add(step);
        addOperation(new StepOperation(step));
        return this;
    }
    
    public WorkflowDSLBuilder action(String actionType, Map<String, Object> parameters) {
        if (steps.isEmpty()) {
            throw new IllegalStateException("No step defined for action");
        }
        
        WorkflowStep currentStep = steps.get(steps.size() - 1);
        WorkflowAction action = new WorkflowAction(actionType, parameters);
        currentStep.addAction(action);
        
        addOperation(new ActionOperation(action));
        return this;
    }
    
    public WorkflowDSLBuilder condition(String expression) {
        if (steps.isEmpty()) {
            throw new IllegalStateException("No step defined for condition");
        }
        
        WorkflowStep currentStep = steps.get(steps.size() - 1);
        currentStep.setCondition(expression);
        
        addOperation(new ConditionOperation(expression));
        return this;
    }
    
    public WorkflowDSLBuilder onSuccess(String nextStepName) {
        if (steps.isEmpty()) {
            throw new IllegalStateException("No step defined for success transition");
        }
        
        WorkflowStep currentStep = steps.get(steps.size() - 1);
        currentStep.setSuccessTransition(nextStepName);
        
        addOperation(new TransitionOperation(TransitionType.SUCCESS, nextStepName));
        return this;
    }
    
    public WorkflowDSLBuilder onFailure(String nextStepName) {
        if (steps.isEmpty()) {
            throw new IllegalStateException("No step defined for failure transition");
        }
        
        WorkflowStep currentStep = steps.get(steps.size() - 1);
        currentStep.setFailureTransition(nextStepName);
        
        addOperation(new TransitionOperation(TransitionType.FAILURE, nextStepName));
        return this;
    }
    
    public WorkflowDSLBuilder timeout(Duration timeout) {
        if (steps.isEmpty()) {
            throw new IllegalStateException("No step defined for timeout");
        }
        
        WorkflowStep currentStep = steps.get(steps.size() - 1);
        currentStep.setTimeout(timeout);
        
        addOperation(new TimeoutOperation(timeout));
        return this;
    }
    
    @Override
    public Workflow build() {
        if (workflowName == null) {
            throw new IllegalStateException("Workflow name is required");
        }
        
        if (steps.isEmpty()) {
            throw new IllegalStateException("At least one step is required");
        }
        
        return new Workflow(workflowName, steps, variables);
    }
    
    @Override
    public boolean validate() {
        return super.validate() && workflowName != null && !steps.isEmpty();
    }
}

// 工作流實體類
public class Workflow {
    private final String name;
    private final List<WorkflowStep> steps;
    private final Map<String, Object> variables;
    
    public Workflow(String name, List<WorkflowStep> steps, Map<String, Object> variables) {
        this.name = name;
        this.steps = new ArrayList<>(steps);
        this.variables = new HashMap<>(variables);
    }
    
    public WorkflowExecutionResult execute(WorkflowContext context) {
        WorkflowExecutor executor = new WorkflowExecutor();
        return executor.execute(this, context);
    }
    
    // Getters
    public String getName() { return name; }
    public List<WorkflowStep> getSteps() { return new ArrayList<>(steps); }
    public Map<String, Object> getVariables() { return new HashMap<>(variables); }
}

// 工作流步驟
public class WorkflowStep {
    private final String name;
    private final List<WorkflowAction> actions = new ArrayList<>();
    private String condition;
    private String successTransition;
    private String failureTransition;
    private Duration timeout;
    
    public WorkflowStep(String name) {
        this.name = name;
    }
    
    public void addAction(WorkflowAction action) {
        actions.add(action);
    }
    
    public void setCondition(String condition) {
        this.condition = condition;
    }
    
    public void setSuccessTransition(String successTransition) {
        this.successTransition = successTransition;
    }
    
    public void setFailureTransition(String failureTransition) {
        this.failureTransition = failureTransition;
    }
    
    public void setTimeout(Duration timeout) {
        this.timeout = timeout;
    }
    
    // Getters
    public String getName() { return name; }
    public List<WorkflowAction> getActions() { return new ArrayList<>(actions); }
    public String getCondition() { return condition; }
    public String getSuccessTransition() { return successTransition; }
    public String getFailureTransition() { return failureTransition; }
    public Duration getTimeout() { return timeout; }
}

// 工作流動作
public class WorkflowAction {
    private final String type;
    private final Map<String, Object> parameters;
    
    public WorkflowAction(String type, Map<String, Object> parameters) {
        this.type = type;
        this.parameters = parameters != null ? new HashMap<>(parameters) : new HashMap<>();
    }
    
    // Getters
    public String getType() { return type; }
    public Map<String, Object> getParameters() { return new HashMap<>(parameters); }
}
```

### 6.4 配置 DSL 實現

```java
// 配置 DSL 構建器
public class ConfigurationDSLBuilder extends FluentDSLBuilder<Configuration> {
    private final Map<String, Object> properties = new HashMap<>();
    private final List<ConfigurationSection> sections = new ArrayList<>();
    
    public static ConfigurationDSLBuilder config() {
        return new ConfigurationDSLBuilder();
    }
    
    public ConfigurationDSLBuilder property(String key, Object value) {
        properties.put(key, value);
        addOperation(new PropertyOperation(key, value));
        return this;
    }
    
    public ConfigurationDSLBuilder section(String name, Consumer<ConfigurationSectionBuilder> sectionBuilder) {
        ConfigurationSectionBuilder builder = new ConfigurationSectionBuilder(name);
        sectionBuilder.accept(builder);
        
        ConfigurationSection section = builder.build();
        sections.add(section);
        
        addOperation(new SectionOperation(section));
        return this;
    }
    
    public ConfigurationDSLBuilder database(Consumer<DatabaseConfigBuilder> dbBuilder) {
        return section("database", sectionBuilder -> {
            DatabaseConfigBuilder builder = new DatabaseConfigBuilder(sectionBuilder);
            dbBuilder.accept(builder);
        });
    }
    
    public ConfigurationDSLBuilder server(Consumer<ServerConfigBuilder> serverBuilder) {
        return section("server", sectionBuilder -> {
            ServerConfigBuilder builder = new ServerConfigBuilder(sectionBuilder);
            serverBuilder.accept(builder);
        });
    }
    
    public ConfigurationDSLBuilder logging(Consumer<LoggingConfigBuilder> loggingBuilder) {
        return section("logging", sectionBuilder -> {
            LoggingConfigBuilder builder = new LoggingConfigBuilder(sectionBuilder);
            loggingBuilder.accept(builder);
        });
    }
    
    @Override
    public Configuration build() {
        return new Configuration(properties, sections);
    }
    
    @Override
    public String getDescription() {
        return "Configuration DSL Builder for application settings";
    }
}

// 配置段構建器
public class ConfigurationSectionBuilder {
    private final String name;
    private final Map<String, Object> properties = new HashMap<>();
    
    public ConfigurationSectionBuilder(String name) {
        this.name = name;
    }
    
    public ConfigurationSectionBuilder property(String key, Object value) {
        properties.put(key, value);
        return this;
    }
    
    public ConfigurationSection build() {
        return new ConfigurationSection(name, properties);
    }
}

// 數據庫配置構建器
public class DatabaseConfigBuilder {
    private final ConfigurationSectionBuilder sectionBuilder;
    
    public DatabaseConfigBuilder(ConfigurationSectionBuilder sectionBuilder) {
        this.sectionBuilder = sectionBuilder;
    }
    
    public DatabaseConfigBuilder url(String url) {
        sectionBuilder.property("url", url);
        return this;
    }
    
    public DatabaseConfigBuilder username(String username) {
        sectionBuilder.property("username", username);
        return this;
    }
    
    public DatabaseConfigBuilder password(String password) {
        sectionBuilder.property("password", password);
        return this;
    }
    
    public DatabaseConfigBuilder driver(String driver) {
        sectionBuilder.property("driver", driver);
        return this;
    }
    
    public DatabaseConfigBuilder poolSize(int poolSize) {
        sectionBuilder.property("poolSize", poolSize);
        return this;
    }
    
    public DatabaseConfigBuilder connectionTimeout(Duration timeout) {
        sectionBuilder.property("connectionTimeout", timeout);
        return this;
    }
}

// 服務器配置構建器
public class ServerConfigBuilder {
    private final ConfigurationSectionBuilder sectionBuilder;
    
    public ServerConfigBuilder(ConfigurationSectionBuilder sectionBuilder) {
        this.sectionBuilder = sectionBuilder;
    }
    
    public ServerConfigBuilder port(int port) {
        sectionBuilder.property("port", port);
        return this;
    }
    
    public ServerConfigBuilder host(String host) {
        sectionBuilder.property("host", host);
        return this;
    }
    
    public ServerConfigBuilder ssl(boolean ssl) {
        sectionBuilder.property("ssl", ssl);
        return this;
    }
    
    public ServerConfigBuilder maxConnections(int maxConnections) {
        sectionBuilder.property("maxConnections", maxConnections);
        return this;
    }
    
    public ServerConfigBuilder timeout(Duration timeout) {
        sectionBuilder.property("timeout", timeout);
        return this;
    }
}

// 日誌配置構建器
public class LoggingConfigBuilder {
    private final ConfigurationSectionBuilder sectionBuilder;
    
    public LoggingConfigBuilder(ConfigurationSectionBuilder sectionBuilder) {
        this.sectionBuilder = sectionBuilder;
    }
    
    public LoggingConfigBuilder level(String level) {
        sectionBuilder.property("level", level);
        return this;
    }
    
    public LoggingConfigBuilder file(String file) {
        sectionBuilder.property("file", file);
        return this;
    }
    
    public LoggingConfigBuilder pattern(String pattern) {
        sectionBuilder.property("pattern", pattern);
        return this;
    }
    
    public LoggingConfigBuilder maxFileSize(String maxFileSize) {
        sectionBuilder.property("maxFileSize", maxFileSize);
        return this;
    }
    
    public LoggingConfigBuilder maxHistory(int maxHistory) {
        sectionBuilder.property("maxHistory", maxHistory);
        return this;
    }
}

// 配置實體類
public class Configuration {
    private final Map<String, Object> properties;
    private final List<ConfigurationSection> sections;
    
    public Configuration(Map<String, Object> properties, List<ConfigurationSection> sections) {
        this.properties = new HashMap<>(properties);
        this.sections = new ArrayList<>(sections);
    }
    
    public Object getProperty(String key) {
        return properties.get(key);
    }
    
    public ConfigurationSection getSection(String name) {
        return sections.stream()
            .filter(section -> section.getName().equals(name))
            .findFirst()
            .orElse(null);
    }
    
    public Map<String, Object> toMap() {
        Map<String, Object> result = new HashMap<>(properties);
        
        for (ConfigurationSection section : sections) {
            result.put(section.getName(), section.getProperties());
        }
        
        return result;
    }
    
    // Getters
    public Map<String, Object> getProperties() { return new HashMap<>(properties); }
    public List<ConfigurationSection> getSections() { return new ArrayList<>(sections); }
}

// 配置段
public class ConfigurationSection {
    private final String name;
    private final Map<String, Object> properties;
    
    public ConfigurationSection(String name, Map<String, Object> properties) {
        this.name = name;
        this.properties = new HashMap<>(properties);
    }
    
    public Object getProperty(String key) {
        return properties.get(key);
    }
    
    // Getters
    public String getName() { return name; }
    public Map<String, Object> getProperties() { return new HashMap<>(properties); }
}
```

### 6.5 DSL 使用示例

```java
// 查詢 DSL 使用示例
@Service
public class QueryDSLService {
    
    public void demonstrateQueryDSL() {
        // 簡單查詢
        Query simpleQuery = QueryDSLBuilder.query()
            .select("id", "name", "email")
            .from("users")
            .where("active", "=", true)
            .orderBy("name", SortOrder.ASC)
            .limit(10)
            .build();
        
        System.out.println("Simple Query: " + simpleQuery.toSQL());
        
        // 複雜查詢
        Query complexQuery = QueryDSLBuilder.query()
            .select("u.name", "p.title", "COUNT(o.id) as order_count")
            .from("users u")
            .where("u.active", "=", true)
            .and("u.created_at", ">", "2023-01-01")
            .or("u.vip", "=", true)
            .groupBy("u.id", "p.id")
            .orderBy("order_count", SortOrder.DESC)
            .limit(20)
            .offset(10)
            .build();
        
        System.out.println("Complex Query: " + complexQuery.toSQL());
    }
}

// 工作流 DSL 使用示例
@Service
public class WorkflowDSLService {
    
    public void demonstrateWorkflowDSL() {
        // 訂單處理工作流
        Workflow orderProcessing = WorkflowDSLBuilder.workflow("OrderProcessing")
            .variable("orderId", "${input.orderId}")
            .variable("customerId", "${input.customerId}")
            
            .step("ValidateOrder")
            .condition("orderId != null && customerId != null")
            .action("validate_order", Map.of("orderId", "${orderId}"))
            .timeout(Duration.ofMinutes(5))
            .onSuccess("ProcessPayment")
            .onFailure("SendErrorNotification")
            
            .step("ProcessPayment")
            .action("process_payment", Map.of(
                "customerId", "${customerId}",
                "amount", "${order.amount}"
            ))
            .timeout(Duration.ofMinutes(10))
            .onSuccess("FulfillOrder")
            .onFailure("RefundPayment")
            
            .step("FulfillOrder")
            .action("fulfill_order", Map.of("orderId", "${orderId}"))
            .action("send_confirmation", Map.of("customerId", "${customerId}"))
            .onSuccess("CompleteOrder")
            .onFailure("CancelOrder")
            
            .step("CompleteOrder")
            .action("complete_order", Map.of("orderId", "${orderId}"))
            .action("update_inventory", Map.of("items", "${order.items}"))
            
            .build();
        
        System.out.println("Workflow created: " + orderProcessing.getName());
        System.out.println("Steps: " + orderProcessing.getSteps().size());
    }
}

// 配置 DSL 使用示例
@Service
public class ConfigurationDSLService {
    
    public void demonstrateConfigurationDSL() {
        // 應用配置
        Configuration appConfig = ConfigurationDSLBuilder.config()
            .property("app.name", "My Application")
            .property("app.version", "1.0.0")
            .property("app.environment", "production")
            
            .database(db -> db
                .url("jdbc:postgresql://localhost:5432/myapp")
                .username("admin")
                .password("secret")
                .driver("org.postgresql.Driver")
                .poolSize(20)
                .connectionTimeout(Duration.ofSeconds(30))
            )
            
            .server(server -> server
                .port(8080)
                .host("0.0.0.0")
                .ssl(true)
                .maxConnections(1000)
                .timeout(Duration.ofSeconds(60))
            )
            
            .logging(logging -> logging
                .level("INFO")
                .file("logs/application.log")
                .pattern("%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n")
                .maxFileSize("10MB")
                .maxHistory(30)
            )
            
            .section("security", security -> security
                .property("jwt.secret", "my-secret-key")
                .property("jwt.expiration", Duration.ofHours(24))
                .property("cors.allowed-origins", List.of("https://example.com"))
            )
            
            .build();
        
        System.out.println("Configuration created with " + appConfig.getSections().size() + " sections");
        
        // 使用配置
        ConfigurationSection dbSection = appConfig.getSection("database");
        if (dbSection != null) {
            System.out.println("Database URL: " + dbSection.getProperty("url"));
        }
    }
}
```

## 7. 效能優化與監控 (Performance Optimization & Monitoring)

### 7.1 表達式緩存

```java
// 表達式緩存服務
@Service
public class ExpressionCacheService {
    private final Cache<String, Expression> expressionCache;
    private final ExpressionEngine expressionEngine;
    private final MeterRegistry meterRegistry;
    
    public ExpressionCacheService(ExpressionEngine expressionEngine, MeterRegistry meterRegistry) {
        this.expressionEngine = expressionEngine;
        this.meterRegistry = meterRegistry;
        this.expressionCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofHours(1))
            .recordStats()
            .build();
        
        // 註冊緩存指標
        CaffeineMetricsCollector.monitor(meterRegistry, expressionCache, "expression-cache");
    }
    
    public Expression getOrParseExpression(String expressionString) {
        return expressionCache.get(expressionString, key -> {
            Timer.Sample sample = Timer.start(meterRegistry);
            try {
                return expressionEngine.parse(key);
            } finally {
                sample.stop(Timer.builder("expression.parse.duration")
                    .description("Time taken to parse expression")
                    .register(meterRegistry));
            }
        });
    }
    
    public Object evaluateWithCache(String expressionString, Context context) {
        Expression expression = getOrParseExpression(expressionString);
        
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return expression.interpret(context);
        } finally {
            sample.stop(Timer.builder("expression.evaluate.duration")
                .description("Time taken to evaluate expression")
                .register(meterRegistry));
        }
    }
    
    public void clearCache() {
        expressionCache.invalidateAll();
    }
    
    public CacheStats getCacheStats() {
        return expressionCache.stats();
    }
}
```

### 7.2 並行表達式處理

```java
// 並行表達式處理器
@Service
public class ParallelExpressionProcessor {
    private final ExpressionCacheService cacheService;
    private final ExecutorService executorService;
    private final MeterRegistry meterRegistry;
    
    public ParallelExpressionProcessor(ExpressionCacheService cacheService, MeterRegistry meterRegistry) {
        this.cacheService = cacheService;
        this.meterRegistry = meterRegistry;
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
    }
    
    public CompletableFuture<List<Object>> evaluateParallel(List<String> expressions, Context context) {
        return CompletableFuture.supplyAsync(() -> {
            Timer.Sample sample = Timer.start(meterRegistry);
            
            try {
                List<CompletableFuture<Object>> futures = expressions.stream()
                    .map(expr -> CompletableFuture.supplyAsync(() -> 
                        cacheService.evaluateWithCache(expr, context), executorService))
                    .collect(Collectors.toList());
                
                return futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList());
                
            } finally {
                sample.stop(Timer.builder("expression.parallel.evaluate.duration")
                    .description("Time taken to evaluate expressions in parallel")
                    .tag("count", String.valueOf(expressions.size()))
                    .register(meterRegistry));
            }
        }, executorService);
    }
    
    public CompletableFuture<Map<String, Object>> evaluateParallelWithNames(
            Map<String, String> namedExpressions, Context context) {
        
        return CompletableFuture.supplyAsync(() -> {
            Map<String, CompletableFuture<Object>> futures = namedExpressions.entrySet().stream()
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    entry -> CompletableFuture.supplyAsync(() -> 
                        cacheService.evaluateWithCache(entry.getValue(), context), executorService)
                ));
            
            return futures.entrySet().stream()
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    entry -> entry.getValue().join()
                ));
        }, executorService);
    }
    
    public CompletableFuture<List<Boolean>> evaluateConditionsParallel(
            List<String> conditions, Context context) {
        
        return CompletableFuture.supplyAsync(() -> {
            List<CompletableFuture<Boolean>> futures = conditions.stream()
                .map(condition -> CompletableFuture.supplyAsync(() -> {
                    Object result = cacheService.evaluateWithCache(condition, context);
                    return convertToBoolean(result);
                }, executorService))
                .collect(Collectors.toList());
            
            return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
        }, executorService);
    }
    
    private boolean convertToBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue() != 0;
        }
        if (value instanceof String) {
            return !((String) value).isEmpty();
        }
        return value != null;
    }
}
```

### 7.3 效能監控

```java
// 解釋器效能監控
@Component
public class InterpreterMetrics {
    private final MeterRegistry meterRegistry;
    private final Counter expressionEvaluationCounter;
    private final Timer expressionEvaluationTimer;
    private final DistributionSummary expressionComplexitySummary;
    private final Gauge activeContextsGauge;
    
    private final AtomicInteger activeContexts = new AtomicInteger(0);
    
    public InterpreterMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        
        this.expressionEvaluationCounter = Counter.builder("interpreter.expression.evaluation.count")
            .description("Number of expressions evaluated")
            .register(meterRegistry);
        
        this.expressionEvaluationTimer = Timer.builder("interpreter.expression.evaluation.duration")
            .description("Time taken to evaluate expressions")
            .register(meterRegistry);
        
        this.expressionComplexitySummary = DistributionSummary.builder("interpreter.expression.complexity")
            .description("Complexity of expressions (number of operations)")
            .register(meterRegistry);
        
        this.activeContextsGauge = Gauge.builder("interpreter.context.active")
            .description("Number of active interpreter contexts")
            .register(meterRegistry, activeContexts, AtomicInteger::get);
    }
    
    public void recordExpressionEvaluation(long durationNanos, int complexity, boolean success) {
        expressionEvaluationCounter.increment(
            Tags.of(Tag.of("success", String.valueOf(success)))
        );
        
        expressionEvaluationTimer.record(durationNanos, TimeUnit.NANOSECONDS);
        expressionComplexitySummary.record(complexity);
    }
    
    public void recordContextCreation() {
        activeContexts.incrementAndGet();
    }
    
    public void recordContextDestruction() {
        activeContexts.decrementAndGet();
    }
    
    public void recordRuleEngineExecution(long durationMs, int rulesExecuted, boolean success) {
        Timer.builder("interpreter.rule.engine.execution.duration")
            .description("Time taken to execute rule engine")
            .tag("success", String.valueOf(success))
            .register(meterRegistry)
            .record(durationMs, TimeUnit.MILLISECONDS);
        
        Counter.builder("interpreter.rule.engine.rules.executed")
            .description("Number of rules executed")
            .register(meterRegistry)
            .increment(rulesExecuted);
    }
    
    public void recordDSLUsage(String dslType, long buildTimeNanos) {
        Timer.builder("interpreter.dsl.build.duration")
            .description("Time taken to build DSL")
            .tag("dsl_type", dslType)
            .register(meterRegistry)
            .record(buildTimeNanos, TimeUnit.NANOSECONDS);
    }
}
```

### 7.4 記憶體優化

```java
// 記憶體優化的上下文管理
@Service
public class OptimizedContextManager {
    private final ObjectPool<Context> contextPool;
    private final InterpreterMetrics metrics;
    private final ScheduledExecutorService cleanupExecutor;
    
    public OptimizedContextManager(InterpreterMetrics metrics) {
        this.metrics = metrics;
        this.contextPool = new GenericObjectPool<>(new ContextPoolFactory());
        this.cleanupExecutor = Executors.newScheduledThreadPool(1);
        
        // 定期清理過期上下文
        cleanupExecutor.scheduleAtFixedRate(this::cleanupExpiredContexts, 
                                           1, 1, TimeUnit.MINUTES);
    }
    
    public Context borrowContext() {
        try {
            Context context = contextPool.borrowObject();
            metrics.recordContextCreation();
            return context;
        } catch (Exception e) {
            throw new RuntimeException("Failed to borrow context from pool", e);
        }
    }
    
    public void returnContext(Context context) {
        try {
            // 清理上下文數據
            if (context instanceof BaseContext) {
                ((BaseContext) context).clear();
            }
            
            contextPool.returnObject(context);
            metrics.recordContextDestruction();
        } catch (Exception e) {
            // 記錄錯誤但不拋出異常
            System.err.println("Failed to return context to pool: " + e.getMessage());
        }
    }
    
    public <T> T executeWithContext(Function<Context, T> operation) {
        Context context = borrowContext();
        try {
            return operation.apply(context);
        } finally {
            returnContext(context);
        }
    }
    
    private void cleanupExpiredContexts() {
        try {
            contextPool.clear();
        } catch (Exception e) {
            System.err.println("Failed to cleanup expired contexts: " + e.getMessage());
        }
    }
    
    // 上下文池工廠
    private static class ContextPoolFactory implements PooledObjectFactory<Context> {
        @Override
        public PooledObject<Context> makeObject() {
            return new DefaultPooledObject<>(new BaseContext());
        }
        
        @Override
        public void destroyObject(PooledObject<Context> p) {
            Context context = p.getObject();
            if (context instanceof BaseContext) {
                ((BaseContext) context).clear();
            }
        }
        
        @Override
        public boolean validateObject(PooledObject<Context> p) {
            return p.getObject() != null;
        }
        
        @Override
        public void activateObject(PooledObject<Context> p) {
            // 重置上下文狀態
        }
        
        @Override
        public void passivateObject(PooledObject<Context> p) {
            // 清理上下文數據
            Context context = p.getObject();
            if (context instanceof BaseContext) {
                ((BaseContext) context).clear();
            }
        }
    }
}

// 增強的 BaseContext 支持清理
public class BaseContext implements Context {
    private final Map<String, Object> variables;
    private final Context parent;
    
    public BaseContext() {
        this(null);
    }
    
    public BaseContext(Context parent) {
        this.variables = new ConcurrentHashMap<>();
        this.parent = parent;
    }
    
    public void clear() {
        variables.clear();
    }
    
    public int size() {
        return variables.size();
    }
    
    public boolean isEmpty() {
        return variables.isEmpty();
    }
    
    // ... 其他方法保持不變
}
```

## 8. 測試策略 (Testing Strategies)

### 8.1 單元測試

```java
// 表達式引擎單元測試
@ExtendWith(MockitoExtension.class)
class ExpressionEngineTest {
    
    @Mock
    private MeterRegistry meterRegistry;
    
    @InjectMocks
    private ExpressionEngine expressionEngine;
    
    @Test
    @DisplayName("應該正確解析和評估簡單數學表達式")
    void shouldParseAndEvaluateSimpleMathExpression() {
        // Given
        String expression = "2 + 3 * 4";
        Context context = new BaseContext();
        
        // When
        Object result = expressionEngine.evaluate(expression, context);
        
        // Then
        assertThat(result).isEqualTo(14.0);
    }
    
    @Test
    @DisplayName("應該正確處理變量引用")
    void shouldHandleVariableReferences() {
        // Given
        String expression = "x + y * 2";
        Context context = new BaseContext();
        context.setValue("x", 10);
        context.setValue("y", 5);
        
        // When
        Object result = expressionEngine.evaluate(expression, context);
        
        // Then
        assertThat(result).isEqualTo(20.0);
    }
    
    @Test
    @DisplayName("應該正確評估邏輯表達式")
    void shouldEvaluateLogicalExpressions() {
        // Given
        String expression = "age >= 18 && status == \"active\"";
        Context context = new BaseContext();
        context.setValue("age", 25);
        context.setValue("status", "active");
        
        // When
        boolean result = expressionEngine.evaluateBoolean(expression, context);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    @DisplayName("應該正確處理函數調用")
    void shouldHandleFunctionCalls() {
        // Given
        String expression = "max(10, 20) + min(5, 3)";
        Context context = new BaseContext();
        
        // When
        Object result = expressionEngine.evaluate(expression, context);
        
        // Then
        assertThat(result).isEqualTo(23.0);
    }
    
    @Test
    @DisplayName("應該拋出異常當變量不存在時")
    void shouldThrowExceptionWhenVariableNotFound() {
        // Given
        String expression = "unknownVariable + 5";
        Context context = new BaseContext();
        
        // When & Then
        assertThatThrownBy(() -> expressionEngine.evaluate(expression, context))
            .isInstanceOf(InterpreterException.class)
            .hasMessageContaining("Variable 'unknownVariable' not found");
    }
    
    @Test
    @DisplayName("應該處理複雜的嵌套表達式")
    void shouldHandleComplexNestedExpressions() {
        // Given
        String expression = "(x + y) * (z - w) / 2";
        Context context = new BaseContext();
        context.setValue("x", 10);
        context.setValue("y", 5);
        context.setValue("z", 20);
        context.setValue("w", 8);
        
        // When
        Object result = expressionEngine.evaluate(expression, context);
        
        // Then
        assertThat(result).isEqualTo(90.0); // (10+5) * (20-8) / 2 = 15 * 12 / 2 = 90
    }
}

// 規則引擎單元測試
@ExtendWith(MockitoExtension.class)
class DefaultRuleEngineTest {
    
    @Mock
    private RuleEngineMetrics metrics;
    
    @InjectMocks
    private DefaultRuleEngine ruleEngine;
    
    @Test
    @DisplayName("應該按優先級執行規則")
    void shouldExecuteRulesByPriority() {
        // Given
        List<Rule> rules = Arrays.asList(
            createMockRule("LowPriorityRule", 1, true),
            createMockRule("HighPriorityRule", 10, true),
            createMockRule("MediumPriorityRule", 5, true)
        );
        
        RuleContext context = new RuleContext();
        
        // When
        RuleExecutionResult result = ruleEngine.execute(rules, context);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        List<RuleExecutionEvent> events = context.getEvents();
        assertThat(events).hasSize(3);
        assertThat(events.get(0).getRuleName()).isEqualTo("HighPriorityRule");
        assertThat(events.get(1).getRuleName()).isEqualTo("MediumPriorityRule");
        assertThat(events.get(2).getRuleName()).isEqualTo("LowPriorityRule");
    }
    
    @Test
    @DisplayName("應該跳過不匹配的規則")
    void shouldSkipNonMatchingRules() {
        // Given
        List<Rule> rules = Arrays.asList(
            createMockRule("MatchingRule", 5, true),
            createMockRule("NonMatchingRule", 5, false)
        );
        
        RuleContext context = new RuleContext();
        
        // When
        RuleExecutionResult result = ruleEngine.execute(rules, context);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        List<RuleExecutionEvent> events = context.getEvents();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getRuleName()).isEqualTo("MatchingRule");
    }
    
    private Rule createMockRule(String name, int priority, boolean matches) {
        Rule rule = mock(Rule.class);
        when(rule.getName()).thenReturn(name);
        when(rule.getPriority()).thenReturn(priority);
        when(rule.isEnabled()).thenReturn(true);
        when(rule.matches(any())).thenReturn(matches);
        when(rule.execute(any())).thenReturn(new RuleResult(true, "Success"));
        return rule;
    }
}
```

### 8.2 整合測試

```java
// 表達式引擎整合測試
@SpringBootTest
@TestPropertySource(locations = "classpath:test.properties")
class ExpressionEngineIntegrationTest {
    
    @Autowired
    private ExpressionEngine expressionEngine;
    
    @Autowired
    private ExpressionCacheService cacheService;
    
    @Test
    @DisplayName("應該正確整合緩存和度量")
    void shouldIntegrateWithCacheAndMetrics() {
        // Given
        String expression = "x * 2 + y";
        Context context = new BaseContext();
        context.setValue("x", 10);
        context.setValue("y", 5);
        
        // When - 第一次評估
        Object result1 = cacheService.evaluateWithCache(expression, context);
        
        // When - 第二次評估（應該從緩存取得）
        Object result2 = cacheService.evaluateWithCache(expression, context);
        
        // Then
        assertThat(result1).isEqualTo(25.0);
        assertThat(result2).isEqualTo(25.0);
        assertThat(cacheService.getCacheStats().hitCount()).isEqualTo(1);
    }
    
    @Test
    @DisplayName("應該支持並行表達式評估")
    void shouldSupportParallelExpressionEvaluation() {
        // Given
        List<String> expressions = Arrays.asList(
            "x + 1",
            "y * 2",
            "z / 3"
        );
        
        Context context = new BaseContext();
        context.setValue("x", 10);
        context.setValue("y", 15);
        context.setValue("z", 30);
        
        // When
        CompletableFuture<List<Object>> future = parallelProcessor.evaluateParallel(expressions, context);
        List<Object> results = future.join();
        
        // Then
        assertThat(results).hasSize(3);
        assertThat(results.get(0)).isEqualTo(11.0);
        assertThat(results.get(1)).isEqualTo(30.0);
        assertThat(results.get(2)).isEqualTo(10.0);
    }
}

// 規則引擎整合測試
@SpringBootTest
@TestPropertySource(locations = "classpath:test.properties")
class RuleEngineIntegrationTest {
    
    @Autowired
    private RuleEngine ruleEngine;
    
    @Autowired
    private DynamicRuleLoader ruleLoader;
    
    @Test
    @DisplayName("應該能夠從 JSON 載入和執行規則")
    void shouldLoadAndExecuteRulesFromJson() {
        // Given
        String rulesJson = """
            [
                {
                    "name": "VipCustomerRule",
                    "description": "Apply VIP discount for high-value customers",
                    "priority": 10,
                    "condition": "customerValue > 1000 && customerType == 'premium'",
                    "actions": [
                        {
                            "name": "ApplyDiscount",
                            "type": "set_variable",
                            "parameters": {
                                "name": "discount",
                                "value": 0.1
                            }
                        }
                    ],
                    "enabled": true
                }
            ]
            """;
        
        // When
        ruleLoader.loadRulesFromJson(rulesJson);
        
        RuleContext context = new RuleContext();
        context.setVariable("customerValue", 1500);
        context.setVariable("customerType", "premium");
        
        RuleExecutionResult result = ruleEngine.execute("VipCustomerRule", context);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(context.getVariable("discount")).isEqualTo(0.1);
    }
}
```

### 8.3 效能測試

```java
// 效能測試
@SpringBootTest
@ExtendWith(SpringExtension.class)
class InterpreterPerformanceTest {
    
    @Autowired
    private ExpressionEngine expressionEngine;
    
    @Autowired
    private ExpressionCacheService cacheService;
    
    @Test
    @DisplayName("表達式評估效能測試")
    void expressionEvaluationPerformanceTest() {
        // Given
        String expression = "x * 2 + y / 3 - z + abs(w)";
        Context context = new BaseContext();
        context.setValue("x", 10);
        context.setValue("y", 15);
        context.setValue("z", 5);
        context.setValue("w", -3);
        
        int iterations = 10000;
        
        // When
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            expressionEngine.evaluate(expression, context);
        }
        
        long endTime = System.currentTimeMillis();
        
        // Then
        long totalTime = endTime - startTime;
        double averageTime = (double) totalTime / iterations;
        
        System.out.println("評估 " + iterations + " 次表達式花費時間: " + totalTime + "ms");
        System.out.println("平均每次評估時間: " + averageTime + "ms");
        
        assertThat(averageTime).isLessThan(1.0); // 平均每次評估應少於 1ms
    }
    
    @Test
    @DisplayName("快取效能測試")
    void cachePerformanceTest() {
        // Given
        String expression = "sqrt(x^2 + y^2) + max(a, b, c)";
        Context context = new BaseContext();
        context.setValue("x", 3);
        context.setValue("y", 4);
        context.setValue("a", 10);
        context.setValue("b", 20);
        context.setValue("c", 15);
        
        int iterations = 5000;
        
        // When - 使用快取
        long startTimeWithCache = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            cacheService.evaluateWithCache(expression, context);
        }
        
        long endTimeWithCache = System.currentTimeMillis();
        
        // When - 不使用快取
        long startTimeWithoutCache = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            expressionEngine.evaluate(expression, context);
        }
        
        long endTimeWithoutCache = System.currentTimeMillis();
        
        // Then
        long timeWithCache = endTimeWithCache - startTimeWithCache;
        long timeWithoutCache = endTimeWithoutCache - startTimeWithoutCache;
        
        System.out.println("使用快取時間: " + timeWithCache + "ms");
        System.out.println("不使用快取時間: " + timeWithoutCache + "ms");
        System.out.println("效能提升: " + (timeWithoutCache - timeWithCache) + "ms");
        
        assertThat(timeWithCache).isLessThan(timeWithoutCache);
    }
    
    @Test
    @DisplayName("並行處理效能測試")
    void parallelProcessingPerformanceTest() {
        // Given
        List<String> expressions = IntStream.range(0, 1000)
            .mapToObj(i -> "x" + i + " * 2 + y" + i)
            .collect(Collectors.toList());
        
        Context context = new BaseContext();
        for (int i = 0; i < 1000; i++) {
            context.setValue("x" + i, i);
            context.setValue("y" + i, i * 2);
        }
        
        // When - 串行處理
        long startTimeSerial = System.currentTimeMillis();
        
        List<Object> serialResults = expressions.stream()
            .map(expr -> expressionEngine.evaluate(expr, context))
            .collect(Collectors.toList());
        
        long endTimeSerial = System.currentTimeMillis();
        
        // When - 並行處理
        long startTimeParallel = System.currentTimeMillis();
        
        List<Object> parallelResults = parallelProcessor.evaluateParallel(expressions, context).join();
        
        long endTimeParallel = System.currentTimeMillis();
        
        // Then
        long serialTime = endTimeSerial - startTimeSerial;
        long parallelTime = endTimeParallel - startTimeParallel;
        
        System.out.println("串行處理時間: " + serialTime + "ms");
        System.out.println("並行處理時間: " + parallelTime + "ms");
        System.out.println("效能提升: " + (serialTime - parallelTime) + "ms");
        
        assertThat(serialResults).hasSize(1000);
        assertThat(parallelResults).hasSize(1000);
        assertThat(parallelTime).isLessThan(serialTime);
    }
}
```

## 9. 最佳實踐與反模式 (Best Practices & Anti-Patterns)

### 9.1 最佳實踐

#### 9.1.1 表達式設計原則

```java
// ✅ 良好的表達式設計
public class ExpressionDesignBestPractices {
    
    // 使用清晰的變量名
    public void demonstrateGoodVariableNaming() {
        String expression = "customerAge >= minimumAge && customerStatus == 'active'";
        // 清晰表達業務邏輯
    }
    
    // 避免過度複雜的表達式
    public void demonstrateSimpleExpressions() {
        // ❌ 避免：複雜的單一表達式
        String badExpression = "((customerAge >= 18 && customerAge <= 65) && " +
                              "(customerIncome > 50000 || customerCreditScore > 700)) && " +
                              "(customerRegion == 'US' || customerRegion == 'EU')";
        
        // ✅ 推薦：拆分為多個簡單表達式
        String ageValid = "customerAge >= 18 && customerAge <= 65";
        String incomeOrCreditValid = "customerIncome > 50000 || customerCreditScore > 700";
        String regionValid = "customerRegion == 'US' || customerRegion == 'EU'";
        
        // 然後組合使用
        Context context = new BaseContext();
        ExpressionEngine engine = new ExpressionEngine();
        
        boolean eligible = engine.evaluateBoolean(ageValid, context) &&
                          engine.evaluateBoolean(incomeOrCreditValid, context) &&
                          engine.evaluateBoolean(regionValid, context);
    }
    
    // 使用類型安全的表達式
    public void demonstrateTypeSafeExpressions() {
        // ✅ 明確的類型轉換
        String expression = "parseInt(userInput) > 0";
        
        // ✅ 使用適當的比較運算子
        String stringComparison = "customerName.length() > 0";
        String numberComparison = "customerAge >= 18";
    }
    
    // 實現表達式驗證
    public boolean validateExpression(String expression) {
        try {
            ExpressionEngine engine = new ExpressionEngine();
            Expression parsed = engine.parse(expression);
            
            // 檢查表達式複雜度
            if (getExpressionComplexity(parsed) > 10) {
                return false;
            }
            
            // 檢查必要變量
            Set<String> requiredVariables = extractRequiredVariables(parsed);
            if (requiredVariables.isEmpty()) {
                return false;
            }
            
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    private int getExpressionComplexity(Expression expression) {
        // 實現複雜度計算邏輯
        return 1; // 簡化實現
    }
    
    private Set<String> extractRequiredVariables(Expression expression) {
        // 實現變量提取邏輯
        return Set.of(); // 簡化實現
    }
}
```

#### 9.1.2 安全性最佳實踐

```java
// 安全性最佳實踐
@Component
public class SecurityBestPractices {
    
    // 輸入驗證
    public Object evaluateSecurely(String expression, Context context) {
        // 1. 驗證表達式長度
        if (expression.length() > 1000) {
            throw new SecurityException("Expression too long");
        }
        
        // 2. 檢查危險函數
        if (containsDangerousFunctions(expression)) {
            throw new SecurityException("Dangerous function detected");
        }
        
        // 3. 驗證變量名稱
        if (containsInvalidVariableNames(expression)) {
            throw new SecurityException("Invalid variable names");
        }
        
        // 4. 使用受限的上下文
        Context restrictedContext = createRestrictedContext(context);
        
        // 5. 設置執行超時
        return executeWithTimeout(expression, restrictedContext, Duration.ofSeconds(5));
    }
    
    private boolean containsDangerousFunctions(String expression) {
        List<String> dangerousFunctions = Arrays.asList(
            "system", "exec", "eval", "import", "require", "load"
        );
        
        return dangerousFunctions.stream()
            .anyMatch(func -> expression.toLowerCase().contains(func.toLowerCase()));
    }
    
    private boolean containsInvalidVariableNames(String expression) {
        // 檢查是否包含系統變量或保留字
        List<String> reservedWords = Arrays.asList(
            "system", "runtime", "class", "classloader", "thread"
        );
        
        return reservedWords.stream()
            .anyMatch(word -> expression.toLowerCase().contains(word.toLowerCase()));
    }
    
    private Context createRestrictedContext(Context originalContext) {
        // 創建受限的上下文，只允許特定變量
        RestrictedContext restrictedContext = new RestrictedContext();
        
        // 只複製白名單中的變量
        List<String> allowedVariables = Arrays.asList(
            "customerAge", "customerIncome", "customerStatus", "orderAmount"
        );
        
        for (String varName : allowedVariables) {
            Object value = originalContext.getValue(varName);
            if (value != null) {
                restrictedContext.setValue(varName, value);
            }
        }
        
        return restrictedContext;
    }
    
    private Object executeWithTimeout(String expression, Context context, Duration timeout) {
        CompletableFuture<Object> future = CompletableFuture.supplyAsync(() -> {
            ExpressionEngine engine = new ExpressionEngine();
            return engine.evaluate(expression, context);
        });
        
        try {
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SecurityException("Expression execution timeout");
        } catch (Exception e) {
            throw new SecurityException("Expression execution failed", e);
        }
    }
}

// 受限上下文實現
public class RestrictedContext implements Context {
    private final Map<String, Object> variables = new HashMap<>();
    
    @Override
    public Object getValue(String variable) {
        return variables.get(variable);
    }
    
    @Override
    public void setValue(String variable, Object value) {
        // 只允許設置特定類型的值
        if (isAllowedValue(value)) {
            variables.put(variable, value);
        } else {
            throw new SecurityException("Value type not allowed: " + value.getClass());
        }
    }
    
    private boolean isAllowedValue(Object value) {
        return value instanceof Number || 
               value instanceof String || 
               value instanceof Boolean ||
               value instanceof LocalDate ||
               value instanceof LocalDateTime;
    }
    
    @Override
    public boolean hasVariable(String variable) {
        return variables.containsKey(variable);
    }
    
    @Override
    public Context createChild() {
        return new RestrictedContext();
    }
    
    @Override
    public Context getParent() {
        return null;
    }
}
```

#### 9.1.3 效能最佳實踐

```java
// 效能最佳實踐
@Component
public class PerformanceBestPractices {
    
    private final ExpressionCacheService cacheService;
    private final ParallelExpressionProcessor parallelProcessor;
    
    public PerformanceBestPractices(ExpressionCacheService cacheService,
                                   ParallelExpressionProcessor parallelProcessor) {
        this.cacheService = cacheService;
        this.parallelProcessor = parallelProcessor;
    }
    
    // 使用批量處理
    public List<Object> evaluateExpressionsBatch(List<String> expressions, Context context) {
        // ✅ 使用並行處理大量表達式
        if (expressions.size() > 10) {
            return parallelProcessor.evaluateParallel(expressions, context).join();
        }
        
        // ✅ 小量表達式使用快取
        return expressions.stream()
            .map(expr -> cacheService.evaluateWithCache(expr, context))
            .collect(Collectors.toList());
    }
    
    // 預編譯常用表達式
    @PostConstruct
    public void precompileCommonExpressions() {
        List<String> commonExpressions = Arrays.asList(
            "customerAge >= 18",
            "orderAmount > 0",
            "customerStatus == 'active'",
            "paymentMethod == 'credit_card'"
        );
        
        // 預編譯並快取
        Context dummyContext = new BaseContext();
        for (String expression : commonExpressions) {
            cacheService.getOrParseExpression(expression);
        }
    }
    
    // 使用物件池
    public Object evaluateWithPooledContext(String expression, Map<String, Object> variables) {
        Context context = contextPool.borrowObject();
        
        try {
            // 設置變量
            variables.forEach(context::setValue);
            
            // 評估表達式
            return cacheService.evaluateWithCache(expression, context);
            
        } finally {
            // 清理並歸還上下文
            if (context instanceof BaseContext) {
                ((BaseContext) context).clear();
            }
            contextPool.returnObject(context);
        }
    }
    
    // 監控效能指標
    public void monitorPerformance() {
        // 定期檢查快取命中率
        CacheStats stats = cacheService.getCacheStats();
        if (stats.hitRate() < 0.8) {
            // 快取命中率低於 80%，需要優化
            optimizeCache();
        }
        
        // 檢查平均執行時間
        if (getAverageExecutionTime() > Duration.ofMillis(100)) {
            // 平均執行時間過長，需要優化
            optimizeExpressions();
        }
    }
    
    private void optimizeCache() {
        // 增加快取大小或調整過期時間
    }
    
    private void optimizeExpressions() {
        // 分析慢查詢，優化表達式
    }
    
    private Duration getAverageExecutionTime() {
        // 從指標系統取得平均執行時間
        return Duration.ofMillis(50);
    }
}
```

### 9.2 反模式與避免方式

#### 9.2.1 常見反模式

```java
// 反模式示例
public class InterpreterAntiPatterns {
    
    // ❌ 反模式：不安全的表達式執行
    public class UnsafeExpressionExecution {
        public Object evaluateUnsafely(String userInput) {
            // 直接執行用戶輸入，非常危險
            return new ExpressionEngine().evaluate(userInput);
        }
    }
    
    // ✅ 正確做法：安全的表達式執行
    public class SafeExpressionExecution {
        private final SecurityBestPractices security;
        
        public SafeExpressionExecution(SecurityBestPractices security) {
            this.security = security;
        }
        
        public Object evaluateSafely(String expression, Context context) {
            return security.evaluateSecurely(expression, context);
        }
    }
    
    // ❌ 反模式：忽略異常處理
    public class PoorExceptionHandling {
        public Object evaluate(String expression, Context context) {
            try {
                return new ExpressionEngine().evaluate(expression, context);
            } catch (Exception e) {
                // 忽略異常，返回 null
                return null;
            }
        }
    }
    
    // ✅ 正確做法：適當的異常處理
    public class ProperExceptionHandling {
        private final Logger logger = LoggerFactory.getLogger(ProperExceptionHandling.class);
        
        public Object evaluate(String expression, Context context) {
            try {
                return new ExpressionEngine().evaluate(expression, context);
            } catch (InterpreterException e) {
                logger.warn("Expression evaluation failed: {}", expression, e);
                throw new BusinessLogicException("Unable to evaluate expression", e);
            } catch (Exception e) {
                logger.error("Unexpected error during expression evaluation: {}", expression, e);
                throw new SystemException("System error during expression evaluation", e);
            }
        }
    }
    
    // ❌ 反模式：記憶體洩漏
    public class MemoryLeakAntiPattern {
        // 永不清理的快取
        private final Map<String, Expression> cache = new ConcurrentHashMap<>();
        
        public Object evaluate(String expression, Context context) {
            Expression expr = cache.computeIfAbsent(expression, 
                key -> new ExpressionEngine().parse(key));
            return expr.interpret(context);
        }
    }
    
    // ✅ 正確做法：使用有限制的快取
    public class ProperCacheManagement {
        private final Cache<String, Expression> cache;
        
        public ProperCacheManagement() {
            this.cache = Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(Duration.ofHours(1))
                .build();
        }
        
        public Object evaluate(String expression, Context context) {
            Expression expr = cache.get(expression, 
                key -> new ExpressionEngine().parse(key));
            return expr.interpret(context);
        }
    }
    
    // ❌ 反模式：阻塞式串行處理
    public class BlockingSerialProcessing {
        public List<Object> evaluateExpressions(List<String> expressions, Context context) {
            return expressions.stream()
                .map(expr -> {
                    try {
                        Thread.sleep(100); // 模擬耗時操作
                        return new ExpressionEngine().evaluate(expr, context);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(e);
                    }
                })
                .collect(Collectors.toList());
        }
    }
    
    // ✅ 正確做法：並行異步處理
    public class NonBlockingParallelProcessing {
        private final ExecutorService executorService = Executors.newVirtualThreadPerTaskExecutor();
        
        public CompletableFuture<List<Object>> evaluateExpressions(List<String> expressions, Context context) {
            List<CompletableFuture<Object>> futures = expressions.stream()
                .map(expr -> CompletableFuture.supplyAsync(() -> {
                    try {
                        Thread.sleep(100); // 模擬耗時操作
                        return new ExpressionEngine().evaluate(expr, context);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(e);
                    }
                }, executorService))
                .collect(Collectors.toList());
            
            return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList()));
        }
    }
}
```

## 10. 現代化 Java 特性整合 (Modern Java Features Integration)

### 10.1 Record 和 Sealed Interface

```java
// 使用 Record 定義不可變的表達式結果
public record ExpressionResult(
    Object value,
    Class<?> type,
    Instant evaluatedAt,
    Duration executionTime
) {
    public ExpressionResult {
        Objects.requireNonNull(value, "Value cannot be null");
        Objects.requireNonNull(type, "Type cannot be null");
        Objects.requireNonNull(evaluatedAt, "Evaluated time cannot be null");
        Objects.requireNonNull(executionTime, "Execution time cannot be null");
    }
    
    public static ExpressionResult of(Object value, Duration executionTime) {
        return new ExpressionResult(
            value,
            value.getClass(),
            Instant.now(),
            executionTime
        );
    }
    
    public boolean isNumeric() {
        return value instanceof Number;
    }
    
    public boolean isString() {
        return value instanceof String;
    }
    
    public boolean isBoolean() {
        return value instanceof Boolean;
    }
}

// 使用 Sealed Interface 限制表達式類型
public sealed interface ModernExpression 
    permits LiteralExpression, VariableExpression, BinaryExpression, FunctionExpression {
    
    ExpressionResult evaluate(Context context);
    
    default ExpressionType getType() {
        return switch (this) {
            case LiteralExpression literal -> ExpressionType.LITERAL;
            case VariableExpression variable -> ExpressionType.VARIABLE;
            case BinaryExpression binary -> ExpressionType.BINARY;
            case FunctionExpression function -> ExpressionType.FUNCTION;
        };
    }
}

// 使用 Pattern Matching 的表達式處理
public class ModernExpressionProcessor {
    
    public ExpressionResult processExpression(ModernExpression expression, Context context) {
        return switch (expression) {
            case LiteralExpression(var value) -> {
                yield ExpressionResult.of(value, Duration.ofNanos(100));
            }
            
            case VariableExpression(var name) -> {
                Object value = context.getValue(name);
                if (value == null) {
                    throw new InterpreterException("Variable not found: " + name);
                }
                yield ExpressionResult.of(value, Duration.ofNanos(200));
            }
            
            case BinaryExpression(var left, var right, var operator) -> {
                long startTime = System.nanoTime();
                Object leftResult = processExpression(left, context).value();
                Object rightResult = processExpression(right, context).value();
                Object result = performOperation(leftResult, rightResult, operator);
                long duration = System.nanoTime() - startTime;
                yield ExpressionResult.of(result, Duration.ofNanos(duration));
            }
            
            case FunctionExpression(var name, var args) -> {
                long startTime = System.nanoTime();
                List<Object> argValues = args.stream()
                    .map(arg -> processExpression(arg, context).value())
                    .collect(Collectors.toList());
                Object result = executeFunction(name, argValues);
                long duration = System.nanoTime() - startTime;
                yield ExpressionResult.of(result, Duration.ofNanos(duration));
            }
        };
    }
    
    private Object performOperation(Object left, Object right, String operator) {
        return switch (operator) {
            case "+" -> {
                if (left instanceof Number l && right instanceof Number r) {
                    yield l.doubleValue() + r.doubleValue();
                }
                yield left.toString() + right.toString();
            }
            case "-" -> {
                if (left instanceof Number l && right instanceof Number r) {
                    yield l.doubleValue() - r.doubleValue();
                }
                throw new InterpreterException("Cannot subtract non-numeric values");
            }
            case "*" -> {
                if (left instanceof Number l && right instanceof Number r) {
                    yield l.doubleValue() * r.doubleValue();
                }
                throw new InterpreterException("Cannot multiply non-numeric values");
            }
            case "/" -> {
                if (left instanceof Number l && right instanceof Number r) {
                    if (r.doubleValue() == 0) {
                        throw new InterpreterException("Division by zero");
                    }
                    yield l.doubleValue() / r.doubleValue();
                }
                throw new InterpreterException("Cannot divide non-numeric values");
            }
            default -> throw new InterpreterException("Unknown operator: " + operator);
        };
    }
    
    private Object executeFunction(String name, List<Object> args) {
        return switch (name.toLowerCase()) {
            case "abs" -> {
                if (args.size() != 1 || !(args.get(0) instanceof Number)) {
                    throw new InterpreterException("abs() requires one numeric argument");
                }
                yield Math.abs(((Number) args.get(0)).doubleValue());
            }
            case "max" -> {
                if (args.size() != 2) {
                    throw new InterpreterException("max() requires two arguments");
                }
                if (args.get(0) instanceof Number a && args.get(1) instanceof Number b) {
                    yield Math.max(a.doubleValue(), b.doubleValue());
                }
                throw new InterpreterException("max() requires numeric arguments");
            }
            case "min" -> {
                if (args.size() != 2) {
                    throw new InterpreterException("min() requires two arguments");
                }
                if (args.get(0) instanceof Number a && args.get(1) instanceof Number b) {
                    yield Math.min(a.doubleValue(), b.doubleValue());
                }
                throw new InterpreterException("min() requires numeric arguments");
            }
            default -> throw new InterpreterException("Unknown function: " + name);
        };
    }
}
```

### 10.2 Virtual Threads 和 Structured Concurrency

```java
// 使用 Virtual Threads 的表達式引擎
@Service
public class VirtualThreadExpressionEngine {
    
    public CompletableFuture<List<ExpressionResult>> evaluateWithVirtualThreads(
            List<String> expressions, Context context) {
        
        return CompletableFuture.supplyAsync(() -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                
                // 為每個表達式創建 Virtual Thread 任務
                List<StructuredTaskScope.Subtask<ExpressionResult>> tasks = expressions.stream()
                    .map(expr -> scope.fork(() -> {
                        long startTime = System.nanoTime();
                        try {
                            ExpressionEngine engine = new ExpressionEngine();
                            Object result = engine.evaluate(expr, context);
                            long duration = System.nanoTime() - startTime;
                            return ExpressionResult.of(result, Duration.ofNanos(duration));
                        } catch (Exception e) {
                            throw new InterpreterException("Failed to evaluate: " + expr, e);
                        }
                    }))
                    .collect(Collectors.toList());
                
                // 等待所有任務完成
                scope.join();
                scope.throwIfFailed();
                
                // 收集結果
                return tasks.stream()
                    .map(StructuredTaskScope.Subtask::get)
                    .collect(Collectors.toList());
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new InterpreterException("Expression evaluation interrupted", e);
            } catch (ExecutionException e) {
                throw new InterpreterException("Expression evaluation failed", e.getCause());
            }
        });
    }
    
    // 使用 Virtual Threads 的規則引擎
    public CompletableFuture<RuleExecutionResult> executeRulesWithVirtualThreads(
            List<Rule> rules, RuleContext context) {
        
        return CompletableFuture.supplyAsync(() -> {
            try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
                
                // 並行檢查規則匹配
                List<StructuredTaskScope.Subtask<Optional<RuleResult>>> tasks = rules.stream()
                    .map(rule -> scope.fork(() -> {
                        if (rule.matches(context)) {
                            return Optional.of(rule.execute(context));
                        }
                        return Optional.<RuleResult>empty();
                    }))
                    .collect(Collectors.toList());
                
                // 等待所有任務完成
                scope.join();
                scope.throwIfFailed();
                
                // 收集結果
                List<RuleResult> results = tasks.stream()
                    .map(StructuredTaskScope.Subtask::get)
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
                
                return new RuleExecutionResult(true, "Rules executed successfully", 
                                             results, System.currentTimeMillis());
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuleExecutionException("Rule execution interrupted", e);
            } catch (ExecutionException e) {
                throw new RuleExecutionException("Rule execution failed", e.getCause());
            }
        });
    }
}
```

### 10.3 Stream API 和 Optional 的進階使用

```java
// 函數式編程風格的表達式處理
@Service
public class FunctionalExpressionProcessor {
    
    public Optional<ExpressionResult> evaluateWithOptional(String expression, Context context) {
        return Optional.ofNullable(expression)
            .filter(expr -> !expr.trim().isEmpty())
            .map(expr -> {
                try {
                    long startTime = System.nanoTime();
                    ExpressionEngine engine = new ExpressionEngine();
                    Object result = engine.evaluate(expr, context);
                    long duration = System.nanoTime() - startTime;
                    return ExpressionResult.of(result, Duration.ofNanos(duration));
                } catch (Exception e) {
                    return null;
                }
            });
    }
    
    public Stream<ExpressionResult> evaluateStream(Stream<String> expressions, Context context) {
        return expressions
            .parallel()
            .map(expr -> evaluateWithOptional(expr, context))
            .filter(Optional::isPresent)
            .map(Optional::get);
    }
    
    public Map<String, Object> evaluateToMap(Map<String, String> namedExpressions, Context context) {
        return namedExpressions.entrySet().stream()
            .parallel()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> evaluateWithOptional(entry.getValue(), context)
                    .map(ExpressionResult::value)
                    .orElse(null),
                (existing, replacement) -> replacement,
                ConcurrentHashMap::new
            ));
    }
    
    public List<ExpressionResult> evaluateWithFiltering(List<String> expressions, 
                                                       Context context,
                                                       Predicate<ExpressionResult> filter) {
        return expressions.stream()
            .parallel()
            .map(expr -> evaluateWithOptional(expr, context))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .filter(filter)
            .collect(Collectors.toList());
    }
    
    public Optional<ExpressionResult> findFirst(List<String> expressions, 
                                               Context context,
                                               Predicate<ExpressionResult> condition) {
        return expressions.stream()
            .map(expr -> evaluateWithOptional(expr, context))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .filter(condition)
            .findFirst();
    }
    
    public Map<Boolean, List<ExpressionResult>> partitionResults(List<String> expressions, 
                                                               Context context,
                                                               Predicate<ExpressionResult> condition) {
        return expressions.stream()
            .parallel()
            .map(expr -> evaluateWithOptional(expr, context))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.partitioningBy(condition));
    }
}
```

## 11. 總結 (Summary)

### 11.1 Interpreter 模式的現代價值

Interpreter 模式在現代軟體開發中展現出強大的適應性和擴展性：

1. **動態性**：支援運行時動態解析和執行，滿足現代應用對靈活性的需求
2. **可擴展性**：通過組合模式構建複雜表達式，支援無限擴展的語言特性
3. **領域特定**：能夠構建針對特定業務領域的 DSL，提高開發效率
4. **企業整合**：與 Spring、規則引擎、工作流等企業級框架完美整合

### 11.2 關鍵技術整合

本文展示了 Interpreter 模式與現代 Java 技術的深度整合：

1. **Spring Expression Language (SpEL)**：提供強大的表達式處理能力
2. **企業規則引擎**：支援動態規則載入和執行
3. **DSL 構建**：流暢接口和建造者模式構建易用的 DSL
4. **效能優化**：快取、並行處理、Virtual Threads 等現代化技術
5. **監控和指標**：完整的效能監控和度量體系

### 11.3 最佳實踐總結

1. **安全性優先**：輸入驗證、執行沙箱、超時控制
2. **效能優化**：表達式快取、並行處理、記憶體管理
3. **可維護性**：清晰的接口設計、完善的錯誤處理
4. **可測試性**：充分的單元測試、整合測試、效能測試
5. **可擴展性**：模組化設計、插件架構、配置驅動

### 11.4 未來發展趨勢

1. **AI 輔助**：機器學習驅動的表達式優化和錯誤檢測
2. **雲原生**：Kubernetes 原生的表達式引擎和規則引擎
3. **低程式碼**：視覺化的表達式和規則編輯器
4. **實時處理**：Stream 處理和事件驅動架構整合
5. **邊緣計算**：輕量級表達式引擎支援邊緣設備

通過本文的完整實現和分析，我們可以看到 Interpreter 模式在現代 Java 企業級應用中的強大威力和廣泛應用前景。正確使用這個模式，結合現代 Java 特性和企業級框架，能夠構建出高效、安全、可維護的動態表達式處理系統。

---

*Interpreter 模式實現完成 - 涵蓋基礎概念、Spring Expression Language 整合、企業規則引擎、DSL 模式、效能優化、現代化特性、最佳實踐、測試策略等全方位內容*