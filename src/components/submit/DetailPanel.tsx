import { MousePointerClick } from "lucide-react"
import type { Ref } from "react"
import { useTranslation } from "react-i18next"

import { Button, EmptyState, Heading } from "@/components/ui"
import { hasHandwrittenDetail } from "@/content/submit"
import type { Lang } from "@/i18n"
import { LEAF_DETAILS } from "@/lib/mock-data"
import { parentCardIdOf, resolveDetailMode } from "@/lib/submit/node-selectors"
import type { LeafNodeId, TreeNodeId } from "@/types/submit"

import DetailLeafDispatcher from "./DetailLeafDispatcher"
import DetailLeafTemplate from "./DetailLeafTemplate"
import DetailOverview from "./DetailOverview"
import DetailPlaceholder from "./DetailPlaceholder"

interface DetailPanelProps {
  selectedNodeId: TreeNodeId | null
  lang: Lang
  onNavigate: (nodeId: TreeNodeId) => void
  headingRef?: Ref<HTMLHeadingElement>
}

// 選択中の node に応じて「空状態 / 概要レベル / 具体レベル（手書き or goal テンプレ）/ 準備中」を切り替える。
// scroll は呼び出し側（routes/submit.tsx）がカードクリック時にだけ発火させる。
const DetailPanel = ({
  selectedNodeId,
  lang,
  onNavigate,
  headingRef,
}: DetailPanelProps) => {
  const { t } = useTranslation()

  if (selectedNodeId === null) {
    return (
      <section className="space-y-6" aria-labelledby="detail-panel-heading">
        <Heading
          level={2}
          id="detail-panel-heading"
          ref={headingRef}
          className="scroll-mt-24"
        >
          {t("routes.submit.sections.detail")}
        </Heading>
        <EmptyState
          icon={<MousePointerClick className="h-12 w-12" aria-hidden="true" />}
          title={t("routes.submit.detail.empty.title")}
          description={t("routes.submit.detail.empty.description")}
        />
      </section>
    )
  }

  const parentCard = parentCardIdOf(selectedNodeId)
  if (parentCard === null) return null

  const mode = resolveDetailMode(selectedNodeId)
  const leafId: LeafNodeId | undefined = mode === "leaf" ? (selectedNodeId as LeafNodeId) : undefined
  const hasHandwritten = leafId !== undefined && hasHandwrittenDetail(leafId)
  const hasLeafData = leafId !== undefined && LEAF_DETAILS[leafId] !== undefined
  const backToOverview = (): void => onNavigate(parentCard)

  return (
    <section className="space-y-6" aria-labelledby="detail-panel-heading">
      <Heading level={2} id="detail-panel-heading" ref={headingRef} className="scroll-mt-24">
        {t("routes.submit.sections.detail")}
      </Heading>

      {mode === "overview" && (
        <DetailOverview cardId={parentCard} onBranchClick={(leaf) => onNavigate(leaf)} />
      )}

      {mode === "leaf" && leafId !== undefined && hasHandwritten && (
        <div className="space-y-6">
          <DetailLeafDispatcher leafId={leafId} lang={lang} />
          <div className="border-t border-gray-200 pt-4">
            <Button variant="tertiary" onClick={backToOverview}>
              {t("routes.submit.detail.backToOverview")}
            </Button>
          </div>
        </div>
      )}

      {mode === "leaf" && leafId !== undefined && !hasHandwritten && hasLeafData && (
        <div className="space-y-6">
          <DetailLeafTemplate leafId={leafId} />
          <div className="border-t border-gray-200 pt-4">
            <Button variant="tertiary" onClick={backToOverview}>
              {t("routes.submit.detail.backToOverview")}
            </Button>
          </div>
        </div>
      )}

      {mode === "leaf" && leafId !== undefined && !hasHandwritten && !hasLeafData && (
        <DetailPlaceholder onBackToOverview={backToOverview} />
      )}
    </section>
  )
}

export default DetailPanel
