# LLM Integration

DDBJ ポータルの LLM 機能は **vLLM (OpenAI compatible API、`DB_PORTAL_LLM_MODEL` で指定する model) を BFF が proxy する** 構造で動く。ブラウザは vLLM の URL や API key を一切知らず、BFF が「到達確認 (health) + SSE pass-through + rate limit + PII redaction」 を担う。未設定 / 未到達のとき UI 側で AI 補助機能を非表示にする。

データフロー全体図は `architecture.md`、検索アシスタント UI は `search.md` を参照。

## 方針

| 項目 | 値 |
|---|---|
| LLM backend | vLLM (OpenAI compatible API) |
| 接続 | server-side only (browser ↛ vLLM) |
| 健全性判定 | `/api/llm/health` で `unset` / `ok` / `unreachable` の 3 状態 |
| streaming | SSE pass-through (`event: message` / `event: done` / `event: error`)、15 秒間隔 heartbeat |
| rate limit | per-IP 60 req/min + per-session 30 req/min (env で上書き可) |
| 入出力 redaction | log は email / phone / クレジットカード / API key 風 token を `[REDACTED]` 化 |
| 未設定時 | `DB_PORTAL_LLM_BASE_URL` が空のとき BFF は `{status: "unset"}` を返し、`/api/llm/search-assistant` は 503 `{error: "llm_unset"}`、UI は AI 補助機能を hide |
| 未到達時 | health check が失敗のとき `{status: "unreachable", reason}`、UI は表示したまま (送信時に error event が流れる) |
| 用途 | AI 検索アシスタント (`/api/llm/search-assistant`) |

## データフロー

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
[vLLM]
   │ /v1/chat/completions (stream=true)
   ▼
[BFF]
   │ SSE pass-through:
   │   event: message  data: <delta token>
   │   event: done     data: <final JSON proposal>
   │   event: error    data: { code, message }
   │ 15 秒間隔で `: heartbeat\n\n` を空コメントで出力
   ▼
[Browser] useAssistantStream が proposal を Advanced state に反映
```

## health check

### API

```
GET /api/llm/health
Cache-Control: no-store

Response (200):
  { "status": "unset" }
  { "status": "ok", "model": "<DB_PORTAL_LLM_MODEL>" }
  { "status": "unreachable", "reason": "<short string>" }
```

schema は `app/schemas/api-bff/llm.ts` の `LlmHealth` (discriminated union)。client / server 共用。

### 判定ロジック

server 起動時に env を確認する。

| 状況 | status | reason |
|---|---|---|
| `DB_PORTAL_LLM_BASE_URL` が空 | `unset` | (なし) |
| `DB_PORTAL_LLM_BASE_URL` 設定済、起動 5 秒前 | `unset` (初期値) | (なし) |
| `DB_PORTAL_LLM_BASE_URL` 設定済、初回 health check 成功 | `ok` | (なし) |
| 同上、health check 失敗 | `unreachable` | `"status <n>"` / `"invalid models response"` / `"model <id> not served"` / fetch 例外メッセージ |

「成功」 の判定: `GET {DB_PORTAL_LLM_BASE_URL}/v1/models` が 200 を返し、response body の `data[]` に `DB_PORTAL_LLM_MODEL` が含まれる。models endpoint の timeout は `min(DB_PORTAL_LLM_TIMEOUT_MS, 10s)` で打ち切る。

health 状態は `server/llm/health.ts` の `setLatestHealth` で memory に保持し、`/api/llm/health` handler はそれを返すだけ (request ごとに vLLM を叩かない)。env 空 (`unset`) のときは polling timer も立ち上げない。

### client での消費

`app/features/search/assistant/llm-availability.ts` の `useLlmAvailability` が TanStack Query で 5 分間隔 polling する。

- `health.status === "ok"` → `{ ready: true }`
- `health.status === "unset"` → `{ ready: false, reason: "unset" }`
- `health.status === "unreachable"` → `{ ready: true, reason: health.reason, health }` (UI は表示し、送信時の SSE error 経路で fail を通知する)

`SearchAssistant` component は `availability.ready` が false (= `unset`) なら何も render しない。`unreachable` のときは UI は出るが、送信時に SSE の `event: error` が `upstream-disconnect` などで流れて toast 経由でエラーが伝わる。

## SSE 仕様

### event 名

| event | 用途 | data |
|---|---|---|
| `message` | token streaming (vLLM の delta) | delta 文字列 (一連の連結で full text) |
| `done` | 完了通知 | 最終 JSON (proposal 等、用途別 schema) |
| `error` | エラー通知 | `{ "code": "string", "message": "string" }` |

`event:` を省略した SSE は `message` 扱い。ただし portal は明示的に `event: message` / `event: done` / `event: error` のいずれかを出す (client 実装の単純化のため)。

### heartbeat

stream を `start()` した直後に `: stream-open\n\n` を 1 度送出し、以降 15 秒間隔で空コメント `: heartbeat\n\n` を出力する。中継 proxy の idle timeout (Express / Nginx) で接続が切れるのを防ぐ。

### 接続切断 / エラー

| 状況 | server 動作 | client 動作 |
|---|---|---|
| vLLM が 200 以外を返した | `event: error` で `{ code: "upstream-status", message }` を流して close | toast 表示 + 入力欄に内容を戻す |
| vLLM が socket close | `event: error` で `{ code: "upstream-disconnect", ... }` | 同上 |
| BFF rate limit 超過 | HTTP 429 で JSON `{ error: "rate_limited" }` (SSE 開始前) | toast 「しばらくしてから再試行してください」 |
| client が `AbortController.abort` | server は upstream stream を abort、close | UI は idle に戻す |

`event: error` を出した後は server 側で stream を close する。client は同じ event id を再 subscribe しない (毎回新しい POST を発行)。

### RFC 7807 寄りの error payload

`error` event の data は次の形 (`application/problem+json` をそのまま流す形にはしないが、field 名は揃える):

```json
{ "code": "string", "message": "string" }
```

`code` は portal 内で意味付けされた短い識別子。現状の値:

- `upstream-status`: vLLM が 200 以外のステータスを返した
- `upstream-disconnect`: streaming 中の切断 / fetch 例外 / その他予期しない upstream エラー
- `no_json` / `invalid_json` / `schema_violation`: vLLM 出力の parse 失敗 (`server/llm/assistant/parse.ts`)

`message` は human readable な短文。

## 検索アシスタント

### API

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

### server 側 prompt 構築

`server/llm/assistant/prompt.ts` が `system prompt + few-shot examples + user input` の messages を組み立て、vLLM `/v1/chat/completions` (stream=true) を呼ぶ。

system prompt の方針:

- 役割: 「DDBJ ポータルの検索ビルダ向けに、ユーザーの自然文を field/op/value の条件群と combinator (AND / OR) に変換する」
- 出力 JSON schema (zod schema を文章で表現): `{ "combinator": "AND" | "OR", "conditions": [{ "field": "<advanced field id>", "op": "<advanced op id>", "value": "<string>" }] }`
- few-shot 3-5 例 (single keyword / multi keyword AND / OR / field filter / range filter のカバレッジ)
- 「JSON 以外を出力するな」 / 「`<advanced field id>` は portal の許容 enum から選べ」 等の制約

許容 enum の SSOT は `app/schemas/api-bff/llm.ts` の `ADVANCED_FIELDS` / `ADVANCED_OPS` / `ASSISTANT_COMBINATORS`。`server/llm/assistant/prompt.ts` がこれを `app/schemas/api-bff/` 経由で直接 import し、`app/features/search/types.ts` も同じ schema を re-export する。enum を増減すれば server / client の両方が同じ source を共有する。

### parse 失敗時

`server/llm/assistant/parse.ts` が vLLM 出力を JSON.parse + Zod 検証する。

- JSON が含まれない → `event: error` で `{ code: "no_json", message }`
- JSON.parse 失敗 → `event: error` で `{ code: "invalid_json", message }`
- schema 違反 (`AssistantProposal.safeParse` 失敗) → `event: error` で `{ code: "schema_violation", message }`
- 検証通過 → `event: done` で payload を流す

### 障害時の UI 連動

`event: error` を client (`useAssistantStream`) が受け取ったら:

1. state を `error` にする
2. `setProposal(null)` で既存提案をクリア
3. SearchAssistant が toast を出す + 元の input を入力欄に戻す (内容ロストを避ける)

client は `app/features/search/assistant/prompt-client.ts` の `useAssistantStream` が `event: message` を受信して streaming token を貯め、`event: done` の data を `AssistantProposal` として parse する。

## rate limit

### 単位

| 軸 | default | env |
|---|---|---|
| per-IP | 60 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` |
| per-session (sid cookie) | 30 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` |

`per-IP` は cookie / session が無い request に対する fallback。`per-session` は cookie あり時に追加で適用 (両方適用、厳しい方が効く)。

### アルゴリズム

固定 window で 1 分粒度のカウンタを in-memory Map (per-IP / per-session それぞれ 1 個) に持つ。sliding window でなく単純化 (window 境界で 2 倍まで流れ得る精度を許容)。cleanup は 5 分間隔 (session store と同じ間隔) で、古い window を破棄する。

固定 window の境界 burst (1 分の境界で最大 2x まで通り得る) は 1 instance 構成 + in-memory store の前提下で許容している。`auth.md` の session store 抽象と同じ拡張トリガ (multi-instance 化 / redis 化) で rate-limit state も共有 store に乗せる場合は sliding window への移行を併せて検討する。

### 超過時の応答

```
HTTP/1.1 429 Too Many Requests
Retry-After: <次の window までの秒数>
Content-Type: application/json

{ "error": "rate_limited", "axis": "ip" | "session" }
```

client は toast 「しばらくしてから再試行してください」 を出す。SSE 開始前なので `event: error` 経路は通らない。

### client IP の取得

`server/index.ts` で `trust proxy` を `loopback` に設定済。staging / production の reverse proxy 設定で `X-Forwarded-For` の信頼ホストを正しく制限する (`auth.md` の安全性前提と同じ)。

## PII redaction

prompt 内容そのものは vLLM に送るが、server **log** には PII を残さない。`server/lib/log.ts` の `redact` で次のキーを `[REDACTED]` 化する (既存実装):

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

## 環境変数

`DB_PORTAL_` prefix で統一する (`server/lib/env.ts` で Zod 検証)。server-only (`VITE_` 接頭辞は付けない、secret は client bundle に出さない)。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_LLM_BASE_URL` | (空) | vLLM の base URL。空ならアシスタント機能を完全停止 |
| `DB_PORTAL_LLM_API_KEY` | (空) | vLLM の Bearer token (vLLM 側で `--api-key` を設定している場合に使う) |
| `DB_PORTAL_LLM_MODEL` | `"Qwen/Qwen2.5-32B-Instruct-AWQ"` | model name (vLLM `--served-model-name` と一致) |
| `DB_PORTAL_LLM_TIMEOUT_MS` | `60000` | upstream timeout (cold start や大きい prompt のため長め)。`/v1/models` プローブは `min(timeoutMs, 10s)` で打ち切る |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` | `60` | per-IP rate limit (req / 分) |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` | `30` | per-session rate limit (req / 分) |

dev 環境では `DB_PORTAL_LLM_BASE_URL` を空にすると「LLM 未設定で AI 補助が消える状態」、dummy URL にすると「unreachable」 状態の挙動確認に使える。staging / production では実環境の vLLM URL + API key を設定する。

## テスト

### unit

| ファイル | 内容 |
|---|---|
| `tests/unit/server/llm/assistant-parse.test.ts` | 正常 JSON / 壊れた JSON / schema 違反の振り分け |
| `tests/unit/server/llm/rate-limit.test.ts` | window 境界、per-IP + per-session 同時適用、cleanup |
| `tests/unit/server/llm/redaction.test.ts` | email / phone / cc / token の正規表現 |

### PBT

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/llm/redaction-coverage.pbt.test.ts` | 任意の文字列に PII を挿入しても全パターン redact される |

## 追加機能の組み入れ方

LLM を使う新機能は BFF interface (`/api/llm/<feature>`) を追加し、prompt は機能ごとに `server/llm/<feature>/prompt.ts` を分けて持つ。tool calling / vision など vLLM 側の機能拡張は server flag (`--enable-auto-tool-choice` 等) で有効化する。

