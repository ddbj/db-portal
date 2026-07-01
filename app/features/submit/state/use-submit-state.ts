import { useCallback, useReducer, useRef } from "react"

import type { FileEntry, FileTypeKind, OrganismDomain } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

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

type SubmitDispatch = {
  setOrganismDomain: (organismDomain: OrganismDomain | null) => void
  setAccessSection: (patch: Partial<AccessSection>) => void
  addRow: (fileTypeKind: FileTypeKind) => void
  editRowCell: (entryId: string, patch: Partial<FileEntry>) => void
  commitRowEdit: (entryId: string, patch: RowEditPatch) => void
  removeRow: (entryId: string) => void
  replaceState: (state: UIState) => void
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

  const setOrganismDomain = useCallback((organismDomain: OrganismDomain | null) => {
    dispatch({ type: "SET_ORGANISM_DOMAIN", organismDomain })
  }, [])

  const setAccessSection = useCallback((accessSection: Partial<AccessSection>) => {
    dispatch({ type: "SET_ACCESS_SECTION", accessSection })
  }, [])

  const addRow = useCallback(
    (fileTypeKind: FileTypeKind) => {
      dispatch({ type: "ADD_ROW", fileTypeKind, entryId: newId(), groupId: newId() })
    },
    [newId],
  )

  const editRowCell = useCallback(
    (entryId: string, patch: Partial<FileEntry>) => {
      dispatch({ type: "EDIT_ROW_CELL", entryId, patch })
    },
    [],
  )

  const commitRowEdit = useCallback((entryId: string, patch: RowEditPatch) => {
    dispatch({ type: "COMMIT_ROW_EDIT", entryId, patch })
  }, [])

  const removeRow = useCallback((entryId: string) => {
    dispatch({ type: "REMOVE_ROW", entryId })
  }, [])

  const replaceState = useCallback((next: UIState) => {
    dispatch({ type: "REPLACE_STATE", state: next })
  }, [])

  const actions: SubmitDispatch = {
    setOrganismDomain,
    setAccessSection,
    addRow,
    editRowCell,
    commitRowEdit,
    removeRow,
    replaceState,
  }

  return { state, actions }
}
