import type { LeafDetail, LeafNodeId } from "@/types/submit"

// i18n 側は routes.submit.detail.steps.<pattern>.<step>.{title|description} を持つ。
// 複数 leaf で使い回す共通 step パターン。
const STEPS = {
  bpBsDraMss: [
    "routes.submit.detail.steps.bp-bs-dra-mss.bioproject",
    "routes.submit.detail.steps.bp-bs-dra-mss.biosample",
    "routes.submit.detail.steps.bp-bs-dra-mss.dra",
    "routes.submit.detail.steps.bp-bs-dra-mss.mss",
  ],
  bpBsMss: [
    "routes.submit.detail.steps.bp-bs-mss.bioproject",
    "routes.submit.detail.steps.bp-bs-mss.biosample",
    "routes.submit.detail.steps.bp-bs-mss.mss",
  ],
  bpBsDra: [
    "routes.submit.detail.steps.bp-bs-dra.bioproject",
    "routes.submit.detail.steps.bp-bs-dra.biosample",
    "routes.submit.detail.steps.bp-bs-dra.dra",
  ],
  bpBsDraAnalysis: [
    "routes.submit.detail.steps.bp-bs-dra-analysis.bioproject",
    "routes.submit.detail.steps.bp-bs-dra-analysis.biosample",
    "routes.submit.detail.steps.bp-bs-dra-analysis.draAnalysis",
  ],
  bpBsDraGea: [
    "routes.submit.detail.steps.bp-bs-dra-gea.bioproject",
    "routes.submit.detail.steps.bp-bs-dra-gea.biosample",
    "routes.submit.detail.steps.bp-bs-dra-gea.dra",
    "routes.submit.detail.steps.bp-bs-dra-gea.gea",
  ],
  bpBsGea: [
    "routes.submit.detail.steps.bp-bs-gea.bioproject",
    "routes.submit.detail.steps.bp-bs-gea.biosample",
    "routes.submit.detail.steps.bp-bs-gea.gea",
  ],
  bpBsMetabobank: [
    "routes.submit.detail.steps.bp-bs-metabobank.bioproject",
    "routes.submit.detail.steps.bp-bs-metabobank.biosample",
    "routes.submit.detail.steps.bp-bs-metabobank.metabobank",
  ],
  bpBsDraMssHaplotype: [
    "routes.submit.detail.steps.bp-bs-dra-mss-haplotype.umbrella",
    "routes.submit.detail.steps.bp-bs-dra-mss-haplotype.principalAlternate",
    "routes.submit.detail.steps.bp-bs-dra-mss-haplotype.biosample",
    "routes.submit.detail.steps.bp-bs-dra-mss-haplotype.dra",
    "routes.submit.detail.steps.bp-bs-dra-mss-haplotype.mss",
  ],
  bpBsMssHaplotype: [
    "routes.submit.detail.steps.bp-bs-mss-haplotype.umbrella",
    "routes.submit.detail.steps.bp-bs-mss-haplotype.principalAlternate",
    "routes.submit.detail.steps.bp-bs-mss-haplotype.biosample",
    "routes.submit.detail.steps.bp-bs-mss-haplotype.mss",
  ],
  nsss: [
    "routes.submit.detail.steps.nsss.login",
    "routes.submit.detail.steps.nsss.form",
    "routes.submit.detail.steps.nsss.review",
  ],
  jga: [
    "routes.submit.detail.steps.jga.dbcls",
    "routes.submit.detail.steps.jga.guidance",
    "routes.submit.detail.steps.jga.upload",
  ],
  externalJpost: ["routes.submit.detail.steps.external-jpost.submit"],
  externalJvarSnp: ["routes.submit.detail.steps.external-jvar-snp.submit"],
  externalJvarSv: ["routes.submit.detail.steps.external-jvar-sv.submit"],
  externalEva: ["routes.submit.detail.steps.external-eva.submit"],
  externalDgva: ["routes.submit.detail.steps.external-dgva.submit"],
} as const

// 31 leaf 分の具体レベル差分データ。goalTemplates.ts と併せて DetailLeafTemplate が描画する。
// docs/submit-details.md が一次ソース。
export const LEAF_DETAILS: Readonly<Record<LeafNodeId, LeafDetail>> = {
  "human-restricted": {
    leafId: "human-restricted",
    goalTemplateId: "jga",
    goalLabel: "JGA",
    summaryKey: "routes.submit.detail.leafDetails.human-restricted.summary",
    stepKeys: STEPS.jga,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.human-restricted.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.human-restricted.badges.access" },
    ],
  },
  "proteomics": {
    leafId: "proteomics",
    goalTemplateId: "external",
    goalLabel: "jPOST",
    summaryKey: "routes.submit.detail.leafDetails.proteomics.summary",
    stepKeys: STEPS.externalJpost,
    badges: [
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.proteomics.badges.external" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.proteomics.links.jpost", url: "https://jpostdb.org/", external: true },
    ],
  },
  "metabolomics": {
    leafId: "metabolomics",
    goalTemplateId: "metabobank",
    goalLabel: "BP+BS+MetaboBank",
    summaryKey: "routes.submit.detail.leafDetails.metabolomics.summary",
    stepKeys: STEPS.bpBsMetabobank,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metabolomics.badges.idfSdrf" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.metabolomics.badges.maf" },
    ],
  },
  "variation-human-snp": {
    leafId: "variation-human-snp",
    goalTemplateId: "external",
    goalLabel: "JVar SNP",
    summaryKey: "routes.submit.detail.leafDetails.variation-human-snp.summary",
    stepKeys: STEPS.externalJvarSnp,
    badges: [
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.variation-human-snp.badges.external" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.variation-human-snp.links.jvar", url: "https://www.ddbj.nig.ac.jp/jvar/", external: true },
    ],
  },
  "variation-human-sv": {
    leafId: "variation-human-sv",
    goalTemplateId: "external",
    goalLabel: "JVar SV",
    summaryKey: "routes.submit.detail.leafDetails.variation-human-sv.summary",
    stepKeys: STEPS.externalJvarSv,
    badges: [
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.variation-human-sv.badges.external" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.variation-human-sv.links.jvar", url: "https://www.ddbj.nig.ac.jp/jvar/", external: true },
    ],
  },
  "variation-nonhuman-snp": {
    leafId: "variation-nonhuman-snp",
    goalTemplateId: "external",
    goalLabel: "EVA",
    summaryKey: "routes.submit.detail.leafDetails.variation-nonhuman-snp.summary",
    stepKeys: STEPS.externalEva,
    badges: [
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.variation-nonhuman-snp.badges.external" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.variation-nonhuman-snp.links.eva", url: "https://www.ebi.ac.uk/eva/", external: true },
    ],
  },
  "variation-nonhuman-sv": {
    leafId: "variation-nonhuman-sv",
    goalTemplateId: "external",
    goalLabel: "dgVa",
    summaryKey: "routes.submit.detail.leafDetails.variation-nonhuman-sv.summary",
    stepKeys: STEPS.externalDgva,
    badges: [
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.variation-nonhuman-sv.badges.external" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.variation-nonhuman-sv.links.dgva", url: "https://www.ebi.ac.uk/dgva/", external: true },
    ],
  },
  "expression-ngs": {
    leafId: "expression-ngs",
    goalTemplateId: "gea",
    goalLabel: "BP+BS+DRA+GEA",
    summaryKey: "routes.submit.detail.leafDetails.expression-ngs.summary",
    stepKeys: STEPS.bpBsDraGea,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.expression-ngs.badges.rnaseq" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.expression-ngs.badges.raw" },
    ],
  },
  "expression-array": {
    leafId: "expression-array",
    goalTemplateId: "gea",
    goalLabel: "BP+BS+GEA",
    summaryKey: "routes.submit.detail.leafDetails.expression-array.summary",
    stepKeys: STEPS.bpBsGea,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.expression-array.badges.array" },
    ],
  },
  "small-sequence": {
    leafId: "small-sequence",
    goalTemplateId: "nsss",
    goalLabel: "NSSS",
    summaryKey: "routes.submit.detail.leafDetails.small-sequence.summary",
    stepKeys: STEPS.nsss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.small-sequence.badges.scale" },
    ],
  },
  "metagenome-raw": {
    leafId: "metagenome-raw",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA",
    summaryKey: "routes.submit.detail.leafDetails.metagenome-raw.summary",
    stepKeys: STEPS.bpBsDra,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-raw.badges.package" },
    ],
  },
  "metagenome-primary": {
    leafId: "metagenome-primary",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA (Analysis)",
    summaryKey: "routes.submit.detail.leafDetails.metagenome-primary.summary",
    stepKeys: STEPS.bpBsDraAnalysis,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-primary.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.metagenome-primary.badges.analysis" },
    ],
  },
  "metagenome-genome-bin": {
    leafId: "metagenome-genome-bin",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.metagenome-genome-bin.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-genome-bin.badges.mimag" },
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-genome-bin.badges.misag" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.metagenome-genome-bin.badges.mssType" },
    ],
  },
  "metagenome-tls": {
    leafId: "metagenome-tls",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.metagenome-tls.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-tls.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.metagenome-tls.badges.mssType" },
    ],
  },
  "metagenome-tsa": {
    leafId: "metagenome-tsa",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.metagenome-tsa.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.metagenome-tsa.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.metagenome-tsa.badges.mssType" },
    ],
  },
  "organelle-plasmid": {
    leafId: "organelle-plasmid",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS",
    summaryKey: "routes.submit.detail.leafDetails.organelle-plasmid.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.organelle-plasmid.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.organelle-plasmid.badges.mssType" },
    ],
  },
  "prokaryote-raw": {
    leafId: "prokaryote-raw",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA",
    summaryKey: "routes.submit.detail.leafDetails.prokaryote-raw.summary",
    stepKeys: STEPS.bpBsDra,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.prokaryote-raw.badges.package" },
    ],
  },
  "prokaryote-raw-assembly": {
    leafId: "prokaryote-raw-assembly",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.prokaryote-raw-assembly.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.prokaryote-raw-assembly.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.prokaryote-raw-assembly.badges.mssType" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.prokaryote-raw-assembly.links.dfast", url: "https://dfast.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "prokaryote-assembly-only": {
    leafId: "prokaryote-assembly-only",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS",
    summaryKey: "routes.submit.detail.leafDetails.prokaryote-assembly-only.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.prokaryote-assembly-only.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.prokaryote-assembly-only.badges.mssType" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.prokaryote-assembly-only.links.dfast", url: "https://dfast.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "virus-raw": {
    leafId: "virus-raw",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA",
    summaryKey: "routes.submit.detail.leafDetails.virus-raw.summary",
    stepKeys: STEPS.bpBsDra,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.virus-raw.badges.package" },
    ],
  },
  "virus-raw-assembly": {
    leafId: "virus-raw-assembly",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.virus-raw-assembly.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.virus-raw-assembly.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.virus-raw-assembly.badges.mssType" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.virus-raw-assembly.links.dfastVrl", url: "https://dfast.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "virus-assembly-only": {
    leafId: "virus-assembly-only",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS",
    summaryKey: "routes.submit.detail.leafDetails.virus-assembly-only.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.virus-assembly-only.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.virus-assembly-only.badges.mssType" },
    ],
    extraLinks: [
      { labelKey: "routes.submit.detail.leafDetails.virus-assembly-only.links.dfastVrl", url: "https://dfast.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "eukaryote-tsa": {
    leafId: "eukaryote-tsa",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-tsa.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-tsa.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-tsa.badges.mssType" },
    ],
  },
  "eukaryote-tpa": {
    leafId: "eukaryote-tpa",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-tpa.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-tpa.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-tpa.badges.mssType" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-tpa.badges.peerReviewed" },
    ],
  },
  "eukaryote-raw": {
    leafId: "eukaryote-raw",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-raw.summary",
    stepKeys: STEPS.bpBsDra,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-raw.badges.package" },
    ],
  },
  "eukaryote-raw-assembly": {
    leafId: "eukaryote-raw-assembly",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-raw-assembly.summary",
    stepKeys: STEPS.bpBsDraMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-raw-assembly.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-raw-assembly.badges.mssType" },
    ],
  },
  "eukaryote-assembly-only": {
    leafId: "eukaryote-assembly-only",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-assembly-only.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-assembly-only.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-assembly-only.badges.mssType" },
    ],
  },
  "eukaryote-haplotype-raw-assembly": {
    leafId: "eukaryote-haplotype-raw-assembly",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+DRA+MSS (Haplotype)",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-raw-assembly.summary",
    stepKeys: STEPS.bpBsDraMssHaplotype,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-raw-assembly.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-raw-assembly.badges.locusTag" },
    ],
  },
  "eukaryote-haplotype-assembly-only": {
    leafId: "eukaryote-haplotype-assembly-only",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS (Haplotype)",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-assembly-only.summary",
    stepKeys: STEPS.bpBsMssHaplotype,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-assembly-only.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-haplotype-assembly-only.badges.locusTag" },
    ],
  },
  "eukaryote-est-small": {
    leafId: "eukaryote-est-small",
    goalTemplateId: "nsss",
    goalLabel: "NSSS (EST)",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-est-small.summary",
    stepKeys: STEPS.nsss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-est-small.badges.scale" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-est-small.badges.est" },
    ],
  },
  "eukaryote-est-large": {
    leafId: "eukaryote-est-large",
    goalTemplateId: "genome",
    goalLabel: "BP+BS+MSS (EST)",
    summaryKey: "routes.submit.detail.leafDetails.eukaryote-est-large.summary",
    stepKeys: STEPS.bpBsMss,
    badges: [
      { variant: "primary", labelKey: "routes.submit.detail.leafDetails.eukaryote-est-large.badges.package" },
      { variant: "gray", labelKey: "routes.submit.detail.leafDetails.eukaryote-est-large.badges.est" },
    ],
  },
}
