import type { CSSProperties, FormEvent } from "react"
import { useState } from "react"

import { cn } from "./cn"
import { ChevronDownIcon, SearchIcon } from "./icons"

type SearchBoxProps = {
  value?: string
  defaultValue?: string
  placeholder?: string
  scope?: string
  scopeOptions?: readonly string[]
  onScopeChange?: (value: string) => void
  maxWidth?: number
  showSearchIcon?: boolean
  showScope?: boolean
  size?: "md" | "lg"
  ariaLabel?: string
  submitLabel?: string
  scopeAriaLabel?: string
  onSubmit?: (query: string, scope?: string) => void
}

const sizeClass = {
  md: {
    input: "py-2.75 text-[15px]",
    scope: "py-2.5 text-[14px]",
    button: "px-6.5 text-[14.5px]",
    icon: 15,
  },
  lg: {
    input: "py-3.25 text-[16px]",
    scope: "py-3 text-[14.5px]",
    button: "px-7.5 text-[15.5px]",
    icon: 17,
  },
} as const

export const SearchBox = ({
  value,
  defaultValue = "",
  placeholder = "キーワード、accession、学名で検索",
  scope = "全データベース",
  scopeOptions,
  onScopeChange,
  maxWidth = 920,
  showSearchIcon = false,
  showScope = true,
  size = "md",
  ariaLabel = "検索キーワード",
  submitLabel = "検索",
  scopeAriaLabel = "検索対象データベース",
  onSubmit,
}: SearchBoxProps) => {
  const [query, setQuery] = useState(value ?? defaultValue)
  const [scopeValue, setScopeValue] = useState(scope)
  const cls = sizeClass[size]
  const style: CSSProperties = { maxWidth }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onSubmit?.(query, showScope ? scopeValue : undefined)
  }

  const handleScopeChange = (next: string): void => {
    setScopeValue(next)
    onScopeChange?.(next)
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      style={style}
      className="bg-surface border border-border-strong rounded-card flex items-stretch overflow-hidden shadow-card"
    >
      {showScope && (
        <label
          className={cn(
            "flex items-center gap-2 px-4 text-ink font-bold border-r border-border-soft cursor-pointer min-w-[200px]",
            cls.scope,
          )}
        >
          <span className="sr-only">{scopeAriaLabel}</span>
          {scopeOptions === undefined
            ? <span>{scopeValue}</span>
            : (
              <select
                value={scopeValue}
                onChange={(e) => handleScopeChange(e.target.value)}
                aria-label={scopeAriaLabel}
                className="flex-1 appearance-none bg-transparent cursor-pointer text-ink font-bold"
              >
                {scopeOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
          <ChevronDownIcon size={14} className="ml-auto text-ink-mid" />
        </label>
      )}
      <div className="flex-1 flex items-center px-4 gap-2.5">
        {showSearchIcon && (
          <SearchIcon size={cls.icon} className="text-ink-soft" />
        )}
        <input
          type="search"
          value={value === undefined ? query : value}
          defaultValue={value === undefined ? undefined : undefined}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            "flex-1 border-0 bg-transparent text-ink font-sans",
            cls.input,
          )}
        />
      </div>
      <button
        type="submit"
        className={cn(
          "bg-brand text-white border-0 font-bold cursor-pointer",
          cls.button,
        )}
      >
        {submitLabel}
      </button>
    </form>
  )
}
