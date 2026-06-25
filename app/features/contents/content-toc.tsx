import { Link } from "react-router"

import { useT } from "~/lib/i18n"
import type { TocHeading } from "~/schemas/content/toc-heading"

type ContentTocProps = {
  headings: TocHeading[]
}

export const ContentToc = ({ headings }: ContentTocProps) => {
  const t = useT()
  if (headings.length === 0) return null

  return (
    <details className="border border-border-soft rounded-card bg-surface-subtle mb-6">
      <summary className="cursor-pointer px-4 py-3 text-fs-body-sm font-semibold text-ink-mid select-none">
        {t("contents.tocHeading")}
      </summary>
      <nav aria-label={t("contents.tocHeading")} className="px-4 pb-4">
        <ul className="flex flex-col gap-1 list-none p-0 m-0">
          {headings.map((h) => (
            <li key={h.id} className={h.depth === 3 ? "ml-4" : ""}>
              <Link
                to={`#${h.id}`}
                className="text-fs-body-sm text-brand no-underline hover:underline"
              >
                {h.text}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  )
}
