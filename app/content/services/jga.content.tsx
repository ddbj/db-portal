import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "jga",
  title: { ja: "JGA", en: "JGA" },
  description: {
    ja: "Japanese Genotype-phenotype Archive",
    en: "Japanese Genotype-phenotype Archive",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/jga/index.html" },
  top: { category: "popular-ddbj", order: 6, monogram: "JG" },
  submit: {
    service: "jga",
    externalUrl: "https://www.ddbj.nig.ac.jp/jga/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["JGAS######", "JGAD######"],
  },
} satisfies ServiceContent
