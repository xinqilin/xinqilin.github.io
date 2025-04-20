---
title: "FtpUtil"
author: Bill.Lin
date: 2023-01-05T23:45:46+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring", "FTP", "Ftp"]
DisableComments: false
---

### Dependency

```groovy

implementation 'commons-net:commons-net:{version}'


```

### Util

```java

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;

import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPReply;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class FtpUtils {

    private final Logger logger = LoggerFactory.getLogger(FtpUtils.class);

    private static final String FTP_IP = "";
    private static final int FTP_PORT = 66666;
    private static final String FTP_USERNAME = "";
    private static final String FTP_PASSWORD = "";


    private final String FTP_BASE_PATH = "/";

    private FTPClient ftpClient = null;

    public boolean uploadFile(String fileName, InputStream input, InvoiceType invoiceType) {
        boolean success = false;
        boolean isFolderExist = false;
        ftpClient = new FTPClient();
        ftpClient.setControlEncoding("UTF-8");
        try {
            initFtpClient();
            ftpClient.setFileType(FTPClient.BINARY_FILE_TYPE);
            isFolderExist = ftpClient.changeWorkingDirectory(FTP_BASE_PATH);
            if (!isFolderExist) {
                ftpClient.makeDirectory(FTP_BASE_PATH);
                ftpClient.changeWorkingDirectory(FTP_BASE_PATH);
            }
            ftpClient.storeFile(fileName, input);
            input.close();
            ftpClient.logout();
            success = true;
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (ftpClient.isConnected()) {
                try {
                    ftpClient.disconnect();
                } catch (IOException ioe) {
                }
            }
        }
        return success;
    }

    public void initFtpClient() {
        ftpClient = new FTPClient();
        ftpClient.setControlEncoding("UTF-8");
        try {
            ftpClient.connect(FTP_IP, FTP_PORT);
            ftpClient.login(FTP_USERNAME, FTP_PASSWORD);
            int replyCode = ftpClient.getReplyCode();
            logger.info("ftp reply code: " + String.valueOf(replyCode));
            if (!FTPReply.isPositiveCompletion(replyCode)) {
                logger.error("ftp connect failed: " + FTP_USERNAME + ":" + FTP_PORT);
            }
            logger.info("ftp connect successfu: " + FTP_USERNAME + ":" + FTP_PORT);
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

```