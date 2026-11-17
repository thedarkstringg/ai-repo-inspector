import { afterEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReviewToolHandler, handleReviewTool, policyFromEnv } from "../src/mcp-tool.js";
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

const MARKER_CMD = `node -e "require('fs').writeFileSync('marker.txt', 'x')"`;

describe("MCP validation policy", () => {
  it("does not execute validation commands by default", async () => {
    const repo = makeRepo();
    repos.push(repo);
    const result = await handleReviewTool({ repo_path: repo, validation_commands: [MARKER_CMD] });
    expect(textOf(result)).toContain("SKIPPED");
    expect(existsSync(join(repo, "marker.txt"))).toBe(false);
  });

  it("executes a command only when it is on the allowlist", async () => {
    const repo = makeRepo();
    repos.push(repo);
    const handler = createReviewToolHandler({ kind: "allowlist", commands: [MARKER_CMD] });
    const result = await handler({ repo_path: repo, validation_commands: [MARKER_CMD] });
    expect(textOf(result)).toContain("PASSED");
    expect(existsSync(join(repo, "marker.txt"))).toBe(true);
  });

  it("parses the allowlist from the environment", () => {
    expect(policyFromEnv({ INSPECTOR_VALIDATION_ALLOWLIST: " npm test , npm run typecheck " }))
      .toEqual({ kind: "allowlist", commands: ["npm test", "npm run typecheck"] });
    expect(policyFromEnv({})).toEqual({ kind: "allowlist", commands: [] });
  });
});