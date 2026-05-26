import { useState } from "react"
import { useNavigate } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { Chip, SearchBox, TextLink } from "~/ui"

const buildResultsHref = (q: string, lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  const params = new URLSearchParams()
  const trimmed = q.trim()
  if (trimmed !== "") params.set("q", trimmed)
  const search = params.toString()
  return `${prefix}/search/results${search === "" ? "" : `?${search}`}`
}

const buildSearchHref = (lang: Lang): string => (lang === "en" ? "/en/search" : "/search")

export const HeroSection = () => {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const rawExamples = t("top.hero.examples", { returnObjects: true })
  const examples: readonly string[] = Array.isArray(rawExamples) ? rawExamples : []

  return (
    <section className="w-full">
      <SearchBox
        size="lg"
        value={value}
        maxWidth={820}
        placeholder={t("top.hero.placeholder")}
        ariaLabel={t("top.hero.a11y.input")}
        submitLabel={t("top.hero.submit")}
        showScope={false}
        showSearchIcon
        onSubmit={(next) => {
          setValue(next)
          void navigate(buildResultsHref(next, lang))
        }}
      />
      <div className="mt-hero-gap flex items-center gap-2 flex-wrap justify-center text-fs-body-md text-ink-soft">
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
