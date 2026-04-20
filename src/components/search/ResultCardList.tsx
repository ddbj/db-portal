import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/ui"
import type { SearchResult } from "@/types/search"

import ResultCard from "./ResultCard"

export interface ResultCardListProps {
  results: readonly SearchResult[]
}

const ResultCardList = ({ results }: ResultCardListProps) => {
  const { t } = useTranslation()

  if (results.length === 0) {
    return <EmptyState title={t("routes.search.dbMode.noResults")} />
  }

  return (
    <ul className="flex flex-col gap-3">
      {results.map((r) => (
        <li key={`${r.dbId}-${r.identifier}`}>
          <ResultCard result={r} />
        </li>
      ))}
    </ul>
  )
}

export default ResultCardList
