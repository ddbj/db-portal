import type { FileEntry, FileEntryChip, FlowStep, GroupType, Service, Submission } from "~/schemas/submit"
import { PreviewCard } from "~/ui"

import { SOURCE_OF_SERVICE } from "../external-links"
import { deriveFlowSteps } from "../flow-rules"

type PreviewCardsProps = {
  baseSubmission: Submission
  entryId: string
  draftGroupType: GroupType
  draftDataForm: FileEntry["dataForm"]
  draftChipTags: readonly FileEntryChip[]
  previewTitle: (service: Service) => string
  previewBody: (service: Service) => string
  serviceCode: (service: Service) => string
}

const patchSubmission = (
  baseSubmission: Submission,
  entryId: string,
  groupType: GroupType,
  dataForm: FileEntry["dataForm"],
  chipTags: readonly FileEntryChip[],
): Submission => {
  const entries = baseSubmission.fileEntries.map((e) =>
    e.id === entryId ? { ...e, dataForm, chipTags: [...chipTags] } : e,
  )
  const entry = entries.find((e) => e.id === entryId)
  const groups = baseSubmission.fileGroups.map((g) =>
    entry !== undefined && g.id === entry.groupId ? { ...g, groupType } : g,
  )
  return { ...baseSubmission, fileEntries: entries, fileGroups: groups }
}

export const PreviewCards = ({
  baseSubmission,
  entryId,
  draftGroupType,
  draftDataForm,
  draftChipTags,
  previewTitle,
  previewBody,
  serviceCode,
}: PreviewCardsProps) => {
  const patched = patchSubmission(
    baseSubmission,
    entryId,
    draftGroupType,
    draftDataForm,
    draftChipTags,
  )
  const allSteps: FlowStep[] = deriveFlowSteps(patched)
  const steps = allSteps
    .filter((s) => s.scope.entryIds.includes(entryId))
    .filter((s) => SOURCE_OF_SERVICE[s.service] !== null)

  if (steps.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step) => {
        const source = SOURCE_OF_SERVICE[step.service]
        if (source === null) return null
        const active = !step.notes.some((n) => n.kind === "warning" || n.kind === "error")
        return (
          <PreviewCard
            key={step.id}
            source={source}
            db={serviceCode(step.service)}
            title={previewTitle(step.service)}
            body={previewBody(step.service)}
            active={active}
          />
        )
      })}
    </div>
  )
}
