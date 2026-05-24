import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "supercomputer",
  title: { ja: "スパコン", en: "Supercomputer" },
  description: {
    ja: "国立遺伝学研究所が運用するライフサイエンス向け共用計算機システム。",
    en: "Shared HPC system for life sciences operated by the National Institute of Genetics.",
  },
  link: { kind: "external", href: "https://sc.ddbj.nig.ac.jp/" },
  top: { category: "primary-service", order: 4 },
} satisfies ServiceContent
