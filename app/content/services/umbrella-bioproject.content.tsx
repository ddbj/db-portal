import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "umbrella-bioproject",
  title: { ja: "Umbrella BioProject", en: "Umbrella BioProject" },
  description: {
    ja: "複数の BioProject を束ねる親プロジェクト。公開のみ受け付ける。",
    en: "Parent project that binds multiple BioProjects. Public submission only.",
  },
  submit: {
    service: "umbrella-bioproject",
    externalUrl: "https://www.ddbj.nig.ac.jp/bioproject/umbrella.html",
    source: "DDBJ",
    accessionPlaceholders: ["PRJDB###### (umbrella)"],
  },
} satisfies ServiceContent
