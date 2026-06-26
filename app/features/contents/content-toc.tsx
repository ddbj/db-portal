import { Link } from "react-router"

import { useT } from "~/lib/i18n"
import type { TocHeading } from "~/schemas/content/toc-heading"
import { SidebarHeading } from "~/ui"

type TocProps = {
  headings: TocHeading[]
}

const HeadingList = ({ headings }: TocProps) => (
  <ul className="mt-2 flex flex-col gap-1 list-none p-0 m-0">
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
)

export const ContentTocSidebar = ({ headings }: TocProps) => {
  const t = useT()
  if (headings.length === 0) return null

  return (
    <div>
      <SidebarHeading as="h2">{t("contents.tocHeading")}</SidebarHeading>
      <nav aria-label={t("contents.tocHeading")}>
        <HeadingList headings={headings} />
      </nav>
    </div>
  )
}
