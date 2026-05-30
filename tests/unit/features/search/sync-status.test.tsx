import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { SyncStatusChip } from "~/features/search/sync-status"
import { createI18nInstance } from "~/lib/i18n"

const renderChip = (status: "idle" | "syncing" | "synced" | "failed") => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <SyncStatusChip status={status} />
    </I18nextProvider>,
  )
}

describe("SyncStatusChip", () => {
  test("idle_rendersNothing", () => {
    const { container } = renderChip("idle")
    expect(container.firstChild).toBe(null)
  })

  test("synced_rendersNothing", () => {
    const { container } = renderChip("synced")
    expect(container.firstChild).toBe(null)
  })

  test("syncing_showsTag", () => {
    renderChip("syncing")
    expect(screen.getByText("URL 同期中")).toBeInTheDocument()
  })

  test("failed_showsTagWithoutRetry", () => {
    renderChip("failed")
    expect(screen.getByText("URL 同期失敗")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "再試行" })).toBeNull()
  })
})
