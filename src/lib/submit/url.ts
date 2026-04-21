import { TREE_NODES } from "@/lib/mock-data"
import type { TreeNodeId } from "@/types/submit"

export const ALL_NODE_IDS: ReadonlySet<TreeNodeId> = new Set(
  TREE_NODES.map((n) => n.id),
)

export const isValidNodeId = (v: string): v is TreeNodeId =>
  ALL_NODE_IDS.has(v as TreeNodeId)

// URL `?for=<node-id>` の値を検証し、無効値は null にフォールバック。
// null は「未選択」を意味し、Detail Panel は空状態プレースホルダを表示する。
export const parseForParam = (
  searchParams: URLSearchParams,
): TreeNodeId | null => {
  const raw = searchParams.get("for")
  if (raw === null) return null

  return isValidNodeId(raw) ? raw : null
}
