import { useTranslation } from "react-i18next"

import { Button, Skeleton, TextLink } from "@/components/ui"
import cn from "@/components/ui/cn"
import type { DbPortalLightweightHit } from "@/lib/api"
import { DATABASES } from "@/lib/mock-data"
import { buildSearchUrlFull } from "@/lib/search-url"
import type { DbId, ErrorKind, FetchState } from "@/types/db"

export interface DbHitCountCardProps {
  dbId: DbId
  state: FetchState
  count: number | null
  error: ErrorKind | null
  query: string | null
  adv: string | null
  onRetry: (dbId: DbId) => void
  topHits?: readonly DbPortalLightweightHit[]
  className?: string
}

const TopHitItem = ({ hit }: { hit: DbPortalLightweightHit }) => {
  const { t } = useTranslation()
  const title = hit.title ?? hit.identifier
  const date = hit.datePublished ?? null
  const url = hit.url ?? null
  const ariaLabel = t("routes.search.crossMode.topHits.openExternalAria", {
    identifier: hit.identifier,
  })

  const titleNode = url !== null
    ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="text-primary-700 hover:text-primary-900 line-clamp-1 text-sm hover:underline"
      >
        {title}
      </a>
    )
    : (
      <span className="line-clamp-1 text-sm text-gray-800">{title}</span>
    )

  return (
    <li className="border-b border-gray-100 py-1.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2 text-xs text-gray-500">
        <span className="truncate font-mono text-gray-700">{hit.identifier}</span>
        {date !== null && (
          <time className="shrink-0 tabular-nums" dateTime={date}>
            {date}
          </time>
        )}
      </div>
      <div className="mt-0.5">{titleNode}</div>
    </li>
  )
}

const DbHitCountCard = ({
  dbId,
  state,
  count,
  error,
  query,
  adv,
  onRetry,
  topHits,
  className,
}: DbHitCountCardProps) => {
  const { t } = useTranslation()
  const db = DATABASES.find((d) => d.id === dbId)
  const displayName = db?.displayName ?? dbId
  const description = db?.description ?? ""

  const detailUrl = buildSearchUrlFull({ adv, db: dbId, q: query })
  const showTopHits = state === "success"
    && topHits !== undefined
    && topHits.length > 0

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300",
        className,
      )}
      data-testid={`db-hit-count-card-${dbId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{displayName}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="mt-3 min-h-[2.5rem]">
        {state === "loading" && (
          <Skeleton
            className="h-8 w-24"
            ariaLabel={t("routes.search.crossMode.loadingAria")}
          />
        )}
        {state === "success" && count !== null && (
          <TextLink
            to={detailUrl}
            className="inline-flex items-baseline gap-1 no-underline hover:underline"
          >
            <span className="text-2xl font-semibold tabular-nums">
              {count.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">件</span>
          </TextLink>
        )}
        {state === "error" && (
          <div>
            <p className="text-sm text-gray-700">
              {t("routes.search.crossMode.errorLabel")}
            </p>
            {error !== null && (
              <p className="mt-0.5 text-xs text-gray-500">
                {t(`routes.search.crossMode.errorKind.${error}`)}
              </p>
            )}
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => onRetry(dbId)}
              className="mt-2"
            >
              {t("routes.search.crossMode.retry")}
            </Button>
          </div>
        )}
      </div>
      {showTopHits && (
        <div
          className="mt-3 border-t border-gray-100 pt-2"
          data-testid={`top-hits-${dbId}`}
        >
          <h4 className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {t("routes.search.crossMode.topHits.heading")}
          </h4>
          <ul className="mt-1">
            {topHits.map((hit) => (
              <TopHitItem key={`${hit.identifier}-${hit.type}`} hit={hit} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default DbHitCountCard
