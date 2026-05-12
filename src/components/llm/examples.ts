import type { DbId } from "@/types/db"

import type { LlmAssistBoxMode } from "./LlmAssistBox"

type Lang = "ja" | "en"

interface ExampleEntry {
  id: string
  text: string
}

const ADVANCED_SEARCH_JA: readonly ExampleEntry[] = [
  { id: "adv-1", text: "ヒトの 2020 年以降に公開されたがん研究" },
  { id: "adv-2", text: "大腸菌の WGS、Illumina プラットフォーム" },
  { id: "adv-3", text: "JSPS 助成のゲノムシークエンスプロジェクト" },
  { id: "adv-4", text: "ヒト腸内細菌の 16S rRNA メタゲノム" },
  { id: "adv-5", text: "マウスの RNA-Seq 発現プロファイル" },
] as const

const ADVANCED_SEARCH_EN: readonly ExampleEntry[] = [
  { id: "adv-1", text: "Human cancer studies published since 2020" },
  { id: "adv-2", text: "E. coli WGS reads on Illumina" },
  { id: "adv-3", text: "Genome sequencing projects funded by JSPS" },
  { id: "adv-4", text: "Human gut microbiome 16S rRNA metagenome" },
  { id: "adv-5", text: "Mouse RNA-Seq expression profiles" },
] as const

const DB_LIST_JA: Readonly<Record<DbId, readonly ExampleEntry[]>> = {
  trad: [
    { id: "trad-1", text: "2020 年以降に公開されたヒトの塩基配列" },
    { id: "trad-2", text: "DNA、長さ 10000 以上" },
    { id: "trad-3", text: "BRCA1 関連の reference に Nature 掲載" },
  ],
  sra: [
    { id: "sra-1", text: "ヒトに絞り込んで 2022 年以降" },
    { id: "sra-2", text: "Illumina プラットフォームの WGS" },
    { id: "sra-3", text: "メタゲノム、AMPLICON、16S" },
    { id: "sra-4", text: "RNA-Seq、PAIRED END" },
  ],
  bioproject: [
    { id: "bp-1", text: "ヒトに絞り込んで 2022 年以降に公開" },
    { id: "bp-2", text: "JSPS 助成のがん関連プロジェクト" },
    { id: "bp-3", text: "Medical relevance のヒトゲノム" },
  ],
  biosample: [
    { id: "bs-1", text: "日本で 2023 年に採取された土壌サンプル" },
    { id: "bs-2", text: "Homo sapiens 由来、肺の組織" },
    { id: "bs-3", text: "Mus musculus C57BL/6 strain" },
  ],
  jga: [
    { id: "jga-1", text: "2020 年以降に公開された WGS の study" },
    { id: "jga-2", text: "がん関連の dataset" },
    { id: "jga-3", text: "Illumina vendor のもの" },
  ],
  gea: [
    { id: "gea-1", text: "ヒトの RNA-seq 発現プロファイル" },
    { id: "gea-2", text: "ChIP-Seq experiment に絞る" },
    { id: "gea-3", text: "マウスの 2022 年以降" },
  ],
  metabobank: [
    { id: "mb-1", text: "ヒトの metabolomics study" },
    { id: "mb-2", text: "2022 年以降に公開されたもの" },
    { id: "mb-3", text: "NMR experiment に絞る" },
  ],
  taxonomy: [
    { id: "tx-1", text: "Mus musculus" },
    { id: "tx-2", text: "げっ歯類 (Rodentia)" },
    { id: "tx-3", text: "rank が species の哺乳類" },
  ],
}

const DB_LIST_EN: Readonly<Record<DbId, readonly ExampleEntry[]>> = {
  trad: [
    { id: "trad-1", text: "Human nucleotide sequences published since 2020" },
    { id: "trad-2", text: "DNA, length 10000+" },
    { id: "trad-3", text: "BRCA1 with Nature reference" },
  ],
  sra: [
    { id: "sra-1", text: "Limit to Homo sapiens, since 2022" },
    { id: "sra-2", text: "Illumina WGS" },
    { id: "sra-3", text: "Metagenomic, AMPLICON, 16S" },
    { id: "sra-4", text: "RNA-Seq, PAIRED end" },
  ],
  bioproject: [
    { id: "bp-1", text: "Limit to Homo sapiens, published since 2022" },
    { id: "bp-2", text: "JSPS-funded cancer projects" },
    { id: "bp-3", text: "Medical relevance human genome" },
  ],
  biosample: [
    { id: "bs-1", text: "Soil samples collected in Japan in 2023" },
    { id: "bs-2", text: "Homo sapiens, lung tissue" },
    { id: "bs-3", text: "Mus musculus C57BL/6 strain" },
  ],
  jga: [
    { id: "jga-1", text: "WGS studies published since 2020" },
    { id: "jga-2", text: "cancer-related datasets" },
    { id: "jga-3", text: "Illumina vendor" },
  ],
  gea: [
    { id: "gea-1", text: "Human RNA-seq expression profiles" },
    { id: "gea-2", text: "ChIP-Seq experiments only" },
    { id: "gea-3", text: "Mouse, since 2022" },
  ],
  metabobank: [
    { id: "mb-1", text: "Human metabolomics studies" },
    { id: "mb-2", text: "Published since 2022" },
    { id: "mb-3", text: "NMR experiments only" },
  ],
  taxonomy: [
    { id: "tx-1", text: "Mus musculus" },
    { id: "tx-2", text: "Rodentia" },
    { id: "tx-3", text: "Mammals at species rank" },
  ],
}

export const getExamples = (
  mode: LlmAssistBoxMode,
  db: DbId | null,
  lang: Lang,
): readonly ExampleEntry[] => {
  if (mode === "advanced-search") {
    return lang === "en" ? ADVANCED_SEARCH_EN : ADVANCED_SEARCH_JA
  }
  if (db === null) return []

  return (lang === "en" ? DB_LIST_EN : DB_LIST_JA)[db]
}
