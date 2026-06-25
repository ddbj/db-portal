import { Link } from "react-router"

import { useT } from "~/lib/i18n"
import { Tag, TextInput } from "~/ui"

import { useContentSearch } from "./use-content-search"

export const ContentSearch = () => {
  const t = useT()
  const { query, setQuery, results } = useContentSearch()

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        ariaLabel={t("contents.searchPlaceholder")}
        placeholder={t("contents.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() !== "" && (
        <div className="flex flex-col gap-3">
          {results.length === 0
            ? (
              <p className="text-fs-body-sm text-ink-soft">
                {t("contents.searchNoResults")}
              </p>
            )
            : results.map((r) => (
              <Link
                key={r.urlPath}
                to={r.urlPath}
                className="block p-3 rounded-card border border-border-soft no-underline hover:bg-surface-hover"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-fs-body font-semibold text-ink">{r.title}</span>
                  <Tag size="sm">{r.section}</Tag>
                </div>
                <p className="text-fs-body-sm text-ink-mid m-0 line-clamp-2">
                  {r.snippet}
                </p>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
