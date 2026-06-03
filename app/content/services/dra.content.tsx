import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "dra",
  title: { ja: "DRA", en: "DRA" },
  description: {
    ja: "DDBJ Sequence Read Archive",
    en: "DDBJ Sequence Read Archive",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/dra/index.html" },
  submit: {
    service: "dra",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/dra/submission.html",
      en: "https://www.ddbj.nig.ac.jp/dra/submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["DRR######", "DRX######"],
  },
} satisfies ServiceContent
