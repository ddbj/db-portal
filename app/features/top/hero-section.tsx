import { useState } from "react"
import { useNavigate } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { Chip, SearchBox, TextLink } from "~/ui"

const buildResultsHref = (q: string, lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  const trimmed = q.trim()
  return trimmed === ""
    ? `${prefix}/search/results`
    : `${prefix}/search/results?q=${encodeURIComponent(trimmed)}`
}

const buildSearchHref = (lang: Lang): string => (lang === "en" ? "/en/search" : "/search")

export const HeroSection = () => {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  // i18next の returnObjects は any 風の戻り値で型情報を持たないため double cast で受ける。
  // 値の shape は resources/ja.ts / en.ts の Resources 型で `readonly string[]` が保証される。
  const examples = t("top.hero.examples", { returnObjects: true }) as unknown as readonly string[]

  const handleSubmit = (next: string): void => {
    void navigate(buildResultsHref(next, lang))
  }

  return (
    <section className="flex flex-col gap-4 items-center w-full">
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
          handleSubmit(next)
        }}
      />
      <div className="flex items-center gap-2 flex-wrap justify-center text-fs-body-sm text-ink-soft">
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
