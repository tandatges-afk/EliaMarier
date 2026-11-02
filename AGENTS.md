# Agent instructions — Élia Marier

This is the **Élia Marier** repository. Do not confuse it with Amorri Studio or GU.

## Mandatory reading order for a new coding session

1. Read the repository-root [`CLAUDE.md`](CLAUDE.md) in full. It is the owner's unmodified coding-guidelines document.
2. Read [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md) for verified project context, last known QA state, unresolved issues and deployment safeguards.
3. Inspect the actual checked-out branch, `git status`, most recent commit and relevant source/tests. The handoff is a snapshot, **not** proof of the current working tree.
4. For instructions to open a new ChatGPT conversation, see [`docs/START_NEW_CHAT.md`](docs/START_NEW_CHAT.md).

## Rules for subsequent agents

- Apply the minimal targeted change and test the real failure, following `CLAUDE.md`.
- Distinguish test results **actually observed on the user's machine** from tests run on reconstructed or isolated code.
- Never claim a QA run passed merely because a standalone `Write-Host` printed PASS after an earlier failed command.
- Do not push `main`, migrate production data, change Firebase rules, rotate secrets, or deploy without the owner's explicit authorization and release checks. `main` may trigger a Vercel deployment.
- Use an isolated Firebase demo project/emulator or independent staging resources for mutating integration tests. Never run destructive tests against production.
- Do not commit `.env.local`, service-account JSON, credentials, secrets, database exports or customer data.
- After meaningful changes, **update `docs/AI_HANDOFF.md`** with the new patch/commit, commands executed, pass/fail evidence and remaining blockers. Keep entries short, dated and factual; do not turn guesses into facts.

These files are intended to be tracked by Git; a new chat cannot automatically see uncommitted files on somebody else's computer.
