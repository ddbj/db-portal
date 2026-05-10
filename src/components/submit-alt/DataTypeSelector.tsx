import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  DATA_TYPES,
  HORIZONTAL_ATTRIBUTES,
} from "@/lib/mock-data/submit-alt-tree"
import type { DataTypeId, HorizontalAttributeId } from "@/types/submit-alt"

interface DataTypeSelectorProps {
  selectedTypes: ReadonlySet<DataTypeId>
  human: boolean
  onTypeToggle: (id: DataTypeId) => void
  onHumanToggle: (id: HorizontalAttributeId, next: boolean) => void
}

const DataTypeSelector = ({
  selectedTypes,
  human,
  onTypeToggle,
  onHumanToggle,
}: DataTypeSelectorProps) => {
  const { t } = useDynamicTranslation()

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <ul
        role="group"
        aria-label={t("routes.submitAlt.dataTypes.groupAriaLabel")}
        className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {DATA_TYPES.map((dt) => {
          const checked = selectedTypes.has(dt.id)

          return (
            <li key={dt.id} className="list-none">
              <label
                className={cn(
                  "flex h-full cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                  checked
                    ? "border-primary-500 bg-primary-50/60"
                    : "border-gray-200 hover:border-primary-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTypeToggle(dt.id)}
                  className="text-primary-600 focus:ring-primary-200 mt-0.5 rounded border-gray-300"
                />
                <span className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      checked ? "text-primary-800" : "text-gray-800",
                    )}
                  >
                    {t(dt.labelKey)}
                  </span>
                  <span className="text-xs leading-snug text-gray-500">
                    {t(dt.descriptionKey)}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          {t("routes.submitAlt.horizontalAttributes.heading")}
        </p>
        <div className="flex flex-wrap gap-3">
          {HORIZONTAL_ATTRIBUTES.map((attr) => {
            const checked = attr.id === "human" ? human : false

            return (
              <label
                key={attr.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  checked
                    ? "border-primary-500 bg-primary-50 text-primary-800"
                    : "border-gray-200 text-gray-700 hover:border-primary-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onHumanToggle(attr.id, e.target.checked)}
                  className="text-primary-600 focus:ring-primary-200 rounded border-gray-300"
                />
                <span className="font-medium">{t(attr.labelKey)}</span>
                <span className="text-gray-500">— {t(attr.descriptionKey)}</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DataTypeSelector
