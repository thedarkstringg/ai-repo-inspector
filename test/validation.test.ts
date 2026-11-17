import { afterEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { reviewRepository } from "../src/core.js";
import { runValidation, truncateOutput } from "../src/validation.js";
import { makeRepo } from "./fixtures.js";

const repos: string[] = [];
afterEach(() => {
  for (const repo of repos.splice(0)) rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
});

describe("runValidation", () => {
  it("reports a failing command as failed instead of throwing", async () => {
    const result = await runValidation(`node -e "process.exit(3)"`, process.cwd());
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(3);
  });

  it("reports a passing command as passed with its output", async () => {
    const result = await runValidation(`node -e "console.log('hello')"`, process.cwd());
    expect(result.status).toBe("passed");
    expect(result.output).toContain("hello");
  });

  it("fails a command that exceeds the timeout", async () => {
    const result = await runValidation(`node -e "setTimeout(() => {}, 3000)"`, process.cwd(), 300);
    expect(result.status).toBe("failed");
    expect(result.output).toContain("Timed out");
  }, 15_000);
});

describe("truncateOutput", () => {
  it("keeps the tail of long output and marks the truncation", () => {
    const text = "a".repeat(100) + "END";
    const result = truncateOutput(text, 10);
    expect(result).toContain("truncated");
    expect(result.endsWith("END")).toBe(true);
  });
});

describe("reviewRepository with a failing validation", () => {
  it("still returns a report that shows the failure", async () => {
    const repo = makeRepo();
    repos.push(repo);
    const report = await reviewRepository({
      repositoryPath: repo,
      validationCommands: [`node -e "process.exit(1)"`],
    });
    expect(report).toContain("FAILED");
    expect(report).toContain("new-file.ts");
  });
});