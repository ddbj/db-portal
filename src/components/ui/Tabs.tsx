import { createContext, type ReactNode, useContext } from "react"

import cn from "./cn"

interface TabsContextValue {
  value: string
  onChange: (next: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabsContext = () => {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error("Tab / TabList / TabPanel must be used within <Tabs>")
  }

  return ctx
}

interface TabsProps {
  value: string
  onChange: (next: string) => void
  children: ReactNode
  className?: string
}

const Tabs = ({ value, onChange, children, className }: TabsProps) => (
  <TabsContext.Provider value={{ value, onChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
)

interface TabListProps {
  children: ReactNode
  className?: string
  ariaLabel?: string
}

const TabList = ({ children, className, ariaLabel }: TabListProps) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cn("flex gap-1 border-b border-gray-200", className)}
  >
    {children}
  </div>
)

interface TabProps {
  value: string
  children: ReactNode
  className?: string
}

const Tab = ({ value, children, className }: TabProps) => {
  const { value: active, onChange } = useTabsContext()
  const isActive = value === active

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm",
        isActive
          ? "border-primary-600 font-semibold text-primary-700"
          : "border-transparent text-gray-600 hover:text-primary-700",
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabPanelProps {
  value: string
  children: ReactNode
  className?: string
}

const TabPanel = ({ value, children, className }: TabPanelProps) => {
  const { value: active } = useTabsContext()
  if (value !== active) return null

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  )
}

export { Tab, TabList, TabPanel, Tabs }
export default Tabs
