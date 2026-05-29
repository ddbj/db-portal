import type { ChangeEvent } from "react"

import type { Access, FileEntry, Organism } from "~/schemas/submit"
import { Access as AccessEnum, Organism as OrganismEnum } from "~/schemas/submit"
import { CloseIcon, IconButton, Select, Tag, TextInput } from "~/ui"

import { RowSetTag } from "../components/row-set-tag"
import { WarnDashedButton } from "../components/warn-dashed-button"

type CellLabels = {
  filenamePlaceholder: string
  filenameAria: string
  organismAria: string
  accessAria: string
  detailUnsetLabel: string
  editDetailAria: string
  deleteAria: string
}

type VocabLabels = {
  buttonTypeLabel: string
  organismLabel: (value: Organism | "") => string
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
  onOrganismChange: (value: Organism | "") => void
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
  onOrganismChange,
  onAccessChange,
  onEditDetail,
  onRequestDelete,
}: FileTableRowProps) => {
  const organismOptions = [
    { value: "", label: cellLabels.organismAria },
    ...OrganismEnum.options.map((o) => ({ value: o, label: vocab.organismLabel(o) })),
  ]
  const accessOptions = AccessEnum.options.map((a) => ({
    value: a,
    label: vocab.accessLabel(a),
  }))

  const filenameMissing = entry.filename.trim() === ""
  const organismMissing = (entry.organism as string) === ""

  return (
    <tr
      data-testid="file-row"
      data-entry-id={entry.id}
      className={editing ? "bg-brand-softer outline outline-1 outline-brand" : undefined}
    >
      <td className="px-3 py-3 align-middle">
        <Tag kind="tag" size="sm">{vocab.buttonTypeLabel}</Tag>
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
          ariaLabel={cellLabels.organismAria}
          options={organismOptions}
          state={organismMissing ? "warn" : "default"}
          value={entry.organism}
          onChange={(next) => onOrganismChange(next as Organism | "")}
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
