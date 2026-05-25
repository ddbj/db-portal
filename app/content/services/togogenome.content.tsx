import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togogenome",
  title: { ja: "TogoGenome", en: "TogoGenome" },
  description: {
    ja: "微生物ゲノム統合 DB",
    en: "Integrated microbial genome database",
  },
  link: { kind: "external", href: "https://togogenome.org/" },
  top: { category: "popular-dbcls", order: 2, monogram: "TGN" },
} satisfies ServiceContent
