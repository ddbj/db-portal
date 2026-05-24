import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "search",
  title: { ja: "横断検索", en: "Cross-DB search" },
  description: {
    ja: "DDBJ の主要データベースをまたいで、キーワードや accession で検索する。",
    en: "Search across DDBJ databases by keyword or accession.",
  },
  link: { kind: "internal", to: "/search" },
  top: { category: "primary-service", order: 1 },
} satisfies ServiceContent
