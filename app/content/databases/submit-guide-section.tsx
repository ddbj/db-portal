import { SUBMIT_CARDS } from "~/content/submit-routing/cards"
import type { Lang } from "~/lib/i18n"
import type { Service } from "~/schemas/submit"
import { Callout, Heading } from "~/ui"

type SubmitGuideSectionProps = {
  service: Service
  lang: Lang
}

const HEADINGS = {
  steps: { ja: "登録手順", en: "Registration steps" },
  prepare: { ja: "事前準備", en: "Before you start" },
} as const

export const SubmitGuideSection = ({ service, lang }: SubmitGuideSectionProps) => {
  const card = SUBMIT_CARDS[service]
  const steps = card.wizardSteps[lang]
  const prepare = card.prepare[lang]
  const gotcha = card.gotcha?.[lang]

  return (
    <>
      {steps.length > 0 && (
        <section>
          <Heading as="h2" bar className="mb-3">{HEADINGS.steps[lang]}</Heading>
          <ol className="flex flex-col gap-1.5 m-0 pl-5">
            {steps.map((step, i) => (
              <li key={i} className="text-fs-body text-ink-mid leading-relaxed list-decimal">
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
      {prepare.length > 0 && (
        <section>
          <Heading as="h2" bar className="mb-3">{HEADINGS.prepare[lang]}</Heading>
          <ul className="flex flex-col gap-1.5 m-0 pl-5">
            {prepare.map((item, i) => (
              <li key={i} className="text-fs-body text-ink-mid leading-relaxed list-disc">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
      {gotcha !== undefined && gotcha.length > 0 && (
        <Callout tone="warn">{gotcha}</Callout>
      )}
    </>
  )
}
