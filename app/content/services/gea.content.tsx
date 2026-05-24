import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "gea",
  title: { ja: "GEA", en: "GEA" },
  description: {
    ja: "Gene Expression Archive。マイクロアレイ / RNA-seq の発現量マトリクスを MAGE-TAB と共に蓄積する。",
    en: "Gene Expression Archive for microarray / RNA-seq expression matrices accompanied by MAGE-TAB.",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/gea/index.html" },
  top: { category: "popular-ddbj", order: 5, monogram: "GE" },
  submit: {
    service: "gea",
    externalUrl: "https://www.ddbj.nig.ac.jp/gea/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["E-GEAD-######"],
  },
} satisfies ServiceContent
