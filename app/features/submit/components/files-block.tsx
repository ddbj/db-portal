import type { FileEntry, FileGroup } from "~/schemas/submit"

type FilesBlockProps = {
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  heading: string
}

// scope 内のファイルを列挙する。group スコープは group 単位 (member を束ねて) で、
// entry スコープ (group 無し) はファイルを 1 件ずつフラットに並べる。
export const FilesBlock = ({ groups, entries, heading }: FilesBlockProps) => {
  if (groups.length === 0 && entries.length === 0) return null

  const rows = groups.length > 0
    ? groups.map((group) => ({
      key: group.id,
      filenames: entries.filter((e) => e.groupId === group.id).map((e) => e.filename),
    }))
    : entries.map((entry) => ({ key: entry.id, filenames: [entry.filename] }))

  return (
    <section className="flex flex-col gap-2">
      <p className="text-fs-label font-bold text-ink-mid m-0">{heading}</p>
      <ol className="flex flex-col gap-2 m-0 list-none p-0">
        {rows.map((row, idx) => (
          <li
            key={row.key}
            className="flex items-start gap-3 bg-surface-subtle border border-border-soft rounded-button px-3 py-2"
          >
            <span className="font-mono text-fs-micro font-bold text-ink-mid shrink-0">
              {idx + 1}/{rows.length}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              {row.filenames.map((filename, i) => (
                <span key={i} className="font-mono text-fs-micro text-ink">
                  {filename}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
