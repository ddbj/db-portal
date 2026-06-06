import { Link, useNavigate } from "react-router"

import type { CrossSearchResponse } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { Button, ExternalIcon, Heading, Label, Tag, TextLink } from "~/ui"

import { FIELD_REGISTRY } from "../field-registry"
import { type DbSlug, isDbSlug } from "../types"
import { buildResultsHref } from "../url/url-params"
import { entryHref, isSuppressed, resolveDate } from "./result-fields"

type CrossResultsProps = {
  q: string
  response: CrossSearchResponse
}

type DbEntry = CrossSearchResponse["databases"][number]

// Card display order for the cross-DB grid. The API returns databases in its
// own fixed order; BSI presents them DDBJ-first.
export const CARD_ORDER: readonly DbSlug[] = [
  "trad",
  "bioproject",
  "biosample",
  "sra",
  "jga",
  "taxonomy",
  "gea",
  "metabobank",
]

export const cardOrderIndex = (db: string): number => {
  const index = CARD_ORDER.indexOf(db as DbSlug)

  return index === -1 ? CARD_ORDER.length : index
}

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
  const navigate = useNavigate()
  if (!isDbSlug(entry.db)) return null
  const db: DbSlug = entry.db
  const href = buildResultsHref({ q, db })
  const hits = (entry.hits ?? []).slice(0, 3)
  // field_not_applicable is a calm per-arm signal (this DB lacks a queried field), not
  // an upstream failure: show "対象外" naming the offending filter(s), with no retry and
  // no top-hits section (the backend was never queried for this arm).
  const notApplicable = entry.error === "field_not_applicable"
  const upstreamError = entry.error !== null && !notApplicable
  const unavailableLabels = (entry.unavailableFields ?? []).map((field) => {
    const def = (FIELD_REGISTRY as Record<string, { labelKey: string } | undefined>)[field]

    return def ? t(`search.facets.field.${def.labelKey}`) : field
  })

  return (
    <article
      data-testid="db-card"
      data-db={db}
      className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Heading as="h3" size="h2">{t(`search.scope.${db}`)}</Heading>
        <span className="shrink-0 whitespace-nowrap">
          <TextLink to={href} arrow>
            {t("search.results.cross.viewAll")}
          </TextLink>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {upstreamError
          ? (
            <>
              <span className="text-fs-label text-red">
                {t("search.results.cross.error")}
              </span>
              <Button kind="secondary" size="sm" onClick={() => navigate(0)}>
                {t("search.results.cross.retry")}
              </Button>
            </>
          )
          : notApplicable
            ? (
              <span className="flex flex-col gap-0.5">
                <span className="text-fs-body font-semibold text-ink-soft">
                  {t("search.results.cross.notApplicable")}
                </span>
                {unavailableLabels.length > 0 && (
                  <span className="text-fs-meta text-ink-softer">
                    {t("search.results.cross.notApplicableReason", { fields: unavailableLabels.join(" / ") })}
                  </span>
                )}
              </span>
            )
            : (
              <span
                aria-label={t("search.results.cross.countAria")}
                className="font-mono tabular-nums text-fs-h2 font-semibold text-ink"
              >
                {formatCount(entry.count)}
              </span>
            )}
      </div>
      {!notApplicable && (
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
                    className="grid grid-cols-[115px_1fr] gap-x-3"
                  >
                    <div className="min-w-0">
                      <Link
                        to={entryHref(hit)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-mono text-fs-body-sm text-brand-deep leading-tight no-underline hover:underline"
                      >
                        {hit.identifier}
                        <ExternalIcon size={10} aria-hidden className="shrink-0 text-ink-soft" />
                      </Link>
                      {resolveDate(hit) && (
                        <div className="font-mono text-fs-body-sm text-ink-soft">
                          {formatHitDate(resolveDate(hit))}
                        </div>
                      )}
                      {isSuppressed(hit) && (
                        <Tag kind="status" tone="critical" size="sm">
                          {t("search.results.row.suppressed")}
                        </Tag>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-fs-body-sm text-ink line-clamp-2">
                        {hit.title ?? hit.identifier}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </article>
  )
}

export const CrossResults = ({ q, response }: CrossResultsProps) => {
  const ordered = [...response.databases].sort(
    (a, b) => cardOrderIndex(a.db) - cardOrderIndex(b.db),
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ordered.map((entry) => (
        <DbResultCard key={entry.db} entry={entry} q={q} />
      ))}
    </div>
  )
}
