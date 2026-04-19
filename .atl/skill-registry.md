# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | branch-pr | /home/hunther4/.config/opencode/skills/branch-pr/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage. | go-testing | /home/hunther4/.config/opencode/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | issue-creation | /home/hunther4/.config/opencode/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | judgment-day | /home/hunther4/.config/opencode/skills/judgment-day/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | /home/hunther4/.config/opencode/skills/skill-creator/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (`status:approved`) using `Closes #N`, `Fixes #N`, or `Resolves #N`
- Branch names MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Every PR MUST have exactly one `type:*` label (e.g., `type:feature`, `type:bug`)
- Commits MUST follow conventional commits: `type(scope): description`
- All automated checks must pass before merge
- No `Co-Authored-By` trailers in commits

### go-testing
- Use table-driven tests for pure functions and multiple test cases
- Test Bubbletea Model state transitions by calling `Model.Update()` directly
- Use `teatest.NewTestModel()` for full TUI interactive flow tests
- Use golden file testing for visual output verification
- Mock system dependencies using interfaces or `t.TempDir()` for file operations
- Test both success and error cases for functions returning errors

### issue-creation
- Blank issues are disabled; MUST use a template (Bug Report or Feature Request)
- All new issues get `status:needs-review` automatically
- Issues MUST have `status:approved` before a PR can be opened
- Questions must go to Discussions, NOT issues
- Search for duplicates before creating a new issue
- Maintainers approve issues by adding the `status:approved` label

### judgment-day
- Launch TWO sub-agents as `delegate` in parallel for blind review; neither should know about the other
- Resolve project skills before launching and inject compact rules as `## Project Standards (auto-resolved)`
- Synthesize results into a verdict table: Confirmed (both), Suspect (one), Contradiction (disagree)
- Classify WARNINGs as `real` (causes bug in production) or `theoretical` (contrived scenario)
- Theoretical WARNINGs are reported as INFO and do NOT block approval or trigger re-judgment
- Fix confirmed CRITICALs/real WARNINGs using a separate Fix Agent
- Re-judge with both judges after fixes are applied
- Stop after 2 fix iterations and ASK the user whether to continue or ESCALATE
- APPROVED if 0 confirmed CRITICALs + 0 confirmed real WARNINGs after Round 1 or subsequent rounds

### skill-creator
- Use a standard structure: `skills/{skill-name}/SKILL.md` (main), `assets/` (templates/schemas), `references/` (local docs)
- SKILL.md MUST have frontmatter with `name`, `description` (including trigger), `license`, and `metadata`
- Use `references/` for LOCAL files only, not web URLs
- Frontmatter description MUST include trigger keywords for agent loading
- Keep code examples minimal and focused; use tables for decision trees
- Add the new skill to `AGENTS.md` after creation
- Naming: `technology` (generic), `{project}-{component}` (specific), `{action}-{target}` (workflow)

## Project Conventions

| File | Path | Notes |
|------|------|-------|
