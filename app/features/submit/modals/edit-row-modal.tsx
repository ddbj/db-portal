import { useEffect, useId, useState } from "react"

import type { DataForm, FileEntry, FileEntryChip, FileGroup, GroupType, Service, Submission } from "~/schemas/submit"
import {
  Button,
  FmtCheck,
  FmtRadio,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPreview,
  Tag,
} from "~/ui"

import type { FormGroupDef, FormOptionDef } from "./form-defs"
import { ROW_FORM_DEFS } from "./form-defs"
import { PreviewCards } from "./preview-cards"

type EditRowModalLabels = {
  closeAriaLabel: string
  title: string
  description: string
  saveLabel: string
  cancelLabel: string
  statusReady: string
  previewLabel: string
  previewFootnote: string
  fileTypeKindLabel: string
  groupLabel: (id: string) => string
  optionLabel: (key: string) => string
  optionSub: (key: string | undefined) => string | undefined
  previewTitle: (service: Service) => string
  previewBody: (service: Service) => string
  serviceCode: (service: Service) => string
}

type EditRowModalProps = {
  open: boolean
  entry: FileEntry
  group: FileGroup | undefined
  baseSubmission: Submission
  labels: EditRowModalLabels
  onClose: () => void
  onCommit: (patch: { groupType: GroupType; dataForm: DataForm; chipTags: FileEntryChip[] }) => void
}

type Draft = {
  groupType: GroupType
  dataForm: DataForm
  chipTags: FileEntryChip[]
}

const optionMatches = (option: FormOptionDef, draft: Draft): boolean => {
  const { effect } = option
  if (effect.groupType !== undefined && effect.groupType !== draft.groupType) return false
  if (effect.dataForm !== undefined && effect.dataForm !== draft.dataForm) return false
  const { chipAdd } = effect
  if (chipAdd !== undefined) {
    const exists = draft.chipTags.some(
      (c) => c.axis === chipAdd.axis && c.value === chipAdd.value,
    )
    if (!exists) return false
  }
  if (effect.chipRemoveAxis !== undefined) {
    const present = draft.chipTags.some((c) => c.axis === effect.chipRemoveAxis)
    if (present) return false
  }
  return true
}

const applyRadio = (
  draft: Draft,
  option: FormOptionDef,
  groupOptions: readonly FormOptionDef[],
): Draft => {
  let chipTags = draft.chipTags.slice()
  for (const sibling of groupOptions) {
    const sibChipAdd = sibling.effect.chipAdd
    if (sibChipAdd !== undefined) {
      chipTags = chipTags.filter(
        (c) => !(c.axis === sibChipAdd.axis && c.value === sibChipAdd.value),
      )
    }
  }
  const { effect } = option
  const { chipAdd } = effect
  if (chipAdd !== undefined) {
    chipTags = chipTags.filter((c) => c.axis !== chipAdd.axis)
    chipTags.push(chipAdd)
  }
  if (effect.chipRemoveAxis !== undefined) {
    chipTags = chipTags.filter((c) => c.axis !== effect.chipRemoveAxis)
  }
  return {
    groupType: effect.groupType ?? draft.groupType,
    dataForm: effect.dataForm ?? draft.dataForm,
    chipTags,
  }
}

const toggleCheck = (
  draft: Draft,
  option: FormOptionDef,
  currentlyChecked: boolean,
): Draft => {
  let chipTags = draft.chipTags.slice()
  const { effect } = option
  const { chipAdd } = effect
  if (currentlyChecked) {
    if (chipAdd !== undefined) {
      chipTags = chipTags.filter(
        (c) => !(c.axis === chipAdd.axis && c.value === chipAdd.value),
      )
    }
    return { ...draft, chipTags }
  }
  if (chipAdd !== undefined) {
    chipTags = chipTags.filter((c) => c.axis !== chipAdd.axis)
    chipTags.push(chipAdd)
  }
  return {
    groupType: effect.groupType ?? draft.groupType,
    dataForm: effect.dataForm ?? draft.dataForm,
    chipTags,
  }
}

const initDraft = (entry: FileEntry, group: FileGroup | undefined): Draft => ({
  groupType: group?.groupType ?? "single",
  dataForm: entry.dataForm,
  chipTags: [...entry.chipTags],
})

export const EditRowModal = ({
  open,
  entry,
  group,
  baseSubmission,
  labels,
  onClose,
  onCommit,
}: EditRowModalProps) => {
  const titleId = useId()
  const def = ROW_FORM_DEFS[entry.fileTypeKind]
  const [draft, setDraft] = useState<Draft>(() => initDraft(entry, group))

  useEffect(() => {
    setDraft(initDraft(entry, group))
    // 編集中 entry が切り替わった時のみ draft を初期化 (modal 開閉中は drift しないよう entry / group の内部書き換えは無視)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id])

  const handleRadio = (g: FormGroupDef, option: FormOptionDef) => {
    setDraft((prev) => applyRadio(prev, option, g.options))
  }
  const handleCheck = (option: FormOptionDef) => {
    const checked = optionMatches(option, draft)
    setDraft((prev) => toggleCheck(prev, option, checked))
  }

  const handleSave = () => {
    onCommit({
      groupType: draft.groupType,
      dataForm: draft.dataForm,
      chipTags: draft.chipTags,
    })
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabelledby={titleId} width={820}>
      <ModalHeader
        eyebrowTag={<Tag kind="tag" size="sm">{labels.fileTypeKindLabel}</Tag>}
        eyebrowMeta={entry.filename === "" ? undefined : entry.filename}
        title={labels.title}
        titleId={titleId}
        description={labels.description}
        onClose={onClose}
        closeLabel={labels.closeAriaLabel}
      />
      <ModalBody cols={2}>
        <div className="flex-1 px-5 py-5 overflow-auto">
          {def.groups.map((g) => (
            <FormGroup key={g.id} num={g.num} label={labels.groupLabel(g.labelKey)}>
              {g.options.map((opt) => {
                const checked = optionMatches(opt, draft)
                const label = labels.optionLabel(opt.labelKey)
                const sub = labels.optionSub(opt.subKey)
                if (g.kind === "radio") {
                  return (
                    <FmtRadio
                      key={opt.value}
                      name={`${entry.id}-${g.id}`}
                      label={label}
                      sub={sub}
                      value={opt.value}
                      checked={checked}
                      onChange={() => handleRadio(g, opt)}
                    />
                  )
                }
                return (
                  <FmtCheck
                    key={opt.value}
                    name={`${entry.id}-${g.id}`}
                    label={label}
                    sub={sub}
                    value={opt.value}
                    checked={checked}
                    onChange={() => handleCheck(opt)}
                  />
                )
              })}
            </FormGroup>
          ))}
        </div>
        <ModalPreview label={labels.previewLabel} footnote={labels.previewFootnote}>
          <PreviewCards
            baseSubmission={baseSubmission}
            entryId={entry.id}
            draftGroupType={draft.groupType}
            draftDataForm={draft.dataForm}
            draftChipTags={draft.chipTags}
            previewTitle={labels.previewTitle}
            previewBody={labels.previewBody}
            serviceCode={labels.serviceCode}
          />
        </ModalPreview>
      </ModalBody>
      <ModalFooter
        status={labels.statusReady}
        actions={
          <>
            <Button kind="secondary" onClick={onClose}>{labels.cancelLabel}</Button>
            <Button kind="primary" onClick={handleSave}>{labels.saveLabel}</Button>
          </>
        }
      />
    </Modal>
  )
}
