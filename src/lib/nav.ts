export const NAV_ITEMS = [
  { key: "search", labelKey: "header.nav.search", to: "/search" },
  { key: "advanced-search", labelKey: "header.nav.advancedSearch", to: "/advanced-search" },
  { key: "submit", labelKey: "header.nav.submit", to: "/submit" },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]
