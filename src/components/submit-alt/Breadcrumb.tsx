import { Chip } from "@/components/ui"
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

interface BreadcrumbProps {
  answers: QAAnswers
  onQ1Remove: (id: Q1Id) => void
  onQ2Clear: () => void
  onQ3Clear: () => void
  onQ4Clear: () => void
  onQ5Clear: () => void
  onQ6Remove: (id: Q6Id) => void
  onQ7Clear: () => void
  onQ8Clear: () => void
  onQ9Clear: () => void
}

const Breadcrumb = ({
  answers,
  onQ1Remove,
  onQ2Clear,
  onQ3Clear,
  onQ4Clear,
  onQ5Clear,
  onQ6Remove,
  onQ7Clear,
  onQ8Clear,
  onQ9Clear,
}: BreadcrumbProps) => {
  const { t } = useDynamicTranslation()

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  for (const id of answers.q1) {
    chips.push({
      key: `q1-${id}`,
      label: t(`routes.submitAlt.qa.q1.${id}.label`),
      onRemove: () => onQ1Remove(id),
    })
  }
  if (answers.q2 !== null) {
    const id = answers.q2
    chips.push({
      key: "q2",
      label: t(`routes.submitAlt.qa.q2.${id}.label`),
      onRemove: onQ2Clear,
    })
  }
  if (answers.q3 !== null) {
    chips.push({
      key: "q3",
      label: t(`routes.submitAlt.qa.q3.${answers.q3}.label`),
      onRemove: onQ3Clear,
    })
  }
  if (answers.q4 !== null) {
    chips.push({
      key: "q4",
      label: t(`routes.submitAlt.qa.q4.${answers.q4}.label`),
      onRemove: onQ4Clear,
    })
  }
  if (answers.q5 !== null) {
    chips.push({
      key: "q5",
      label: t(`routes.submitAlt.qa.q5.${answers.q5}.label`),
      onRemove: onQ5Clear,
    })
  }
  for (const id of answers.q6) {
    chips.push({
      key: `q6-${id}`,
      label: t(`routes.submitAlt.qa.q6.${id}.label`),
      onRemove: () => onQ6Remove(id),
    })
  }
  if (answers.q7 !== null) {
    chips.push({
      key: "q7",
      label: t(`routes.submitAlt.qa.q7.${answers.q7}.label`),
      onRemove: onQ7Clear,
    })
  }
  if (answers.q8 !== null) {
    chips.push({
      key: "q8",
      label: t(`routes.submitAlt.qa.q8.${answers.q8}.label`),
      onRemove: onQ8Clear,
    })
  }
  if (answers.q9 !== null) {
    chips.push({
      key: "q9",
      label: t(`routes.submitAlt.qa.q9.${answers.q9}.label`),
      onRemove: onQ9Clear,
    })
  }

  if (chips.length === 0) return null

  return (
    <nav
      aria-label={t("routes.submitAlt.breadcrumb.aria")}
      className="flex flex-wrap items-center gap-2 text-xs text-gray-600"
    >
      {chips.map((c) => (
        <Chip key={c.key} variant="removable" onRemove={c.onRemove}>
          {c.label}
        </Chip>
      ))}
    </nav>
  )
}

export type {
  Q1Id,
  Q2Id,
  Q3Id,
  Q4Id,
  Q5Id,
  Q6Id,
  Q7Id,
  Q8Id,
  Q9Id,
}

export default Breadcrumb
