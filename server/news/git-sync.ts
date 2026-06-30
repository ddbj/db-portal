import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const DEFAULT_TIMEOUT_MS = 60_000

type RunGitOk = { ok: true; stdout: string }
type RunGitFail = { ok: false; stderr: string }
export type RunGitResult = RunGitOk | RunGitFail

export type RunGit = (args: readonly string[], cwd?: string) => Promise<RunGitResult>

export const defaultRunGit: RunGit = async (args, cwd) => {
  try {
    const { stdout } = await execFileAsync("git", [...args], {
      cwd,
      timeout: DEFAULT_TIMEOUT_MS,
    })

    return { ok: true, stdout }
  } catch (error) {
    const e = error as { stderr?: unknown; message?: string }
    const stderr = typeof e.stderr === "string"
      ? e.stderr
      : (e.message ?? String(error))

    return { ok: false, stderr }
  }
}

export const isGitRepo = async (localDir: string): Promise<boolean> => {
  try {
    const s = await stat(path.join(localDir, ".git"))

    return s.isDirectory()
  } catch {
    return false
  }
}

export const cloneRepo = (
  repoUrl: string,
  branch: string,
  localDir: string,
  runGit: RunGit = defaultRunGit,
): Promise<RunGitResult> =>
  runGit(["clone", "--depth", "1", "--branch", branch, repoUrl, localDir])

export const pullRepo = async (
  branch: string,
  localDir: string,
  runGit: RunGit = defaultRunGit,
): Promise<RunGitResult> => {
  const fetched = await runGit(["fetch", "--depth", "1", "origin", branch], localDir)
  if (!fetched.ok) return fetched

  return runGit(["reset", "--hard", `origin/${branch}`], localDir)
}

export const getHeadSha = async (
  localDir: string,
  runGit: RunGit = defaultRunGit,
): Promise<string | undefined> => {
  const r = await runGit(["rev-parse", "HEAD"], localDir)
  if (!r.ok) return undefined
  const sha = r.stdout.trim()

  return sha || undefined
}

export const syncRepo = async (
  repoUrl: string,
  branch: string,
  localDir: string,
  runGit: RunGit = defaultRunGit,
): Promise<RunGitResult> => {
  if (await isGitRepo(localDir)) {
    return pullRepo(branch, localDir, runGit)
  }

  return cloneRepo(repoUrl, branch, localDir, runGit)
}
