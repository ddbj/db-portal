import { Link } from "react-router"

import { getNavTree, type NavNode } from "~/lib/content/content-tree"
import { useLang, useT } from "~/lib/i18n"
import { SectionHeading } from "~/ui"

type Lang = "ja" | "en"

const labelOf = (node: NavNode, lang: Lang): string =>
  lang === "en" && node.label.en ? node.label.en : node.label.ja

type GroupProps = {
  group: NavNode
  lang: Lang
}

const Group = ({ group, lang }: GroupProps) => {
  const isCategory = !group.hasPage && group.children.length > 0
  const heading = labelOf(group, lang)
  const children = isCategory ? group.children : []

  if (isCategory) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-fs-body-sm font-bold text-ink m-0 pb-1.5 border-b border-border-soft">
          {heading}
        </h3>
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {children.map((child) => (
            <ChildRow key={child.urlPath} node={child} lang={lang} />
          ))}
        </ul>
      </div>
    )
  }

  // Top-level doc (no category wrapping): render as a single bold link card.
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-fs-body-sm font-bold text-ink m-0 pb-1.5 border-b border-border-soft">
        <Link
          to={group.urlPath}
          className="text-ink no-underline hover:text-brand-deep hover:underline"
        >
          {heading}
        </Link>
      </h3>
    </div>
  )
}

type ChildRowProps = {
  node: NavNode
  lang: Lang
}

const ChildRow = ({ node, lang }: ChildRowProps) => {
  const label = labelOf(node, lang)
  const grandchildren = node.children.filter((c) => c.hasPage)

  return (
    <li>
      {node.hasPage
        ? (
          <Link
            to={node.urlPath}
            className="text-fs-body-sm font-semibold text-ink no-underline hover:text-brand-deep hover:underline"
          >
            {label}
          </Link>
        )
        : (
          <span className="text-fs-body-sm font-semibold text-ink-mid">{label}</span>
        )}
      {grandchildren.length > 0 && (
        <ul className="list-none p-0 m-0 mt-1 ml-2 pl-2 border-l border-border-soft flex flex-col gap-0.5">
          {grandchildren.map((gc) => (
            <li key={gc.urlPath}>
              <Link
                to={gc.urlPath}
                className="text-fs-body-sm text-ink-mid no-underline hover:text-brand-deep hover:underline"
              >
                {labelOf(gc, lang)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export const SitemapColumns = () => {
  const t = useT()
  const lang = useLang()
  const tree = getNavTree()

  return (
    <div>
      <SectionHeading>{t("docs.sections.sitemap")}</SectionHeading>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {tree.map((group) => (
          <Group key={group.urlPath} group={group} lang={lang} />
        ))}
      </div>
    </div>
  )
}
