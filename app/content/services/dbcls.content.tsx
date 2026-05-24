import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "dbcls",
  title: { ja: "DBCLS", en: "DBCLS" },
  description: {
    ja: "Database Center for Life Science。JGA / humandbs 等の利用申請を受け付ける。",
    en: "Database Center for Life Science. Handles application for JGA / humandbs and related services.",
  },
  submit: {
    service: "dbcls",
    externalUrl: "https://dbcls.rois.ac.jp/",
    source: "DBCLS",
    accessionPlaceholders: [],
  },
} satisfies ServiceContent
