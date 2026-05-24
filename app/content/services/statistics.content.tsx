import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "statistics",
  title: { ja: "統計", en: "Statistics" },
  description: {
    ja: "登録件数や公開件数を含む、 DDBJ センターの各サービスの統計情報。",
    en: "Submission and publication statistics across DDBJ Center services.",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/statistics/index.html" },
  top: { category: "primary-service", order: 5 },
} satisfies ServiceContent
