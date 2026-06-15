import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { SwitchLang } from "~/shell/switch-lang"

import { renderWithStub } from "../_helpers/render"

const renderAt = (lang: "ja" | "en") =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <SwitchLang /> }],
    initialEntries: ["/"],
    lang,
    withQuery: false,
  })

const getForm = (): HTMLFormElement | null =>
  document.querySelector('form[action="/api/set-lang"]')

describe("SwitchLang", () => {
  test("SwitchLang_jaActive_postsEnToSetLang", () => {
    renderAt("ja")
    const form = getForm()
    expect(form).not.toBeNull()
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post")
    const hidden = form?.querySelector('input[name="lang"]') as HTMLInputElement | null
    expect(hidden?.value).toBe("en")
  })

  test("SwitchLang_enActive_postsJaToSetLang", () => {
    renderAt("en")
    const form = getForm()
    expect(form).not.toBeNull()
    const hidden = form?.querySelector('input[name="lang"]') as HTMLInputElement | null
    expect(hidden?.value).toBe("ja")
  })

  test("SwitchLang_submitButton_hasAriaLabel", () => {
    renderAt("ja")
    const btn = screen.getByRole("button", { name: "言語切替" })
    expect(btn).toBeInTheDocument()
    expect(btn.getAttribute("type")).toBe("submit")
  })

  test("SwitchLang_enLang_submitButtonHasEnAriaLabel", () => {
    renderAt("en")
    expect(screen.getByRole("button", { name: "Language switcher" })).toBeInTheDocument()
  })

  test("SwitchLang_jaActive_jaPillIsBoldEnPillIsNotBold", () => {
    renderAt("ja")
    const jaPill = screen.getByText("JA")
    const enPill = screen.getByText("EN")
    expect(jaPill).toHaveClass("font-bold", "text-ink")
    expect(enPill).toHaveClass("font-normal", "text-ink-mid")
    expect(jaPill).not.toHaveClass("font-normal")
    expect(enPill).not.toHaveClass("font-bold")
  })

  test("SwitchLang_enActive_enPillIsBoldJaPillIsNotBold", () => {
    renderAt("en")
    const jaPill = screen.getByText("JA")
    const enPill = screen.getByText("EN")
    expect(enPill).toHaveClass("font-bold", "text-ink")
    expect(jaPill).toHaveClass("font-normal", "text-ink-mid")
  })

  test("SwitchLang_formContainsRedirectToWithCurrentPath", () => {
    renderWithStub({
      routes: [{ path: "/news", Component: () => <SwitchLang /> }],
      initialEntries: ["/news"],
      lang: "ja",
      withQuery: false,
    })
    const form = getForm()
    const input = form?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(input?.value).toBe("/news")
  })

  test("SwitchLang_redirectToPreservesQueryString", () => {
    renderWithStub({
      routes: [{ path: "/search/results", Component: () => <SwitchLang /> }],
      initialEntries: ["/search/results?q=foo"],
      lang: "en",
      withQuery: false,
    })
    const form = getForm()
    const input = form?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null
    expect(input?.value).toBe("/search/results?q=foo")
  })
})
