---
title: "JWT、JWS、JWK 一次看懂：JOSE 家族、claim 驗證與金鑰輪替"
date: 2026-11-26
draft: false
author: Bill.Lin
description: "拆解 JOSE 家族中 JWS、JWE、JWK 與 JWT 的分工，說明 header 與 iss、aud、jti 等 claim 怎麼驗證，整理 RFC 8725 的攻擊、kid 金鑰輪替，並比較 JWT 與 opaque token"
categories: ["Security"]
tags: ["JWT", "JWK", "JOSE", "OAuth 2.0", "Spring Security", "Security"]
---

## 情境與問題

講座平台的訂單 API 收到的每個請求都帶著一個 JWT。最早的程式碼是這樣處理的：把 token 用 `.` 切開，Base64 解出中間那段，讀出 `sub` 當作使用者 ID。上線一年沒出過事，直到資安檢測問了幾個問題：

- 這個 token 是誰簽的？任何人自己做一個 payload，你們也會照單全收嗎？
- 授權伺服器（IdP）同時發 token 給訂單 API、付款 API 和後台。給付款 API 的 token，拿來打訂單 API 會過嗎？
- 驗簽用的公鑰從哪裡來？IdP 下個月換金鑰，API 要停機改設定嗎？
- 使用者登入後拿到的 ID token，被前端誤當成 access token 送過來，會發生什麼事？

```diagram
title: 一個 JWT 到了 API，要過哪幾關
row: C 用戶端 | API 訂單 API
row: IDP 授權伺服器 | ATK 攻擊者
step: 簽發
  授權伺服器用自己的私鑰簽出 JWT，header 的 kid 標明用的是哪一把金鑰。
IDP -> C: 簽好的 JWT
note IDP: 私鑰簽章，kid = k-2026-11
step: 帶著 token 呼叫
  用戶端把 JWT 放在 Authorization 標頭送給訂單 API。API 不用查資料庫，只要簽章驗得過，就能相信裡面的內容。
C -> API: Bearer JWT
step: 依 kid 找公鑰
  API 從 IdP 公開的 JWKS 端點取得公鑰清單，用 kid 找出對應的那一把。清單會快取，不會每個請求都去抓。
API -> IDP: 抓 JWKS
note API: 快取公鑰清單
step: 逐項檢查
  驗簽之前，先確認 alg 在自己允許的清單裡；簽章通過後，再檢查 iss 是不是信任的簽發者、aud 有沒有包含自己、exp 是否已過期、typ 是不是 access token。任何一項不符就拒絕。
note API: alg、簽章、iss、aud、exp、typ [ok]
step: 金鑰輪替
  新公鑰早就發布在 JWKS 裡，等所有驗證方的快取都更新後，IdP 才改用它簽，新 token 帶著新的 kid。快取裡若還沒有這個 kid，API 會重抓一次 JWKS，但這只是備援，不能取代「先發布、再切換」的順序。
IDP -> C: 改用新金鑰
API -> IDP: 重抓 JWKS
step: 攻擊者的 token
  有人把 alg 改成 none、拿給付款 API 的 token 來打訂單 API，或把 ID token 當成 access token 送來。這些都要在上一步的檢查裡被擋下。
ATK -> API: 竄改 alg、換 aud [danger]
note ATK: 自己簽的、給別人的 [danger]
```

這些問題的答案都不在 JWT 的「內容」裡，而在「驗證方怎麼驗」。這篇從 JOSE 整個家族講起，說明每個 header 與 claim 該由誰、用什麼規則檢查，公鑰怎麼發布與輪替，最後評估什麼時候該用 JWT、什麼時候該用 opaque token。

七個 registered claims 的定義、NumericDate 是秒數而不是毫秒這些基礎，在 [JWT 認證機制完整實作](/post/security/jwt-spring-security/) 已經整理過，這篇不重複，重點放在驗證。

## JOSE 家族：五份規格各管一件事

JWT 常被當成一個單一的東西，其實它是 IETF JOSE（JSON Object Signing and Encryption）一系列規格的組合：

| 規格 | RFC | 負責的事 |
|---|---|---|
| JWS（JSON Web Signature） | 7515 | 怎麼替一段內容簽章，以及簽章後的格式 |
| JWE（JSON Web Encryption） | 7516 | 怎麼加密一段內容，以及加密後的格式 |
| JWK（JSON Web Key） | 7517 | 怎麼用 JSON 表示一把金鑰；多把金鑰組成 JWK Set |
| JWA（JSON Web Algorithms） | 7518 | `RS256`、`ES256`、`A256GCM` 這些名稱各代表哪個演算法與參數 |
| JWT（JSON Web Token） | 7519 | 一組 claim 的格式，以及怎麼放進 JWS 或 JWE |

一句話分工：**JWT 是內容，JWS 與 JWE 是外殼，JWK 是鑰匙，JWA 是鑰匙與鎖的型號表**。

平常說的「JWT」，幾乎都是「放在 JWS 裡、用 Compact Serialization 表示的 JWT」：

```
base64url(header) . base64url(payload) . base64url(signature)
```

簽章的輸入是前兩段（含中間的點）的 ASCII 字串，所以 header 也受簽章保護，改動 header 的任何一個字元，簽章就對不上。payload 只是 Base64URL 編碼，**任何人都讀得到**。要讓內容保密得用 JWE，它的 compact 格式有五段：header、加密過的內容金鑰、IV、密文、驗證標籤。實務上 access token 很少用 JWE，因為更簡單的做法是：不該公開的資料不要放進 token。

還有一點常被忽略：**JWT 不等於 access token**。同一種格式被用在很多地方：

| 用途 | 誰簽 | 誰驗 |
|---|---|---|
| Access token（RFC 9068） | 授權伺服器 | Resource server（API） |
| ID token（OpenID Connect） | 授權伺服器 | 用戶端，用來確認使用者是誰 |
| Client assertion（`private_key_jwt`） | 用戶端 | 授權伺服器，代替 client secret |
| DPoP proof（RFC 9449） | 用戶端 | 授權伺服器與 API |

格式一樣、結構相似，驗證方如果不分辨「這是哪一種 JWT」，就可能把一種當成另一種接受。後面的 `typ` 與「互斥的驗證規則」就是在處理這件事。

## Header：決定怎麼驗，也是攻擊入口

Header 告訴驗證方「用什麼演算法、哪一把金鑰」驗這個 token。問題在於 header 是 token 的一部分，**內容由送 token 的人決定**。驗證方要先決定自己接受什麼，再拿 header 來比對，而不是照著 header 的指示做。

| 參數 | 意思 | 驗證方該怎麼對待 |
|---|---|---|
| `alg` | 簽章演算法，必填 | 和自己設定的白名單比對，不在名單上就拒絕；絕不接受 `none` |
| `typ` | 整個 JWT 的媒體類型 | 用來分辨 token 種類：access token 是 `at+jwt`，DPoP proof 是 `dpop+jwt` |
| `kid` | 金鑰識別碼，格式沒有規定 | 只當作查表的鍵，不要拿去組 SQL 或檔案路徑 |
| `cty` | payload 的媒體類型 | 巢狀 JWT（先簽章再加密）時才會用到 |
| `crit` | 收件方必須理解的擴充參數 | 有任何一項不認得，就必須拒絕整個 token |
| `jku`、`x5u` | 一個 URL，說公鑰或憑證在那裡 | 不要照著去抓；公鑰來源應該是自己設定的 issuer 與 `jwks_uri` |
| `jwk`、`x5c` | 直接把公鑰或憑證鏈放進 header | 一般 access token 不該信任；DPoP proof 是例外，見下文 |

最後兩列值得多想一下。如果驗證方「header 給什麼公鑰就用什麼公鑰驗」，攻擊者只要自己產生一對金鑰，用私鑰簽一份 payload，再把公鑰塞進 header，簽章當然驗得過。簽章只證明「這個 token 是某一把私鑰簽的」，**信任來自那把金鑰屬於誰**，而這個資訊必須來自 token 以外的地方：事先設定好的 issuer 和它公開的 JWKS。

DPoP proof 剛好是反例：它的 header 本來就帶著 `jwk`，驗證方也確實用這把公鑰驗簽。它之所以安全，是因為 DPoP 不靠這把公鑰建立身分，而是檢查它的 thumbprint 和 access token 裡綁定的值是否一致。這部分在 [DPoP 那篇](/post/security/dpop-proof-of-possession/) 會展開。

## Claims：每一個都要有人負責驗

RFC 7519 的七個 registered claims 在規格裡全是選填，哪些必填由上層協定決定。對 access token 來說，RFC 9068 規定的必填組合是：`iss`、`exp`、`aud`、`sub`、`client_id`、`iat`、`jti`，header 的 `typ` 也是必填，值建議寫成 `at+jwt`（完整的媒體類型是 `application/at+jwt`）。

從驗證方的角度看，每個 claim 對應一個要回答的問題：

| Claim | 要回答的問題 | 驗證規則 | 常見錯誤 |
|---|---|---|---|
| `iss` | 誰簽的？ | 和設定的 issuer 逐字比對；簽章用的金鑰必須屬於這個 issuer | 結尾多一個 `/` 就比對失敗；只比對網域前綴 |
| `aud` | 給誰用的？ | 必須包含自己的識別碼；它可能是字串，也可能是陣列 | 完全沒驗，給付款 API 的 token 也能打訂單 API |
| `exp` | 還有效嗎？ | 現在時間要早於 `exp`，可容許小幅時鐘誤差 | 誤差開到好幾分鐘，等於延長 token 壽命 |
| `nbf` | 生效了嗎？ | 現在時間不早於 `nbf` | 簽發端與驗證端時鐘不同步 |
| `iat` | 簽多久了？ | 規格沒有規定要據此拒絕；應用可以拿來限制 token 年齡 | 拿 `iat` 加上固定秒數當成過期時間，忽略 `exp` |
| `sub` | 關於誰？ | 在同一個 `iss` 底下穩定且唯一 | 用 email 當 `sub`，使用者改了 email 就變成另一個人 |
| `jti` | 是哪一個 token？ | 需要防重放或撤銷時，記錄看過的值 | 記了 `jti` 卻沒設過期，儲存量無限成長 |
| `client_id` | 哪個應用程式拿到的？ | 需要依用戶端限制功能時檢查 | 把 `client_id` 當成使用者身分 |
| `scope` | 可以做哪類事？ | 和 endpoint 需要的權限比對 | 以為有 scope 就能存取每一筆資料 |
| `cnf` | 綁定了哪把金鑰？ | 有綁定時，要求請求方證明持有那把私鑰 | 有 `cnf` 卻照樣接受 Bearer 形式的請求 |

幾個需要多說明的地方：

**`iss` 與金鑰必須對得上**。RFC 8725 要求：token 有 `iss` 時，驗證方必須確認簽章用的金鑰屬於這個 issuer。只看「簽章過了」再去讀 `iss` 是不夠的。在同時信任多個 IdP 的系統裡，A 的金鑰簽了一個 `iss` 寫成 B 的 token，也會被當成 B 簽發的。正確的順序是：先由 `iss`（或設定）決定要用哪一份 JWKS，再用那份 JWKS 驗簽。

**`aud` 實務上一定要驗**。RFC 8725 的說法是：同一個簽發者發 token 給多個對象時，`aud` 必須存在，也必須檢查。公司內部的 IdP 幾乎一定同時服務多個 API，所以結論就是一定要驗。

**`scope` 不等於資料權限**。scope 說的是「這個用戶端可以代表使用者做哪類事」，例如 `orders:read`。它不代表這位使用者可以讀每一張訂單，物件層的授權仍然要在 API 裡檢查，見 [授權模型與 OWASP API Top 10](/post/systemdesign/authorization-owasp-api-top10/)。

**`jti` 的成本**。`jti` 只是一個唯一值，要發揮作用，驗證方得把看過的值記下來，至少記到那個 token 的 `exp`。多台 API 實例要共用這份紀錄，就需要 Redis 這類共享儲存，每個請求多一次查詢。所以大部分 access token 的 `jti` 只用在稽核與撤銷清單；需要逐次防重放的場景，例如 DPoP proof 與一次性的 client assertion，才會真的去查。

**`cnf` 讓 token 不再是撿到就能用**。RFC 7800 定義了 `cnf`（confirmation）claim，用來描述「持有這個 token 的人必須能證明擁有哪一把金鑰」。DPoP 在裡面放 `jkt`，也就是金鑰的 thumbprint。

**不同種類的 JWT，驗證規則要互斥**。RFC 8725 建議讓 A 種 token 一定過不了 B 種的驗證。最直接的方法是 `typ`：access token 用 `at+jwt`，RFC 9068 要求 API 只接受 `at+jwt` 或 `application/at+jwt`，其他值一律拒絕。ID token 的 `aud` 是用戶端的 `client_id`，不會是 API 的識別碼，只要 API 有驗 `aud`，也會在那一關被擋下。

## JWK 與 JWKS：公鑰怎麼發布、怎麼輪替

### 一把公鑰長什麼樣子

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "<X 座標，32 bytes，base64url>",
  "y": "<Y 座標，32 bytes，base64url>",
  "kid": "k-2026-11",
  "use": "sig",
  "alg": "ES256"
}
```

| 參數 | 意思 |
|---|---|
| `kty` | 金鑰類型：`RSA`、`EC`、`OKP`（Ed25519 等）、`oct`（對稱金鑰），必填 |
| `crv`、`x`、`y`／`n`、`e` | 依 `kty` 而定的金鑰內容 |
| `kid` | 識別碼，格式自訂；同一份 JWKS 裡應該唯一 |
| `use` | `sig`（簽章）或 `enc`（加密） |
| `alg` | 這把金鑰預定搭配的演算法 |
| `x5c` | 對應的 X.509 憑證鏈，用標準 Base64 而不是 base64url |

多把公鑰放進 `{"keys": [...]}` 就是 JWK Set（JWKS）。授權伺服器在 discovery 文件（`/.well-known/openid-configuration` 或 RFC 8414 的 `/.well-known/oauth-authorization-server`）的 `jwks_uri` 告訴大家去哪裡抓。驗證方只要設定 issuer，其餘資訊都能從 discovery 文件取得，Spring Security 的 `issuer-uri` 就是這樣運作的。憑證鏈與信任名單的概念，可以對照 [網頁憑證信任圖解](/post/security/web-certificate-trust/)。

### 輪替：先發布，再切換，最後才移除

金鑰要定期更換，也要能在外洩時緊急撤換。`kid` 讓新舊金鑰可以同時存在：

1. **發布**：把新公鑰加進 JWKS，舊的保留。這時還沒有任何 token 用新金鑰簽
2. **等快取更新**：等所有驗證方的 JWKS 快取都過期。Spring Security 預設在記憶體裡快取 5 分鐘，但中間若有 CDN 或閘道，快取可能更久，要以最長的那一層為準
3. **切換**：開始用新私鑰簽，新 token 的 `kid` 指向新金鑰
4. **移除**：等舊金鑰簽出的 token 全部過期，也就是 access token 的最長有效期過去之後，才把舊公鑰從 JWKS 拿掉

順序顛倒就會出事：先用新金鑰簽，驗證方的快取裡還沒有這個 `kid`，所有新 token 都驗不過。很多函式庫遇到不認得的 `kid` 會自動重抓一次 JWKS，但通常有頻率限制，不要把正確性押在這個行為上。

緊急撤換（私鑰外洩）的方向剛好相反：立刻把被盜的公鑰從 JWKS 移除，接受所有用它簽的 token 一起失效、使用者需要重新登入。移除只影響之後的抓取：驗證方快取裡的舊公鑰（包括中間的 CDN）在到期前仍然有效，要等它到期，或主動清掉各層的快取。

### JWK thumbprint：一把金鑰的指紋

RFC 7638 定義了怎麼替一把公鑰算出穩定的指紋：只取必要的成員、依名稱排序、去掉所有空白，再做雜湊（一般用 SHA-256），最後以 base64url 表示。

| `kty` | 參與計算的成員（依序） |
|---|---|
| `RSA` | `e`、`kty`、`n` |
| `EC` | `crv`、`kty`、`x`、`y` |
| `OKP`（RFC 8037） | `crv`、`kty`、`x` |
| `oct` | `k`、`kty` |

`kid`、`use`、`alg` 這些選填欄位不參與計算，所以同一把金鑰不論描述寫得多詳細，指紋都一樣。常見的用途有兩個：
- **當作 `kid`**：不必另外編號，由金鑰本身決定識別碼
- **綁定 token**：DPoP 把這個指紋放在 access token 的 `cnf.jkt`，API 收到請求時，比對 proof 裡那把公鑰的指紋

## 已知攻擊與對應的驗證規則

RFC 8725（JWT Best Current Practices，2020 年）整理了實際發生過的攻擊。對照前面的 header 與 claim：

| 攻擊 | 怎麼發生 | 防禦 |
|---|---|---|
| `alg: none` | 把演算法改成 `none`、拿掉簽章，驗證方照 header 的指示跳過驗簽 | 驗證方固定允許的演算法，不接受 `none` |
| RS256 換成 HS256 | 驗證方原本用 RSA 公鑰驗 RS256；攻擊者改成 HS256，拿公開的 RSA 公鑰當 HMAC 密鑰來簽，函式庫若依 header 換演算法就會通過 | 每把金鑰只搭配一種演算法，不讓 header 決定用哪種演算法驗 |
| 弱的 HMAC 密鑰 | HS256 的密鑰是一個好記的字串，攻擊者拿到一個 token 就能離線暴力猜 | 對稱金鑰用足夠長度的隨機值，不用人記得住的密碼 |
| `kid` 注入 | 驗證方拿 `kid` 去查資料庫或讀檔案，攻擊者在 `kid` 裡放 SQL 或 `../` | `kid` 只當作查表的鍵，查不到就拒絕 |
| 信任 header 指定的金鑰 | 驗證方照 `jku`、`x5u` 去抓公鑰，或直接用 `jwk`，攻擊者就能用自己的金鑰簽 | 公鑰只來自設定好的 issuer；照 `jku` 去抓還會變成 SSRF |
| 跨服務替換 | 給付款 API 的 token 拿去打訂單 API | 驗 `aud` |
| 跨種類混用 | 把 ID token 或其他種類的 JWT 當成 access token | 用 `typ` 區分，不同種類的驗證規則互斥 |
| 加密前先壓縮 | JWE 的內容先壓縮再加密，密文長度洩漏內容 | 要加密的內容不要壓縮 |

RFC 8725 的修訂版 `draft-ietf-oauth-rfc8725bis` 目前是 draft -10（2026-08-21），已送交 RFC Editor，尚未發布。它增加了幾個新的威脅與對策，例如限制 JWE 解壓縮後的大小、限制雜湊的迭代次數、檢查 JWT 的格式種類以免不同格式互相混淆，並把函式庫對 `none` 的要求提高到 MUST NOT。正式發布之前，以 RFC 8725 為準。

## Java 落地：用 Spring Security 驗證 JWT

以下以 Spring Boot 4.2（Spring Security 7.2）為例。

### 基本設定：issuer、audience 與演算法

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://idp.example.com
          audiences: https://api.example.com/orders
```

- `issuer-uri`：從 discovery 文件找到 `jwks_uri`，用那裡的公鑰驗簽，並檢查 `iss` 必須等於這個值
- `audiences`：檢查 `aud` 必須包含這個值
- 演算法白名單：Spring Security 文件說明 `NimbusJwtDecoder` 預設只信任 RS256。IdP 用其他演算法時，用 builder 的 `jwsAlgorithms(...)` 明確列出，見下一節的程式碼。Boot 的 `jws-algorithms` 屬性在文件裡是搭配 `jwk-set-uri` 示範的，和 `issuer-uri` 一起用之前先確認你的版本會套用它

預設的驗證器還會檢查 `exp` 與 `nbf`（容許 60 秒的時鐘誤差），以及 `typ` 必須是 `JWT` 或不存在。

### IdP 簽發 `at+jwt` 時

Spring Security 7.0 起，`JwtValidators.createDefault…` 系列都會加上 `JwtTypeValidator.jwt()`，只接受 `typ` 為 `JWT` 或沒有 `typ`。IdP 若依 RFC 9068 簽發 `typ: at+jwt` 的 access token，預設設定會拒絕它，要改用 RFC 9068 的驗證器（6.5 起提供）：

```java
@Configuration
class JwtConfig {

    private static final String ISSUER = "https://idp.example.com";

    @Bean
    JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(ISSUER)
                .jwsAlgorithms(algorithms -> algorithms.add(SignatureAlgorithm.ES256))
                .build();
        decoder.setJwtValidator(JwtValidators.createAtJwtValidator()
                .issuer(ISSUER)
                .audience("https://api.example.com/orders")
                .clientId("orders-web")
                .build());
        return decoder;
    }
}
```

`AtJwtBuilder` 的 Javadoc 寫明，要符合 RFC 9068，`issuer`、`audience`、`clientId` 至少都要指定，官方文件的範例也是三項都有。`clientId(...)` 會要求每個 token 的 `client_id` 等於指定值；同一個 API 服務多個用戶端時，builder 的驗證器依 claim 名稱索引，可以用 `validators(...)` 換掉 `client_id` 那一項。

自己宣告 `JwtDecoder` bean 之後，Spring Boot 就不再依 YAML 的 `issuer-uri`、`audiences` 建立驗證器，`iss` 與 `aud` 的檢查要像上面一樣自己設定。在 6.5 上，建立 decoder 時還要加上 `.validateTypes(false)`，否則 Nimbus 會先依自己的規則檢查 `typ`；7.0 起這是預設值。

### JWKS 的快取

公鑰清單預設由每個實例各自在記憶體快取 5 分鐘。要改用共享快取，在 builder 加上 `.cache(...)`，驗證器的設定照舊：

```java
// 取代上一節 JwtConfig 裡的 jwtDecoder()
@Bean
JwtDecoder jwtDecoder(CacheManager cacheManager) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(ISSUER)
            .jwsAlgorithms(algorithms -> algorithms.add(SignatureAlgorithm.ES256))
            .cache(cacheManager.getCache("jwks"))
            .build();
    decoder.setJwtValidator(JwtValidators.createAtJwtValidator()
            .issuer(ISSUER)
            .audience("https://api.example.com/orders")
            .clientId("orders-web")
            .build());
    return decoder;
}
```

- **一定要設 TTL**：換成共享快取後，到期時間由這個快取自己的設定決定，不再是 5 分鐘。沒有 TTL 的快取（例如 `ConcurrentMapCacheManager`，或沒設 `time-to-live` 的 Redis 快取）永遠不會過期，IdP 移除的公鑰會一直留在 API 端
- **快取要存在**：`getCache` 在快取不存在、也無法建立時回傳 `null`，要先確認 `jwks` 這個快取有設定好
- 不管用哪一種，快取時間都是輪替金鑰時至少要等的時間，也是緊急撤換後舊公鑰仍然有效的時間

### 算出一把金鑰的 thumbprint

Spring Security 底層用的 JOSE 函式庫是 Nimbus JOSE + JWT：

```java
ECKey key = new ECKeyGenerator(Curve.P_256).generate();
Base64URL jkt = key.toPublicJWK().computeThumbprint();   // 預設 SHA-256
```

`computeThumbprint()` 依 RFC 7638 的規則挑選成員與排序，結果就是 DPoP 放進 `cnf.jkt` 的值。

## JWT 還是 opaque token？

| | JWT（自包含） | Opaque token（隨機字串） |
|---|---|---|
| API 怎麼驗 | 本地驗簽，不用連 IdP | 呼叫 IdP 的 introspection（RFC 7662），通常會快取結果 |
| 撤銷 | 到 `exp` 之前都有效，除非另外維護撤銷清單 | IdP 撤銷後立即失效，最多晚一個快取週期 |
| 內容 | payload 誰都讀得到 | 只是一串隨機值，內容只有 IdP 知道 |
| 大小 | 數百到上千 bytes，每個請求都要帶 | 幾十 bytes |
| IdP 故障時 | 已簽發的 token 照樣能驗 | introspection 失敗，API 無法驗證 |

怎麼選：
- **內部 API、自家 IdP**：JWT 搭配短效期（5 到 15 分鐘）與 refresh token，最常見也最省事。撤銷的延遲就是 access token 的壽命，必須能接受
- **要立即撤銷，或 token 會交給第三方**：用 opaque token。第三方拿到 JWT 就能讀到裡面的資料；opaque token 只有 IdP 知道它代表什麼
- **兩者都要**：對外發 opaque token，閘道收到後向 IdP 換成 JWT 再傳給內部服務（常稱為 phantom token）。外部看不到內容，內部服務仍然可以本地驗證

## 踩坑與 Gotchas

- **只解碼、沒驗證**：把中間段 Base64 解出來讀 `sub`，等於接受任何人自己做的 token。網頁上的 JWT 解碼工具也只是解碼，不代表 token 有效
- **`iss` 的結尾斜線**：`https://idp.example.com` 和 `https://idp.example.com/` 是不同的字串，設定值要和 token 裡的值逐字相同
- **`aud` 有兩種型別**：單一對象時可能是字串，多個對象時是陣列，自己寫的驗證邏輯兩種都要處理
- **升級到 Spring Security 7 之後 token 全被拒**：IdP 簽的是 `at+jwt`，新的預設驗證器只接受 `JWT`，見上一節
- **時鐘誤差開太大**：容許 10 分鐘的誤差，就等於每個 token 多活 10 分鐘
- **JWKS 被中間層快取**：輪替金鑰時只等了應用程式的 5 分鐘，CDN 卻快取了 1 小時
- **把整個 token 印進日誌**：bearer token 撿到就能用，而日誌系統的存取權限通常比 API 寬鬆得多。只記 `jti` 或 token 的雜湊；想讓外洩的 token 本身失去作用，見 [DPoP](/post/security/dpop-proof-of-possession/)
- **把個資放進 payload**：Base64URL 不是加密，email、電話放進 token，就等於交給每一個經手的系統

## 何時用／何時別用

適合用 JWT：
- 多個 API 要各自驗證同一個 IdP 發的 token，不想每個請求都回頭問 IdP
- 可以接受「撤銷要等 token 過期」，或願意把 access token 的壽命壓到幾分鐘

不適合用 JWT（或至少不要只靠它）：
- 需要立即撤銷，例如帳號被盜要馬上踢下線
- token 會交到第三方手上，而 payload 有不該公開的資訊
- 想用 JWT 取代 session 存放大量使用者狀態：token 會越來越大，改一個值就得重新簽發

## 參考資料

- RFC 7515, "JSON Web Signature (JWS)"；RFC 7516, "JSON Web Encryption (JWE)"
- RFC 7517, "JSON Web Key (JWK)"；RFC 7518, "JSON Web Algorithms (JWA)"
- RFC 7519, "JSON Web Token (JWT)"
- RFC 7638, "JSON Web Key (JWK) Thumbprint"；RFC 8037, "CFRG Elliptic Curve Diffie-Hellman (ECDH) and Signatures in JSON Object Signing and Encryption (JOSE)"
- RFC 7800, "Proof-of-Possession Key Semantics for JSON Web Tokens (JWTs)"
- RFC 8725, "JSON Web Token Best Current Practices"
- draft-ietf-oauth-rfc8725bis-10, "JSON Web Token Best Current Practices"（2026-08-21，Internet-Draft，尚未發布）：<https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/>
- RFC 9068, "JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens"
- RFC 8414, "OAuth 2.0 Authorization Server Metadata"；RFC 7662, "OAuth 2.0 Token Introspection"
- Spring Security Reference — OAuth 2.0 Resource Server JWT、Migration to 7.0（OAuth 2.0）：<https://docs.spring.io/spring-security/reference/>
