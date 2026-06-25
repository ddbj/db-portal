import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "umbrella-bioproject",
  title: { ja: "Umbrella BioProject", en: "Umbrella BioProject" },
  description: {
    ja: "各ハプロタイプの BioProject を束ねる Umbrella",
    en: "Groups child BioProjects for each haplotype under one umbrella",
  },
  link: { kind: "internal", to: "/databases/bioproject" },
  submit: {
    service: "umbrella-bioproject",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/bioproject/submission.html",
      en: "https://www.ddbj.nig.ac.jp/bioproject/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["PRJDB######"],
  },
} satisfies ServiceContent
