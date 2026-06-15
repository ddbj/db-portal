import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togovar",
  title: { ja: "TogoVar", en: "TogoVar" },
  description: {
    ja: "公開ヒトゲノムバリアントのデータベース。GRCh37 / GRCh38 を参照とする頻度・アノテーション付き variant を登録できる。",
    en: "Database of public human genome variants. Accepts frequency- and annotation-bearing variants referenced against GRCh37 / GRCh38.",
  },
  link: { kind: "internal", to: "/databases/togovar" },
  submit: {
    service: "togovar",
    externalUrl: {
      ja: "https://togovar.org/",
      en: null,
    },
    source: "DDBJ",
    accessionPlaceholders: [],
  },
} satisfies ServiceContent
