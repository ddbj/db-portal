import { Link } from "react-router"

import type { DbSearchResponse } from "~/lib/api"
import { type Lang, useT } from "~/lib/i18n"
import { Tag } from "~/ui"

import type { DbSlug } from "../types"

type DbHit = DbSearchResponse["hits"][number]
export type ResultCardProps = {
  db: DbSlug
  hit: DbHit
  lang: Lang
}

type FacetItem = { key: string; label: string; value: string }

const formatDate = (value: string | null | undefined, lang: Lang): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const locale = lang === "ja" ? "ja-JP" : "en-US"

  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed)
}

const fullTextTitle = (hit: DbHit): string => {
  if ("title" in hit && hit.title) return hit.title

  return hit.identifier
}

const detailHref = (db: DbSlug, identifier: string): string =>
  `https://ddbj.nig.ac.jp/search/entry/${db}/${encodeURIComponent(identifier)}`

const renderTags = (db: DbSlug, hit: DbHit): readonly { key: string; value: string }[] => {
  const tags: { key: string; value: string }[] = []
  if ("organism" in hit && hit.organism && hit.organism.name) {
    tags.push({ key: "organism", value: hit.organism.name })
  }
  if (db === "trad") {
    if ("molecularType" in hit && hit.molecularType) {
      tags.push({ key: "mol", value: String(hit.molecularType) })
    }
    if ("division" in hit && hit.division) {
      tags.push({ key: "div", value: String(hit.division) })
    }
  }
  if (db === "sra" && "libraryStrategy" in hit && hit.libraryStrategy) {
    tags.push({ key: "library", value: String(hit.libraryStrategy) })
  }
  if (db === "bioproject" && "projectType" in hit && hit.projectType) {
    tags.push({ key: "project-type", value: String(hit.projectType) })
  }

  return tags
}

const buildFooterFacets = (db: DbSlug, hit: DbHit, t: ReturnType<typeof useT>): readonly FacetItem[] => {
  const items: FacetItem[] = []
  if ("organization" in hit && Array.isArray(hit.organization) && hit.organization[0]?.name) {
    items.push({
      key: "submitter",
      label: t("search.facets.submitter"),
      value: hit.organization[0].name,
    })
  }
  if (db === "trad" && "sequenceLength" in hit && hit.sequenceLength) {
    items.push({
      key: "seq-len",
      label: t("search.results.card.sequenceLength"),
      value: `${hit.sequenceLength.toLocaleString("en-US")} bp`,
    })
  }
  if ("publication" in hit && Array.isArray(hit.publication) && hit.publication.length > 0) {
    items.push({
      key: "publication",
      label: t("search.results.card.publication"),
      value: String(hit.publication.length),
    })
  }
  if ("sameAs" in hit && Array.isArray(hit.sameAs) && hit.sameAs.length > 0) {
    items.push({
      key: "same-as",
      label: t("search.results.card.sameAs"),
      value: hit.sameAs.map((x) => x.identifier).slice(0, 3).join(", "),
    })
  }

  return items
}

export const ResultCard = ({ db, hit, lang }: ResultCardProps) => {
  const t = useT()
  const date = formatDate(hit.datePublished ?? hit.dateModified ?? hit.dateCreated, lang)
  const title = fullTextTitle(hit)
  const description = "description" in hit ? hit.description : null
  const tags = renderTags(db, hit)
  const facets = buildFooterFacets(db, hit, t)

  return (
    <article className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-fs-label">
        <span className="font-mono text-brand-deep font-semibold">{hit.identifier}</span>
        {date && <span className="text-ink-soft font-mono">{date}</span>}
        {tags.map(({ key, value }) => (
          <Tag key={key} kind="brand" size="sm" mono>{value}</Tag>
        ))}
      </div>
      <Link
        to={detailHref(db, hit.identifier)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink font-semibold text-fs-h2 no-underline hover:underline"
      >
        {title}
      </Link>
      {description && (
        <p className="text-ink-mid text-fs-body-sm m-0 line-clamp-3 leading-snug">{description}</p>
      )}
      {facets.length > 0 && (
        <dl className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-fs-label">
          {facets.map(({ key, label, value }) => (
            <div key={key} className="flex items-baseline gap-1.5 min-w-0">
              <dt className="text-ink-soft shrink-0">{label}</dt>
              <dd className="text-ink m-0 truncate">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}
