import type {
  Edge,
  Node,
  NodeMouseHandler,
  NodeTypes,
  ReactFlowInstance,
} from "@xyflow/react"
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import { useCallback, useMemo } from "react"

import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  LEAF_LABEL_KEY_ALT,
  TREE_EDGES_ALT,
  TREE_NODES_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import {
  highlightedPathSetAlt,
  resolveNodeHighlight,
} from "@/lib/submit-alt/node-selectors"
import { getLayoutedTreeAlt } from "@/lib/submit-alt/tree-layout"
import type {
  LeafNodeIdAlt,
  TreeNodeAlt,
  TreeNodeIdAlt,
} from "@/types/submit-alt"

import LeafNodeAlt from "./nodes/LeafNodeAlt"
import QuestionNodeAlt from "./nodes/QuestionNodeAlt"

const nodeTypes: NodeTypes = {
  question: QuestionNodeAlt,
  leaf: LeafNodeAlt,
}

interface DecisionTreeAltProps {
  selectedNodeId: TreeNodeIdAlt | null
  candidateLeaves: readonly LeafNodeIdAlt[]
  isQAStarted: boolean
  onNodeClick: (nodeId: TreeNodeIdAlt) => void
  className?: string
}

const DecisionTreeAltInner = ({
  selectedNodeId,
  candidateLeaves,
  isQAStarted,
  onNodeClick,
}: DecisionTreeAltProps) => {
  const { t } = useDynamicTranslation()

  const layouted = useMemo(
    () => getLayoutedTreeAlt(TREE_NODES_ALT, TREE_EDGES_ALT),
    [],
  )

  const pathSet = useMemo(
    () => highlightedPathSetAlt(selectedNodeId),
    [selectedNodeId],
  )

  const candidateSet = useMemo(
    () => new Set(candidateLeaves),
    [candidateLeaves],
  )

  const decoratedNodes: Node[] = useMemo(
    () => layouted.nodes.map((n) => {
      const raw = n.data as unknown as TreeNodeAlt
      const isSelected = selectedNodeId !== null && n.id === selectedNodeId
      const highlight = resolveNodeHighlight(
        n.id as TreeNodeIdAlt,
        candidateSet,
        isQAStarted,
      )

      if (raw.type === "leaf") {
        const labelKey = LEAF_LABEL_KEY_ALT[raw.id as LeafNodeIdAlt]

        return {
          ...n,
          data: {
            label: t(labelKey, { defaultValue: raw.id }),
            legacyId: raw.legacyId,
            goal: raw.goal,
            venue: raw.venue,
            highlight,
            isSelected,
          },
        }
      }

      return {
        ...n,
        data: {
          label: t(raw.questionKey, { defaultValue: raw.id }),
          isRoot: raw.isRoot,
          highlight,
          isSelected,
        },
      }
    }),
    [layouted.nodes, selectedNodeId, candidateSet, isQAStarted, t],
  )

  const decoratedEdges: Edge[] = useMemo(
    () => layouted.edges.map((e) => {
      const onPath = pathSet.has(e.source as TreeNodeIdAlt)
        && pathSet.has(e.target as TreeNodeIdAlt)

      return {
        ...e,
        style: onPath
          ? { stroke: "#6f4392", strokeWidth: 2 }
          : { stroke: "#d1d5db", strokeWidth: 1 },
      }
    }),
    [layouted.edges, pathSet],
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeClick(node.id as TreeNodeIdAlt)
    },
    [onNodeClick],
  )

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    instance.fitView({ padding: 0.15, duration: 0 })
  }, [])

  return (
    <ReactFlow
      nodes={decoratedNodes}
      edges={decoratedEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onInit={handleInit}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      panOnDrag
      fitView
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
      maxZoom={1.5}
    >
      <Background gap={24} color="#f3f4f6" />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

const DecisionTreeAlt = ({ className, ...props }: DecisionTreeAltProps) => (
  <div
    className={
      className ?? "h-[760px] w-full rounded-lg border border-gray-200 bg-white"
    }
  >
    <ReactFlowProvider>
      <DecisionTreeAltInner {...props} />
    </ReactFlowProvider>
  </div>
)

export default DecisionTreeAlt
