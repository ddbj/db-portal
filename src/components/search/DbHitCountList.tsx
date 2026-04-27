import type { DbHitCount, DbId } from "@/types/db"

import DbHitCountCard from "./DbHitCountCard"

export interface DbHitCountListProps {
  databases: readonly DbHitCount[]
  query: string | null
  adv: string | null
  onRetry: (dbId: DbId) => void
}

const stateRank = (state: DbHitCount["state"]): number => {
  if (state === "success") return 0
  if (state === "loading") return 1

  return 2
}

const sortDatabases = (dbs: readonly DbHitCount[]): readonly DbHitCount[] => {
  const sorted = [...dbs]
  sorted.sort((a, b) => {
    const sa = stateRank(a.state)
    const sb = stateRank(b.state)
    if (sa !== sb) return sa - sb
    if (a.state === "success" && b.state === "success") {
      return (b.count ?? 0) - (a.count ?? 0)
    }

    return 0
  })

  return sorted
}

const DbHitCountList = ({ databases, query, adv, onRetry }: DbHitCountListProps) => {
  const sorted = sortDatabases(databases)

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {sorted.map((db) => (
        <DbHitCountCard
          key={db.dbId}
          dbId={db.dbId}
          state={db.state}
          count={db.count}
          error={db.error ?? null}
          query={query}
          adv={adv}
          onRetry={onRetry}
          {...(db.topHits !== undefined && { topHits: db.topHits })}
        />
      ))}
    </div>
  )
}

export default DbHitCountList
