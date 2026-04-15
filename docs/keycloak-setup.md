# Keycloak クライアント設定

DB Portal 用の Keycloak（DDBJ Account）クライアント設定手順。認証フローの設計意図は `docs/overview.md` の「認証」セクションを参照。

## 外部サービス

| サービス | Staging | Production |
|---|---|---|
| Keycloak 管理コンソール | https://idp-staging.ddbj.nig.ac.jp | https://idp.ddbj.nig.ac.jp |
| Cloakman（アカウント管理） | https://accounts-staging.ddbj.nig.ac.jp | https://accounts.ddbj.nig.ac.jp |

## クライアント一覧

| 環境 | Client ID | Keycloak | Realm |
|---|---|---|---|
| dev / staging | `db-portal-dev` | idp-staging.ddbj.nig.ac.jp | master |
| production | `db-portal` | idp.ddbj.nig.ac.jp | master |

パブリッククライアント（Client Secret なし）。SPA から Authorization Code Flow + PKCE で認証する。

## 設定手順

Keycloak 管理コンソールにログインし、master Realm でクライアントを作成する。

### 1. General settings

| 項目 | 設定値 |
|---|---|
| Client ID | `db-portal-dev`（production: `db-portal`） |
| Name | DB Portal |
| Always display in UI | OFF |

### 2. Access settings

> **運用状況**: 本項の値は **production 設定時に必ずこの通り設定する** ための目標値。現状の dev / staging クライアント（`db-portal-dev`）は開発の利便性のため Valid redirect URIs / post logout / Web origins がワイルドカード `*` で登録されている。production クライアント（`db-portal`）は新規作成時から下表の値で厳密に設定すること（`*` は絶対に使わない）。dev / staging のワイルドカードも、本番同等の URI 列挙に差し替える予定。

**Dev / Staging:**

| 項目 | 設定値 |
|---|---|
| Valid redirect URIs | `http://localhost:3000/*`, `https://portal-staging.ddbj.nig.ac.jp/*` |
| Valid post logout redirect URIs | `http://localhost:3000/*`, `https://portal-staging.ddbj.nig.ac.jp/*` |
| Web origins | `http://localhost:3000`, `https://portal-staging.ddbj.nig.ac.jp` |

**Production:**

| 項目 | 設定値 |
|---|---|
| Valid redirect URIs | `https://portal.ddbj.nig.ac.jp/*` |
| Valid post logout redirect URIs | `https://portal.ddbj.nig.ac.jp/*` |
| Web origins | `https://portal.ddbj.nig.ac.jp` |

### 3. Capability config

| 項目 | 設定値 | 説明 |
|---|---|---|
| Client authentication | OFF | パブリッククライアント（SPA 向け、Client Secret なし） |
| Authorization | OFF | 不要 |

### 4. Authentication flow

| 項目 | 設定値 | 説明 |
|---|---|---|
| Standard flow | ON | Authorization Code Flow |
| Direct access grants | ON | テスト・デバッグ時のトークン直接取得に使用 |
| Implicit flow | OFF | セキュリティ上無効 |
| Service accounts roles | OFF | 不要 |

### 5. PKCE Method

| 項目 | 設定値 |
|---|---|
| PKCE Method | S256 |

PKCE を強制してセキュリティを向上させる。

### 6. Login settings

| 項目 | 設定値 |
|---|---|
| Login theme | ddbj |
| Consent required | OFF |

### 7. Logout settings

| 項目 | 設定値 |
|---|---|
| Front channel logout | ON |
| Front-channel logout session required | ON |

## Client scopes

### basic スコープ（sub claim）

Keycloak 26.x では lightweight access token がデフォルトになり、`sub` claim が access token に含まれない。react-oidc-context がユーザーを識別するために `sub` claim が必要なので、basic スコープを追加する。

1. Client scopes → Create client scope
2. 設定:
   - Name: `basic`
   - Description: `OpenID Connect scope for basic claims (sub) in access token`
   - Protocol: OpenID Connect
   - Display on consent screen: OFF
3. Mappers タブ → Add mapper → By configuration → Subject (sub)
   - Name: `sub`
   - Add to access token: ON
   - Add to token introspection: ON
4. クライアントの Client scopes タブ → Add client scope → `basic` を Default に追加

### Audience Mapper

API がある場合、JWT の `aud` クレーム検証に必要。現時点では API 検証がないため任意だが、設定しておくことを推奨する。

1. クライアントの Client scopes タブ → `db-portal-dev-dedicated` を選択
2. Mappers → Add mapper → By configuration → Audience
3. 設定:
   - Name: `audience`
   - Included Client Audience: `db-portal-dev`（production: `db-portal`）
   - Add to ID token: OFF
   - Add to access token: ON
   - Add to token introspection: ON

### デフォルトスコープ

クライアントの Client scopes タブで以下が Default に含まれていることを確認:

- `basic`（上記で追加）
- `profile`
- `email`

## Advanced settings（タイムアウト値）

| 項目 | Dev / Staging | Production 推奨 |
|---|---|---|
| Access Token Lifespan | 1 Hours | 5 Minutes |
| Client Session Idle | 8 Hours | 30 Minutes |
| Client Session Max | 1 Days | 1 Hours |
| Client Offline Session Idle | 7 Days | 7 Days |

dev / staging では開発時の利便性のために長めの値を設定する。production ではセキュリティ重視の短い値を推奨。

## 設定確認

クライアント作成後、以下の OIDC エンドポイントにアクセスして設定を確認:

```
https://idp-staging.ddbj.nig.ac.jp/realms/master/.well-known/openid-configuration
```
