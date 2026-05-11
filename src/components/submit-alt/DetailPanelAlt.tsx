import { ChevronRight, MousePointerClick } from "lucide-react"
import type { Ref } from "react"
import { useTranslation } from "react-i18next"

import { Badge, EmptyState, Heading } from "@/components/ui"
import cn from "@/components/ui/cn"
import InternalExternalBadge from "@/components/ui/InternalExternalBadge"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  LEAF_DETAILS_ALT,
  LEAF_GOALS_ALT,
  LEAF_LABEL_KEY_ALT,
  LEAF_LEGACY_ID,
  LEAF_VENUE_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import { resolveDetailModeAlt } from "@/lib/submit-alt/node-selectors"
import type { LeafNodeIdAlt, TreeNodeIdAlt } from "@/types/submit-alt"

import DetailLeafTemplateAlt from "./DetailLeafTemplateAlt"

interface DetailPanelAltProps {
  selectedNodeId: TreeNodeIdAlt | null
  // Q&A の途中で leaf が一意化されていない時の候補一覧。
  // selectedNodeId === null の時に表示する。
  candidateLeaves?: readonly LeafNodeIdAlt[]
  onCandidateSelect?: (leafId: LeafNodeIdAlt) => void
  headingRef?: Ref<HTMLHeadingElement>
}

const DetailPanelAlt = ({
  selectedNodeId,
  candidateLeaves,
  onCandidateSelect,
  headingRef,
}: DetailPanelAltProps) => {
  const { t } = useDynamicTranslation()
  const { t: tStatic } = useTranslation()

  if (selectedNodeId === null) {
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
                    <li key={leafId}>
                      <button
                        type="button"
                        onClick={() => onCandidateSelect?.(leafId)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg border bg-white px-4 py-3 text-left transition-all",
                          "hover:border-primary-400 hover:-translate-y-0.5 hover:shadow-md",
                          "focus:ring-primary-200 focus:ring-2 focus:outline-none",
                          "border-gray-200",
                        )}
                      >
                        <div className="flex grow flex-wrap items-center gap-2">
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
                        </div>
                        <span className="text-primary-700 text-xs font-medium whitespace-nowrap">
                          → {LEAF_GOALS_ALT[leafId]}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
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

  const mode = resolveDetailModeAlt(selectedNodeId)
  const isLeaf = mode === "leaf"
    && LEAF_DETAILS_ALT[selectedNodeId as LeafNodeIdAlt] !== undefined

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
      {isLeaf
        ? (
          <DetailLeafTemplateAlt
            leafId={selectedNodeId as LeafNodeIdAlt}
          />
        )
        : (
          <p className="text-sm text-gray-600">
            {t("routes.submitAlt.detail.overviewPlaceholder")}
          </p>
        )}
    </section>
  )
}

export default DetailPanelAlt
