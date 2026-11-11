// Fails when the running Node.js is older than `engines.node` in package.json.
// The image build runs this file with plain `node` before `npm ci`, so it must
// use only erasable TypeScript syntax and node: built-ins.
import { readFileSync } from "node:fs"

export type Version = readonly [number, number, number]

const MINIMUM_RANGE = /^>=\s*(\d+)\.(\d+)\.(\d+)$/
const NODE_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/

const toVersion = (match: RegExpExecArray | null): Version | undefined =>
  match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined

/** Reads a range of the form `>=MAJOR.MINOR.PATCH`. Other forms are rejected. */
export const parseMinimum = (range: string): Version | undefined =>
  toVersion(MINIMUM_RANGE.exec(range.trim()))

/** Reads a release version such as `26.12.1` or `v26.12.1`. */
export const parseNodeVersion = (version: string): Version | undefined =>
  toVersion(NODE_VERSION.exec(version.trim()))

export const isAtLeast = (current: Version, minimum: Version): boolean => {
  for (let i = 0; i < 3; i += 1) {
    const a = current[i] ?? 0
    const b = minimum[i] ?? 0
    if (a !== b) return a > b
  }

  return true
}

export type CheckResult = { ok: true } | { ok: false; message: string }

export const checkNodeVersion = (current: string, enginesNode: unknown): CheckResult => {
  if (typeof enginesNode !== "string") {
    return { ok: false, message: "package.json has no engines.node" }
  }
  const minimum = parseMinimum(enginesNode)
  if (!minimum) {
    return { ok: false, message: `engines.node must have the form ">=MAJOR.MINOR.PATCH": ${enginesNode}` }
  }
  const version = parseNodeVersion(current)
  if (!version) {
    return { ok: false, message: `cannot read the Node.js version: ${current}` }
  }
  if (!isAtLeast(version, minimum)) {
    return { ok: false, message: `Node.js ${current} is older than engines.node ${enginesNode}` }
  }

  return { ok: true }
}

if (import.meta.main) {
  const packageJsonPath = process.argv[2] ?? "package.json"
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    engines?: { node?: unknown }
  }
  const result = checkNodeVersion(process.versions.node, packageJson.engines?.node)
  if (!result.ok) {
    console.error(`check-node-version: ${result.message}`)
    process.exitCode = 1
  }
}
