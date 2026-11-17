import type { ChangedFile, ValidationResult } from "./types.js";

type ReportInput = {
  repositoryPath: string;
  changedFiles: ChangedFile[];
  validationResults: ValidationResult[];
};

function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

export function markdownReport(input: ReportInput): string {
  const lines = [`# Review Report: ${input.repositoryPath}`, "", "## Changed files"];
  if (input.changedFiles.length === 0) lines.push("_No changed files._");
  for (const file of input.changedFiles) {
    lines.push(`- ${file.path} (${file.status})`);
  }
  lines.push("", "## Validation output");
  if (input.validationResults.length === 0) lines.push("_No validation commands were run._");
  for (const result of input.validationResults) {
    const exit = result.exitCode == null ? "" : `, exit ${result.exitCode}`;
    const fence = fenceFor(result.output);
    lines.push(`### ${result.command} (${result.status.toUpperCase()}${exit})`, fence, result.output, fence);
  }
  return lines.join("\n");
}