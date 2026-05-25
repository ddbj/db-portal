import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "supercomputer",
  title: { ja: "スパコン", en: "Supercomputer" },
  description: {
    ja: "遺伝研スーパーコンピューターシステム",
    en: "NIG supercomputer system",
  },
  link: { kind: "external", href: "https://sc.ddbj.nig.ac.jp/" },
  top: { category: "primary-service", order: 4 },
} satisfies ServiceContent
