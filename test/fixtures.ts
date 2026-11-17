import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "inspector-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com",
        "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args],
        { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-b", "main");
  writeFileSync(join(dir, "README.md"), "hello\n");
  git("add", ".");
  git("commit", "-m", "initial");
  git("checkout", "-b", "feature");
  writeFileSync(join(dir, "new-file.ts"), "export {};\n");
  git("add", ".");
  git("commit", "-m", "add file");
  return dir;
}