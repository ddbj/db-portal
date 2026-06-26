import type { ServiceContent } from "~/schemas/content/service-content"

// jPOST は jPOST チームが運用する DDBJ 外の登録窓口。本サイトに内部詳細ページを持たない (link なし)。
// submit flow の external 役割としてのみ参照される (submit-only entry)。
export default {
  id: "jpost",
  title: { ja: "jPOST", en: "jPOST" },
  description: {
    ja: "プロテオーム質量分析の国際的なリポジトリ。プロテオミクスは DDBJ ではなく jPOST に登録する。",
    en: "International repository for proteomics mass-spec. Proteomics goes to jPOST instead of DDBJ.",
  },
  submit: {
    service: "jpost",
    externalUrl: {
      ja: "https://repository.jpostdb.org/",
      en: null,
    },
    source: null,
    accessionPlaceholders: ["JPST######"],
  },
} satisfies ServiceContent
