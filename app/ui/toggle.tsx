import type { ReactNode } from "react"

import { cn } from "./cn"

type ToggleProps = {
  label: ReactNode
  sub?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

export const Toggle = ({ label, sub, checked, disabled, onChange }: ToggleProps) => (
  <label
    className={cn(
      "flex items-center gap-2.5 select-none",
      disabled ? "cursor-not-allowed" : "cursor-pointer",
    )}
  >
    {/*
      Focusable input は sr-only で視覚的には消える。 keyboard focus を視覚化する
      ため input を `peer` にして、 隣接する visible pill に `peer-focus-visible:`
      の ring を流す (WCAG 2.4.7、 Combobox の focus:ring-2 ring-brand-light と
      同じトークン)。
    */}
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="peer sr-only"
    />
    <span
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex shrink-0 h-5 w-9 rounded-full transition-colors",
        disabled && "opacity-25",
        checked ? "bg-brand" : "bg-border-soft",
        "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-light peer-focus-visible:ring-offset-2",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4",
        )}
      />
    </span>
    <span className="flex-1 min-w-0">
      <span className="text-fs-body-sm font-medium text-ink">{label}</span>
      {sub !== undefined && (
        <span className="block text-fs-micro text-ink-mid mt-0.5">{sub}</span>
      )}
    </span>
  </label>
)
