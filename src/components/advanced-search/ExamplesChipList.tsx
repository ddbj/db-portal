import { useTranslation } from "react-i18next"

import { Chip, Heading } from "@/components/ui"
import type { AdvancedExample } from "@/lib/advanced-search/types"
import { ADVANCED_EXAMPLES } from "@/lib/mock-data"

interface ExamplesChipListProps {
  onApply: (example: AdvancedExample) => void
}

const ExamplesChipList = ({ onApply }: ExamplesChipListProps) => {
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (key: string) => string

  return (
    <section className="flex flex-col gap-2">
      <Heading level={3}>{t("routes.advancedSearch.examples.heading")}</Heading>
      <div className="flex flex-wrap gap-2">
        {ADVANCED_EXAMPLES.map((ex) => (
          <Chip key={ex.id} onClick={() => onApply(ex)}>
            {t(ex.labelKey)}
          </Chip>
        ))}
      </div>
    </section>
  )
}

export default ExamplesChipList
