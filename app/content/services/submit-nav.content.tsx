import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "submit-nav",
  title: { ja: "登録ナビ", en: "Submission navigator" },
  description: {
    ja: "登録したいファイルの種類と生物・公開区分を入力すると、必要な登録経路を組み立てる。",
    en: "Enter file types, organism, and access; the navigator assembles the registration path.",
  },
  link: { kind: "internal", to: "/submit" },
  top: { category: "primary-service", order: 2 },
} satisfies ServiceContent
