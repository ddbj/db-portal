# LLM Integration

DDBJ ポータルの LLM 機能は **vLLM (OpenAI compatible API、`DB_PORTAL_LLM_MODEL` で指定する model) を BFF が proxy する** 構造で動く。ブラウザは vLLM の URL や API key を一切知らず、BFF が「到達確認 (health) + SSE pass-through + rate limit + PII redaction」 を担う。未設定 / 未到達のとき UI 側で AI 補助機能を非表示にする。

データフロー全体図は `architecture.md`、検索アシスタント UI は `search.md` を参照。

## 方針

| 項目 | 値 |
|---|---|
| LLM backend | vLLM (OpenAI compatible API) |
| 接続 | server-side only (browser ↛ vLLM) |
| 健全性判定 | `/api/llm/health` で `unset` / `ok` / `unreachable` の 3 状態 |
| streaming | SSE pass-through (`event: message` / `event: done` / `event: error`)、15 秒間隔 heartbeat。`done` は BFF が `/db-portal/parse` で検証した ParseNode AST を載せる |
| rate limit | per-IP 60 req/min + per-session 30 req/min (env で上書き可) |
| 入出力 redaction | log は email / phone / クレジットカード / API key 風 token を `[REDACTED]` 化 |
| 未設定時 | `DB_PORTAL_LLM_BASE_URL` が空のとき BFF は `{status: "unset"}` を返し、`/api/llm/search-assistant` は 503 `{error: "llm_unset"}`、UI は AI 補助機能を hide |
| 未到達時 | health check が失敗のとき `{status: "unreachable", reason}`、UI は表示したまま (送信時に error event が流れる) |
| 用途 | AI 検索アシスタント (`/api/llm/search-assistant`) |

## サービング基盤

vLLM 本体は portal app とは別の GPU node で動く shared infra で、staging / production の app が同一インスタンスを共有する。app は接続するだけで、起動・モデル・GPU 割当は GPU node 側の責務。serving の構成・起動定義は `llm/` (`compose.yml` + `entrypoint.sh` + `README.md`)、serving 用 env は「環境変数」節の serving 表。

| 項目 | 値 |
|---|---|
| ランタイム | vLLM (OpenAI 互換 API)、podman-compose 起動 |
| イメージ | `docker.io/vllm/vllm-openai:<固定タグ>` (`latest` 禁止、再現性確保) |
| モデル | `Qwen/Qwen2.5-32B-Instruct-AWQ` |
| 量子化 | AWQ INT4 (model config から自動検出、`DB_PORTAL_LLM_QUANTIZATION` は空) |
| context length | 8,192 tokens (`DB_PORTAL_LLM_MAX_MODEL_LEN`) |
| GPU | 単一 GPU (`DB_PORTAL_LLM_GPU_DEVICE`、`gpu-memory-utilization` 0.92) |
| ネットワーク | 内部 LAN のみ、`--api-key` Bearer 認証 (公開 port / base URL は env と運用メモ) |
| restart policy | `unless-stopped`、container healthcheck で `GET /health` を監視 |

GPU を増設する場合は `--tensor-parallel-size` で対応する (現状 1 枚なので未指定)。

## デプロイ構成

vLLM は portal app の deploy clone とは別に、GPU node 上にリポジトリを独立 checkout し、その `llm/` で起動する。app の deploy とは別ライフサイクルで、1 つの vLLM を staging / production の app が共有する。具体的な host / clone path / API key 同期手順は git 管理外の運用メモが持つ。

- vLLM は staging / production を兼ねる単一インスタンスなので、container 名は環境 prefix を付けず `db-portal-llm` で固定する。
- GPU node の `.env` は app と同じ env テンプレート由来 (`cp env.staging .env`)。app 用変数 (Keycloak / Search / News 等) は GPU node では未使用で、`DB_PORTAL_LLM_*` のみ参照する。
- `DB_PORTAL_LLM_API_KEY` は app node と GPU node で同値にする。app が Bearer として送り、vLLM が検証する。
- HF cache (`DB_PORTAL_LLM_HF_HOME`) は GPU node ローカルディスクに置く。共有 FS (Lustre) 上は overlayfs 非対応 / mmap が遅く不可。
- モデル / イメージ更新は GPU node の `.env` を書き換えて `podman-compose down && up -d`。cold start は cache 無しで数分かかる。手順は `llm/README.md`。

## データフロー

```
[Browser]
   │ POST /api/llm/search-assistant ({ input, mode, current })
   │ Accept: text/event-stream
   ▼
[BFF (server/llm/)]
   │ rate-limit check (per-IP, per-session)
   │ redaction (log のみ、prompt はそのまま vLLM へ)
   │ prompt 構築 (system + few-shot + user input)
   │   mode=append のとき current (現ビルダー DSL) を "Current query:" として差し込む
   ▼
[vLLM]
   │ /v1/chat/completions (stream=true) → 1 行 DSL 文字列を生成
   ▼
[BFF]
   │ delta は event: message でそのまま pass-through
   │ 完了後: DSL 文字列を抽出 → 非対応の ~ / ^ を除去 → /db-portal/parse で検証
   │   event: message  data: <delta token>
   │   event: done     data: <ParseNode AST (検証済み)>
   │   event: error    data: { code, message }
   │ 15 秒間隔で `: heartbeat\n\n` を空コメントで出力
   ▼
[Browser] useAssistantStream が done の AST を受け取る
          (/search はカードで提案レビュー → 「適用」、top / results は提案を見せず
           serialize → /search/results へ遷移。search.md § 提案の反映)
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

health 状態は `server/llm/health.ts` の `setActiveHealth` で memory に保持し、`/api/llm/health` handler は `getActiveHealth` の値を返すだけ (request ごとに vLLM を叩かない)。env 空 (`unset`) のときは polling timer も立ち上げない。

### client での消費

`app/features/search/assistant/llm-availability.ts` の `useLlmAvailability` が TanStack Query で 5 分間隔 polling する。

- `health.status === "ok"` → `{ ready: true }`
- `health.status === "unset"` → `{ ready: false, reason: "unset" }`
- `health.status === "unreachable"` → `{ ready: true, reason: health.reason, health }` (UI は表示し、送信時の SSE error 経路で fail を通知する)

`SearchAssistant` component は `availability.ready` が false (= `unset`) なら何も render しない。`unreachable` のときは UI は出るが、送信時に SSE の `event: error` が `upstream-disconnect` などで流れ、box 直下の inline エラー文言 (`search.assistant.generateError`) でエラーが伝わる。

## SSE 仕様

### event 名

| event | 用途 | data |
|---|---|---|
| `message` | token streaming (vLLM の delta) | delta 文字列 (一連の連結で full DSL 文字列) |
| `done` | 完了通知 | 検証済み ParseNode AST (検索アシスタント。BFF が `/db-portal/parse` で得た木) |
| `error` | エラー通知 | `{ "code": "string", "message": "string" }` |

`event:` を省略した SSE は `message` 扱い。ただし portal は明示的に `event: message` / `event: done` / `event: error` のいずれかを出す (client 実装の単純化のため)。

### heartbeat

stream を `start()` した直後に `: stream-open\n\n` を 1 度送出し、以降 15 秒間隔で空コメント `: heartbeat\n\n` を出力する。中継 proxy の idle timeout (Express / Nginx) で接続が切れるのを防ぐ。

### 接続切断 / エラー

| 状況 | server 動作 | client 動作 |
|---|---|---|
| vLLM が 200 以外を返した | `event: error` で `{ code: "upstream-status", message }` を流して close | inline エラー文言を表示 + 入力を保持 |
| vLLM が socket close | `event: error` で `{ code: "upstream-disconnect", ... }` | 同上 |
| BFF rate limit 超過 | HTTP 429 で JSON `{ error: "rate_limited" }` (SSE 開始前) | 他のエラーと同じ inline エラー文言を表示 (専用文言なし) |
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
- `no_dsl`: vLLM 出力から DSL 文字列を抽出できなかった (`server/llm/assistant/parse.ts`)
- `invalid_dsl`: 抽出した DSL を `/db-portal/parse` が 400 で弾いた (許容外 field / 構文エラー)

`message` は human readable な短文。`invalid_dsl` は parse の problem `detail` を載せる。

## 検索アシスタント

### API

```
POST /api/llm/search-assistant
Content-Type: application/json
Accept: text/event-stream

Body:
  { "input": "<natural language>",
    "mode":  "new" | "append",        (省略時 new)
    "current": <現クエリの ParseNode AST> }  (append のとき必須、new では無視。
                                              BFF が DSL に serialize して prompt に差し込む)

Response: SSE
  event: message  data: <delta token>      (複数回、DSL 文字列の delta)
  event: done     data: <ParseNode AST>     (検証済み)
  event: error    data: { "code", "message" }
```

vLLM は自然文を **1 行の Advanced-Search DSL 文字列** に変換する (フルスペック: `AND` / `OR` / `NOT` / グルーピング)。BFF は完了後に DSL を抽出・検証し、`event: done` には `/db-portal/parse` が返した **ParseNode AST** を載せる。client での反映は経路で分かれる: `/search` は read-only preview (`ProposalConditions`) に出して「適用」操作で Advanced state へ反映、top / results は提案を見せず AST を serialize して `/search/results` へ遷移する (`search.md` § 提案の反映)。`mode=append` のとき BFF は `current` を DSL に serialize して prompt に差し込み、vLLM が既存条件を保持したまま融合した完全な DSL を返す。results の `current` は現クエリ全体 (keyword + facet + 構造化条件) の AST。

### server 側 prompt 構築

`server/llm/assistant/prompt.ts` が `system prompt + few-shot examples + user input` の messages を組み立て、vLLM `/v1/chat/completions` (stream=true、temperature=0) を呼ぶ。

system prompt の方針 (出力は 1 行 DSL 文字列、JSON ではない):

- 役割: 「自然文 (日英) を DDBJ ポータルの Advanced-Search DSL の 1 行に変換する。DSL のみを出力 (説明・コードフェンス無し)」
- 2 モード: `Current query:` が無ければ新規生成、有れば既存条件を完全保持して融合 (append)
- 出力は常に最低 1 条件を持つ 1 行 DSL。非対応の入力 (許容 field 外・fuzzy `~`・boost `^`) は description に押し込まず省き、残りから最も近い valid query を組む
- few-shot は両モード・難所 (precedence / NOT / 日付番兵 / organism / append 融合) を実演する

変換規約 (allowed field・organism 通称→学名・date 範囲と番兵・`AND`/`OR`/`NOT` の precedence と括弧・非対応文字の扱い) の SSOT は `server/llm/assistant/prompt.ts` の `SYSTEM_PROMPT` と few-shot。許容 field/op は `app/schemas/api-bff/llm.ts` の `ADVANCED_FIELDS` / `ADVANCED_OPS`、最終判定は **ddbj-search-api の allowlist** (`/db-portal/parse` が検証) が SSOT。prompt の field 列は `ADVANCED_FIELDS` と一致させる。

### DSL 抽出・検証 (parse 失敗時)

`server/llm/assistant/parse.ts` が vLLM 出力を 1 行 DSL に正規化し、`/db-portal/parse` で検証する。

- 出力からコードフェンス除去・先頭行抽出で DSL 候補を得る。空なら `event: error` `{ code: "no_dsl", message }`
- 非対応の fuzzy `~N` / boost `^N` を除去する (モデルが稀に残すため)
- `GET /db-portal/parse?q=<DSL>` (per-DB アシスタントは `&db=<id>`) を呼ぶ
  - 200 → `event: done` に返却 AST を載せる
  - 400 → `event: error` `{ code: "invalid_dsl", message: <problem detail> }`
  - 5xx / network → 短い retry 後 `upstream-disconnect`

`/db-portal/parse` の base URL は `DB_PORTAL_SEARCH_API_URL` (search API と共用、`server/lib/env.ts`)。

### 障害時の UI 連動

`event: error` を client (`useAssistantStream`) が受け取ったら state を `error` にし、proposal は出さない (= 遷移しない)。`/search` の統合入力ではプロンプトを入力欄に残し、top / results の `NavigableSearchInput` は box 直下に inline のエラー文言 (`search.assistant.generateError`) を出して入力を保つ。いずれも内容ロストを避け、ユーザーが入力を変えて再送できる。

client は `app/features/search/assistant/prompt-client.ts` の `useAssistantStream` が `event: message` を受信して streaming token を貯め、`event: done` の data を ParseNode AST として受け取り proposal state に入れる (lift 不要、BFF が検証済み)。

## rate limit

### 単位

| 軸 | default | env |
|---|---|---|
| per-IP | 60 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` |
| per-session (sid cookie) | 30 req/min | `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` |

`per-IP` は全 request に常時適用する。`per-session` は cookie (`sid`) を持つ request にのみ追加で評価する (両方適用、先に超過した軸で 429)。

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

client は HTTP status が ok でないことを検知し、他のエラーと同じ inline エラー文言 (`search.assistant.generateError`) を出す (rate limit 専用の文言は持たない)。SSE 開始前なので `event: error` 経路は通らず、HTTP status で判定する。

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

`DB_PORTAL_` prefix で統一する。app が読む BFF 変数は `server/lib/env.ts` で Zod 検証する (server-only、`VITE_` 接頭辞は付けず secret を client bundle に出さない)。serving 変数 (2 つ目の表) は GPU node の `llm/compose.yml` + `entrypoint.sh` だけが読み、app は参照しない。

### BFF (app が参照)

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_LLM_BASE_URL` | (空) | vLLM の base URL。空ならアシスタント機能を完全停止 |
| `DB_PORTAL_LLM_API_KEY` | (空) | vLLM の Bearer token (vLLM 側で `--api-key` を設定している場合に使う) |
| `DB_PORTAL_LLM_MODEL` | `"Qwen/Qwen2.5-32B-Instruct-AWQ"` | model name (vLLM `--served-model-name` と一致) |
| `DB_PORTAL_LLM_TIMEOUT_MS` | `60000` | upstream timeout (cold start や大きい prompt のため長め)。`/v1/models` プローブは `min(timeoutMs, 10s)` で打ち切る |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN` | `60` | per-IP rate limit (req / 分) |
| `DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN` | `30` | per-session rate limit (req / 分) |

dev 環境では `DB_PORTAL_LLM_BASE_URL` を空にすると「LLM 未設定で AI 補助が消える状態」、dummy URL にすると「unreachable」 状態の挙動確認に使える。staging / production では実環境の vLLM URL + API key を設定する。

### serving (GPU node の vLLM)

`DB_PORTAL_LLM_MODEL` / `DB_PORTAL_LLM_API_KEY` は BFF と serving で共有する (同じ .env の 1 変数を app と vLLM の両方が参照)。以下は serving 専用で、app node の `.env` にも同居するが app は使わない。dev は GPU が無く vLLM を起動しないので `env.dev` には serving 変数を置かない。

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DB_PORTAL_LLM_IMAGE_TAG` | (必須) | `vllm/vllm-openai:<tag>` の検証済み固定タグ。`latest` 禁止 |
| `DB_PORTAL_LLM_GPU_DEVICE` | `0` | CDI device `nvidia.com/gpu=<n>` の index |
| `DB_PORTAL_LLM_HOST_PORT` | `3200` | host bind port (container 8000 へ) |
| `DB_PORTAL_LLM_MAX_MODEL_LEN` | `8192` | context window。VRAM 圧迫時は下げる |
| `DB_PORTAL_LLM_GPU_MEMORY_UTILIZATION` | `0.92` | VRAM 割当 (weights + KV cache) |
| `DB_PORTAL_LLM_HF_HOME` | (必須) | HuggingFace cache パス。GPU node ローカルディスクに置く (共有 FS 不可) |
| `DB_PORTAL_LLM_SERVED_MODEL_NAME` | (空) | OpenAI API 上の別名。空なら `DB_PORTAL_LLM_MODEL` のまま |
| `DB_PORTAL_LLM_QUANTIZATION` | (空) | 量子化方式。空なら model config から自動検出 (AWQ) |
| `DB_PORTAL_LLM_TOKENIZER_MODE` / `DB_PORTAL_LLM_CONFIG_FORMAT` / `DB_PORTAL_LLM_LOAD_FORMAT` | (空) | 非 HF 形式モデル用。HF 形式は空 |

## テスト

### unit

| ファイル | 内容 |
|---|---|
| `tests/unit/server/llm/assistant-parse.test.ts` | DSL 抽出 (フェンス除去 / 先頭行) / fuzzy `~` ・ boost `^` strip / parse 200・400 の振り分け |
| `tests/unit/server/llm/rate-limit.test.ts` | window 境界、per-IP + per-session 同時適用、cleanup |
| `tests/unit/server/llm/redaction.test.ts` | email / phone / cc / token の正規表現 |

### PBT

| ファイル | 内容 |
|---|---|
| `tests/pbt/server/llm/redaction-coverage.pbt.test.ts` | 任意の文字列に PII を挿入しても全パターン redact される |
| `tests/pbt/server/llm/dsl-strip.pbt.test.ts` | 任意の文字列から fuzzy `~` / boost `^` を除去しても残留しない / 非対応文字を含まない入力は trim のみで不変 |

## 追加機能の組み入れ方

LLM を使う新機能は BFF interface (`/api/llm/<feature>`) を追加し、prompt は機能ごとに `server/llm/<feature>/prompt.ts` を分けて持つ。tool calling / vision など vLLM 側の機能拡張は server flag (`--enable-auto-tool-choice` 等) で有効化する。

