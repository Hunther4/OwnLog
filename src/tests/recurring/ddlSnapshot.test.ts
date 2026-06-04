import {
  CREATE_TABLES_V4,
  CREATE_INDICES_V4,
  MIGRATIONS_V3_TO_V4,
} from '../../database/schema';

describe('Schema v4 — DDL snapshot (review-time inspection)', () => {
  /**
   * This test is the reviewer's "one-glance" view of the new schema.
   * When the v4 DDL changes, run `npx jest --updateSnapshot src/tests/recurring/ddlSnapshot.test.ts`
   * to commit the new literal. Reviewers can `git diff` the snapshot file
   * to see every column and constraint at a glance without running
   * SQLite.
   */
  it('matches the committed v4 DDL snapshot', () => {
    const ddl = [
      '-- === MIGRATIONS_V3_TO_V4 (executed inside executeInTransaction) ===',
      ...MIGRATIONS_V3_TO_V4,
      '',
      '-- === CREATE_TABLES_V4 (raw constant) ===',
      CREATE_TABLES_V4,
      '',
      '-- === CREATE_INDICES_V4 (raw constant) ===',
      CREATE_INDICES_V4,
    ].join('\n');
    expect(ddl).toMatchSnapshot();
  });
});
