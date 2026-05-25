import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "activity",
  title: { ja: "活動", en: "Activities" },
  description: {
    ja: "DDBJ センターの講習会と業績",
    en: "Training and publications at DDBJ Center",
  },
  link: { kind: "external", href: "https://www.ddbj.nig.ac.jp/activities/index.html" },
  top: { category: "primary-service", order: 6 },
} satisfies ServiceContent
