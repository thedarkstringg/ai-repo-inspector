#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { reviewRepository } from "./core.js";

type Args = {
  command: string;
  repositoryPath?: string;
  baseRef?: string;
  format?: "markdown" | "json";
  validations: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = { command: argv[0] ?? "", validations: [] };
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--repo") {
      args.repositoryPath = argv[++index];
    } else if (token === "--base-ref") {
      args.baseRef = argv[++index];
    } else if (token === "--format") {
      args.format = argv[++index] as Args["format"];
    } else if (token === "--validate") {
      args.validations.push(argv[++index]);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== "review" || !args.repositoryPath) {
    console.error(
      "Usage: inspector review --repo <path> [--base-ref <ref>] [--validate <command>]... [--format markdown]",
    );
    process.exitCode = 1;
    return;
  }
  if (args.format && args.format !== "markdown") {
    console.error(`Unsupported --format "${args.format}". Only "markdown" is currently supported.`);
    process.exitCode = 1;
    return;
  }

  const report = await reviewRepository({
    repositoryPath: args.repositoryPath,
    baseRef: args.baseRef,
    validationCommands: args.validations,
    validationPolicy: { kind: "any" },
  });
  writeFileSync("review-report.md", report, "utf8");
  console.log("Review report written to review-report.md");
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});