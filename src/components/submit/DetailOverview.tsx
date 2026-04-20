import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge, Heading, Table } from "@/components/ui"
import { DETAIL_OVERVIEWS } from "@/lib/mock-data"
import type { CardId, LeafNodeId } from "@/types/submit"

interface DetailOverviewProps {
  cardId: CardId
  onBranchClick: (leafId: LeafNodeId) => void
}

// DETAIL_OVERVIEWS（9 枚完成データ）をデータ駆動で描画。
// 概要レベルは中間 node 選択時 / leaf で詳細が準備中の場合の fallback 表示にも使われる。
const DetailOverview = ({ cardId, onBranchClick }: DetailOverviewProps) => {
  const { t: tStrict } = useTranslation()
  // mock-data の *Key は実行時に組み立てたキー（例: `routes.submit.detail.overviews.${cardId}.summary`）を
  // 格納しているため、i18next の strict key 推論と衝突する。キー検証を緩めた t を使う。
  const t = tStrict as unknown as (key: string, options?: { defaultValue?: string }) => string
  const overview = DETAIL_OVERVIEWS[cardId]

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-gray-700">
        {t(overview.summaryKey)}
      </p>

      {overview.hasThreeLayer && (
        <section className="space-y-3">
          <Heading level={3}>{t("routes.submit.detail.threeLayerHeading")}</Heading>
          <p className="text-sm leading-relaxed text-gray-700">
            {t("routes.submit.detail.threeLayerDescription")}
          </p>
          <ol className="mt-2 space-y-1.5 pl-0">
            {[
              "routes.submit.detail.threeLayerLayer1",
              "routes.submit.detail.threeLayerLayer2",
              "routes.submit.detail.threeLayerLayer3",
            ].map((key, i) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-3">
        <Heading level={3}>{t("routes.submit.detail.branchesHeading")}</Heading>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <Table>
            <thead>
              <tr>
                <th>{t("routes.submit.detail.branchesColDataLabel")}</th>
                <th>{t("routes.submit.detail.branchesColLeaf")}</th>
                <th className="w-28">{t("routes.submit.detail.branchesColAction")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.branches.map((b) => (
                <tr key={b.leafId}>
                  <td>{t(b.dataLabelKey)}</td>
                  <td>
                    <Badge variant="primary" size="sm">{b.goalLabel}</Badge>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onBranchClick(b.leafId)}
                      className="text-primary-600 hover:text-primary-800 text-xs font-medium underline-offset-2 hover:underline"
                    >
                      {t("routes.submit.detail.branchLinkLabel")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <Heading level={3}>{t("routes.submit.detail.commonHeading")}</Heading>
        <p className="text-sm leading-relaxed text-gray-700">
          {t(overview.commonRequirementsKey)}
        </p>
      </section>

      <section className="space-y-2">
        <Heading level={3}>{t("routes.submit.detail.linksHeading")}</Heading>
        <ul className="space-y-1.5">
          {overview.primaryLinks.map((link) => (
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
    </div>
  )
}

export default DetailOverview
