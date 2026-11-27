---
title: "DPoP 實戰：讓 access token 綁定金鑰，被偷了也用不了"
date: 2026-11-27
draft: false
author: Bill.Lin
description: "說明 RFC 9449 DPoP 如何把 access token 綁定到用戶端金鑰，拆解 proof 的欄位、伺服器檢查、nonce 與防重放，比較 Bearer 與 mTLS，並整理 Spring Security 的支援與導入評估"
categories: ["Security"]
tags: ["DPoP", "OAuth 2.0", "JWT", "Spring Security", "Security", "Token"]
---

## 情境與問題

講座平台的 API 一直使用 bearer token：`Authorization: Bearer <token>`，誰拿到這串字誰就能用。這一季接連發生兩件事：

- 新上線的閘道把完整的請求標頭寫進存取日誌，日誌保存 30 天，能讀的人包括維運、外包廠商和日誌平台本身
- 手機 App 的除錯版本被上傳到測試平台，裡面的 refresh token 被拿去換了新的 access token

兩件事的共同點是：token 離開了原本的用戶端，而 bearer token 在別人手上和在自己手上一樣好用。縮短效期可以減少損失，卻沒辦法讓外洩的 token 本身失效。

```diagram
title: 同一個 token，兩種下場
actors: C 用戶端 | AS 授權伺服器 | RS 訂單 API | ATK 攻擊者
note C: 產生金鑰對，私鑰不外流
  用戶端先產生一對 EC 金鑰（P-256）。私鑰只留在用戶端，之後每個請求都用它簽一個 proof。
C -> AS: 授權碼 + DPoP proof
  換 token 的請求附上 DPoP 標頭：一個用私鑰簽的 JWT，header 裡帶著對應的公鑰。
AS --> C: token_type: DPoP
  授權伺服器驗過 proof，把公鑰的 thumbprint 寫進 access token 的 cnf.jkt，回應的 token_type 是 DPoP 而不是 Bearer。
C -> RS: token + 新的 proof
  呼叫 API 時，每個請求都簽一個新的 proof，裡面有這次的 HTTP 方法、網址，以及 access token 的雜湊 ath。
note RS: proof 的公鑰 = cnf.jkt [ok]
  API 驗過 proof 的簽章、方法、網址與時間，再確認 proof 裡那把公鑰的 thumbprint 和 token 的 cnf.jkt 相同，才放行。
note ATK: 從日誌撿到 token [danger]
  攻擊者從閘道的存取日誌裡撿到了這個 access token。
ATK -> RS: 同一個 token [danger]
  攻擊者拿著 token 呼叫 API。它可以自己產生金鑰、簽出格式正確的 proof，但那把公鑰的 thumbprint 和 cnf.jkt 對不上。
RS --> ATK: 401：proof 對不上 [ok]
  API 回 401。token 是真的，但沒有對應的私鑰，它就只是一串用不了的字。
note C: XSS 能直接借用私鑰 [danger]
  但如果攻擊者能在用戶端的頁面裡執行程式，就能趁使用者開著頁面時，直接拿那把私鑰簽 proof。DPoP 擋的是外洩的 token，不是被入侵的用戶端。
```

DPoP（Demonstrating Proof of Possession，RFC 9449，2023 年 9 月）要回答的是：**token 外洩之後，怎麼讓它對拿到的人沒有用**。做法是讓每個請求都附上一份只有原本的用戶端才簽得出來的證明。

這篇用到 JWS、JWK 與 JWK thumbprint，不熟的話可以先看 [JWT、JWS、JWK 一次看懂](/post/security/jose-jwt-jwk/)。

## 最簡單的做法與它的極限

在 DPoP 之前，常見的做法有三種：

- **縮短 access token 的效期**：外洩後能用的時間變短，但在效期內照樣能用；refresh token 的壽命長，外洩的後果更嚴重
- **Refresh token 輪替與重複使用偵測**（RFC 9700）：能發現 refresh token 被盜用，前提是正牌的用戶端之後還會再用到同一個 token
- **mTLS 綁定**（RFC 8705）：把 token 綁到用戶端的 TLS 憑證，在 TLS 層完成驗證，安全性最好。但瀏覽器和多數手機 App 很難管理用戶端憑證，TLS 又常在負載平衡器終止，憑證資訊得一路傳到 API

DPoP 把「證明持有私鑰」從 TLS 層搬到 HTTP 層，用一個 JWT 完成。任何能發 HTTP 請求、能做簽章的用戶端都能使用。

## 核心機制

### Proof 是用戶端自己簽的 JWT

一個呼叫 API 時使用的 proof，header 與 payload 長這樣：

```json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": { "kty": "EC", "crv": "P-256", "x": "<base64url>", "y": "<base64url>" }
}
```

```json
{
  "jti": "1f6e4c2a-8b3d-4e5f-9a10-2c7d8e9f0a1b",
  "htm": "GET",
  "htu": "https://api.example.com/orders/1001",
  "iat": 1795334400,
  "ath": "<access token 的 SHA-256，base64url>"
}
```

| 欄位 | 位置 | 意思 | 規則 |
|---|---|---|---|
| `typ` | header | 固定為 `dpop+jwt` | 用來和其他種類的 JWT 區分 |
| `alg` | header | 簽章演算法 | 必須是非對稱演算法，不能是 `none` 或 HMAC |
| `jwk` | header | 用戶端的公鑰 | 不能包含私鑰 |
| `jti` | payload | 這個 proof 的唯一值 | 至少 96 bits 的隨機值或 UUID v4，伺服器用它防重放 |
| `htm` | payload | HTTP 方法 | 和實際請求相同 |
| `htu` | payload | 目標網址 | 不含 query 與 fragment |
| `iat` | payload | 簽發時間 | 伺服器只接受幾秒到幾分鐘內產生的 proof |
| `ath` | payload | access token 的 SHA-256，base64url | 呼叫 API 時必填；換 token 時還沒有 token，所以沒有 |
| `nonce` | payload | 伺服器發的 nonce | 伺服器要求時必填 |

Proof 沒有 `exp`、`iss`、`aud`。它的有效範圍由 `iat`（時間）、`htm` 加 `htu`（這一個請求）和 `ath`（這一個 token）決定。所以**每個請求都要簽一個新的 proof**，不能重複使用。

### 換 token：授權伺服器把 token 綁到公鑰

用戶端在 token 請求上附 `DPoP` 標頭，所有 grant type 都一樣：

```http
POST /token HTTP/1.1
Host: idp.example.com
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2Ii...

grant_type=authorization_code&code=...&redirect_uri=...&code_verifier=...
```

授權伺服器驗過 proof 後，算出 `jwk` 的 thumbprint（RFC 7638），把它和 token 綁在一起：
- **JWT access token**：寫進 `"cnf": {"jkt": "<thumbprint>"}`
- **Opaque token**：記在授權伺服器端，API 呼叫 introspection 時取得 `cnf.jkt`

回應的 `token_type` 是 `DPoP`。如果回來的是 `Bearer`，代表授權伺服器沒有綁定；需要 DPoP 保護的用戶端必須丟棄這個回應，不能把它當成一般 token 繼續用。

Refresh token 的規則依用戶端類型而不同：
- **公開用戶端**（SPA、手機 App，沒有 client secret）：refresh token 也綁定同一把金鑰，之後用它換新 token 時，必須附上同一把金鑰簽的 proof
- **機密用戶端**（有 client secret 或 private key）：refresh token 不綁定，因為換 token 時本來就要做用戶端驗證。這樣機密用戶端可以更換 DPoP 金鑰，不會讓手上的 refresh token 失效

授權碼也可以綁定：在授權請求帶上 `dpop_jkt` 參數（使用 PAR 時，也可以在 PAR 請求附 `DPoP` 標頭），授權伺服器換 token 時就會確認 proof 的金鑰和它一致。偷到授權碼的人，無法用自己的金鑰換到 token。它和 PKCE 可以並用。

### 呼叫 API：換成 DPoP scheme

```http
GET /orders/1001 HTTP/1.1
Host: api.example.com
Authorization: DPoP <access token>
DPoP: <這個請求專用的 proof>
```

API 要做的檢查：

1. 只有一個 `DPoP` 標頭，內容是格式正確的 JWT
2. `typ` 是 `dpop+jwt`，`alg` 是自己允許的非對稱演算法
3. 用 header 的 `jwk` 驗簽章，而且 `jwk` 裡沒有私鑰
4. `htm`、`htu` 和這個請求相符，`htu` 比對時忽略 query 與 fragment
5. `iat` 在可接受的時間範圍內；有發過 nonce 時，`nonce` 必須相符
6. `jti` 在時間範圍內沒出現過
7. `ath` 等於這個 access token 的雜湊
8. `jwk` 的 thumbprint 等於 token 的 `cnf.jkt`

任何一項失敗就回 401：

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: DPoP error="invalid_dpop_proof", algs="ES256 PS256"
```

proof 本身不合格時，`error` 用 `invalid_dpop_proof`。RFC 對「token 綁定的金鑰和 proof 對不上」舉的範例則是 `error="invalid_token"`、`error_description="Invalid DPoP key binding"`，讓用戶端知道問題出在 token 與金鑰的組合，重簽一個 proof 也沒用。

第 8 項才是核心。前 7 項只證明「有人用某一把私鑰簽了這個 proof」，第 8 項把那把私鑰和 token 連起來。這也說明了為什麼 DPoP 可以放心使用 header 裡的 `jwk`，和「不要信任 header 指定的金鑰」並不矛盾：DPoP 從來不靠這把公鑰判斷「你是誰」，只用它判斷「你是不是當初拿到 token 的那一方」。

### Nonce：擋住預先產生的 proof

`iat` 是用戶端自己填的。攻擊者如果短暫控制了用戶端，例如頁面被 XSS，就能先簽好一批 `iat` 填未來時間的 proof 帶走，之後在自己的電腦上慢慢用。RFC 9449 的對策是由伺服器提供 nonce：

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"
DPoP-Nonce: 8Hk2pQx7Tq-3vRz
```

- 授權伺服器回 400、`error` 為 `use_dpop_nonce`；API 回 401，錯誤放在 `WWW-Authenticate`。兩者都在 `DPoP-Nonce` 標頭給出 nonce
- 用戶端帶著 nonce 重新簽 proof、重送一次；之後的請求都帶最新的 nonce，回應裡出現新的 `DPoP-Nonce` 就換掉
- 伺服器一旦給過 nonce，就不能再接受沒有 nonce 的 proof
- 授權伺服器和 API 的 nonce 各自獨立，不能混用

Nonce 還有一個好處：伺服器不必再相信用戶端的時鐘。代價是第一次請求與每次換 nonce 時多一次來回，伺服器也要能驗證 nonce，例如把時間戳加密後當作 nonce，或放在共享儲存裡。

### 降級：DPoP token 不能當 Bearer 用

如果攻擊者把 `Authorization: DPoP` 改成 `Authorization: Bearer`、乾脆不送 proof，會怎樣？RFC 9449 規定：同時支援兩種 scheme 的 API，**必須拒絕以 Bearer 形式送來的 DPoP 綁定 token**。

漏洞在只懂 Bearer 的舊 API：它不知道 `cnf` 的意思，token 簽章與效期都正確，就可能照樣接受。換句話說，只要還有一個 API 只做 Bearer，偷到的 token 在那裡就還能用，**綁定的強度取決於最弱的那個 API**。

### Metadata

- **授權伺服器**：discovery 文件的 `dpop_signing_alg_values_supported` 列出它接受的 proof 演算法。導入前先看你的 IdP 有沒有這個欄位
- **用戶端註冊**：`dpop_bound_access_tokens: true` 讓授權伺服器拒絕這個用戶端所有沒有 DPoP 的 token 請求，避免它在某個環節悄悄退回 Bearer

## DPoP 擋得住什麼、擋不住什麼

| 情境 | 有效嗎 | 原因 |
|---|---|---|
| access token 出現在日誌、APM、代理伺服器 | 有效 | 沒有私鑰，簽不出符合 `cnf.jkt` 的 proof |
| 公開用戶端的 refresh token 外洩 | 有效 | refresh token 也綁定同一把金鑰 |
| 惡意或被入侵的 API 收到 token 與 proof，轉送到另一個 API | 有效 | proof 的 `htu` 是原本那個 API 的網址，拿到別的網址就對不上 |
| 在時間範圍內重送同一個請求 | 部分有效 | 靠 `jti` 紀錄與 `iat` 時間窗；多台實例沒有共享紀錄時有漏洞 |
| 頁面被 XSS | 無效 | 攻擊程式和正常程式碼權限相同，能直接用私鑰簽 proof；沒有 nonce 時還能預先簽好帶走 |
| 裝置上的惡意程式拿到私鑰 | 無效 | 私鑰外洩，DPoP 的前提就不成立 |
| 竄改請求內容 | 不在範圍內 | proof 不涵蓋 body 與其他標頭，完整性靠 TLS |

瀏覽器可以用 WebCrypto 產生「不可匯出」的私鑰，存在 IndexedDB 裡。RFC 9449 提到這樣能讓偷走的 token 單獨無法使用，但攻擊者在頁面開著的時候仍然能叫瀏覽器替它簽章。RFC 10017（瀏覽器應用的 OAuth 最佳實務，2026 年 8 月）也指出，能在頁面執行 JavaScript 的攻擊者，權限和正常的應用程式碼一樣。所以對瀏覽器應用來說，**BFF 讓 token 根本不進瀏覽器**，仍然是比較徹底的做法，見 [身分驗證：Session、Token 與 OAuth 2.0／OIDC](/post/systemdesign/authentication-session-token-oidc/)。

## 方案比較：Bearer、mTLS 與 DPoP

| | Bearer | mTLS 綁定（RFC 8705） | DPoP（RFC 9449） |
|---|---|---|---|
| 綁定在哪一層 | 沒有綁定 | TLS（用戶端憑證） | HTTP（每個請求一個 proof） |
| token 外洩後 | 照樣能用 | 沒有憑證的私鑰就不能用 | 沒有 proof 的私鑰就不能用 |
| 瀏覽器、SPA | 可以 | 實務上很難 | 可以 |
| TLS 在負載平衡器終止 | 沒有影響 | 要把用戶端憑證資訊傳到 API | 沒有影響，但要處理 `htu` 的網址 |
| 每個請求的額外成本 | 無 | TLS 握手時驗證 | 簽一個 JWT、驗一個 JWT、查一次 `jti` |
| 防重放 | 無 | TLS 連線本身 | `jti` 紀錄、`iat` 時間窗、選用的 nonce |
| 請求完整性 | 靠 TLS | TLS 與應用層緊密結合，較強 | 只涵蓋方法、網址與 token，其餘靠 TLS |
| 適合 | 低風險、內部系統 | 服務對服務、已經有 service mesh 或 PKI | 公開用戶端、經過多層代理的 API |

RFC 9700（OAuth 2.0 Security Best Current Practice，2025 年 1 月）建議使用 sender-constrained access token；FAPI 2.0 Security Profile（2025 年 2 月）則要求 access token 必須是 sender-constrained，方法是 mTLS 或 DPoP。

## Java 落地

### Resource server：Spring Security

| 版本 | 行為 |
|---|---|
| 6.5 | 引入 DPoP。只要設定了 `oauth2ResourceServer`，就會自動處理 `Authorization: DPoP` 的請求 |
| 7.1 | 新增 `.dPoP(...)`，改為選用，要明確呼叫才會啟用 |
| 7.2 | 新增 `dPoPProofVerifierFactory(...)`，可以替換 proof 的驗證器 |

以 Spring Boot 4.2（Spring Security 7.2）為例：

```java
@Configuration
class ResourceServerConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .oauth2ResourceServer(rs -> rs
                .jwt(Customizer.withDefaults())
                .dPoP(Customizer.withDefaults()));   // 7.1 起需要；6.5 沒有這個方法
        return http.build();
    }
}
```

依 7.x 的原始碼，Spring 會做這些事：
- **Proof 的格式**：`typ` 必須是 `dpop+jwt`；`alg` 只接受 RSA 與 EC 系列（RS、PS、ES 開頭）；`jwk` 必須存在且不含私鑰
- **請求比對**：`htm` 與方法相同，`htu` 與應用程式看到的請求網址相同
- **時間與重放**：`iat` 的時鐘誤差預設容許 30 秒；`jti` 在記憶體快取裡檢查是否重複
- **和 token 的綁定**：`ath` 與 `cnf.jkt` 都要相符；access token 本身仍由你設定的 JWT decoder（或 opaque token 的 introspection）驗證
- **降級**：DPoP 綁定的 token 以 Bearer 送來時，`BearerTokenAuthenticationFilter` 會拒絕它
- **不支援 server nonce**：需要 nonce 的話，要在閘道或自己的元件裡實作

上線前要處理的兩件事：

**多台實例的防重放**。預設的 `jti` 快取是單一 JVM 的記憶體，`DPoPProofReplayValidator.InMemoryCache` 的 Javadoc 也寫明只適合單節點。多台實例時，同一個 proof 送到另一台還是會過，要換成分散式的 `org.springframework.cache.Cache` 實作，而且它的 `putIfAbsent` 必須是跨節點的原子操作。依原始碼，`DPoPProofReplayValidator` 的建構子接受一個 `Cache`；把它放進 `DPoPProofJwtDecoderFactory.createDefaultJwtValidatorFactory(List)` 的清單，就會取代預設的那一個，7.2 起再透過 `.dPoP(...)` 的 `dPoPProofVerifierFactory(...)` 接進設定。如果決定不做，至少要確保日誌不會記下 `DPoP` 與 `Authorization` 標頭，否則拿到日誌的人可以在時間窗內重送同一個請求。

**反向代理後面的 `htu`**。用戶端簽的是 `https://api.example.com/orders/1001`，但 TLS 在負載平衡器終止後，應用程式看到的可能是 `http://10.0.1.5:8080/orders/1001`，每個請求都會因為 `htu` 不符被拒。讓 Spring Boot 依代理送來的 `X-Forwarded-*` 標頭重建網址：

```yaml
server:
  forward-headers-strategy: framework
```

只在確定前面有可信任的代理、而且它會覆寫這些標頭時才這樣設定，否則用戶端可以自己偽造 `X-Forwarded-Host`。閘道若會改寫路徑前綴（例如把 `/api/orders` 轉成 `/orders`），`htu` 一樣會對不上，要讓用戶端簽的網址和 API 看到的一致。

### 用戶端：產生 proof

Spring Security 的 OAuth2 Client 文件目前沒有描述 DPoP，`RestClient` 的攔截器送出的是 Bearer，所以用戶端要自己產生 proof。可以用 Nimbus OAuth 2.0 SDK 的 `DefaultDPoPProofFactory`，或像下面這樣，用 Spring Security 本身就有的 `NimbusJwtEncoder`：

```java
public final class DPoPProofSigner {

    private final ECKey key = generateKey();   // 私鑰只存在這個程序的記憶體裡
    private final NimbusJwtEncoder encoder =
            new NimbusJwtEncoder((selector, context) -> selector.select(new JWKSet(key)));

    /** 換 token 時使用：還沒有 access token，所以沒有 ath。 */
    public String forTokenRequest(String tokenEndpoint, String nonce) {
        return sign("POST", tokenEndpoint, null, nonce);
    }

    /** 呼叫 API 時使用：每個請求、包含每次重試，都要重新產生。 */
    public String forResource(String method, String url, String accessToken, String nonce) {
        return sign(method, url, accessToken, nonce);
    }

    private String sign(String htm, String url, String accessToken, String nonce) {
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.ES256)
                .type("dpop+jwt")
                .jwk(key.toPublicJWK().toJSONObject())
                .build();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .id(UUID.randomUUID().toString())
                .issuedAt(Instant.now())
                .claim("htm", htm)
                .claim("htu", url.split("[?#]", 2)[0]);   // 去掉 query 與 fragment
        if (accessToken != null) {
            claims.claim("ath", sha256(accessToken));
        }
        if (nonce != null) {
            claims.claim("nonce", nonce);
        }
        return encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    private static String sha256(String accessToken) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(accessToken.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ECKey generateKey() {
        try {
            return new ECKeyGenerator(Curve.P_256).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

收到 nonce 要求時的處理順序：
1. 送出請求，proof 沒有 nonce
2. 收到 400（授權伺服器）或 401（API），錯誤碼是 `use_dpop_nonce`，讀出 `DPoP-Nonce` 標頭
3. 用新的 `jti`、帶上 nonce 重新簽一個 proof，重送一次
4. 之後的請求都帶最新的 nonce；授權伺服器與 API 的 nonce 分開保存

### 瀏覽器端的兩個設定

- **金鑰**：用 WebCrypto 產生不可匯出的 ECDSA P-256 金鑰，`CryptoKey` 物件存進 IndexedDB，重新整理頁面後仍然是同一把。清除瀏覽器資料就會失去金鑰，綁定的 token 與 refresh token 也一起作廢，使用者要重新登入
- **CORS**：`DPoP` 是自訂的請求標頭，API 的 `Access-Control-Allow-Headers` 要包含 `DPoP` 與 `Authorization`；`Access-Control-Expose-Headers` 要包含 `DPoP-Nonce` 與 `WWW-Authenticate`，否則前端讀不到 nonce 與錯誤原因

## 踩坑與 Gotchas

- **從 6.5 升級到 7.1 之後 DPoP 全部 401**：7.1 起 DPoP 要明確啟用，沒有 `.dPoP(...)` 的話，`Authorization: DPoP` 的請求不會被處理；把 token 改用 Bearer 送，又會被降級檢查擋下
- **`htu` 對不上**：反向代理、TLS 終止、閘道改寫路徑、預設埠寫法不同（`:443`），都會讓用戶端簽的網址和伺服器看到的不一致
- **重試時沿用舊的 proof**：`jti` 重複，被當成重放拒絕。HTTP 用戶端的自動重試要能重新產生 proof
- **用戶端時鐘不準**：Spring 對 `iat` 預設只容許 30 秒的時鐘誤差，手機時間偏差幾分鐘，proof 就可能全部被拒。RFC 的解法是 server nonce，但 Spring 的 resource server 不支援
- **用 Ed25519 簽 proof**：Spring 只接受 RSA 與 EC 系列的演算法
- **授權伺服器回了 `token_type: Bearer`**：代表沒有綁定。對需要 DPoP 的用戶端設定 `dpop_bound_access_tokens`，並在用戶端檢查 `token_type`
- **換金鑰就要重新取得 token**：token 綁在舊金鑰上；公開用戶端的 refresh token 也一起綁定
- **日誌記下 `DPoP` 標頭**：token 與 proof 一起外洩，時間窗內可以重送同一個請求
- **多台實例各自防重放**：預設的記憶體快取不共享

### 攻擊情境

| 攻擊 | 怎麼發生 | 防禦 |
|---|---|---|
| 降級成 Bearer | 把 `Authorization: DPoP` 改成 `Bearer`，不送 proof | 支援 DPoP 的 API 必須拒絕帶 `cnf.jkt` 的 Bearer 請求；所有 API 都要升級 |
| 預先產生 proof | XSS 期間用未來的 `iat` 簽一批 proof 帶走 | server nonce；縮短 access token 效期，`ath` 讓 proof 最多活到 token 過期 |
| 重送攔截到的請求 | 同網址、同 token，在時間窗內重送 | 共享的 `jti` 紀錄、短的時間窗 |
| 偷授權碼換 token | 用自己的金鑰去換 DPoP token | PKCE；在授權請求帶 `dpop_jkt` 綁定授權碼 |
| 拿別種 JWT 當 proof | 把 ID token 或其他簽過的 JWT 放進 `DPoP` 標頭 | 檢查 `typ` 必須是 `dpop+jwt` |

## 何時用／何時別用

值得導入：
- 公開用戶端（手機 App、無法採用 BFF 的 SPA）持有長效的 refresh token
- 高價值的 API：付款、退款、個資查詢
- token 會經過多層閘道、代理、日誌與監控平台，外洩點多又難以全部控制
- 法規或產業規範要求 sender-constrained token，例如採用 FAPI 2.0

先不用：
- 服務之間已經有 mTLS（例如 service mesh），用 RFC 8705 的憑證綁定更直接
- 瀏覽器應用可以採用 BFF：token 不進瀏覽器，比在瀏覽器裡做 DPoP 更徹底
- IdP、閘道或 API 框架還不支援：DPoP 需要授權伺服器簽發綁定的 token，也需要每一個 API 都驗 proof，只做一半就會被降級繞過
- 最大的風險其實是 XSS：先修 XSS 並設定 CSP，DPoP 對已被入侵的頁面幫助有限

成本面：每個請求多一次 ES256 簽章與驗章，和網路延遲相比可以忽略。真正的成本在維運：共享的防重放儲存、代理後面的網址、nonce 的支援、用戶端時鐘，以及讓每一個 API 都完成升級。

## 參考資料

- RFC 9449, "OAuth 2.0 Demonstrating Proof of Possession (DPoP)", September 2023
- RFC 7638, "JSON Web Key (JWK) Thumbprint"；RFC 7800, "Proof-of-Possession Key Semantics for JSON Web Tokens (JWTs)"
- RFC 8705, "OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens"
- RFC 9700, "Best Current Practice for OAuth 2.0 Security", January 2025
- RFC 10017, "OAuth 2.0 for Browser-Based Applications", August 2026：<https://www.rfc-editor.org/rfc/rfc10017>
- FAPI 2.0 Security Profile, February 2025：<https://openid.net/specs/fapi-security-profile-2_0-final.html>
- Spring Security Reference — DPoP-bound Access Tokens：<https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/dpop-tokens.html>
- Spring Security 原始碼（2026-11 的 main 與 6.5.0）：`OAuth2ResourceServerConfigurer`、`DPoPProofJwtDecoderFactory`、`DPoPProofReplayValidator`、`DPoPAuthenticationProvider`、`BearerTokenAuthenticationFilter`：<https://github.com/spring-projects/spring-security>
- Nimbus OAuth 2.0 SDK with OpenID Connect extensions — `DefaultDPoPProofFactory`：<https://bitbucket.org/connect2id/oauth-2.0-sdk-with-openid-connect-extensions>
