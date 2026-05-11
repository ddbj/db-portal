import { ChevronDown } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import Breadcrumb from "@/components/submit-alt/Breadcrumb"
import DecisionTreeAlt from "@/components/submit-alt/DecisionTreeAlt"
import DetailPanelAlt from "@/components/submit-alt/DetailPanelAlt"
import MultiSelectGuidance from "@/components/submit-alt/MultiSelectGuidance"
import QAWizard from "@/components/submit-alt/QAWizard"
import UseCaseCardGridAlt from "@/components/submit-alt/UseCaseCardGridAlt"
import { Heading } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  findMatchingLeaves,
  resolveLeafFromAnswers,
} from "@/lib/submit-alt/leaf-resolver"
import { resolveMultiSelectPattern } from "@/lib/submit-alt/multi-select-patterns"
import { resolveActiveCardAlt } from "@/lib/submit-alt/node-selectors"
import {
  applyQAAnswersToParams,
  parseForParam,
  parseQAAnswers,
} from "@/lib/submit-alt/url"
import type {
  Q1Id,
  Q6Id,
  QAAnswers,
  TreeNodeIdAlt,
  UseCaseCardAlt,
} from "@/types/submit-alt"

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

const SubmitAlt = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const answers = useMemo(() => parseQAAnswers(searchParams), [searchParams])
  const selectedNodeId = parseForParam(searchParams)
  const activeCardId = resolveActiveCardAlt(selectedNodeId)
  const pattern = resolveMultiSelectPattern(answers)

  const resolvedLeaf = useMemo(() => resolveLeafFromAnswers(answers), [answers])
  const candidateLeaves = useMemo(() => findMatchingLeaves(answers), [answers])

  // Q&A の答えで leaf が一意に決まったら ?for= を自動でセットする (ユーザーが手動で別 leaf をクリック中でない時)。
  const lastAutoLeafRef = useRef<string | null>(null)
  useEffect(() => {
    if (resolvedLeaf === null) return
    if (selectedNodeId === resolvedLeaf) return
    if (lastAutoLeafRef.current === resolvedLeaf) return
    lastAutoLeafRef.current = resolvedLeaf
    const next = new URLSearchParams(searchParams)
    next.set("for", resolvedLeaf)
    setSearchParams(next, { preventScrollReset: true, replace: true })
  }, [resolvedLeaf, selectedNodeId, searchParams, setSearchParams])

  const handleAnswersChange = (nextAnswers: QAAnswers): void => {
    const next = new URLSearchParams(searchParams)
    applyQAAnswersToParams(next, nextAnswers)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleCardSelect = (card: UseCaseCardAlt): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", card.treeNodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleNodeSelect = (nodeId: TreeNodeIdAlt): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", nodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleCandidateSelect = (leafId: TreeNodeIdAlt): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", leafId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const updateAnswers = (
    mutator: (a: QAAnswers) => QAAnswers,
  ): void => {
    const next = new URLSearchParams(searchParams)
    applyQAAnswersToParams(next, mutator(answers))
    setSearchParams(next, { preventScrollReset: true })
  }

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

      <section aria-labelledby="submit-alt-cards-heading">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <Heading
              level={2}
              id="submit-alt-cards-heading"
              className="grow"
            >
              {t("routes.submitAlt.sections.cards")}
            </Heading>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="mt-4">
            <UseCaseCardGridAlt
              candidateLeaves={candidateLeaves}
              activeCardId={activeCardId}
              onSelect={handleCardSelect}
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="submit-alt-tree-heading">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <Heading
              level={2}
              id="submit-alt-tree-heading"
              className="grow"
            >
              {t("routes.submitAlt.sections.tree")}
            </Heading>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="mt-4">
            <DecisionTreeAlt
              selectedNodeId={selectedNodeId}
              candidateLeaves={candidateLeaves}
              isQAStarted={answers.q1.size > 0 && answers.q2 !== null}
              onNodeClick={handleNodeSelect}
            />
          </div>
        </details>
      </section>

      <div className="space-y-4">
        <Breadcrumb
          answers={answers}
          selectedNodeId={selectedNodeId}
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
          selectedNodeId={selectedNodeId}
          candidateLeaves={candidateLeaves}
          onCandidateSelect={handleCandidateSelect}
        />
      </div>
    </div>
  )
}

export default SubmitAlt
