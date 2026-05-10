import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"
import InternalExternalBadge from "@/components/ui/InternalExternalBadge"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  GOAL_TEMPLATES_ALT,
  LEAF_DETAILS_ALT,
  LEAF_LEGACY_ID,
} from "@/lib/mock-data/submit-alt-tree"
import type { LeafNodeIdAlt } from "@/types/submit-alt"

import MasterBadgeList from "./MasterBadgeList"

interface DetailLeafTemplateAltProps {
  leafId: LeafNodeIdAlt
}

// leaf 到達時の具体レベル詳細。goal テンプレ + leaf 差分 + masters を data-driven で描画する。
const DetailLeafTemplateAlt = ({ leafId }: DetailLeafTemplateAltProps) => {
  const { t } = useDynamicTranslation()
  const detail = LEAF_DETAILS_ALT[leafId]
  const goal = GOAL_TEMPLATES_ALT[detail.goalTemplateId]
  const allLinks = [...goal.primaryLinks, ...(detail.extraLinks ?? [])]
  const legacyId = LEAF_LEGACY_ID[leafId]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary" size="md">
          {detail.goalLabel}
        </Badge>
        <InternalExternalBadge
          venue={detail.venue}
          label={t(`routes.submitAlt.detail.venue.${detail.venue}`)}
        />
        <Badge variant="gray" size="sm">
          {legacyId}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-gray-700">
        {t(detail.summaryKey, {
          defaultValue: t("routes.submitAlt.detail.placeholderSummary"),
        })}
      </p>

      <section className="space-y-3">
        <Heading level={3}>
          {t("routes.submitAlt.detail.headings.steps")}
        </Heading>
        <ol className="space-y-1.5 pl-0">
          {detail.stepKeys.map((stepKey, i) => (
            <li
              key={stepKey}
              className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{t(`${stepKey}.title`)}</p>
                <p className="text-xs text-gray-600">
                  {t(`${stepKey}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <MasterBadgeList masters={detail.masters} />

      <section className="space-y-2">
        <Heading level={3}>
          {t("routes.submitAlt.detail.headings.common")}
        </Heading>
        <p className="text-sm leading-relaxed text-gray-700">
          {t(goal.commonRequirementsKey)}
        </p>
      </section>

      {allLinks.length > 0 && (
        <section className="space-y-2">
          <Heading level={3}>
            {t("routes.submitAlt.detail.headings.links")}
          </Heading>
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

export default DetailLeafTemplateAlt
