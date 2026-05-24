import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "metabobank",
  title: { ja: "MetaboBank", en: "MetaboBank" },
  description: {
    ja: "メタボロームの質量分析データを蓄積する DDBJ センターの公開アーカイブ。",
    en: "DDBJ Center's public archive for metabolome mass-spec data.",
  },
  link: { kind: "external", href: "https://mb2.ddbj.nig.ac.jp/" },
  top: { category: "popular-ddbj", order: 7, monogram: "MB" },
  submit: {
    service: "metabobank",
    externalUrl: "https://mb2.ddbj.nig.ac.jp/submission/",
    source: "DDBJ",
    accessionPlaceholders: ["MTBKS####"],
  },
} satisfies ServiceContent
