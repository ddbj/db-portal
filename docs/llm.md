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

GPU node には LLM 専用の clone を切り、staging / production の app clone とライフサイクルを分離する。

| 環境 | SSH | clone path |
|---|---|---|
| GPU node (LLM) | `ssh nig-gpu-2` | `~/db-portal-llm` |
| staging (app) | `ssh nig-a012-search` | `~/db-portal-staging` |
| production (app) | `ssh nig-a011-search` | `~/db-portal-prod` |

GPU node と staging / production node は home (Lustre) が共有されているが、LLM 用 clone は独立に保つ:

- 32B モデルの cold start (DL 込み 5〜10 分) を伴うので、app deploy と再起動タイミングを揃えたくない。
- 1 vLLM が staging / production 両方に応える "shared infra" であり、片方の clone に従属させない。
- portal app の `.env` と LLM の `.env` が物理的に分離され、関心が混ざらない。

## 環境変数 (`llm/env.example`)

| 変数 | 既定 | 説明 |
|---|---|---|
| `VLLM_IMAGE_TAG` | (必須) | `vllm/vllm-openai:<tag>`。検証済み版を指定、`latest` 禁止 |
| `VLLM_GPU_DEVICE` | `0` | 使用する GPU index (CDI device `nvidia.com/gpu=<n>`) |
| `VLLM_HOST_PORT` | `3200` | host bind port |
| `VLLM_API_KEY` | (必須) | Bearer key。`openssl rand -hex 32` で生成、portal app 側にも同値設定 |
| `MODEL` | `Qwen/Qwen2.5-32B-Instruct-AWQ` | 本番固定 |
| `SERVED_MODEL_NAME` | (空) | OpenAI 互換 API での別名。空なら `MODEL` のまま |
| `QUANTIZATION` | (空) | モデル config 自動検出。明示が必要なときのみ指定 |
| `MAX_MODEL_LEN` | `8192` | context window。VRAM 圧迫時は下げる |
| `GPU_MEMORY_UTILIZATION` | `0.92` | VRAM 割当 (weights + KV cache) |
| `TOKENIZER_MODE` / `CONFIG_FORMAT` / `LOAD_FORMAT` | (空) | Mistral 公式 native format 用、HF 形式は空 |
| `HF_HOME` | `/data1/db-portal/llm/models` | HuggingFace cache。GPU node ローカルの /data1 配下にプロジェクト固有パスで置く (Lustre 上は不可、overlayfs 非対応 / mmap 遅い) |

## 運用

### 起動 / 停止

```bash
cd ~/db-portal-llm/llm
podman-compose up -d              # 起動
podman-compose down               # 停止 (kill switch)
podman-compose logs -f vllm       # ログ追跡
```

詳細手順は `llm/README.md` を参照。

### モデル更新

1. `.env` の `MODEL` を書き換え
2. `podman-compose down && podman-compose up -d`
3. 初回は HF cache に DL されるまで 5〜10 分
4. staging 側の portal app で疎通確認後、production 側で利用

### イメージ更新

1. `.env` の `VLLM_IMAGE_TAG` を新しい固定タグに変更
2. `podman-compose pull && podman-compose up -d`
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

- `llm/compose.yml`, `llm/entrypoint.sh`, `llm/env.example`, `llm/README.md` — GPU node 構成
- `docs/deployment.md` — 環境一覧 (LLM node を含む)
- `docs/search.md`, `docs/search-backends.md` — 検索仕様 (LLM 補助対象)
- `docs/submit.md`, `docs/submit-details.md` — 登録ナビ仕様 (LLM 補助対象)
- `.claude/docs/llm-integration-plan.md` — 設計議論の記録 (議論経緯・代替案・保留事項)
- `.claude/docs/llm-experiment.md` — モデル評価ログ (採用根拠)
- `.claude/llm/` — 実験用コード保管 (bench / eval / prompts、本番運用では不使用)
