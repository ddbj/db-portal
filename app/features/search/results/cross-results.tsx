import { Link } from "react-router"

import type { CrossSearchResponse } from "~/lib/api"
import { type Lang, useT } from "~/lib/i18n"
import { Label, TextLink } from "~/ui"

import { type DbSlug, isDbSlug } from "../types"
import { buildResultsHref } from "../url/url-params"

export type CrossResultsProps = {
  q: string
  response: CrossSearchResponse
  lang: Lang
}

type DbEntry = CrossSearchResponse["databases"][number]

const formatCount = (count: number | null): string => {
  if (count === null) return "?"

  return count.toLocaleString("en-US")
}

const formatHitDate = (value: string | null | undefined): string => {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toISOString().slice(0, 10)
}

const DbResultCard = ({ entry, q, lang }: { entry: DbEntry; q: string; lang: Lang }) => {
  const t = useT()
  if (!isDbSlug(entry.db)) return null
  const db: DbSlug = entry.db
  const href = buildResultsHref({ q, db }, lang)
  const hits = entry.hits ?? []

  return (
    <article
      data-testid="db-card"
      data-db={db}
      className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-3 relative"
    >
      <TextLink to={href}>
        {t("search.results.cross.viewAll")} →
      </TextLink>
      <div>
        <h3 className="text-fs-h2 font-bold text-ink m-0">{t(`search.scope.${db}`)}</h3>
        <p className="text-fs-label text-ink-soft m-0 mt-1">{t(`search.descriptions.${db}`)}</p>
      </div>
      <div>
        <span
          aria-label={t("search.results.cross.countAria")}
          className="font-mono tabular-nums text-fs-h1 font-semibold text-ink"
        >
          {formatCount(entry.count)}
        </span>
        {entry.error && (
          <span className="ml-2 text-fs-label text-red">
            {t("search.results.cross.error")}
          </span>
        )}
      </div>
      <div className="border-t border-border-soft pt-3">
        <Label>{t("search.results.cross.topHits")}</Label>
        {hits.length === 0
          ? (
            <p className="text-fs-label text-ink-soft m-0 mt-1">
              {t("search.results.cross.noTopHits")}
            </p>
          )
          : (
            <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-1.5">
              {hits.map((hit) => (
                <li key={hit.identifier} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-fs-label text-brand-deep">{hit.identifier}</span>
                  <Link
                    to={`https://ddbj.nig.ac.jp/search/entry/${db}/${encodeURIComponent(hit.identifier)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fs-label text-ink no-underline hover:underline"
                  >
                    {hit.title ?? hit.identifier}
                  </Link>
                  {hit.datePublished && (
                    <span className="font-mono text-fs-micro text-ink-soft">
                      {formatHitDate(hit.datePublished)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </article>
  )
}

export const CrossResults = ({ q, response, lang }: CrossResultsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {response.databases.map((entry) => (
      <DbResultCard key={entry.db} entry={entry} q={q} lang={lang} />
    ))}
  </div>
)
