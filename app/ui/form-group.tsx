import type { ReactNode } from "react"

import { Tag } from "./tag"

type FormGroupProps = {
  num: string
  label: ReactNode
  optional?: boolean
  hint?: ReactNode
  children: ReactNode
}

export const FormGroup = ({ num, label, optional = false, hint, children }: FormGroupProps) => (
  <div className="mb-5">
    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
      <span className="font-mono text-fs-micro font-bold text-brand-deep tracking-[0.04em] shrink-0">
        {num}
      </span>
      <span className="text-fs-body font-bold text-ink">{label}</span>
      {optional && <Tag size="sm">任意</Tag>}
      {hint !== undefined && (
        <span className="text-[11.5px] text-ink-mid">{hint}</span>
      )}
    </div>
    <div className="flex flex-col gap-1">{children}</div>
  </div>
)
