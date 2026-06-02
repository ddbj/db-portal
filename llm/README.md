# LLM serving (GPU node)

DDBJ portal の AI 補助機能が使う vLLM サーバーを GPU node で起動するための構成。staging / production の portal app は、この 1 インスタンスを共有して参照する。

構成方針 / ネットワーク / 環境変数 / 運用の詳細仕様は [`../docs/llm.md`](../docs/llm.md) が SSOT。本 README は GPU node オペレータ向けの最小手順だけを置く。実際の SSH host / clone 先 / HF cache パスは運用環境ごとに異なるため、ここではプレースホルダ (`<...>`) と env 参照で示す。

## 前提

- GPU node (CDI で GPU を渡せる host)
- ランタイム: podman + `podman-compose` (Python 製、1.0.6 以降)
- checkout: app の deploy clone とは独立した作業ディレクトリ
- HF cache: `DB_PORTAL_LLM_HF_HOME` の指すパス (GPU node ローカルディスク、共有 FS 不可)

## 初回セットアップ

```bash
ssh <gpu-node>
git clone <repo-url> <checkout-dir>     # clone 済みなら git pull --ff-only
cd <checkout-dir>

# 1. env テンプレートを .env にコピー
cp env.staging .env

# 2. .env の DB_PORTAL_LLM_API_KEY を設定 (app node と同値にする)
openssl rand -hex 32     # 出力を .env の DB_PORTAL_LLM_API_KEY= に貼る

# 3. HF cache ディレクトリを作成 (初回のみ。DB_PORTAL_LLM_HF_HOME のパス)
mkdir -p "$(grep ^DB_PORTAL_LLM_HF_HOME .env | cut -d= -f2)"

# 4. llm/ で .env を symlink (podman-compose は cwd の .env を読む)
cd llm
ln -sf ../.env .env

# 5. 起動
podman-compose up -d

# 6. healthy 待ち (初回 DL 込みで 5〜10 分、cache ありの再起動なら 1 分前後)
podman ps
podman-compose logs -f vllm

# 7. ローカル疎通確認 (port は .env の DB_PORTAL_LLM_HOST_PORT)
curl -H "Authorization: Bearer $(grep ^DB_PORTAL_LLM_API_KEY ../.env | cut -d= -f2)" \
     "http://localhost:$(grep ^DB_PORTAL_LLM_HOST_PORT ../.env | cut -d= -f2)/v1/models"
```

## 日常運用

```bash
cd <checkout-dir>/llm

podman-compose logs -f vllm     # ログ確認
podman-compose down             # 停止 (kill switch)
podman-compose up -d            # 起動 / 再起動 (../.env 変更後)
```

### モデル / イメージ更新

```bash
cd <checkout-dir>
# モデル変更:   .env の DB_PORTAL_LLM_MODEL を書き換え
# イメージ変更: .env の DB_PORTAL_LLM_IMAGE_TAG を新しい固定タグに変更
cd llm
podman-compose pull             # イメージ更新時のみ
podman-compose down && podman-compose up -d
# 初回モデル DL は 5〜10 分。app 側で疎通確認後、必要なら同じ値を app node の .env にも反映
```

## トラブルシューティング

- **`podman compose` (docker-compose plugin) は CDI device を解釈しない**。必ず Python 製の `podman-compose` を使う
- 起動直後の `unhealthy` は `start_period` (600s) の間は再起動されない (cold start 許容)
- VRAM 不足で OOM するときは `.env` の `DB_PORTAL_LLM_MAX_MODEL_LEN` を下げる、または `DB_PORTAL_LLM_GPU_MEMORY_UTILIZATION` を 0.85 程度に下げる
- イメージタグは固定。`latest` は使わない (再現性 / 急な breaking change 回避)

## 関連

- 詳細仕様: [`../docs/llm.md`](../docs/llm.md)
- デプロイ運用: [`../docs/deployment.md`](../docs/deployment.md)
