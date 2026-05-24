import { useT } from "~/lib/i18n"
import { Chip, Label } from "~/ui"

export type ExamplesChipProps = {
  onPick: (example: string) => void
}

export const ExamplesChip = ({ onPick }: ExamplesChipProps) => {
  const t = useT()
  const raw = t("search.examples.items", { returnObjects: true }) as unknown
  const items: readonly string[] = Array.isArray(raw) ? (raw as string[]) : []

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label>{t("search.examples.label")}</Label>
      {items.map((item) => (
        <Chip key={item} kind="example" as="button" mono onClick={() => onPick(item)}>
          {item}
        </Chip>
      ))}
    </div>
  )
}
