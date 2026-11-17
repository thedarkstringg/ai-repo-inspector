import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ChangedFile } from "./types.js";

function git(repositoryPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function assertGitRepository(repositoryPath: string): void {
  if (!repositoryPath || !existsSync(repositoryPath)) {
    throw new Error(`Repository path does not exist: ${repositoryPath}`);
  }
  try {
    git(repositoryPath, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    throw new Error(`Not a Git repository: ${repositoryPath}`);
  }
}

function resolveBaseRef(repositoryPath: string, baseRef?: string): string {
  const base = baseRef ?? "main";
  if (base.startsWith("-")) {
    throw new Error(`Invalid base ref "${base}": refs may not start with "-".`);
  }
  try {
    git(repositoryPath, ["rev-parse", "--verify", "--quiet", "--end-of-options", `${base}^{commit}`]);
  } catch {
    throw new Error(
      `Base ref "${base}" not found in ${repositoryPath}. Pass a base ref explicitly (for example "master").`,
    );
  }
  return base;
}

export function changedFiles(repositoryPath: string, baseRef?: string): ChangedFile[] {
  assertGitRepository(repositoryPath);
  const base = resolveBaseRef(repositoryPath, baseRef);
  const output = git(repositoryPath, ["diff", "--name-status", `${base}...HEAD`, "--"]);

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [code, ...pathParts] = line.split("\t");
      const status = code === "A" ? "added" : code === "D" ? "deleted" : "modified";
      return { path: pathParts.join("\t"), status };
    });
}