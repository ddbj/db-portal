import type { ServiceContent } from "~/schemas/content/service-content"

export default {
  id: "jpost",
  title: { ja: "jPOST", en: "jPOST" },
  description: {
    ja: "プロテオーム質量分析の国際的なリポジトリ。プロテオミクスは DDBJ ではなく jPOST に登録する。",
    en: "International repository for proteomics mass-spec. Proteomics goes to jPOST instead of DDBJ.",
  },
  submit: {
    service: "jpost",
    externalUrl: "https://jpostdb.org/",
    source: null,
    accessionPlaceholders: ["JPST######"],
  },
} satisfies ServiceContent
