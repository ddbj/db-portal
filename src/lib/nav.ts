export const NAV_ITEMS = [
  { key: "advanced-search", labelKey: "header.nav.advancedSearch", to: "/advanced-search" },
  { key: "submit", labelKey: "header.nav.submit", to: "/submit" },
  { key: "submit-alt", labelKey: "header.nav.submitAlt", to: "/submit-alt" },
  { key: "submit-alt3", labelKey: "header.nav.submitAlt3", to: "/submit-alt3" },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]
