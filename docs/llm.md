# LLM Integration

DDBJ ポータルの LLM 機能は **自前 vLLM (Qwen 32B AWQ @ L40S) を BFF が proxy する** 構造で動く。ブラウザは vLLM の URL や API key を一切知らず、BFF が「到達確認 (health) + SSE pass-through + rate limit + PII redaction」 を担う。未設定 / 未到達のとき UI 側で AI 補助機能を非表示にする。

データフロー全体図は `architecture.md §7`、検索アシスタント UI は `search.md` を参照。

## 1. 方針

| 項目 | 値 |
|---|---|
| LLM backend | vLLM (OpenAI compatible API)、model `Qwen/Qwen2.5-32B-Instruct-AWQ` |
| 接続 | server-side only (browser ↛ vLLM) |
| 健全性判定 | `/api/llm/health` で `unset` / `ok` / `unreachable` の 3 状態 |
| streaming | SSE pass-through (`event: message` / `event: done` / `event: error`)、15 秒間隔 heartbeat |
| rate limit | per-IP 60 req/min + per-session 30 req/min |
| 入出力 redaction | log は email / phone / クレジットカード / API key 風 token を `[REDACTED]` 化 |
| 未設定時 | env が空なら BFF は常に `{status: "unset"}`、UI は AI 補助機能を hide |
| 未到達時 | health check が連続失敗で `{status: "unreachable", reason}`、UI は hide |
| 用途 (リリース版) | AI 検索アシスタント (`/api/llm/search-assistant`) 1 機能 |

## 2. データフロー

```
[Browser]
   │ POST /api/llm/search-assistant (input: 自然文)
   │ Accept: text/event-stream
   ▼
[BFF (server/llm/)]
   │ rate-limit check (per-IP, per-session)
   │ redaction (log のみ、prompt はそのまま vLLM へ)
   │ prompt 構築 (system + few-shot + user input)
   ▼
[vLLM (Qwen 32B AWQ @ L40S)]
   │ /v1/chat/completions (stream=true)
   ▼
[BFF]
   │ SSE pass-through:
   │   event: message  data: <delta token>
   │   event: done     data: <final JSON proposal>
   │   event: error    data: { code, message }
   │ 15 秒間隔で `: heartbeat\n\n` を空コメントで出力
   ▼
[Browser] useAssistantStream() が proposal を Advanced state に反映
```

## 3. health check

### 3.1 API

```
GET /api/llm/health
Cache-Control: no-store

Response (200):
  { "status": "unset" }
  { "status": "ok", "model": "Qwen/Qwen2.5-32B-Instruct-AWQ" }
  { "status": "unreachable", "reason": "<short string>" }
```

schema は `app/schemas/api-bff/llm.ts` の `LlmHealth` (discriminated union)。client / server 共用。

### 3.2 判定ロジック

server 起動時に env を確認する。

| 状況 | status | reason |
|---|---|---|
| `DB_PORTAL_LLM_BASE_URL` が空 | `unset` | (なし) |
| `DB_PORTAL_LLM_BASE_URL` 設定済、起動 5 秒後の初回 health check 成功 | `ok` | (なし) |
| 同上、起動 5 秒後 / 5 分間隔の health check 失敗 | `unreachable` | `"<HTTP status> ...` または `"network error"` |

「成功」 の判定: `GET {DB_PORTAL_LLM_BASE_URL}/v1/models` が 200 を返し、response body の `data[]` に `DB_PORTAL_LLM_MODEL` が含まれる。

health 状態は `server/llm/health.ts` の `setLatestHealth()` で memory に保持し、`/api/llm/health` handler はそれを返すだけ (request ごとに vLLM を叩かない)。

### 3.3 client での消費

`app/features/search/assistant/llm-availability.ts` の `useLlmAvailability()` が TanStack Query で 5 分間隔 polling する。

- `health.status === "ok"` → `{ ready: true }`
- `health.status === "unset"` → `{ ready: false, reason: "unset" }`
- `health.status === "unreachable"` → `{ ready: false, reason: health.reason }`

`SearchAssistant` component は `availability.ready` が false なら何も render しない。「LLM 未到達のためアシスタントは利用できません」 のような表示は **出さない** (機能が存在しないように振る舞う、`architecture.md §5` の障害時 fallback 方針)。

## 4. SSE 仕様

### 4.1 event 名

| event | 用途 | data |
|---|---|---|
| `message` | token streaming (vLLM の delta) | delta 文字列 (一連の連結で full text) |
| `done` | 完了通知 | 最終 JSON (proposal 等、用途別 schema) |
| `error` | エラー通知 | `{ "code": "string", "message": "string" }` |

`event:` を省略した SSE は `message` 扱い。ただし portal は明示的に `event: message` / `event: done` / `event: error` のいずれかを出す (client 実装の単純化のため)。

### 4.2 heartbeat

15 秒間隔で空コメント `: heartbeat\n\n` を出力する。中継 proxy の idle timeout (Express / Nginx) で接続が切れるのを防ぐ。

### 4.3 接続切断 / エラー

| 状況 | server 動作 | client 動作 |
|---|---|---|
| vLLM が 200 以外を返した | `event: error` で `{ code: "upstream-status", message }` を流して close | toast 表示 + 入力欄に内容を戻す |
| vLLM が socket close | `event: error` で `{ code: "upstream-disconnect", ... }` | 同上 |
| BFF rate limit 超過 | HTTP 429 で JSON `{ error: "rate_limited" }` (SSE 開始前) | toast 「しばらくしてから再試行してください」 |
| client が `AbortController.abort()` | server は upstream stream を abort、close | UI は idle に戻す |

`event: error` を出した後は server 側で stream を close する。client は同じ event id を再 subscribe しない (毎回新しい POST を発行)。

### 4.4 RFC 7807 寄りの error payload

`error` event の data は次の形 (`application/problem+json` をそのまま流す形にはしないが、field 名は揃える):

```json
{ "code": "string", "message": "string" }
```

`code` は portal 内で意味付けされた短い識別子 (`upstream-status` / `upstream-disconnect` / `parse-failed` / `timeout` 等)。`message` は human readable な短文。

## 5. 検索アシスタント (リリース版唯一の機能)

### 5.1 API

```
POST /api/llm/search-assistant
Content-Type: application/json
Accept: text/event-stream

Body:
  { "input": "<natural language>" }

Response: SSE
  event: message  data: <delta token>   (複数回)
  event: done     data: <AssistantProposal JSON>
  event: error    data: { "code", "message" }
```

`AssistantProposal` 型は `app/features/search/assistant/prompt-client.ts` の `AssistantProposal` (`{ combinator, conditions: AssistantCondition[] }`)。server 側で JSON を組み立て、client は `event: done` の data を parse して Advanced state に反映する。

### 5.2 server 側 prompt 構築

`server/llm/assistant/prompt.ts` が `system prompt + few-shot examples + user input` の messages を組み立て、vLLM `/v1/chat/completions` (stream=true) を呼ぶ。

system prompt の方針:

- 役割: 「DDBJ ポータルの検索ビルダ向けに、ユーザーの自然文を field/op/value の条件群と combinator (AND / OR) に変換する」
- 出力 JSON schema (zod schema を文章で表現): `{ "combinator": "AND" | "OR", "conditions": [{ "field": "<advanced field id>", "op": "<advanced op id>", "value": "<string>" }] }`
- few-shot 3-5 例 (single keyword / multi keyword AND / OR / field filter / range filter のカバレッジ)
- 「JSON 以外を出力するな」 / 「`<advanced field id>` は portal の許容 enum から選べ」 等の制約

許容 enum の SSOT は `app/features/search/types.ts` の `AdvancedField` / `AdvancedOp` (`architecture.md §3.1` の features zone 内、server は import 不可なので enum 値は手書きで prompt に複製する)。enum を増減したら prompt も更新する。

### 5.3 parse 失敗時

`server/llm/assistant/parse.ts` が vLLM 出力を JSON.parse + Zod 検証する。

- JSON でない / schema 違反 → `event: error` で `{ code: "parse-failed", message }` を流す
- 検証通過 → `event: done` で payload を流す

PBT (`tests/pbt/server/llm/assistant-parse.pbt.test.ts`) で「任意の不正 JSON を入れても parse 関数が throw せず error event を返す」 を担保する。

### 5.4 障害時の UI 連動

`event: error` を client (`useAssistantStream`) が受け取ったら:

1. state を `error` にする
2. `setProposal(null)` で既存提案をクリア
3. SearchAssistant が toast を出す + 元の input を入力欄に戻す (内容ロストを避ける)

client は `app/features/search/assistant/prompt-client.ts` の `useAssistantStream` が `event: message` を受信して streaming token を貯め、`event: done` の data を `AssistantProposal` として parse する。

## 6. rate limit

### 6.1 単位

| 軸 | default | env |
|---|---|---|
| per-IP | 60 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` |
| per-session (sid cookie) | 30 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` |

`per-IP` は cookie / session が無い request に対する fallback。`per-session` は cookie あり時に追加で適用 (両方適用、厳しい方が効く)。

### 6.2 アルゴリズム

固定 window で 1 分粒度のカウンタを Map に持つ。sliding window でなく単純化 (window 境界で 2 倍まで流れ得るが、リリース時点はこの精度で十分)。

```ts
type Window = { startMs: number; count: number }
const ipMap = new Map<string, Window>()
const sessionMap = new Map<string, Window>()
```

cleanup は 5 分間隔 (session store と同じ間隔)、古い window を破棄する。

sliding window への移行条件: (a) 境界 burst による誤閾値超過の運用報告が発生する、または (b) multi-instance 化に伴い rate-limit state を共有 store (redis 等) に移すタイミング。固定 window の境界 burst (1 分の境界で最大 2x まで通り得る) を許容できるのは **1 instance 構成のリリース期間** に限った前提で、`§5.4` (auth.md) の multi-instance 拡張と同じトリガで再設計する。

### 6.3 超過時の応答

```
HTTP/1.1 429 Too Many Requests
Retry-After: <次の window までの秒数>
Content-Type: application/json

{ "error": "rate_limited", "axis": "ip" | "session" }
```

client は toast 「しばらくしてから再試行してください」 を出す。SSE 開始前なので `event: error` 経路は通らない。

### 6.4 client IP の取得

`server/lib/env.ts` で `trust proxy` を `loopback` に設定済 (`server/index.ts`)。staging / production の reverse proxy 設定で `X-Forwarded-For` の信頼ホストを正しく制限する (`auth.md §8` の安全性前提と同じ)。

## 7. PII redaction

prompt 内容そのものは vLLM に送るが、server **log** には PII を残さない。`server/lib/log.ts` の `redact()` で次のキーを `[REDACTED]` 化する (既存実装):

- `accessToken` / `refreshToken` / `cookie` / `Cookie` / `authorization` / `Authorization`

LLM 固有の redaction として `server/llm/redaction.ts` が user input 文字列を log する直前に適用する:

| パターン | 例 | redact 後 |
|---|---|---|
| email | `foo@example.com` | `[REDACTED_EMAIL]` |
| 電話番号 (日本 / 国際) | `090-1234-5678` / `+81-90-1234-5678` | `[REDACTED_PHONE]` |
| クレジットカード (16 桁、4-4-4-4 区切り含む) | `4111 1111 1111 1111` | `[REDACTED_CCNUM]` |
| API key 風 token (`sk-` 始まり 32 文字 etc.) | `sk-abcdefgh...` | `[REDACTED_TOKEN]` |

`redactUserInput(input)` を 1 関数として書き、unit / PBT で網羅性を担保する。

PBT (`tests/pbt/server/llm/redaction-coverage.pbt.test.ts`) で次の不変量を担保する。

- 任意の生 email を含む文字列を入れて、出力に `@` を含む実 email が残らない
- 任意の生電話番号を含む文字列で同様
- 任意の安全な文字列 (ASCII letters のみ等) は変化しない

## 8. 環境変数

`DB_PORTAL_` prefix で統一する (`server/lib/env.ts` で Zod 検証)。server-only (`VITE_` 接頭辞は付けない、secret は client bundle に出さない)。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_LLM_BASE_URL` | (空) | vLLM の base URL (例 `http://l40s-03:3200`)。空ならアシスタント機能を完全停止 |
| `DB_PORTAL_LLM_API_KEY` | (空) | vLLM の Bearer token (vLLM 側で `--api-key` を設定している場合に使う) |
| `DB_PORTAL_LLM_MODEL` | `Qwen/Qwen2.5-32B-Instruct-AWQ` | model name (vLLM `--served-model-name` と一致) |
| `DB_PORTAL_LLM_TIMEOUT_MS` | `60000` | upstream timeout (cold start や大きい prompt のため長め) |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` | `60` | per-IP rate limit (req / 分) |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` | `30` | per-session rate limit (req / 分) |

dev 環境では `DB_PORTAL_LLM_BASE_URL=` (空) で起動し、「LLM 未設定で AI 補助が消える状態」 の挙動確認に使う。staging / production では実環境の vLLM URL + API key を設定する。

## 9. テスト

外部境界 (vLLM HTTP / 時刻 / Map state) のみ mock する。内部関数 (rate limit window / redaction / parse) は mock しない。

### 9.1 unit (Vitest + msw)

| ファイル | 内容 |
|---|---|
| `tests/unit/server/llm/client.test.ts` | vLLM HTTP client (timeout / Authorization header / model パラメタ) |
| `tests/unit/server/llm/proxy.test.ts` | SSE pass-through (event 名、heartbeat、error 経路、client abort) |
| `tests/unit/server/llm/health.test.ts` | unset (env 空) / ok / unreachable の判定 |
| `tests/unit/server/llm/rate-limit.test.ts` | window 境界、per-IP + per-session 同時適用、cleanup |
| `tests/unit/server/llm/redaction.test.ts` | email / phone / cc / token の正規表現 |
| `tests/unit/server/llm/assistant-prompt.test.ts` | system + few-shot + user input の組み立て |
| `tests/unit/server/llm/assistant-parse.test.ts` | 正常 JSON / 壊れた JSON / schema 違反の振り分け |

### 9.2 PBT (fast-check)

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/llm/redaction-coverage.pbt.test.ts` | 任意の文字列に PII を挿入しても全パターン redact される |
| `tests/pbt/server/llm/assistant-parse.pbt.test.ts` | 任意の不正 JSON を入れても parse 関数が throw せず error event を返す |
| `tests/pbt/server/llm/rate-limit-monotone.pbt.test.ts` | 任意の request 列で window 内 count が単調増加、window 跨ぎで reset |

### 9.3 E2E (Playwright on staging)

| ID | 内容 |
|---|---|
| `S-LLM-01` | 自然文入力 → SSE で proposal 受信 → Apply で Advanced state に反映 |
| `S-LLM-02` | `/api/llm/health` が `ok` のとき SearchAssistant が表示 |
| `E-LLM-01` | vLLM 停止状態で `/api/llm/health` が `unreachable` → SearchAssistant 非表示 |
| `E-LLM-02` | SSE 切断時に toast + 入力欄復元 |

## 10. 将来拡張余地

リリース版は AI 検索アシスタント 1 機能のみ。将来追加余地:

- Submit ナビでの自然文 → ButtonType 選定 (`/api/llm/submit-assistant`)
- Tool calling (関数呼び出し) で portal 内 API を LLM が叩く
- Vision (画像入力)

これらは BFF interface (`/api/llm/*`) を追加し、vLLM の対応モデル / vLLM の `--enable-auto-tool-choice` などを設定すれば拡張可能。prompt は機能ごとに `server/llm/<feature>/prompt.ts` を分けて持つ。

## 11. 関連 docs

| docs | 関連箇所 |
|---|---|
| `architecture.md §5` | BFF 責務分離 (LLM proxy は BFF) |
| `architecture.md §7` | LLM データフロー全体図 |
| `search.md` | AI 検索アシスタントの UI 仕様 |
| `auth.md §8` | trust proxy の安全性前提 (rate limit の IP 取得と共通) |
| `operations.md §3.2 / §3.3` | vLLM unreachable 時の切り分け、rate limit 誤発火対応 |
