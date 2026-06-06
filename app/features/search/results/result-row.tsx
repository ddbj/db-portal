import { Link } from "react-router"

import { type Lang, useT } from "~/lib/i18n"
import { ExternalIcon, Tag } from "~/ui"

import type { DbSlug } from "../types"
import {
  ancestryRow,
  CLASSIFICATION_LABEL,
  type DbHit,
  entryHref,
  isControlled,
  isSuppressed,
  organismName,
  rowDate,
  rowExcerpt,
  rowTitle,
  signatureChips,
  submitterName,
  subtypeBadge,
  taxonomyCommonName,
} from "./result-fields"

export type ResultRowProps = {
  db: DbSlug
  hit: DbHit
  lang: Lang
  // Leads the row with a chip naming the owning DB. Off in per-DB lists (the DB is
  // the page); on where a row stands alone in a cross-DB context (the exact-match card).
  dbChip?: boolean
}

const formatDate = (value: string, lang: Lang): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const locale = lang === "ja" ? "ja-JP" : "en-CA"

  // Pin JST (the portal's locale) so SSR (often UTC) and the browser (any
  // timezone) format the same day and do not trip a hydration mismatch.
  return new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo",
  }).format(parsed)
}

const SubmitterIcon = () => (
  <svg
    className="h-3 w-3 shrink-0 text-ink-softer"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
  </svg>
)

export const ResultRow = ({ db, hit, lang, dbChip = false }: ResultRowProps) => {
  const t = useT()
  const rawDate = rowDate(hit)
  const date = rawDate ? formatDate(rawDate, lang) : null
  const { text: title } = rowTitle(hit)
  const href = entryHref(hit)
  const subtype = subtypeBadge(hit)
  const controlled = isControlled(hit)
  const suppressed = isSuppressed(hit)
  const excerpt = rowExcerpt(hit)
  const organism = organismName(db, hit)
  const submitter = submitterName(hit)
  const chips = signatureChips(db, hit)
  const classification = ancestryRow(hit)
  const subtitle = taxonomyCommonName(hit) ?? ""
  const hasMeta = submitter !== null || organism !== null || chips.length > 0 || classification.length > 0

  return (
    <article className="flex flex-col gap-1.5 px-3 py-4 transition-colors hover:bg-surface-subtle">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-fs-label">
        {dbChip && <Tag kind="brand" size="sm">{t(`search.scope.${db}`)}</Tag>}
        <span className="font-mono font-semibold tracking-mono leading-none text-brand-deep">{hit.identifier}</span>
        {date && <span className="font-mono leading-none text-ink-soft">{date}</span>}
        {(subtype || suppressed || controlled) && (
          <span className="ml-0.5 inline-flex items-center gap-1.5">
            {subtype && <Tag kind="tag" size="sm" mono>{subtype}</Tag>}
            {suppressed && (
              <Tag kind="status" tone="critical" size="sm">{t("search.results.row.suppressed")}</Tag>
            )}
            {controlled && (
              <Tag kind="status" tone="warning" size="sm">{t("search.results.row.controlled")}</Tag>
            )}
          </span>
        )}
      </div>

      <Link
        to={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-fs-h2 font-bold leading-snug text-ink no-underline underline-offset-2 hover:underline"
      >
        {title}
        {subtitle && (
          <span className="ml-2.5 align-baseline text-fs-body-sm font-medium text-ink-soft">{subtitle}</span>
        )}
        <ExternalIcon size={13} aria-hidden className="ml-1 inline align-middle text-ink-soft" />
        <span className="sr-only"> ({t("common.detail")})</span>
      </Link>

      {excerpt && (
        <p className="m-0 line-clamp-2 text-fs-body-sm leading-snug text-ink-mid">{excerpt}</p>
      )}

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-fs-label">
          {submitter && (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <SubmitterIcon />
              <span>{submitter}</span>
            </span>
          )}
          {organism && (
            <span className="rounded-tag bg-brand-soft px-2 py-px text-fs-label font-medium italic text-brand-deep">
              {organism}
            </span>
          )}
          {chips.map((chip, i) =>
            chip.kind === "free"
              ? (
                <span
                  key={`${chip.kind}-${i}-${chip.value}`}
                  className="inline-flex items-center rounded-tag bg-surface-subtle px-2 py-px text-fs-micro leading-snug text-ink-soft"
                >
                  {chip.labelKey && (
                    <span className="mr-1 text-ink-softer">{t(chip.labelKey)}:</span>
                  )}
                  {chip.value}
                </span>
              )
              : (
                <span
                  key={`${chip.kind}-${i}-${chip.value}`}
                  className="inline-flex items-center rounded-tag border border-border-soft bg-surface px-2 py-px text-fs-micro font-mono font-medium tracking-mono leading-snug text-ink-mid"
                >
                  {chip.value}
                </span>
              ))}
          {classification.length > 0 && (
            <span className="text-ink-soft">
              <span className="mr-1 text-ink-softer">{t(CLASSIFICATION_LABEL)}:</span>
              {classification.slice(0, 6).join(" › ")}
              {classification.length > 6 ? " …" : ""}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
