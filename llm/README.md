# LLM サービングサーバー (GPU node)

DDBJ portal の LLM 統合用 vLLM サーバーを GPU node で podman-compose 起動するための構成。staging clone (`~/db-portal-staging`) を Lustre 経由で a012 (portal app) と GPU node (LLM) が共有し、`<repo_root>/.env` 1 本で両方の設定を持つ。

詳細仕様 (構成方針 / NW / 環境変数 / 運用) は [`../docs/llm.md`](../docs/llm.md) を SSOT として参照する。本 README は GPU node オペレータ向けの最小手順だけを置く。

## 前提

- GPU node: `nig-gpu-2` (実体 `l40s-03`、`~/.ssh/config` に設定済み、ProxyJump 経由)
- ランタイム: podman + `podman-compose` (Python 製、1.0.6 以降)
- clone: `~/db-portal-staging` (a012 と Lustre 上で共有)
- HF cache: `/data1/db-portal/llm/models` (Lustre は不可)

## 初回セットアップ

```bash
ssh nig-gpu-2
cd ~/db-portal-staging        # a012 deploy で既に clone 済みの前提
git pull --ff-only

# 1. .env が無ければテンプレからコピー (通常は a012 デプロイ時に作成済み)
[ -f .env ] || cp env.staging .env

# 2. .env に LLM_API_KEY を設定 (a012 側の .env と同じ Lustre ファイルなので 1 か所更新で両方反映)
openssl rand -hex 32    # 出力を .env の LLM_API_KEY= に貼る

# 3. HF_HOME ディレクトリ作成 (初回のみ)
mkdir -p /data1/db-portal/llm/models

# 4. llm/ で .env を symlink (compose の dotenv は cwd を見るため)
cd llm
ln -sf ../.env .env

# 5. 起動
podman-compose up -d

# 6. healthy 待ち (初回 DL 込みで 5〜10 分、cache あり再起動なら 1 分前後)
podman ps
podman-compose logs -f vllm

# 7. ローカル疎通確認
curl -H "Authorization: Bearer $(grep ^LLM_API_KEY ../.env | cut -d= -f2)" \
     http://localhost:3200/v1/models
```

## 日常運用

```bash
cd ~/db-portal-staging/llm

# ログ確認
podman-compose logs -f vllm

# 停止 (kill switch)
podman-compose down

# 再起動 (../.env を変更した場合)
podman-compose up -d

# モデル更新 (../.env の LLM_MODEL を書き換え後)
podman-compose down
podman-compose up -d
#   → 初回は HF cache に DL されるまで 5〜10 分
```

## トラブルシューティング

- **`podman compose` (docker-compose plugin 経由) は CDI device を解釈しない**。必ず Python 製の `podman-compose` を使う
- 起動直後に `unhealthy` でも、`start_period: 600s` の間は再起動されない
- VRAM 不足で OOM する場合は `../.env` の `LLM_MAX_MODEL_LEN` を下げる、または `LLM_GPU_MEMORY_UTILIZATION` を 0.85 程度に下げる
- `docker.io/vllm/vllm-openai:<tag>` は固定タグ。`latest` は禁止 (再現性 / 急な breaking change 回避)

## 関連

- 詳細仕様: [`../docs/llm.md`](../docs/llm.md)
- 設計議論記録: `../.claude/docs/llm-integration-plan.md`
- モデル評価ログ: `../.claude/docs/llm-experiment.md`
