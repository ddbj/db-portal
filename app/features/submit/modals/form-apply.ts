import type { DataForm, FileEntry, FileEntryChip, FileGroup, GroupType } from "~/schemas/submit"

import type { FormOptionDef } from "./form-defs"

// 行詳細フォームの作業値。EditRowModal の draft と DataDetailPanel の live state が共有する。
export type Draft = {
  groupType: GroupType
  dataForm: DataForm
  chipTags: FileEntryChip[]
}

export const initDraft = (entry: FileEntry, group: FileGroup | undefined): Draft => ({
  groupType: group?.groupType ?? "single",
  dataForm: entry.dataForm,
  chipTags: [...entry.chipTags],
})

// option の effect が現在の draft に既に反映されているか (radio の選択状態 / check の ON 判定)
export const optionMatches = (option: FormOptionDef, draft: Draft): boolean => {
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

export const applyRadio = (
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

export const toggleCheck = (
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
