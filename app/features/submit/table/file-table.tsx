import type { Access, FileEntry, FileTypeKind } from "~/schemas/submit"
import { Label } from "~/ui"

import { rowIsConfigured, selectRowDetailSummary } from "../state/selectors"
import type { UIState } from "../state/types"
import { FileTableRow } from "./file-table-row"

type FileTableLabels = {
  caption: string
  columnFileType: string
  columnFilename: string
  columnAccess: string
  columnDetail: string
  columnDelete: string
  empty: string
  accessAria: string
  detailUnsetLabel: string
  editDetailAria: string
  deleteAria: string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  accessLabel: (a: Access) => string
}

type FileTableProps = {
  state: UIState
  labels: FileTableLabels
  onAccessChange: (entryId: string, value: Access) => void
  onEditDetail: (entryId: string) => void
  onRequestDelete: (entryId: string) => void
}

export const FileTable = ({
  state,
  labels,
  onAccessChange,
  onEditDetail,
  onRequestDelete,
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
            <th scope="col" className="px-3 py-2 text-left"><Label>{labels.columnDetail}</Label></th>
            <th scope="col" className="px-3 py-2 text-left"><span className="sr-only">{labels.columnDelete}</span></th>
          </tr>
        </thead>
        <tbody className="text-fs-body">
          {entries.map((entry: FileEntry) => (
            <FileTableRow
              key={entry.id}
              entry={entry}
              configured={rowIsConfigured(state, entry.id)}
              detailSummary={selectRowDetailSummary(state, entry.id)}
              editing={editingEntryId === entry.id}
              cellLabels={{
                accessAria: labels.accessAria,
                detailUnsetLabel: labels.detailUnsetLabel,
                editDetailAria: labels.editDetailAria,
                deleteAria: labels.deleteAria,
              }}
              vocab={{
                fileTypeKindLabel: labels.fileTypeKindLabel(entry.fileTypeKind),
                accessLabel: labels.accessLabel,
              }}
              onAccessChange={(value) => onAccessChange(entry.id, value)}
              onEditDetail={() => onEditDetail(entry.id)}
              onRequestDelete={() => onRequestDelete(entry.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
