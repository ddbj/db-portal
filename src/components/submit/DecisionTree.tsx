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
import { useTranslation } from "react-i18next"

import { TREE_EDGES, TREE_NODES, USE_CASE_CARDS } from "@/lib/mock-data"
import {
  CARD_BY_TREE_NODE_ID,
  highlightedPathSet,
} from "@/lib/submit/node-selectors"
import { getLayoutedTree } from "@/lib/submit/tree-layout"
import type { TreeNode, TreeNodeId } from "@/types/submit"

import LeafNode from "./nodes/LeafNode"
import QuestionNode from "./nodes/QuestionNode"

const nodeTypes: NodeTypes = {
  question: QuestionNode,
  leaf: LeafNode,
}

interface DecisionTreeProps {
  selectedNodeId: TreeNodeId
  onNodeClick: (nodeId: TreeNodeId) => void
  className?: string
}

const DecisionTreeInner = ({ selectedNodeId, onNodeClick }: DecisionTreeProps) => {
  const { t } = useTranslation()

  const layouted = useMemo(
    () => getLayoutedTree(TREE_NODES, TREE_EDGES),
    [],
  )

  const cardTitleByTreeNodeId = useMemo(() => {
    const map = new Map<TreeNodeId, string>()
    for (const c of USE_CASE_CARDS) {
      map.set(c.treeNodeId, c.titleKey)
    }

    return map
  }, [])

  const pathSet = useMemo(
    () => highlightedPathSet(selectedNodeId),
    [selectedNodeId],
  )

  const decoratedNodes: Node[] = useMemo(
    () => layouted.nodes.map((n) => {
      const raw = n.data as unknown as TreeNode
      const isSelected = n.id === selectedNodeId
      const isOnPath = pathSet.has(n.id as TreeNodeId)
      if (raw.type === "leaf") {
        return {
          ...n,
          data: {
            label: t(
              `routes.submit.tree.options.${raw.parentId}.${raw.id}`,
              { defaultValue: raw.id },
            ),
            goal: raw.goal,
            leafNumber: raw.leafNumber,
            isSelected,
            isOnPath,
          },
        }
      }
      const cardTitleKey = cardTitleByTreeNodeId.get(raw.id)
      const isCard = CARD_BY_TREE_NODE_ID.has(raw.id)

      return {
        ...n,
        data: {
          label: t(raw.questionKey, { defaultValue: raw.id }),
          cardLabel: cardTitleKey !== undefined ? t(cardTitleKey, { defaultValue: raw.id }) : null,
          isSelected,
          isOnPath,
          isCard,
        },
      }
    }),
    [layouted.nodes, selectedNodeId, pathSet, cardTitleByTreeNodeId, t],
  )

  const decoratedEdges: Edge[] = useMemo(
    () => layouted.edges.map((e) => {
      const onPath = pathSet.has(e.source as TreeNodeId)
        && pathSet.has(e.target as TreeNodeId)

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
      onNodeClick(node.id as TreeNodeId)
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

const DecisionTree = ({ className, ...props }: DecisionTreeProps) => (
  <div className={className ?? "h-[680px] w-full rounded-lg border border-gray-200 bg-white"}>
    <ReactFlowProvider>
      <DecisionTreeInner {...props} />
    </ReactFlowProvider>
  </div>
)

export default DecisionTree
