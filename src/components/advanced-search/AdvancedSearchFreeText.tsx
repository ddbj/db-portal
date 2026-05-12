import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Input } from "@/components/ui"

interface AdvancedSearchFreeTextProps {
  value: string
  onChange: (value: string) => void
  onRemove: () => void
}

const AdvancedSearchFreeText = (props: AdvancedSearchFreeTextProps) => {
  const { value, onChange, onRemove } = props
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (key: string) => string

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white p-2 ring-1 ring-gray-200">
      <Badge variant="primary" size="sm">
        {t("routes.advancedSearch.builder.freeTextLabel")}
      </Badge>
      <div className="min-w-0 flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("routes.advancedSearch.builder.freeTextPlaceholder")}
          inputSize="sm"
        />
      </div>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onRemove}
        aria-label={t("routes.advancedSearch.builder.removeAria")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default AdvancedSearchFreeText
