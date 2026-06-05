import { type Lang, useT } from "~/lib/i18n"

import type { ResolvedExactMatch } from "./exact-match"
import { ResultRow } from "./result-row"

type ExactMatchCardProps = {
  match: ResolvedExactMatch
  lang: Lang
}

// The exact-match entry above the cross-DB grid, set apart by a brand-colored border
// over the plain surface (no visible heading; the section is named for screen readers
// via aria-label). Reuses the per-DB ResultRow on the full hit the loader fetched for
// the named entry, so the card carries the same signature chips / lineage as a per-DB
// row (docs/search.md § 完全一致カード).
export const ExactMatchCard = ({ match, lang }: ExactMatchCardProps) => {
  const t = useT()

  return (
    <section
      aria-label={t("search.results.cross.exactMatch")}
      className="mb-4 overflow-hidden rounded-card border border-brand-light bg-surface"
    >
      <ResultRow db={match.db} hit={match.hit} lang={lang} dbChip />
    </section>
  )
}
