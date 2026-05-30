import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

import { useT } from "~/lib/i18n"
import {
  SCOPE_KEYS,
  type ScopeKey,
  scopeKeyToDbSlug,
} from "~/lib/search-scope"
import { buildResultsHref, buildSearchHref } from "~/lib/search-url"
import { Examples, SearchBox, TextLink } from "~/ui"

export const HeroSection = () => {
  const t = useT()
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const [scope, setScope] = useState<ScopeKey>("all")
  const rawExamples = t("top.hero.examples", { returnObjects: true })
  const examples: readonly string[] = Array.isArray(rawExamples) ? rawExamples : []
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

  return (
    <section className="w-full">
      <SearchBox
        size="md"
        value={value}
        maxWidth={880}
        placeholder={t("top.hero.placeholder")}
        ariaLabel={t("top.hero.a11y.input")}
        submitLabel={t("top.hero.submit")}
        scope={scopeLabel}
        scopeOptions={scopeOptions}
        scopeAriaLabel={t("search.a11y.scope")}
        showSearchIcon
        onScopeChange={(label) => {
          const key = labelToKey.get(label)
          if (key !== undefined) setScope(key)
        }}
        onSubmit={(next) => {
          setValue(next)
          void navigate(buildResultsHref({ q: next.trim(), db: scopeKeyToDbSlug(scope) }))
        }}
      />
      <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
        <Examples label={t("top.hero.examplesLabel")} items={examples} onPick={setValue} />
        <TextLink to={buildSearchHref()}>{t("top.hero.advancedLink")} →</TextLink>
      </div>
    </section>
  )
}
