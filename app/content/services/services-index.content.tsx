import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "services-index",
  title: { ja: "サービス", en: "Services" },
  description: {
    ja: "DDBJ センターで利用可能な全サービス",
    en: "All services available at DDBJ Center",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/services/index.html" },
  top: { category: "primary-service", order: 3 },
} satisfies ServiceContent
