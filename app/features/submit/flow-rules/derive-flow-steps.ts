import type { FlowStep, Submission } from "~/schemas/submit"

import { deriveFlowContext } from "./context"
import { byServicePhysicalOrder } from "./ordering"
import { annotationStep } from "./steps/annotation"
import { bioprojectStep } from "./steps/bioproject"
import { biosampleStep } from "./steps/biosample"
import { draStep } from "./steps/dra"
import { geaStep } from "./steps/gea"
import { jgaStep } from "./steps/jga"
import { metabobankStep } from "./steps/metabobank"
import { multiModalStep } from "./steps/multi-modal"
import { thirdPartyStep } from "./steps/third-party"
import { umbrellaBioprojectStep } from "./steps/umbrella-bioproject"
import { variationStep } from "./steps/variation"

export const deriveFlowSteps = (submission: Submission): FlowStep[] => {
  const ctx = deriveFlowContext(submission)
  const all: FlowStep[] = [
    ...biosampleStep(submission, ctx),
    ...bioprojectStep(submission, ctx),
    ...umbrellaBioprojectStep(submission, ctx),
    ...draStep(submission, ctx),
    ...jgaStep(submission, ctx),
    ...annotationStep(submission, ctx),
    ...variationStep(submission, ctx),
    ...geaStep(submission, ctx),
    ...metabobankStep(submission, ctx),
    ...thirdPartyStep(submission, ctx),
    ...multiModalStep(submission, ctx),
  ]
  return [...all].sort(byServicePhysicalOrder)
}
