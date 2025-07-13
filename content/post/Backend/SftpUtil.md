---
title: "Spring Boot SFTP 工具類：安全文件傳輸協議實作與最佳實踐"
author: Bill.Lin
date: 2021-01-05T19:18:59+08:00
draft: false
tags: ["SFTP", "Spring Boot", "File Transfer", "JSch", "Security", "Java"]
Description: "深入介紹在 Spring Boot 中實作 SFTP 文件傳輸工具類，包含連線管理、檔案操作與安全性配置"
Categories: ["Backend"]
DisableComments: false
---

## SFTP 工具

### Dependency

```groovy

// https://mvnrepository.com/artifact/com.jcraft/jsch
implementation 'com.jcraft:jsch:{version}'

```

### 創建連線工廠

```java

import com.jcraft.jsch.Channel;
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.JSchException;
import com.jcraft.jsch.Session;
import java.util.Properties;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Log4j2
public class SFTPConnectionFactory {

  @Value("${sftp.domain}")
  private String domain;

  @Value("${sftp.port}")
  private int port;

  @Value("${sftp.username}")
  private String username;

  @Value("${sftp.password}")
  private String password;


  private ChannelSftp client;
  private Session session;

  public synchronized ChannelSftp getConnection() {
    if (client == null || session == null || !client.isConnected() || !session.isConnected()) {
      log.info("Connect to {}, port {}, username: {}", domain, port, username);
      try {
        JSch jsch = new JSch();

        session = jsch.getSession(username, domain, port);
        session.setPassword(password);

        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");

        session.setConfig(config);
        session.connect();
        Channel channel = session.openChannel("sftp");
        channel.connect();
        client = (ChannelSftp) channel;
        log.info("SFTP connect success !");

      } catch (JSchException e) {
        log.error(e, e);
      }
    }
    return client;
  }

  public synchronized void disconnect() {
    if (client != null) {
      if (client.isConnected()) {
        client.disconnect();
      }
    }
    if (session != null) {
      if (session.isConnected()) {
        session.disconnect();
      }
    }
  }
}

```

### 上傳 , 下載 (outputStream), 刪檔


```java

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

@Component
@Log4j2
public class SftpUtil {

  private static final int uploadRetry = 5;
  private static final int uploadSleep = 100;

  private final SFTPConnectionFactory sftpConnectionFactory;

  public SftpUtil(SFTPConnectionFactory sftpConnectionFactory) {
    this.sftpConnectionFactory = sftpConnectionFactory;
  }

  public boolean upload(String basePath, String directory, String filePath) {
    var isSuccess = false;
    var sftp = sftpConnectionFactory.getConnection();
    if (sftp == null) {
      throw new RuntimeException("get connection error");
    }
    try {
      sftp.cd(basePath);
      sftp.cd(directory);

      File file = new File(filePath);
      sftp.put(new FileInputStream(file), file.getName());
      isSuccess = true;
    } catch (Exception e) {
      log.error(e, e);
    } finally {
      sftpConnectionFactory.disconnect();
    }
    return isSuccess;
  }

  public void download(String basePath, String directory, String fileName) {
    var sftp = sftpConnectionFactory.getConnection();
    if (sftp == null) {
      throw new RuntimeException("get connection error");
    }
    BufferedReader bufferReader = null;
    try {
      sftp.cd(basePath);
      sftp.cd(directory);

      InputStream inputStream = sftp.get(fileName);
      // return byte[] a file
      //      ByteArrayOutputStream buffer = new ByteArrayOutputStream();
      //      byte[] bytes = new byte[1024];
      //      int n;
      //      while ((n = inputStream.read(bytes, 0, bytes.length)) != -1) {
      //        buffer.write(bytes, 0, n);
      //      }
      //      buffer.flush();
      //      return buffer.toByteArray();

      // return outputStream
      //      outputStream = new FileOutputStream(fileName);
      //      sftp.get(fileName, outputStream);

      bufferReader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
      var sb = new StringBuilder();
      String str;
      while ((str = bufferReader.readLine()) != null) {
        sb.append(str);
      }
      log.info(sb.toString());


    } catch (Exception e) {
      log.error(e, e);
    } finally {
      if (bufferReader != null) {
        try {
          bufferReader.close();
        } catch (Exception e) {
          log.error(e, e);
        }
      }
      sftpConnectionFactory.disconnect();
    }
  }

  public boolean deleteFile(String fileName) throws Exception {
    var isSuccess = false;
    var sftp = sftpConnectionFactory.getConnection();
    if (sftp == null) {
      throw new RuntimeException("get connection error");
    }
    try {
      sftp.rm(fileName);
      isSuccess = true;
    } catch (Exception e) {
      log.error(e, e);
    } finally {
      sftpConnectionFactory.disconnect();
    }

    return isSuccess;
  }

}

```