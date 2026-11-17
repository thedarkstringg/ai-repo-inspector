# Repository Inspector

This is a small TypeScript developer tool that inspects changes in a Git
repository, runs optional validation commands, and produces a Markdown report.
It can be used from a command line or exposed to AI clients through MCP.

## Your task

Investigate the repository and improve it as you judge best. The starter works
for a narrow happy path, but production use may expose correctness, safety,
reliability, contract, output, documentation, or testing weaknesses.

You are not expected to finish everything. We care about how you investigate,
prioritize, implement, verify, and explain a meaningful scope.

## Product decision

This tool may be used directly by developers and by AI coding agents. Decide
whether its production interface should be **CLI-first**, **MCP-first**, or
**hybrid**. Implement improvements consistent with your decision.

There is no preferred label. Explain:

- The primary user and execution environment you assumed.
- The trust boundary and allowed capabilities.
- Reliability, discoverability, latency/context, and output-size tradeoffs.
- How the interfaces you continue to advertise stay behaviorally consistent.
- What evidence would change your decision.

## Time and rules

- Maximum **90 focused minutes** within 48 hours of receiving the invitation.
- Use AI coding tools freely. Verify their work and document at least one
  suggestion you corrected or rejected.
- Work in your own repository created from this template.
- Commit as you work and complete `SUBMISSION.md` in your final commit.
- Completion is not required. Accurate scope and verification matter more than
  a large diff.

## Setup

```bash
npm install
npm run typecheck
npm test
```

## Interface and safety model

The tool is **hybrid**: one shared core (`src/core.ts`) with two thin adapters.
Both adapters use the same input checks, result statuses, and report renderer.
The only difference is the validation policy each one passes explicitly:

| Interface | Caller | Validation commands |
|---|---|---|
| CLI | A developer in their own shell | Runs any `--validate` command they type |
| MCP | An AI agent (inputs may be shaped by untrusted content) | Read-only by default; runs only exact matches of `INSPECTOR_VALIDATION_ALLOWLIST` |

The core defaults to read-only, so a new adapter cannot run commands unless it
opts in.

Note: even an allowlisted command such as `npm test` runs scripts defined by the
reviewed repository. Only allowlist commands for repositories you trust.

## CLI

```bash
npm run inspector -- review --repo ./path/to/repo
npm run inspector -- review --repo ./path/to/repo --base-ref master --validate "npm test"
```

- `--repo` (required): path to a local Git repository
- `--base-ref` (optional, default `main`): compared as `base_ref...HEAD`; must exist and must not start with `-`
- `--validate` (repeatable): command to run in the repository
- `--format`: only `markdown` is supported

The report is written to `review-report.md` in the directory npm runs from (the package root).

## MCP

```bash
npm run mcp-server
```

Tool `review_repository`:

- `repo_path` (string, required): path to a local Git repository
- `base_ref` (string, optional, default `main`)
- `validation_commands` (string[], optional): executed only if they exactly match the allowlist; otherwise reported as `SKIPPED`

To allow validation, set a comma-separated list of exact commands in the MCP
server's environment, for example `INSPECTOR_VALIDATION_ALLOWLIST=npm test,npm run typecheck`.

Errors (missing repo, unknown or invalid ref) are returned as `isError` results.

## Report

Each validation shows `PASSED`, `FAILED` (with exit code), or `SKIPPED`.
Commands time out after 120s. Output is capped at 8000 characters, keeping the end.