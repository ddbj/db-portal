import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "gea",
  title: { ja: "GEA", en: "GEA" },
  description: {
    ja: "Genomic Expression Archive",
    en: "Genomic Expression Archive",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/gea/index.html" },
  submit: {
    service: "gea",
    externalUrl: "https://www.ddbj.nig.ac.jp/gea/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["E-GEAD-######"],
  },
} satisfies ServiceContent
