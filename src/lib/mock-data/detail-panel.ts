import type {
  CardId,
  DetailLeaf,
  DetailOverview,
  LeafNodeId,
} from "@/types/submit"

// Phase 2 では概要レベル 9 枚（プレースホルダ summary）と具体レベル 2 枚のスタブを準備。
// Phase 4 で本文書き下ろし + 言語別 TSX コンポーネント化。
export const DETAIL_OVERVIEWS: Readonly<Record<CardId, DetailOverview>> = {
  "microbial": {
    cardId: "microbial",
    summary: "微生物（原核・ウイルス・オルガネラ・プラスミド）のゲノム登録。3 層構造（メタデータ / 生リード / アセンブリ）に従う。",
    hasThreeLayer: true,
    branches: [
      { dataLabel: "オルガネラ / プラスミド", leafId: "organelle-plasmid", goalLabel: "BP+BS+MSS" },
      { dataLabel: "原核（生リードのみ）", leafId: "prokaryote-raw", goalLabel: "BP+BS+DRA" },
      { dataLabel: "原核（生リード + アセンブリ）", leafId: "prokaryote-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "原核（アセンブリのみ）", leafId: "prokaryote-assembly-only", goalLabel: "BP+BS+MSS" },
      { dataLabel: "ウイルス（生リードのみ）", leafId: "virus-raw", goalLabel: "BP+BS+DRA" },
      { dataLabel: "ウイルス（生リード + アセンブリ）", leafId: "virus-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "ウイルス（アセンブリのみ）", leafId: "virus-assembly-only", goalLabel: "BP+BS+MSS" },
    ],
    commonRequirements: "DDBJ Account、公開鍵、BioProject + BioSample の事前登録",
    primaryLinks: [
      { label: "D-way（BioProject / BioSample / DRA）", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { label: "MSS（DDBJ Trad）", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "eukaryote": {
    cardId: "eukaryote",
    summary: "真核生物（動物・植物・菌類）のゲノム登録。Haplotype / TSA / EST / TPA の特殊ケースを含む。",
    hasThreeLayer: true,
    branches: [
      { dataLabel: "通常（生リードのみ）", leafId: "eukaryote-raw", goalLabel: "BP+BS+DRA" },
      { dataLabel: "通常（生リード + アセンブリ）", leafId: "eukaryote-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "通常（アセンブリのみ）", leafId: "eukaryote-assembly-only", goalLabel: "BP+BS+MSS" },
      { dataLabel: "Haplotype（生リード + アセンブリ）", leafId: "eukaryote-haplotype-raw-assembly", goalLabel: "BP+BS+DRA+MSS (Haplotype)" },
      { dataLabel: "Haplotype（アセンブリのみ）", leafId: "eukaryote-haplotype-assembly-only", goalLabel: "BP+BS+MSS (Haplotype)" },
      { dataLabel: "TSA（de novo transcriptome）", leafId: "eukaryote-tsa", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "TPA（peer-reviewed 必須）", leafId: "eukaryote-tpa", goalLabel: "BP+BS+MSS" },
      { dataLabel: "EST（小規模 < 100）", leafId: "eukaryote-est-small", goalLabel: "NSSS" },
      { dataLabel: "EST（大規模）", leafId: "eukaryote-est-large", goalLabel: "BP+BS+MSS" },
    ],
    commonRequirements: "DDBJ Account、公開鍵、BioProject + BioSample の事前登録",
    primaryLinks: [
      { label: "D-way", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { label: "MSS（DDBJ Trad）", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "metagenome": {
    cardId: "metagenome",
    summary: "環境サンプル / メタゲノム由来データ。MAG / SAG / TLS / メタ TSA の選択肢あり。",
    hasThreeLayer: true,
    branches: [
      { dataLabel: "生リードのみ", leafId: "metagenome-raw", goalLabel: "BP+BS+DRA" },
      { dataLabel: "Primary（DRA Analysis）", leafId: "metagenome-primary", goalLabel: "BP+BS+DRA (Analysis)" },
      { dataLabel: "ゲノムビン（MAG / Binned / SAG）", leafId: "metagenome-genome-bin", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "OTU プロファイル（TLS）", leafId: "metagenome-tls", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabel: "メタトランスクリプトーム（メタ TSA）", leafId: "metagenome-tsa", goalLabel: "BP+BS+DRA+MSS" },
    ],
    commonRequirements: "DDBJ Account、公開鍵、BioProject + BioSample の事前登録",
    primaryLinks: [
      { label: "D-way", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { label: "MSS（DDBJ Trad）", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "expression": {
    cardId: "expression",
    summary: "RNA-seq・マイクロアレイ等の発現解析データ。GEA に登録する。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "NGS による RNA-seq", leafId: "expression-ngs", goalLabel: "BP+BS+DRA+GEA" },
      { dataLabel: "マイクロアレイ", leafId: "expression-array", goalLabel: "BP+BS+GEA" },
    ],
    commonRequirements: "DDBJ Account、BioProject + BioSample",
    primaryLinks: [
      { label: "D-way", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { label: "GEA（D-way 内）", url: "https://www.ddbj.nig.ac.jp/gea/", external: true },
    ],
  },
  "variation": {
    cardId: "variation",
    summary: "SNP / 構造変異等の変異コール結果。対象生物（ヒト / 非ヒト）と変異タイプ（SNP / SV）で登録先が分かれる。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "ヒト × SNP / Indel", leafId: "variation-human-snp", goalLabel: "JVar SNP" },
      { dataLabel: "ヒト × SV", leafId: "variation-human-sv", goalLabel: "JVar SV" },
      { dataLabel: "非ヒト × SNP / Indel", leafId: "variation-nonhuman-snp", goalLabel: "EVA" },
      { dataLabel: "非ヒト × SV", leafId: "variation-nonhuman-sv", goalLabel: "dgVa" },
    ],
    commonRequirements: "登録先（JVar / EVA / dgVa）の各アカウント",
    primaryLinks: [
      { label: "JVar（DDBJ）", url: "https://www.ddbj.nig.ac.jp/jvar/", external: true },
      { label: "EVA（EBI）", url: "https://www.ebi.ac.uk/eva/", external: true },
      { label: "dgVa（EBI）", url: "https://www.ebi.ac.uk/dgva/", external: true },
    ],
  },
  "proteomics": {
    cardId: "proteomics",
    summary: "LC-MS/MS によるプロテオーム解析データ。jPOST（外部）に登録する。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "プロテオミクス全般", leafId: "proteomics", goalLabel: "jPOST" },
    ],
    commonRequirements: "jPOST アカウント",
    primaryLinks: [
      { label: "jPOST", url: "https://jpostdb.org/", external: true },
    ],
  },
  "metabolomics": {
    cardId: "metabolomics",
    summary: "LC-MS / GC-MS 等のメタボロミクスデータ。MetaboBank に登録する。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "メタボロミクス全般", leafId: "metabolomics", goalLabel: "BP+BS+MetaboBank" },
    ],
    commonRequirements: "DDBJ Account、BioProject + BioSample",
    primaryLinks: [
      { label: "MetaboBank", url: "https://mb2.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "small-sequence": {
    cardId: "small-sequence",
    summary: "100 配列未満かつ 500 kb 未満の塩基配列。BioProject / BioSample なしで NSSS から登録できる。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "100 配列未満の塩基配列", leafId: "small-sequence", goalLabel: "NSSS" },
    ],
    commonRequirements: "DDBJ Account",
    primaryLinks: [
      { label: "NSSS（DDBJ Trad）", url: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html", external: true },
    ],
  },
  "human-restricted": {
    cardId: "human-restricted",
    summary: "ヒトを対象とした個人特定リスクのあるデータ。NBDC の提供申請が必要、JGA に登録する。",
    hasThreeLayer: false,
    branches: [
      { dataLabel: "個人特定リスクのあるヒトデータ", leafId: "human-restricted", goalLabel: "JGA" },
    ],
    commonRequirements: "NBDC ヒトデータベース データ提供承認、JGA 登録アカウント",
    primaryLinks: [
      { label: "NBDC ヒトデータベース", url: "https://humandbs.dbcls.jp/", external: true },
      { label: "JGA", url: "https://www.ddbj.nig.ac.jp/jga/", external: true },
    ],
  },
}

// Phase 4 で全 31 leaf 分書き下ろし。Phase 2 では微生物ゲノム / 真核生物ゲノムの代表 leaf 2 枚のスタブのみ。
export const DETAIL_LEAVES: Readonly<Partial<Record<LeafNodeId, DetailLeaf>>> = {
  "prokaryote-raw-assembly": {
    leafId: "prokaryote-raw-assembly",
    goal: "BP+BS+DRA+MSS",
    goalTemplate: "genome",
    registrationOrder: "BioProject → BioSample → DRA → DDBJ (Trad) MSS",
    preparation: "生リード（FASTQ + MD5）、アセンブリファイル、アノテーション（DFAST 推奨）",
    leafSpecific: "アセンブリ完成度に応じて MSS data type を選択（Finished = GNM / Draft = WGS）。DFAST で原核ゲノムを自動アノテーション可能。",
    toolLinks: [
      { label: "DFAST", url: "https://dfast.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "eukaryote-raw-assembly": {
    leafId: "eukaryote-raw-assembly",
    goal: "BP+BS+DRA+MSS",
    goalTemplate: "genome",
    registrationOrder: "BioProject → BioSample → DRA → DDBJ (Trad) MSS",
    preparation: "生リード（FASTQ + MD5）、アセンブリファイル、アノテーション（既存パイプライン）",
    leafSpecific: "動物 / 植物 / 菌類の BioSample パッケージを選択（Model Organism Animal / Plant / Microbe）。locus_tag prefix と qualifier（cultivar / ecotype / breed / strain / isolate）に注意。",
    toolLinks: [],
  },
}
