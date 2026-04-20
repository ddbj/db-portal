import type { CardId, DetailOverview } from "@/types/submit"

// 概要レベル 9 枚。i18n キーは locales/{ja,en}.json で解決。
// 具体レベル（leaf 単位）の本文は src/content/submit/*.tsx に言語別 TSX として配置。
export const DETAIL_OVERVIEWS: Readonly<Record<CardId, DetailOverview>> = {
  "microbial": {
    cardId: "microbial",
    summaryKey: "routes.submit.detail.overviews.microbial.summary",
    hasThreeLayer: true,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.organelle-plasmid", leafId: "organelle-plasmid", goalLabel: "BP+BS+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.prokaryote-raw", leafId: "prokaryote-raw", goalLabel: "BP+BS+DRA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.prokaryote-raw-assembly", leafId: "prokaryote-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.prokaryote-assembly-only", leafId: "prokaryote-assembly-only", goalLabel: "BP+BS+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.virus-raw", leafId: "virus-raw", goalLabel: "BP+BS+DRA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.virus-raw-assembly", leafId: "virus-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.microbial.virus-assembly-only", leafId: "virus-assembly-only", goalLabel: "BP+BS+MSS" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.microbial.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.microbial.links.dway", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { labelKey: "routes.submit.detail.overviews.microbial.links.mss", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "eukaryote": {
    cardId: "eukaryote",
    summaryKey: "routes.submit.detail.overviews.eukaryote.summary",
    hasThreeLayer: true,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-raw", leafId: "eukaryote-raw", goalLabel: "BP+BS+DRA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-raw-assembly", leafId: "eukaryote-raw-assembly", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-assembly-only", leafId: "eukaryote-assembly-only", goalLabel: "BP+BS+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-haplotype-raw-assembly", leafId: "eukaryote-haplotype-raw-assembly", goalLabel: "BP+BS+DRA+MSS (Haplotype)" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-haplotype-assembly-only", leafId: "eukaryote-haplotype-assembly-only", goalLabel: "BP+BS+MSS (Haplotype)" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-tsa", leafId: "eukaryote-tsa", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-tpa", leafId: "eukaryote-tpa", goalLabel: "BP+BS+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-est-small", leafId: "eukaryote-est-small", goalLabel: "NSSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.eukaryote.eukaryote-est-large", leafId: "eukaryote-est-large", goalLabel: "BP+BS+MSS" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.eukaryote.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.eukaryote.links.dway", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { labelKey: "routes.submit.detail.overviews.eukaryote.links.mss", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "metagenome": {
    cardId: "metagenome",
    summaryKey: "routes.submit.detail.overviews.metagenome.summary",
    hasThreeLayer: true,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.metagenome.metagenome-raw", leafId: "metagenome-raw", goalLabel: "BP+BS+DRA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.metagenome.metagenome-primary", leafId: "metagenome-primary", goalLabel: "BP+BS+DRA (Analysis)" },
      { dataLabelKey: "routes.submit.detail.branchLabels.metagenome.metagenome-genome-bin", leafId: "metagenome-genome-bin", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.metagenome.metagenome-tls", leafId: "metagenome-tls", goalLabel: "BP+BS+DRA+MSS" },
      { dataLabelKey: "routes.submit.detail.branchLabels.metagenome.metagenome-tsa", leafId: "metagenome-tsa", goalLabel: "BP+BS+DRA+MSS" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.metagenome.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.metagenome.links.dway", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { labelKey: "routes.submit.detail.overviews.metagenome.links.mss", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html", external: true },
    ],
  },
  "expression": {
    cardId: "expression",
    summaryKey: "routes.submit.detail.overviews.expression.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.expression.expression-ngs", leafId: "expression-ngs", goalLabel: "BP+BS+DRA+GEA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.expression.expression-array", leafId: "expression-array", goalLabel: "BP+BS+GEA" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.expression.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.expression.links.dway", url: "https://ddbj.nig.ac.jp/D-way/", external: true },
      { labelKey: "routes.submit.detail.overviews.expression.links.gea", url: "https://www.ddbj.nig.ac.jp/gea/", external: true },
    ],
  },
  "variation": {
    cardId: "variation",
    summaryKey: "routes.submit.detail.overviews.variation.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.variation.variation-human-snp", leafId: "variation-human-snp", goalLabel: "JVar SNP" },
      { dataLabelKey: "routes.submit.detail.branchLabels.variation.variation-human-sv", leafId: "variation-human-sv", goalLabel: "JVar SV" },
      { dataLabelKey: "routes.submit.detail.branchLabels.variation.variation-nonhuman-snp", leafId: "variation-nonhuman-snp", goalLabel: "EVA" },
      { dataLabelKey: "routes.submit.detail.branchLabels.variation.variation-nonhuman-sv", leafId: "variation-nonhuman-sv", goalLabel: "dgVa" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.variation.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.variation.links.jvar", url: "https://www.ddbj.nig.ac.jp/jvar/", external: true },
      { labelKey: "routes.submit.detail.overviews.variation.links.eva", url: "https://www.ebi.ac.uk/eva/", external: true },
      { labelKey: "routes.submit.detail.overviews.variation.links.dgva", url: "https://www.ebi.ac.uk/dgva/", external: true },
    ],
  },
  "proteomics": {
    cardId: "proteomics",
    summaryKey: "routes.submit.detail.overviews.proteomics.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.proteomics.proteomics", leafId: "proteomics", goalLabel: "jPOST" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.proteomics.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.proteomics.links.jpost", url: "https://jpostdb.org/", external: true },
    ],
  },
  "metabolomics": {
    cardId: "metabolomics",
    summaryKey: "routes.submit.detail.overviews.metabolomics.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.metabolomics.metabolomics", leafId: "metabolomics", goalLabel: "BP+BS+MetaboBank" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.metabolomics.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.metabolomics.links.metabobank", url: "https://mb2.ddbj.nig.ac.jp/", external: true },
    ],
  },
  "small-sequence": {
    cardId: "small-sequence",
    summaryKey: "routes.submit.detail.overviews.small-sequence.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.small-sequence.small-sequence", leafId: "small-sequence", goalLabel: "NSSS" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.small-sequence.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.small-sequence.links.nsss", url: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html", external: true },
    ],
  },
  "human-restricted": {
    cardId: "human-restricted",
    summaryKey: "routes.submit.detail.overviews.human-restricted.summary",
    hasThreeLayer: false,
    branches: [
      { dataLabelKey: "routes.submit.detail.branchLabels.human-restricted.human-restricted", leafId: "human-restricted", goalLabel: "JGA" },
    ],
    commonRequirementsKey: "routes.submit.detail.overviews.human-restricted.commonRequirements",
    primaryLinks: [
      { labelKey: "routes.submit.detail.overviews.human-restricted.links.nbdc", url: "https://humandbs.dbcls.jp/", external: true },
      { labelKey: "routes.submit.detail.overviews.human-restricted.links.jga", url: "https://www.ddbj.nig.ac.jp/jga/", external: true },
    ],
  },
}
