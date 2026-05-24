# Authentication

DDBJ Account (Keycloak) との連携を、**BFF (Backend for Frontend) + HttpOnly cookie** pattern で実装する。JS は access token / refresh token に **一切触れない**。

本書の責務分離図は `architecture.md §5` を参照。

## 1. 方針

OAuth 2.0 for Browser-Based Apps の BFF pattern を採用する。

| 項目 | 採用 | 採用しない |
|---|---|---|
| Token 保管場所 | サーバ in-memory session store (Map) | localStorage / sessionStorage / JS から読める Cookie |
| Browser ↔ Server の identity 受け渡し | HttpOnly cookie (`sid`) | JWT 本体を Cookie に入れる |
| Token refresh | BFF が背面で実行 | 旧来の silent renew (iframe) |
| User info の供給 | `GET /api/me` | `useUser()` が token をデコード |

### 1.1 採用理由

| 方式 | XSS 耐性 | Tab 越え session | Safari ITP 影響 | 実装複雑度 |
|---|---|---|---|---|
| BFF + HttpOnly cookie (採用) | ◎ JS が token に触れない | ◎ | ◎ | △ BFF に session 層が必要 (LLM proxy / News mirror で BFF は既存) |
| silent renew + sessionStorage | △ JS が触れる | × Tab 閉じで消える | × Keycloak iframe が 3rd-party cookie 制限で壊れる | ○ |
| localStorage に JWT | × | ◎ | ◎ | ◎ |

XSS 耐性と Safari ITP への耐性を最優先。BFF は News mirror / LLM proxy / Search API serialize でも使う既設層なので、session 機能の追加コストが小さい。

## 2. データフロー全体図

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

## 3. リリース時の機能範囲

リリース時点では **ログインボタンのみ**。ログイン後の限定機能は持たせない。ただし token の取扱い方式は後から差し替えるコストが大きいので最初から正しい形で固める。

### 3.1 持つもの

- OIDC Authorization Code Flow + PKCE (BFF が code → token 交換)
- In-memory session store (Map<sid, …>、TTL 付き)
- HttpOnly cookie (`sid`、SameSite=Lax、Secure、Path=/)
- ログイン / ログアウト UI (BFF endpoint への遷移)
- Header にユーザー名表示 (`GET /api/me`)
- Token refresh は BFF が背面で実行 (期限切れ前に Keycloak に refresh)
- `useAuth()` hook + `<RequireAuth>` wrapper の API (将来「ログイン後限定機能」を増やしやすい構造)

### 3.2 持たないもの

- 登録ドラフトの永続化
- Private accession 検索
- お気に入り検索クエリ保存
- Mutation 系 API (mutation がない期間は CSRF 攻撃面が薄い、mutation を追加するときに CSRF token / Origin check を導入する)

## 4. Cookie 仕様

| 属性 | 値 | 理由 |
|---|---|---|
| Name | `sid` | 短く、用途を明示 |
| Value | 不透明な乱数 (`crypto.randomUUID()`) | session ID をクライアントに渡すだけで、token は含まない |
| HttpOnly | true | JS から読めない |
| Secure | true (production), false 可 (dev http) | https 強制 |
| SameSite | Lax | top-level navigation で送信、cross-site embed では送らない |
| Path | `/` | サブパスでも有効 |
| Max-Age | session 限り (Cookie 自体は session cookie) | サーバ側 TTL (`expiresAt`) が真の expiry |

```ts
// server/auth/cookie.ts (抜粋)
import { serialize, parse } from "cookie"

const COOKIE_NAME = "sid"

export function setSidCookie(sid: string, opts: { secure: boolean }): string {
  return serialize(COOKIE_NAME, sid, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
  })
}

export function getSidFromHeader(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined
  return parse(cookieHeader)[COOKIE_NAME]
}

export function clearSidCookie(opts: { secure: boolean }): string {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
```

## 5. Session store

### 5.1 構造

```ts
// server/auth/session-store.ts (抜粋)
import { z } from "zod"

export const SessionEntry = z.object({
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),    // unix ms (access token expiry)
  }),
  userInfo: z.object({
    sub: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  expiresAt: z.number(),       // unix ms (session TTL、access のたびに延長)
})

export type SessionEntry = z.infer<typeof SessionEntry>
```

### 5.2 TTL / cleanup

| 項目 | 値 | 説明 |
|---|---|---|
| Session TTL | 30 分 (sliding) | `get()` のたびに `expiresAt` を 30 分延長 |
| Cleanup interval | 5 分 | `setInterval` で起動、`expiresAt < Date.now()` を全削除 |

```ts
const SESSION_TTL_MS = 30 * 60 * 1000
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

class SessionStore {
  private store = new Map<string, SessionEntry>()

  set(sid: string, entry: SessionEntry): void {
    this.store.set(sid, { ...entry, expiresAt: Date.now() + SESSION_TTL_MS })
  }
  get(sid: string): SessionEntry | undefined {
    const e = this.store.get(sid)
    if (!e || e.expiresAt < Date.now()) {
      this.store.delete(sid)
      return undefined
    }
    e.expiresAt = Date.now() + SESSION_TTL_MS
    return e
  }
  delete(sid: string): void {
    this.store.delete(sid)
  }
  cleanup(): void {
    const now = Date.now()
    for (const [sid, e] of this.store) {
      if (e.expiresAt < now) this.store.delete(sid)
    }
  }
}

export const sessionStore = new SessionStore()
setInterval(() => sessionStore.cleanup(), CLEANUP_INTERVAL_MS).unref()
```

### 5.3 Log redaction

`server/lib/log.ts` の log helper で次のフィールドを `[REDACTED]` に置換する:

- `accessToken`
- `refreshToken`
- `cookie` / `Cookie` (HTTP header)
- `authorization` / `Authorization` (HTTP header)

session entry 全体を log に出すケースは作らない。debug 用に log するなら `sub` と `name` だけに絞る。

### 5.4 Multi-instance への拡張

本リリースは 1 instance 想定で in-memory のみ。将来複数 instance に展開する場合は `DB_PORTAL_SESSION_STORE=memory|redis` env で切替可能にする構造を保つ (interface 抽象は最初から作る、redis 実装は別途)。

## 6. OIDC Authorization Code Flow + PKCE

### 6.1 BFF endpoint 一覧

| Method | Path | 役割 |
|---|---|---|
| GET | `/api/auth/login` | Keycloak の authorize URL にリダイレクト (PKCE code_challenge を生成) |
| GET | `/auth/callback` | Keycloak からの redirect 受信、code → token 交換、`sid` 発行、ホームへリダイレクト |
| GET | `/auth/silent-callback` | 旧来 silent renew の互換用 (BFF refresh 採用なので空実装) |
| GET | `/api/auth/logout` | Keycloak の `end_session_endpoint` にリダイレクト |
| GET | `/auth/logout-callback` | Keycloak からの redirect 受信、session 削除、cookie clear |
| GET | `/api/me` | 現在の session の userInfo を返す。session なしなら 401 |

### 6.2 Login

1. Browser が `/api/auth/login?return_to=/databases/bioproject` を踏む
2. BFF が PKCE `code_verifier` を生成し、`state` と `code_verifier` を `nonce` 付きで temp store に保存
3. BFF が Keycloak の `authorization_endpoint` へ 302 リダイレクト

```ts
// server/auth/oidc.ts (抜粋)
import { z } from "zod"
import crypto from "node:crypto"

const PendingLogin = z.object({
  codeVerifier: z.string(),
  state: z.string(),
  returnTo: z.string(),
  createdAt: z.number(),
})

// (in-memory) Map<state, PendingLogin>、TTL 10 分
const pendingLogins = new Map<string, z.infer<typeof PendingLogin>>()

export function buildAuthorizeUrl(returnTo: string): { url: string; state: string } {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
  const codeChallenge = base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest())
  const state = base64UrlEncode(crypto.randomBytes(16))
  pendingLogins.set(state, { codeVerifier, state, returnTo, createdAt: Date.now() })
  const url = new URL(`${env.KEYCLOAK_REALM_URL}/protocol/openid-connect/auth`)
  url.searchParams.set("client_id", env.KEYCLOAK_CLIENT_ID)
  url.searchParams.set("redirect_uri", `${env.PORTAL_ORIGIN}/auth/callback`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid profile email")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  return { url: url.toString(), state }
}
```

### 6.3 Callback

1. Browser が `/auth/callback?code=...&state=...` を踏む
2. BFF が `state` から `code_verifier` と `returnTo` を取り出す
3. Keycloak の `token_endpoint` に `code` + `code_verifier` を POST して `access_token` / `refresh_token` / `id_token` を得る
4. `id_token` の sub / name / email を userInfo として抽出
5. `sid` を発行し session store に `set`、`Set-Cookie: sid=...` を返す
6. `returnTo` (もしくは `/`) へ 302

### 6.4 Refresh

`session_store.get(sid)` で得た entry の `tokens.expiresAt` が **残り 30 秒未満** なら、API proxy 直前に refresh を実行する。

```ts
// server/auth/oidc.ts (抜粋)
export async function ensureFreshToken(entry: SessionEntry): Promise<string> {
  const REFRESH_MARGIN_MS = 30 * 1000
  if (entry.tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return entry.tokens.accessToken
  }
  const fresh = await refreshAtKeycloak(entry.tokens.refreshToken)
  entry.tokens = {
    accessToken: fresh.access_token,
    refreshToken: fresh.refresh_token,
    expiresAt: Date.now() + fresh.expires_in * 1000,
  }
  return entry.tokens.accessToken
}
```

Refresh が失敗したら session を破棄して 401 を返す。

### 6.5 Logout

1. Browser が `/api/auth/logout` を踏む
2. BFF が Keycloak の `end_session_endpoint` へ 302 (`post_logout_redirect_uri=/auth/logout-callback`)
3. Keycloak が session を切り、`/auth/logout-callback` に戻す
4. BFF が `sid` から session を削除し `Set-Cookie: sid=; Max-Age=0` を返す
5. ホームへ 302

## 7. `/api/me` 仕様

### 7.1 Request

```http
GET /api/me HTTP/1.1
Cookie: sid=<opaque>
```

### 7.2 Response

| 状況 | Status | Body |
|---|---|---|
| Session あり (有効) | 200 | `{ "user": { "sub": "...", "name": "...", "email": "..." } }` |
| Cookie なし / Session 期限切れ | 401 | `{ "error": "unauthorized" }` |

### 7.3 Cache 制御

`Cache-Control: no-store` を付ける。Loader / Client query の cache は TanStack Query 側で `staleTime: 5 * 60_000` 程度を持たせる。

## 8. `useAuth` hook

### 8.1 シグネチャ

```ts
// app/lib/auth/use-auth.ts
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

const Me = z.object({
  user: z.object({
    sub: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
})

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: { sub: string; name: string; email: string } }
  | { status: "unauthenticated" }

export function useAuth(): AuthState {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" })
      if (res.status === 401) return null
      return Me.parse(await res.json())
    },
    staleTime: 5 * 60_000,
  })
  if (q.isLoading) return { status: "loading" }
  if (!q.data) return { status: "unauthenticated" }
  return { status: "authenticated", user: q.data.user }
}
```

### 8.2 SSR 経由の userInfo

route loader からも user 情報を取れる構造を最初から持つ。loader 内で `Cookie` header を読み、`server/auth/session-store.ts` の `get()` で entry を引く。

```ts
// app/routes/some-route.tsx
import type { Route } from "./+types/some-route"
import { getUserFromRequest } from "~/lib/auth/server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserFromRequest(request)  // server-only helper
  return { user }
}
```

`getUserFromRequest` は `app` zone からは直接 `server/` を呼べないので、内部で `fetch(new URL("/api/me", request.url), { headers: { cookie: request.headers.get("cookie") ?? "" } })` を発行する形を取る (`architecture.md §4` の「Loader / Action は HTTP を経由する」ルールに従う)。

## 9. `<RequireAuth>` wrapper

### 9.1 シグネチャ

```tsx
// app/lib/auth/require-auth.tsx
import { Navigate, useLocation } from "react-router"
import { useAuth } from "./use-auth"
import type { ReactNode } from "react"

export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === "loading") return fallback ?? null
  if (auth.status === "unauthenticated") {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/api/auth/login?return_to=${returnTo}`} replace />
  }
  return <>{children}</>
}
```

### 9.2 使い方

ログイン後限定機能を持つ route で children を包む。リリース時はこの wrapper を使う route がない (機能なし) が、構造として最初から用意する。

```tsx
export default function FuturePrivateRoute() {
  return (
    <RequireAuth>
      <PrivateContent />
    </RequireAuth>
  )
}
```

## 10. 言語の維持 (i18n との連携)

Login / Logout のリダイレクトで `returnTo` を保持する際、現在 URL がそのまま使われるため言語 prefix は自然に維持される (`/en/databases/bioproject` で login すれば `/en/databases/bioproject` に戻る)。

`/api/auth/login` / `/api/auth/logout` は言語非依存の path に置く (i18n の URL 戦略では `/en` prefix の対象外)。

## 11. 環境変数

| 変数 | 用途 |
|---|---|
| `DB_PORTAL_KEYCLOAK_REALM_URL` | Keycloak realm URL (`https://idp[-staging].ddbj.nig.ac.jp/realms/master`) |
| `DB_PORTAL_KEYCLOAK_CLIENT_ID` | クライアント ID (`db-portal-dev` / `db-portal-staging` / `db-portal`) |
| `DB_PORTAL_PORTAL_ORIGIN` | redirect_uri 計算に使う portal origin |

クライアントシークレットは PKCE で不要 (`public` client 設定)。Keycloak client は `access type: public`、PKCE 強制で運用する。

詳細な env 全体方針は `development.md` を参照。

## 12. テスト

### 12.1 Unit (msw でモック)

- `tests/unit/lib/auth/use-auth.test.tsx`: `/api/me` のレスポンス 200 / 401 に対する hook 状態遷移
- `tests/unit/lib/auth/require-auth.test.tsx`: unauthenticated 時に Login URL に redirect
- `tests/unit/server/auth/session-store.test.ts`: TTL sliding / cleanup

### 12.2 PBT

- `tests/pbt/server/auth/session-store.pbt.test.ts`: 任意の `(sid, entry)` 列に対して `get` 後の `expiresAt` が `set` 時の `expiresAt` 以上、削除後の `get` が `undefined`

### 12.3 E2E (Playwright on staging)

- `S-AUTH-01`: 未認証で `/` を開く → ログインボタン表示 → click で Keycloak → credential 入力 → portal に戻る → Header にユーザー名表示
- `S-AUTH-02`: ログイン状態でログアウト → Keycloak セッション切断 → portal に戻る → ログインボタン表示
- `E-AUTH-01`: session 期限切れで `/api/me` が 401 → header が「ログイン」表示に戻る

## 13. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §5` | BFF 責務分離図 |
| `architecture.md §7.3` | 認証データフロー全体図 |
| `i18n.md §6` | リダイレクト時の言語維持 (`getCounterpartUrl` ヘルパで login/logout の returnTo を計算) |
| `development.md` | Keycloak realm / client の起動方法、env 切替 |
