import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "humandbs",
  title: { ja: "NBDC ヒトデータベース", en: "NBDC Human Database" },
  description: {
    ja: "DBCLS が運用する、制限公開ヒトデータの利用制限ポリシー申請・承認プラットフォーム。",
    en: "DBCLS-operated platform for applying for and approving data-use policies for controlled-access human data.",
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
