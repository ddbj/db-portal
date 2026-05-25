import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "annotation",
  title: { ja: "DDBJ Annotated", en: "DDBJ Annotated" },
  description: {
    ja: "アノテーション付き塩基配列",
    en: "Annotated nucleotide sequences",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/ddbj/index.html" },
  top: { category: "popular-ddbj", order: 4, monogram: "DA" },
  submit: {
    service: "annotation",
    externalUrl: "https://www.ddbj.nig.ac.jp/ddbj/file-format.html",
    source: "DDBJ",
    accessionPlaceholders: ["AB######"],
  },
} satisfies ServiceContent
