import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button, Heading } from "@/components/ui"
import { hasDetailComponent } from "@/content/submit"
import type { Lang } from "@/i18n"
import { parentCardIdOf, resolveDetailMode } from "@/lib/submit/node-selectors"
import type { LeafNodeId, TreeNodeId } from "@/types/submit"

import DetailLeafDispatcher from "./DetailLeafDispatcher"
import DetailOverview from "./DetailOverview"
import DetailPlaceholder from "./DetailPlaceholder"

interface DetailPanelProps {
  selectedNodeId: TreeNodeId
  lang: Lang
  onNavigate: (nodeId: TreeNodeId) => void
}

// 選択中の node に応じて概要レベル / 具体レベル / 準備中 を切り替える。
// node 変更時は見出し位置に smooth scroll する。
const DetailPanel = ({ selectedNodeId, lang, onNavigate }: DetailPanelProps) => {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const didMountRef = useRef(false)

  useEffect(() => {
    // 初回マウント時は scroll しない（URL 直打ち / リロードでページ先頭から見せる）。
    // ユーザーが card / node を切り替えた時のみ Detail Panel 見出しに smooth scroll。
    if (!didMountRef.current) {
      didMountRef.current = true

      return
    }
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedNodeId])

  const parentCard = parentCardIdOf(selectedNodeId)
  if (parentCard === null) return null

  const mode = resolveDetailMode(selectedNodeId)
  const leafId: LeafNodeId | undefined = mode === "leaf" ? (selectedNodeId as LeafNodeId) : undefined
  const hasLeafContent = leafId !== undefined && hasDetailComponent(leafId)
  const backToOverview = (): void => onNavigate(parentCard)

  return (
    <section className="space-y-6" aria-labelledby="detail-panel-heading">
      <Heading level={2} id="detail-panel-heading" ref={headingRef} className="scroll-mt-24">
        {t("routes.submit.sections.detail")}
      </Heading>

      {mode === "overview" && (
        <DetailOverview cardId={parentCard} onBranchClick={(leaf) => onNavigate(leaf)} />
      )}

      {mode === "leaf" && leafId !== undefined && hasLeafContent && (
        <div className="space-y-6">
          <DetailLeafDispatcher leafId={leafId} lang={lang} />
          <div className="border-t border-gray-200 pt-4">
            <Button variant="tertiary" onClick={backToOverview}>
              {t("routes.submit.detail.backToOverview")}
            </Button>
          </div>
        </div>
      )}

      {mode === "leaf" && !hasLeafContent && (
        <DetailPlaceholder onBackToOverview={backToOverview} />
      )}
    </section>
  )
}

export default DetailPanel
