import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togotv",
  title: { ja: "TogoTV", en: "TogoTV" },
  description: {
    ja: "ライフサイエンス解説動画",
    en: "Life science tutorial videos",
  },
  link: { kind: "external", href: "https://togotv.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 5, monogram: "TTV" },
} satisfies ServiceContent
