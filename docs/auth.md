# Authentication

DDBJ Account (Keycloak) との連携を、**BFF (Backend for Frontend) + HttpOnly cookie** pattern で実装する。JS は access token / refresh token に **一切触れない**。

責務分離図は `architecture.md`、採用理由は `decisions.md` の「token storage は BFF + HttpOnly cookie」 を参照。

## 方針

OAuth 2.0 for Browser-Based Apps の BFF pattern を採用する。

| 項目 | 採用 | 採用しない |
|---|---|---|
| Token 保管場所 | サーバ in-memory session store | localStorage / sessionStorage / JS から読める Cookie |
| Browser ↔ Server の identity 受け渡し | HttpOnly cookie (`sid`) | JWT 本体を Cookie に入れる |
| Token refresh | BFF が背面で実行 | 旧来の silent renew (iframe) |
| User info の供給 | `GET /api/me` | client が token をデコード |

## データフロー全体図

```
[Browser]  HttpOnly cookie (sid, SameSite=Lax, Secure, Path=/)
   │
   ▼
[BFF (server/auth/)]  in-memory session store
   │  Map<sid, { tokens, userInfo, expiresAt }>
   │  TTL 30 min sliding, cleanup 5 min
   │
   ├─ OIDC code 交換 / refresh / logout
   └─ proxy 時に Authorization: Bearer <accessToken> を背面で付与
   ▼
[Keycloak (DDBJ Account)]
   https://idp[-staging].ddbj.nig.ac.jp/realms/master
```

## リリース時の機能範囲

リリース時点では **ログインボタンのみ**。ログイン後の限定機能は持たせない。ただし token の取扱い方式は後から差し替えるコストが大きいので最初から正しい形で固める。

### 持つもの

- OIDC Authorization Code Flow + PKCE (BFF が code → token 交換)
- In-memory session store (TTL 付き)
- HttpOnly cookie (`sid`、SameSite=Lax、Secure、Path=/)
- ログイン / ログアウト UI (BFF endpoint への遷移)
- Header にユーザー名表示 (`GET /api/me`)
- Token refresh は BFF が背面で実行
- `useAuth` hook + `<RequireAuth>` wrapper (将来「ログイン後限定機能」を増やしやすい構造)

### 持たないもの

- 登録ドラフトの永続化
- Private accession 検索
- お気に入り検索クエリ保存
- Mutation 系 API (mutation がない期間は CSRF 攻撃面が薄い、mutation を追加するときに CSRF token / Origin check を導入する)

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
| `tokens.accessToken` / `tokens.refreshToken` | Keycloak から発行されたトークン |
| `tokens.expiresAt` | access token の expiry (unix ms) |
| `userInfo.sub` / `userInfo.name` / `userInfo.email` | id_token から抽出した user 情報 |
| `expiresAt` | session 自体の TTL (sliding) |

### TTL / cleanup

| 項目 | 値 | 説明 |
|---|---|---|
| Session TTL | 30 分 (sliding) | アクセスのたびに延長 |
| Cleanup interval | 5 分 | 期限切れ entry を一括破棄 |

### Log redaction

`server/lib/log.ts` の log helper で次のフィールドを `[REDACTED]` に置換する:

- `accessToken` / `refreshToken`
- `cookie` / `Cookie` (HTTP header)
- `authorization` / `Authorization` (HTTP header)

session entry 全体を log に出すケースは作らない。debug 用に log するなら `sub` と `name` だけに絞る。

### Multi-instance への拡張

本リリースは 1 instance 想定で in-memory のみ。将来複数 instance に展開する場合は `DB_PORTAL_SESSION_STORE=memory|redis` env で切替可能にする (interface 抽象は最初から作る、redis 実装は別途)。

## OIDC Authorization Code Flow + PKCE

### BFF endpoint 一覧

| Method | Path | 役割 |
|---|---|---|
| GET | `/api/auth/login` | Keycloak の authorize URL にリダイレクト (PKCE code_challenge を生成) |
| GET | `/api/auth/callback` | Keycloak からの redirect 受信、code → token 交換、`sid` 発行、ホームへリダイレクト |
| GET | `/api/auth/logout` | Keycloak の `end_session_endpoint` にリダイレクト |
| GET | `/api/auth/logout-callback` | Keycloak からの redirect 受信、session 削除、cookie clear |
| GET | `/api/me` | 現在の session の userInfo を返す。session なしなら 401 |

### Login

1. Browser が `/api/auth/login?return_to=/databases/bioproject` を踏む
2. BFF が PKCE `code_verifier` を生成し、`state` / `code_verifier` / `returnTo` を 10 分 TTL の pending store に積む
3. BFF が Keycloak の `authorization_endpoint` へ 302 (`code_challenge_method=S256`)

### Callback

1. Browser が `/api/auth/callback?code=...&state=...` を踏む
2. BFF が `state` から `code_verifier` と `returnTo` を **1 回限り take** (replay 防止)
3. Keycloak の `token_endpoint` に `code` + `code_verifier` を POST し `access_token` / `refresh_token` / `id_token` を取得
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

将来 upstream の信頼境界が変わる (第三者の cache CDN を経由する 等) 場合に備え、payload schema は `iss` / `aud` / `exp` / `iat` を含めて parse し、JWKS 署名再検証を後から差し込める構造に保つ。

### Refresh

`session_store.get(sid)` で得た entry の `tokens.expiresAt` が **残り 30 秒未満** なら、API proxy 直前に refresh を実行する。Refresh が失敗したら session を破棄して 401 を返す。

### Logout

1. Browser が `/api/auth/logout` を踏む
2. BFF が Keycloak の `end_session_endpoint` へ 302 (`post_logout_redirect_uri=/api/auth/logout-callback`、`id_token_hint=...` で confirm 画面を skip、`client_id` も同送 for Keycloak ≥ 18)
3. Keycloak が session を切り、`/api/auth/logout-callback` に戻す
4. BFF が `sid` から session を削除し `Set-Cookie: sid=; Max-Age=0` を返す
5. ホームへ 302

### endpoint 配置の境界

| path | 種別 | 役割 |
|---|---|---|
| `/api/auth/login` | Express handler | pendingLogin を作り authorize URL へ 302 |
| `/api/auth/callback` | Express handler | state 検証 + code → token 交換 + session set + Set-Cookie + 302 returnTo |
| `/api/auth/logout` | Express handler | session entry の id_token を取り `end_session_endpoint` へ 302 |
| `/api/auth/logout-callback` | Express handler | session 削除 + Set-Cookie clear + 302 returnTo |
| `/auth/callback`、`/auth/silent-callback`、`/auth/logout-callback` | RR route (薄い page) | BFF を素通りした場合の fallback。通常は 302 で抜けるので render されない |

Keycloak client の `Valid Redirect URIs` は `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/callback` および `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` のみを許可する。`*` ワイルドカードは production で禁止 (本書「Redirect URI の運用」 節)。

Express handler で完結させる利点:

- callback 処理 (state 検証 / code 交換 / cookie 発行) は server 専用、zones 上 `app → server` 直接 import を避けるため Express で処理してから redirect する
- RR route 側 (loader / component) を OIDC 詳細から完全に切り離す
- Keycloak から見ると redirect_uri が固定、RR の routing 変更に影響を受けない

### Pending login store

login flow 中の `state` / `code_verifier` / `returnTo` を server 側 in-memory に持つ。

- TTL 10 分、1 分間隔で cleanup
- `take(state)` は **1 回限り消費** (replay 防止)
- multi-instance 化が必要になれば session store と同じ抽象境界で redis 化

### State CSRF と returnTo の二重防御

#### State CSRF

OIDC `state` parameter は authorization request と callback の対応を結ぶ CSRF token として機能する:

1. login 時に乱数から `state` を生成し pending store に積む
2. Keycloak が callback で `state` を echo back
3. server は受け取った `state` を pending store から `take` する (1 回限り、TTL 10 分)
4. take 失敗 (存在しない / 期限切れ / 二度取り) は 400 `invalid_state`

これにより攻撃者が用意した callback URL を被害者に踏ませても拒否され、同じ code を 2 回交換できない。

#### returnTo

login / logout の `return_to` query は内部 navigation 用。ユーザーが任意の URL を入れられるので、二重に検証する:

| 層 | 検証内容 |
|---|---|
| `app/lib/auth/login-url.ts` (client / loader 両用 helper) | `/` 始まり + `//` / `/\` 不可、違反は `/` に正規化 |
| `server/auth/` handler | 同条件 + URL parse で host / scheme が portal origin と一致するか再判定、違反は `/` に正規化 |

server 側の再検証は「クライアント側 helper を経由しない直叩き」 (例: 攻撃者が手書きで `/api/auth/login?return_to=//evil` を組む) を遮断するために必須。

### Client route page (`routes/auth/*.tsx`)

`app/routes/auth/{callback,silent-callback,logout-callback}.tsx` は薄い fallback page として置く。通常フローでは BFF が 302 で抜けるため画面は表示されない。表示されるのは次のいずれか:

- Keycloak client config が旧 redirect_uri (`/auth/callback`) を保持しており、BFF を素通りした
- BFF handler が 5xx で returnTo 302 まで到達せず、RR が `/auth/callback` 自体を render した

これらの fallback page は単に「サインイン処理中」 / 「サインアウトしました」 を表示し、ホームへの link を置く。loader は持たない (`app → server` zones を尊重)。

silent-callback は OIDC silent renew (iframe 経由 SSO check) の互換用。BFF refresh を採用しているので機能としては不要だが、既存仕様との互換のため空 page を残す。

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

route loader からも user 情報を取れるよう、`loadAuth(request)` helper を `app/lib/auth/` に置く。loader 内で受け取った `Request` の `Cookie` ヘッダを BFF `/api/me` に転送し、200 なら `UserInfo`、401 なら `null`、5xx は throw する。

`loadAuth` は `app` zone から `fetch(new URL("/api/me", request.url))` で BFF を叩く形を取り、`app → server` 直接 import を避ける (`architecture.md`)。SSR 初期描画時に Header のユーザー名表示が即座に解決する。

#### Cookie 転送の安全性前提

`request.url` は React Router の SSR runtime が **portal 自身の origin** を解決した URL である必要がある。リバースプロキシ越しに deploy する場合、Express の `trust proxy` 設定と `X-Forwarded-Host` の許可ホスト制限を BFF (`server/`) で必ず行うこと。攻撃者が `Host:` を任意 origin に書き換えられる構成では `sid` cookie が外部に流出する。

## `<RequireAuth>` wrapper と URL helper

`<RequireAuth>` は children を `useAuth` の状態で出し分け、`unauthenticated` なら `buildLoginUrl(location.pathname + location.search)` に navigate する。リリース時はこの wrapper を使う route が無いが、構造として最初から用意する。

URL の組み立ては `app/lib/auth/login-url.ts` の `buildLoginUrl` / `buildLogoutUrl` に集約し、Header の Login / Logout link からも同じ helper を使う。`returnTo` は **同一 origin の絶対パス (`/` 始まり、`//` でない、`/\\` でない)** のみ受理し、それ以外は `/` に正規化する。

## 言語の維持 (i18n との連携)

Login / Logout のリダイレクトで `returnTo` を保持する際、現在 URL がそのまま使われるため言語選択は cookie で維持される (`i18n.md`)。`/api/auth/login` / `/api/auth/logout` は言語非依存の path に置く。

## 環境変数

| 変数 | 用途 |
|---|---|
| `DB_PORTAL_KEYCLOAK_REALM_URL` | Keycloak realm URL (`https://idp[-staging].ddbj.nig.ac.jp/realms/master`) |
| `DB_PORTAL_KEYCLOAK_CLIENT_ID` | クライアント ID (`db-portal-dev` / `db-portal-staging` / `db-portal`) |
| `DB_PORTAL_PORTAL_ORIGIN` | redirect_uri 計算に使う portal origin |

クライアントシークレットは PKCE で不要 (`public` client 設定)。Keycloak client は `access type: public`、PKCE 強制で運用する。

詳細な env 全体方針は `development.md` を参照。

## Keycloak 管理画面側の設定

Keycloak 管理コンソール側の client 設定 SSOT。portal 側の実装挙動は本書上方の各節を参照。

### 環境ごとの realm / client

| 環境 | realm URL | client ID | client 種別 |
|---|---|---|---|
| dev | `https://idp-staging.ddbj.nig.ac.jp/realms/master` | `db-portal-dev` | public + PKCE |
| staging | `https://idp-staging.ddbj.nig.ac.jp/realms/master` | `db-portal-staging` | public + PKCE |
| production | `https://idp.ddbj.nig.ac.jp/realms/master` | `db-portal` | public + PKCE |

dev と staging は同じ realm を共有し、client を別にする (テストユーザーを切り分けるため)。production は別 realm。

### Client 設定値

production client `db-portal` の設定。staging / dev は redirect URI 部分のみ origin を差し替える。

| 項目 | 値 | 説明 |
|---|---|---|
| Client ID | `db-portal` | コード側の `DB_PORTAL_KEYCLOAK_CLIENT_ID` と一致 |
| Client Protocol | `openid-connect` | OIDC |
| Access Type | `public` | client secret を保持しない (PKCE で代替) |
| Standard Flow Enabled | ON | Authorization Code Flow |
| Implicit Flow Enabled | OFF | non-recommended |
| Direct Access Grants Enabled | OFF | password grant 不使用 |
| Service Accounts Enabled | OFF | 不要 |
| Authorization Enabled | OFF | 不要 |
| PKCE Code Challenge Method | `S256` | SHA-256 強制 |
| Valid Redirect URIs | `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/callback`<br>`<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` | ワイルドカード `*` 禁止 |
| Valid Post Logout Redirect URIs | `<DB_PORTAL_PORTAL_ORIGIN>/api/auth/logout-callback` | logout 後の戻り先 |
| Web Origins | `<DB_PORTAL_PORTAL_ORIGIN>` | CORS 用 (BFF 経由のみなので限定) |
| Front Channel Logout | OFF | BFF が `end_session_endpoint` を直叩きする |
| Backchannel Logout URL | (空) | 不要 |

### PKCE の強制

Access Type `public` + Standard Flow + `Proof Key for Code Exchange Code Challenge Method = S256` を組み合わせて、PKCE なしの code 交換を拒否する設定にする。Keycloak 管理コンソールの client 設定 → "Advanced Settings" → "Proof Key for Code Exchange Code Challenge Method" を `S256` に。

portal 側 BFF は常に `code_verifier` を送出するので、Keycloak 側で強制しても挙動は変わらないが、設定ミスや別 client による悪用を防ぐ層として強制する。

### Token 寿命

| 項目 | 値 | 補足 |
|---|---|---|
| Access Token Lifespan | 5 分 | BFF が refresh を背面で実行するため短くて OK |
| Client Session Idle | 30 分 | BFF session TTL と揃える |
| Client Session Max | 12 時間 | refresh の最長寿命 |
| SSO Session Idle | 30 分 | Keycloak realm 全体の idle |
| SSO Session Max | 12 時間 | Keycloak realm 全体の max |

Access Token を短くする理由: BFF が `expiresAt - 30 秒` のタイミングで refresh する。AT が短い分だけ漏洩リスクが減る。Refresh Token は HttpOnly cookie とは別経路 (server in-memory) で保持されるため、client が直接触れない。

### Redirect URI の運用

リリース時点で **ワイルドカード `*` を全廃** する。各環境は実 origin を完全一致で登録する。

| 環境 | Valid Redirect URIs |
|---|---|
| dev | `http://localhost:3000/api/auth/callback`<br>`http://localhost:3000/api/auth/logout-callback` |
| staging | `https://portal-staging.ddbj.nig.ac.jp/api/auth/callback`<br>`https://portal-staging.ddbj.nig.ac.jp/api/auth/logout-callback` |
| production | `https://portal.ddbj.nig.ac.jp/api/auth/callback`<br>`https://portal.ddbj.nig.ac.jp/api/auth/logout-callback` |

production client の redirect URI に staging origin を含めない (逆も同様)。production の `code` が staging に流れて悪用されることを防ぐ。

### Scope 設定

portal が要求する scope:

| Scope | 用途 |
|---|---|
| `openid` | OIDC 必須 |
| `profile` | `name` |
| `email` | `email` |

`offline_access` は要求しない (BFF 内のみで refresh、client 側で長期保管しない)。

Keycloak realm の "Client Scopes" で `openid` / `profile` / `email` を `db-portal` client の "Default Client Scopes" に紐づける。

### Web Origins / CORS

portal は BFF が Keycloak を直接叩くため、browser → Keycloak の直接 CORS 通信は発生しない。Web Origins には portal 自身の origin のみを登録する。silent renew (iframe) は採用していないので 3rd-party cookie の懸念もない。

| 環境 | Web Origins |
|---|---|
| dev | `http://localhost:3000` |
| staging | `https://portal-staging.ddbj.nig.ac.jp` |
| production | `https://portal.ddbj.nig.ac.jp` |

### e2e テスト用ユーザー

staging realm に portal e2e 用テストユーザーを作成する:

| Username | Email | 用途 |
|---|---|---|
| `ts-db-portal-dev` | (dev / staging 共用、staging realm) | Playwright e2e で `S-AUTH-02` 等 |

password はリリースマネージャの作業環境で `DB_PORTAL_E2E_USER_PASSWORD` env として保持し、`npm run test:e2e` を回すときに渡す。production realm にはテストユーザーを作らない。

### 初回登録手順 (production)

1. Keycloak 管理コンソール `https://idp.ddbj.nig.ac.jp` にログイン
2. realm `master` に切り替え
3. Clients → Create
   - Client ID: `db-portal`
   - Client Protocol: `openid-connect`
4. Settings タブ:
   - Access Type: `public`
   - Standard Flow Enabled: ON
   - Direct Access Grants Enabled: OFF
   - Implicit Flow Enabled: OFF
   - Valid Redirect URIs / Valid Post Logout Redirect URIs / Web Origins: 上の表参照
5. Advanced Settings タブ:
   - Proof Key for Code Exchange Code Challenge Method: `S256`
   - Access Token Lifespan: 5 minutes
   - Client Session Idle: 30 minutes
   - Client Session Max: 12 hours
6. Client Scopes タブ:
   - Default Client Scopes: `openid`, `profile`, `email`
   - Optional Client Scopes: (空)
7. Save

設定完了後、portal の `/api/auth/login?return_to=/` を踏んでログインフローが正常完了することを確認する。

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

- 任意の `(sid, entry)` 列に対し、`get` 後の `expiresAt` が `set` 時の `expiresAt` 以上、削除後の `get` が `undefined`
