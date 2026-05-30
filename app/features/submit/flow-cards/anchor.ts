// FlowOverview の chip と FlowStepCard を結ぶ DOM anchor。両者は同順の steps[] を
// index で走査するため、index を id 化すれば service id を sanitize せずに対応づく。
export const stepAnchorId = (index: number): string => `flow-step-${index}`

export const scrollToStep = (index: number): void => {
  if (typeof document === "undefined") return
  document.getElementById(stepAnchorId(index))?.scrollIntoView({ behavior: "smooth", block: "start" })
}
