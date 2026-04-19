import type { DbMetadata } from "@/types/db"
import { DB_ORDER } from "@/types/db"

export const DATABASES = [
  {
    id: "bioproject",
    displayName: "BioProject",
    shortName: "BioProject",
    description: "プロジェクトメタデータ",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/bioproject/",
    insdcMember: true,
  },
  {
    id: "biosample",
    displayName: "BioSample",
    shortName: "BioSample",
    description: "生物学的サンプル情報",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/biosample/",
    insdcMember: true,
  },
  {
    id: "sra",
    displayName: "SRA",
    shortName: "SRA",
    description: "生シークエンスデータ（DDBJ DRA + NCBI SRA + EBI ENA）",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/dra/",
    insdcMember: true,
  },
  {
    id: "trad",
    displayName: "Trad (Annotated Sequences)",
    shortName: "Trad",
    description: "DDBJ アノテーション付き塩基配列（DDBJ 拠出分）",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/ddbj/",
    insdcMember: true,
  },
  {
    id: "taxonomy",
    displayName: "Taxonomy",
    shortName: "Taxonomy",
    description: "INSDC 共有の生物分類",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/taxonomy/",
    insdcMember: true,
  },
  {
    id: "jga",
    displayName: "JGA",
    shortName: "JGA",
    description: "ヒトの遺伝型・表現型（メタデータのみ検索可能）",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/jga/",
    insdcMember: false,
  },
  {
    id: "gea",
    displayName: "GEA",
    shortName: "GEA",
    description: "機能ゲノミクスデータ（RNA-seq / ChIP-Seq 等）",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/gea/",
    insdcMember: false,
  },
  {
    id: "metabobank",
    displayName: "MetaboBank",
    shortName: "MetaboBank",
    description: "メタボロミクスデータ",
    externalSearchUrl: "https://www.ddbj.nig.ac.jp/metabobank/",
    insdcMember: false,
  },
] as const satisfies readonly DbMetadata[]

export { DB_ORDER }
