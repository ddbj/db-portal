import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "togovar",
  title: { ja: "TogoVar", en: "TogoVar" },
  description: {
    ja: "日本人のゲノム変異データと、 各種臨床・機能アノテーションを統合した検索基盤。",
    en: "Integrated search platform for Japanese genome variation with clinical and functional annotations.",
  },
  link: { kind: "external", href: "https://togovar.org/" },
  top: { category: "popular-dbcls", order: 1, monogram: "TGV" },
} satisfies ServiceContent
