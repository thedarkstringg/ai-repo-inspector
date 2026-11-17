# Submission

## What did you investigate first, and why?

I ran the setup (install, typecheck, test, build) and read every source file
before changing anything. The starter had a single happy-path report test, so
nothing covered git, validation, the CLI, or MCP. I focused first on the trust
boundary (what the MCP tool lets a caller do) and on the contract between the
adapters and the core, because those failures are the most damaging when an AI
agent is the caller.

I reproduced two bugs manually before fixing anything:

- `--validate "exit 1"` crashed with `Fatal error` instead of reporting a failure.
- `--base-ref "--output=pwned.txt"` made git write a file `pwned.txt...HEAD` into
  the repo, while the tool still reported success.

## What did you choose to implement or fix?

In priority order, each with tests written to fail first and then pass:

1. **MCP contract was broken.** The schema declared `repo_path`, but the handler
   read `input.repoPath` (hidden by `any`). Git therefore ran in the server's own
   directory and silently reviewed the wrong repo ("Review Report: undefined").
   - Moved the handler to `src/mcp-tool.ts` so it is testable.
   - One snake_case contract with field descriptions; typed input.
   - Errors returned as `isError`.
2. **Validation failures crashed the review.** Failed commands now resolve as
   `failed` with exit code and output.
   - Added a 120s timeout and an output cap (8000 chars, keeping the tail).
   - stdout and stderr are both kept.
   - Report shows PASSED/FAILED/SKIPPED, uses a safe code fence, and has empty states.
3. **MCP allowed arbitrary shell execution.** Added a `ValidationPolicy` in core
   that defaults to read-only.
   - The CLI opts in to running any command.
   - MCP runs only exact matches of an operator-set allowlist
     (`INSPECTOR_VALIDATION_ALLOWLIST`); anything else is `SKIPPED`.
   - A marker-file test proves skipped commands never execute.
4. **Base-ref argument injection.** Refs starting with `-` are rejected; refs are
   verified with `git rev-parse --verify --end-of-options`; `--` is added to the diff.
   - Missing paths and non-git directories get clear errors (previously
     `spawnSync git ENOENT`).
5. **CLI fixes.** Paths with spaces were truncated at the first space;
   `--format json` was silently ignored and is now rejected clearly; user errors
   print one line instead of a stack trace.
6. **Test infrastructure.** A temp git repo fixture. Vitest is limited to
   `test/**/*.test.ts`, because after `npm run build` it also ran the compiled
   tests in `dist/`.

Tests went from 1 to 15. I also updated the README with the interface decision
and both contracts.

## What did you intentionally not do?

- JSON output: rejected explicitly rather than half-implemented.
- Rename/copy/type-change parsing and `-z` output for unusual filenames; renames
  are currently reported as one "modified" path.
- Uncommitted and untracked changes: only `base...HEAD` is reviewed.
- A non-zero CLI exit code when a validation fails (needs a structured core result).
- Rejecting unknown CLI flags and missing flag values.
- Capping the changed-file list for very large diffs (only validation output is capped).
- Killing the whole process tree on timeout (on Windows, killing the shell may
  leave child processes running).
- The 15 `npm audit` dependency warnings: out of scope for this time box.

## Interface decision

- **Decision:** Hybrid. One core, two thin adapters, and an explicit capability policy.
- **Primary user and execution environment:** Developers running the CLI on
  their own machine, and AI coding agents on the same machine connecting over
  stdio MCP. Both review local repositories; there is no remote or hosted mode.
- **Trust boundary and allowed capabilities:**
  - The developer at the CLI is trusted. A `--validate` command they type has
    the same privilege as running it in their own shell, so the CLI runs it.
  - The MCP caller is an agent whose inputs can be shaped by untrusted content,
    for example prompt injection in the files it is reviewing. MCP is therefore
    read-only by default. Only commands the server operator allowlists by exact
    match can run, and the agent cannot widen that list.
  - An agent that already has a shell can use the CLI anyway. The MCP tool must
    not become a shell for agents that were not given one.
  - Caveat: an allowlisted `npm test` still runs scripts defined by the reviewed
    repository, so an allowlist only makes sense for trusted repositories.
- **Reliability, discoverability, latency/context, and output tradeoffs:**
  - Reliability: failures are returned as data (`failed`, `skipped`, `isError`),
    not crashes, and the timeout prevents hangs.
  - Discoverability: the MCP schema and tool description state the contract and
    the SKIPPED behavior; the CLI usage text is accurate.
  - Latency/context: validation runs sequentially with a 120s timeout. Output is
    capped at 8000 characters, keeping the end where test runners print
    failures, to protect the agent's context window. The changed-file list is
    not capped yet.
- **How supported interfaces remain consistent:** Both adapters call
  `reviewRepository`, so they share input checks, result statuses, and the
  report renderer. The only difference is the `ValidationPolicy` each passes
  explicitly. Because the core defaults to read-only, a new adapter is safe by
  default. Tests cover the core and the MCP handler; I verified the CLI manually.
- **Evidence that would change this decision:**
  - If agents mostly call the CLI through shell tools: go CLI-first and add JSON
    output.
  - If MCP is deployed remotely or against untrusted repositories: go MCP-first
    and either run validation in a sandbox or remove it.
  - If developers rarely use the CLI directly: drop it as an advertised interface.

## How did you use an AI coding agent?

I used Claude as a pair and reviewer. It helped me analyze the code, rank the
issues, and draft code and tests. I ran every command myself and reviewed each
change before committing. For every fix I wrote the test first, watched it fail
against the original code, then confirmed it passed after the fix.The policy tests
were written together with the change, and the CLI fixes were verified
manually before and after.

## Where did you check, correct, or reject an AI suggestion? (required)

- **Red CI:** the AI first suggested the failing CI was a planted code problem.
  The job annotation showed my GitHub account had a billing lock and the job
  never started. I rejected that theory and ran the same workflow steps locally.
- **Noisy test fixture:** the AI-written fixture leaked git stderr and CRLF
  warnings into the test output. I fixed it with `stdio: pipe` and
  `core.autocrlf=false`.
- **Handler signature:** I rejected passing the policy as a second handler
  parameter. The MCP SDK calls handlers as `(args, extra)`, so a second
  parameter would silently receive `extra`. I used a handler factory instead. Verified in the SDK's type definitions: `BaseToolCallback` is `(args, extra) => ...` in `@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts`.
- **Integration mistake caught by typecheck:** while applying a change I left a
  duplicate `ReviewRequest` type and dropped the SDK imports. Vitest still
  passed 10/11 while `tsc` reported 7 errors. Vitest does not typecheck, so
  `npm run typecheck` has to be a separate gate.
- **Safe default broke an earlier test:** making the core read-only broke a test
  that relied on commands running implicitly. I updated the test to opt in
  explicitly, which confirms that callers now have to choose a policy.

## Commands used to verify the result, with outcomes


- `npm run typecheck`: clean.
- `npm run build`: clean.
- `npm test`: 15/15 passing. The MCP contract, validation, and git tests were run red against the original code first.
- `npm run inspector -- review --repo . --validate "exit 1"`: before, a
  `Fatal error` crash; after, the report shows `exit 1 (FAILED, exit 1)`.
- `npm run inspector -- review --repo . --base-ref "--output=pwned.txt"`:
  before, a file was created and success was reported; after, a one-line
  "Invalid base ref" error and no file.
- `npm run inspector -- review --repo "%TEMP%\inspector copy"`: before, the path
  was truncated at the space; after, the report is written.
- `npm run inspector -- review --repo . --format json`: now a clear
  "Unsupported" error.
- `npm run mcp-server`: starts and waits on stdio (smoke test only).

## A blocker you hit and how you approached it

GitHub Actions failed on every push, including the untouched template commit.
The annotation said my account was locked due to a billing issue, so the job
never started. That is unrelated to the code. Instead of spending the time box
on it, I ran the workflow's exact steps locally (`npm ci`/`npm install`,
`typecheck`, `build`, `test`) and recorded the results above.

## Known limitations and the next three things you would do

Limitations are listed under "intentionally not done". There is also no
end-to-end test over the stdio transport; the MCP handler is tested directly.

1. Return a structured result from the core. Use it for `--format json`, MCP
   `structuredContent`, and a non-zero CLI exit code when validations fail, so
   both interfaces share one machine-readable contract.
2. Parse git output with `-z`, handle renames, copies, and untracked files, and
   cap the changed-file list for large diffs.
3. Add an end-to-end MCP test over stdio. Run allowlisted validation in a
   sandbox, or at least kill the whole process tree on timeout.

## Approximate focused-work time

- Start: 12:15 (Asia/Baku, 17 Nov 2026)
- Finish: 13:15 (Asia/Baku, 17 Nov 2026)