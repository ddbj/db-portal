import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "statistics",
  title: { ja: "統計", en: "Statistics" },
  description: {
    ja: "DDBJ センターのサービス統計",
    en: "Service statistics at DDBJ Center",
  },
  link: { kind: "external", href: { ja: "https://www.ddbj.nig.ac.jp/statistics/index.html", en: "https://www.ddbj.nig.ac.jp/statistics/index-e.html" } },
  top: { category: "primary-service", order: 5 },
} satisfies ServiceContent
