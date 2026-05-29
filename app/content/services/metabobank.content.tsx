import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "metabobank",
  title: { ja: "MetaboBank", en: "MetaboBank" },
  description: {
    ja: "メタボローム データアーカイブ",
    en: "Metabolome data archive",
  },
  link: { kind: "external", href: "https://mb2.ddbj.nig.ac.jp/" },
  submit: {
    service: "metabobank",
    externalUrl: "https://mb2.ddbj.nig.ac.jp/submission/",
    source: "DDBJ",
    accessionPlaceholders: ["MTBKS####"],
  },
} satisfies ServiceContent
