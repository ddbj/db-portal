import { FmtRadio } from "~/ui"

type RadioCardOption = {
  value: string
  label: string
  sub?: string
  disabled?: boolean
  disabledReason?: string
}

type RadioCardGroupProps = {
  ariaLabel: string
  name: string
  value: string | null
  options: readonly RadioCardOption[]
  onChange: (value: string) => void
}

// 前段 (Q1/OrganismDomain) の単一選択。FmtRadio カードを縦に並べた radiogroup として描画し、disable された選択肢は理由を tip で示す
export const RadioCardGroup = ({ ariaLabel, name, value, options, onChange }: RadioCardGroupProps) => (
  <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-2">
    {options.map((opt) => (
      <FmtRadio
        key={opt.value}
        name={name}
        value={opt.value}
        label={opt.label}
        sub={opt.sub}
        checked={opt.value === value}
        disabled={opt.disabled}
        title={opt.disabled ? opt.disabledReason : undefined}
        onChange={() => onChange(opt.value)}
      />
    ))}
  </div>
)
