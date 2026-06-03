import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "jga",
  title: { ja: "JGA", en: "JGA" },
  description: {
    ja: "Japanese Genotype-phenotype Archive",
    en: "Japanese Genotype-phenotype Archive",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/jga/index.html" },
  submit: {
    service: "jga",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/jga/submission.html",
      en: "https://www.ddbj.nig.ac.jp/jga/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["JGAS######", "JGAD######"],
  },
} satisfies ServiceContent
