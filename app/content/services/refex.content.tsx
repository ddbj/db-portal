import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "refex",
  title: { ja: "RefEx", en: "RefEx" },
  description: {
    ja: "Reference Expression dataset",
    en: "Reference Expression dataset",
  },
  link: { kind: "external", href: "https://refex.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 4, monogram: "REX" },
} satisfies ServiceContent
