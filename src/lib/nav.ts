export const NAV_ITEMS = [
  { key: "search", labelKey: "header.nav.search", to: "/search" },
  { key: "submit", labelKey: "header.nav.submit", to: "/submit" },
  { key: "submit-alt", labelKey: "header.nav.submitAlt", to: "/submit-alt" },
  { key: "submit-alt3", labelKey: "header.nav.submitAlt3", to: "/submit-alt3" },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]
