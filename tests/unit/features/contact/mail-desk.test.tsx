import { act, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { HELPDESK_EMAIL, MailDesk } from "~/features/contact"
import { createI18nInstance, type Lang, LangProvider } from "~/lib/i18n"

const renderWithLang = (lang: Lang, ui: ReactNode) =>
  render(
    <LangProvider value={lang}>
      <I18nextProvider i18n={createI18nInstance(lang)}>{ui}</I18nextProvider>
    </LangProvider>,
  )

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")

// userEvent.setup() は navigator.clipboard を自前 stub で置き換えるため、 コピーの
// 成否を制御したいここでは fireEvent を使う。
const stubClipboard = (writeText: unknown): void => {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText === undefined ? undefined : { writeText },
    configurable: true,
    writable: true,
  })
}

// ラベルが押下で入れ替わるため、 取得はラベルに依存させない。
const copyButton = (): HTMLElement => screen.getByRole("button")

const clickCopy = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(copyButton())
  })
}

afterEach(() => {
  if (originalClipboard === undefined) {
    Reflect.deleteProperty(navigator, "clipboard")
  } else {
    Object.defineProperty(navigator, "clipboard", originalClipboard)
  }
  vi.useRealTimers()
})

describe("MailDesk", () => {
  test("MailDesk_showsAddressAsSelectableText", () => {
    renderWithLang("ja", <MailDesk />)
    expect(screen.getByText(HELPDESK_EMAIL)).toBeInTheDocument()
  })

  // mailto は環境によって開けない。 アドレスの平文表示とコピーだけを窓口の手段にする。
  test("MailDesk_offersNoMailtoLink", () => {
    const { container } = renderWithLang("ja", <MailDesk />)
    expect(container.querySelector("a")).toBeNull()
  })

  test("MailDesk_statesTheReplyExpectation", () => {
    renderWithLang("ja", <MailDesk />)
    expect(screen.getByText(/迷惑メールフォルダをご確認ください/)).toBeInTheDocument()
  })

  test("MailDesk_en_rendersEnLabels", () => {
    renderWithLang("en", <MailDesk />)
    expect(screen.getByRole("button")).toHaveAccessibleName("Copy address")
    expect(screen.getByText("To")).toBeInTheDocument()
  })
})

describe("MailDesk copy", () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
  })

  test("MailDesk_copyClick_writesAddressToClipboard", async () => {
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    expect(writeText).toHaveBeenCalledExactlyOnceWith(HELPDESK_EMAIL)
  })

  test("MailDesk_copyClick_swapsLabelToCopiedFeedback", async () => {
    renderWithLang("ja", <MailDesk />)
    expect(copyButton()).toHaveAccessibleName("アドレスをコピー")
    await clickCopy()
    expect(copyButton()).toHaveAccessibleName("コピーしました")
  })

  // ボタンはアイコンだけなので、 押下前後の見分けは glyph の入れ替わりで付く。
  test("MailDesk_copyClick_swapsCopyGlyphForCheckGlyph", async () => {
    renderWithLang("ja", <MailDesk />)
    expect(copyButton().querySelector("rect")).not.toBeNull()
    expect(copyButton().querySelector("polyline")).toBeNull()
    await clickCopy()
    expect(copyButton().querySelector("polyline")).not.toBeNull()
    expect(copyButton().querySelector("rect")).toBeNull()
  })

  test("MailDesk_copyClick_announcesFeedbackViaStatusRole", async () => {
    renderWithLang("ja", <MailDesk />)
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    await clickCopy()
    expect(screen.getByRole("status")).toHaveTextContent("コピーしました")
  })

  test("MailDesk_copyFeedback_revertsAfterTimeout", async () => {
    vi.useFakeTimers()
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    expect(copyButton()).toHaveAccessibleName("コピーしました")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(copyButton()).toHaveAccessibleName("アドレスをコピー")
  })

  test("MailDesk_copyFeedback_survivesUpToTheResetDelay", async () => {
    vi.useFakeTimers()
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1499)
    })
    expect(copyButton()).toHaveAccessibleName("コピーしました")
  })

  test("MailDesk_secondCopyClick_restartsTheFeedbackWindow", async () => {
    vi.useFakeTimers()
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400)
    })
    await clickCopy()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400)
    })
    expect(copyButton()).toHaveAccessibleName("コピーしました")
    expect(writeText).toHaveBeenCalledTimes(2)
  })

  test("MailDesk_unmountDuringFeedback_leavesNoPendingTimer", async () => {
    vi.useFakeTimers()
    const { unmount } = renderWithLang("ja", <MailDesk />)
    await clickCopy()
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("MailDesk copy failures", () => {
  test("MailDesk_clipboardRejects_keepsCopyLabelAndDoesNotThrow", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"))
    stubClipboard(writeText)
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    expect(writeText).toHaveBeenCalledOnce()
    expect(copyButton()).toHaveAccessibleName("アドレスをコピー")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  // 非セキュアコンテキストでは navigator.clipboard 自体が存在しない。
  test("MailDesk_clipboardUnavailable_keepsCopyLabelAndDoesNotThrow", async () => {
    stubClipboard(undefined)
    renderWithLang("ja", <MailDesk />)
    await clickCopy()
    expect(copyButton()).toHaveAccessibleName("アドレスをコピー")
  })

  test("MailDesk_clipboardUnavailable_stillShowsAddressForManualSelection", () => {
    stubClipboard(undefined)
    renderWithLang("ja", <MailDesk />)
    expect(screen.getByText(HELPDESK_EMAIL)).toBeInTheDocument()
  })
})
