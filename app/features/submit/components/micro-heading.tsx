import type { ReactNode } from "react"

type MicroHeadingProps = {
  children: ReactNode
  as?: "p" | "div" | "span" | "h4" | "h5"
}

// submit feature 内で file group / step group の小見出しとして使う、 sans 系
// micro heading。 uppercase / mono を使わない Label とは別 recipe。 fs-label +
// font-bold + text-ink-mid + m-0 を SSOT として持つ。
export const MicroHeading = ({ children, as: As = "p" }: MicroHeadingProps) => (
  <As className="text-fs-label font-bold text-ink-mid m-0">{children}</As>
)
