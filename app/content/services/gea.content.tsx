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
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/gea/",
      en: null,
    },
    source: "DDBJ",
    accessionPlaceholders: ["E-GEAD-######"],
  },
} satisfies ServiceContent
