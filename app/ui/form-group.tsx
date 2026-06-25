import type { ReactNode } from "react"

import { Tag } from "./tag"

type FormGroupProps = {
  num: string
  label: ReactNode
  optional?: boolean
  hint?: ReactNode
  hintId?: string
  children: ReactNode
}

export const FormGroup = ({
  num,
  label,
  optional = false,
  hint,
  hintId,
  children,
}: FormGroupProps) => (
  <fieldset
    className="border-0 p-0 m-0"
    aria-describedby={hint !== undefined && hintId !== undefined ? hintId : undefined}
  >
    <legend className="flex items-baseline gap-2 mb-2 flex-wrap p-0">
      <span className="font-mono text-fs-micro font-bold text-brand-deep tracking-tag shrink-0">
        {num}
      </span>
      <span className="text-fs-body font-bold text-ink">{label}</span>
      {optional && <Tag size="sm">任意</Tag>}
      {hint !== undefined && (
        <span id={hintId} className="text-fs-micro text-ink-mid">{hint}</span>
      )}
    </legend>
    <div className="flex flex-col gap-1">{children}</div>
  </fieldset>
)
