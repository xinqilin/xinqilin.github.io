---
title: "FTP 工具類實作指南：安全、可靠的檔案傳輸解決方案"
author: Bill.Lin
date: 2023-01-05T23:45:46+08:00
draft: false
tags: ["Java", "FTP", "FileTransfer", "Spring", "Commons-Net", "Security"]
Description: "完整的 FTP 工具類實作指南，包含連線池管理、安全配置、錯誤處理與最佳實踐"
Categories: ["Backend"]
DisableComments: false
---

## 概述

FTP（File Transfer Protocol）是企業環境中常用的檔案傳輸協定。本文提供一個完整、安全且可靠的 FTP 工具類實作，適用於生產環境的檔案上傳、下載和管理需求。

## 核心特性

- ✅ **配置外部化**：所有連線資訊透過配置檔案管理
- ✅ **連線池管理**：支援連線複用，提升效能
- ✅ **完整錯誤處理**：詳細的異常處理和重試機制
- ✅ **檔案操作**：上傳、下載、刪除、列表等完整功能
- ✅ **安全考量**：密碼加密、連線超時、資源釋放
- ✅ **日誌記錄**：完整的操作日誌和監控

## 依賴配置

### Maven 依賴

```xml
<dependencies>
    <!-- Apache Commons Net -->
    <dependency>
        <groupId>commons-net</groupId>
        <artifactId>commons-net</artifactId>
        <version>3.9.0</version>
    </dependency>
    
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    
    <!-- 配置處理 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-configuration-processor</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### Gradle 依賴

```groovy
dependencies {
    implementation 'commons-net:commons-net:3.9.0'
    implementation 'org.springframework.boot:spring-boot-starter'
    annotationProcessor 'org.springframework.boot:spring-boot-configuration-processor'
}
```

## 配置類設計

### FTP 配置屬性

```java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ftp")
public class FtpProperties {
    
    private String host;
    private int port = 21;
    private String username;
    private String password;
    private String basePath = "/";
    private int connectTimeout = 30000;  // 30 秒
    private int dataTimeout = 60000;     // 60 秒
    private int bufferSize = 8192;       // 8KB
    private String encoding = "UTF-8";
    private boolean passiveMode = true;
    private int maxConnections = 10;
    
    // Getters and Setters
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    
    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getBasePath() { return basePath; }
    public void setBasePath(String basePath) { this.basePath = basePath; }
    
    public int getConnectTimeout() { return connectTimeout; }
    public void setConnectTimeout(int connectTimeout) { this.connectTimeout = connectTimeout; }
    
    public int getDataTimeout() { return dataTimeout; }
    public void setDataTimeout(int dataTimeout) { this.dataTimeout = dataTimeout; }
    
    public int getBufferSize() { return bufferSize; }
    public void setBufferSize(int bufferSize) { this.bufferSize = bufferSize; }
    
    public String getEncoding() { return encoding; }
    public void setEncoding(String encoding) { this.encoding = encoding; }
    
    public boolean isPassiveMode() { return passiveMode; }
    public void setPassiveMode(boolean passiveMode) { this.passiveMode = passiveMode; }
    
    public int getMaxConnections() { return maxConnections; }
    public void setMaxConnections(int maxConnections) { this.maxConnections = maxConnections; }
}
```

### 應用配置檔案

```yaml
# application.yml
ftp:
  host: ${FTP_HOST:ftp.example.com}
  port: ${FTP_PORT:21}
  username: ${FTP_USERNAME:}
  password: ${FTP_PASSWORD:}
  base-path: ${FTP_BASE_PATH:/uploads}
  connect-timeout: 30000
  data-timeout: 60000
  buffer-size: 8192
  encoding: UTF-8
  passive-mode: true
  max-connections: 10

# 生產環境建議使用環境變數
# export FTP_HOST=your-ftp-server.com
# export FTP_USERNAME=your-username  
# export FTP_PASSWORD=your-secure-password
```

## 核心工具類實作

### FTP 連線工廠

```java
package com.example.util;

import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPReply;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.config.FtpProperties;

import java.io.IOException;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Component
public class FtpConnectionFactory {
    
    private static final Logger logger = LoggerFactory.getLogger(FtpConnectionFactory.class);
    
    @Autowired
    private FtpProperties ftpProperties;
    
    private final BlockingQueue<FTPClient> connectionPool = new LinkedBlockingQueue<>();
    
    /**
     * 建立 FTP 連線
     */
    public FTPClient createConnection() throws IOException {
        FTPClient ftpClient = new FTPClient();
        
        try {
            // 設定連線參數
            ftpClient.setConnectTimeout(ftpProperties.getConnectTimeout());
            ftpClient.setDataTimeout(ftpProperties.getDataTimeout());
            ftpClient.setControlEncoding(ftpProperties.getEncoding());
            ftpClient.setBufferSize(ftpProperties.getBufferSize());
            
            // 建立連線
            ftpClient.connect(ftpProperties.getHost(), ftpProperties.getPort());
            
            // 檢查連線回應
            int replyCode = ftpClient.getReplyCode();
            if (!FTPReply.isPositiveCompletion(replyCode)) {
                ftpClient.disconnect();
                throw new IOException("FTP 伺服器拒絕連線，回應碼：" + replyCode);
            }
            
            // 登入
            boolean loginSuccess = ftpClient.login(ftpProperties.getUsername(), ftpProperties.getPassword());
            if (!loginSuccess) {
                ftpClient.disconnect();
                throw new IOException("FTP 登入失敗，請檢查使用者名稱和密碼");
            }
            
            // 設定檔案傳輸模式
            ftpClient.setFileType(FTPClient.BINARY_FILE_TYPE);
            
            // 設定被動/主動模式
            if (ftpProperties.isPassiveMode()) {
                ftpClient.enterLocalPassiveMode();
            } else {
                ftpClient.enterLocalActiveMode();
            }
            
            logger.info("FTP 連線建立成功：{}:{}", ftpProperties.getHost(), ftpProperties.getPort());
            return ftpClient;
            
        } catch (IOException e) {
            logger.error("建立 FTP 連線失敗：{}", e.getMessage());
            if (ftpClient.isConnected()) {
                try {
                    ftpClient.disconnect();
                } catch (IOException ex) {
                    logger.warn("關閉失敗的 FTP 連線時發生錯誤：{}", ex.getMessage());
                }
            }
            throw e;
        }
    }
    
    /**
     * 歸還連線到連線池
     */
    public void returnConnection(FTPClient ftpClient) {
        if (ftpClient != null && ftpClient.isConnected()) {
            if (connectionPool.size() < ftpProperties.getMaxConnections()) {
                connectionPool.offer(ftpClient);
            } else {
                closeConnection(ftpClient);
            }
        }
    }
    
    /**
     * 從連線池獲取連線
     */
    public FTPClient getConnection() throws IOException {
        FTPClient ftpClient = connectionPool.poll();
        if (ftpClient == null || !ftpClient.isConnected()) {
            return createConnection();
        }
        return ftpClient;
    }
    
    /**
     * 關閉連線
     */
    public void closeConnection(FTPClient ftpClient) {
        if (ftpClient != null) {
            try {
                if (ftpClient.isConnected()) {
                    ftpClient.logout();
                    ftpClient.disconnect();
                }
            } catch (IOException e) {
                logger.warn("關閉 FTP 連線時發生錯誤：{}", e.getMessage());
            }
        }
    }
}
```

### 主要 FTP 工具類

```java
package com.example.util;

import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.example.config.FtpProperties;

import java.io.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class FtpUtil {
    
    private static final Logger logger = LoggerFactory.getLogger(FtpUtil.class);
    
    @Autowired
    private FtpConnectionFactory connectionFactory;
    
    @Autowired
    private FtpProperties ftpProperties;
    
    /**
     * 上傳檔案
     * 
     * @param localFile 本地檔案
     * @param remotePath 遠端路徑（相對於 basePath）
     * @return 上傳是否成功
     */
    public boolean uploadFile(File localFile, String remotePath) {
        if (!localFile.exists() || !localFile.isFile()) {
            logger.error("本地檔案不存在或不是檔案：{}", localFile.getAbsolutePath());
            return false;
        }
        
        try (FileInputStream fis = new FileInputStream(localFile)) {
            return uploadFile(fis, remotePath, localFile.getName());
        } catch (IOException e) {
            logger.error("讀取本地檔案失敗：{}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 上傳檔案流
     * 
     * @param inputStream 輸入流
     * @param remotePath 遠端路徑
     * @param fileName 檔案名稱
     * @return 上傳是否成功
     */
    public boolean uploadFile(InputStream inputStream, String remotePath, String fileName) {
        FTPClient ftpClient = null;
        
        try {
            ftpClient = connectionFactory.getConnection();
            
            // 確保遠端目錄存在
            String fullPath = buildFullPath(remotePath);
            createDirectoryIfNotExists(ftpClient, fullPath);
            
            // 切換到目標目錄
            if (!ftpClient.changeWorkingDirectory(fullPath)) {
                logger.error("無法切換到目錄：{}", fullPath);
                return false;
            }
            
            // 上傳檔案
            boolean result = ftpClient.storeFile(fileName, inputStream);
            
            if (result) {
                logger.info("檔案上傳成功：{}/{}", fullPath, fileName);
            } else {
                logger.error("檔案上傳失敗：{}/{}", fullPath, fileName);
            }
            
            return result;
            
        } catch (IOException e) {
            logger.error("上傳檔案時發生錯誤：{}", e.getMessage());
            return false;
        } finally {
            connectionFactory.returnConnection(ftpClient);
            closeQuietly(inputStream);
        }
    }
    
    /**
     * 下載檔案
     * 
     * @param remotePath 遠端路徑
     * @param fileName 檔案名稱
     * @param localFile 本地檔案
     * @return 下載是否成功
     */
    public boolean downloadFile(String remotePath, String fileName, File localFile) {
        FTPClient ftpClient = null;
        
        try {
            ftpClient = connectionFactory.getConnection();
            
            String fullPath = buildFullPath(remotePath);
            if (!ftpClient.changeWorkingDirectory(fullPath)) {
                logger.error("遠端目錄不存在：{}", fullPath);
                return false;
            }
            
            // 確保本地目錄存在
            File parentDir = localFile.getParentFile();
            if (!parentDir.exists()) {
                parentDir.mkdirs();
            }
            
            try (FileOutputStream fos = new FileOutputStream(localFile)) {
                boolean result = ftpClient.retrieveFile(fileName, fos);
                
                if (result) {
                    logger.info("檔案下載成功：{}/{} -> {}", fullPath, fileName, localFile.getAbsolutePath());
                } else {
                    logger.error("檔案下載失敗：{}/{}", fullPath, fileName);
                }
                
                return result;
            }
            
        } catch (IOException e) {
            logger.error("下載檔案時發生錯誤：{}", e.getMessage());
            return false;
        } finally {
            connectionFactory.returnConnection(ftpClient);
        }
    }
    
    /**
     * 刪除檔案
     * 
     * @param remotePath 遠端路徑
     * @param fileName 檔案名稱
     * @return 刪除是否成功
     */
    public boolean deleteFile(String remotePath, String fileName) {
        FTPClient ftpClient = null;
        
        try {
            ftpClient = connectionFactory.getConnection();
            
            String fullPath = buildFullPath(remotePath);
            if (!ftpClient.changeWorkingDirectory(fullPath)) {
                logger.error("遠端目錄不存在：{}", fullPath);
                return false;
            }
            
            boolean result = ftpClient.deleteFile(fileName);
            
            if (result) {
                logger.info("檔案刪除成功：{}/{}", fullPath, fileName);
            } else {
                logger.error("檔案刪除失敗：{}/{}", fullPath, fileName);
            }
            
            return result;
            
        } catch (IOException e) {
            logger.error("刪除檔案時發生錯誤：{}", e.getMessage());
            return false;
        } finally {
            connectionFactory.returnConnection(ftpClient);
        }
    }
    
    /**
     * 列出目錄中的檔案
     * 
     * @param remotePath 遠端路徑
     * @return 檔案列表
     */
    public List<FtpFileInfo> listFiles(String remotePath) {
        FTPClient ftpClient = null;
        List<FtpFileInfo> fileList = new ArrayList<>();
        
        try {
            ftpClient = connectionFactory.getConnection();
            
            String fullPath = buildFullPath(remotePath);
            if (!ftpClient.changeWorkingDirectory(fullPath)) {
                logger.error("遠端目錄不存在：{}", fullPath);
                return fileList;
            }
            
            FTPFile[] ftpFiles = ftpClient.listFiles();
            
            for (FTPFile ftpFile : ftpFiles) {
                FtpFileInfo fileInfo = new FtpFileInfo();
                fileInfo.setName(ftpFile.getName());
                fileInfo.setSize(ftpFile.getSize());
                fileInfo.setDirectory(ftpFile.isDirectory());
                fileInfo.setModifyTime(ftpFile.getTimestamp());
                fileList.add(fileInfo);
            }
            
            logger.info("成功列出目錄 {} 中的 {} 個檔案", fullPath, fileList.size());
            
        } catch (IOException e) {
            logger.error("列出檔案時發生錯誤：{}", e.getMessage());
        } finally {
            connectionFactory.returnConnection(ftpClient);
        }
        
        return fileList;
    }
    
    /**
     * 檢查檔案是否存在
     * 
     * @param remotePath 遠端路徑
     * @param fileName 檔案名稱
     * @return 檔案是否存在
     */
    public boolean fileExists(String remotePath, String fileName) {
        FTPClient ftpClient = null;
        
        try {
            ftpClient = connectionFactory.getConnection();
            
            String fullPath = buildFullPath(remotePath);
            if (!ftpClient.changeWorkingDirectory(fullPath)) {
                return false;
            }
            
            FTPFile[] files = ftpClient.listFiles(fileName);
            return files != null && files.length > 0;
            
        } catch (IOException e) {
            logger.error("檢查檔案存在性時發生錯誤：{}", e.getMessage());
            return false;
        } finally {
            connectionFactory.returnConnection(ftpClient);
        }
    }
    
    /**
     * 建立完整路徑
     */
    private String buildFullPath(String remotePath) {
        String basePath = ftpProperties.getBasePath();
        if (!StringUtils.hasText(remotePath)) {
            return basePath;
        }
        
        // 規範化路徑
        String normalizedBasePath = basePath.endsWith("/") ? basePath : basePath + "/";
        String normalizedRemotePath = remotePath.startsWith("/") ? remotePath.substring(1) : remotePath;
        
        return normalizedBasePath + normalizedRemotePath;
    }
    
    /**
     * 遞迴建立目錄
     */
    private void createDirectoryIfNotExists(FTPClient ftpClient, String path) throws IOException {
        String[] pathElements = path.split("/");
        StringBuilder currentPath = new StringBuilder();
        
        for (String element : pathElements) {
            if (StringUtils.hasText(element)) {
                currentPath.append("/").append(element);
                
                if (!ftpClient.changeWorkingDirectory(currentPath.toString())) {
                    if (ftpClient.makeDirectory(currentPath.toString())) {
                        logger.debug("建立目錄：{}", currentPath.toString());
                    } else {
                        throw new IOException("無法建立目錄：" + currentPath.toString());
                    }
                }
            }
        }
    }
    
    /**
     * 安靜地關閉資源
     */
    private void closeQuietly(Closeable closeable) {
        if (closeable != null) {
            try {
                closeable.close();
            } catch (IOException e) {
                // 忽略關閉時的錯誤
            }
        }
    }
}
```

### 檔案資訊實體類

```java
package com.example.util;

import java.util.Calendar;

public class FtpFileInfo {
    private String name;
    private long size;
    private boolean isDirectory;
    private Calendar modifyTime;
    
    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    
    public boolean isDirectory() { return isDirectory; }
    public void setDirectory(boolean directory) { isDirectory = directory; }
    
    public Calendar getModifyTime() { return modifyTime; }
    public void setModifyTime(Calendar modifyTime) { this.modifyTime = modifyTime; }
    
    @Override
    public String toString() {
        return String.format("FtpFileInfo{name='%s', size=%d, isDirectory=%s}", 
                           name, size, isDirectory);
    }
}
```

## 使用範例

### 基本使用

```java
@Service
public class FileService {
    
    @Autowired
    private FtpUtil ftpUtil;
    
    /**
     * 上傳使用者頭像
     */
    public boolean uploadAvatar(MultipartFile file, String userId) {
        try {
            String remotePath = "avatars/" + userId;
            String fileName = generateFileName(file.getOriginalFilename());
            
            return ftpUtil.uploadFile(file.getInputStream(), remotePath, fileName);
        } catch (IOException e) {
            logger.error("上傳頭像失敗：{}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 批量上傳檔案
     */
    public List<String> batchUpload(List<MultipartFile> files, String category) {
        List<String> successFiles = new ArrayList<>();
        String remotePath = "uploads/" + category + "/" + getCurrentDate();
        
        for (MultipartFile file : files) {
            try {
                String fileName = generateFileName(file.getOriginalFilename());
                if (ftpUtil.uploadFile(file.getInputStream(), remotePath, fileName)) {
                    successFiles.add(fileName);
                }
            } catch (IOException e) {
                logger.error("批量上傳檔案失敗：{}", file.getOriginalFilename());
            }
        }
        
        return successFiles;
    }
    
    private String generateFileName(String originalName) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String extension = originalName.substring(originalName.lastIndexOf("."));
        return timestamp + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
    }
    
    private String getCurrentDate() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
    }
}
```

### 進階功能：檔案同步

```java
@Component
public class FtpSyncService {
    
    @Autowired
    private FtpUtil ftpUtil;
    
    /**
     * 同步本地目錄到 FTP
     */
    public void syncDirectoryToFtp(String localDirPath, String remotePath) {
        File localDir = new File(localDirPath);
        if (!localDir.exists() || !localDir.isDirectory()) {
            logger.error("本地目錄不存在：{}", localDirPath);
            return;
        }
        
        syncDirectoryRecursive(localDir, remotePath);
    }
    
    private void syncDirectoryRecursive(File localDir, String remotePath) {
        File[] files = localDir.listFiles();
        if (files == null) return;
        
        for (File file : files) {
            if (file.isDirectory()) {
                // 遞迴處理子目錄
                String subRemotePath = remotePath + "/" + file.getName();
                syncDirectoryRecursive(file, subRemotePath);
            } else {
                // 上傳檔案
                if (!ftpUtil.fileExists(remotePath, file.getName())) {
                    ftpUtil.uploadFile(file, remotePath);
                    logger.info("同步檔案：{} -> {}/{}", file.getAbsolutePath(), remotePath, file.getName());
                }
            }
        }
    }
}
```

## 安全最佳實踐

### 1. 配置安全

```yaml
# 使用環境變數或加密配置
ftp:
  host: ${FTP_HOST}
  username: ${FTP_USERNAME}
  password: ${FTP_PASSWORD:#{null}}  # 可以為空，使用 SSH Key
```

### 2. 檔案驗證

```java
@Component
public class FileValidator {
    
    private static final List<String> ALLOWED_EXTENSIONS = 
        Arrays.asList(".jpg", ".png", ".pdf", ".doc", ".docx", ".xls", ".xlsx");
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    public boolean isValidFile(MultipartFile file) {
        // 檢查檔案大小
        if (file.getSize() > MAX_FILE_SIZE) {
            return false;
        }
        
        // 檢查檔案副檔名
        String fileName = file.getOriginalFilename();
        if (fileName == null) return false;
        
        String extension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
        return ALLOWED_EXTENSIONS.contains(extension);
    }
}
```

### 3. 存取控制

```java
@Component
public class FtpAccessControl {
    
    /**
     * 檢查使用者是否有權限存取指定路徑
     */
    public boolean hasAccess(String userId, String remotePath) {
        // 實作存取控制邏輯
        // 例如：使用者只能存取自己的目錄
        return remotePath.startsWith("users/" + userId + "/");
    }
}
```

## 監控與維護

### 健康檢查

```java
@Component
public class FtpHealthIndicator implements HealthIndicator {
    
    @Autowired
    private FtpConnectionFactory connectionFactory;
    
    @Override
    public Health health() {
        try {
            FTPClient ftpClient = connectionFactory.getConnection();
            boolean isConnected = ftpClient.isConnected();
            connectionFactory.returnConnection(ftpClient);
            
            return isConnected ? 
                Health.up().withDetail("status", "FTP connection available").build() :
                Health.down().withDetail("status", "FTP connection failed").build();
                
        } catch (Exception e) {
            return Health.down().withDetail("error", e.getMessage()).build();
        }
    }
}
```

### 效能監控

```java
@Aspect
@Component
public class FtpPerformanceAspect {
    
    private static final Logger logger = LoggerFactory.getLogger(FtpPerformanceAspect.class);
    
    @Around("execution(* com.example.util.FtpUtil.*(..))")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long endTime = System.currentTimeMillis();
            
            logger.info("FTP 操作 {} 執行時間：{}ms", 
                       joinPoint.getSignature().getName(), endTime - startTime);
            
            return result;
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            logger.error("FTP 操作 {} 失敗，執行時間：{}ms，錯誤：{}", 
                        joinPoint.getSignature().getName(), endTime - startTime, e.getMessage());
            throw e;
        }
    }
}
```

## 常見問題與解決方案

### 1. 連線逾時問題

```java
// 增加重試機制
@Retryable(value = {IOException.class}, maxAttempts = 3, backoff = @Backoff(delay = 1000))
public boolean uploadFileWithRetry(InputStream inputStream, String remotePath, String fileName) {
    return uploadFile(inputStream, remotePath, fileName);
}
```

### 2. 中文檔名問題

```java
// 在 FTP 配置中設定正確的編碼
ftpClient.setControlEncoding("UTF-8");

// 或者對檔名進行編碼處理
String encodedFileName = new String(fileName.getBytes("UTF-8"), "ISO-8859-1");
```

### 3. 防火牆問題

```yaml
# 使用被動模式避免防火牆問題
ftp:
  passive-mode: true
```

## 測試範例

```java
@SpringBootTest
class FtpUtilTest {
    
    @Autowired
    private FtpUtil ftpUtil;
    
    @Test
    void testUploadFile() {
        // 建立測試檔案
        File testFile = createTestFile();
        
        // 執行上傳
        boolean result = ftpUtil.uploadFile(testFile, "test", "test.txt");
        
        // 驗證結果
        assertTrue(result);
        assertTrue(ftpUtil.fileExists("test", "test.txt"));
        
        // 清理
        ftpUtil.deleteFile("test", "test.txt");
    }
    
    private File createTestFile() {
        try {
            File tempFile = File.createTempFile("test", ".txt");
            Files.write(tempFile.toPath(), "測試內容".getBytes());
            return tempFile;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

## 總結

本文提供的 FTP 工具類具備以下優勢：

1. **安全性**：配置外部化，避免硬編碼敏感資訊
2. **可靠性**：完整的錯誤處理和重試機制
3. **效能**：連線池管理，支援併發操作
4. **可維護性**：模組化設計，易於擴展和維護
5. **生產就緒**：包含監控、日誌和健康檢查

在實際使用時，請根據具體需求調整配置參數和安全設定，確保符合您的業務場景和安全要求。

## 參考資料

- [Apache Commons Net 官方文檔](https://commons.apache.org/proper/commons-net/)
- [Spring Boot Configuration Properties](https://docs.spring.io/spring-boot/docs/current/reference/html/configuration-metadata.html)
- [FTP RFC 959 協定規範](https://tools.ietf.org/html/rfc959)
- [Java FTP 最佳實踐](https://www.baeldung.com/java-ftp-client)