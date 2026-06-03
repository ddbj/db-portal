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
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/metabobank/submission.html",
      en: "https://www.ddbj.nig.ac.jp/metabobank/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["MTBKS####"],
  },
} satisfies ServiceContent
