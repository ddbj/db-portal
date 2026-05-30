import { Link } from "react-router"

import type { CrossSearchResponse } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { Label, TextLink } from "~/ui"

import { type DbSlug, isDbSlug } from "../types"
import { buildResultsHref } from "../url/url-params"

export type CrossResultsProps = {
  q: string
  response: CrossSearchResponse
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

const DbResultCard = ({ entry, q }: { entry: DbEntry; q: string }) => {
  const t = useT()
  if (!isDbSlug(entry.db)) return null
  const db: DbSlug = entry.db
  const href = buildResultsHref({ q, db })
  const hits = (entry.hits ?? []).slice(0, 3)

  return (
    <article
      data-testid="db-card"
      data-db={db}
      className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-fs-h2 font-bold text-ink m-0">{t(`search.scope.${db}`)}</h3>
        <span className="shrink-0 whitespace-nowrap">
          <TextLink to={href}>
            {t("search.results.cross.viewAll")} →
          </TextLink>
        </span>
      </div>
      <div>
        <span
          aria-label={t("search.results.cross.countAria")}
          className="font-mono tabular-nums text-fs-h2 font-semibold text-ink"
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
            <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-2">
              {hits.map((hit) => (
                <li
                  key={hit.identifier}
                  className="grid grid-cols-[90px_1fr] gap-x-3"
                >
                  <span className="font-mono text-fs-label text-brand-deep">{hit.identifier}</span>
                  <div className="min-w-0">
                    <Link
                      to={`https://ddbj.nig.ac.jp/search/entry/${db}/${encodeURIComponent(hit.identifier)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fs-label text-ink no-underline hover:underline line-clamp-2"
                    >
                      {hit.title ?? hit.identifier}
                    </Link>
                    {hit.datePublished && (
                      <div className="font-mono text-fs-micro text-ink-soft mt-0.5">
                        {formatHitDate(hit.datePublished)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </article>
  )
}

export const CrossResults = ({ q, response }: CrossResultsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {response.databases.map((entry) => (
      <DbResultCard key={entry.db} entry={entry} q={q} />
    ))}
  </div>
)
