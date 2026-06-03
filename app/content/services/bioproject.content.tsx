import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: {
    ja: "研究プロジェクトのメタデータ",
    en: "Research project metadata",
  },
  link: { kind: "internal", to: "/databases/bioproject" },
  submit: {
    service: "bioproject",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/bioproject/submission.html",
      en: "https://www.ddbj.nig.ac.jp/bioproject/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["PRJDB######"],
  },
} satisfies ServiceContent
