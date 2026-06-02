import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

import { NavigableSearchInput, serializeAstToDsl, useSearchPending } from "~/features/search"
import { type ParseNode, searchApiBaseUrl } from "~/lib/api"
import { useT } from "~/lib/i18n"
import {
  SCOPE_KEYS,
  type ScopeKey,
  scopeKeyToDbSlug,
} from "~/lib/search-scope"
import { buildResultsHref, buildSearchHref } from "~/lib/search-url"
import { TextLink } from "~/ui"

// The hero search input needs the search feature (NavigableSearchInput), so it
// lives in the route layer — features/top may not import features/search.
export const HeroSection = () => {
  const t = useT()
  const navigate = useNavigate()
  const search = useSearchPending()
  const [keyword, setKeyword] = useState("")
  const [scope, setScope] = useState<ScopeKey>("all")
  const scopeOptions = useMemo(
    () => SCOPE_KEYS.map((key) => t(`search.scope.${key}`)),
    [t],
  )
  const scopeLabel = t(`search.scope.${scope}`)
  const labelToKey = useMemo(() => {
    const map = new Map<string, ScopeKey>()
    SCOPE_KEYS.forEach((key) => map.set(t(`search.scope.${key}`), key))

    return map
  }, [t])
  const db = scopeKeyToDbSlug(scope)

  const handleScopeChange = (label: string) => {
    const key = labelToKey.get(label)
    if (key !== undefined) setScope(key)
  }

  const handleSearch = (value: string) => {
    search.begin()
    navigate(buildResultsHref({ q: value.trim(), db }))
  }

  // The top page only generates new queries, so the AI proposal is serialized
  // and handed straight to the results page (the proposal itself is not shown).
  const handleGenerated = async (ast: ParseNode) => {
    search.begin()
    try {
      const dsl = await serializeAstToDsl(ast, { baseUrl: searchApiBaseUrl })
      navigate(buildResultsHref({ q: dsl, db }))
    } catch {
      // Serialize is a system-side failure; stay on the top page.
      search.end()
    }
  }

  return (
    <section className="w-full">
      <NavigableSearchInput
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        scope={scopeLabel}
        scopeOptions={scopeOptions}
        onScopeChange={handleScopeChange}
        allowAppend={false}
        hideScopeInAiMode
        onGenerated={(ast) => void handleGenerated(ast)}
        examplesTrailing={
          <TextLink to={buildSearchHref()}>{t("top.hero.advancedLink")} →</TextLink>
        }
        searchPending={search.pending}
      />
    </section>
  )
}
