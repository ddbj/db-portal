import type { Logger } from "../../../../server/lib/log"

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

/**
 * DDBJ services.yml の最小サンプル。
 * - BioProject: provider DDBJ、tags database+submission (→ repository)、相対 URL、featuredTop
 * - DFAST: tags analysis/submission/annotation、description に HTML、featuredTop 外
 * - TXSearch: 絶対 URL、tags search
 * - DDBJ-LD: tags database
 * - TogoVar: provider DBCLS (DDBJ 出力から除外されるべき)
 * - NoTagService: tags 空 (→ other)
 */
export const ddbjYaml = `items:
  - name: BioProject
    formal_name: Biological data related to a single project.
    service_link:
      en: /bioproject/index-e.html
      ja: /bioproject/index.html
    description:
      en: A BioProject is a collection of biological data.
      ja: BioProject はデータをとりまとめます。
    provider: DDBJ
    tags:
      - database
      - submission
  - name: DFAST
    service_link:
      en: https://dfast.ddbj.nig.ac.jp/
      ja: https://dfast.ddbj.nig.ac.jp/
    description:
      en: DFAST generates <a href="https://example.com">an annotation file</a> for submission.
      ja: 原核生物ゲノムの自動アノテーション。
    provider: DDBJ
    tags:
      - analysis
      - submission
      - annotation
  - name: TXSearch
    service_link:
      en: https://ddbj.nig.ac.jp/tx_search/?lang=en
      ja: https://ddbj.nig.ac.jp/tx_search/?lang=ja
    description:
      en: Taxonomy database search
      ja: 生物分類データベース検索
    provider: DDBJ
    tags:
      - search
  - name: DDBJ-LD
    service_link:
      en: https://ddbj.nig.ac.jp/public/rdf/
      ja: https://ddbj.nig.ac.jp/public/rdf/
    description:
      en: Linked data of DDBJ Center
      ja: DDBJ センターの linked data
    provider: DDBJ
    tags:
      - database
  - name: TogoVar
    formal_name: TogoVar
    service_link:
      en: https://togovar.org/
      ja: https://togovar.org/
    description:
      en: A database of variants in the Japanese population.
      ja: 日本人ゲノムのバリアントデータベース。
    provider: DBCLS
    tags:
      - search
  - name: NoTagService
    service_link:
      en: https://example.org/notag
      ja: https://example.org/notag
    description:
      en: Service without any known tag
      ja: 既知 tag を持たないサービス
    provider: DDBJ
    tags: []
dictionary:
  database:
    en: Database
    ja: データベース
`

/**
 * DBCLS services.json の最小サンプル (配列)。data[0] はヘッダ行。
 * - TogoID: 掲載 true、Category_1(integration)+Category_9(search)、featuredTop (Togo prefix)
 * - GGGenome: 掲載 "True" (文字列 boolean)、Category_3(Genome=domain → other)、featuredTop 外
 * - HiddenService: 掲載 false (除外)
 * - (services_name_en なし): skip 対象
 * - RefEx: 掲載 true、Category_5(Gene expression=domain → other)、User_1 は無視
 */
export const dbclsJson = JSON.stringify([
  {
    services_name_en: "上記のサービス名(英語)と合わせる必要がある",
    掲載: false,
    Category_1: "Database integration/データベース統合",
  },
  {
    services_name_en: "TogoID",
    services_name_ja: "TogoID",
    URL: "https://togoid.dbcls.jp/",
    explanation_en: "An ID conversion service.",
    explanation_ja: "ID 変換サービス。",
    掲載: true,
    Category_1: true,
    Category_9: true,
  },
  {
    services_name_en: "GGGenome",
    services_name_ja: "GGGenome",
    URL: "https://gggenome.dbcls.jp/",
    explanation_en: "An ultrafast sequence search.",
    explanation_ja: "高速ゲノム配列検索。",
    掲載: "True",
    Category_3: true,
  },
  {
    services_name_en: "HiddenService",
    URL: "https://example.com/hidden",
    explanation_en: "Not published.",
    掲載: false,
    Category_1: true,
  },
  {
    services_name_ja: "名前なし",
    URL: "https://example.com/noname",
    掲載: true,
    Category_1: true,
  },
  {
    services_name_en: "RefEx",
    services_name_ja: "RefEx",
    URL: "https://refex.dbcls.jp/",
    explanation_en: "Reference expression dataset.",
    explanation_ja: "リファレンス発現データ。",
    掲載: true,
    Category_5: true,
    User_1: true,
  },
])
