import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, test, vi } from "vitest"

import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "~/ui"

type HarnessProps = { onClose?: () => void }

const Harness = ({ onClose }: HarnessProps) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Button onClick={() => setOpen(true)}>open</Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
        ariaLabelledby="modal-title"
      >
        <ModalHeader
          title="dialog"
          titleId="modal-title"
          onClose={() => {
            setOpen(false)
            onClose?.()
          }}
        />
        <ModalBody>
          <input aria-label="first" />
          <input aria-label="last" />
        </ModalBody>
        <ModalFooter
          actions={<Button onClick={() => setOpen(false)}>close-action</Button>}
        />
      </Modal>
    </div>
  )
}

describe("Modal", () => {
  test("Modal_open_setsDialogRoleAndAria", () => {
    render(<Harness />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "open" }))
    })
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title")
  })

  test("Modal_closed_doesNotRender", () => {
    render(<Harness />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  test("Modal_escapeKey_closes", () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "open" }))
    })
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" })
    })
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  test("Modal_tabAtLast_wrapsToFirstFocusable", () => {
    render(<Harness />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "open" }))
    })
    const last = screen.getByRole("button", { name: "close-action" })
    last.focus()
    act(() => {
      fireEvent.keyDown(document, { key: "Tab" })
    })
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "閉じる" }))
  })

  test("Modal_shiftTabAtFirst_wrapsToLastFocusable", () => {
    render(<Harness />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "open" }))
    })
    const closeBtn = screen.getByRole("button", { name: "閉じる" })
    closeBtn.focus()
    act(() => {
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    })
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "close-action" }))
  })

  test("Modal_close_restoresFocusToTrigger", () => {
    render(<Harness />)
    const opener = screen.getByRole("button", { name: "open" })
    opener.focus()
    act(() => {
      fireEvent.click(opener)
    })
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" })
    })
    expect(document.activeElement).toBe(opener)
  })
})
