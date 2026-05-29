import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "biosample",
  title: { ja: "BioSample", en: "BioSample" },
  description: {
    ja: "生物試料のメタデータ",
    en: "Biological sample metadata",
  },
  link: { kind: "internal", to: "/databases/biosample" },
  submit: {
    service: "biosample",
    externalUrl: "https://www.ddbj.nig.ac.jp/biosample/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["SAMD######"],
  },
} satisfies ServiceContent
