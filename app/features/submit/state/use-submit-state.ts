import { useCallback, useReducer, useRef } from "react"

import type { ButtonType, FileEntry } from "~/schemas/submit"

import { initialState, submitReducer } from "./reducer"
import type { RowEditPatch, UIState } from "./types"

const buildIdGenerator = () => {
  let counter = 0
  return () => {
    counter += 1
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
    return `local-${counter.toString(36)}-${Date.now().toString(36)}`
  }
}

export type SubmitDispatch = {
  addRow: (buttonType: ButtonType) => void
  addToGroup: (groupId: string, buttonType: ButtonType) => void
  editRowCell: (entryId: string, patch: Partial<FileEntry>) => void
  openEditRow: (entryId: string) => void
  openConfirmDelete: (entryId: string) => void
  commitRowEdit: (entryId: string, patch: RowEditPatch) => void
  removeRow: (entryId: string) => void
  closeModal: () => void
}

export const useSubmitState = (
  startWith: UIState = initialState,
): { state: UIState; actions: SubmitDispatch } => {
  const [state, dispatch] = useReducer(submitReducer, startWith)
  const newIdRef = useRef<(() => string) | undefined>(undefined)
  if (newIdRef.current === undefined) {
    newIdRef.current = buildIdGenerator()
  }
  const newId = newIdRef.current

  const addRow = useCallback(
    (buttonType: ButtonType) => {
      dispatch({ type: "ADD_ROW", buttonType, entryId: newId(), groupId: newId() })
    },
    [newId],
  )

  const addToGroup = useCallback(
    (groupId: string, buttonType: ButtonType) => {
      dispatch({ type: "ADD_TO_GROUP", groupId, buttonType, entryId: newId() })
    },
    [newId],
  )

  const editRowCell = useCallback(
    (entryId: string, patch: Partial<FileEntry>) => {
      dispatch({ type: "EDIT_ROW_CELL", entryId, patch })
    },
    [],
  )

  const openEditRow = useCallback((entryId: string) => {
    dispatch({ type: "OPEN_EDIT_ROW", entryId })
  }, [])

  const openConfirmDelete = useCallback((entryId: string) => {
    dispatch({ type: "OPEN_CONFIRM_DELETE", entryId })
  }, [])

  const commitRowEdit = useCallback((entryId: string, patch: RowEditPatch) => {
    dispatch({ type: "COMMIT_ROW_EDIT", entryId, patch })
  }, [])

  const removeRow = useCallback((entryId: string) => {
    dispatch({ type: "REMOVE_ROW", entryId })
  }, [])

  const closeModal = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" })
  }, [])

  const actions: SubmitDispatch = {
    addRow,
    addToGroup,
    editRowCell,
    openEditRow,
    openConfirmDelete,
    commitRowEdit,
    removeRow,
    closeModal,
  }

  return { state, actions }
}
