import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { reviewRepository } from "./core.js";
import type { ValidationPolicy } from "./types.js";

export const reviewToolDescription =
  "Inspects committed changes in a local Git repository (base_ref...HEAD) and returns a Markdown review report. " +
  "Read-only by default: validation_commands run only if they exactly match the server operator's " +
  "INSPECTOR_VALIDATION_ALLOWLIST; other commands are reported as SKIPPED and not executed.";

export const reviewToolSchema = {
  repo_path: z.string().min(1).describe("Absolute path to a local Git repository to inspect."),
  base_ref: z.string().optional().describe("Branch, tag, or commit to compare HEAD against. Defaults to 'main'."),
  validation_commands: z
    .array(z.string())
    .optional()
    .describe("Commands to run in the repository. Only exact matches of the server allowlist are executed."),
};

const inputSchema = z.object(reviewToolSchema);
export type ReviewToolInput = z.infer<typeof inputSchema>;

export function policyFromEnv(env: NodeJS.ProcessEnv): ValidationPolicy {
  const commands = (env.INSPECTOR_VALIDATION_ALLOWLIST ?? "")
    .split(",")
    .map((command) => command.trim())
    .filter(Boolean);
  return { kind: "allowlist", commands };
}

export function createReviewToolHandler(policy: ValidationPolicy) {
  return async (input: ReviewToolInput): Promise<CallToolResult> => {
    try {
      const report = await reviewRepository({
        repositoryPath: input.repo_path,
        baseRef: input.base_ref,
        validationCommands: input.validation_commands,
        validationPolicy: policy,
      });
      return { content: [{ type: "text", text: report }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `review_repository failed: ${message}` }], isError: true };
    }
  };
}


export const handleReviewTool = createReviewToolHandler({ kind: "allowlist", commands: [] });