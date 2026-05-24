import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "humandbs",
  title: { ja: "humandbs", en: "humandbs" },
  description: {
    ja: "DBCLS が運用するヒト由来データ共有のためのデータベース。",
    en: "DBCLS-operated database for sharing human-derived data.",
  },
  submit: {
    service: "humandbs",
    externalUrl: "https://humandbs.dbcls.jp/",
    source: "DBCLS",
    accessionPlaceholders: ["hum#####"],
  },
} satisfies ServiceContent
