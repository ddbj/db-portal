import { useTranslation } from "react-i18next"

import { Badge, TextLink } from "@/components/ui"
import cn from "@/components/ui/cn"
import { DATABASES } from "@/lib/mock-data"
import type { SearchResult } from "@/types/search"

export interface ResultCardProps {
  result: SearchResult
  className?: string
}

const buildMetaLine = (result: SearchResult): string | null => {
  switch (result.dbId) {
    case "bioproject": {
      const parts: string[] = []
      if (result.projectType !== undefined) parts.push(`Project type: ${result.projectType}`)
      if (result.organization !== undefined) parts.push(`Organization: ${result.organization}`)

      return parts.length > 0 ? parts.join(" · ") : null
    }
    case "trad":
      return result.division !== undefined ? `Division: ${result.division}` : null
    case "taxonomy": {
      const parts: string[] = []
      if (result.rank !== undefined) parts.push(`Rank: ${result.rank}`)
      if (result.commonName !== undefined) parts.push(`Common: ${result.commonName}`)
      if (result.japaneseName !== undefined) parts.push(`Japanese: ${result.japaneseName}`)

      return parts.length > 0 ? parts.join(" · ") : null
    }
    default:
      return null
  }
}

const ResultCard = ({ result, className }: ResultCardProps) => {
  const { t } = useTranslation()

  const showOrganism = result.dbId !== "taxonomy" && result.organism !== undefined
  const showDescription =
    result.description !== undefined && result.description !== result.title
  const metaLine = buildMetaLine(result)
  const related = result.relatedObjects ?? []

  return (
    <article
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300",
        className,
      )}
      data-testid={`result-card-${result.identifier}`}
    >
      <div className="flex items-baseline justify-between gap-3 text-xs text-gray-500">
        <span className="font-mono font-medium text-gray-700">{result.identifier}</span>
        {result.publishedAt !== null && (
          <time
            aria-label={t("routes.search.dbMode.publishedAtAria")}
            dateTime={result.publishedAt}
          >
            {result.publishedAt}
          </time>
        )}
      </div>
      <div className="mt-2">
        <TextLink
          external
          href={result.externalUrl}
          className="line-clamp-2 text-lg font-medium"
        >
          {result.title}
        </TextLink>
      </div>
      {showDescription && (
        <p className="mt-1 line-clamp-1 text-sm text-gray-700">{result.description}</p>
      )}
      {showOrganism && result.organism !== undefined && (
        <p className="mt-1 text-xs text-gray-600">
          {result.organism.name}
          {result.organism.taxonomyId !== undefined && ` (${result.organism.taxonomyId})`}
        </p>
      )}
      {metaLine !== null && <p className="mt-1 text-xs text-gray-500">{metaLine}</p>}
      {related.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {related.map((ro) => {
            const db = DATABASES.find((d) => d.id === ro.dbId)

            return (
              <Badge key={`${ro.dbId}-${ro.identifier}`} variant="gray" size="sm">
                {db?.shortName ?? ro.dbId}: {ro.identifier}
              </Badge>
            )
          })}
        </div>
      )}
    </article>
  )
}

export default ResultCard
