import type { DataTypeId, MultiSelectPattern } from "@/types/submit-alt"

// docs/submit-alt.md L83-94 参照。types= の組み合わせから登録フローのパターンを判定する。
// 優先順位:
//   1. 単一項目 (size 0/1) → single
//   2. ヒト制限あり → jga-unified（JGA で一本化）
//   3. プロテオミクス含む → fully-independent（jPOST が外部のため BP/BS も共有不可）
//   4. バリアント解析 + 非ヒト → fully-independent（EVA / dgVa が外部）
//   5. メタボロミクス含む → shared-bp-bs（BP/BS 共有 + MetaboBank）
//   6. それ以外 → merged-submission
export const resolveMultiSelectPattern = (
  types: ReadonlySet<DataTypeId>,
  humanOnly: boolean,
): MultiSelectPattern => {
  if (types.size <= 1) return "single"
  if (types.has("human-restricted")) return "jga-unified"
  if (types.has("proteomics")) return "fully-independent"
  if (types.has("variation") && !humanOnly) return "fully-independent"
  if (types.has("metabolomics")) return "shared-bp-bs"

  return "merged-submission"
}

export const PATTERN_I18N_KEYS: Readonly<Record<
  MultiSelectPattern,
  { title: string; description: string }
>> = {
  "single": {
    title: "routes.submitAlt.multiSelect.patterns.single.title",
    description: "routes.submitAlt.multiSelect.patterns.single.description",
  },
  "merged-submission": {
    title: "routes.submitAlt.multiSelect.patterns.merged-submission.title",
    description: "routes.submitAlt.multiSelect.patterns.merged-submission.description",
  },
  "shared-bp-bs": {
    title: "routes.submitAlt.multiSelect.patterns.shared-bp-bs.title",
    description: "routes.submitAlt.multiSelect.patterns.shared-bp-bs.description",
  },
  "fully-independent": {
    title: "routes.submitAlt.multiSelect.patterns.fully-independent.title",
    description: "routes.submitAlt.multiSelect.patterns.fully-independent.description",
  },
  "jga-unified": {
    title: "routes.submitAlt.multiSelect.patterns.jga-unified.title",
    description: "routes.submitAlt.multiSelect.patterns.jga-unified.description",
  },
}

export const PATTERN_CALLOUT_VARIANT: Readonly<
  Record<MultiSelectPattern, "info" | "success" | "warning" | "error">
> = {
  "single": "info",
  "merged-submission": "success",
  "shared-bp-bs": "info",
  "fully-independent": "warning",
  "jga-unified": "warning",
}
