import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { GOAL_TEMPLATES, LEAF_DETAILS } from "@/lib/mock-data"
import type { LeafNodeId } from "@/types/submit"

interface DetailLeafTemplateProps {
  leafId: LeafNodeId
}

// goal テンプレ + leaf 差分データを data-driven で描画する具体レベルコンポーネント。
// 手書き TSX が存在しない leaf で DetailPanel から呼ばれる（src/components/submit/DetailPanel.tsx）。
const DetailLeafTemplate = ({ leafId }: DetailLeafTemplateProps) => {
  const { t } = useDynamicTranslation()
  const leaf = LEAF_DETAILS[leafId]
  const goal = GOAL_TEMPLATES[leaf.goalTemplateId]

  const allLinks = [...goal.primaryLinks, ...(leaf.extraLinks ?? [])]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary" size="md">{leaf.goalLabel}</Badge>
        {leaf.badges.map((b) => (
          <Badge key={b.labelKey} variant={b.variant} size="md">
            {t(b.labelKey)}
          </Badge>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-gray-700">
        {t(leaf.summaryKey)}
      </p>

      <section className="space-y-3">
        <Heading level={3}>{t("routes.submit.detail.stepsHeading")}</Heading>
        <ol className="space-y-1.5 pl-0">
          {leaf.stepKeys.map((stepKey, i) => (
            <li
              key={stepKey}
              className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{t(`${stepKey}.title`)}</p>
                <p className="text-xs text-gray-600">{t(`${stepKey}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <Heading level={3}>{t("routes.submit.detail.commonHeading")}</Heading>
        <p className="text-sm leading-relaxed text-gray-700">
          {t(goal.commonRequirementsKey)}
        </p>
      </section>

      {allLinks.length > 0 && (
        <section className="space-y-2">
          <Heading level={3}>{t("routes.submit.detail.linksHeading")}</Heading>
          <ul className="space-y-1.5">
            {allLinks.map((link) => (
              <li key={link.url} className="text-sm">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 decoration-primary-300 hover:text-primary-800 hover:decoration-primary-600 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                >
                  {t(link.labelKey)}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default DetailLeafTemplate
