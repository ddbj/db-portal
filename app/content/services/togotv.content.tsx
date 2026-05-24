import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togotv",
  title: { ja: "TogoTV", en: "TogoTV" },
  description: {
    ja: "ライフサイエンス研究で使うデータベースやツールの操作方法を解説する動画集。",
    en: "Tutorial videos that demonstrate how to use life science databases and tools.",
  },
  link: { kind: "external", href: "https://togotv.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 5, monogram: "TTV" },
} satisfies ServiceContent
