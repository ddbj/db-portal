# Keycloak Setup

DDBJ Account (Keycloak) における **portal 用 client の作成・redirect URI・PKCE・token 寿命** の設定手順 SSOT。本書は Keycloak 管理コンソール側の設定を扱い、portal 側の認証実装は `auth.md` を参照する。

## 1. 環境ごとの realm / client

| 環境 | realm URL | client ID | client 種別 |
|---|---|---|---|
| dev | `https://idp-staging.ddbj.nig.ac.jp/realms/master` | `db-portal-dev` | public + PKCE |
| staging | `https://idp-staging.ddbj.nig.ac.jp/realms/master` | `db-portal-staging` | public + PKCE |
| production | `https://idp.ddbj.nig.ac.jp/realms/master` | `db-portal` | public + PKCE |

dev と staging は同じ realm を共有し、client を別にする (dev / staging のテストユーザーを切り分けるため)。production は別 realm。

## 2. Client 設定値

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
| Valid Redirect URIs | `https://portal.ddbj.nig.ac.jp/api/auth/callback`<br>`https://portal.ddbj.nig.ac.jp/api/auth/logout-callback` | ワイルドカード `*` 禁止 |
| Valid Post Logout Redirect URIs | `https://portal.ddbj.nig.ac.jp/api/auth/logout-callback` | logout 後の戻り先 |
| Web Origins | `https://portal.ddbj.nig.ac.jp` | CORS 用 (BFF 経由のみなので限定) |
| Front Channel Logout | OFF | BFF が `end_session_endpoint` を直叩きする |
| Backchannel Logout URL | (空) | 不要 |

staging / dev は redirect URI を `https://portal-staging.ddbj.nig.ac.jp/...` / `http://localhost:3000/...` に差し替える。

### 2.1 PKCE の強制

Access Type `public` + Standard Flow + `Proof Key for Code Exchange Code Challenge Method = S256` を組み合わせて、PKCE なしの code 交換を拒否する設定にする。Keycloak 管理コンソールの client 設定 → "Advanced Settings" → "Proof Key for Code Exchange Code Challenge Method" を `S256` に。

portal 側 BFF (`server/auth/oidc.ts`) は常に `code_verifier` を送出するので、Keycloak 側で強制しても挙動は変わらないが、設定ミスや別 client による悪用を防ぐ層として強制する。

## 3. Token 寿命

| 項目 | 値 | 補足 |
|---|---|---|
| Access Token Lifespan | 5 分 | BFF が refresh を背面で実行するため短くて OK |
| Client Session Idle | 30 分 | BFF session TTL と揃える |
| Client Session Max | 12 時間 | refresh の最長寿命 |
| SSO Session Idle | 30 分 | Keycloak realm 全体の idle |
| SSO Session Max | 12 時間 | Keycloak realm 全体の max |

Access Token を短くする理由: BFF が `expiresAt - 30 秒` のタイミングで refresh する (`auth.md §6.4`)。AT が短い分だけ漏洩リスクが減る。Refresh Token は HttpOnly cookie とは別経路 (server in-memory) で保持されるため、client が直接触れない。

## 4. Redirect URI の運用

リリース時点で **ワイルドカード `*` を全廃** する。各環境は実 origin を完全一致で登録する。

| 環境 | Valid Redirect URIs |
|---|---|
| dev | `http://localhost:3000/api/auth/callback`<br>`http://localhost:3000/api/auth/logout-callback` |
| staging | `https://portal-staging.ddbj.nig.ac.jp/api/auth/callback`<br>`https://portal-staging.ddbj.nig.ac.jp/api/auth/logout-callback` |
| production | `https://portal.ddbj.nig.ac.jp/api/auth/callback`<br>`https://portal.ddbj.nig.ac.jp/api/auth/logout-callback` |

dev / staging の redirect URI が広がっていた場合 (旧 `http://localhost:*` 等)、リリース前に実 origin のみへ絞ること (rewrite-plan §3.11 の運用調整)。

### 4.1 portal 側との対応

portal の BFF endpoint 配置 (`auth.md §6.6`):

- `/api/auth/login` → Keycloak `authorization_endpoint` へ 302
- `/api/auth/callback` → code → token 交換、`sid` 発行
- `/api/auth/logout` → Keycloak `end_session_endpoint` へ 302 (`id_token_hint` + `client_id` + `post_logout_redirect_uri` 付き)
- `/api/auth/logout-callback` → session 削除、cookie clear

`/auth/callback` (`api/` プレフィックス無し) は薄い RR fallback page (`app/routes/auth/callback.tsx`)。通常フローでは BFF が 302 で抜けるので render されない。Keycloak client config が旧 redirect URI を持っていた場合の保険として残す。

### 4.2 cross-environment redirect の禁止

production client の redirect URI に staging origin を含めない (逆も同様)。これによって production の `code` が staging に流れて悪用されることを防ぐ。

## 5. Scope 設定

portal が要求する scope:

| Scope | 用途 |
|---|---|
| `openid` | OIDC 必須 |
| `profile` | `name` |
| `email` | `email` |

`offline_access` は要求しない (BFF 内のみで refresh、client 側で長期保管しない)。

Keycloak realm の "Client Scopes" で `openid` / `profile` / `email` を `db-portal` client の "Default Client Scopes" に紐づける。

## 6. Web Origins / CORS

portal は BFF が Keycloak を直接叩くため、browser → Keycloak の直接 CORS 通信は発生しない。Web Origins には portal 自身の origin のみを登録する。silent renew (iframe) は採用していないので 3rd-party cookie の懸念もない (`auth.md §1.1`)。

| 環境 | Web Origins |
|---|---|
| dev | `http://localhost:3000` |
| staging | `https://portal-staging.ddbj.nig.ac.jp` |
| production | `https://portal.ddbj.nig.ac.jp` |

## 7. Test user

staging realm に portal e2e 用テストユーザーを作成する:

| Username | Email | 用途 |
|---|---|---|
| `ts-db-portal-dev` | (dev / staging 共用、staging realm) | Playwright e2e で `S-AUTH-02` 等 |

password はリリースマネージャの作業環境で `DB_PORTAL_E2E_USER_PASSWORD` env として保持し、`npm run test:e2e` を回すときに渡す。production realm にはテストユーザーを作らない。

## 8. 初回登録手順 (production)

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
   - Valid Redirect URIs: §4 のテーブル参照
   - Valid Post Logout Redirect URIs: §4 のテーブル参照
   - Web Origins: §6 のテーブル参照
5. Advanced Settings タブ:
   - Proof Key for Code Exchange Code Challenge Method: `S256`
   - Access Token Lifespan: 5 minutes
   - Client Session Idle: 30 minutes
   - Client Session Max: 12 hours
6. Client Scopes タブ:
   - Default Client Scopes: `openid`, `profile`, `email`
   - Optional Client Scopes: (空)
7. Save

設定完了後、portal の `/api/auth/login?return_to=/` を踏んでログインフローが正常完了することを確認する。`Set-Cookie: sid=...` が返ること、`/api/me` が 200 でユーザー情報を返すことを確認 (詳細手順は `auth.md §12.3` の `S-AUTH-02`)。

## 9. 設定変更時のチェックリスト

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

## 10. 関連 docs

| docs | 関連箇所 |
|---|---|
| `auth.md` | portal 側の OIDC 実装 / session store / Cookie 仕様 |
| `deployment.md` | env / redirect URI の deploy 設定 |
| `operations.md` | client secret rotation 手順 (本書は public client なので shared secret なし、PAT / LLM key の rotation のみ) |
