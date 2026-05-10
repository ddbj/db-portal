import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import Breadcrumb from "@/components/submit-alt/Breadcrumb"
import DataTypeSelector from "@/components/submit-alt/DataTypeSelector"
import DecisionTreeAlt from "@/components/submit-alt/DecisionTreeAlt"
import DetailPanelAlt from "@/components/submit-alt/DetailPanelAlt"
import MultiSelectGuidance from "@/components/submit-alt/MultiSelectGuidance"
import UseCaseCardGridAlt from "@/components/submit-alt/UseCaseCardGridAlt"
import { Heading } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import { resolveMultiSelectPattern } from "@/lib/submit-alt/multi-select-patterns"
import { resolveActiveCardAlt } from "@/lib/submit-alt/node-selectors"
import {
  parseForParam,
  parseHumanParam,
  parseTypesParam,
  serializeTypes,
} from "@/lib/submit-alt/url"
import type {
  DataTypeId,
  HorizontalAttributeId,
  TreeNodeIdAlt,
  UseCaseCardAlt,
} from "@/types/submit-alt"

import type { Route } from "./+types/submit-alt"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  return {
    lang,
    metaTitle: resource.routes.submitAlt.meta.title,
    metaDescription: resource.routes.submitAlt.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "登録ナビゲーション v2 | DB ポータル (仮)" },
  { name: "description", content: data?.metaDescription ?? "" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/submit-alt` },
]

const SubmitAlt = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedTypes = parseTypesParam(searchParams)
  const human = parseHumanParam(searchParams)
  const selectedNodeId = parseForParam(searchParams)
  const activeCardId = resolveActiveCardAlt(selectedNodeId)
  const pattern = resolveMultiSelectPattern(selectedTypes, human)

  const handleTypeToggle = (id: DataTypeId): void => {
    const next = new URLSearchParams(searchParams)
    const newSet = new Set(selectedTypes)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    const serialized = serializeTypes(newSet)
    if (serialized === null) next.delete("types")
    else next.set("types", serialized)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleHumanToggle = (
    _id: HorizontalAttributeId,
    value: boolean,
  ): void => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set("human", "1")
    else next.delete("human")
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleCardSelect = (card: UseCaseCardAlt): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", card.treeNodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  const handleNodeSelect = (nodeId: TreeNodeIdAlt): void => {
    const next = new URLSearchParams(searchParams)
    next.set("for", nodeId)
    setSearchParams(next, { preventScrollReset: true })
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-6 py-12">
      <header className="text-center">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.submitAlt.hero.title")}
        </Heading>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t("routes.submitAlt.hero.subtitle")}
        </p>
      </header>

      <section
        aria-labelledby="submit-alt-data-types-heading"
        className="space-y-4"
      >
        <Heading level={2} id="submit-alt-data-types-heading">
          {t("routes.submitAlt.sections.dataTypes")}
        </Heading>
        <DataTypeSelector
          selectedTypes={selectedTypes}
          human={human}
          onTypeToggle={handleTypeToggle}
          onHumanToggle={handleHumanToggle}
        />
        <MultiSelectGuidance pattern={pattern} />
      </section>

      <section
        aria-labelledby="submit-alt-cards-heading"
        className="space-y-4"
      >
        <Heading level={2} id="submit-alt-cards-heading">
          {t("routes.submitAlt.sections.cards")}
        </Heading>
        <UseCaseCardGridAlt
          selectedTypes={selectedTypes}
          activeCardId={activeCardId}
          onSelect={handleCardSelect}
        />
      </section>

      <section
        aria-labelledby="submit-alt-tree-heading"
        className="space-y-4"
      >
        <Heading level={2} id="submit-alt-tree-heading">
          {t("routes.submitAlt.sections.tree")}
        </Heading>
        <DecisionTreeAlt
          selectedNodeId={selectedNodeId}
          selectedTypes={selectedTypes}
          human={human}
          onNodeClick={handleNodeSelect}
        />
      </section>

      <div className="space-y-4">
        <Breadcrumb
          selectedTypes={selectedTypes}
          selectedNodeId={selectedNodeId}
          onTypeRemove={handleTypeToggle}
          onNodeNavigate={handleNodeSelect}
        />
        <DetailPanelAlt selectedNodeId={selectedNodeId} />
      </div>
    </div>
  )
}

export default SubmitAlt
