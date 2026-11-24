---
title: "Cloudflare Turnstile 實戰：Vue 3 + Spring Boot 雙端整合"
author: Bill.Lin
date: 2026-04-28
draft: false
description: "Cloudflare Turnstile 的 Vue 3 與 Spring Boot 整合：前端 widget 兩種寫法、後端 siteverify 驗證，以及防重放、安全重試、hostname 鎖定與錯誤碼速查。"
categories: ["Security"]
tags: ["Cloudflare", "Turnstile", "Vue", "Spring Boot", "CAPTCHA", "Bot Protection", "Security"]
---

## 為什麼選 Turnstile

| 方案 | 價格 | 使用者體驗 | 隱私 |
|---|---|---|---|
| Cloudflare Turnstile | 免費（無流量上限） | 多數情況完全無感 | 不依賴 Google，不發 tracking cookie |
| reCAPTCHA v3 | 免費（有配額） | 無感，但 score 閾值需自行調 | Google 蒐集使用者行為 |
| hCaptcha | 有免費層 | 可能出現拼圖互動 | 較注重隱私，非 Google |

Turnstile 使用 JavaScript challenge + machine learning 評估訪客，大多數真實使用者不需要任何互動即可通過。sitekey 不需要 Cloudflare 付費計畫。

---

## 運作原理與雙端流程

```
Vue SPA                Cloudflare CDN          Spring Boot 後端
  │                          │                        │
  │  1. 動態載入 api.js       │                        │
  │─────────────────────────▶│                        │
  │                          │                        │
  │  2. widget 完成挑戰，回傳 token                    │
  │◀─────────────────────────│                        │
  │                                                    │
  │  3. POST /api/contact（含 cf-turnstile-response）  │
  │───────────────────────────────────────────────────▶│
  │                                                    │
  │                   4. POST siteverify（帶 secret）  │
  │                          ◀─────────────────────── │
  │                          │                        │
  │                   5. {"success": true}            │
  │                          ──────────────────────── ▶│
  │                                                    │
  │  6. 200 OK                                         │
  │◀───────────────────────────────────────────────────│
```

三個核心事實：

- **token 由 Cloudflare 發行**，前端只能轉交後端；secret key 永遠不能離開後端
- **token TTL = 300 秒（5 分鐘）、一次性**：超時或重放都會回傳 `timeout-or-duplicate`
- **token 長度 ≤ 2048 字元**：後端 `@RequestParam` 要能接收這個長度（Spring Boot 預設無問題）

---

## 第一步：在 Cloudflare Dashboard 申請 site key

1. Dashboard → **Turnstile** → Add site
2. 填 Site name（自訂）
3. **Hostname**：填正式網域（`example.com`）；本機測試加 `localhost`
4. 選 **Widget Mode**：

| Mode | 外觀 | 何時出拼圖 |
|---|---|---|
| Managed（推薦） | 有 Cloudflare badge | 由 Cloudflare ML 決定，多數無感 |
| Non-interactive | 有 badge | 永遠不出拼圖，純 JS challenge |
| Invisible | 完全隱藏 | 無任何 UI，challenge 在背景執行 |

5. 取得：
   - **Site Key（sitekey）**：公開，放前端，可 commit
   - **Secret Key**：私密，放後端 env，絕對不能 commit

---

## 開發環境用 dummy keys

Cloudflare 提供官方 test keys，不需要真實帳號即可完整測試：

**Sitekeys（前端）**

```
1x00000000000000000000AA   visible     always pass
2x00000000000000000000AB   visible     always fail
1x00000000000000000000BB   invisible   always pass
2x00000000000000000000BB   invisible   always fail
3x00000000000000000000FF   visible     forces interactive challenge
```

**Secret keys（後端）**

```
1x0000000000000000000000000000000AA   always pass
2x0000000000000000000000000000000AA   always fail
3x0000000000000000000000000000000AA   token already spent (timeout-or-duplicate)
```

注意：dummy sitekey 產生的 token 格式為 `XXXX.DUMMY.TOKEN.XXXX`，只能配對 **dummy secret key** 驗證；正式 secret 會拒絕 dummy token。Sitekey 與 secret key 必須成對使用（都 dummy 或都正式）。

---

## Vue 3 前端整合：寫法 A — 純官方 script + Composition API

不依賴任何第三方 Vue 套件，直接使用 Cloudflare 的 JS API，框架無關、可遷移到任何前端框架。

```vue
<!-- TurnstileWidget.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  siteKey: { type: String, required: true },
})

const emit = defineEmits(['update:token'])

const widgetId = ref(null)
const errorMsg = ref('')

function loadScript() {
  return new Promise((resolve, reject) => {
    if (document.getElementById('cf-turnstile-script')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  await loadScript()
  window.turnstile.ready(() => {
    widgetId.value = window.turnstile.render('#cf-widget', {
      sitekey: props.siteKey,
      callback: (token) => {
        emit('update:token', token)
        errorMsg.value = ''
      },
      'expired-callback': () => {
        emit('update:token', '')
      },
      'error-callback': (code) => {
        errorMsg.value = `驗證失敗（${code}）`
        emit('update:token', '')
      },
      'timeout-callback': () => {
        errorMsg.value = '挑戰逾時，請重試'
        emit('update:token', '')
      },
    })
  })
})

onBeforeUnmount(() => {
  if (widgetId.value !== null) {
    window.turnstile.remove(widgetId.value)
  }
})

function reset() {
  if (widgetId.value !== null) {
    window.turnstile.reset(widgetId.value)
    emit('update:token', '')
  }
}

defineExpose({ reset })
</script>

<template>
  <div id="cf-widget"></div>
  <p v-if="errorMsg">{{ errorMsg }}</p>
</template>
```

環境變數（Vite）：

```bash
# .env.development
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# .env.production
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABxxxxxxxxxx
```

---

## Vue 3 前端整合：寫法 B — vue-turnstile 套件

```bash
pnpm add vue-turnstile
```

```vue
<script setup>
import { ref } from 'vue'
import VueTurnstile from 'vue-turnstile'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const token = ref('')
const tsRef = ref(null)

function reset() {
  tsRef.value?.reset()
  token.value = ''
}

defineExpose({ reset })
</script>

<template>
  <VueTurnstile
    ref="tsRef"
    :site-key="SITE_KEY"
    v-model="token"
    theme="auto"
    @error="(code) => console.warn('Turnstile error:', code)"
  />
</template>
```

**兩種前端寫法比較**

| 面向 | 寫法 A（純官方） | 寫法 B（vue-turnstile） |
|---|---|---|
| 行數 | ~45 行 | ~20 行 |
| 框架依賴 | 無，可遷移到 React/Svelte | 需 `vue-turnstile` 套件 |
| reset 方式 | `turnstile.reset(widgetId)` | `tsRef.value.reset()` |
| SSR / Nuxt | 需 `process.client` 判斷 | 需確認套件版本是否支援 |
| 升級風險 | 直接跟官方 API 走 | 套件可能落後官方更新 |

---

## Spring Boot 後端驗證：寫法 A — 手寫 RestClient + DTO

**技術棧**：Spring Boot 4.x、Java 21（RestClient 為 Spring 6.1+ 引入，Spring Boot 4 延續此 API）

> **Spring Boot 4 vs 3 差異（本文相關）**
>
> - Spring Framework 7.0、Spring Security 7.0、Jakarta EE Servlet 6.1
> - **Jackson 3.0 成為標準**：`@JsonProperty` 的 import 路徑從 `com.fasterxml.jackson.annotation.JsonProperty`（Jackson 2，現已 deprecated）改為 `tools.jackson.annotation.JsonProperty`；Spring Boot 4 新專案請用 Jackson 3 import
> - `RestClient`、`@ConfigurationProperties` record、`LinkedMultiValueMap` API 無 breaking change
> - Spring Boot 3.x 的程式碼只需調整 Jackson import，其他可直接沿用

```yaml
# application.yml
app:
  turnstile:
    secret: ${TURNSTILE_SECRET}
    verify-url: https://challenges.cloudflare.com/turnstile/v0/siteverify
```

```java
// TurnstileProperties.java
@ConfigurationProperties("app.turnstile")
public record TurnstileProperties(String secret, String verifyUrl) {}
```

```java
// SiteverifyResponse.java
// Spring Boot 4（Jackson 3）：import tools.jackson.annotation.JsonProperty;
// Spring Boot 3（Jackson 2，deprecated in SB4）：import com.fasterxml.jackson.annotation.JsonProperty;
public record SiteverifyResponse(
    boolean success,
    @JsonProperty("error-codes") List<String> errorCodes,
    String hostname,
    @JsonProperty("challenge_ts") String challengeTs,
    String action) {}
```

```java
// VerifyResult.java
public record VerifyResult(boolean ok, List<String> errorCodes) {

    public static VerifyResult success() {
        return new VerifyResult(true, List.of());
    }

    public static VerifyResult failure(List<String> codes) {
        return new VerifyResult(false, codes != null ? codes : List.of("internal-error"));
    }
}
```

```java
// TurnstileService.java
@Service
public class TurnstileService {

    private final RestClient restClient;
    private final TurnstileProperties props;

    public TurnstileService(RestClient.Builder builder, TurnstileProperties props) {
        this.restClient = builder.build();
        this.props = props;
    }

    public VerifyResult verify(String token, String remoteIp) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("secret", props.secret());
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.add("remoteip", remoteIp);
        }

        SiteverifyResponse resp = restClient.post()
            .uri(props.verifyUrl())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(SiteverifyResponse.class);

        return (resp != null && resp.success())
            ? VerifyResult.success()
            : VerifyResult.failure(resp != null ? resp.errorCodes() : null);
    }

    public VerifyResult verifyWithIdempotencyKey(String token, String remoteIp, String idempotencyKey) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("secret", props.secret());
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) form.add("remoteip", remoteIp);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) form.add("idempotency_key", idempotencyKey);

        SiteverifyResponse resp = restClient.post()
            .uri(props.verifyUrl())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(SiteverifyResponse.class);

        return (resp != null && resp.success())
            ? VerifyResult.success()
            : VerifyResult.failure(resp != null ? resp.errorCodes() : null);
    }
}
```

啟動類別或任一 `@Configuration` 上加 `@EnableConfigurationProperties`：

```java
@SpringBootApplication
@EnableConfigurationProperties(TurnstileProperties.class)
public class App {
    public static void main(String[] args) { SpringApplication.run(App.class, args); }
}
```

---

## Spring Boot 後端驗證：寫法 B — springcfturnstile 套件

GitHub：`https://github.com/devondragon/springcfturnstile`（請至 Releases 確認最新版號）

```kotlin
// build.gradle.kts
implementation("com.digitalsanctuary:spring-cf-turnstile-starter:最新版")
```

```yaml
# application.yml
ds:
  cf:
    turnstile:
      sitekey: ${TURNSTILE_SITE_KEY}
      secret: ${TURNSTILE_SECRET}
      # connect-timeout: 5   # 預設 5 秒
      # read-timeout: 10      # 預設 10 秒
```

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ContactController {

    private final TurnstileValidationService turnstileService;

    @PostMapping("/contact")
    public ResponseEntity<?> contact(
            @RequestParam String name,
            @RequestParam String message,
            @RequestParam("cf-turnstile-response") String cfToken,
            HttpServletRequest request) {

        String clientIp = turnstileService.getClientIpAddress(request);
        boolean valid = turnstileService.validateTurnstileResponse(cfToken, clientIp);

        if (!valid) {
            log.warn("Turnstile failed for ip={}", clientIp);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "CAPTCHA verification failed"));
        }

        // 業務邏輯...
        return ResponseEntity.ok(Map.of("status", "received"));
    }
}
```

套件也提供 `validateTurnstileResponseDetailed(token, ip)` 回傳 `ValidationResult`，含 `ValidationResultType` enum（SUCCESS / INVALID_TOKEN / NETWORK_ERROR / CONFIGURATION_ERROR / INPUT_ERROR），適合需要細分錯誤的場景。

**兩種後端寫法比較**

| 面向 | 寫法 A（手寫） | 寫法 B（套件） |
|---|---|---|
| 額外依賴 | 無 | 1 個 starter |
| 可自訂（retry、circuit breaker） | 是 | 受限於套件實作 |
| 內建 Metrics / Health check | 需自行加 | 有（可選啟用） |
| Spring Security filter 整合 | 無 | 提供 `/login` filter 選項 |
| 學習透明度 | 高 | 中 |

---

## 完整串接：聯絡表單 POST /api/contact

### Vue 側

```vue
<!-- ContactPage.vue — 使用寫法 A 的 TurnstileWidget -->
<script setup>
import { ref } from 'vue'
import TurnstileWidget from './TurnstileWidget.vue'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

const tsRef = ref(null)
const name = ref('')
const message = ref('')
const token = ref('')
const status = ref('')

async function submit() {
  if (!token.value) {
    status.value = '請先完成人機驗證'
    return
  }

  const body = new URLSearchParams({
    name: name.value,
    message: message.value,
    'cf-turnstile-response': token.value,
  })

  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (res.ok) {
    status.value = '送出成功'
    name.value = ''
    message.value = ''
  } else {
    status.value = '送出失敗，請重試'
    tsRef.value?.reset()   // token 已失效，強制重新驗證
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="name" placeholder="姓名" required />
    <textarea v-model="message" placeholder="訊息" required />
    <TurnstileWidget ref="tsRef" :site-key="SITE_KEY" @update:token="(t) => token = t" />
    <button type="submit" :disabled="!token">送出</button>
  </form>
  <p>{{ status }}</p>
</template>
```

### Spring Boot 側（手寫 TurnstileService）

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ContactController {

    private final TurnstileService turnstileService;

    @PostMapping(path = "/contact", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<?> contact(
            @RequestParam String name,
            @RequestParam String message,
            @RequestParam("cf-turnstile-response") String cfToken,
            HttpServletRequest request) {

        String clientIp = extractClientIp(request);
        VerifyResult result = turnstileService.verify(cfToken, clientIp);

        if (!result.ok()) {
            log.warn("Turnstile failed: codes={} ip={}", result.errorCodes(), clientIp);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "CAPTCHA verification failed"));
        }

        log.info("Contact form submitted: name={}", name);
        // 業務邏輯：寄信、存 DB...
        return ResponseEntity.ok(Map.of("status", "received"));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();   // 取第一個（最原始的客戶端 IP）
        }
        return request.getRemoteAddr();
    }
}
```

CORS（前後端分離時）：

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://your-domain.com"));
        config.setAllowedMethods(List.of("POST", "OPTIONS"));
        // allowCredentials 若設 true，allowedOrigins 就不能用 "*"
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## 進階安全：idempotency_key、action、hostname、IP 綁定

### idempotency_key — 安全重試

token 是一次性的，若後端因網路抖動打 siteverify 失敗後想重試，**重試必須帶同一個 UUID 作為 idempotency_key**，Cloudflare 不會將它判定為重放：

```javascript
// 前端每次 submit 生成一個 UUID，含在請求 body 中傳給後端
const idempotencyKey = crypto.randomUUID()
body.append('idempotency_key', idempotencyKey)
```

後端收到 `idempotency_key` 後帶入 `verifyWithIdempotencyKey()`，Cloudflare 對同一 idempotency_key 回傳相同結果（快取 5 分鐘）。

### action — 防跨表單 replay

前端 widget 加 `data-action`：

```javascript
window.turnstile.render('#cf-widget', {
  sitekey: SITE_KEY,
  action: 'contact-form',   // 對應表單用途
  // ...
})
```

後端驗 token 成功後比對 `action` 欄位：

```java
if (!"contact-form".equals(resp.action())) {
    log.warn("Turnstile action mismatch: {}", resp.action());
    return VerifyResult.failure(List.of("action-mismatch"));
}
```

防止攻擊者把登入頁或其他表單產生的 token 拿來打聯絡表單 API（cross-form replay）。

### hostname 鎖

Dashboard 設定的 hostname 是第一道鎖，後端 double-check 是第二道：

```java
if (!"your-domain.com".equals(resp.hostname())) {
    log.warn("Turnstile hostname mismatch: {}", resp.hostname());
    return VerifyResult.failure(List.of("invalid-hostname"));
}
```

防止 sitekey 被其他網站偷用後拿到有效 token。

### IP 綁定（remoteip）

把 client IP 一起送給 siteverify，Cloudflare 在評分時納入 IP 信譽，提高機器人辨識率：

```java
form.add("remoteip", extractClientIp(request));
```

注意：`X-Forwarded-For` 可以被用戶端偽造，只在信任上游 proxy（Cloudflare / Nginx）時才可靠；不確定就直接用 `request.getRemoteAddr()`。

### 5 分鐘 TTL — 前端提早 reset

```javascript
const RESET_BEFORE_EXPIRE_MS = 280_000  // 提早 20 秒重置

let resetTimer = null

callback: (token) => {
  emit('update:token', token)
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    window.turnstile.reset(widgetId.value)
    emit('update:token', '')
  }, RESET_BEFORE_EXPIRE_MS)
},
'expired-callback': () => {
  clearTimeout(resetTimer)
  emit('update:token', '')
},
```

---

## 所有 error-codes 速查表

| error-code | 觸發原因 | 處理建議 |
|---|---|---|
| `missing-input-secret` | 後端沒帶 `secret` 欄位 | 檢查 env 注入、`@ConfigurationProperties` 是否啟用 |
| `invalid-input-secret` | `secret` 值錯誤 | 比對 dashboard 對應 widget 的 secret key |
| `missing-input-response` | 後端沒帶 `response`（token）欄位 | 前端 form 的 `cf-turnstile-response` binding 有誤 |
| `invalid-input-response` | token 格式錯、已篡改，或正式 secret 配 dummy token | 通常是攻擊；log 並回 403 |
| `bad-request` | 請求格式不對（如 JSON body 而非 form-encoded） | 確認 `Content-Type: application/x-www-form-urlencoded` |
| `timeout-or-duplicate` | token 超過 300 秒，或已被驗證過一次 | 前端 `resetWidget()`；使用 `idempotency_key` 避免網路重試誤判 |
| `internal-error` | Cloudflare 自身問題 | 重試（exponential backoff）；不要直接 block 使用者 |

---

## 陷阱與監控

### 陷阱一：SPA 路由切換 widget 殘留

Vue Router 切換路由後，若元件沒有正確 unmount，下次回來 `turnstile.render` 會找到 DOM 上殘留的舊 widget，導致 `widgetId` 錯亂、token callback 不觸發。

**必須**在 `onBeforeUnmount` 呼叫 `window.turnstile.remove(widgetId.value)` 清除 widget。

### 陷阱二：Submit 失敗後 token 重用

後端 500 或業務邏輯失敗後，前端沒有 reset 就重送請求，第二次送出的是已被 siteverify 消耗過的舊 token，後端會收到 `timeout-or-duplicate`。

**解法**：每次 submit 失敗後呼叫 `tsRef.value.reset()`，強制使用者重新完成挑戰。

### 陷阱三：dummy keys 成對問題

`VITE_TURNSTILE_SITE_KEY` 用 dummy sitekey（`1x00000000000000000000AA`），但 `TURNSTILE_SECRET` 誤設為正式 secret key，siteverify 會回 `invalid-input-response`。

**解法**：`.env.development` 同時設 dummy sitekey 和 dummy secret，`.env.production` 同時設正式兩者。

### 陷阱四：Hot reload 重複 append script

Vite HMR 重新 mount 元件時，`loadScript()` 若沒有偵測既有 `<script>` 是否存在，會重複 append 同一個 URL，導致 `turnstile` 全域物件重新初始化。

**解法**：`document.getElementById('cf-turnstile-script')` 存在則直接 `resolve()`（寫法 A 已處理）。

### 監控

```java
// 注入 MeterRegistry，每次 verify 後記錄結果
private final MeterRegistry meterRegistry;

VerifyResult result = turnstileService.verify(token, ip);

meterRegistry.counter("turnstile.verify",
    "result", result.ok() ? "success" : "fail",
    "error_code", result.ok() ? "none"
        : (result.errorCodes().isEmpty() ? "unknown" : result.errorCodes().get(0))
).increment();
```

建議：`result=fail` 比例連續 5 分鐘超過 10% 觸發告警，通常代表 secret 設定錯誤或前端 token 傳不到後端。

---

## 小結

- **後端 siteverify 才是安全防線**，前端 widget 完成只代表拿到 token；token 合不合法由後端呼叫 Cloudflare 決定
- **secret 永遠 env**，透過 `${TURNSTILE_SECRET}` 注入，不得 hardcode，不得出現在任何 git commit 中
- **5 分鐘 + 一次性**：前端需處理 `expired-callback`，submit 失敗後必須 `reset()`
- **進階四件套**：`idempotency_key`（安全重試）、`action`（防跨表單 replay）、`hostname`（防 sitekey 盜用）、`remoteip`（提高 bot 辨識率）
- **dev 用 dummy keys**：`1x00000000000000000000AA`（sitekey）+ `1x0000000000000000000000000000000AA`（secret），CI 測試不需要真實 Cloudflare 帳號

---

## 參考資料

- Cloudflare Turnstile 官方文件：https://developers.cloudflare.com/turnstile/
- Testing dummy keys：https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- Client-side rendering（explicit mode）：https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- Siteverify API：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- springcfturnstile GitHub：https://github.com/devondragon/springcfturnstile
- vue-turnstile npm：https://www.npmjs.com/package/vue-turnstile
