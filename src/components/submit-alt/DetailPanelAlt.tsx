import { MousePointerClick } from "lucide-react"
import type { Ref } from "react"
import { useTranslation } from "react-i18next"

import { Badge, EmptyState, Heading } from "@/components/ui"
import InternalExternalBadge from "@/components/ui/InternalExternalBadge"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  LEAF_DETAILS_ALT,
  LEAF_GOALS_ALT,
  LEAF_LABEL_KEY_ALT,
  LEAF_LEGACY_ID,
  LEAF_VENUE_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import type { LeafNodeIdAlt } from "@/types/submit-alt"

import DetailLeafTemplateAlt from "./DetailLeafTemplateAlt"

interface DetailPanelAltProps {
  resolvedLeaf: LeafNodeIdAlt | null
  candidateLeaves?: readonly LeafNodeIdAlt[]
  headingRef?: Ref<HTMLHeadingElement>
}

const DetailPanelAlt = ({
  resolvedLeaf,
  candidateLeaves,
  headingRef,
}: DetailPanelAltProps) => {
  const { t } = useDynamicTranslation()
  const { t: tStatic } = useTranslation()

  if (resolvedLeaf === null) {
    const candidates = candidateLeaves ?? []

    return (
      <section
        aria-labelledby="submit-alt-detail-heading"
        className="space-y-6"
      >
        <Heading
          level={2}
          id="submit-alt-detail-heading"
          ref={headingRef}
          className="scroll-mt-24"
        >
          {t("routes.submitAlt.sections.detail")}
        </Heading>
        {candidates.length > 0
          ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-gray-700">
                {tStatic("routes.submitAlt.detail.candidatesPrompt", {
                  count: candidates.length,
                })}
              </p>
              <ul className="space-y-2">
                {candidates.map((leafId) => {
                  const venue = LEAF_VENUE_ALT[leafId]

                  return (
                    <li
                      key={leafId}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3"
                    >
                      <Badge variant="gray" size="sm">
                        {LEAF_LEGACY_ID[leafId]}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-800">
                        {t(LEAF_LABEL_KEY_ALT[leafId])}
                      </span>
                      <InternalExternalBadge
                        venue={venue}
                        label={t(`routes.submitAlt.detail.venue.${venue}`)}
                      />
                      <span className="text-primary-700 ml-auto text-xs font-medium whitespace-nowrap">
                        → {LEAF_GOALS_ALT[leafId]}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
          : (
            <EmptyState
              icon={
                <MousePointerClick className="h-12 w-12" aria-hidden="true" />
              }
              title={t("routes.submitAlt.detail.empty.title")}
              description={t("routes.submitAlt.detail.empty.description")}
            />
          )}
      </section>
    )
  }

  const hasLeafDetail = LEAF_DETAILS_ALT[resolvedLeaf] !== undefined

  return (
    <section
      aria-labelledby="submit-alt-detail-heading"
      className="space-y-6"
    >
      <Heading
        level={2}
        id="submit-alt-detail-heading"
        ref={headingRef}
        className="scroll-mt-24"
      >
        {t("routes.submitAlt.sections.detail")}
      </Heading>
      {hasLeafDetail
        ? <DetailLeafTemplateAlt leafId={resolvedLeaf} />
        : (
          <p className="text-sm text-gray-600">
            {t("routes.submitAlt.detail.overviewPlaceholder")}
          </p>
        )}
    </section>
  )
}

export default DetailPanelAlt
