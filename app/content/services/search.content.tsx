import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "search",
  title: { ja: "検索", en: "Search" },
  description: {
    ja: "複数データベースを横断検索",
    en: "Search across multiple databases",
  },
  link: { kind: "internal", to: "/search" },
  top: { category: "primary-service", order: 1 },
} satisfies ServiceContent
