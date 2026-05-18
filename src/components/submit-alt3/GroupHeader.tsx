import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { FileGroup } from "@/types/submit-alt3"

interface Props {
  group: FileGroup
  memberCount: number
}

// Group ヘッダ行 (1 行 = colspan=6)
// SSOT: docs/submit-alt3.md §4 / §5.2 (Group 構造の表現)
const GroupHeader = ({ group, memberCount }: Props) => {
  const { t } = useDynamicTranslation()

  if (group.groupType === "single") return null

  const label = t(`routes.submitAlt3.groupHeader.${group.groupType}`, {
    defaultValue: group.groupType,
  })

  return (
    <tr className="bg-gray-50">
      <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-gray-600">
        ↳ Group: {label}
        <span className="ml-2 text-gray-400">({memberCount})</span>
      </td>
    </tr>
  )
}

export default GroupHeader
