import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { reviewRepository } from "./core.js";

export const reviewToolDescription =
  "Inspects committed changes in a local Git repository (base_ref...HEAD) and returns a Markdown review report.";

export const reviewToolSchema = {
  repo_path: z.string().min(1).describe("Absolute path to a local Git repository to inspect."),
  base_ref: z.string().optional().describe("Branch, tag, or commit to compare HEAD against. Defaults to 'main'."),
  validation_commands: z.array(z.string()).optional().describe("Validation commands to run in the repository, e.g. 'npm test'."),
};

const inputSchema = z.object(reviewToolSchema);
export type ReviewToolInput = z.infer<typeof inputSchema>;

export async function handleReviewTool(input: ReviewToolInput): Promise<CallToolResult> {
  try {
    const report = await reviewRepository({
      repositoryPath: input.repo_path,
      baseRef: input.base_ref,
      validationCommands: input.validation_commands,
    });
    return { content: [{ type: "text", text: report }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `review_repository failed: ${message}` }], isError: true };
  }
}