// markdown 出力内 anchor の click delegation。 nested child / modifier key /
// target=_blank / 既に preventDefault されたイベントなどを「browser 既定動作の
// まま」に逃がし、 純粋に同一 origin 内 SPA navigation できるものだけ intercept
// する。 純粋 DOM ロジックなので app/routes/page-content/route.tsx から切り出して
// 単体 test しやすくしてある。

export type AnchorClickInfo = {
  defaultPrevented: boolean
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export type AnchorInterceptDecision =
  | { kind: "intercept"; href: string }
  | { kind: "passthrough" }

export const decideAnchorIntercept = (
  target: EventTarget | null,
  e: AnchorClickInfo,
): AnchorInterceptDecision => {
  const el = target instanceof Element ? target : null
  if (el === null) return { kind: "passthrough" }
  const anchor = el.closest("a")
  if (!(anchor instanceof HTMLAnchorElement)) return { kind: "passthrough" }
  if (e.defaultPrevented) return { kind: "passthrough" }
  if (e.button !== 0) return { kind: "passthrough" }
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return { kind: "passthrough" }
  const linkTarget = anchor.getAttribute("target")
  if (linkTarget !== null && linkTarget !== "" && linkTarget !== "_self") {
    return { kind: "passthrough" }
  }
  const href = anchor.getAttribute("href")
  if (href === null || href === "") return { kind: "passthrough" }
  if (!href.startsWith("/") || href.startsWith("//")) return { kind: "passthrough" }

  return { kind: "intercept", href }
}
