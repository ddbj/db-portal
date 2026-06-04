import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { FileTypeGrid } from "~/features/submit/buttons/file-type-grid"
import type { FileTypeKind } from "~/schemas/submit"

const renderGrid = (opts: {
  enabled: Set<FileTypeKind>
  selected: Set<FileTypeKind>
  onToggle?: (k: FileTypeKind) => void
}): ((k: FileTypeKind) => void) => {
  const onToggle = opts.onToggle ?? vi.fn()
  render(
    <FileTypeGrid
      onToggle={onToggle}
      getLabel={(k) => k}
      getHint={(k) => `${k} hint`}
      isSelected={(k) => opts.selected.has(k)}
      isEnabled={(k) => opts.enabled.has(k)}
      disabledReason="disabled"
      conflictReason="conflict: click to deselect"
    />,
  )

  return onToggle
}

const buttonFor = (kind: string): HTMLElement => screen.getByRole("button", { name: kind })

describe("FileTypeGrid", () => {
  test("FileTypeGrid_selectedButDisabledTile_staysClickableAndTogglesOff", () => {
    // 前段変更で無効化された選択済み種別 (conflict) は disable でも解除できる
    const onToggle = renderGrid({
      enabled: new Set<FileTypeKind>(),
      selected: new Set<FileTypeKind>(["variant"]),
    })
    const tile = buttonFor("variant")

    expect(tile).not.toBeDisabled()
    fireEvent.click(tile)
    expect(onToggle).toHaveBeenCalledWith("variant")
  })

  test("FileTypeGrid_unselectedDisabledTile_isNotClickable", () => {
    // 未選択で disable の種別は「新規選択」をブロックする
    const onToggle = renderGrid({
      enabled: new Set<FileTypeKind>(),
      selected: new Set<FileTypeKind>(),
    })
    const tile = buttonFor("variant")

    expect(tile).toBeDisabled()
    fireEvent.click(tile)
    expect(onToggle).not.toHaveBeenCalled()
  })

  test("FileTypeGrid_enabledTile_togglesRegardlessOfSelection", () => {
    const onToggle = renderGrid({
      enabled: new Set<FileTypeKind>(["sequence-read", "variant"]),
      selected: new Set<FileTypeKind>(["sequence-read"]),
    })

    fireEvent.click(buttonFor("sequence-read")) // selected + enabled → 解除
    fireEvent.click(buttonFor("variant")) // 未選択 + enabled → 追加
    expect(onToggle).toHaveBeenCalledWith("sequence-read")
    expect(onToggle).toHaveBeenCalledWith("variant")
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  test("FileTypeGrid_conflictTile_showsConflictReasonAsTitle", () => {
    renderGrid({
      enabled: new Set<FileTypeKind>(),
      selected: new Set<FileTypeKind>(["variant"]),
    })

    expect(buttonFor("variant")).toHaveAttribute("title", "conflict: click to deselect")
  })
})
