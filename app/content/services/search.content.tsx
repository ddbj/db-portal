import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "search",
  title: { ja: "横断検索", en: "Cross-DB search" },
  description: {
    ja: "データベースから検索",
    en: "Search across databases",
  },
  link: { kind: "internal", to: "/search" },
  top: { category: "primary-service", order: 1 },
} satisfies ServiceContent
