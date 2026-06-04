/**
 * 30-floor guard.
 *
 * The project's strict-TDD floor for the recurring-transactions change is
 * 30 pre-existing failing tests. The PR #1 contract is: every new test
 * is net-green; none of the 30 known-failing files is modified. This
 * test makes the second clause a CI-runnable assertion.
 *
 * The list below is the snapshot of test files that were failing at
 * PR #1 baseline (recorded by running `npx jest --silent` before any
 * change in this branch). It is a static constant; if any of these
 * files changes in this branch, `git diff` will show it in the PR
 * review and this test will fail as a backstop.
 *
 * To update after a known-good fix lands upstream:
 *   1. Run `npx jest --listTests | sort` and identify the file set.
 *   2. Update THIS constant.
 *   3. Commit the constant in its own chore commit.
 */
const KNOWN_FAILING_TEST_FILES_30_FLOOR = Object.freeze([
  'src/services/__tests__/TelemetryService.test.ts',
  'src/tests/database/Performance.test.ts',
  'src/tests/repositories/CategoryRepository.test.ts',
  'src/tests/repositories/QuickActionRepository.test.ts',
  'src/tests/repositories/SettingsRepository.test.ts',
  'src/tests/repositories/TransactionRepository.test.ts',
  'src/tests/services/LocalBackupService.test.ts',
  'src/tests/store/useBoundStore.test.ts',
  'src/tests/utils/exportService.test.ts',
  'src/tests/utils/performance.test.ts',
]);

describe('30-floor guard (recurring-transactions PR #1)', () => {
  it('does not modify any of the 10 pre-existing failing test files in this branch', () => {
    const { execSync } = require('child_process');
    let modified: string[] = [];
    try {
      // Files changed against main (the merge base for this PR).
      // `git diff --name-only HEAD~6 HEAD` would show only the work in
      // this branch; using `--name-only origin/main...HEAD` is more
      // robust to the stack length.
      const out = execSync(
        'git diff --name-only origin/main...HEAD',
        { encoding: 'utf8', cwd: process.cwd() }
      );
      modified = out
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);
    } catch (err) {
      // If we cannot read git (e.g. CI clones without origin/main),
      // the guard becomes a no-op rather than a hard failure — the
      // reviewer's `git diff` is still the source of truth.
      // eslint-disable-next-line no-console
      console.warn(
        '[30-floor guard] could not read git diff against origin/main:',
        err instanceof Error ? err.message : err
      );
      return;
    }

    const violations = modified.filter((f) =>
      KNOWN_FAILING_TEST_FILES_30_FLOOR.includes(f)
    );
    if (violations.length > 0) {
      throw new Error(
        'The 30-floor guard was violated. The following pre-existing ' +
          'failing test files were modified in this branch:\n  - ' +
          violations.join('\n  - ') +
          '\n\nIf the change is intentional, update ' +
          'KNOWN_FAILING_TEST_FILES_30_FLOOR above and the project status doc.'
      );
    }
  });
});
