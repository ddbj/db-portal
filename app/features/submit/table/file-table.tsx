import type { Access, FileEntry, FileTypeKind } from "~/schemas/submit"
import { Label } from "~/ui"

import { hasRowDetail } from "../modals/form-defs"
import { rowIsConfigured } from "../state/selectors"
import type { UIState } from "../state/types"
import { FileTableRow } from "./file-table-row"

type FileTableLabels = {
  caption: string
  columnFileType: string
  columnFilename: string
  columnAccess: string
  columnDelete: string
  empty: string
  accessAria: string
  deleteAria: string
  rowEditTitle: string
  detailUnset: string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  accessLabel: (a: Access) => string
}

type FileTableProps = {
  state: UIState
  labels: FileTableLabels
  onAccessChange: (entryId: string, value: Access) => void
  onRowClick: (entryId: string) => void
  onDelete: (entryId: string) => void
}

export const FileTable = ({
  state,
  labels,
  onAccessChange,
  onRowClick,
  onDelete,
}: FileTableProps) => {
  const entries = state.submission.fileEntries
  const editingEntryId = state.editing?.kind === "row" ? state.editing.entryId : null

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 border border-border-soft rounded-card bg-surface text-ink-mid">
        <Label as="span">{labels.empty}</Label>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-border-soft rounded-card bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">{labels.caption}</caption>
        <thead className="bg-surface-subtle">
          <tr>
            <th scope="col" className="px-3 py-2 text-left"><Label>{labels.columnFileType}</Label></th>
            <th scope="col" className="px-3 py-2 text-left"><Label>{labels.columnFilename}</Label></th>
            <th scope="col" className="px-3 py-2 text-left"><Label>{labels.columnAccess}</Label></th>
            <th scope="col" className="px-3 py-2 text-right"><span className="sr-only">{labels.columnDelete}</span></th>
          </tr>
        </thead>
        <tbody className="text-fs-body">
          {entries.map((entry: FileEntry) => (
            <FileTableRow
              key={entry.id}
              entry={entry}
              hasDetail={hasRowDetail(entry.fileTypeKind)}
              configured={rowIsConfigured(state, entry.id)}
              editing={editingEntryId === entry.id}
              cellLabels={{
                accessAria: labels.accessAria,
                deleteAria: labels.deleteAria,
                rowEditTitle: labels.rowEditTitle,
                unsetLabel: labels.detailUnset,
              }}
              vocab={{
                fileTypeKindLabel: labels.fileTypeKindLabel(entry.fileTypeKind),
                accessLabel: labels.accessLabel,
              }}
              onAccessChange={(value) => onAccessChange(entry.id, value)}
              onRowClick={() => onRowClick(entry.id)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
