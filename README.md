# BSI

BioData Science Initiative (BSI) のデータ登録とデータ検索を 1 つの入口にまとめた Web アプリケーション。研究者が「どこに登録すればよいか」「目的のデータをどう探すか」で迷わないことを目的とする。横断検索から登録手順の案内までを 1 つのアプリケーションで提供し、そのコードをこの 1 つのリポジトリに置く。

主な機能:

- 検索: 全データベースをまとめて検索する cross-DB と、1 つのデータベースに絞って検索する per-DB の 2 モードがある。利用者は Advanced builder で検索条件を細かく組み立て、Sidebar facet で検索結果を絞り込む
- AI クエリビルダー: 利用者が自然言語で書いた入力を、LLM が検索条件に変換する
- 登録ナビゲーション: 利用者がデータの性質を答えると、アプリが登録先を導出し、登録の流れを FlowStep カードで示す
- ニュース / サービス一覧: DDBJ と DBCLS の Web サイトの git リポジトリから、BFF (Backend For Frontend) が情報を取り込んで掲載する
- DDBJ Account 連携: 利用者は Keycloak でログインする。BFF が session を保持し、ブラウザには HttpOnly cookie だけを渡す
- 日本語 / 英語: 利用者が表示言語を切り替えられる

開発コマンドはすべて Docker Compose の container 内で実行する。セットアップと開発コマンドは [development.md](docs/development.md) を参照する。

## ドキュメント

### 前提

- [architecture.md](docs/architecture.md): ブラウザ・BFF・外部 API の 3 段構造、zone 分割と import 方向、SSR と CSR の境界、routing、性能、セキュリティ、アクセシビリティを扱う
- [development.md](docs/development.md): 開発環境のセットアップ、env ファイルの切り替え、container 内で実行する開発コマンド、トラブルシュートを扱う

### 共通の仕組み

- [frontend.md](docs/frontend.md): `app/ui/` の primitive、設計トークン、アクセシビリティの規約を扱う
- [content.md](docs/content.md): Markdown ページと TypeScript collection の 2 系統、Sidebar、パンくずリスト、全文検索、lastUpdated を扱う
- [i18n.md](docs/i18n.md): 表示言語を cookie で決める仕組み、英語訳が無いときの fallback、hreflang を扱う
- [api-types.md](docs/api-types.md): ddbj-search-api の OpenAPI 仕様から型を生成する手順と、生成した型を UI まで通す規約を扱う
- [entity-list.md](docs/entity-list.md): news と services が共有する mirror の cache、facet の集計、URL state、source 軸の表示を扱う
- [public-api.md](docs/public-api.md): プログラムと crawler に向けた `/llms.txt`、`/robots.txt`、`/sitemap.xml`、production 以外の noindex、`/api/` 配下の未知のアドレスへの 404 を扱う

### 機能

- [search.md](docs/search.md): cross-DB と per-DB の 2 モード、検索条件を AST (Abstract Syntax Tree) に集める 3 つの入力経路、Sidebar facet、Advanced builder、AI クエリビルダーによる提案を扱う
- [submit.md](docs/submit.md): 登録ナビゲーションの入力 4 軸、公開区分の導出、FlowStep カードへの経路導出を扱う
- [news.md](docs/news.md): BFF が ddbj/www と dbcls/website を mirror して `/api/news` で提供する仕組みと、NotificationBar / NewsAside / `/news` の 3 つの表示先を扱う
- [services.md](docs/services.md): BFF が DDBJ と DBCLS のサービス一覧を mirror して `/api/services` で提供する仕組みと、top page に表示する `featuredTop` の判定を扱う
- [auth.md](docs/auth.md): Keycloak との OIDC (OpenID Connect) 連携を、BFF と HttpOnly cookie と PKCE で行う仕組みを扱う
- [contact.md](docs/contact.md): 問い合わせ窓口ページで、相談内容ごとにどの窓口を案内するかと、宛先アドレスの提示方法を扱う
- [llm.md](docs/llm.md): vLLM を BFF 経由で使う AI クエリビルダーの SSE (Server-Sent Events) protocol、可用性の確認 (health)、rate limit、個人情報 (PII) の redaction を扱う

### 運用と品質

- [deployment.md](docs/deployment.md): dev / staging / production の 3 環境の構成、起動シーケンス、リリース、ログと監視、CI、トラブルシュート、secret rotation を扱う
- [llm/README.md](llm/README.md): GPU node で vLLM を起動する手順を、オペレータ向けに扱う
- [tests/README.md](tests/README.md): unit / PBT (property-based testing) / e2e の 3 階層と、mock してよい範囲のルールを扱う

## License

Copyright 2026 BioData Science Initiative (BSI).

Licensed under the Apache License, Version 2.0 (the "License"); you may not use the files in this repository except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>, or from the [`LICENSE`](LICENSE) file distributed with this repository.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
