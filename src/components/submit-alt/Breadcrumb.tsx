import { ChevronRight } from "lucide-react"

import { Chip } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { LEAF_LABEL_KEY_ALT } from "@/lib/mock-data/submit-alt-tree"
import { NODE_BY_ID_ALT } from "@/lib/submit-alt/node-selectors"
import type {
  LeafNodeIdAlt,
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
  TreeNodeIdAlt,
} from "@/types/submit-alt"

interface BreadcrumbProps {
  answers: QAAnswers
  selectedNodeId: TreeNodeIdAlt | null
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

// docs/submit-alt.md「パンくずリスト」参照。
// Q&A 回答の chip と leaf 名を併記する。
const Breadcrumb = ({
  answers,
  selectedNodeId,
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

  const leafLabel = ((): string | null => {
    if (selectedNodeId === null) return null
    const node = NODE_BY_ID_ALT.get(selectedNodeId)
    if (!node || node.type !== "leaf") return null
    const key = LEAF_LABEL_KEY_ALT[selectedNodeId as LeafNodeIdAlt]

    return t(key, { defaultValue: selectedNodeId })
  })()

  if (chips.length === 0 && leafLabel === null) return null

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
      {chips.length > 0 && leafLabel !== null && (
        <ChevronRight
          className="h-3 w-3 text-gray-400"
          aria-hidden="true"
        />
      )}
      {leafLabel !== null && (
        <span className="text-primary-700 font-semibold">{leafLabel}</span>
      )}
    </nav>
  )
}

// 型を Re-export して routes 側で利用する
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
