// Rule 10: phenotype / JGA Dataset
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 10
//
// 10a (restricted phenotype): Rule 6 経路 (rule06 が JGA Dataset Step を生成)
// 10b (open phenotype / 非 human): 独立 Step なし、BS Step (rule03) のサンプル属性として吸収。
//                                  ここでは BS Step に「phenotype 取込 UI」notes を付ける拡張は rule03 に統合済み。
//                                  本 rule では Section A 上の警告メタを返す (今後の拡張用)。
// 10c (個人特定情報判定 UX): + 表現型データ modal で「個人特定 yes/no/不明」を確認。
//                            yes → access=restricted 自動 (reducer 内 autoAccess で対応済み)。
//                            不明 → restricted 暫定 + JGA Sample Step notes に Contact (rule06 で対応済み)。
//
// PoC 実装方針: rule10 が独立 Step を出すケースはなく、rule06 / rule03 / reducer で実装済み。
// 本 rule は将来の拡張用に skeleton として用意し、現状は空配列を返す。

import type {
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type { JgaContext } from "./context"

export const generateRule10Steps = (
  _submission: Submission,
  _jga: JgaContext,
): FlowStep[] => {
  // Rule 10a → rule06 で JGA Dataset Step を生成済み
  // Rule 10b → rule03 で BS Step のサンプル属性として吸収予定 (PoC は UI 側で対応)
  // Rule 10c → reducer.autoAccess + rule06 の JGA Sample Step notes で対応済み
  return []
}
