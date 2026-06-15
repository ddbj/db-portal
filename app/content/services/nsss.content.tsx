import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "nsss",
  title: { ja: "NSSS", en: "NSSS" },
  description: {
    ja: "塩基配列の Web 登録システム (Nucleotide Sequence Submission System)。少数・短い・非完成の配列を対象とし、大規模・完成ゲノム・WGS / TSA / TLS / EST / HTG / TPA は DDBJ (MSS) で登録する。",
    en: "Web-based Nucleotide Sequence Submission System for a small number of short, non-complete sequences. Large-scale, complete genomes, and WGS / TSA / TLS / EST / HTG / TPA go to DDBJ (MSS) instead.",
  },
  link: { kind: "internal", to: "/databases/nsss" },
  submit: {
    service: "nsss",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html",
      en: "https://www.ddbj.nig.ac.jp/ddbj/web-submission-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["LC######"],
  },
} satisfies ServiceContent
