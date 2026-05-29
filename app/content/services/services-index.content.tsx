import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "services-index",
  title: { ja: "サービス", en: "Services" },
  description: {
    ja: "DDBJ・DBCLS が提供するサービス",
    en: "Services from DDBJ and DBCLS",
  },
  link: { kind: "internal", to: "/services" },
  top: { category: "primary-service", order: 3 },
} satisfies ServiceContent
