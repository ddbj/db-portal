# Authentication

DDBJ Account (Keycloak) との連携を、**BFF (Backend for Frontend) + HttpOnly cookie** pattern で実装する。JS は token に **一切触れない**。責務分離図は `architecture.md`。

## 方針

OAuth 2.0 for Browser-Based Apps の BFF pattern に準拠する。役割分担:

| 項目 | 実装 |
|---|---|
| Token 保管場所 | サーバ in-memory session store (browser からは不可視) |
| Browser ↔ Server の identity 受け渡し | HttpOnly cookie (`sid`)、token そのものは Cookie に載せない |
| User info の供給 | `GET /api/me` (token をデコードしない) |

XSS で token が漏れない (JS から到達できない) こと、Safari ITP の影響を受けないこと (3rd-party cookie に依存しない) を担保する。BFF 層は News mirror / LLM proxy でも使うので、認証用 session 機能の追加コストも小さい。

## データフロー全体図

```
[Browser]  HttpOnly cookie (sid, SameSite=Lax, Secure, Path=/)
   │
   ▼
[BFF (server/auth/)]  in-memory session store
   │  Map<sid, { tokens, userInfo, expiresAt }>
   │  TTL 30 min sliding, cleanup 5 min
   │
   └─ OIDC code 交換 / logout
   ▼
[Keycloak (DDBJ Account)]
```

## 機能範囲

- OIDC Authorization Code Flow + PKCE (BFF が code → token 交換)
- In-memory session store (TTL 付き)
- HttpOnly cookie (`sid`、SameSite=Lax、Secure、Path=/)
- ログイン / ログアウト UI (BFF endpoint への遷移)
- Header にユーザー名表示 (`GET /api/me`)
- `useAuth` hook + `<RequireAuth>` wrapper を構造として提供

portal は read-only で mutation API を持たないため、CSRF 防御は cookie の `SameSite=Lax` のみで足りる。

## Cookie 仕様

| 属性 | 値 | 理由 |
|---|---|---|
| Name | `sid` | 短く、用途を明示 |
| Value | 不透明な乱数 (`crypto.randomUUID`) | session ID をクライアントに渡すだけで、token は含まない |
| HttpOnly | true | JS から読めない |
| Secure | true (production), false 可 (dev http) | https 強制 |
| SameSite | Lax | top-level navigation で送信、cross-site embed では送らない |
| Path | `/` | サブパスでも有効 |
| Max-Age | session 限り (Cookie 自体は session cookie) | サーバ側 TTL が真の expiry |

## Session store

### 保持するもの

| 項目 | 内容 |
|---|---|
| `tokens.idToken` | logout 時の `id_token_hint` 用 |
| `userInfo.sub` / `userInfo.name` / `userInfo.email` | id_token から抽出した user 情報 |
| `expiresAt` | session 自体の TTL (sliding) |

### TTL / cleanup

| 項目 | 値 | 説明 |
|---|---|---|
| Session TTL | 30 分 (sliding) | アクセスのたびに延長 |
| Cleanup interval | 5 分 | 期限切れ entry を一括破棄 |

### Log redaction

`server/lib/log.ts` の log helper で次のフィールドを `[REDACTED]` に置換する:

- `accessToken` / `refreshToken` / `idToken`
- `cookie` / `Cookie` (HTTP header)
- `authorization` / `Authorization` (HTTP header)

session entry 全体を log に出すケースは作らない。debug 用に log するなら `sub` と `name` だけに絞る。

## OIDC Authorization Code Flow + PKCE

### BFF endpoint 一覧

| Method | Path | 役割 |
|---|---|---|
| GET | `/api/auth/login` | Keycloak の authorize URL にリダイレクト (PKCE code_challenge を生成) |
| GET | `/api/auth/callback` | Keycloak からの redirect 受信、code → token 交換、`sid` 発行、`returnTo` へリダイレクト |
| GET | `/api/auth/logout` | session entry の id_token を取り Keycloak の `end_session_endpoint` にリダイレクト |
| GET | `/api/auth/logout-callback` | Keycloak からの redirect 受信、session 削除、cookie clear、`returnTo` へリダイレクト |
| GET | `/api/me` | 現在の session の userInfo を返す。session なしなら 401 |

各 path が Express handler か RR route fallback かの境界:

| path | 種別 |
|---|---|
| `/api/auth/login` | Express handler |
| `/api/auth/callback` | Express handler |
| `/api/auth/logout` | Express handler |
| `/api/auth/logout-callback` | Express handler |
| `/auth/callback`、`/auth/silent-callback`、`/auth/logout-callback` | RR route (薄い page、BFF を素通りした場合の fallback) |

Keycloak client の `Valid Redirect URIs` は `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/callback` および `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` のみを許可する。`*` ワイルドカードは production で禁止 (本書「Redirect URI の運用」 節)。

Express handler で完結させる利点:

- callback 処理 (state 検証 / code 交換 / cookie 発行) は server 専用、zones 上 `app → server` 直接 import を避けるため Express で処理してから redirect する
- RR route 側 (loader / component) を OIDC 詳細から完全に切り離す
- Keycloak から見ると redirect_uri が固定、RR の routing 変更に影響を受けない

### Login

1. Browser が `/api/auth/login?return_to=/databases/bioproject` を踏む
2. BFF が PKCE `code_verifier` を生成し、`state` / `code_verifier` / `returnTo` を 10 分 TTL の pending store に積む
3. BFF が Keycloak の `authorization_endpoint` へ 302 (`code_challenge_method=S256`)

### Callback

1. Browser が `/api/auth/callback?code=...&state=...` を踏む
2. BFF が `state` から `code_verifier` と `returnTo` を **1 回限り take** (replay 防止)
3. Keycloak の `token_endpoint` に `code` + `code_verifier` を POST し `id_token` を取得
4. `id_token` の payload を検証 (下表)、user info を抽出
5. `sid` を発行し session store に格納、`Set-Cookie: sid=...` を返す
6. `returnTo` (もしくは `/`) へ 302

#### id_token の検証

`id_token` は **token endpoint から direct (BFF ↔ Keycloak、TLS 直接通信)** で受け取る。OIDC Core-6 のとおり direct from token endpoint で受信した場合の signature 検証は TLS server validation で代替可能。BFF は signature を再検証しない代わりに、payload 側で次を必ず検証する:

| 項目 | 検証 | 失敗時 |
|---|---|---|
| `iss` | `DB_PORTAL_KEYCLOAK_REALM_URL` と完全一致 | 400 `invalid_id_token` |
| `aud` | `DB_PORTAL_KEYCLOAK_CLIENT_ID` を含む (string or string[]) | 同上 |
| `exp` | 現在時刻より未来 (clock skew は 0 秒) | 同上 |
| `iat` | 存在し、将来時刻でない (clock skew 60 秒以内) | 同上 |

payload schema は `iss` / `aud` / `exp` / `iat` を含めて parse する。署名再検証を TLS server validation に委ねる代わりに、token の意味的な claim (発行者 / 宛先 / 有効期限) を payload 側で必ず検証することで、direct 受信の前提が崩れた token を弾く。

callback handler の error 応答は、`code` / `state` 欠落で 400 `invalid_request`、`state` が pending store に無いとき 400 `invalid_state` (下記「State CSRF と returnTo の二重防御」)、id_token payload 検証失敗で 400 `invalid_id_token`、token endpoint への code 交換失敗で 502 `code_exchange_failed`。

### Logout

1. Browser が `/api/auth/logout` を踏む
2. BFF が Keycloak の `end_session_endpoint` へ 302 (`post_logout_redirect_uri=/api/auth/logout-callback`、`id_token_hint=...` で confirm 画面を skip、`client_id` も同送 for Keycloak ≥ 18)
3. Keycloak が session を切り、`/api/auth/logout-callback` に戻す
4. BFF が `sid` から session を削除し `Set-Cookie: sid=; Max-Age=0` を返す
5. ホームへ 302

### Pending login store

login flow 中の `state` / `code_verifier` / `returnTo` を server 側 in-memory に持つ。

- TTL 10 分、1 分間隔で cleanup
- `take(state)` は **1 回限り消費** (replay 防止)
- in-memory 単一プロセス前提 (session store と同じ抽象境界)

### State CSRF と returnTo の二重防御

**State CSRF**: OIDC `state` parameter は authorization request と callback の対応を結ぶ CSRF token として機能する:

1. login 時に乱数から `state` を生成し pending store に積む
2. Keycloak が callback で `state` を echo back
3. server は受け取った `state` を pending store から `take` する (1 回限り、TTL 10 分)
4. take 失敗 (存在しない / 期限切れ / 二度取り) は 400 `invalid_state`

これにより攻撃者が用意した callback URL を被害者に踏ませても拒否され、同じ code を 2 回交換できない。

**returnTo**: login / logout の `return_to` query は内部 navigation 用。ユーザーが任意の URL を入れられるので、二重に検証する:

| 層 | 検証内容 |
|---|---|
| `app/lib/auth/login-url.ts` (client / loader 両用 helper) | `/` 始まり + `//` / `/\` 不可、違反は `/` に正規化 |
| `server/auth/` handler | client helper と同一の検証 (`/` 始まり + `//` / `/\` 不可) を `normalizeReturnTo` で独立に再適用、違反は `/` に正規化 |

server 側の再検証は「クライアント側 helper を経由しない直叩き」 (例: 攻撃者が手書きで `/api/auth/login?return_to=//evil` を組む) を遮断するために必須。

### Client route page (`routes/auth/*.tsx`)

`app/routes/auth/{callback,silent-callback,logout-callback}.tsx` は薄い fallback page として置く。通常フローでは BFF が 302 で抜けるため画面は表示されない。表示されるのは次のいずれか:

- BFF を素通りして `/auth/callback` を直叩きした (BFF 302 を経由しない経路)
- BFF handler が 5xx で returnTo 302 まで到達せず、RR が `/auth/callback` 自体を render した

これらの fallback page は単に「サインイン処理中」 / 「サインアウトしました」 を表示し、ホームへの link を置く。loader は持たない (`app → server` zones を尊重)。

silent-callback は iframe silent renew を採用しないため空 page だが、`/auth/silent-callback` への直叩きが error にならないよう route ごと placeholder として置く。

## `/api/me` 仕様

### Request

```
GET /api/me HTTP/1.1
Cookie: sid=<opaque>
```

### Response

| 状況 | Status | Body |
|---|---|---|
| Session あり (有効) | 200 | `{ "user": { "sub": "...", "name": "...", "email": "..." } }` |
| Cookie なし / Session 期限切れ | 401 | `{ "error": "unauthorized" }` |

### Cache 制御

`Cache-Control: no-store` を付ける。Loader / Client query の cache は TanStack Query 側で `staleTime: 5 分` 程度を持たせる。

## `useAuth` hook の挙動

`/api/me` を TanStack Query で取得し、3 値の state を返す:

| `/api/me` | useAuth の status | 補足 |
|---|---|---|
| pending | `"loading"` | 初回 fetch 中 |
| 401 | `"unauthenticated"` | session 無し / 期限切れ |
| 200 | `"authenticated"` | `user: UserInfo` を含む |

### SSR 経由の userInfo

route loader からも user 情報を取れるよう、`loadAuth(request)` helper を `app/lib/auth/ssr-loader.ts` に置く。loader 内で受け取った `Request` の `Cookie` ヘッダを BFF `/api/me` に転送し、200 なら `UserInfo`、401 なら `null`、5xx は throw する。

`loadAuth` は `app` zone から `fetch(new URL("/api/me", <portal origin>))` で BFF を叩く形を取り、`app → server` 直接 import を避ける (`architecture.md`)。SSR 初期描画時に Header のユーザー名表示が即座に解決する。

#### BFF 宛先 origin の固定

BFF の宛先 origin は `request.url` ではなく env `VITE_DB_PORTAL_PORTAL_ORIGIN` から取る (`portalOrigin()`、未設定なら throw)。これにより `Host:` ヘッダ改竄で `/api/me` 転送先 (= `sid` cookie の送出先) が外部 origin に逸れることを防ぐ。なお client IP に依存する機能 (LLM rate limit、`llm.md`) のため、リバースプロキシ越しの deploy では Express の `trust proxy` (`loopback` 設定済) と `X-Forwarded-For` の信頼ホスト制限を BFF (`server/`) で正しく行う。

## `<RequireAuth>` wrapper と URL helper

`<RequireAuth>` は children を `useAuth` の状態で出し分け、`unauthenticated` なら `buildLoginUrl(location.pathname + location.search)` に navigate する。

URL の組み立ては `app/lib/auth/login-url.ts` の `buildLoginUrl` / `buildLogoutUrl` に集約し、Header の Login / Logout link からも同じ helper を使う。`returnTo` は **同一 origin の絶対パス (`/` 始まり、`//` でない、`/\\` でない)** のみ受理し、それ以外は `/` に正規化する。

## 言語の維持 (i18n との連携)

Login / Logout のリダイレクトで `returnTo` を保持する際、現在 URL がそのまま使われるため言語選択は cookie で維持される (`i18n.md`)。`/api/auth/login` / `/api/auth/logout` は言語非依存の path に置く。

## 環境変数

| 変数 | 用途 |
|---|---|
| `DB_PORTAL_KEYCLOAK_REALM_URL` | Keycloak realm URL (env ごとに staging realm / production realm を指す) |
| `DB_PORTAL_KEYCLOAK_CLIENT_ID` | クライアント ID (env ごとに dev / staging / production の client を指す) |
| `DB_PORTAL_PORTAL_ORIGIN` | redirect_uri 計算に使う portal origin |
| `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` | session store の sliding TTL (秒)。Keycloak `Client Session Idle` と揃える |

クライアントシークレットは PKCE で不要 (`public` client 設定)。Keycloak client は `access type: public`、PKCE 強制で運用する。

詳細な env 全体方針は `development.md` を参照。

## Keycloak 管理画面側の設定

Keycloak 管理コンソール側の client 設定の規約。具体的な realm URL / client ID / redirect URI / Web Origins / Token 寿命の数値は env / Keycloak 側の設定が SSOT。

### realm / client の構成

dev / staging は同じ realm を共有し、client を env 別に分ける (テストユーザーを切り分けるため)。production は別 realm。client は env ごとに `DB_PORTAL_KEYCLOAK_CLIENT_ID` で識別され、いずれも `access type: public` + PKCE 強制。

### Client 設定値

| 項目 | 値 | 説明 |
|---|---|---|
| Client Protocol | `openid-connect` | OIDC |
| Access Type | `public` | client secret を保持しない (PKCE で代替) |
| Standard Flow Enabled | ON | Authorization Code Flow |
| Implicit Flow Enabled | OFF | non-recommended |
| Direct Access Grants Enabled | OFF | password grant 不使用 |
| Service Accounts Enabled | OFF | 不要 |
| Authorization Enabled | OFF | 不要 |
| PKCE Code Challenge Method | `S256` | SHA-256 強制 |
| Valid Redirect URIs | `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/callback`<br>`<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` | ワイルドカード `*` 禁止、env ごとに完全一致登録 |
| Valid Post Logout Redirect URIs | `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` | logout 後の戻り先 |
| Web Origins | `<DB_PORTAL_PORTAL_ORIGIN>` | CORS 用 (BFF 経由のみなので限定) |
| Front Channel Logout | OFF | BFF が `end_session_endpoint` を直叩きする |
| Backchannel Logout URL | (空) | 不要 |

各 env の実 origin / realm URL / client ID は git 管理外運用メモを参照する。

### 設定値の補足

- **PKCE 強制**: Access Type `public` + Standard Flow + Code Challenge Method `S256` を組み合わせ、PKCE なしの code 交換を Keycloak 側で拒否する (portal BFF は常に `code_verifier` を送出するので、設定ミスや別 client による悪用に対する防護層)
- **Redirect URI の運用**: ワイルドカード `*` は禁止。各環境は実 origin (`<DB_PORTAL_PORTAL_ORIGIN>`) を完全一致で登録する。production client の redirect URI に staging origin を含めない (逆も同様、production の `code` が staging に流れて悪用されることを防ぐ)
- **Web Origins / CORS**: BFF が Keycloak を直接叩くため、browser → Keycloak の直接 CORS 通信は発生しない。Web Origins には portal 自身の origin のみ登録する。silent renew (iframe) は採用していないので 3rd-party cookie の懸念もない

### Token 寿命

portal は `id_token` のみを保持する (logout 時の `id_token_hint` に使用)。Keycloak の Access Token / Refresh Token Lifespan は portal の動作に影響しないため、Keycloak realm 全体のポリシーに従う。portal session の実効 TTL は `DB_PORTAL_AUTH_SESSION_TTL_SECONDS` で独立に管理する。

### Scope 設定

portal が要求する scope:

| Scope | 用途 |
|---|---|
| `openid` | OIDC 必須 |
| `profile` | `name` |
| `email` | `email` |

`offline_access` は要求しない。Keycloak realm の "Client Scopes" で 3 scope を client の "Default Client Scopes" に紐づける。

### e2e テスト用ユーザー

staging realm に portal e2e 用テストユーザーを 1 件作成し、`DB_PORTAL_E2E_USER_PASSWORD` env として password をリリースマネージャの作業環境で保持する。`npm run test:e2e` を回すときに渡す。production realm にはテストユーザーを作らない。

### 設定変更時のチェックリスト

Keycloak 設定を変更したら以下を確認:

- [ ] portal `/api/auth/login` → Keycloak authorize URL に 302 する
- [ ] Keycloak で正しい credential を入力すると `/api/auth/callback` に戻ってくる
- [ ] Set-Cookie: sid が `HttpOnly; Secure; SameSite=Lax; Path=/` で発行される (production)
- [ ] `/api/me` が 200 + userInfo を返す
- [ ] `/api/auth/logout` → Keycloak `end_session_endpoint` に 302 する
- [ ] logout 後の `/api/me` が 401 になる
- [ ] redirect URI に portal 以外の origin が登録されていない
- [ ] PKCE 強制 `S256` が ON になっている
- [ ] Access Type が `public` のまま

## テスト

### Unit

- `/api/me` 200 / 401 に対する `useAuth` の状態遷移
- `<RequireAuth>` unauthenticated 時の Login URL redirect
- Session store の TTL sliding / cleanup

### PBT

- 任意の `(sid, entry)` 列に対し、TTL 内のアクセスで entry が返り (sliding 延長)、TTL 超過で `undefined`、削除後の `get` が `undefined` になる
