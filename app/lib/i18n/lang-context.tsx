import { createContext, type ReactNode } from "react"

import type { Lang } from "./use-lang"

export const LangContext = createContext<Lang | null>(null)

export const LangProvider = ({ value, children }: { value: Lang; children: ReactNode }) => (
  <LangContext.Provider value={value}>{children}</LangContext.Provider>
)
