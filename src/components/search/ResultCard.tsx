import { useTranslation } from "react-i18next"

import { Badge, TextLink } from "@/components/ui"
import cn from "@/components/ui/cn"
import { type DbPortalHit, mapTypeToDbId } from "@/lib/api"
import { DATABASES } from "@/lib/mock-data"
import type { DbId } from "@/types/db"

export interface ResultCardProps {
  hit: DbPortalHit
  className?: string
}

const buildMetaLine = (hit: DbPortalHit): string | null => {
  const parts: string[] = []
  switch (hit.type) {
    case "bioproject": {
      if (hit.objectType !== null && hit.objectType !== undefined) {
        parts.push(`Project type: ${hit.objectType}`)
      }
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      break
    }
    case "biosample": {
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      if (hit.package?.name !== null && hit.package?.name !== undefined && hit.package.name !== "") {
        parts.push(`Package: ${hit.package.name}`)
      }
      if (hit.model !== null && hit.model !== undefined && hit.model.length > 0) {
        parts.push(`Model: ${hit.model.join(", ")}`)
      }
      break
    }
    case "sra-submission":
    case "sra-study":
    case "sra-experiment":
    case "sra-run":
    case "sra-sample":
    case "sra-analysis": {
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      if (hit.libraryStrategy !== null && hit.libraryStrategy !== undefined) {
        parts.push(`Library: ${hit.libraryStrategy}`)
      }
      if (hit.platform !== null && hit.platform !== undefined) {
        parts.push(`Platform: ${hit.platform}`)
      }
      if (hit.instrumentModel !== null && hit.instrumentModel !== undefined) {
        parts.push(`Instrument: ${hit.instrumentModel}`)
      }
      if (hit.analysisType !== null && hit.analysisType !== undefined) {
        parts.push(`Analysis: ${hit.analysisType}`)
      }
      break
    }
    case "jga-study":
    case "jga-dataset":
    case "jga-dac":
    case "jga-policy": {
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      if (hit.studyType !== null && hit.studyType !== undefined) {
        parts.push(`Study type: ${hit.studyType}`)
      }
      if (hit.datasetType !== null && hit.datasetType !== undefined) {
        parts.push(`Dataset type: ${hit.datasetType}`)
      }
      if (hit.vendor !== null && hit.vendor !== undefined) {
        parts.push(`Vendor: ${hit.vendor}`)
      }
      break
    }
    case "gea": {
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      if (hit.experimentType !== null && hit.experimentType !== undefined) {
        parts.push(`Experiment type: ${hit.experimentType}`)
      }
      break
    }
    case "metabobank": {
      const orgName = hit.organization?.[0]?.name
      if (orgName !== null && orgName !== undefined && orgName !== "") {
        parts.push(`Organization: ${orgName}`)
      }
      if (hit.studyType !== null && hit.studyType !== undefined) {
        parts.push(`Study type: ${hit.studyType}`)
      }
      if (hit.experimentType !== null && hit.experimentType !== undefined) {
        parts.push(`Experiment type: ${hit.experimentType}`)
      }
      if (hit.submissionType !== null && hit.submissionType !== undefined) {
        parts.push(`Submission type: ${hit.submissionType}`)
      }
      break
    }
    case "trad": {
      if (hit.division !== null && hit.division !== undefined) {
        parts.push(`Division: ${hit.division}`)
      }
      if (hit.molecularType !== null && hit.molecularType !== undefined) {
        parts.push(`Type: ${hit.molecularType}`)
      }
      if (hit.sequenceLength !== null && hit.sequenceLength !== undefined) {
        parts.push(`Length: ${hit.sequenceLength.toLocaleString()}`)
      }
      break
    }
    case "taxonomy": {
      if (hit.rank !== null && hit.rank !== undefined) {
        parts.push(`Rank: ${hit.rank}`)
      }
      if (hit.commonName !== null && hit.commonName !== undefined) {
        parts.push(`Common: ${hit.commonName}`)
      }
      if (hit.japaneseName !== null && hit.japaneseName !== undefined) {
        parts.push(`Japanese: ${hit.japaneseName}`)
      }
      break
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null
}

interface RelatedRef {
  identifier: string
  dbId: DbId
}

const buildRelated = (hit: DbPortalHit): readonly RelatedRef[] => {
  const refs: RelatedRef[] = []
  const sameAs = "sameAs" in hit ? hit.sameAs : null
  if (sameAs !== null && sameAs !== undefined) {
    for (const sa of sameAs) {
      if (sa.identifier && sa.type) {
        refs.push({ identifier: sa.identifier, dbId: mapTypeToDbId(sa.type) })
      }
    }
  }

  return refs
}

const ResultCard = ({ hit, className }: ResultCardProps) => {
  const { t } = useTranslation()
  const dbId = mapTypeToDbId(hit.type)
  const title = hit.title ?? hit.identifier
  const description = hit.description ?? null
  const showDescription = description !== null && description !== "" && description !== title
  const showOrganism = dbId !== "taxonomy"
    && hit.organism !== null
    && hit.organism !== undefined
    && hit.organism.name !== null
    && hit.organism.name !== undefined
  const metaLine = buildMetaLine(hit)
  const related = buildRelated(hit)
  const externalUrl = hit.url ?? "#"
  const status = hit.status ?? null
  const accessibility = hit.accessibility ?? null
  const showStatusBadge = status !== null && status !== "public"
  const showAccessibilityBadge = accessibility !== null && accessibility !== "public-access"

  return (
    <article
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300",
        className,
      )}
      data-testid={`result-card-${hit.identifier}`}
    >
      <div className="flex items-baseline justify-between gap-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-medium text-gray-700">{hit.identifier}</span>
          {showStatusBadge && status !== null && (
            <Badge variant="warning" size="sm">
              {t(`routes.search.dbMode.status.${status}`)}
            </Badge>
          )}
          {showAccessibilityBadge && accessibility !== null && (
            <Badge variant="secondary" size="sm">
              {t(`routes.search.dbMode.accessibility.${accessibility}`)}
            </Badge>
          )}
        </div>
        {hit.datePublished !== null && hit.datePublished !== undefined && (
          <time
            aria-label={t("routes.search.dbMode.publishedAtAria")}
            dateTime={hit.datePublished}
          >
            {hit.datePublished}
          </time>
        )}
      </div>
      <div className="mt-2">
        <TextLink
          external
          href={externalUrl}
          className="line-clamp-2 text-lg font-medium"
        >
          {title}
        </TextLink>
      </div>
      {showDescription && (
        <p className="mt-1 line-clamp-1 text-sm text-gray-700">{description}</p>
      )}
      {showOrganism && hit.organism !== null && hit.organism !== undefined && (
        <p className="mt-1 text-xs text-gray-600">
          {hit.organism.name}
          {hit.organism.identifier !== null && hit.organism.identifier !== undefined
            && ` (${hit.organism.identifier})`}
        </p>
      )}
      {metaLine !== null && <p className="mt-1 text-xs text-gray-500">{metaLine}</p>}
      {related.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {related.map((ro, idx) => {
            const db = DATABASES.find((d) => d.id === ro.dbId)

            return (
              <Badge key={`${ro.dbId}-${ro.identifier}-${idx}`} variant="gray" size="sm">
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
