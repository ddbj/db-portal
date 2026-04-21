import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useLoaderData, useSearchParams } from "react-router"

import DecisionTree from "@/components/submit/DecisionTree"
import DetailPanel from "@/components/submit/DetailPanel"
import UseCaseCardGrid from "@/components/submit/UseCaseCardGrid"
import { Heading } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { USE_CASE_CARDS } from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import { resolveActiveCard } from "@/lib/submit/node-selectors"
import { parseForParam } from "@/lib/submit/url"
import type { CardId, TreeNodeId } from "@/types/submit"

import type { Route } from "./+types/submit"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  return {
    lang,
    metaTitle: resource.routes.submit.meta.title,
    metaDescription: resource.routes.submit.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "DB ポータル (仮)" },
  { name: "description", content: data?.metaDescription ?? "DB ポータル (仮)" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/submit` },
]

const Submit = () => {
  const { t } = useTranslation()
  const data = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedNodeId = parseForParam(searchParams)
  const activeCardId = resolveActiveCard(selectedNodeId)

  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  // カードクリック時だけ true を立て、次の selectedNodeId 変化 effect で Detail Panel まで scroll。
  // tree node クリックでは立てないので、tree 操作中は視点が動かない。
  const scrollAfterUpdateRef = useRef(false)

  useEffect(() => {
    if (!scrollAfterUpdateRef.current) return
    scrollAfterUpdateRef.current = false
    detailHeadingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [selectedNodeId])

  const handleSelect = (nodeId: TreeNodeId): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", nodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleCardSelect = (cardId: CardId): void => {
    const card = USE_CASE_CARDS.find((c) => c.id === cardId)
    if (card === undefined) return
    scrollAfterUpdateRef.current = true
    handleSelect(card.treeNodeId)
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
        headingRef={detailHeadingRef}
      />
    </div>
  )
}

export default Submit
