import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "activity",
  title: { ja: "活動報告", en: "Activities" },
  description: {
    ja: "DDBJ センターの最新の活動、 学会発表、 共同研究について。",
    en: "Updates from DDBJ Center: activities, conferences, and collaborations.",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/activities/index.html" },
  top: { category: "primary-service", order: 6 },
} satisfies ServiceContent
