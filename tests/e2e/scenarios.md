# E2E Scenarios

Playwright を staging URL に対して回す。各シナリオはペルソナ / 前提 / 手順 / 期待 を持つ。

## Personas

| ID | 名前 | 認証 |
|---|---|---|
| P-ANON | 未認証ユーザー | なし |
| P-USER | 一般ユーザー (DDBJ Account login) | Keycloak JWT |

## Domains

| Domain | 接頭辞 | 説明 |
|---|---|---|
| TOP | `S-TOP` / `E-TOP` | トップページ |
| SEARCH | `S-SEARCH` / `E-SEARCH` | 検索ビルダ / 結果 |
| SUBMIT | `S-SUBMIT` / `E-SUBMIT` | 登録ナビ |
| NEWS | `S-NEWS` / `E-NEWS` | ニュース一覧 |
| AUTH | `S-AUTH` / `E-AUTH` | サインイン / サインアウト |
| LLM | `S-LLM` / `E-LLM` | AI アシスタント |
| CONTENT | `S-CONTENT` / `E-CONTENT` | データベース解説 |
| FLOW | `S-FLOW` / `E-FLOW` | 機能横断シナリオ |
