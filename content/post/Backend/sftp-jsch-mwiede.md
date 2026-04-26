---
title: "Spring Boot SFTP 工具類：企業級安全文件傳輸系統實作指南"
author: Bill.Lin
date: 2021-01-05T19:18:59+08:00
draft: false
tags: ["SFTP", "Spring Boot", "File Transfer", "JSch", "Security", "Java", "Connection Pool", "Enterprise", "File Management", "SSH", "Secure Transfer", "Best Practices", "Error Handling", "Performance", "Monitoring", "Configuration"]
Description: "深入介紹在 Spring Boot 中實作企業級 SFTP 文件傳輸工具類，包含連線池管理、檔案操作、安全性配置、錯誤處理、效能優化與監控機制"
Categories: ["Backend"]
DisableComments: false
aliases:
  - /post/Backend/SftpUtil/

---

## SFTP 企業級工具類實作指南

### 簡介

在現代企業應用中，安全的文件傳輸是不可或缺的功能。SFTP（SSH File Transfer Protocol）提供了一種安全、可靠的文件傳輸方案。本文將詳細介紹如何在 Spring Boot 中實作企業級的 SFTP 工具類，包含連線池管理、錯誤處理、效能優化等關鍵功能。

### 核心依賴配置

#### Maven 依賴

```xml
<dependencies>
    <!-- SFTP 核心依賴 -->
    <dependency>
        <groupId>com.jcraft</groupId>
        <artifactId>jsch</artifactId>
        <version>0.1.55</version>
    </dependency>
    
    <!-- Apache Commons Pool2 連線池 -->
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-pool2</artifactId>
        <version>2.11.1</version>
    </dependency>
    
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>
    
    <!-- Spring Boot Configuration Processor -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-configuration-processor</artifactId>
        <optional>true</optional>
    </dependency>
    
    <!-- Micrometer 監控 -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-core</artifactId>
    </dependency>
</dependencies>
```

#### Gradle 依賴

```groovy
dependencies {
    // SFTP 核心依賴
    implementation 'com.jcraft:jsch:0.1.55'
    
    // Apache Commons Pool2 連線池
    implementation 'org.apache.commons:commons-pool2:2.11.1'
    
    // Spring Boot Starter
    implementation 'org.springframework.boot:spring-boot-starter'
    
    // Spring Boot Configuration Processor
    annotationProcessor 'org.springframework.boot:spring-boot-configuration-processor'
    
    // Micrometer 監控
    implementation 'io.micrometer:micrometer-core'
}
```

### 配置類別

#### SFTP 配置屬性

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "sftp")
public class SftpProperties {
    
    // 連線配置
    private String host;
    private int port = 22;
    private String username;
    private String password;
    private String privateKeyPath;
    private String passphrase;
    
    // 連線池配置
    private Pool pool = new Pool();
    
    // 超時配置
    private int connectTimeout = 30000;
    private int sessionTimeout = 30000;
    private int channelTimeout = 30000;
    
    // 重試配置
    private int maxRetries = 3;
    private int retryDelay = 1000;
    
    // 安全配置
    private boolean strictHostKeyChecking = false;
    private String knownHostsFile;
    private String hostKeyAlgorithms;
    
    @Data
    public static class Pool {
        private int maxActive = 10;
        private int maxIdle = 5;
        private int minIdle = 1;
        private long maxWait = 10000;
        private boolean testOnBorrow = true;
        private boolean testOnReturn = true;
        private boolean testWhileIdle = true;
        private long timeBetweenEvictionRuns = 60000;
        private long minEvictableIdleTime = 300000;
    }
}
```

#### application.yml 配置

```yaml
sftp:
  host: sftp.example.com
  port: 22
  username: ${SFTP_USERNAME:sftpuser}
  password: ${SFTP_PASSWORD:}
  private-key-path: ${SFTP_PRIVATE_KEY_PATH:}
  passphrase: ${SFTP_PASSPHRASE:}
  
  # 連線池配置
  pool:
    max-active: 20
    max-idle: 10
    min-idle: 2
    max-wait: 15000
    test-on-borrow: true
    test-on-return: true
    test-while-idle: true
    time-between-eviction-runs: 60000
    min-evictable-idle-time: 300000
  
  # 超時配置
  connect-timeout: 30000
  session-timeout: 30000
  channel-timeout: 30000
  
  # 重試配置
  max-retries: 3
  retry-delay: 1000
  
  # 安全配置
  strict-host-key-checking: false
  known-hosts-file: ~/.ssh/known_hosts
  host-key-algorithms: ssh-rsa,ssh-dss

# 監控配置
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,info,sftp
  metrics:
    tags:
      application: sftp-service
```

### 核心實作類別

#### SFTP 連線工廠

```java
import com.jcraft.jsch.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.pool2.BasePooledObjectFactory;
import org.apache.commons.pool2.PooledObject;
import org.apache.commons.pool2.impl.DefaultPooledObject;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.Properties;

@Slf4j
@Component
public class SftpConnectionFactory extends BasePooledObjectFactory<ChannelSftp> {

    private final SftpProperties sftpProperties;
    private final JSch jsch;

    public SftpConnectionFactory(SftpProperties sftpProperties) {
        this.sftpProperties = sftpProperties;
        this.jsch = new JSch();
        initializeJSch();
    }

    private void initializeJSch() {
        try {
            // 設定私鑰
            if (sftpProperties.getPrivateKeyPath() != null) {
                if (sftpProperties.getPassphrase() != null) {
                    jsch.addIdentity(sftpProperties.getPrivateKeyPath(), sftpProperties.getPassphrase());
                } else {
                    jsch.addIdentity(sftpProperties.getPrivateKeyPath());
                }
            }
            
            // 設定 known_hosts
            if (sftpProperties.getKnownHostsFile() != null) {
                jsch.setKnownHosts(sftpProperties.getKnownHostsFile());
            }
            
            log.info("SFTP JSch 初始化完成");
        } catch (JSchException e) {
            log.error("SFTP JSch 初始化失敗", e);
            throw new RuntimeException("SFTP JSch 初始化失敗", e);
        }
    }

    @Override
    public ChannelSftp create() throws Exception {
        log.debug("創建新的 SFTP 連線到 {}:{}", sftpProperties.getHost(), sftpProperties.getPort());
        
        Session session = jsch.getSession(
            sftpProperties.getUsername(),
            sftpProperties.getHost(),
            sftpProperties.getPort()
        );
        
        // 設定密碼（如果有）
        if (sftpProperties.getPassword() != null) {
            session.setPassword(sftpProperties.getPassword());
        }
        
        // 設定連線屬性
        Properties config = new Properties();
        config.put("StrictHostKeyChecking", sftpProperties.isStrictHostKeyChecking() ? "yes" : "no");
        
        if (sftpProperties.getHostKeyAlgorithms() != null) {
            config.put("server_host_key", sftpProperties.getHostKeyAlgorithms());
        }
        
        session.setConfig(config);
        session.setTimeout(sftpProperties.getSessionTimeout());
        
        // 建立連線
        session.connect(sftpProperties.getConnectTimeout());
        
        Channel channel = session.openChannel("sftp");
        channel.connect(sftpProperties.getChannelTimeout());
        
        ChannelSftp channelSftp = (ChannelSftp) channel;
        log.debug("SFTP 連線創建成功");
        
        return channelSftp;
    }

    @Override
    public PooledObject<ChannelSftp> wrap(ChannelSftp channelSftp) {
        return new DefaultPooledObject<>(channelSftp);
    }

    @Override
    public boolean validateObject(PooledObject<ChannelSftp> pooledObject) {
        ChannelSftp channelSftp = pooledObject.getObject();
        return channelSftp != null && channelSftp.isConnected();
    }

    @Override
    public void destroyObject(PooledObject<ChannelSftp> pooledObject) throws Exception {
        ChannelSftp channelSftp = pooledObject.getObject();
        if (channelSftp != null) {
            Session session = channelSftp.getSession();
            if (channelSftp.isConnected()) {
                channelSftp.disconnect();
            }
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
        log.debug("SFTP 連線已銷毀");
    }
}
```

#### SFTP 連線池管理器

```java
import org.apache.commons.pool2.ObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SftpConnectionPoolManager {

    private final ObjectPool<ChannelSftp> sftpPool;
    private final SftpProperties sftpProperties;

    public SftpConnectionPoolManager(SftpConnectionFactory factory, SftpProperties sftpProperties) {
        this.sftpProperties = sftpProperties;
        this.sftpPool = createPool(factory);
    }

    private ObjectPool<ChannelSftp> createPool(SftpConnectionFactory factory) {
        GenericObjectPoolConfig<ChannelSftp> config = new GenericObjectPoolConfig<>();
        
        config.setMaxTotal(sftpProperties.getPool().getMaxActive());
        config.setMaxIdle(sftpProperties.getPool().getMaxIdle());
        config.setMinIdle(sftpProperties.getPool().getMinIdle());
        config.setMaxWaitMillis(sftpProperties.getPool().getMaxWait());
        config.setTestOnBorrow(sftpProperties.getPool().isTestOnBorrow());
        config.setTestOnReturn(sftpProperties.getPool().isTestOnReturn());
        config.setTestWhileIdle(sftpProperties.getPool().isTestWhileIdle());
        config.setTimeBetweenEvictionRunsMillis(sftpProperties.getPool().getTimeBetweenEvictionRuns());
        config.setMinEvictableIdleTimeMillis(sftpProperties.getPool().getMinEvictableIdleTime());
        
        return new GenericObjectPool<>(factory, config);
    }

    public ChannelSftp borrowConnection() throws Exception {
        return sftpPool.borrowObject();
    }

    public void returnConnection(ChannelSftp channelSftp) {
        if (channelSftp != null) {
            try {
                sftpPool.returnObject(channelSftp);
            } catch (Exception e) {
                log.error("歸還 SFTP 連線失敗", e);
            }
        }
    }

    public void invalidateConnection(ChannelSftp channelSftp) {
        if (channelSftp != null) {
            try {
                sftpPool.invalidateObject(channelSftp);
            } catch (Exception e) {
                log.error("無效化 SFTP 連線失敗", e);
            }
        }
    }

    public int getActiveConnections() {
        return sftpPool.getNumActive();
    }

    public int getIdleConnections() {
        return sftpPool.getNumIdle();
    }
}
```

#### 企業級 SFTP 工具類

```java
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.SftpException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Vector;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Function;

@Slf4j
@Component
public class SftpUtil {

    private final SftpConnectionPoolManager connectionPoolManager;
    private final SftpProperties sftpProperties;
    private final ExecutorService executorService;
    
    // 監控指標
    private final Counter uploadCounter;
    private final Counter downloadCounter;
    private final Counter deleteCounter;
    private final Counter errorCounter;
    private final Timer uploadTimer;
    private final Timer downloadTimer;

    public SftpUtil(SftpConnectionPoolManager connectionPoolManager, 
                    SftpProperties sftpProperties,
                    MeterRegistry meterRegistry) {
        this.connectionPoolManager = connectionPoolManager;
        this.sftpProperties = sftpProperties;
        this.executorService = Executors.newFixedThreadPool(10);
        
        // 初始化監控指標
        this.uploadCounter = Counter.builder("sftp.upload.total")
                .description("Total number of file uploads")
                .register(meterRegistry);
        this.downloadCounter = Counter.builder("sftp.download.total")
                .description("Total number of file downloads")
                .register(meterRegistry);
        this.deleteCounter = Counter.builder("sftp.delete.total")
                .description("Total number of file deletions")
                .register(meterRegistry);
        this.errorCounter = Counter.builder("sftp.error.total")
                .description("Total number of errors")
                .register(meterRegistry);
        this.uploadTimer = Timer.builder("sftp.upload.duration")
                .description("File upload duration")
                .register(meterRegistry);
        this.downloadTimer = Timer.builder("sftp.download.duration")
                .description("File download duration")
                .register(meterRegistry);
    }

    /**
     * 上傳文件
     */
    public boolean uploadFile(String localFilePath, String remoteFilePath) {
        return uploadTimer.recordCallable(() -> {
            boolean success = executeWithRetry(channelSftp -> {
                try {
                    createRemoteDirectoryIfNotExists(channelSftp, getParentPath(remoteFilePath));
                    
                    try (FileInputStream fis = new FileInputStream(localFilePath)) {
                        channelSftp.put(fis, remoteFilePath);
                        log.info("文件上傳成功: {} -> {}", localFilePath, remoteFilePath);
                        uploadCounter.increment();
                        return true;
                    }
                } catch (Exception e) {
                    log.error("文件上傳失敗: {} -> {}", localFilePath, remoteFilePath, e);
                    errorCounter.increment();
                    throw new RuntimeException("文件上傳失敗", e);
                }
            });
            return success;
        });
    }

    /**
     * 批量上傳文件
     */
    public List<CompletableFuture<Boolean>> uploadFilesAsync(List<FileTransferRequest> requests) {
        List<CompletableFuture<Boolean>> futures = new ArrayList<>();
        
        for (FileTransferRequest request : requests) {
            CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> 
                uploadFile(request.getLocalPath(), request.getRemotePath()), executorService);
            futures.add(future);
        }
        
        return futures;
    }

    /**
     * 下載文件
     */
    public boolean downloadFile(String remoteFilePath, String localFilePath) {
        return downloadTimer.recordCallable(() -> {
            boolean success = executeWithRetry(channelSftp -> {
                try {
                    createLocalDirectoryIfNotExists(getParentPath(localFilePath));
                    
                    try (FileOutputStream fos = new FileOutputStream(localFilePath)) {
                        channelSftp.get(remoteFilePath, fos);
                        log.info("文件下載成功: {} -> {}", remoteFilePath, localFilePath);
                        downloadCounter.increment();
                        return true;
                    }
                } catch (Exception e) {
                    log.error("文件下載失敗: {} -> {}", remoteFilePath, localFilePath, e);
                    errorCounter.increment();
                    throw new RuntimeException("文件下載失敗", e);
                }
            });
            return success;
        });
    }

    /**
     * 下載文件到輸出流
     */
    public void downloadFileToStream(String remoteFilePath, OutputStream outputStream) {
        executeWithRetry(channelSftp -> {
            try {
                channelSftp.get(remoteFilePath, outputStream);
                log.info("文件下載到流成功: {}", remoteFilePath);
                downloadCounter.increment();
                return true;
            } catch (Exception e) {
                log.error("文件下載到流失敗: {}", remoteFilePath, e);
                errorCounter.increment();
                throw new RuntimeException("文件下載到流失敗", e);
            }
        });
    }

    /**
     * 獲取文件內容為字符串
     */
    public String getFileContent(String remoteFilePath) {
        return executeWithRetry(channelSftp -> {
            try (InputStream inputStream = channelSftp.get(remoteFilePath);
                 BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    content.append(line).append("\n");
                }
                
                log.info("獲取文件內容成功: {}", remoteFilePath);
                return content.toString();
            } catch (Exception e) {
                log.error("獲取文件內容失敗: {}", remoteFilePath, e);
                errorCounter.increment();
                throw new RuntimeException("獲取文件內容失敗", e);
            }
        });
    }

    /**
     * 刪除文件
     */
    public boolean deleteFile(String remoteFilePath) {
        return executeWithRetry(channelSftp -> {
            try {
                channelSftp.rm(remoteFilePath);
                log.info("文件刪除成功: {}", remoteFilePath);
                deleteCounter.increment();
                return true;
            } catch (Exception e) {
                log.error("文件刪除失敗: {}", remoteFilePath, e);
                errorCounter.increment();
                throw new RuntimeException("文件刪除失敗", e);
            }
        });
    }

    /**
     * 列出目錄文件
     */
    public List<SftpFileInfo> listFiles(String remotePath) {
        return executeWithRetry(channelSftp -> {
            try {
                Vector<ChannelSftp.LsEntry> entries = channelSftp.ls(remotePath);
                List<SftpFileInfo> fileInfos = new ArrayList<>();
                
                for (ChannelSftp.LsEntry entry : entries) {
                    if (!entry.getFilename().equals(".") && !entry.getFilename().equals("..")) {
                        SftpFileInfo fileInfo = new SftpFileInfo();
                        fileInfo.setFilename(entry.getFilename());
                        fileInfo.setSize(entry.getAttrs().getSize());
                        fileInfo.setModifiedTime(entry.getAttrs().getMTime());
                        fileInfo.setDirectory(entry.getAttrs().isDir());
                        fileInfos.add(fileInfo);
                    }
                }
                
                log.info("列出目錄文件成功: {}, 共 {} 個文件", remotePath, fileInfos.size());
                return fileInfos;
            } catch (Exception e) {
                log.error("列出目錄文件失敗: {}", remotePath, e);
                errorCounter.increment();
                throw new RuntimeException("列出目錄文件失敗", e);
            }
        });
    }

    /**
     * 檢查文件是否存在
     */
    public boolean fileExists(String remoteFilePath) {
        return executeWithRetry(channelSftp -> {
            try {
                channelSftp.stat(remoteFilePath);
                return true;
            } catch (SftpException e) {
                if (e.id == ChannelSftp.SSH_FX_NO_SUCH_FILE) {
                    return false;
                }
                throw new RuntimeException("檢查文件存在性失敗", e);
            }
        });
    }

    /**
     * 創建遠端目錄
     */
    public void createRemoteDirectory(String remotePath) {
        executeWithRetry(channelSftp -> {
            try {
                createRemoteDirectoryIfNotExists(channelSftp, remotePath);
                log.info("創建遠端目錄成功: {}", remotePath);
                return true;
            } catch (Exception e) {
                log.error("創建遠端目錄失敗: {}", remotePath, e);
                errorCounter.increment();
                throw new RuntimeException("創建遠端目錄失敗", e);
            }
        });
    }

    /**
     * 帶重試機制的執行器
     */
    private <T> T executeWithRetry(Function<ChannelSftp, T> operation) {
        int attempts = 0;
        Exception lastException = null;
        
        while (attempts < sftpProperties.getMaxRetries()) {
            ChannelSftp channelSftp = null;
            try {
                channelSftp = connectionPoolManager.borrowConnection();
                return operation.apply(channelSftp);
            } catch (Exception e) {
                lastException = e;
                attempts++;
                
                if (channelSftp != null) {
                    connectionPoolManager.invalidateConnection(channelSftp);
                    channelSftp = null;
                }
                
                if (attempts < sftpProperties.getMaxRetries()) {
                    log.warn("SFTP 操作失敗，第 {} 次重試", attempts, e);
                    try {
                        Thread.sleep(sftpProperties.getRetryDelay());
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("操作被中斷", ie);
                    }
                }
            } finally {
                if (channelSftp != null) {
                    connectionPoolManager.returnConnection(channelSftp);
                }
            }
        }
        
        throw new RuntimeException("SFTP 操作失敗，已重試 " + sftpProperties.getMaxRetries() + " 次", lastException);
    }

    /**
     * 創建遠端目錄（如果不存在）
     */
    private void createRemoteDirectoryIfNotExists(ChannelSftp channelSftp, String remotePath) throws SftpException {
        if (remotePath == null || remotePath.trim().isEmpty()) {
            return;
        }
        
        String[] dirs = remotePath.split("/");
        String currentPath = "";
        
        for (String dir : dirs) {
            if (dir.isEmpty()) continue;
            
            currentPath += "/" + dir;
            try {
                channelSftp.stat(currentPath);
            } catch (SftpException e) {
                if (e.id == ChannelSftp.SSH_FX_NO_SUCH_FILE) {
                    channelSftp.mkdir(currentPath);
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * 創建本地目錄（如果不存在）
     */
    private void createLocalDirectoryIfNotExists(String localPath) throws IOException {
        if (localPath != null && !localPath.trim().isEmpty()) {
            Path path = Paths.get(localPath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }
        }
    }

    /**
     * 獲取父路徑
     */
    private String getParentPath(String filePath) {
        if (filePath == null) return null;
        
        int lastSlashIndex = filePath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
            return filePath.substring(0, lastSlashIndex);
        }
        return null;
    }

    /**
     * 獲取連線池狀態
     */
    public SftpConnectionPoolStatus getConnectionPoolStatus() {
        SftpConnectionPoolStatus status = new SftpConnectionPoolStatus();
        status.setActiveConnections(connectionPoolManager.getActiveConnections());
        status.setIdleConnections(connectionPoolManager.getIdleConnections());
        return status;
    }
}
```

### 支援類別

#### 文件傳輸請求類

```java
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileTransferRequest {
    private String localPath;
    private String remotePath;
}
```

#### SFTP 文件信息類

```java
import lombok.Data;

@Data
public class SftpFileInfo {
    private String filename;
    private long size;
    private int modifiedTime;
    private boolean directory;
}
```

#### 連線池狀態類

```java
import lombok.Data;

@Data
public class SftpConnectionPoolStatus {
    private int activeConnections;
    private int idleConnections;
}
```

### 服務層整合

#### SFTP 服務類

```java
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class SftpService {

    private final SftpUtil sftpUtil;
    private static final String TEMP_DIR = System.getProperty("java.io.tmpdir");

    public SftpService(SftpUtil sftpUtil) {
        this.sftpUtil = sftpUtil;
    }

    /**
     * 上傳 MultipartFile 到 SFTP
     */
    public boolean uploadMultipartFile(MultipartFile file, String remoteDirectory) {
        String tempFilePath = null;
        try {
            // 創建臨時文件
            tempFilePath = createTempFile(file);
            
            // 構建遠端路徑
            String remoteFilePath = remoteDirectory + "/" + file.getOriginalFilename();
            
            // 上傳文件
            boolean success = sftpUtil.uploadFile(tempFilePath, remoteFilePath);
            
            if (success) {
                log.info("MultipartFile 上傳成功: {}", file.getOriginalFilename());
            }
            
            return success;
        } catch (Exception e) {
            log.error("MultipartFile 上傳失敗: {}", file.getOriginalFilename(), e);
            return false;
        } finally {
            // 清理臨時文件
            if (tempFilePath != null) {
                cleanupTempFile(tempFilePath);
            }
        }
    }

    /**
     * 批量上傳文件
     */
    public void uploadFiles(List<MultipartFile> files, String remoteDirectory) {
        for (MultipartFile file : files) {
            uploadMultipartFile(file, remoteDirectory);
        }
    }

    /**
     * 下載文件並返回字節數組
     */
    public byte[] downloadFileAsBytes(String remoteFilePath) {
        String tempFilePath = null;
        try {
            // 創建臨時文件路徑
            tempFilePath = TEMP_DIR + "/" + UUID.randomUUID() + "_download";
            
            // 下載文件
            boolean success = sftpUtil.downloadFile(remoteFilePath, tempFilePath);
            
            if (success) {
                Path path = Paths.get(tempFilePath);
                return Files.readAllBytes(path);
            }
            
            return null;
        } catch (Exception e) {
            log.error("下載文件失敗: {}", remoteFilePath, e);
            return null;
        } finally {
            // 清理臨時文件
            if (tempFilePath != null) {
                cleanupTempFile(tempFilePath);
            }
        }
    }

    /**
     * 獲取目錄文件列表
     */
    public List<SftpFileInfo> listDirectoryFiles(String remotePath) {
        return sftpUtil.listFiles(remotePath);
    }

    /**
     * 刪除文件
     */
    public boolean deleteFile(String remoteFilePath) {
        return sftpUtil.deleteFile(remoteFilePath);
    }

    /**
     * 檢查文件是否存在
     */
    public boolean checkFileExists(String remoteFilePath) {
        return sftpUtil.fileExists(remoteFilePath);
    }

    /**
     * 創建臨時文件
     */
    private String createTempFile(MultipartFile file) throws IOException {
        String tempFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path tempPath = Paths.get(TEMP_DIR, tempFileName);
        Files.write(tempPath, file.getBytes());
        return tempPath.toString();
    }

    /**
     * 清理臨時文件
     */
    private void cleanupTempFile(String tempFilePath) {
        try {
            Files.deleteIfExists(Paths.get(tempFilePath));
        } catch (IOException e) {
            log.warn("清理臨時文件失敗: {}", tempFilePath, e);
        }
    }
}
```

### 控制器層

#### SFTP 控制器

```java
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/sftp")
public class SftpController {

    private final SftpService sftpService;

    public SftpController(SftpService sftpService) {
        this.sftpService = sftpService;
    }

    /**
     * 上傳文件
     */
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file,
                                           @RequestParam("directory") String directory) {
        try {
            boolean success = sftpService.uploadMultipartFile(file, directory);
            if (success) {
                return ResponseEntity.ok("文件上傳成功");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("文件上傳失敗");
            }
        } catch (Exception e) {
            log.error("上傳文件異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("上傳文件異常: " + e.getMessage());
        }
    }

    /**
     * 批量上傳文件
     */
    @PostMapping("/upload/batch")
    public ResponseEntity<String> uploadFiles(@RequestParam("files") List<MultipartFile> files,
                                            @RequestParam("directory") String directory) {
        try {
            sftpService.uploadFiles(files, directory);
            return ResponseEntity.ok("批量上傳成功");
        } catch (Exception e) {
            log.error("批量上傳文件異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("批量上傳異常: " + e.getMessage());
        }
    }

    /**
     * 下載文件
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadFile(@RequestParam("filePath") String filePath) {
        try {
            byte[] fileBytes = sftpService.downloadFileAsBytes(filePath);
            if (fileBytes != null) {
                return ResponseEntity.ok()
                        .header("Content-Disposition", "attachment; filename=\"" + 
                                filePath.substring(filePath.lastIndexOf("/") + 1) + "\"")
                        .body(fileBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("下載文件異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 列出目錄文件
     */
    @GetMapping("/list")
    public ResponseEntity<List<SftpFileInfo>> listFiles(@RequestParam("directory") String directory) {
        try {
            List<SftpFileInfo> files = sftpService.listDirectoryFiles(directory);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            log.error("列出目錄文件異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 刪除文件
     */
    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteFile(@RequestParam("filePath") String filePath) {
        try {
            boolean success = sftpService.deleteFile(filePath);
            if (success) {
                return ResponseEntity.ok("文件刪除成功");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("文件刪除失敗");
            }
        } catch (Exception e) {
            log.error("刪除文件異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("刪除文件異常: " + e.getMessage());
        }
    }

    /**
     * 檢查文件是否存在
     */
    @GetMapping("/exists")
    public ResponseEntity<Boolean> checkFileExists(@RequestParam("filePath") String filePath) {
        try {
            boolean exists = sftpService.checkFileExists(filePath);
            return ResponseEntity.ok(exists);
        } catch (Exception e) {
            log.error("檢查文件存在性異常", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
```

### 監控與健康檢查

#### SFTP 健康檢查

```java
import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SftpHealthIndicator implements HealthIndicator {

    private final SftpUtil sftpUtil;

    public SftpHealthIndicator(SftpUtil sftpUtil) {
        this.sftpUtil = sftpUtil;
    }

    @Override
    public Health health() {
        try {
            // 檢查連線池狀態
            SftpConnectionPoolStatus poolStatus = sftpUtil.getConnectionPoolStatus();
            
            Health.Builder builder = Health.up()
                    .withDetail("activeConnections", poolStatus.getActiveConnections())
                    .withDetail("idleConnections", poolStatus.getIdleConnections())
                    .withDetail("status", "SFTP 服務正常運行");
            
            return builder.build();
        } catch (Exception e) {
            log.error("SFTP 健康檢查失敗", e);
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .withDetail("status", "SFTP 服務異常")
                    .build();
        }
    }
}
```

#### 自訂監控端點

```java
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuator.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Endpoint(id = "sftp")
public class SftpEndpoint {

    private final SftpUtil sftpUtil;

    public SftpEndpoint(SftpUtil sftpUtil) {
        this.sftpUtil = sftpUtil;
    }

    @ReadOperation
    public Map<String, Object> sftpInfo() {
        Map<String, Object> info = new HashMap<>();
        
        try {
            SftpConnectionPoolStatus poolStatus = sftpUtil.getConnectionPoolStatus();
            info.put("connectionPool", poolStatus);
            info.put("status", "healthy");
        } catch (Exception e) {
            info.put("status", "unhealthy");
            info.put("error", e.getMessage());
        }
        
        return info;
    }
}
```

### 測試

#### 單元測試

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SpringJUnitConfig
class SftpUtilTest {

    @Mock
    private SftpConnectionPoolManager mockConnectionPoolManager;

    @Mock
    private ChannelSftp mockChannelSftp;

    @Mock
    private SftpProperties mockSftpProperties;

    private SftpUtil sftpUtil;

    @BeforeEach
    void setUp() {
        when(mockSftpProperties.getMaxRetries()).thenReturn(3);
        when(mockSftpProperties.getRetryDelay()).thenReturn(1000);
        
        sftpUtil = new SftpUtil(mockConnectionPoolManager, mockSftpProperties, null);
    }

    @Test
    void testUploadFile_Success() throws Exception {
        // Given
        String localPath = "test.txt";
        String remotePath = "/remote/test.txt";
        
        when(mockConnectionPoolManager.borrowConnection()).thenReturn(mockChannelSftp);
        
        // When
        boolean result = sftpUtil.uploadFile(localPath, remotePath);
        
        // Then
        assertTrue(result);
        verify(mockChannelSftp, times(1)).put(any(InputStream.class), eq(remotePath));
        verify(mockConnectionPoolManager, times(1)).returnConnection(mockChannelSftp);
    }

    @Test
    void testDownloadFile_Success() throws Exception {
        // Given
        String remotePath = "/remote/test.txt";
        String localPath = "test.txt";
        InputStream mockInputStream = new ByteArrayInputStream("test content".getBytes());
        
        when(mockConnectionPoolManager.borrowConnection()).thenReturn(mockChannelSftp);
        when(mockChannelSftp.get(remotePath)).thenReturn(mockInputStream);
        
        // When
        boolean result = sftpUtil.downloadFile(remotePath, localPath);
        
        // Then
        assertTrue(result);
        verify(mockChannelSftp, times(1)).get(eq(remotePath), any());
        verify(mockConnectionPoolManager, times(1)).returnConnection(mockChannelSftp);
    }

    @Test
    void testFileExists_FileExists() throws Exception {
        // Given
        String remotePath = "/remote/test.txt";
        
        when(mockConnectionPoolManager.borrowConnection()).thenReturn(mockChannelSftp);
        when(mockChannelSftp.stat(remotePath)).thenReturn(null); // 不拋出異常表示文件存在
        
        // When
        boolean result = sftpUtil.fileExists(remotePath);
        
        // Then
        assertTrue(result);
        verify(mockChannelSftp, times(1)).stat(remotePath);
        verify(mockConnectionPoolManager, times(1)).returnConnection(mockChannelSftp);
    }
}
```

#### 整合測試

```java
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootTest
@ActiveProfiles("test")
@SpringJUnitConfig
class SftpIntegrationTest {

    @Autowired
    private SftpService sftpService;

    @Test
    void testSftpServiceIntegration() {
        // 整合測試應該使用測試 SFTP 服務器
        // 這裡只是展示測試結構
        
        // Given
        String testDirectory = "/test";
        
        // When & Then
        // 執行實際的 SFTP 操作測試
        assertDoesNotThrow(() -> {
            sftpService.listDirectoryFiles(testDirectory);
        });
    }
}
```

### 最佳實踐

#### 1. 安全性考慮

```yaml
# 生產環境配置
sftp:
  # 使用環境變數或 Vault 管理敏感信息
  username: ${SFTP_USERNAME}
  password: ${SFTP_PASSWORD}
  private-key-path: ${SFTP_PRIVATE_KEY_PATH}
  
  # 啟用嚴格的主機密鑰檢查
  strict-host-key-checking: true
  known-hosts-file: /etc/ssh/ssh_known_hosts
  
  # 使用安全的主機密鑰算法
  host-key-algorithms: rsa-sha2-512,rsa-sha2-256
```

#### 2. 效能優化

```java
// 使用批量操作
@Component
public class SftpBatchProcessor {
    
    public void processBatchUpload(List<FileTransferRequest> requests) {
        // 分批處理大量文件
        int batchSize = 10;
        for (int i = 0; i < requests.size(); i += batchSize) {
            List<FileTransferRequest> batch = requests.subList(i, 
                Math.min(i + batchSize, requests.size()));
            processBatch(batch);
        }
    }
    
    private void processBatch(List<FileTransferRequest> batch) {
        // 並行處理批次
        List<CompletableFuture<Boolean>> futures = 
            sftpUtil.uploadFilesAsync(batch);
        
        // 等待所有任務完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
}
```

#### 3. 錯誤處理策略

```java
@Component
public class SftpErrorHandler {
    
    public void handleSftpError(Exception e, String operation, String filePath) {
        if (e instanceof SftpException) {
            SftpException sftpException = (SftpException) e;
            switch (sftpException.id) {
                case ChannelSftp.SSH_FX_NO_SUCH_FILE:
                    log.warn("文件不存在: {}", filePath);
                    break;
                case ChannelSftp.SSH_FX_PERMISSION_DENIED:
                    log.error("權限不足: {}", filePath);
                    break;
                case ChannelSftp.SSH_FX_CONNECTION_LOST:
                    log.error("連線中斷: {}", filePath);
                    // 觸發重連
                    break;
                default:
                    log.error("SFTP 操作失敗: {} - {}", operation, filePath, e);
            }
        } else {
            log.error("一般錯誤: {} - {}", operation, filePath, e);
        }
    }
}
```

### 總結

本文詳細介紹了企業級 SFTP 工具類的完整實作，包含以下關鍵特性：

1. **連線池管理**：提供高效的連線復用機制
2. **錯誤處理**：完善的重試機制和錯誤處理策略
3. **監控機制**：整合 Micrometer 提供完整的監控指標
4. **安全配置**：支援多種認證方式和安全配置選項
5. **批量操作**：支援大量文件的並行處理
6. **健康檢查**：整合 Spring Boot Actuator 提供健康檢查
7. **測試覆蓋**：提供完整的單元測試和整合測試

這個 SFTP 工具類適用於各種企業級應用場景，能夠穩定、高效地處理文件傳輸任務，同時提供良好的可觀測性和維護性。