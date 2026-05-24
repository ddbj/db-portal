import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "dgva",
  title: { ja: "DGVa", en: "DGVa" },
  description: {
    ja: "EBI が運用する Database of Genomic Variants archive。大規模構造変異を扱う。",
    en: "EBI-operated Database of Genomic Variants archive for large structural variations.",
  },
  submit: {
    service: "dgva",
    externalUrl: "https://www.ebi.ac.uk/dgva/",
    source: null,
    accessionPlaceholders: ["estd###"],
  },
} satisfies ServiceContent
