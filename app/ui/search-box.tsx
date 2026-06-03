import type { CSSProperties, FormEvent, ReactNode } from "react"
import { useEffect, useId, useRef, useState } from "react"

import { cn } from "./cn"
import { ChevronDownIcon, SearchIcon } from "./icons"
import { StableLabel } from "./stable-label"

type SearchBoxProps = {
  value?: string | undefined
  defaultValue?: string
  placeholder?: string
  scope?: string
  scopeOptions?: readonly string[]
  disabledScopeOptions?: readonly string[]
  onScopeChange?: (value: string) => void
  onChange?: (value: string) => void
  maxWidth?: number
  showSearchIcon?: boolean
  showScope?: boolean
  size?: "md" | "lg"
  tone?: "default" | "ai"
  invalid?: boolean
  trailing?: ReactNode
  ariaLabel?: string
  submitLabel?: string
  // Every label the submit button can show; the widest reserves its width so a
  // label swap (検索 ↔ 検索中…) leaves the button width unchanged.
  submitReserve?: readonly string[]
  submitDisabled?: boolean
  scopeAriaLabel?: string
  onSubmit?: (query: string, scope?: string) => void
}

const sizeClass = {
  md: {
    input: "py-2 text-fs-body",
    scope: "py-1.5 text-fs-body-sm",
    button: "px-6 text-fs-body",
    icon: 14,
  },
  lg: {
    input: "py-3 text-fs-body",
    scope: "py-3 text-fs-body-sm",
    button: "px-7 text-fs-body",
    icon: 16,
  },
} as const

export const SearchBox = ({
  value,
  defaultValue = "",
  placeholder = "キーワード、accession、学名で検索",
  scope = "全データベース",
  scopeOptions,
  disabledScopeOptions,
  onScopeChange,
  onChange,
  maxWidth = 920,
  showSearchIcon = false,
  showScope = true,
  size = "md",
  tone = "default",
  invalid = false,
  trailing,
  ariaLabel = "検索キーワード",
  submitLabel = "検索",
  submitReserve,
  submitDisabled = false,
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
    if (submitDisabled) return
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
        className={cn(
          "rounded-card flex items-stretch overflow-hidden shadow-card w-full border",
          tone === "ai"
            ? "bg-brand-soft border-brand"
            : invalid
              ? "bg-surface border-warn-border ring-1 ring-warn-border"
              : "bg-surface border-border-strong",
        )}
      >
        {interactiveScope
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
            // When hidden (the top hero's AI mode) the scope keeps its box —
            // invisible and zero-width — so the form's items-stretch height holds
            // and the box doesn't jump between keyword and AI mode.
            <div
              className={cn(
                "flex items-center gap-2 text-ink font-bold",
                cls.scope,
                showScope
                  ? "px-3 border-r border-border-soft min-w-[140px]"
                  : "invisible w-0 overflow-hidden whitespace-nowrap",
              )}
              aria-label={showScope ? scopeAriaLabel : undefined}
              aria-hidden={showScope ? undefined : true}
            >
              <span className="flex-1">{scopeValue}</span>
              <ChevronDownIcon size={14} className="text-ink-mid shrink-0" />
            </div>
          )}
        <div className="flex-1 flex items-center px-4 gap-2.5 min-w-0">
          {showSearchIcon && (
            <SearchIcon size={cls.icon} className="text-ink-soft shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onChange?.(e.target.value)
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex-1 min-w-0 border-0 bg-transparent text-ink font-sans caret-ink leading-tight",
              cls.input,
            )}
          />
        </div>
        {trailing !== undefined && (
          <div className="flex items-center pr-1.5 pl-0.5 shrink-0">{trailing}</div>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          aria-disabled={submitDisabled || undefined}
          className={cn(
            "bg-brand text-white border-0 font-bold leading-none",
            cls.button,
            submitDisabled
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:bg-brand-deep",
          )}
        >
          {submitReserve && submitReserve.length > 0
            ? <StableLabel reserve={submitReserve}>{submitLabel}</StableLabel>
            : submitLabel}
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
            const optionDisabled = disabledScopeOptions?.includes(opt) ?? false
            return (
              <li key={opt} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-disabled={optionDisabled || undefined}
                  disabled={optionDisabled}
                  onClick={() => handleScopeChange(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-fs-body",
                    optionDisabled
                      ? "text-ink-soft opacity-50 cursor-not-allowed"
                      : cn(
                        "hover:bg-surface-subtle cursor-pointer",
                        selected ? "text-brand font-bold" : "text-ink font-medium",
                      ),
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
