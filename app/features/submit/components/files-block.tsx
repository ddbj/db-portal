import type { FileEntry, FileTypeKind } from "~/schemas/submit"

import { FileTypeIcon } from "./file-type-icon"

type FilesBlockProps = {
  entries: readonly FileEntry[]
  heading: string
  fileTypeKindLabel: (kind: FileTypeKind) => string
}

// scope 内の対象データを種別 (ラベル + アイコン) で示す。1 種別 = 1 entry なので種別で一意。
export const FilesBlock = ({ entries, heading, fileTypeKindLabel }: FilesBlockProps) => {
  if (entries.length === 0) return null
  const kinds = [...new Set(entries.map((e) => e.fileTypeKind))]

  return (
    <section className="flex flex-col gap-2">
      <p className="text-fs-label font-bold text-ink-mid m-0">{heading}</p>
      <ul className="flex flex-wrap gap-2 m-0 list-none p-0">
        {kinds.map((kind) => (
          <li
            key={kind}
            className="inline-flex items-center gap-1.5 bg-surface-subtle border border-border-soft rounded-button px-2.5 py-1.5"
          >
            <span className="text-brand-deep shrink-0 inline-flex items-center">
              <FileTypeIcon fileTypeKind={kind} size={14} />
            </span>
            <span className="text-fs-micro text-ink">{fileTypeKindLabel(kind)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
