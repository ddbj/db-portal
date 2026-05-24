import type { FileEntry, FileGroup } from "~/schemas/submit"

type FilesBlockProps = {
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  filenameMissingLabel: string
}

export const FilesBlock = ({ groups, entries, filenameMissingLabel }: FilesBlockProps) => {
  if (groups.length === 0) return null
  const byGroup = new Map<string, FileEntry[]>()
  for (const e of entries) {
    const bucket = byGroup.get(e.groupId) ?? []
    bucket.push(e)
    byGroup.set(e.groupId, bucket)
  }

  return (
    <ol className="flex flex-col gap-2 m-0 list-none p-0">
      {groups.map((group, idx) => {
        const members = byGroup.get(group.id) ?? []
        return (
          <li
            key={group.id}
            className="flex items-start gap-3 bg-surface-subtle border border-border-soft rounded-button px-3 py-2"
          >
            <span className="font-mono text-fs-micro font-bold text-ink-mid shrink-0">
              {idx + 1}/{groups.length}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              {members.length === 0 && (
                <span className="text-fs-micro text-warn-fg">{filenameMissingLabel}</span>
              )}
              {members.map((entry) => {
                const filename = entry.filename.trim()
                return (
                  <span
                    key={entry.id}
                    className={
                      filename === ""
                        ? "font-mono text-fs-micro text-warn-fg"
                        : "font-mono text-fs-micro text-ink"
                    }
                  >
                    {filename === "" ? filenameMissingLabel : filename}
                  </span>
                )
              })}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
