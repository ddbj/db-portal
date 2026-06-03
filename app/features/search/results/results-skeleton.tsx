import { useT } from "~/lib/i18n"
import { cn, Heading } from "~/ui"

import type { DbSlug } from "../types"
import { CARD_ORDER } from "./cross-results"

const Bar = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("block animate-pulse rounded-tag bg-border-soft", className)} />
)

// Mirrors DbResultCard's frame (rounded-card border p-4, DB-name h3, count,
// top-hit lines). The DB name is static i18n so it shows for real; everything
// data-dependent is a pulsing bar. A distinct testid keeps the transient
// skeleton from satisfying the `db-card` assertions in the e2e suite.
const SkeletonCard = ({ db }: { db: DbSlug }) => {
  const t = useT()

  return (
    <div
      data-testid="db-card-skeleton"
      className="rounded-card border border-border-soft bg-surface p-4 flex flex-col gap-3"
    >
      <Heading as="h3" size="h2">{t(`search.scope.${db}`)}</Heading>
      <Bar className="h-7 w-24" />
      <div className="border-t border-border-soft pt-3 flex flex-col gap-2">
        <Bar className="h-3 w-1/2" />
        <Bar className="h-3 w-4/5" />
        <Bar className="h-3 w-2/3" />
      </div>
    </div>
  )
}

const CrossResultsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {CARD_ORDER.map((db) => <SkeletonCard key={db} db={db} />)}
  </div>
)

const PerDbResultsSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="border-b border-border-soft min-h-heading-row" />
    <ul className="list-none p-0 m-0 flex flex-col gap-4">
      {[0, 1, 2, 3].map((row) => (
        <li key={row} className="border-b border-border-soft pb-4 flex flex-col gap-2">
          <Bar className="h-4 w-2/5" />
          <Bar className="h-3 w-3/4" />
        </li>
      ))}
    </ul>
  </div>
)

// Plain pulsing blocks only: no "絞り込み" heading and no facet testids, so the
// skeleton sidebar can't be mistaken for the real FacetPanel mid-load.
const SidebarSkeleton = () => (
  <div className="flex flex-col gap-4">
    <Bar className="h-6 w-1/3" />
    {[0, 1, 2].map((group) => (
      <div key={group} className="flex flex-col gap-2">
        <Bar className="h-4 w-2/5" />
        <Bar className="h-3 w-3/4" />
        <Bar className="h-3 w-2/3" />
      </div>
    ))}
  </div>
)

export const SearchResultsSkeleton = ({ db }: { db: DbSlug | null }) => {
  const t = useT()

  return (
    <div aria-busy="true" className="grid gap-6 sm:grid-cols-[var(--spacing-sidebar)_1fr]">
      <span className="sr-only">{t("loading")}</span>
      <SidebarSkeleton />
      <div className="min-w-0">
        {db === null ? <CrossResultsSkeleton /> : <PerDbResultsSkeleton />}
      </div>
    </div>
  )
}
