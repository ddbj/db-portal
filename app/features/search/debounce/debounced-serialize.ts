import { useMutation } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import type { ParseNode } from "~/lib/api"

import { astEquals } from "../ast/equals"
import { isIdentityAst } from "../ast/identity"
import type { SyncStatus } from "../types"
import { serializeAstToDsl } from "../url/to-url"
import { useDebouncedValue } from "./use-debounced-value"

export const DEBOUNCE_MS = 700

export type DebouncedSerializeResult = {
  status: SyncStatus
  dsl: string
  retry: () => void
}

export const useDebouncedSerialize = (
  ast: ParseNode,
  onSerialized?: (dsl: string) => void,
): DebouncedSerializeResult => {
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [dsl, setDsl] = useState<string>("")
  const lastSyncedRef = useRef<ParseNode>(ast)
  const onSerializedRef = useRef(onSerialized)
  useEffect(() => {
    onSerializedRef.current = onSerialized
  }, [onSerialized])

  const debounced = useDebouncedValue(ast, DEBOUNCE_MS)

  const mutation = useMutation({
    mutationFn: (target: ParseNode) => serializeAstToDsl(target),
    onSuccess: (nextDsl, target) => {
      lastSyncedRef.current = target
      setDsl(nextDsl)
      setStatus("synced")
      onSerializedRef.current?.(nextDsl)
    },
    onError: () => {
      setStatus("failed")
    },
  })

  const mutateRef = useRef(mutation.mutate)
  useEffect(() => {
    mutateRef.current = mutation.mutate
  }, [mutation.mutate])

  useEffect(() => {
    if (isIdentityAst(debounced)) {
      lastSyncedRef.current = debounced
      setDsl("")
      setStatus("idle")

      return
    }
    if (astEquals(lastSyncedRef.current, debounced)) return
    setStatus("syncing")
    mutateRef.current(debounced)
  }, [debounced])

  const retry = useCallback(() => {
    if (isIdentityAst(debounced)) return
    setStatus("syncing")
    mutateRef.current(debounced)
  }, [debounced])

  return { status, dsl, retry }
}
