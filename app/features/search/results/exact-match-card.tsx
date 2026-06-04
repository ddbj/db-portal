import { type Lang, useT } from "~/lib/i18n"

import type { ExactMatch } from "./exact-match"
import type { DbHit } from "./result-fields"
import { ResultRow } from "./result-row"

type ExactMatchCardProps = {
  match: ExactMatch
  lang: Lang
}

// The exact-match entry above the cross-DB grid, set apart by a brand-colored border
// over the plain surface (no visible heading; the section is named for screen readers
// via aria-label). Reuses the per-DB ResultRow: the lightweight cross-search hit is a
// structural subset, and every result-fields helper guards with `"x" in hit`, so the
// row degrades to the fields the lightweight hit carries (no submitter / signature
// chips). The cast is the one place that bridges the two hit shapes.
export const ExactMatchCard = ({ match, lang }: ExactMatchCardProps) => {
  const t = useT()

  return (
    <section
      aria-label={t("search.results.cross.exactMatch")}
      className="mb-4 overflow-hidden rounded-card border border-brand-light bg-surface"
    >
      <ResultRow db={match.db} hit={match.hit as unknown as DbHit} lang={lang} dbChip />
    </section>
  )
}
