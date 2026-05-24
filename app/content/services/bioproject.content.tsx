import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: {
    ja: "研究プロジェクトと、そこから生じる試料や配列データを束ねるメタデータ DB。",
    en: "Metadata database that groups research projects and the samples or sequence data derived from them.",
  },
  link: { kind: "internal", to: "/databases/bioproject" },
  top: { category: "popular-ddbj", order: 1, monogram: "BP" },
  submit: {
    service: "bioproject",
    externalUrl: "https://www.ddbj.nig.ac.jp/bioproject/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["PRJDB######"],
  },
} satisfies ServiceContent
