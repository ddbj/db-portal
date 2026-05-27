import { render, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LangProvider } from "~/lib/i18n/lang-context"
import { useLang } from "~/lib/i18n/use-lang"

describe("LangProvider + useLang", () => {
  test("useLang_insideJaProvider_returnsJa", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LangProvider value="ja">{children}</LangProvider>
    )
    const { result } = renderHook(() => useLang(), { wrapper })
    expect(result.current).toBe("ja")
  })

  test("useLang_insideEnProvider_returnsEn", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LangProvider value="en">{children}</LangProvider>
    )
    const { result } = renderHook(() => useLang(), { wrapper })
    expect(result.current).toBe("en")
  })

  describe("useLang without provider", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {
        /* swallow expected error log from React */
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test("useLang_noProvider_throws", () => {
      const Probe = () => {
        useLang()
        return null
      }
      expect(() => render(<Probe />)).toThrow(/LangProvider/)
    })
  })
})
