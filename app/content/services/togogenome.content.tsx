import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togogenome",
  title: { ja: "TogoGenome", en: "TogoGenome" },
  description: {
    ja: "ゲノム配列と関連情報を統合的に検索 / 取得するための RDF データベース。",
    en: "RDF database for integrated search and retrieval of genome sequences and related metadata.",
  },
  link: { kind: "external", href: "https://togogenome.org/" },
  top: { category: "popular-dbcls", order: 2, monogram: "TGN" },
} satisfies ServiceContent
