---
title: "openssl — 憑證、加密與 TLS 除錯命令列指南"
author: Bill.Lin
date: 2026-08-23
draft: false
description: "openssl 完整指令筆記：macOS LibreSSL 與 Homebrew OpenSSL 差異、憑證與金鑰操作、TLS 連線除錯、加密雜湊亂數與格式轉換實戰"
categories: ["CLI"]
tags: ["CLI", "OpenSSL", "TLS", "Security", "macOS"]
---

macOS 上有兩套 `openssl` 可能同時存在，指令語法看起來一樣，但底層實作不同、行為也會有差異，先搞清楚自己在用哪一套，後面踩坑機率會少很多。

## macOS LibreSSL vs Homebrew OpenSSL

macOS 內建的 `/usr/bin/openssl` 其實不是正牌 OpenSSL，而是 **LibreSSL**（OpenSSL 的 fork）：

```bash
/usr/bin/openssl version
# LibreSSL 3.3.6
```

透過 Homebrew 安裝的才是正牌 OpenSSL：

```bash
brew install openssl@3

/opt/homebrew/bin/openssl version
# OpenSSL 3.6.3 9 Jun 2026 (Library: OpenSSL 3.6.3 9 Jun 2026)
```

Homebrew 預設**不會** `link` `openssl@3`（避免覆蓋系統版本），所以裝完之後單純打 `openssl` 很可能還是吃到 `/usr/bin/openssl`（LibreSSL）。確認目前 PATH 解析到哪一個：

```bash
which -a openssl
# /opt/homebrew/bin/openssl   <- 如果 Homebrew bin 在 PATH 前面，這行會排第一個
# /usr/bin/openssl

openssl version   # 實際會執行到的那個
```

如果 `which openssl` 解析到的不是想要的版本，把 Homebrew 版加進 PATH（放前面）：

```bash
export PATH="$(brew --prefix openssl@3)/bin:$PATH"
```

**已驗證的實際差異**：LibreSSL 匯出的 PKCS12（`.p12`）預設用 `RC2-40-CBC` 加密，OpenSSL 3 的預設 provider 不支援這個過時演算法，直接讀會噴錯：

```bash
/opt/homebrew/bin/openssl pkcs12 -in cert-from-libressl.p12 -out cert.pem -nodes -passin pass:xxx
# error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:
# ...Algorithm (RC2-40-CBC : 0), Properties ()
```

加上 `-legacy` 載入相容 provider 即可：

```bash
/opt/homebrew/bin/openssl pkcs12 -in cert-from-libressl.p12 -out cert.pem -nodes -passin pass:xxx -legacy
```

（本文件其餘範例都是用 Homebrew 的 OpenSSL 3 實測過，LibreSSL 在憑證/CSR/加解密這些常見指令上語法相容，只有 PKCS12 這類走舊版預設加密演算法的地方要注意。）

---

## 憑證／金鑰操作

產生 RSA 私鑰（兩種等價寫法，`genpkey` 是新版建議用法）：

```bash
openssl genrsa -out key.pem 2048

# 或
openssl genpkey -algorithm RSA -out key.pem -pkeyopt rsa_keygen_bits:2048
```

用私鑰產生 CSR（Certificate Signing Request，送給 CA 簽發正式憑證用）：

```bash
openssl req -new -key key.pem -out req.csr \
  -subj "/C=TW/ST=Taipei/L=Taipei/O=Test/CN=example.com"
```

直接產生自簽憑證（測試/內部服務常用，不需要送 CA）：

```bash
openssl req -x509 -new -key key.pem -out cert.pem -days 365 \
  -subj "/C=TW/ST=Taipei/L=Taipei/O=Test/CN=example.com" \
  -addext "subjectAltName=DNS:example.com"
```

檢視憑證內容（完整明文）：

```bash
openssl x509 -in cert.pem -noout -text
```

只看常用的到期日與主體：

```bash
openssl x509 -in cert.pem -noout -dates -subject
# notBefore=Aug 23 15:01:05 2026 GMT
# notAfter=Aug 23 15:01:05 2027 GMT
# subject=C=TW, ST=Taipei, L=Taipei, O=Test, CN=example.com
```

---

## TLS 連線除錯

用 `s_client` 對遠端主機做一次真正的 TLS handshake，拿到伺服器憑證鏈（`-servername` 帶 SNI，HTTPS 現在幾乎都需要）：

```bash
echo | openssl s_client -connect github.com:443 -servername github.com 2>/dev/null \
  | openssl x509 -noout -subject -dates -issuer
# subject=CN=github.com
# notBefore=Jul  3 00:00:00 2026 GMT
# notAfter=Sep 30 23:59:59 2026 GMT
# issuer=C=GB, O=Sectigo Limited, CN=Sectigo Public Server Authentication CA DV E36
```

加上 `-verify_return_error`，讓憑證鏈驗證失敗時直接噴錯（而不是預設的「只警告、照樣連」），適合排查「憑證是不是真的被信任」：

```bash
openssl s_client -connect github.com:443 -servername github.com -verify_return_error < /dev/null
# ...
# Verification: OK
# Verify return code: 0 (ok)
```

常見排錯情境：
- `Verify return code: 10 (certificate has expired)` → 憑證過期，看上面 `x509 -dates` 的 `notAfter`
- 沒帶 `-servername` 導致連到錯的虛擬主機憑證（同 IP 多網域時常見）
- `s_client` 預設不會主動關閉連線，指令後面接 `< /dev/null` 或前面 `echo |`，避免卡住等 stdin

---

## 加密／雜湊／亂數

對稱加密（`-pbkdf2` 是必加的，舊版預設的 key derivation 不安全）：

```bash
openssl enc -aes-256-cbc -pbkdf2 -salt -in plain.txt -out cipher.bin -k "your-passphrase"

# 解密
openssl enc -d -aes-256-cbc -pbkdf2 -in cipher.bin -out plain.txt -k "your-passphrase"
```

雜湊：

```bash
openssl dgst -sha256 plain.txt
# SHA2-256(plain.txt)= a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447

openssl dgst -md5 plain.txt
# MD5(plain.txt)= 6f5902ac237024bdd0c176cb93063dc4
```

產生亂數，`-hex` / `-base64` 決定輸出編碼：

```bash
openssl rand -hex 16
# 9527417200cd343fb3c74abdbc272bf6

openssl rand -base64 16
# M0cSyXGL+nCsbXzq1Wz5bQ==
```

---

## 格式轉換

PEM ↔ DER（PEM 是 base64 文字格式，DER 是二進位，部分 Java/Windows 系統會要求 DER）：

```bash
openssl x509 -in cert.pem -outform der -out cert.der

openssl x509 -in cert.der -inform der -outform pem -out cert.pem
```

PEM(憑證+私鑰) → PKCS12（`.p12`/`.pfx`，Java keystore、瀏覽器匯入常用的打包格式）：

```bash
openssl pkcs12 -export -inkey key.pem -in cert.pem -out cert.p12 -passout pass:"your-passphrase"
```

PKCS12 → PEM（拆包，`-nodes` 表示私鑰不額外加密）：

```bash
openssl pkcs12 -in cert.p12 -out cert.pem -nodes -passin pass:"your-passphrase"
```

---

## `-base64` / `-hex` 編碼

`openssl base64` 是獨立的編解碼子命令，跟資料是不是憑證無關，單純文字/二進位互轉：

```bash
echo -n "hello" | openssl base64 -e
# aGVsbG8=

echo "aGVsbG8=" | openssl base64 -d
# hello
```

`-hex` 則常見於其他子命令的輸出選項（如上面 `rand -hex`），把結果印成十六進位字串而非 base64 或二進位，方便貼到文字檔或當作測試用的固定長度亂數字串。
