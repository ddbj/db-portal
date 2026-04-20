import { DETAIL_LEAF_COMPONENTS } from "@/content/submit"
import type { Lang } from "@/i18n"
import type { LeafNodeId } from "@/types/submit"

interface DetailLeafDispatcherProps {
  leafId: LeafNodeId
  lang: Lang
}

// leafId × lang から対応する TSX コンポーネントを解決。未定義なら null。
// 未定義時は親 DetailPanel が DetailPlaceholder に切り替える。
const DetailLeafDispatcher = ({ leafId, lang }: DetailLeafDispatcherProps) => {
  const componentMap = DETAIL_LEAF_COMPONENTS[leafId]
  if (componentMap === undefined) return null
  const Component = componentMap[lang]

  return <Component />
}

export default DetailLeafDispatcher
