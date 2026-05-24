# E2E Notes

設計上の制約・ハマりどころ。

## テスト間の独立性

- 各 spec の冒頭で cookie / localStorage をクリアする
- ログイン状態は spec 内で完結させ、跨いで共有しない

## staging 環境の retry / wait

- ddbj-search-api / Keycloak / vLLM / GitHub API の遅延を想定し、必要箇所で `expect().toBeVisible({ timeout: 10_000 })` 等を使う
- 一過性の 502 / 503 は `CI ? 1 : 0` の retry でカバーする

## 外部 API のレート制限

- GitHub Commits API は 60 req/h (匿名)。staging で複数 spec を回す場合は PAT を `GITHUB_TOKEN` 経由で渡す
- vLLM SSE は session 単位で rate limit が掛かるので、複数 spec で並列に AI 機能を叩かない

## 認証トークン

- `tests/e2e/.auth/` 配下に Playwright storage state を保存する (`.gitignore`)
- expire したらテスト失敗、新規取得は `tests/e2e/helpers.ts` の login helper を使う (今後追加)
