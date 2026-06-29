import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "biosample",
  title: { ja: "BioSample", en: "BioSample" },
  description: {
    ja: "生物試料のメタデータ",
    en: "Biological sample metadata",
  },
  link: { kind: "internal", to: "/biosample" },
  submit: {
    service: "biosample",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/biosample/submission.html",
      en: "https://www.ddbj.nig.ac.jp/biosample/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["SAMD######"],
  },
} satisfies ServiceContent
