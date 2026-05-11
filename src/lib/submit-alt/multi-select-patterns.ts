import type { MultiSelectPattern, QAAnswers } from "@/types/submit-alt"

// docs/submit-alt.md「マルチ選択時の登録フロー案内」参照。Q&A 回答から登録フローのパターンを判定する。
// 優先順位:
//   1. Q1 が 0 or 1 個 → single (まだ単一登録ルートに見える)
//   2. Q2=human + Q3=restricted → jga-unified（JGA で一本化）
//   3. mass-spec + Q7=proteomics → fully-independent（jPOST が外部）
//   4. variation 含む → fully-independent (EVA / dgVa / JVar など別フロー)
//   5. mass-spec + Q7=metabolomics → shared-bp-bs (BP/BS 共有 + MetaboBank)
//   6. それ以外 → merged-submission
export const resolveMultiSelectPattern = (
  answers: QAAnswers,
): MultiSelectPattern => {
  if (answers.q1.size <= 1) return "single"
  if (answers.q2 === "human" && answers.q3 === "restricted") return "jga-unified"
  if (answers.q1.has("mass-spec") && answers.q7 === "proteomics") {
    return "fully-independent"
  }
  if (answers.q1.has("variation")) return "fully-independent"
  if (answers.q1.has("mass-spec") && answers.q7 === "metabolomics") {
    return "shared-bp-bs"
  }

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
