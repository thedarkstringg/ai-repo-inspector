import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedFiles } from "../src/git.js";
import { makeRepo } from "./fixtures.js";

const repos: string[] = [];
afterEach(() => {
  for (const repo of repos.splice(0)) rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
});

describe("changedFiles", () => {
  it("lists files changed against a valid base ref", () => {
    const repo = makeRepo();
    repos.push(repo);
    expect(changedFiles(repo, "main")).toEqual([{ path: "new-file.ts", status: "added" }]);
  });

  it("rejects a base ref that looks like a git option and writes no file", () => {
    const repo = makeRepo();
    repos.push(repo);
    const before = readdirSync(repo).sort();
    expect(() => changedFiles(repo, "--output=pwned.txt")).toThrow(/Invalid base ref/);
    expect(readdirSync(repo).sort()).toEqual(before);
  });

  it("gives a clear error for an unknown base ref", () => {
    const repo = makeRepo();
    repos.push(repo);
    expect(() => changedFiles(repo, "does-not-exist")).toThrow(/not found/);
  });

  it("gives a clear error for a missing repository path", () => {
    expect(() => changedFiles(join(tmpdir(), "no-such-repo-inspector"))).toThrow(/does not exist/);
  });
});