import { useEffect, useState } from "react"
import { useNavigation } from "react-router"

export type SearchPending = {
  pending: boolean
  // Mark a search as started (button press), before the async parse / serialize.
  begin: () => void
  // Mark it ended without navigating (parse / serialize error).
  end: () => void
}

// Drives the search button's busy state. `begin()` flips it on the moment the
// user submits; it clears automatically when the navigation the search kicked
// off settles back to idle (covering parse → serialize → navigate → loader).
// Error paths that never navigate call `end()` themselves. Facet-sync
// navigations never call `begin()`, so they don't flip the button.
export const useSearchPending = (): SearchPending => {
  const navigation = useNavigation()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (navigation.state === "idle") setPending(false)
  }, [navigation.state])

  return {
    pending,
    begin: () => setPending(true),
    end: () => setPending(false),
  }
}
