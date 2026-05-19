import { Pencil, Trash2 } from "lucide-react"

import { Select } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { BUTTON_META } from "@/lib/mock-data/submit-alt3"
import type {
  AccessRestriction,
  ChipAxis,
  DataForm,
  FileEntry,
  FileGroup,
  Organism,
} from "@/types/submit-alt3"
import {
  ACCESS_RESTRICTIONS,
  ORGANISMS,
} from "@/types/submit-alt3"

import ChipList from "./ChipList"

interface Props {
  group: FileGroup
  files: readonly FileEntry[]
  highlighted?: boolean
  onEditCell: (
    fileId: string,
    column: "organism" | "accessRestriction" | "dataForm",
    value: Organism | AccessRestriction | DataForm | undefined,
  ) => void
  onRemove: (fileId: string) => void
  onEdit?: (fileId: string) => void
  onSetChip: (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => void
  onResetChipManual: (fileId: string, axis: ChipAxis) => void
}

const UNSET_VALUE = "__unset__"

// 1 行 = 1 Group 表示 (クラス A: SINGLE_ROW_GROUP_TYPES の Group)。
// SSOT: docs/submit-alt3.md §4.1 / docs/submit-alt3-tags.md §5.1。
// Group 内全 file は organism / access / dataForm / chip が共通である前提なので、
// 列の値は代表 file (memberFileIds[0]) を表示する。per-cell 編集は Group 内全 file に伝播。
const GroupFileRow = ({
  group,
  files,
  highlighted = false,
  onEditCell,
  onRemove,
  onEdit,
  onSetChip,
  onResetChipManual,
}: Props) => {
  const { t } = useDynamicTranslation()
  const representative = files[0]
  if (representative === undefined) return null

  const kindMeta = BUTTON_META[representative.buttonType]
  const kindLabel = t(
    `routes.submitAlt3.buttons.${kindMeta.i18nKey}.shortLabel`,
    { defaultValue: representative.buttonType },
  )

  const organismOptions = [
    {
      value: UNSET_VALUE,
      label: t("routes.submitAlt3.tableColumns.unset"),
    },
    ...ORGANISMS.map((o) => ({
      value: o,
      label: t(`routes.submitAlt3.tableColumns.organism.values.${o}`),
    })),
  ]

  const accessOptions = [
    {
      value: UNSET_VALUE,
      label: t("routes.submitAlt3.tableColumns.unset"),
    },
    ...ACCESS_RESTRICTIONS.map((a) => ({
      value: a,
      label: t(`routes.submitAlt3.tableColumns.access.values.${a}`),
    })),
  ]

  // Group 内全 file に同じ列値を伝播する。1 file = 1 BS 原則 (docs/submit-alt3.md §4.4) と
  // クラス A の前提 (Group 内全 file の列が共通) を維持する。
  const propagateEdit = (
    column: "organism" | "accessRestriction",
    value: Organism | AccessRestriction | undefined,
  ): void => {
    for (const f of files) onEditCell(f.id, column, value)
  }

  // chip 編集も Group 内全 file に伝播 (chip も Group 内で共通という前提)。
  const propagateSetChip = (
    _fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ): void => {
    for (const f of files) onSetChip(f.id, axis, value, manualOverride)
  }

  const propagateResetChipManual = (_fileId: string, axis: ChipAxis): void => {
    for (const f of files) onResetChipManual(f.id, axis)
  }

  const removeWholeGroup = (): void => {
    // 削除は files の全 id を順次。空 Group は reducer 側で自動削除される
    for (const f of files) onRemove(f.id)
  }

  return (
    <tr
      data-testid={`file-row-${representative.id}`}
      data-group-id={group.id}
      className={cn(highlighted && "bg-primary-50/40")}
    >
      <td data-testid={`file-cell-kind-${representative.id}`}>
        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {kindLabel}
        </span>
      </td>
      <td className="pl-4">
        <div className="space-y-0.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="font-mono text-xs text-gray-700"
              data-testid={`group-file-name-${f.id}`}
            >
              {f.displayName}
            </div>
          ))}
        </div>
      </td>
      <td data-testid={`file-cell-organism-${representative.id}`}>
        <Select
          selectSize="sm"
          options={organismOptions}
          value={representative.organism ?? UNSET_VALUE}
          invalid={representative.organism === undefined}
          aria-label={t("routes.submitAlt3.tableColumns.organism.label")}
          onChange={(e) =>
            propagateEdit(
              "organism",
              e.target.value === UNSET_VALUE
                ? undefined
                : (e.target.value as Organism),
            )
          }
        />
      </td>
      <td data-testid={`file-cell-access-${representative.id}`}>
        <Select
          selectSize="sm"
          options={accessOptions}
          value={representative.accessRestriction ?? UNSET_VALUE}
          invalid={representative.accessRestriction === undefined}
          aria-label={t("routes.submitAlt3.tableColumns.access.label")}
          onChange={(e) =>
            propagateEdit(
              "accessRestriction",
              e.target.value === UNSET_VALUE
                ? undefined
                : (e.target.value as AccessRestriction),
            )
          }
        />
      </td>
      <td data-testid={`file-cell-chips-${representative.id}`}>
        <ChipList
          fileId={representative.id}
          buttonType={representative.buttonType}
          chipTags={representative.chipTags}
          onSetChip={propagateSetChip}
          onResetChipManual={propagateResetChipManual}
        />
      </td>
      <td className="text-right">
        <div className="inline-flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              data-testid={`file-row-edit-${representative.id}`}
              onClick={() => onEdit(representative.id)}
              className="hover:bg-primary-50 hover:text-primary-700 focus:ring-primary-200 rounded p-1 text-gray-400 transition-colors focus:ring-2 focus:outline-none"
              aria-label={t("routes.submitAlt3.table.editRow", {
                defaultValue: "この行を編集",
              })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={removeWholeGroup}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:ring-2 focus:ring-rose-200 focus:outline-none"
            aria-label={t("routes.submitAlt3.table.removeRow")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default GroupFileRow
