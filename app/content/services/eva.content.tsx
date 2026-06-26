import type { ServiceContent } from "~/schemas/content/service-content"

// EVA は EBI が運用する DDBJ 外の登録窓口。本サイトに内部詳細ページを持たない (link なし)。
// submit flow の external 役割としてのみ参照される (submit-only entry)。
export default {
  id: "eva",
  title: { ja: "European Variation Archive", en: "European Variation Archive" },
  description: {
    ja: "EBI が運用する variant アーカイブ。全生物種の variant を受け入れ、DDBJ では非ヒトの variant の登録先として案内する。短いバリアントも構造バリアント (旧 DGVa 相当) も EVA が扱う。",
    en: "EBI-operated variant archive accepting variants from any species. DDBJ directs non-human variants here; EVA handles both short and structural variants (the former DGVa).",
  },
  submit: {
    service: "eva",
    externalUrl: {
      ja: "https://www.ebi.ac.uk/eva/",
      en: null,
    },
    source: null,
    accessionPlaceholders: ["PRJEB######"],
  },
} satisfies ServiceContent
