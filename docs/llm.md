# LLM 統合

DB ポータルにおける LLM (大規模言語モデル) サービングの構成・運用仕様。

検索クエリ補助 (自然文 → DSL 変換、DB 推奨、organism サジェスト 等) と登録補助 (leaf 判定、データ種別判定、登録窓口判定 等) で利用する。

## 全体構成

```
[User Browser]
   ↓ HTTPS  portal.ddbj.nig.ac.jp/api/llm/*
[DDBJ 上流 Nginx]              … ddbj/service-gateway-conf で管理 (本リポジトリ対象外)
   ↓
[portal app  (a011 / a012)]    … BFF 層 (rate limit, PII redaction, ロギング, SSE pass-through)
   ↓ 内部 LAN HTTP + Bearer API key
[vLLM container  (l40s-03:3200 → 8000)]
```

- portal app は staging (`a012`) / production (`a011`) で稼働 (`docs/deployment.md`)。
- vLLM は GPU node `nig-gpu-2` (実体 `l40s-03`) で 1 インスタンスのみ稼働する shared infra。staging / production の portal app は同一 vLLM を共有する。

## サービング基盤

| 項目 | 値 |
|---|---|
| ランタイム | vLLM (OpenAI 互換 API) |
| イメージ | `vllm/vllm-openai:<固定タグ>` (`latest` 禁止) |
| モデル | `Qwen/Qwen2.5-32B-Instruct-AWQ` (本番固定) |
| 量子化 | AWQ INT4 (`auto` 検出、`QUANTIZATION` は空) |
| Context length | 8,192 tokens |
| GPU | NVIDIA L40S × 1 枚 (46 GB VRAM、`gpu-memory-utilization` 0.92) |
| Prefix caching | 有効 (vLLM v0.5+ デフォルト ON) |
| restart policy | `unless-stopped` |

採用根拠と評価過程は `.claude/docs/llm-experiment.md` (6 モデル × 25 タスクの比較) を参照。

将来 GPU を増設する場合は `--tensor-parallel-size` で対応する設計。

## ネットワーク構成

- vLLM コンテナは `0.0.0.0:8000` で listen し、GPU node の host port `3200` に bind する (`compose.yml` の `ports`)。
- 外部公開はせず、内部 LAN からのみ到達可能。
- `--api-key` による Bearer 認証で defense-in-depth。
- portal app の BFF (`app/routes/api.llm.chat.ts` 等、未実装) が `http://l40s-03:3200` を叩く。

### ポート予約 (nig-gpu-2)

| ポート | 用途 |
|---|---|
| 3200 | vLLM メイン |
| 3201 - 3208 | 予備 (将来モデル増設バッファ) |
| 3209 | vLLM `--metrics` exporter (Prometheus 連携の余地) |

### 内部疎通実測 (2026-05-07)

| From | To | HTTP | Latency |
|---|---|---:|---:|
| a012 | `l40s-03:3200` (DNS → IB) | 200 | 3.6 ms |
| a012 | `172.19.27.113:3200` (Ethernet) | 200 | 3.2 ms |
| a011 | `l40s-03:3200` (DNS → IB) | 200 | 5.6 ms |
| a011 | `172.19.27.113:3200` (Ethernet) | 200 | 3.2 ms |

portal app の BFF からは DNS 名 `l40s-03` 経由で疎通。

## デプロイ構成

GPU node の vLLM は **staging clone (`~/db-portal-staging`) と同居**させる。Lustre 経由で a012 (portal app) と nig-gpu-2 (vLLM) が同一 clone を共有し、`<repo_root>/.env` 1 つで両方の設定 (Keycloak / LLM) を保持する。production (`~/db-portal-prod`) は別 clone・別 `.env` だが、`LLM_*` 関連だけ staging と同値に揃える運用。

| 役割 | node | SSH | clone path | compose 実行ディレクトリ |
|---|---|---|---|---|
| portal app (staging) | a012 | `ssh nig-a012-search` | `~/db-portal-staging` | リポジトリルート |
| portal app (production) | a011 | `ssh nig-a011-search` | `~/db-portal-prod` | リポジトリルート |
| vLLM サービング (staging/prod 共有) | nig-gpu-2 (l40s-03) | `ssh nig-gpu-2` | **`~/db-portal-staging`** (a012 と同一 Lustre 実体) | `~/db-portal-staging/llm/` |

staging に同居させる理由:

- 1 vLLM が staging / production 両方に応える shared infra。production clone (`~/db-portal-prod`) に従属させると、staging から先行検証する流れと整合しない
- 同じ Lustre 上の `.env` 1 つで `LLM_API_KEY` を a012 と GPU node が共有でき、key 同期手作業が減る
- 32B モデルの cold start (DL 込み 5〜10 分) があるので、staging app の deploy と vLLM の再起動を別立てで運用する。同じ clone でも compose 実行ディレクトリ (リポジトリルート vs `llm/`) で分離されている

production との同期は別途、`LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` を `env.production` 由来の `~/db-portal-prod/.env` にも同値で入れる。

## 環境変数

`<repo_root>/.env` に `LLM_*` で統一して定義する。BFF と vLLM コンテナの両方が同じ 1 つの変数を参照し、値の重複は持たない。

| 変数 | 既定 | 説明 | 使う場所 |
|---|---|---|---|
| `LLM_BASE_URL` | `http://l40s-03:3200` | BFF が vLLM を叩く URL | BFF |
| `LLM_API_KEY` | (必須) | Bearer key。`openssl rand -hex 32` で生成 | BFF + vLLM |
| `LLM_MODEL` | `Qwen/Qwen2.5-32B-Instruct-AWQ` | `vllm serve` の引数 + BFF リクエストの `model` フィールド | BFF + vLLM |
| `LLM_IMAGE_TAG` | (必須) | `docker.io/vllm/vllm-openai:<tag>` の検証済み版。`latest` 禁止 | vLLM |
| `LLM_GPU_DEVICE` | `0` | CDI device `nvidia.com/gpu=<n>` の index | vLLM |
| `LLM_HOST_PORT` | `3200` | host bind port | vLLM |
| `LLM_MAX_MODEL_LEN` | `8192` | context window。VRAM 圧迫時は下げる | vLLM |
| `LLM_GPU_MEMORY_UTILIZATION` | `0.92` | VRAM 割当 (weights + KV cache) | vLLM |
| `LLM_HF_HOME` | `/data1/db-portal/llm/models` | HuggingFace cache。GPU node ローカルの /data1 配下にプロジェクト固有パスで置く (Lustre 上は不可、overlayfs 非対応 / mmap 遅い) | vLLM |
| `LLM_SERVED_MODEL_NAME` | (空) | OpenAI 互換 API での別名。空なら `LLM_MODEL` のまま | vLLM |
| `LLM_QUANTIZATION` | (空) | モデル config 自動検出。明示が必要なときのみ指定 | vLLM |
| `LLM_TOKENIZER_MODE` / `LLM_CONFIG_FORMAT` / `LLM_LOAD_FORMAT` | (空) | Mistral 公式 native format 用、HF 形式は空 | vLLM |

`env.staging` には全変数、`env.production` には BFF 用 (`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`) のみ入れる。`env.dev` は LLM を使わない前提で触らない。

## 運用

### 起動 / 停止

```bash
cd ~/db-portal-staging/llm
ln -sf ../.env .env                # 初回のみ。podman-compose が dotenv として読む
podman-compose up -d               # 起動
podman-compose down                # 停止 (kill switch)
podman-compose logs -f vllm        # ログ追跡
```

詳細手順は `llm/README.md` を参照。

### モデル更新

1. `~/db-portal-staging/.env` の `LLM_MODEL` を書き換え
2. `cd ~/db-portal-staging/llm && podman-compose down && podman-compose up -d`
3. 初回は HF cache に DL されるまで 5〜10 分
4. staging 側の portal app で疎通確認後、production 側 (`~/db-portal-prod/.env`) の `LLM_MODEL` も同値に揃える

### イメージ更新

1. `~/db-portal-staging/.env` の `LLM_IMAGE_TAG` を新しい固定タグに変更
2. `cd ~/db-portal-staging/llm && podman-compose pull && podman-compose up -d`
3. staging で 1 週間運用 → production 切替

### ロギング

BFF (portal app) 側で以下を保存:

| 保存する | 保存しない |
|---|---|
| request_id, timestamp | **入力本文 (prompt)** |
| anonymous_session_id (cookie hash, salted) | **出力本文 (completion)** |
| user_id (Keycloak `sub` があれば) | – |
| prompt_template_id, model_id | – |
| input_tokens, output_tokens | – |
| ttft_ms, total_ms | – |
| status, error_class | – |

- PII redaction (メール / 電話) を BFF で前段実行。
- 保持期間: 90 日 → ローテート削除。

### Rate limit

| 層 | 推奨値 |
|---|---|
| 入力長 | 1,000 文字 |
| 出力 (`max_tokens`) | 用途別 (256 / 512 / 768) |
| 並列 (cookie 単位) | 1 |
| Rate limit (cookie 単位) | 30 req/min, 200 req/hour |
| 全体並列 (vLLM 直前) | 8 |
| Queue 待機上限 | 10 秒、超過で 503 |

- 主軸は cookie session 単位 (NAT 配下を許容)。
- ログイン必須にしない (検索補助・登録窓口判定は未ログインで使えるべき)。
- 将来「ログイン時 rate limit 緩和」を入れられるよう設計に差込口を残す (`LOGIN_MULTIPLIER` 設定値)。
- DoS 級防御は上流 Nginx の責務、BFF はノータッチ。

### 緊急停止 (kill switch)

- GPU node 側: `podman-compose down`
- BFF 側: `LLM_FEATURE_DISABLED=true` で即 503 を返す (未実装、BFF 実装時に組み込む)

## 未実装スコープ

以下は別フェーズで実装する。設計議論の記録は `.claude/docs/llm-integration-plan.md` を参照。

- **BFF**: `app/routes/api.llm.chat.ts` (SSE pass-through、認証連携)
- **プロンプト**: `app/server/llm/prompts/{search-query,search-query.en,submit-help,submit-help.en}.md` (prefix caching を意識した 2 層構造)
- **rate limit / PII redaction / logging** ミドルウェア
- **`LLM_FEATURE_DISABLED` kill switch**
- **UX / UI**: 検索バー横配置 / 提案採用フロー / コマンドパレット 等の統合パターン (保留中、既存 UI と合わせて再考)

## 関連ファイル

- `llm/compose.yml`, `llm/entrypoint.sh`, `llm/README.md` — GPU node 構成 (テンプレ env は `env.staging` に統合)
- `env.staging`, `env.production` — `LLM_*` 変数のテンプレ
- `docs/deployment.md` — 環境一覧 (LLM node を含む)
- `docs/search.md`, `docs/search-backends.md` — 検索仕様 (LLM 補助対象)
- `docs/submit.md`, `docs/submit-details.md` — 登録ナビ仕様 (LLM 補助対象)
- `.claude/docs/llm-integration-plan.md` — 設計議論の記録 (議論経緯・代替案・保留事項)
- `.claude/docs/llm-experiment.md` — モデル評価ログ (採用根拠)
- `.claude/llm/` — 実験用コード保管 (bench / eval / prompts、本番運用では不使用)
