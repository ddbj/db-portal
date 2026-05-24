import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "biosample",
  title: { ja: "BioSample", en: "BioSample" },
  description: {
    ja: "実験データに使われた試料 (細胞株 / 組織 / 個体 / 環境試料) のメタデータを集約する DB。",
    en: "Database that captures sample metadata (cell lines, tissues, individuals, environmental isolates) used for experimental data.",
  },
  link: { kind: "internal", to: "/databases/biosample" },
  top: { category: "popular-ddbj", order: 2, monogram: "BS" },
  submit: {
    service: "biosample",
    externalUrl: "https://www.ddbj.nig.ac.jp/biosample/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["SAMD######"],
  },
} satisfies ServiceContent
