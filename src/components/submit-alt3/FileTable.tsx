import { Fragment } from "react"

import { Table } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { isSingleRowGroup } from "@/lib/submit-alt3"
import type {
  AccessRestriction,
  ChipAxis,
  DataForm,
  FileEntry,
  Organism,
  Submission,
} from "@/types/submit-alt3"

import FileRow from "./FileRow"
import GroupFileRow from "./GroupFileRow"
import GroupHeader from "./GroupHeader"

// MAG/SAG chain Group での派生段階。Rule 8a の raw → primary → binned → mag/sag に対応
const magSagDepthOf = (file: FileEntry): 0 | 1 | 2 | 3 => {
  switch (file.role) {
    case "primary-fasta":
      return 1
    case "binned-fasta":
      return 2
    case "mag-fasta":
      return 3
    default:
      return 0
  }
}

interface Props {
  submission: Submission
  highlightedFileIds?: ReadonlySet<string> | undefined
  onEditCell: (
    fileId: string,
    column: "organism" | "accessRestriction" | "dataForm",
    value: Organism | AccessRestriction | DataForm | undefined,
  ) => void
  onRemoveFile: (fileId: string) => void
  onEditRow?: (fileId: string) => void
  onSetChip: (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => void
  onResetChipManual: (fileId: string, axis: ChipAxis) => void
}

// Section A 内のテーブル本体
// SSOT: docs/submit-alt3.md §2 / §5
const FileTable = ({
  submission,
  highlightedFileIds,
  onEditCell,
  onRemoveFile,
  onEditRow,
  onSetChip,
  onResetChipManual,
}: Props) => {
  const { t } = useDynamicTranslation()

  if (submission.fileEntries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
        {t("routes.submitAlt3.table.emptyHint")}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <Table>
        <thead>
          <tr>
            <th>
              {t("routes.submitAlt3.tableColumns.kind.label")}
            </th>
            <th className="w-1/3">
              {t("routes.submitAlt3.tableColumns.file.label")}
            </th>
            <th>
              {t("routes.submitAlt3.tableColumns.organism.label")}
            </th>
            <th>
              {t("routes.submitAlt3.tableColumns.access.label")}
            </th>
            <th>
              {t("routes.submitAlt3.tableColumns.chips.label")}
            </th>
            <th aria-label={t("routes.submitAlt3.table.actionsColumn")} />
          </tr>
        </thead>
        <tbody>
          {submission.fileGroups.map((group) => {
            const members = group.memberFileIds
              .map((id) => submission.fileEntries.find((f) => f.id === id))
              .filter((f): f is NonNullable<typeof f> => f !== undefined)

            // クラス A (single / pair-end / 10x / pacbio-hdf5 / two-color / mage-tab / imaging-ms):
            //   1 Group = 1 行に集約。GroupHeader は出さず、ファイル列セルに displayName を縦並び表示。
            //   docs/submit-alt3.md §4.1 / docs/submit-alt3-tags.md §5.1
            if (isSingleRowGroup(group.groupType)) {
              const groupHighlighted = members.some(
                (m) => highlightedFileIds?.has(m.id) ?? false,
              )

              return (
                <GroupFileRow
                  key={group.id}
                  group={group}
                  files={members}
                  highlighted={groupHighlighted}
                  onEditCell={onEditCell}
                  onRemove={onRemoveFile}
                  {...(onEditRow ? { onEdit: onEditRow } : {})}
                  onSetChip={onSetChip}
                  onResetChipManual={onResetChipManual}
                />
              )
            }

            // クラス B (hybrid / multiplex) / クラス C (variation-ref / mag-sag-chain /
            // assembly-annotation / jga-dataset): 複数行表示 + GroupHeader を維持
            const isMulti = true

            return (
              <Fragment key={group.id}>
                <GroupHeader group={group} memberCount={members.length} />
                {members.map((m) => (
                  <FileRow
                    key={m.id}
                    file={m}
                    indent={isMulti}
                    {...(group.groupType === "mag-sag-chain"
                      ? { magSagDepth: magSagDepthOf(m) }
                      : {})}
                    highlighted={highlightedFileIds?.has(m.id) ?? false}
                    onEditCell={onEditCell}
                    onRemove={onRemoveFile}
                    {...(onEditRow ? { onEdit: onEditRow } : {})}
                    onSetChip={onSetChip}
                    onResetChipManual={onResetChipManual}
                  />
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export default FileTable
