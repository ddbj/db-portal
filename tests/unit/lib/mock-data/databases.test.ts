import { describe, expect, it } from "vitest"

import { DATABASES, DB_ORDER } from "@/lib/mock-data/databases"

describe("DATABASES (mock-data)", () => {

  it("contains exactly 8 entries", () => {
    expect(DATABASES).toHaveLength(8)
  })

  it("uses the same id set as DB_ORDER", () => {
    const dbIds = DATABASES.map((d) => d.id).slice().sort()
    const ordered = [...DB_ORDER].sort()
    expect(dbIds).toEqual(ordered)
  })

  it("preserves DB_ORDER (stable order)", () => {
    expect(DATABASES.map((d) => d.id)).toEqual([...DB_ORDER])
  })

  it("has unique ids (no duplicates)", () => {
    const ids = DATABASES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has non-empty displayName, shortName, description for every DB", () => {
    for (const db of DATABASES) {
      expect(db.displayName).not.toBe("")
      expect(db.shortName).not.toBe("")
      expect(db.description).not.toBe("")
    }
  })

  it("marks INSDC member DBs correctly", () => {
    const insdc = DATABASES.filter((d) => d.insdcMember).map((d) => d.id).slice().sort()
    expect(insdc).toEqual(["bioproject", "biosample", "sra", "taxonomy", "trad"])
  })
})
