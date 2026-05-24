import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "dra",
  title: { ja: "DRA", en: "DRA" },
  description: {
    ja: "Sequence Read Archive。NGS のシーケンスリードを公開アーカイブとして提供する。",
    en: "DDBJ Sequence Read Archive for publishing NGS reads.",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/dra/index.html" },
  top: { category: "popular-ddbj", order: 3, monogram: "DR" },
  submit: {
    service: "dra",
    externalUrl: "https://www.ddbj.nig.ac.jp/dra/submission.html",
    source: "DDBJ",
    accessionPlaceholders: ["DRR######", "DRX######"],
  },
} satisfies ServiceContent
