import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "submit-nav",
  title: { ja: "登録", en: "Submit" },
  description: {
    ja: "登録先の選択から提出手順まで",
    en: "From database selection to submission steps",
  },
  link: { kind: "internal", to: "/submit" },
  top: { category: "primary-service", order: 2 },
} satisfies ServiceContent
