import { useState } from "react"
import { useNavigate } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { Chip, SearchBox, TextLink } from "~/ui"

const buildResultsHref = (q: string, lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  const trimmed = q.trim()
  if (trimmed === "") return `${prefix}/search/results`

  return `${prefix}/search/results?q=${encodeURIComponent(trimmed)}`
}

const buildSearchHref = (lang: Lang): string => (lang === "en" ? "/en/search" : "/search")

export const HeroSection = () => {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const examples = t("top.hero.examples", { returnObjects: true }) as unknown as readonly string[]

  const handleSubmit = (next: string): void => {
    void navigate(buildResultsHref(next, lang))
  }

  return (
    <section className="flex flex-col gap-3">
      <SearchBox
        size="lg"
        value={value}
        placeholder={t("top.hero.placeholder")}
        ariaLabel={t("top.hero.a11y.input")}
        submitLabel={t("top.hero.submit")}
        showScope={false}
        showSearchIcon
        onSubmit={(next) => {
          setValue(next)
          handleSubmit(next)
        }}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-fs-label text-ink-soft font-semibold">
          {t("top.hero.examplesLabel")}
        </span>
        <ul className="list-none p-0 m-0 flex items-center gap-2 flex-wrap">
          {examples.map((example) => (
            <li key={example} className="m-0">
              <Chip
                as="button"
                kind="example"
                onClick={() => {
                  setValue(example)
                  handleSubmit(example)
                }}
              >
                {example}
              </Chip>
            </li>
          ))}
        </ul>
        <span className="ml-auto">
          <TextLink to={buildSearchHref(lang)}>{t("top.hero.advancedLink")} →</TextLink>
        </span>
      </div>
    </section>
  )
}
