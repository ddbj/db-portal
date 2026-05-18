import { Trash2 } from "lucide-react"

import { Select } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type {
  AccessRestriction,
  ChipAxis,
  DataForm,
  FileEntry,
  Organism,
} from "@/types/submit-alt3"
import {
  ACCESS_RESTRICTIONS,
  ORGANISMS,
} from "@/types/submit-alt3"

import ChipList from "./ChipList"

interface Props {
  file: FileEntry
  indent?: boolean
  // MAG/SAG chain 内の派生段階インデント深さ (0=raw / 1=primary / 2=binned / 3=mag・sag、Rule 8a)
  magSagDepth?: 0 | 1 | 2 | 3
  highlighted?: boolean
  onEditCell: (
    fileId: string,
    column: "organism" | "accessRestriction" | "dataForm",
    value: Organism | AccessRestriction | DataForm | undefined,
  ) => void
  onRemove: (fileId: string) => void
  onSetChip: (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => void
  onResetChipManual: (fileId: string, axis: ChipAxis) => void
}

// MAG/SAG chain Group の派生段階用 padding-left (Tailwind class)。
// 深さ 0=raw を Group ヘッダー直下 (pl-10) として、1 段ごとに pl-4 ずつ深くする
const MAG_SAG_INDENT_CLASS: Readonly<Record<0 | 1 | 2 | 3, string>> = {
  0: "pl-10",
  1: "pl-14",
  2: "pl-18",
  3: "pl-22",
}

const UNSET_VALUE = "__unset__"

const FileRow = ({
  file,
  indent = false,
  magSagDepth,
  highlighted = false,
  onEditCell,
  onRemove,
  onSetChip,
  onResetChipManual,
}: Props) => {
  const { t } = useDynamicTranslation()

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

  return (
    <tr
      data-testid={`file-row-${file.id}`}
      className={cn(highlighted && "bg-primary-50/40")}
    >
      <td
        className={cn(
          magSagDepth !== undefined
            ? MAG_SAG_INDENT_CLASS[magSagDepth]
            : indent
              ? "pl-10"
              : "pl-4",
          "font-mono text-xs text-gray-700",
        )}
        data-mag-sag-depth={magSagDepth ?? undefined}
      >
        {file.displayName}
      </td>
      <td data-testid={`file-cell-organism-${file.id}`}>
        <Select
          selectSize="sm"
          options={organismOptions}
          value={file.organism ?? UNSET_VALUE}
          invalid={file.organism === undefined}
          aria-label={t("routes.submitAlt3.tableColumns.organism.label")}
          onChange={(e) =>
            onEditCell(
              file.id,
              "organism",
              e.target.value === UNSET_VALUE
                ? undefined
                : (e.target.value as Organism),
            )
          }
        />
      </td>
      <td data-testid={`file-cell-access-${file.id}`}>
        <Select
          selectSize="sm"
          options={accessOptions}
          value={file.accessRestriction ?? UNSET_VALUE}
          invalid={file.accessRestriction === undefined}
          aria-label={t("routes.submitAlt3.tableColumns.access.label")}
          onChange={(e) =>
            onEditCell(
              file.id,
              "accessRestriction",
              e.target.value === UNSET_VALUE
                ? undefined
                : (e.target.value as AccessRestriction),
            )
          }
        />
      </td>
      <td data-testid={`file-cell-dataForm-${file.id}`}>
        {/* dataForm は追加時の modal で確定 (Button + chip から自動推測)。
            テーブル上は read-only で表示し、列内編集は提供しない。 */}
        <span
          className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          aria-label={t("routes.submitAlt3.tableColumns.dataForm.label")}
        >
          {file.dataForm !== undefined
            ? t(`routes.submitAlt3.tableColumns.dataForm.values.${file.dataForm}`)
            : t("routes.submitAlt3.tableColumns.unset")}
        </span>
      </td>
      <td data-testid={`file-cell-chips-${file.id}`}>
        <ChipList
          fileId={file.id}
          chipTags={file.chipTags}
          onSetChip={onSetChip}
          onResetChipManual={onResetChipManual}
        />
      </td>
      <td className="text-right">
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 focus:ring-2 focus:ring-rose-200 focus:outline-none"
          aria-label={t("routes.submitAlt3.table.removeRow")}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  )
}

export default FileRow
