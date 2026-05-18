// submit-alt3 controlled vocabulary masters (Phase A 最小版)
// SSOT: docs/submit-alt3-tags.md §5 / docs/submit-alt3-modals.md §6 / docs/submit-alt3-flow-rules.md
// Phase A では「+ 配列リード」 modal と Section B (BP + BS + DRA Run) を動かすのに必要な値のみ。
// 残り (BP/BS pulldown / chip 軸の全値域 / DRA 36 種 / GEA 40 種 等) は Phase B 以降で拡張。

import type {
  ButtonType,
  DataForm,
  Organism,
  ServiceKind,
} from "@/types/submit-alt3"

// ----- ButtonType メタ情報 -----

export interface ButtonMeta {
  // i18n key suffix (buttons.<key>.label / .description)
  i18nKey: string
  // lucide-react icon 名 (実体は AddFileButtonGrid で動的に解決)
  iconName: string
  // ButtonType 押下時の dataForm 列初期値
  defaultDataForm: DataForm
}

export const BUTTON_META: Readonly<Record<ButtonType, ButtonMeta>> = {
  "sequence-read": {
    i18nKey: "sequenceRead",
    iconName: "Dna",
    defaultDataForm: "raw",
  },
  "assembled": {
    i18nKey: "assembled",
    iconName: "Layers",
    defaultDataForm: "assembled",
  },
  "annotation": {
    i18nKey: "annotation",
    iconName: "Tags",
    defaultDataForm: "annotation",
  },
  "variation": {
    i18nKey: "variation",
    iconName: "GitBranch",
    defaultDataForm: "analysis-output",
  },
  "phenotype": {
    i18nKey: "phenotype",
    iconName: "ClipboardList",
    defaultDataForm: "phenotype",
  },
  "expression-array": {
    i18nKey: "expressionArray",
    iconName: "Grid3x3",
    defaultDataForm: "raw",
  },
  "expression-matrix": {
    i18nKey: "expressionMatrix",
    iconName: "BarChart3",
    defaultDataForm: "matrix",
  },
  "mass-spec": {
    i18nKey: "massSpec",
    iconName: "FlaskConical",
    defaultDataForm: "mass-spec",
  },
  "spatial-tx": {
    i18nKey: "spatialTx",
    iconName: "Hexagon",
    defaultDataForm: "matrix",
  },
}

// 3x3 grid 表示順序 (本体 §3 と一致)
export const BUTTON_GRID_ORDER: readonly ButtonType[] = [
  "sequence-read",
  "assembled",
  "annotation",
  "variation",
  "phenotype",
  "expression-array",
  "expression-matrix",
  "mass-spec",
  "spatial-tx",
]

// ----- Organism → BS Package デフォルト -----

// Rule 3 の表 (data-model.md / flow-rules.md)。
// 値は内部キー (kebab-case)、SSOT 表示名は tags.md §5.3。
export const ORGANISM_DEFAULT_BS_PACKAGE: Readonly<Record<Organism, string>> = {
  "human": "human",
  "human-microbiome": "mims-me",
  "eukaryote": "model-organism-or-animal",
  "prokaryote": "microbe",
  "virus": "viral",
  "metagenome": "mims-me",
  "organelle-plasmid": "specialized",
}

// ----- ServiceKind -> badgeKind / 表示順 -----

export const SERVICE_PHYSICAL_ORDER: readonly ServiceKind[] = [
  "dbcls-application",
  "umbrella-bioproject",
  "primary-bioproject",
  "biosample",
  "dra",
  "mss",
  "gea",
  "metabobank",
  "togovar",
  "jga-submission",
  "jga-study",
  "jga-sample",
  "jga-experiment",
  "jga-data",
  "jga-analysis",
  "jga-dataset",
  "jga-policy",
  "jpost",
  "eva",
  "dgva",
  "humandbs",
]

// 各 ServiceKind が発行する accession prefix のテンプレート (tags.md §5.5)
// 配列で複数 prefix (DRA Run + DRA Experiment 等) を表現。空配列 = 外部 Service
export const SERVICE_ACCESSION_TYPES: Readonly<Record<ServiceKind, readonly string[]>> = {
  "umbrella-bioproject": ["PRJDB#####"],
  "primary-bioproject": ["PRJDB#####"],
  "biosample": ["SAMD#####"],
  "dra": ["DRR#####", "DRX#####"],
  "mss": ["INSDC prefix"],
  "gea": ["E-GEAD-n"],
  "metabobank": ["MTBKSn"],
  "togovar": ["dstd###"],
  "jga-submission": ["JGA######"],
  "jga-study": ["JGAS######"],
  "jga-sample": ["JGAN#########"],
  "jga-experiment": ["JGAX#########"],
  "jga-data": ["JGAR#########"],
  "jga-analysis": ["JGAZ#########"],
  "jga-dataset": ["JGAD######"],
  "jga-policy": ["JGAP######"],
  "dbcls-application": [],
  "jpost": [],
  "eva": [],
  "dgva": [],
  "humandbs": [],
}
