import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import Breadcrumb from "@/components/submit-alt/Breadcrumb"
import DetailPanelAlt from "@/components/submit-alt/DetailPanelAlt"
import MultiSelectGuidance from "@/components/submit-alt/MultiSelectGuidance"
import QAWizard from "@/components/submit-alt/QAWizard"
import { Heading } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  findMatchingLeaves,
  resolveLeafFromAnswers,
} from "@/lib/submit-alt/leaf-resolver"
import { resolveMultiSelectPattern } from "@/lib/submit-alt/multi-select-patterns"
import type { Q1Id, Q6Id, QAAnswers } from "@/types/submit-alt"

import type { Route } from "./+types/submit-alt"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  return {
    lang,
    metaTitle: resource.routes.submitAlt.meta.title,
    metaDescription: resource.routes.submitAlt.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "登録ナビゲーション v2 | DDBJ 刷新 (仮)" },
  { name: "description", content: data?.metaDescription ?? "" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/submit-alt` },
]

const EMPTY_ANSWERS: QAAnswers = {
  q1: new Set(),
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: new Set(),
  q7: null,
  q8: null,
  q9: null,
}

const SubmitAlt = () => {
  const { t } = useTranslation()
  const [answers, setAnswers] = useState<QAAnswers>(EMPTY_ANSWERS)

  const resolvedLeaf = useMemo(() => resolveLeafFromAnswers(answers), [answers])
  const candidateLeaves = useMemo(() => findMatchingLeaves(answers), [answers])
  const pattern = resolveMultiSelectPattern(answers)

  const handleAnswersChange = (next: QAAnswers): void => setAnswers(next)

  const updateAnswers = (
    mutator: (a: QAAnswers) => QAAnswers,
  ): void => setAnswers((prev) => mutator(prev))

  const handleQ1Remove = (id: Q1Id): void => {
    updateAnswers((a) => {
      const newQ1 = new Set(a.q1)
      newQ1.delete(id)

      return { ...a, q1: newQ1 }
    })
  }

  const handleQ6Remove = (id: Q6Id): void => {
    updateAnswers((a) => {
      const newQ6 = new Set(a.q6)
      newQ6.delete(id)

      return { ...a, q6: newQ6 }
    })
  }

  const handleQ2Clear = (): void => updateAnswers((a) => ({ ...a, q2: null }))
  const handleQ3Clear = (): void => updateAnswers((a) => ({ ...a, q3: null }))
  const handleQ4Clear = (): void => updateAnswers((a) => ({ ...a, q4: null }))
  const handleQ5Clear = (): void => updateAnswers((a) => ({ ...a, q5: null }))
  const handleQ7Clear = (): void => updateAnswers((a) => ({ ...a, q7: null }))
  const handleQ8Clear = (): void => updateAnswers((a) => ({ ...a, q8: null }))
  const handleQ9Clear = (): void => updateAnswers((a) => ({ ...a, q9: null }))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-6 py-12">
      <header className="text-center">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.submitAlt.hero.title")}
        </Heading>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t("routes.submitAlt.hero.subtitle")}
        </p>
      </header>

      <section
        aria-labelledby="submit-alt-qa-heading"
        className="space-y-4"
      >
        <Heading level={2} id="submit-alt-qa-heading">
          {t("routes.submitAlt.sections.qa")}
        </Heading>
        <QAWizard answers={answers} onChange={handleAnswersChange} />
        <MultiSelectGuidance pattern={pattern} />
      </section>

      <div className="space-y-4">
        <Breadcrumb
          answers={answers}
          onQ1Remove={handleQ1Remove}
          onQ2Clear={handleQ2Clear}
          onQ3Clear={handleQ3Clear}
          onQ4Clear={handleQ4Clear}
          onQ5Clear={handleQ5Clear}
          onQ6Remove={handleQ6Remove}
          onQ7Clear={handleQ7Clear}
          onQ8Clear={handleQ8Clear}
          onQ9Clear={handleQ9Clear}
        />
        <DetailPanelAlt
          resolvedLeaf={resolvedLeaf}
          candidateLeaves={candidateLeaves}
        />
      </div>
    </div>
  )
}

export default SubmitAlt
