import { useSearchParams } from "react-router"

import { DocsSearchResults, RecentlyUpdated, SitemapColumns } from "~/features/docs"
import { pageTitleMeta } from "~/lib/content/page-title"
import { useT } from "~/lib/i18n"
import { IconButton, PageTitle, SearchBox, Section } from "~/ui"
import { CloseIcon } from "~/ui/icons"

export const handle = {
  titleSegments: ["Knowledge Base"],
} as const

export const meta = pageTitleMeta

const DocsIndex = () => {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const isSearching = q.trim() !== ""

  const updateQuery = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next.trim() === "") p.delete("q")
        else p.set("q", next)

        return p
      },
      { replace: true },
    )
  }

  return (
    <article>
      <PageTitle
        title={t("docs.title")}
        padTop="trimmed"
        padBottom="sm"
      />

      <Section padY="sm">
        <SearchBox
          size="lg"
          showScope={false}
          showSearchIcon
          maxWidth={9999}
          value={q}
          placeholder={t("docs.search.placeholder")}
          ariaLabel={t("docs.search.placeholder")}
          submitLabel={t("docs.search.submitLabel")}
          onChange={updateQuery}
          onSubmit={(query) => updateQuery(query)}
          trailing={q !== ""
            ? (
              <IconButton
                ariaLabel={t("docs.search.clear")}
                onClick={() => updateQuery("")}
              >
                <CloseIcon size={14} className="text-ink-soft" />
              </IconButton>
            )
            : undefined}
        />
      </Section>

      {isSearching && (
        <Section padY="sm">
          <DocsSearchResults query={q} onClear={() => updateQuery("")} />
        </Section>
      )}

      <Section padY="sm">
        <RecentlyUpdated />
      </Section>

      <Section padY="sm">
        <SitemapColumns />
      </Section>
    </article>
  )
}

export default DocsIndex
