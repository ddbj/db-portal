import type { DbHitCount } from "@/types/db"
import { DB_ORDER } from "@/types/db"
import type { SearchResult } from "@/types/search"

// Phase 2 では DB 別の最小サンプル（合計 12 件）を準備する。
// L1-L6 構造の表示確認 + 横断検索結果の状態 mock 用。
// Phase 5 で各 DB 5-20 件まで拡充予定。
export const MOCK_SEARCH_RESULTS: readonly SearchResult[] = [
  {
    dbId: "bioproject",
    identifier: "PRJDB12345",
    publishedAt: "2024-03-15",
    title: "Human Gut Microbiome Analysis in Japanese Cohort",
    description: "Comprehensive metagenomic analysis of gut microbiota composition in 1,200 healthy Japanese adults.",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/bioproject/PRJDB12345",
    projectType: "Genome sequencing",
    organization: "DDBJ",
    relatedObjects: [
      { dbId: "biosample", identifier: "SAMD00012345" },
      { dbId: "sra", identifier: "DRP123456" },
    ],
  },
  {
    dbId: "bioproject",
    identifier: "PRJDB67890",
    publishedAt: "2023-11-02",
    title: "Cancer Genome Atlas Project Japan",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/bioproject/PRJDB67890",
    projectType: "Genome sequencing",
    organization: "RIKEN",
  },
  {
    dbId: "biosample",
    identifier: "SAMD00012345",
    publishedAt: "2024-03-10",
    title: "Stool sample, healthy adult, Tokyo",
    organism: { name: "human gut metagenome", taxonomyId: 408170 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/biosample/SAMD00012345",
  },
  {
    dbId: "sra",
    identifier: "DRR123456",
    publishedAt: "2024-03-15",
    title: "RNA-seq of HeLa cells under hypoxic conditions",
    description: "Illumina NovaSeq 6000, 150 bp paired-end reads",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/sra-run/DRR123456",
    relatedObjects: [
      { dbId: "bioproject", identifier: "PRJDB12345" },
      { dbId: "biosample", identifier: "SAMD00067890" },
    ],
  },
  {
    dbId: "trad",
    identifier: "AB123456",
    publishedAt: "2023-08-21",
    title: "Mus musculus mRNA for cancer-associated antigen, complete cds",
    organism: { name: "Mus musculus", taxonomyId: 10090 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/trad/AB123456",
    division: "ROD",
  },
  {
    dbId: "trad",
    identifier: "LC987654",
    publishedAt: "2024-01-12",
    title: "Oryza sativa Japonica Group draft genome assembly chromosome 1",
    organism: { name: "Oryza sativa Japonica Group", taxonomyId: 39947 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/trad/LC987654",
    division: "PLN",
  },
  {
    dbId: "taxonomy",
    identifier: "9606",
    publishedAt: null,
    title: "Homo sapiens",
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/taxonomy/9606",
    rank: "species",
    commonName: "human",
    japaneseName: "ヒト",
  },
  {
    dbId: "taxonomy",
    identifier: "562",
    publishedAt: null,
    title: "Escherichia coli",
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/taxonomy/562",
    rank: "species",
    commonName: "E. coli",
  },
  {
    dbId: "jga",
    identifier: "JGAS000123",
    publishedAt: "2024-02-05",
    title: "Whole genome sequencing of rare disease cohort",
    description: "Controlled access. NBDC approval required.",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/jga/JGAS000123",
  },
  {
    dbId: "gea",
    identifier: "E-GEAD-456",
    publishedAt: "2023-12-18",
    title: "Microarray expression profiling of mouse liver development",
    organism: { name: "Mus musculus", taxonomyId: 10090 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/gea/E-GEAD-456",
  },
  {
    dbId: "metabobank",
    identifier: "MTBKS123",
    publishedAt: "2024-04-01",
    title: "Plasma metabolome analysis in obesity intervention trial",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/metabobank/MTBKS123",
  },
  {
    dbId: "biosample",
    identifier: "SAMD00067890",
    publishedAt: "2024-03-12",
    title: "HeLa cells, 0.5% O2, 24h",
    organism: { name: "Homo sapiens", taxonomyId: 9606 },
    externalUrl: "https://www.ddbj.nig.ac.jp/resource/biosample/SAMD00067890",
  },
] as const satisfies readonly SearchResult[]

export const ALL_SUCCESS_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId, idx) => ({
  dbId,
  state: "success",
  count: (idx + 1) * 1234,
}))

export const PARTIAL_FAILURE_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId, idx) => {
  if (idx === 1 || idx === 4) {
    return { dbId, state: "error", count: null, error: "timeout" }
  }
  if (idx === 6) {
    return { dbId, state: "error", count: null, error: "upstream_5xx" }
  }

  return { dbId, state: "success", count: (idx + 1) * 1000 }
})

export const ALL_ERROR_HIT_COUNTS: readonly DbHitCount[] = DB_ORDER.map((dbId) => ({
  dbId,
  state: "error",
  count: null,
  error: "upstream_5xx",
}))
