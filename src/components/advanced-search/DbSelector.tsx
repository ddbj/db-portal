import { useTranslation } from "react-i18next"

import { Radio, Select } from "@/components/ui"
import { DATABASES } from "@/lib/mock-data"
import type { DbSelectValue } from "@/lib/search-url"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { DbId } from "@/types/db"

interface DbSelectorProps {
  value: DbSelectValue
  onChange: (next: DbSelectValue) => void
}

const DbSelector = ({ value, onChange }: DbSelectorProps) => {
  const { t } = useTranslation()
  const isCross = value === ALL_DB_VALUE
  const firstDb = DATABASES[0]?.id ?? "bioproject"
  const singleValue: DbId = isCross ? firstDb : (value as DbId)

  const options = DATABASES.map((db) => ({
    value: db.id,
    label: db.displayName,
  }))

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-gray-700">
        {t("routes.advancedSearch.db.heading")}
      </legend>
      <div className="flex flex-col gap-2">
        <Radio
          label={t("routes.advancedSearch.db.all")}
          checked={isCross}
          onChange={() => onChange(ALL_DB_VALUE)}
        />
        <div className="flex items-center gap-3">
          <Radio
            label={t("routes.advancedSearch.db.single")}
            checked={!isCross}
            onChange={() => onChange(singleValue)}
          />
          <Select
            options={options}
            value={singleValue}
            onChange={(e) => onChange(e.target.value as DbId)}
            disabled={isCross}
            selectSize="sm"
            className="max-w-48"
          />
        </div>
      </div>
    </fieldset>
  )
}

export default DbSelector
