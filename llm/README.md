# LLM サービングサーバー (GPU node)

DDBJ portal の LLM 統合用 vLLM サーバーを GPU node で podman-compose 起動するための構成。staging / production の portal app からは内部 LAN 経由で `http://l40s-03:3200` を叩く。

詳細仕様 (構成方針 / NW / 環境変数 / 運用) は [`../docs/llm.md`](../docs/llm.md) を SSOT として参照する。本 README は GPU node オペレータ向けの最小手順だけを置く。

## 前提

- GPU node: `nig-gpu-2` (実体 `l40s-03`、`~/.ssh/config` に設定済み、ProxyJump 経由)
- ランタイム: podman + `podman-compose` (Python 製、1.0.6 以降)
- clone 先: `~/db-portal-llm` (LLM 専用、staging / prod の clone とは分離)
- HF cache: `/data1/db-portal/llm/models` (Lustre は不可、プロジェクト固有パス)

## 初回セットアップ

```bash
ssh nig-gpu-2

# 1. clone
git clone git@github.com:ddbj/db-portal.git ~/db-portal-llm
cd ~/db-portal-llm/llm

# 2. .env を作成、値を埋める
cp env.example .env

#    - VLLM_API_KEY を生成して設定
openssl rand -hex 32      # 出力を .env の VLLM_API_KEY に貼る

#    - HF_HOME のディレクトリを作成 (env.example の既定値)
mkdir -p /data1/db-portal/llm/models

# 3. 起動
podman-compose up -d

# 4. healthy 待ち (初回 DL 込みで 5〜10 分、cache あり再起動なら 1 分前後)
podman ps
podman-compose logs -f vllm

# 5. ローカル疎通確認
curl -H "Authorization: Bearer $(grep ^VLLM_API_KEY .env | cut -d= -f2)" \
     http://localhost:3200/v1/models
```

## 日常運用

```bash
# ログ確認
podman-compose logs -f vllm

# 停止 (kill switch)
podman-compose down

# 再起動 (.env を変更した場合)
podman-compose up -d

# モデル更新 (.env の MODEL を書き換え後)
podman-compose down
podman-compose up -d
#   → 初回は HF cache に DL されるまで 5〜10 分
```

## トラブルシューティング

- **`podman compose` (docker-compose plugin 経由) は CDI device を解釈しない**。必ず Python 製の `podman-compose` を使う
- 起動直後に `unhealthy` でも、`start_period: 600s` の間は再起動されない
- VRAM 不足で OOM する場合は `.env` の `MAX_MODEL_LEN` を下げる、または `GPU_MEMORY_UTILIZATION` を 0.85 程度に下げる
- `vllm/vllm-openai:<tag>` は固定タグを使う。`latest` は禁止 (再現性 / 急な breaking change 回避)

## 関連

- 詳細仕様: [`../docs/llm.md`](../docs/llm.md)
- 設計議論記録: `../.claude/docs/llm-integration-plan.md`
- モデル評価ログ: `../.claude/docs/llm-experiment.md`
