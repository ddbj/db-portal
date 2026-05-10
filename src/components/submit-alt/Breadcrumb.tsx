import { ChevronRight } from "lucide-react"

import { Chip } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  DATA_TYPES,
  LEAF_LABEL_KEY_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import {
  NODE_BY_ID_ALT,
  pathFromRootAlt,
} from "@/lib/submit-alt/node-selectors"
import type {
  DataTypeId,
  LeafNodeIdAlt,
  TreeNodeIdAlt,
} from "@/types/submit-alt"

interface BreadcrumbProps {
  selectedTypes: ReadonlySet<DataTypeId>
  selectedNodeId: TreeNodeIdAlt | null
  onTypeRemove: (id: DataTypeId) => void
  onNodeNavigate: (nodeId: TreeNodeIdAlt) => void
}

// types= の chip と tree 経路を併記する。
// docs/submit-alt.md L304-312 参照。
const Breadcrumb = ({
  selectedTypes,
  selectedNodeId,
  onTypeRemove,
  onNodeNavigate,
}: BreadcrumbProps) => {
  const { t } = useDynamicTranslation()
  const path = selectedNodeId !== null ? pathFromRootAlt(selectedNodeId) : []
  const orderedTypes = DATA_TYPES.filter((dt) => selectedTypes.has(dt.id))

  if (orderedTypes.length === 0 && path.length === 0) return null

  const resolveNodeLabel = (nodeId: TreeNodeIdAlt): string => {
    const node = NODE_BY_ID_ALT.get(nodeId)
    if (!node) return nodeId
    if (node.type === "leaf") {
      return t(LEAF_LABEL_KEY_ALT[node.id as LeafNodeIdAlt], {
        defaultValue: nodeId,
      })
    }

    return t(node.questionKey, { defaultValue: nodeId })
  }

  return (
    <nav
      aria-label={t("routes.submitAlt.breadcrumb.aria")}
      className="flex flex-wrap items-center gap-2 text-xs text-gray-600"
    >
      {orderedTypes.map((dt) => (
        <Chip
          key={dt.id}
          variant="removable"
          onRemove={() => onTypeRemove(dt.id)}
        >
          {t(dt.labelKey)}
        </Chip>
      ))}
      {orderedTypes.length > 0 && path.length > 0 && (
        <ChevronRight
          className="h-3 w-3 text-gray-400"
          aria-hidden="true"
        />
      )}
      {path.map((nodeId, idx) => (
        <span key={nodeId} className="inline-flex items-center gap-2">
          {idx > 0 && (
            <ChevronRight
              className="h-3 w-3 text-gray-400"
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            onClick={() => onNodeNavigate(nodeId)}
            className="hover:text-primary-600 underline-offset-2 hover:underline"
          >
            {resolveNodeLabel(nodeId)}
          </button>
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
