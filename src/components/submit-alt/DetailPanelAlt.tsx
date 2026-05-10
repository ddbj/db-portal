import { MousePointerClick } from "lucide-react"
import type { Ref } from "react"

import { EmptyState, Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { LEAF_DETAILS_ALT } from "@/lib/mock-data/submit-alt-tree"
import { resolveDetailModeAlt } from "@/lib/submit-alt/node-selectors"
import type { LeafNodeIdAlt, TreeNodeIdAlt } from "@/types/submit-alt"

import DetailLeafTemplateAlt from "./DetailLeafTemplateAlt"

interface DetailPanelAltProps {
  selectedNodeId: TreeNodeIdAlt | null
  headingRef?: Ref<HTMLHeadingElement>
}

// Phase 4 では leaf 到達時の詳細 (DetailLeafTemplateAlt) を主軸とする。
// 中間 node 到達時は「leaf を選んでください」プロンプトで簡易対応。
const DetailPanelAlt = ({ selectedNodeId, headingRef }: DetailPanelAltProps) => {
  const { t } = useDynamicTranslation()

  if (selectedNodeId === null) {
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
        <EmptyState
          icon={
            <MousePointerClick className="h-12 w-12" aria-hidden="true" />
          }
          title={t("routes.submitAlt.detail.empty.title")}
          description={t("routes.submitAlt.detail.empty.description")}
        />
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
