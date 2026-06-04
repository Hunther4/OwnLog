import { RecurringRepository } from '../../repositories/RecurringRepository';
import { RecurringTransaction, RecurringTransactionInput } from '../../recurring/types';

// SQLiteEngine is mocked at the module level — see jest.setup.js. We
// keep the mock local to this test file so the repository test runs
// without touching the shared mock that SQLiteEngine.test.ts depends on.
const mockExecuteSql = jest.fn();
const mockGetAll = jest.fn();
const mockGetFirst = jest.fn();

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    executeSql: (...args: unknown[]) => mockExecuteSql(...args),
    getAll: (...args: unknown[]) => mockGetAll(...args),
    getFirst: (...args: unknown[]) => mockGetFirst(...args),
    executeInTransaction: async (cb: any) =>
      cb({
        runAsync: (...args: unknown[]) => mockExecuteSql(...args),
        getAllAsync: (...args: unknown[]) => mockGetAll(...args),
        getFirstAsync: (...args: unknown[]) => mockGetFirst(...args),
      }),
  },
}));

const baseRow: RecurringTransaction = {
  id: 1,
  monto: 100000,
  categoria_id: 2,
  descripcion: 'Sueldo',
  frequency: 'monthly',
  interval_days: null,
  start_date: '2026-07-01',
  end_date: null,
  last_run_date: null,
  active: 1,
  deleted_at: null,
  created_at: '2026-06-15T00:00:00.000Z',
};

function makeInput(overrides: Partial<RecurringTransactionInput> = {}): RecurringTransactionInput {
  return {
    monto: 100000,
    categoria_id: 2,
    descripcion: 'Sueldo',
    frequency: 'monthly',
    interval_days: null,
    start_date: '2026-07-01',
    end_date: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockExecuteSql.mockReset();
  mockGetAll.mockReset();
  mockGetFirst.mockReset();
});

describe('RecurringRepository', () => {
  describe('add', () => {
    it('inserts a rule and returns the auto-incremented id', async () => {
      mockExecuteSql.mockResolvedValueOnce({ lastInsertRowId: 7 });
      const id = await RecurringRepository.add(makeInput());
      expect(id).toBe(7);
      expect(mockExecuteSql).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(sql).toMatch(/INSERT\s+INTO\s+recurring_transactions/i);
      expect(sql).toMatch(/monto/);
      expect(sql).toMatch(/categoria_id/);
      expect(sql).toMatch(/frequency/);
      expect(sql).toMatch(/interval_days/);
      expect(sql).toMatch(/start_date/);
      expect(sql).toMatch(/created_at/);
      expect(params[0]).toBe(100000);
      expect(params[1]).toBe(2);
      expect(params[2]).toBe('Sueldo');
      expect(params[3]).toBe('monthly');
      expect(params[4]).toBeNull();
      expect(params[5]).toBe('2026-07-01');
      expect(params[6]).toBeNull();
      // created_at is server-generated (current UTC ISO).
      expect(typeof params[7]).toBe('string');
      expect(params[7]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('passes interval_days through (including for custom_days)', async () => {
      mockExecuteSql.mockResolvedValueOnce({ lastInsertRowId: 8 });
      await RecurringRepository.add(
        makeInput({ frequency: 'custom_days', interval_days: 14 })
      );
      const [, params] = mockExecuteSql.mock.calls[0];
      expect(params[3]).toBe('custom_days');
      expect(params[4]).toBe(14);
    });
  });

  describe('getAll', () => {
    it('returns every non-deleted rule ordered by id desc', async () => {
      mockGetAll.mockResolvedValueOnce([
        baseRow,
        { ...baseRow, id: 2, deleted_at: '2026-06-15T12:00:00.000Z' },
      ]);
      const rules = await RecurringRepository.getAll();
      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe(1);
      const sql = mockGetAll.mock.calls[0][0];
      expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+recurring_transactions/i);
      expect(sql).toMatch(/deleted_at\s+IS\s+NULL/i);
      expect(sql).toMatch(/ORDER\s+BY\s+id\s+DESC/i);
    });
  });

  describe('getActive', () => {
    it('returns only active and non-deleted rules', async () => {
      mockGetAll.mockResolvedValueOnce([baseRow]);
      const rules = await RecurringRepository.getActive();
      expect(rules).toEqual([baseRow]);
      const sql = mockGetAll.mock.calls[0][0];
      expect(sql).toMatch(/active\s*=\s*1/i);
      expect(sql).toMatch(/deleted_at\s+IS\s+NULL/i);
    });
  });

  describe('getById', () => {
    it('returns the rule when present', async () => {
      mockGetFirst.mockResolvedValueOnce(baseRow);
      const rule = await RecurringRepository.getById(1);
      expect(rule).toEqual(baseRow);
      const [sql, params] = mockGetFirst.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+recurring_transactions/i);
      expect(sql).toMatch(/WHERE\s+id\s*=\s*\?/i);
      expect(params).toEqual([1]);
    });

    it('returns null when not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);
      const rule = await RecurringRepository.getById(999);
      expect(rule).toBeNull();
    });
  });

  describe('update', () => {
    it('builds a parameterized UPDATE from the partial fields', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.update(5, { monto: 250000, categoria_id: 3 });
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(sql).toMatch(/UPDATE\s+recurring_transactions\s+SET/i);
      expect(sql).toMatch(/monto\s*=\s*\?/i);
      expect(sql).toMatch(/categoria_id\s*=\s*\?/i);
      expect(sql).toMatch(/WHERE\s+id\s*=\s*\?/i);
      expect(params).toEqual([250000, 3, 5]);
    });

    it('skips the SQL round-trip when no mutable fields are provided', async () => {
      await RecurringRepository.update(5, {});
      expect(mockExecuteSql).not.toHaveBeenCalled();
    });

    it('rejects attempts to overwrite immutable fields', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.update(5, {
        monto: 1,
        // The following are NOT in the whitelist — they must be ignored.
        id: 999,
        created_at: '2099-01-01T00:00:00.000Z',
        last_run_date: '2026-06-15',
        deleted_at: '2026-06-15T00:00:00.000Z',
      } as any);
      const [sql, params] = mockExecuteSql.mock.calls[0];
      // The SET clause must contain only `monto`. id/created_at/last_run_date
      // /deleted_at are rejected; `id` only appears in the WHERE clause.
      expect(sql).toMatch(/^UPDATE\s+recurring_transactions\s+SET\s+monto\s*=\s*\?\s+WHERE\s+id\s*=\s*\?$/i);
      // No set for the immutable fields.
      expect(sql).not.toMatch(/created_at\s*=\s*\?/);
      expect(sql).not.toMatch(/last_run_date\s*=\s*\?/);
      expect(sql).not.toMatch(/deleted_at\s*=\s*\?/);
      expect(params).toEqual([1, 5]);
    });
  });

  describe('softDelete', () => {
    it('sets deleted_at to the provided timestamp and active = 0 in a single statement', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      const ts = '2026-06-15T10:00:00.000Z';
      await RecurringRepository.softDelete(3, ts);
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(sql).toMatch(/UPDATE\s+recurring_transactions\s+SET/i);
      expect(sql).toMatch(/deleted_at\s*=\s*\?/i);
      expect(sql).toMatch(/active\s*=\s*0/i);
      expect(sql).toMatch(/WHERE\s+id\s*=\s*\?/i);
      expect(params).toEqual([ts, 3]);
    });

    it('defaults deleted_at to the current UTC ISO timestamp', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      const before = Date.now();
      await RecurringRepository.softDelete(3);
      const after = Date.now();
      const [, params] = mockExecuteSql.mock.calls[0];
      const ts = params[0] as string;
      expect(typeof ts).toBe('string');
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      const tsMs = Date.parse(ts);
      expect(tsMs).toBeGreaterThanOrEqual(before);
      expect(tsMs).toBeLessThanOrEqual(after);
      expect(params[1]).toBe(3);
    });
  });

  describe('toggle', () => {
    it('flips active to 0 when false', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.toggle(3, false);
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(sql).toMatch(/UPDATE\s+recurring_transactions\s+SET\s+active\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/i);
      expect(params).toEqual([0, 3]);
    });

    it('flips active to 1 when true', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.toggle(3, true);
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(params).toEqual([1, 3]);
    });
  });

  describe('markRun', () => {
    it('sets last_run_date atomically', async () => {
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.markRun(3, '2026-07-01');
      const [sql, params] = mockExecuteSql.mock.calls[0];
      expect(sql).toMatch(/UPDATE\s+recurring_transactions\s+SET\s+last_run_date\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/i);
      expect(params).toEqual(['2026-07-01', 3]);
    });
  });

  describe('integration: softDelete removes the rule from getActive', () => {
    it('after softDelete, getActive no longer returns that rule', async () => {
      // Step 1: getActive returns the rule while it's alive.
      mockGetAll.mockResolvedValueOnce([baseRow]);
      const before = await RecurringRepository.getActive();
      expect(before).toEqual([baseRow]);

      // Step 2: softDelete updates deleted_at + active.
      mockExecuteSql.mockResolvedValueOnce({});
      await RecurringRepository.softDelete(1, '2026-06-15T00:00:00.000Z');

      // Step 3: a fresh getActive (with the rule now soft-deleted) returns [].
      mockGetAll.mockResolvedValueOnce([]);
      const after = await RecurringRepository.getActive();
      expect(after).toEqual([]);
    });
  });
});
