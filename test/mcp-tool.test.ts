import { afterEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleReviewTool } from "../src/mcp-tool.js";
import { makeRepo } from "./fixtures.js";

const repos: string[] = [];
afterEach(() => {
  for (const repo of repos.splice(0)) rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
});

function textOf(result: Awaited<ReturnType<typeof handleReviewTool>>): string {
  const first = result.content[0];
  return first?.type === "text" ? first.text : "";
}

describe("review_repository MCP tool", () => {
  it("reviews the repository given in repo_path", async () => {
    const repo = makeRepo();
    repos.push(repo);
    const result = await handleReviewTool({ repo_path: repo });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("new-file.ts");
  });

  it("returns isError instead of throwing for a missing repository", async () => {
    const result = await handleReviewTool({ repo_path: join(tmpdir(), "does-not-exist-inspector") });
    expect(result.isError).toBe(true);
  });
});