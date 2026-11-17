import { changedFiles } from "./git.js";
import { markdownReport } from "./report.js";
import type { ReviewRequest, ValidationPolicy, ValidationResult } from "./types.js";
import { runValidation } from "./validation.js";

const READ_ONLY: ValidationPolicy = { kind: "allowlist", commands: [] };

function isAllowed(command: string, policy: ValidationPolicy): boolean {
  return policy.kind === "any" || policy.commands.includes(command.trim());
}

export async function reviewRepository(request: ReviewRequest): Promise<string> {
  const files = changedFiles(request.repositoryPath, request.baseRef);
  const policy = request.validationPolicy ?? READ_ONLY;
  const validations: ValidationResult[] = [];
  for (const command of request.validationCommands ?? []) {
    if (isAllowed(command, policy)) {
      validations.push(await runValidation(command, request.repositoryPath));
    } else {
      validations.push({
        command,
        status: "skipped",
        exitCode: null,
        output: "Not executed: command is not permitted by this server's validation policy.",
      });
    }
  }
  return markdownReport({
    repositoryPath: request.repositoryPath,
    changedFiles: files,
    validationResults: validations,
  });
}