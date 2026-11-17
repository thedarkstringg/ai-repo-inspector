export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "untracked";
};

export type ValidationResult = {
  command: string;
  status: "passed" | "failed" | "skipped";
  exitCode?: number | null;
  output: string;
};

export type ValidationPolicy =
  | { kind: "any" }                            // trusted caller
  | { kind: "allowlist"; commands: string[] }; // untrusted caller

export type ReviewRequest = {
  repositoryPath: string;
  baseRef?: string;
  validationCommands?: string[];
  validationPolicy?: ValidationPolicy;
  format?: "markdown" | "json";
};