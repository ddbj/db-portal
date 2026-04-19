import type { TreeNodeId } from "@/types/submit"

// React Flow 互換の edge 表現。Phase 4 で xyflow 描画時に nodes から自動生成 or 手動定義する。
// Phase 2 では空 export で OK。
export interface TreeEdge {
  id: string
  source: TreeNodeId
  target: TreeNodeId
}

export const TREE_EDGES: readonly TreeEdge[] = []
