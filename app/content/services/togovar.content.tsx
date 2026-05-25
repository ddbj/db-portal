import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togovar",
  title: { ja: "TogoVar", en: "TogoVar" },
  description: {
    ja: "ヒトゲノム変異統合 DB",
    en: "Integrated human variation database",
  },
  link: { kind: "external", href: "https://togovar.org/" },
  top: { category: "popular-dbcls", order: 1, monogram: "TGV" },
} satisfies ServiceContent
