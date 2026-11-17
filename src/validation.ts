import { exec } from "node:child_process";
import type { ValidationResult } from "./types.js";

export const DEFAULT_TIMEOUT_MS = 120_000;
export const MAX_OUTPUT_CHARS = 8_000;

export function truncateOutput(text: string, max = MAX_OUTPUT_CHARS): string {
  if (text.length <= max) return text;
  return `[... ${text.length - max} earlier characters truncated ...]\n${text.slice(-max)}`;
}

export function runValidation(
  command: string,
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ValidationResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const combined = [stdout, stderr].filter((part) => part && part.trim()).join("\n");
        if (!error) {
          resolve({ command, status: "passed", exitCode: 0, output: truncateOutput(combined) });
          return;
        }
        const timedOut = Date.now() - startedAt >= timeoutMs;
        const exitCode = typeof error.code === "number" ? error.code : null;
        const reason = timedOut
          ? `Timed out after ${timeoutMs} ms`
          : `Exited with code ${exitCode ?? "unknown"}`;
        resolve({
          command,
          status: "failed",
          exitCode,
          output: truncateOutput([reason, combined].filter(Boolean).join("\n")),
        });
      },
    );
  });
}

export async function runValidations(commands: string[], cwd: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runValidation(command, cwd));
  }
  return results;
}