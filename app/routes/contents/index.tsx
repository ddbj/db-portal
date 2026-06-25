import { Link } from "react-router"

import { ContentSearch } from "~/features/contents"
import { getContentTree } from "~/lib/content/content-tree"
import { pageTitleMeta } from "~/lib/content/page-title"
import { useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

export const handle = {
  titleSegments: ["Contents"],
} as const

export const meta = pageTitleMeta

const ContentsIndex = () => {
  const t = useT()
  const lang = useLang()
  const tree = getContentTree()

  return (
    <article>
      <PageTitle title={t("contents.pageTitle")} subtitle={t("contents.pageDescription")} />
      <Section padY="sm">
        <ContentSearch />
      </Section>
      <Section padY="sm">
        {tree.map((section) => (
          <div key={section.section} className="mb-8">
            <h2 className="text-fs-h3 font-bold text-ink mb-4">
              {t(`contents.section.${section.section}`)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.pages.map((page) => {
                const title = lang === "en" && page.title.en ? page.title.en : page.title.ja
                const desc = lang === "en" && page.description.en
                  ? page.description.en
                  : page.description.ja

                return (
                  <Link
                    key={page.urlPath}
                    to={page.urlPath}
                    className="block p-4 rounded-card border border-border-soft no-underline hover:bg-surface-hover"
                  >
                    <span className="text-fs-body font-semibold text-brand">{title}</span>
                    <p className="text-fs-body-sm text-ink-mid mt-1 mb-0 line-clamp-2">{desc}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </Section>
    </article>
  )
}

export default ContentsIndex
