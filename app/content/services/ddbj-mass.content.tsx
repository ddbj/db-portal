import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "ddbj-mass",
  title: { ja: "DDBJ Mass", en: "DDBJ Mass" },
  description: {
    ja: "アセンブリ / 解析結果 / third-party データを受け入れる多目的データストア。",
    en: "Multi-purpose data store accepting assemblies, analyses, and third-party submissions.",
  },
  submit: {
    service: "ddbj-mass",
    externalUrl: "https://www.ddbj.nig.ac.jp/ddbj/mss.html",
    source: "DDBJ",
    accessionPlaceholders: ["E-GEAD-######"],
  },
} satisfies ServiceContent
