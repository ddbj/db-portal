import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "services-index",
  title: { ja: "サービス一覧", en: "Services" },
  description: {
    ja: "DDBJ センターが運用する登録・公開・解析サービスの一覧。",
    en: "Index of submission, publication, and analysis services operated by DDBJ Center.",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/services/index.html" },
  top: { category: "primary-service", order: 3 },
} satisfies ServiceContent
