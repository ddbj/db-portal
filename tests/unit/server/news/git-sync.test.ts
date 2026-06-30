import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  cloneRepo,
  getHeadSha,
  isGitRepo,
  pullRepo,
  type RunGit,
  type RunGitResult,
  syncRepo,
} from "../../../../server/news/git-sync"

type Call = { args: readonly string[]; cwd: string | undefined }

const fakeRunGit = (responses: RunGitResult[]): { fn: RunGit; calls: Call[] } => {
  const calls: Call[] = []
  let i = 0
  const fn: RunGit = async (args, cwd) => {
    calls.push({ args, cwd })
    const r = responses[i] ?? { ok: true, stdout: "" }
    i++

    return r
  }

  return { fn, calls }
}

const withTempDir = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), "git-sync-"))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe("isGitRepo", () => {
  test("isGitRepo_dotGitDirExists_returnsTrue", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, ".git"), { recursive: true })
      expect(await isGitRepo(dir)).toBe(true)
    })
  })

  test("isGitRepo_emptyDir_returnsFalse", async () => {
    await withTempDir(async (dir) => {
      expect(await isGitRepo(dir)).toBe(false)
    })
  })
})

describe("cloneRepo", () => {
  test("cloneRepo_invokesGitCloneWithShallowDepthAndBranch", async () => {
    const { fn, calls } = fakeRunGit([{ ok: true, stdout: "" }])
    const result = await cloneRepo("https://example.com/repo.git", "main", "./out", fn)
    expect(result.ok).toBe(true)
    expect(calls[0]?.args).toEqual([
      "clone",
      "--depth",
      "1",
      "--branch",
      "main",
      "--",
      "https://example.com/repo.git",
      "./out",
    ])
  })

  test("cloneRepo_attackerControlledUrlStartingWithDash_doesNotBecomeGitOption", async () => {
    // `--` 区切りが無いと `--upload-pack=touch /tmp/pwn` のような env 値が git に
    // option として解釈される (任意コマンド実行)。 fix の意図を pin する。
    const { fn, calls } = fakeRunGit([{ ok: true, stdout: "" }])
    await cloneRepo("--upload-pack=evil", "main", "./out", fn)
    const dashIdx = calls[0]?.args.indexOf("--")
    expect(dashIdx, "`--` separator must precede positional args").toBeGreaterThanOrEqual(0)
    const repoIdx = calls[0]?.args.indexOf("--upload-pack=evil")
    expect(repoIdx, "url must appear after `--`").toBeGreaterThan(dashIdx!)
  })

  test("cloneRepo_runGitFails_propagatesFailure", async () => {
    const { fn } = fakeRunGit([{ ok: false, stderr: "fatal: not found" }])
    const result = await cloneRepo("https://example.com/repo.git", "main", "./out", fn)
    expect(result).toEqual({ ok: false, stderr: "fatal: not found" })
  })
})

describe("pullRepo", () => {
  test("pullRepo_callsFetchThenReset_andSucceeds", async () => {
    const { fn, calls } = fakeRunGit([
      { ok: true, stdout: "" },
      { ok: true, stdout: "" },
    ])
    const result = await pullRepo("main", "/repo", fn)
    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(2)
    expect(calls[0]?.args).toEqual(["fetch", "--depth", "1", "origin", "--", "main"])
    expect(calls[0]?.cwd).toBe("/repo")
    expect(calls[1]?.args).toEqual(["reset", "--hard", "origin/main"])
  })

  test("pullRepo_fetchFails_skipsReset", async () => {
    const { fn, calls } = fakeRunGit([
      { ok: false, stderr: "network" },
    ])
    const result = await pullRepo("main", "/repo", fn)
    expect(result).toEqual({ ok: false, stderr: "network" })
    expect(calls).toHaveLength(1)
  })
})

describe("getHeadSha", () => {
  test("getHeadSha_runGitReturnsStdout_trimmedShaReturned", async () => {
    const { fn } = fakeRunGit([{ ok: true, stdout: "abcdef0123456789\n" }])
    expect(await getHeadSha("/repo", fn)).toBe("abcdef0123456789")
  })

  test("getHeadSha_runGitFails_returnsUndefined", async () => {
    const { fn } = fakeRunGit([{ ok: false, stderr: "fatal" }])
    expect(await getHeadSha("/repo", fn)).toBeUndefined()
  })

  test("getHeadSha_emptyStdout_returnsUndefined", async () => {
    const { fn } = fakeRunGit([{ ok: true, stdout: "" }])
    expect(await getHeadSha("/repo", fn)).toBeUndefined()
  })
})

describe("syncRepo", () => {
  test("syncRepo_existingRepo_pulls", async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, ".git"), { recursive: true })
      const { fn, calls } = fakeRunGit([
        { ok: true, stdout: "" },
        { ok: true, stdout: "" },
      ])
      const result = await syncRepo("https://example.com/r.git", "main", dir, fn)
      expect(result.ok).toBe(true)
      expect(calls[0]?.args[0]).toBe("fetch")
      expect(calls[1]?.args[0]).toBe("reset")
    })
  })

  test("syncRepo_missingRepo_clones", async () => {
    await withTempDir(async (dir) => {
      const out = path.join(dir, "child")
      const { fn, calls } = fakeRunGit([{ ok: true, stdout: "" }])
      const result = await syncRepo("https://example.com/r.git", "main", out, fn)
      expect(result.ok).toBe(true)
      expect(calls[0]?.args[0]).toBe("clone")
    })
  })
})
