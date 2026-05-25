import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "gggenome",
  title: { ja: "GGGenome", en: "GGGenome" },
  description: {
    ja: "高速ゲノム配列検索",
    en: "Ultrafast genome sequence search",
  },
  link: { kind: "external", href: "https://gggenome.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 3, monogram: "GG" },
} satisfies ServiceContent
