import type { ChangeEvent } from "react"

import type { Access, FileEntry } from "~/schemas/submit"
import { Access as AccessEnum } from "~/schemas/submit"
import { CloseIcon, IconButton, Select, Tag, TextInput } from "~/ui"

import { RowSetTag } from "../components/row-set-tag"
import { WarnDashedButton } from "../components/warn-dashed-button"

type CellLabels = {
  filenamePlaceholder: string
  filenameAria: string
  accessAria: string
  detailUnsetLabel: string
  editDetailAria: string
  deleteAria: string
}

type VocabLabels = {
  fileTypeKindLabel: string
  accessLabel: (value: Access) => string
}

type FileTableRowProps = {
  entry: FileEntry
  configured: boolean
  detailSummary: string
  editing: boolean
  cellLabels: CellLabels
  vocab: VocabLabels
  onFilenameChange: (value: string) => void
  onAccessChange: (value: Access) => void
  onEditDetail: () => void
  onRequestDelete: () => void
}

export const FileTableRow = ({
  entry,
  configured,
  detailSummary,
  editing,
  cellLabels,
  vocab,
  onFilenameChange,
  onAccessChange,
  onEditDetail,
  onRequestDelete,
}: FileTableRowProps) => {
  const accessOptions = AccessEnum.options.map((a) => ({
    value: a,
    label: vocab.accessLabel(a),
  }))

  const filenameMissing = entry.filename.trim() === ""

  return (
    <tr
      data-testid="file-row"
      data-entry-id={entry.id}
      className={editing ? "bg-brand-softer outline outline-1 outline-brand" : undefined}
    >
      <td className="px-3 py-3 align-middle">
        <Tag kind="tag" size="sm">{vocab.fileTypeKindLabel}</Tag>
      </td>
      <td className="px-3 py-3 align-middle">
        <TextInput
          ariaLabel={cellLabels.filenameAria}
          mono
          state={filenameMissing ? "warn" : "default"}
          value={entry.filename}
          placeholder={cellLabels.filenamePlaceholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onFilenameChange(e.target.value)}
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Select
          ariaLabel={cellLabels.accessAria}
          options={accessOptions}
          value={entry.access}
          onChange={(next) => onAccessChange(next as Access)}
        />
      </td>
      <td className="px-3 py-3 align-middle">
        {configured && detailSummary !== ""
          ? (
            <RowSetTag
              summary={detailSummary}
              ariaLabel={cellLabels.editDetailAria}
              onClick={onEditDetail}
            />
          )
          : (
            <WarnDashedButton
              label={cellLabels.detailUnsetLabel}
              ariaLabel={cellLabels.editDetailAria}
              onClick={onEditDetail}
            />
          )}
      </td>
      <td className="px-3 py-3 align-middle">
        <IconButton ariaLabel={cellLabels.deleteAria} onClick={onRequestDelete} size={28}>
          <CloseIcon size={16} />
        </IconButton>
      </td>
    </tr>
  )
}
