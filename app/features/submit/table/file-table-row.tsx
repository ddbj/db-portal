import type { MouseEvent } from "react"

import type { Access, FileEntry } from "~/schemas/submit"
import { Access as AccessEnum } from "~/schemas/submit"
import { cn, IconButton, Select, Tag, TrashIcon } from "~/ui"

type CellLabels = {
  accessAria: string
  deleteAria: string
  rowEditTitle: string
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
  editing: boolean
  cellLabels: CellLabels
  vocab: VocabLabels
  onAccessChange: (value: Access) => void
  onRowClick: () => void
  onDelete: () => void
}

const stop = (e: MouseEvent): void => {
  e.stopPropagation()
}

export const FileTableRow = ({
  entry,
  hasDetail,
  configured,
  editing,
  cellLabels,
  vocab,
  onAccessChange,
  onRowClick,
  onDelete,
}: FileTableRowProps) => {
  const needsDetail = hasDetail && !configured

  const accessOptions = AccessEnum.options.map((a) => ({
    value: a,
    label: vocab.accessLabel(a),
  }))

  return (
    <tr
      data-testid="file-row"
      data-entry-id={entry.id}
      onClick={hasDetail ? onRowClick : undefined}
      title={hasDetail ? cellLabels.rowEditTitle : undefined}
      className={cn(
        hasDetail && "cursor-pointer",
        editing
          ? "bg-brand-softer outline outline-1 outline-brand"
          : hasDetail
            ? "hover:bg-surface-subtle"
            : undefined,
      )}
    >
      <td className="px-3 py-3 align-middle">
        <Tag kind="tag" size="sm">{vocab.fileTypeKindLabel}</Tag>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink">{entry.filename}</span>
          {needsDetail && (
            <Tag kind="status" tone="warning" size="sm">{cellLabels.unsetLabel}</Tag>
          )}
        </div>
      </td>
      <td className="px-3 py-3 align-middle" onClick={stop}>
        <Select
          ariaLabel={cellLabels.accessAria}
          options={accessOptions}
          value={entry.access}
          onChange={(next) => onAccessChange(next as Access)}
        />
      </td>
      <td className="px-3 py-3 align-middle text-right" onClick={stop}>
        <IconButton ariaLabel={cellLabels.deleteAria} onClick={onDelete} size={28}>
          <TrashIcon size={16} />
        </IconButton>
      </td>
    </tr>
  )
}
