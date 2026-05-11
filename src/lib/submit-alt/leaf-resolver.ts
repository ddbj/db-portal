import {
  LEAF_QA_CONDITIONS,
  type LeafCondition,
} from "@/lib/mock-data/submit-alt-tree"
import type { LeafNodeIdAlt, QAAnswers } from "@/types/submit-alt"

// 厳格マッチ判定: 条件で指定された全 Q が回答済みかつ値が一致している必要がある。
// 一意化 (resolveLeafFromAnswers) で使う。
const matchesConditionStrict = (
  cond: LeafCondition,
  answers: QAAnswers,
): boolean => {
  for (const id of cond.q1MustHave) {
    if (!answers.q1.has(id)) return false
  }
  if (cond.q1MustNotHave) {
    for (const id of cond.q1MustNotHave) {
      if (answers.q1.has(id)) return false
    }
  }
  if (cond.q2 !== undefined && answers.q2 !== cond.q2) return false
  if (cond.q2In !== undefined) {
    if (answers.q2 === null) return false
    if (!cond.q2In.includes(answers.q2)) return false
  }
  if (cond.q3 !== undefined && answers.q3 !== cond.q3) return false
  if (cond.q4 !== undefined && answers.q4 !== cond.q4) return false
  if (cond.q5 !== undefined && answers.q5 !== cond.q5) return false
  if (cond.q6MustHave) {
    for (const id of cond.q6MustHave) {
      if (!answers.q6.has(id)) return false
    }
  }
  if (cond.q7 !== undefined && answers.q7 !== cond.q7) return false
  if (cond.q8 !== undefined && answers.q8 !== cond.q8) return false
  if (cond.q9 !== undefined && answers.q9 !== cond.q9) return false

  return true
}

// 緩いマッチ判定: 条件で指定された Q のうち、回答済みのもののみ照合。
// 未回答 (null / 空 Set) の Q は無視 = まだ絞り込まれていない候補として残す。
// 候補リスト表示 (findMatchingLeaves) で使う。
const matchesConditionLoose = (
  cond: LeafCondition,
  answers: QAAnswers,
): boolean => {
  for (const id of cond.q1MustHave) {
    if (!answers.q1.has(id)) return false
  }
  if (cond.q1MustNotHave) {
    for (const id of cond.q1MustNotHave) {
      if (answers.q1.has(id)) return false
    }
  }
  if (cond.q2 !== undefined && answers.q2 !== null && answers.q2 !== cond.q2) {
    return false
  }
  if (cond.q2In !== undefined && answers.q2 !== null) {
    if (!cond.q2In.includes(answers.q2)) return false
  }
  if (
    cond.q3 !== undefined
    && answers.q3 !== null
    && answers.q3 !== cond.q3
  ) return false
  if (
    cond.q4 !== undefined
    && answers.q4 !== null
    && answers.q4 !== cond.q4
  ) return false
  if (
    cond.q5 !== undefined
    && answers.q5 !== null
    && answers.q5 !== cond.q5
  ) return false
  if (cond.q6MustHave && answers.q6.size > 0) {
    for (const id of cond.q6MustHave) {
      if (!answers.q6.has(id)) return false
    }
  }
  if (
    cond.q7 !== undefined
    && answers.q7 !== null
    && answers.q7 !== cond.q7
  ) return false
  if (
    cond.q8 !== undefined
    && answers.q8 !== null
    && answers.q8 !== cond.q8
  ) return false
  if (
    cond.q9 !== undefined
    && answers.q9 !== null
    && answers.q9 !== cond.q9
  ) return false

  return true
}

// 緩いマッチで条件にマッチする leaf を返す。
// Q1 / Q2 必須軸は厳密、Q3-Q9 は未回答なら無視 → 部分回答状態でも候補が見える。
export const findMatchingLeaves = (
  answers: QAAnswers,
): readonly LeafNodeIdAlt[] => {
  // Q1 / Q2 が片方でも未回答なら候補表示しない (回答開始前の状態)
  if (answers.q1.size === 0 || answers.q2 === null) return []

  return LEAF_QA_CONDITIONS
    .filter((c) => matchesConditionLoose(c, answers))
    .map((c) => c.leafId)
}

// 厳格マッチで一意に決まれば leaf を返す。0 件 / 2 件以上は null。
export const resolveLeafFromAnswers = (
  answers: QAAnswers,
): LeafNodeIdAlt | null => {
  const matched = LEAF_QA_CONDITIONS
    .filter((c) => matchesConditionStrict(c, answers))
    .map((c) => c.leafId)
  if (matched.length === 1) return matched[0] ?? null

  return null
}
