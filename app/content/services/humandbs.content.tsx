import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "humandbs",
  title: { ja: "NBDC ヒトデータベース", en: "NBDC Human Database" },
  description: {
    ja: "DBCLS が運用する、ヒトに関する様々なデータを共有するためのプラットフォーム。",
    en: "DBCLS-operated platform for sharing a wide range of data related to humans.",
  },
  link: { kind: "internal", to: "/databases/humandbs" },
  submit: {
    service: "humandbs",
    externalUrl: {
      ja: "https://humandbs.ddbj.nig.ac.jp/nbdc/application/",
      en: null,
    },
    source: "DBCLS",
    accessionPlaceholders: [],
  },
} satisfies ServiceContent
