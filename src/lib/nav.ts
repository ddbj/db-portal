export interface NavItem {
  key: "search" | "advanced-search" | "submit"
  label: string
  to: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "search", label: "検索", to: "/search" },
  { key: "advanced-search", label: "詳細検索", to: "/advanced-search" },
  { key: "submit", label: "登録", to: "/submit" },
] as const
