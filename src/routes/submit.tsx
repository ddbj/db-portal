import { useTranslation } from "react-i18next"
import { useLoaderData, useSearchParams } from "react-router"

import DecisionTree from "@/components/submit/DecisionTree"
import DetailPanel from "@/components/submit/DetailPanel"
import UseCaseCardGrid from "@/components/submit/UseCaseCardGrid"
import { Heading } from "@/components/ui"
import en from "@/content/locales/en.json"
import ja from "@/content/locales/ja.json"
import { pickLang } from "@/i18n"
import { USE_CASE_CARDS } from "@/lib/mock-data"
import { resolveActiveCard } from "@/lib/submit/node-selectors"
import { DEFAULT_SUBMIT_NODE_ID, parseForParam } from "@/lib/submit/url"
import type { CardId, TreeNodeId } from "@/types/submit"

import type { Route } from "./+types/submit"

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const forParam = parseForParam(url.searchParams)
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = lang === "ja" ? ja : en

  return {
    initialNodeId: forParam ?? DEFAULT_SUBMIT_NODE_ID,
    lang,
    metaTitle: resource.routes.submit.meta.title,
    metaDescription: resource.routes.submit.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "DDBJ Portal" },
  { name: "description", content: data?.metaDescription ?? "DDBJ Portal" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: "https://portal.ddbj.nig.ac.jp/submit" },
]

const Submit = () => {
  const { t } = useTranslation()
  const data = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  const forParam = searchParams.get("for")
  const selectedNodeId = (forParam ?? data.initialNodeId) as TreeNodeId
  const activeCardId = resolveActiveCard(selectedNodeId)

  const handleSelect = (nodeId: TreeNodeId): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", nodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleCardSelect = (cardId: CardId): void => {
    const card = USE_CASE_CARDS.find((c) => c.id === cardId)
    if (card !== undefined) handleSelect(card.treeNodeId)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-6 py-12">
      <header className="text-center">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.submit.hero.title")}
        </Heading>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t("routes.submit.hero.subtitle")}
        </p>
      </header>

      <section aria-labelledby="submit-cards-heading" className="space-y-4">
        <Heading level={2} id="submit-cards-heading">
          {t("routes.submit.sections.cards")}
        </Heading>
        <UseCaseCardGrid
          activeCardId={activeCardId}
          onSelect={handleCardSelect}
        />
      </section>

      <section aria-labelledby="submit-tree-heading" className="space-y-4">
        <Heading level={2} id="submit-tree-heading">
          {t("routes.submit.sections.tree")}
        </Heading>
        <DecisionTree selectedNodeId={selectedNodeId} onNodeClick={handleSelect} />
      </section>

      <DetailPanel
        selectedNodeId={selectedNodeId}
        lang={data.lang}
        onNavigate={handleSelect}
      />
    </div>
  )
}

export default Submit
