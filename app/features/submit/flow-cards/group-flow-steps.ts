import type { FileEntry, FlowStep } from "~/schemas/submit"
import { isCompanionService, serviceRoleTagKey } from "~/schemas/submit"

export type FlowStepGroupKey = "companion" | "gate" | "restricted" | "open" | "destination"
export type FlowStepGroup = { key: FlowStepGroupKey; steps: readonly FlowStep[] }

const touchesRestrictedEntry = (step: FlowStep, entries: readonly FileEntry[]): boolean =>
  entries.some((e) => step.scope.entryIds.includes(e.id) && e.access === "restricted")

// サマリーのカードを表示グループに分ける。グループ内は入力 (Step 依存のトポロジカル順) の順序を保つ。
// ヒトでは提供申請 (humandbs) を公開区分のグループに入れない。提供申請は制限公開・非制限公開の
// どちらにも登録前に必要で、片方のグループに置くともう片方には不要に見えるため
export const groupFlowSteps = (
  steps: readonly FlowStep[],
  entries: readonly FileEntry[],
  isHuman: boolean,
): FlowStepGroup[] => {
  const companion = steps.filter((s) => isCompanionService(s.service))
  const rest = steps.filter((s) => !isCompanionService(s.service))

  const candidates: FlowStepGroup[] = isHuman
    ? [
      { key: "companion", steps: companion },
      { key: "gate", steps: rest.filter((s) => serviceRoleTagKey(s.service) === "gate") },
      {
        key: "restricted",
        steps: rest.filter((s) => serviceRoleTagKey(s.service) !== "gate" && touchesRestrictedEntry(s, entries)),
      },
      {
        key: "open",
        steps: rest.filter((s) => serviceRoleTagKey(s.service) !== "gate" && !touchesRestrictedEntry(s, entries)),
      },
    ]
    : [
      { key: "companion", steps: companion },
      { key: "destination", steps: rest },
    ]

  return candidates.filter((g) => g.steps.length > 0)
}
