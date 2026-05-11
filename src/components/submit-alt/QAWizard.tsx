import { useMemo } from "react"

import { Heading } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type {
  Q1Id,
  Q2Id,
  Q3Id,
  Q4Id,
  Q5Id,
  Q6Id,
  Q7Id,
  Q8Id,
  Q9Id,
  QAAnswers,
} from "@/types/submit-alt"

interface QAWizardProps {
  answers: QAAnswers
  onChange: (next: QAAnswers) => void
}

interface MultiOptionDef<T extends string> {
  id: T
  labelKey: string
  descKey?: string
}

interface SingleOptionDef<T extends string> {
  id: T
  labelKey: string
  descKey?: string
}

const Q1_OPTIONS: readonly MultiOptionDef<Q1Id>[] = [
  { id: "sequence-read", labelKey: "routes.submitAlt.qa.q1.sequence-read.label", descKey: "routes.submitAlt.qa.q1.sequence-read.description" },
  { id: "assembled", labelKey: "routes.submitAlt.qa.q1.assembled.label", descKey: "routes.submitAlt.qa.q1.assembled.description" },
  { id: "annotation", labelKey: "routes.submitAlt.qa.q1.annotation.label", descKey: "routes.submitAlt.qa.q1.annotation.description" },
  { id: "variation", labelKey: "routes.submitAlt.qa.q1.variation.label", descKey: "routes.submitAlt.qa.q1.variation.description" },
  { id: "expression-array", labelKey: "routes.submitAlt.qa.q1.expression-array.label", descKey: "routes.submitAlt.qa.q1.expression-array.description" },
  { id: "expression-matrix", labelKey: "routes.submitAlt.qa.q1.expression-matrix.label", descKey: "routes.submitAlt.qa.q1.expression-matrix.description" },
  { id: "mass-spec", labelKey: "routes.submitAlt.qa.q1.mass-spec.label", descKey: "routes.submitAlt.qa.q1.mass-spec.description" },
  { id: "spatial-tx", labelKey: "routes.submitAlt.qa.q1.spatial-tx.label", descKey: "routes.submitAlt.qa.q1.spatial-tx.description" },
]

const Q2_OPTIONS: readonly SingleOptionDef<Q2Id>[] = [
  { id: "human", labelKey: "routes.submitAlt.qa.q2.human.label", descKey: "routes.submitAlt.qa.q2.human.description" },
  { id: "eukaryote", labelKey: "routes.submitAlt.qa.q2.eukaryote.label", descKey: "routes.submitAlt.qa.q2.eukaryote.description" },
  { id: "prokaryote", labelKey: "routes.submitAlt.qa.q2.prokaryote.label", descKey: "routes.submitAlt.qa.q2.prokaryote.description" },
  { id: "virus", labelKey: "routes.submitAlt.qa.q2.virus.label", descKey: "routes.submitAlt.qa.q2.virus.description" },
  { id: "metagenome", labelKey: "routes.submitAlt.qa.q2.metagenome.label", descKey: "routes.submitAlt.qa.q2.metagenome.description" },
  { id: "organelle-plasmid", labelKey: "routes.submitAlt.qa.q2.organelle-plasmid.label", descKey: "routes.submitAlt.qa.q2.organelle-plasmid.description" },
]

const Q3_OPTIONS: readonly SingleOptionDef<Q3Id>[] = [
  { id: "open", labelKey: "routes.submitAlt.qa.q3.open.label", descKey: "routes.submitAlt.qa.q3.open.description" },
  { id: "restricted", labelKey: "routes.submitAlt.qa.q3.restricted.label", descKey: "routes.submitAlt.qa.q3.restricted.description" },
]

const Q4_OPTIONS: readonly SingleOptionDef<Q4Id>[] = [
  { id: "primary", labelKey: "routes.submitAlt.qa.q4.primary.label", descKey: "routes.submitAlt.qa.q4.primary.description" },
  { id: "tpa", labelKey: "routes.submitAlt.qa.q4.tpa.label", descKey: "routes.submitAlt.qa.q4.tpa.description" },
]

const Q5_OPTIONS: readonly SingleOptionDef<Q5Id>[] = [
  { id: "small", labelKey: "routes.submitAlt.qa.q5.small.label", descKey: "routes.submitAlt.qa.q5.small.description" },
  { id: "normal", labelKey: "routes.submitAlt.qa.q5.normal.label", descKey: "routes.submitAlt.qa.q5.normal.description" },
]

const ALL_Q6_OPTIONS: readonly (MultiOptionDef<Q6Id> & { showFor: readonly Q2Id[] })[] = [
  { id: "haplotype", labelKey: "routes.submitAlt.qa.q6.haplotype.label", showFor: ["human", "eukaryote"] },
  { id: "tsa", labelKey: "routes.submitAlt.qa.q6.tsa.label", showFor: ["eukaryote", "metagenome"] },
  { id: "tls", labelKey: "routes.submitAlt.qa.q6.tls.label", showFor: ["metagenome"] },
  { id: "mag-sag", labelKey: "routes.submitAlt.qa.q6.mag-sag.label", showFor: ["metagenome"] },
  { id: "est", labelKey: "routes.submitAlt.qa.q6.est.label", showFor: ["eukaryote"] },
  { id: "none", labelKey: "routes.submitAlt.qa.q6.none.label", showFor: ["human", "eukaryote", "metagenome"] },
]

const Q7_OPTIONS: readonly SingleOptionDef<Q7Id>[] = [
  { id: "proteomics", labelKey: "routes.submitAlt.qa.q7.proteomics.label", descKey: "routes.submitAlt.qa.q7.proteomics.description" },
  { id: "metabolomics", labelKey: "routes.submitAlt.qa.q7.metabolomics.label", descKey: "routes.submitAlt.qa.q7.metabolomics.description" },
]

const Q8_OPTIONS: readonly SingleOptionDef<Q8Id>[] = [
  { id: "raw", labelKey: "routes.submitAlt.qa.q8.raw.label", descKey: "routes.submitAlt.qa.q8.raw.description" },
  { id: "primary", labelKey: "routes.submitAlt.qa.q8.primary.label", descKey: "routes.submitAlt.qa.q8.primary.description" },
]

const Q9_OPTIONS: readonly SingleOptionDef<Q9Id>[] = [
  { id: "yes", labelKey: "routes.submitAlt.qa.q9.yes.label", descKey: "routes.submitAlt.qa.q9.yes.description" },
  { id: "no", labelKey: "routes.submitAlt.qa.q9.no.label", descKey: "routes.submitAlt.qa.q9.no.description" },
]

interface QuestionBlockProps {
  number: string
  titleKey: string
  required?: boolean
  children: React.ReactNode
}

const QuestionBlock = ({ number, titleKey, required, children }: QuestionBlockProps) => {
  const { t } = useDynamicTranslation()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-primary-700 text-xs font-bold tracking-wider">{number}</span>
        <Heading level={3} className="grow">
          {t(titleKey)}
        </Heading>
        {required && (
          <span className="text-xs font-medium text-red-600">{t("routes.submitAlt.qa.required")}</span>
        )}
      </div>
      {children}
    </div>
  )
}

interface MultiCheckboxGroupProps<T extends string> {
  options: readonly MultiOptionDef<T>[]
  selected: ReadonlySet<T>
  onToggle: (id: T) => void
}

const MultiCheckboxGroup = <T extends string>({ options, selected, onToggle }: MultiCheckboxGroupProps<T>) => {
  const { t } = useDynamicTranslation()

  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => {
        const checked = selected.has(opt.id)

        return (
          <li key={opt.id} className="list-none">
            <label
              className={cn(
                "flex h-full cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                checked
                  ? "border-primary-500 bg-primary-50/60"
                  : "border-gray-200 hover:border-primary-300",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt.id)}
                className="text-primary-600 focus:ring-primary-200 mt-0.5 rounded border-gray-300"
              />
              <span className="flex flex-col gap-0.5">
                <span className={cn("text-sm font-semibold", checked ? "text-primary-800" : "text-gray-800")}>
                  {t(opt.labelKey)}
                </span>
                {opt.descKey !== undefined && (
                  <span className="text-xs leading-snug text-gray-500">{t(opt.descKey)}</span>
                )}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

interface SingleRadioGroupProps<T extends string> {
  options: readonly SingleOptionDef<T>[]
  selected: T | null
  onSelect: (id: T) => void
  name: string
}

const SingleRadioGroup = <T extends string>({ options, selected, onSelect, name }: SingleRadioGroupProps<T>) => {
  const { t } = useDynamicTranslation()

  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => {
        const checked = selected === opt.id

        return (
          <li key={opt.id} className="list-none">
            <label
              className={cn(
                "flex h-full cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                checked
                  ? "border-primary-500 bg-primary-50/60"
                  : "border-gray-200 hover:border-primary-300",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onSelect(opt.id)}
                className="text-primary-600 focus:ring-primary-200 mt-0.5 border-gray-300"
              />
              <span className="flex flex-col gap-0.5">
                <span className={cn("text-sm font-semibold", checked ? "text-primary-800" : "text-gray-800")}>
                  {t(opt.labelKey)}
                </span>
                {opt.descKey !== undefined && (
                  <span className="text-xs leading-snug text-gray-500">{t(opt.descKey)}</span>
                )}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

// Q3-Q9 の発火条件判定。
const computeVisibility = (answers: QAAnswers) => {
  const onlyReadOrAsm = answers.q1.size > 0
    && [...answers.q1].every((x) => x === "sequence-read" || x === "assembled")

  return {
    q3: answers.q2 === "human",
    q4: answers.q1.has("assembled"),
    q5: onlyReadOrAsm
      && answers.q2 !== null
      && (["prokaryote", "eukaryote", "virus", "organelle-plasmid"] as Q2Id[]).includes(answers.q2),
    q6: answers.q1.has("assembled")
      && answers.q2 !== null
      && (["human", "eukaryote", "metagenome"] as Q2Id[]).includes(answers.q2),
    q7: answers.q1.has("mass-spec"),
    q8: answers.q1.has("sequence-read")
      && !answers.q1.has("assembled")
      && answers.q2 === "metagenome",
    q9: answers.q2 === "human"
      && answers.q3 === "restricted"
      && (answers.q1.has("sequence-read") || answers.q1.has("assembled")),
  }
}

const QAWizard = ({ answers, onChange }: QAWizardProps) => {
  const visibility = useMemo(() => computeVisibility(answers), [answers])

  const visibleQ6 = useMemo(
    () =>
      ALL_Q6_OPTIONS.filter((opt) => answers.q2 !== null && opt.showFor.includes(answers.q2)),
    [answers.q2],
  )

  const toggleQ1 = (id: Q1Id): void => {
    const next = new Set(answers.q1)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...answers, q1: next })
  }

  const selectQ2 = (id: Q2Id): void => onChange({ ...answers, q2: id })
  const selectQ3 = (id: Q3Id): void => onChange({ ...answers, q3: id })
  const selectQ4 = (id: Q4Id): void => onChange({ ...answers, q4: id })
  const selectQ5 = (id: Q5Id): void => onChange({ ...answers, q5: id })

  const toggleQ6 = (id: Q6Id): void => {
    const next = new Set(answers.q6)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...answers, q6: next })
  }

  const selectQ7 = (id: Q7Id): void => onChange({ ...answers, q7: id })
  const selectQ8 = (id: Q8Id): void => onChange({ ...answers, q8: id })
  const selectQ9 = (id: Q9Id): void => onChange({ ...answers, q9: id })

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <QuestionBlock number="Q1" titleKey="routes.submitAlt.qa.q1.title" required>
        <MultiCheckboxGroup options={Q1_OPTIONS} selected={answers.q1} onToggle={toggleQ1} />
      </QuestionBlock>

      <QuestionBlock number="Q2" titleKey="routes.submitAlt.qa.q2.title" required>
        <SingleRadioGroup options={Q2_OPTIONS} selected={answers.q2} onSelect={selectQ2} name="q2" />
      </QuestionBlock>

      {visibility.q3 && (
        <QuestionBlock number="Q3" titleKey="routes.submitAlt.qa.q3.title">
          <SingleRadioGroup options={Q3_OPTIONS} selected={answers.q3} onSelect={selectQ3} name="q3" />
        </QuestionBlock>
      )}

      {visibility.q4 && (
        <QuestionBlock number="Q4" titleKey="routes.submitAlt.qa.q4.title">
          <SingleRadioGroup options={Q4_OPTIONS} selected={answers.q4} onSelect={selectQ4} name="q4" />
        </QuestionBlock>
      )}

      {visibility.q5 && (
        <QuestionBlock number="Q5" titleKey="routes.submitAlt.qa.q5.title">
          <SingleRadioGroup options={Q5_OPTIONS} selected={answers.q5} onSelect={selectQ5} name="q5" />
        </QuestionBlock>
      )}

      {visibility.q6 && (
        <QuestionBlock number="Q6" titleKey="routes.submitAlt.qa.q6.title">
          <MultiCheckboxGroup options={visibleQ6} selected={answers.q6} onToggle={toggleQ6} />
        </QuestionBlock>
      )}

      {visibility.q7 && (
        <QuestionBlock number="Q7" titleKey="routes.submitAlt.qa.q7.title">
          <SingleRadioGroup options={Q7_OPTIONS} selected={answers.q7} onSelect={selectQ7} name="q7" />
        </QuestionBlock>
      )}

      {visibility.q8 && (
        <QuestionBlock number="Q8" titleKey="routes.submitAlt.qa.q8.title">
          <SingleRadioGroup options={Q8_OPTIONS} selected={answers.q8} onSelect={selectQ8} name="q8" />
        </QuestionBlock>
      )}

      {visibility.q9 && (
        <QuestionBlock number="Q9" titleKey="routes.submitAlt.qa.q9.title">
          <SingleRadioGroup options={Q9_OPTIONS} selected={answers.q9} onSelect={selectQ9} name="q9" />
        </QuestionBlock>
      )}
    </div>
  )
}

export { computeVisibility }
export default QAWizard
