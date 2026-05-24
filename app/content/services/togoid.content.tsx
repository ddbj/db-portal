import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togoid",
  title: { ja: "TogoID", en: "TogoID" },
  description: {
    ja: "遺伝子 / タンパク質 / 疾患などのデータベース ID を相互変換する。",
    en: "Cross-mapping service across database identifiers for genes, proteins, diseases, and more.",
  },
  link: { kind: "external", href: "https://togoid.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 4, monogram: "TGI" },
} satisfies ServiceContent
