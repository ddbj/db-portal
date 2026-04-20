import { TREE_NODES } from "@/lib/mock-data"
import type { TreeNodeId } from "@/types/submit"

export const ALL_NODE_IDS: ReadonlySet<TreeNodeId> = new Set(
  TREE_NODES.map((n) => n.id),
)

export const isValidNodeId = (v: string): v is TreeNodeId =>
  ALL_NODE_IDS.has(v as TreeNodeId)

// URL `?for=<node-id>` の値を検証し、無効値は null にフォールバック。
export const parseForParam = (
  searchParams: URLSearchParams,
): TreeNodeId | null => {
  const raw = searchParams.get("for")
  if (raw === null) return null

  return isValidNodeId(raw) ? raw : null
}

// URL なし / 無効値時の既定表示。docs/submit.md L366「初期状態は 1 枚目（微生物ゲノム）の概要レベル」。
export const DEFAULT_SUBMIT_NODE_ID: TreeNodeId = "microbial"
