import { Link } from "react-router"

import { ContentSearch } from "~/features/contents"
import { getNavTree, type NavNode } from "~/lib/content/content-tree"
import { pageTitleMeta } from "~/lib/content/page-title"
import { useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

export const handle = {
  titleSegments: ["Contents"],
} as const

export const meta = pageTitleMeta

type NavSectionProps = {
  node: NavNode
  lang: "ja" | "en"
}

const NavSection = ({ node, lang }: NavSectionProps) => {
  const label = lang === "en" && node.label.en ? node.label.en : node.label.ja
  const pages = node.children.filter((c) => c.hasPage)

  return (
    <div className="mb-8">
      <h2 className="text-fs-h3 font-bold text-ink mb-4">{label}</h2>
      {pages.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((child) => {
            const title = lang === "en" && child.label.en ? child.label.en : child.label.ja

            return (
              <Link
                key={child.urlPath}
                to={child.urlPath}
                className="block p-4 rounded-card border border-border-soft no-underline hover:bg-surface-hover"
              >
                <span className="text-fs-body font-semibold text-brand">{title}</span>
              </Link>
            )
          })}
        </div>
      )}
      {node.children.filter((c) => c.children.length > 0).map((sub) => (
        <NavSection key={sub.urlPath} node={sub} lang={lang} />
      ))}
    </div>
  )
}

const ContentsIndex = () => {
  const t = useT()
  const lang = useLang()
  const tree = getNavTree()

  return (
    <article>
      <PageTitle
        title={t("contents.pageTitle")}
        subtitle={t("contents.pageDescription")}
        padTop="sm"
        padBottom="sm"
      />
      <Section padY="sm">
        <ContentSearch />
      </Section>
      <Section padY="sm">
        {tree.map((node) => (
          <NavSection key={node.urlPath} node={node} lang={lang} />
        ))}
      </Section>
    </article>
  )
}

export default ContentsIndex
