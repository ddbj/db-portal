import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "ddbj",
  title: { ja: "DDBJ", en: "DDBJ" },
  description: {
    ja: "塩基配列の一括登録 (MSS = Mass Submission System)。WGS / GNM / MAG / TSA / TLS / TPA / アノテーションを Division x data type で受け付ける。",
    en: "Bulk nucleotide sequence submission (MSS = Mass Submission System) for WGS / GNM / MAG / TSA / TLS / TPA / annotation, classified by division x data type.",
  },
  link: { kind: "internal", to: "/databases/ddbj" },
  submit: {
    service: "ddbj",
    externalUrl: {
      ja: "https://www.ddbj.nig.ac.jp/ddbj/mss.html",
      en: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html",
    },
    source: "DDBJ",
    accessionPlaceholders: ["AP######", "BAAA01000000"],
  },
} satisfies ServiceContent
