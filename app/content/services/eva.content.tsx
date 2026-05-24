import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "eva",
  title: { ja: "European Variation Archive", en: "European Variation Archive" },
  description: {
    ja: "EBI が運用するヒト変異の制限公開アーカイブ。",
    en: "EBI-operated controlled-access archive for human variation.",
  },
  submit: {
    service: "eva",
    externalUrl: "https://www.ebi.ac.uk/eva/",
    source: null,
    accessionPlaceholders: ["EVA######"],
  },
} satisfies ServiceContent
