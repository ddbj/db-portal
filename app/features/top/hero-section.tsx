import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import {
  type DbSlug,
  SCOPE_KEYS,
  type ScopeKey,
  scopeKeyToDbSlug,
} from "~/lib/search-scope"
import { Chip, SearchBox, TextLink } from "~/ui"

const buildResultsHref = (q: string, db: DbSlug | null, lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  const params = new URLSearchParams()
  const trimmed = q.trim()
  if (trimmed !== "") params.set("q", trimmed)
  if (db) params.set("db", db)
  const search = params.toString()
  return `${prefix}/search/results${search === "" ? "" : `?${search}`}`
}

const buildSearchHref = (lang: Lang): string => (lang === "en" ? "/en/search" : "/search")

export const HeroSection = () => {
  const t = useT()
  const lang = useLang()
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
        maxWidth={820}
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
          void navigate(buildResultsHref(next, scopeKeyToDbSlug(scope), lang))
        }}
      />
      <div className="mt-4 flex items-center gap-2 flex-wrap justify-center text-fs-body-sm text-ink-soft">
        <span className="text-ink-mid">{t("top.hero.examplesLabel")}:</span>
        <ul className="list-none p-0 m-0 flex items-center gap-2 flex-wrap">
          {examples.map((example) => (
            <li key={example} className="m-0">
              <Chip
                as="button"
                kind="example"
                onClick={() => setValue(example)}
              >
                {example}
              </Chip>
            </li>
          ))}
        </ul>
        <TextLink to={buildSearchHref(lang)}>{t("top.hero.advancedLink")} →</TextLink>
      </div>
    </section>
  )
}
