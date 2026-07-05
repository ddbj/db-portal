import { useEffect, useId, useRef, useState } from "react"

import { useT } from "~/lib/i18n"
import { HelpIcon, IconButton } from "~/ui"

import { type Predicate, predicateLabelKey } from "../types"

const PREDICATES: readonly Predicate[] = [
  { op: "eq", negated: false },
  { op: "contains", negated: false },
  { op: "wildcard", negated: false },
  { op: "between", negated: false },
]

export const PredicateHelpHint = () => {
  const t = useT()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const tooltipId = useId()
  const open = hovered || pinned

  useEffect(() => {
    if (!pinned) return
    const onPointerDown = (event: MouseEvent | TouchEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setPinned(false)
      }
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setPinned(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [pinned])

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <IconButton
        ariaLabel={t("search.builder.predicateHelpLabel")}
        size={22}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => setPinned((p) => !p)}
      >
        <HelpIcon size={18} />
      </IconButton>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-tooltip left-0 bottom-[calc(100%+6px)] w-max max-w-sm px-3 py-2.5 rounded-button bg-ink text-white text-fs-label leading-snug shadow-card-hover"
        >
          <dl className="m-0 flex flex-col gap-1.5">
            {PREDICATES.map((pred) => {
              const key = predicateLabelKey(pred)
              return (
                <div key={key}>
                  <dt className="font-semibold">
                    {t(`search.builder.predicate.${key}`)}
                  </dt>
                  <dd className="m-0 ml-2 text-white/80">
                    {t(`search.builder.predicateHelp.${key}`)}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </span>
  )
}
