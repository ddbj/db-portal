import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/ui"
import type { DbPortalHit } from "@/lib/api"

import ResultCard from "./ResultCard"

export interface ResultCardListProps {
  hits: readonly DbPortalHit[]
}

const ResultCardList = ({ hits }: ResultCardListProps) => {
  const { t } = useTranslation()

  if (hits.length === 0) {
    return <EmptyState title={t("routes.search.dbMode.noResults")} />
  }

  return (
    <ul className="flex flex-col gap-3">
      {hits.map((h, idx) => (
        <li key={`${h.type}-${h.identifier}-${idx}`}>
          <ResultCard hit={h} />
        </li>
      ))}
    </ul>
  )
}

export default ResultCardList
