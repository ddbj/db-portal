import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "submit-nav",
  title: { ja: "登録ナビ", en: "Submission navigator" },
  description: {
    ja: "データ登録方法のナビゲーション",
    en: "Navigation for data submission",
  },
  link: { kind: "internal", to: "/submit" },
  top: { category: "primary-service", order: 2 },
} satisfies ServiceContent
