import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "refex",
  title: { ja: "RefEx", en: "RefEx" },
  description: {
    ja: "ヒト・マウス・ラットの遺伝子発現量データを参照組織横断で可視化する。",
    en: "Reference Expression dataset: human / mouse / rat gene expression visualised across tissues.",
  },
  link: { kind: "external", href: "https://refex.dbcls.jp/" },
  top: { category: "popular-dbcls", order: 3, monogram: "REX" },
} satisfies ServiceContent
