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
  if (hit.type) tags.push({ key: "type", value: hit.type })
  if ("organism" in hit && hit.organism && hit.organism.name) {
    tags.push({ key: "organism", value: hit.organism.name })
  }
  if (db === "sra" && "libraryStrategy" in hit && hit.libraryStrategy) {
    tags.push({ key: "library", value: String(hit.libraryStrategy) })
  }
  if (db === "bioproject" && "projectType" in hit && hit.projectType) {
    tags.push({ key: "project-type", value: String(hit.projectType) })
  }

  return tags
}

export const ResultCard = ({ db, hit, lang }: ResultCardProps) => {
  const t = useT()
  const date = formatDate(hit.datePublished, lang)
  const title = fullTextTitle(hit)
  const description = "description" in hit ? hit.description : null
  const tags = renderTags(db, hit)

  return (
    <article className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2 text-fs-label">
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
        <p className="text-ink-mid text-fs-body-sm m-0 line-clamp-2">{description}</p>
      )}
      {"organization" in hit && Array.isArray(hit.organization) && hit.organization[0] && (
        <p className="text-ink-soft text-fs-label m-0">
          {t("search.facets.submitter")}: {hit.organization[0].name}
        </p>
      )}
    </article>
  )
}
