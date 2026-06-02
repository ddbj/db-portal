import type { Access, FileEntry } from "~/schemas/submit"
import { Access as AccessEnum } from "~/schemas/submit"
import { AlertIcon, IconButton, Select, Tag, TrashIcon } from "~/ui"

type CellLabels = {
  accessAria: string
  deleteAria: string
  unsetLabel: string
}

type VocabLabels = {
  fileTypeKindLabel: string
  accessLabel: (value: Access) => string
}

type FileTableRowProps = {
  entry: FileEntry
  hasDetail: boolean
  configured: boolean
  cellLabels: CellLabels
  vocab: VocabLabels
  onAccessChange: (value: Access) => void
  onDelete: () => void
}

export const FileTableRow = ({
  entry,
  hasDetail,
  configured,
  cellLabels,
  vocab,
  onAccessChange,
  onDelete,
}: FileTableRowProps) => {
  const needsDetail = hasDetail && !configured

  const accessOptions = AccessEnum.options.map((a) => ({
    value: a,
    label: vocab.accessLabel(a),
  }))

  return (
    <tr data-testid="file-row" data-entry-id={entry.id}>
      <td className="px-3 py-3 align-middle">
        <Tag kind="tag" size="sm">{vocab.fileTypeKindLabel}</Tag>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink">{entry.filename}</span>
          {needsDetail && (
            <Tag kind="status" tone="warning" size="sm">
              <span className="inline-flex items-center gap-1">
                <AlertIcon size={10} aria-hidden />
                {cellLabels.unsetLabel}
              </span>
            </Tag>
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Select
          ariaLabel={cellLabels.accessAria}
          options={accessOptions}
          value={entry.access}
          onChange={(next) => onAccessChange(next as Access)}
        />
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <IconButton ariaLabel={cellLabels.deleteAria} onClick={onDelete} size={28}>
          <TrashIcon size={16} />
        </IconButton>
      </td>
    </tr>
  )
}
