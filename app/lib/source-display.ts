import type { BsiSource } from "~/schemas/api-bff/_shared"

export const sourceDisplayLabel = (source: BsiSource): "DDBJ" | "DBCLS" =>
  source === "ddbj" ? "DDBJ" : "DBCLS"

export const sourceSwatch = (source: BsiSource): string =>
  source === "ddbj" ? "var(--color-src-ddbj)" : "var(--color-src-dbcls)"
