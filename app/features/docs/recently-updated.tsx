import { Link } from "react-router"

import { findNavPath, getNavTree } from "~/lib/content/content-tree"
import { listAllPages } from "~/lib/content/markdown-loader"
import { formatDate, useLang, useT } from "~/lib/i18n"
import type { PageContent } from "~/schemas/content/page-content"
import { MonoCode, NewsDate, SectionHeading } from "~/ui"
import { FileTextIcon, FolderIcon } from "~/ui/icons"

const RECENT_COUNT = 5

type Lang = "ja" | "en"

const pickIso = (page: PageContent, lang: Lang): string | undefined => {
  const lu = page.lastUpdated
  if (!lu) return undefined

  return lang === "en" ? lu.en ?? lu.ja : lu.ja ?? lu.en
}

const pickTitle = (page: PageContent, lang: Lang): string => {
  if (lang === "en" && page.frontmatter.en) return page.frontmatter.en.title

  return page.frontmatter.ja.title
}

// dir (children あり) = filled folder (brand)、末端 doc (children 無し、policy/index.md
// のような単独 index も含む) = outline doc (ink-softer)。handoff の DhFolder / DhDoc 配色
// を踏襲。
const RowIcon = ({ urlPath }: { urlPath: string }) => {
  const tree = getNavTree()
  const path = findNavPath(tree, urlPath)
  const node = path[path.length - 1]
  const isLikeDoc = node === undefined || node.children.length === 0
  if (isLikeDoc) {
    return <FileTextIcon size={17} className="text-ink-soft shrink-0" aria-hidden />
  }

  return <FolderIcon size={17} className="text-ink-soft shrink-0" aria-hidden />
}

export const RecentlyUpdated = () => {
  const t = useT()
  const lang = useLang()
  const rows = listAllPages()
    .filter((p) => !p.urlPath.startsWith("/_dev"))
    .map((p) => ({ page: p, iso: pickIso(p, lang) }))
    .filter((x): x is { page: PageContent; iso: string } => x.iso !== undefined)
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .slice(0, RECENT_COUNT)

  if (rows.length === 0) return null

  return (
    <div>
      <SectionHeading>{t("docs.sections.recentlyUpdated")}</SectionHeading>
      <ul className="list-none p-0 m-0 border-t border-border-soft">
        {rows.map(({ page, iso }) => (
          <li
            key={page.urlPath}
            className="border-b border-border-soft"
          >
            <Link
              to={page.urlPath}
              className="flex items-center gap-2.5 py-2 no-underline hover:bg-surface-subtle"
            >
              <RowIcon urlPath={page.urlPath} />
              <span className="text-fs-body font-semibold text-ink flex-1 min-w-0 truncate">
                {pickTitle(page, lang)}
              </span>
              <MonoCode className="text-fs-body-sm text-ink-soft whitespace-nowrap shrink-0">
                {page.urlPath}
              </MonoCode>
              <NewsDate className="text-fs-body-sm text-ink-soft whitespace-nowrap shrink-0 text-right min-w-date-col">
                {formatDate(iso)}
              </NewsDate>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
