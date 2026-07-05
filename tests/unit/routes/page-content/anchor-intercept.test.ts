/**
 * @vitest-environment jsdom
 */
import { describe, expect, test } from "vitest"

import { type AnchorClickInfo, decideAnchorIntercept } from "~/routes/page-content/anchor-intercept"

const baseEvent = (overrides: Partial<AnchorClickInfo> = {}): AnchorClickInfo => ({
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
})

const setupDom = (html: string): HTMLDivElement => {
  const container = document.createElement("div")
  container.innerHTML = html

  return container
}

describe("decideAnchorIntercept", () => {
  test("plainInternalLink_clickedDirectly_intercepts", () => {
    const c = setupDom("<a href=\"/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "intercept", href: "/foo" })
  })

  test("internalLinkWithNestedChild_clickedOnChild_stillIntercepts", () => {
    // `[**bold**](/foo)` のような markdown 出力。
    const c = setupDom("<a href=\"/foo\"><strong>bold</strong></a>")
    const inner = c.querySelector("strong")!

    expect(decideAnchorIntercept(inner, baseEvent())).toEqual({ kind: "intercept", href: "/foo" })
  })

  test("ctrlClickOnInternalLink_passesThroughToBrowser", () => {
    // Ctrl/Cmd+click は「新タブで開く」 のブラウザ既定動作を尊重する。
    const c = setupDom("<a href=\"/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent({ ctrlKey: true })))
      .toEqual({ kind: "passthrough" })
    expect(decideAnchorIntercept(anchor, baseEvent({ metaKey: true })))
      .toEqual({ kind: "passthrough" })
    expect(decideAnchorIntercept(anchor, baseEvent({ shiftKey: true })))
      .toEqual({ kind: "passthrough" })
    expect(decideAnchorIntercept(anchor, baseEvent({ altKey: true })))
      .toEqual({ kind: "passthrough" })
  })

  test("middleClickOrAuxClick_passesThrough", () => {
    const c = setupDom("<a href=\"/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent({ button: 1 })))
      .toEqual({ kind: "passthrough" })
    expect(decideAnchorIntercept(anchor, baseEvent({ button: 2 })))
      .toEqual({ kind: "passthrough" })
  })

  test("targetBlankAnchor_passesThrough", () => {
    const c = setupDom("<a href=\"/foo\" target=\"_blank\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("targetSelfAnchor_stillIntercepts", () => {
    const c = setupDom("<a href=\"/foo\" target=\"_self\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "intercept", href: "/foo" })
  })

  test("defaultPreventedAlready_passesThrough", () => {
    const c = setupDom("<a href=\"/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent({ defaultPrevented: true })))
      .toEqual({ kind: "passthrough" })
  })

  test("externalAbsoluteUrl_passesThrough", () => {
    const c = setupDom("<a href=\"https://example.com/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("protocolRelativeUrl_passesThrough", () => {
    // `//example.com/foo` は別 origin 行きの可能性があるので intercept しない。
    const c = setupDom("<a href=\"//other.example.com/foo\">go</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("hashOrFragmentOnly_passesThrough", () => {
    const c = setupDom("<a href=\"#section\">jump</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("anchorWithoutHref_passesThrough", () => {
    const c = setupDom("<a>no href</a>")
    const anchor = c.querySelector("a")!

    expect(decideAnchorIntercept(anchor, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("nonAnchorTarget_passesThrough", () => {
    const c = setupDom("<div><span>nope</span></div>")
    const span = c.querySelector("span")!

    expect(decideAnchorIntercept(span, baseEvent())).toEqual({ kind: "passthrough" })
  })

  test("nullTarget_passesThrough", () => {
    expect(decideAnchorIntercept(null, baseEvent())).toEqual({ kind: "passthrough" })
  })
})
