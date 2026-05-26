import type { CSSProperties, FormEvent } from "react"
import { useEffect, useId, useRef, useState } from "react"

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
    input: "py-2 text-[14.5px]",
    scope: "py-1.5 text-[13.5px]",
    button: "px-6 text-[14px]",
    icon: 14,
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
  const [scopeOpen, setScopeOpen] = useState(false)

  useEffect(() => {
    if (value !== undefined) setQuery(value)
  }, [value])
  useEffect(() => {
    setScopeValue(scope)
  }, [scope])
  const cls = sizeClass[size]
  const style: CSSProperties = { maxWidth }
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onSubmit?.(query, showScope ? scopeValue : undefined)
  }

  const handleScopeChange = (next: string): void => {
    setScopeValue(next)
    onScopeChange?.(next)
    setScopeOpen(false)
  }

  useEffect(() => {
    if (!scopeOpen) return
    const handler = (e: MouseEvent | TouchEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setScopeOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setScopeOpen(false)
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
      document.removeEventListener("keydown", onKey)
    }
  }, [scopeOpen])

  const interactiveScope = showScope && scopeOptions !== undefined

  return (
    <div ref={wrapperRef} className="relative w-full" style={style}>
      <form
        role="search"
        onSubmit={handleSubmit}
        className="bg-surface border border-border-strong rounded-card flex items-stretch overflow-hidden shadow-card w-full"
      >
        {showScope && (
          interactiveScope
            ? (
              <button
                type="button"
                onClick={() => setScopeOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={scopeOpen}
                aria-controls={listboxId}
                aria-label={scopeAriaLabel}
                className={cn(
                  "flex items-center gap-2 px-3 text-ink font-bold border-r border-border-soft cursor-pointer min-w-[140px] hover:bg-surface-subtle",
                  cls.scope,
                )}
              >
                <span className="flex-1 text-left">{scopeValue}</span>
                <ChevronDownIcon size={14} className="text-ink-mid shrink-0" />
              </button>
            )
            : (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 text-ink font-bold border-r border-border-soft min-w-[140px]",
                  cls.scope,
                )}
                aria-label={scopeAriaLabel}
              >
                <span className="flex-1">{scopeValue}</span>
                <ChevronDownIcon size={14} className="text-ink-mid shrink-0" />
              </div>
            )
        )}
        <div className="flex-1 flex items-center px-4 gap-2.5 min-w-0">
          {showSearchIcon && (
            <SearchIcon size={cls.icon} className="text-ink-soft shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={cn(
              "flex-1 min-w-0 border-0 bg-transparent text-ink font-sans caret-ink leading-tight",
              cls.input,
            )}
          />
        </div>
        <button
          type="submit"
          className={cn(
            "bg-brand text-white border-0 font-bold cursor-pointer hover:bg-brand-deep leading-none",
            cls.button,
          )}
        >
          {submitLabel}
        </button>
      </form>
      {interactiveScope && scopeOpen && scopeOptions !== undefined && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={scopeAriaLabel}
          className="absolute z-20 top-full left-0 mt-1 min-w-[220px] bg-surface border border-border-soft rounded-card shadow-card-hover py-1 max-h-72 overflow-auto"
        >
          {scopeOptions.map((opt) => {
            const selected = opt === scopeValue
            return (
              <li key={opt} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleScopeChange(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-[14px] hover:bg-surface-subtle cursor-pointer",
                    selected ? "text-brand font-bold" : "text-ink font-medium",
                  )}
                >
                  {opt}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
