import {
  CREATE_TABLES_V4,
  CREATE_INDICES_V4,
  MIGRATIONS_V3_TO_V4,
} from '../../database/schema';

describe('schema v4 (recurring_transactions)', () => {
  describe('CREATE_TABLES_V4', () => {
    it('creates the recurring_transactions table', () => {
      expect(CREATE_TABLES_V4).toMatch(/CREATE TABLE IF NOT EXISTS recurring_transactions/i);
    });

    it('declares every column from the spec column model', () => {
      const expectedColumns: Array<{ name: string; typeRe: RegExp }> = [
        { name: 'id', typeRe: /id\s+INTEGER\s+PRIMARY KEY\s+AUTOINCREMENT/i },
        { name: 'monto', typeRe: /monto\s+INTEGER\s+NOT NULL/i },
        { name: 'categoria_id', typeRe: /categoria_id\s+INTEGER\s+NOT NULL/i },
        { name: 'descripcion', typeRe: /descripcion\s+TEXT/i },
        { name: 'frequency', typeRe: /frequency\s+TEXT\s+NOT NULL/i },
        { name: 'interval_days', typeRe: /interval_days\s+INTEGER/i },
        { name: 'start_date', typeRe: /start_date\s+TEXT\s+NOT NULL/i },
        { name: 'end_date', typeRe: /end_date\s+TEXT/i },
        { name: 'last_run_date', typeRe: /last_run_date\s+TEXT/i },
        { name: 'active', typeRe: /active\s+INTEGER\s+NOT NULL\s+DEFAULT\s+1/i },
        { name: 'deleted_at', typeRe: /deleted_at\s+TEXT/i },
        { name: 'created_at', typeRe: /created_at\s+TEXT\s+NOT NULL/i },
      ];
      for (const col of expectedColumns) {
        expect(CREATE_TABLES_V4).toMatch(col.typeRe);
      }
    });

    it('enforces the frequency CHECK constraint over the 4 allowed values', () => {
      expect(CREATE_TABLES_V4).toMatch(
        /CHECK\s*\(\s*frequency\s+IN\s*\(\s*'daily'\s*,\s*'weekly'\s*,\s*'monthly'\s*,\s*'custom_days'\s*\)\s*\)/i
      );
    });

    it('enforces the interval_days CHECK (NULL or > 0)', () => {
      expect(CREATE_TABLES_V4).toMatch(
        /CHECK\s*\(\s*interval_days\s+IS\s+NULL\s+OR\s+interval_days\s*>\s*0\s*\)/i
      );
    });

    it('enforces the active CHECK (0 or 1)', () => {
      expect(CREATE_TABLES_V4).toMatch(
        /CHECK\s*\(\s*active\s+IN\s*\(\s*0\s*,\s*1\s*\)\s*\)/i
      );
    });

    it('enforces the monto non-negative CHECK', () => {
      expect(CREATE_TABLES_V4).toMatch(/CHECK\s*\(\s*monto\s*>=\s*0\s*\)/i);
    });

    it('references categorias(id) for categoria_id', () => {
      expect(CREATE_TABLES_V4).toMatch(
        /REFERENCES\s+categorias\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i
      );
    });

    it('alters transacciones to add the nullable recurring_id column', () => {
      expect(CREATE_TABLES_V4).toMatch(
        /ALTER\s+TABLE\s+transacciones\s+ADD\s+COLUMN\s+recurring_id\s+INTEGER/i
      );
    });

    it('declares the recurring_id FK with ON DELETE SET NULL', () => {
      // The FK clause is parsed by SQLite as part of the column definition
      // inside the ALTER TABLE statement — we search the whole constant.
      expect(CREATE_TABLES_V4).toMatch(
        /REFERENCES\s+recurring_transactions\s*\(\s*id\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i
      );
    });
  });

  describe('CREATE_INDICES_V4', () => {
    it('creates the partial active-rules index with deleted_at IS NULL', () => {
      expect(CREATE_INDICES_V4).toMatch(
        /CREATE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+idx_recurring_active[\s\S]+?ON\s+recurring_transactions\s*\(\s*active\s*\)[\s\S]+?WHERE\s+deleted_at\s+IS\s+NULL/i
      );
    });

    it('creates the transacciones recurring_id index', () => {
      expect(CREATE_INDICES_V4).toMatch(
        /CREATE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+idx_tx_recurring_id[\s\S]+?ON\s+transacciones\s*\(\s*recurring_id\s*\)/i
      );
    });

    it('creates the partial unique run-prevention index', () => {
      expect(CREATE_INDICES_V4).toMatch(
        /CREATE\s+UNIQUE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+idx_tx_recurring_run[\s\S]+?ON\s+transacciones\s*\(\s*recurring_id\s*,\s*fecha_local\s*\)[\s\S]+?WHERE\s+recurring_id\s+IS\s+NOT\s+NULL/i
      );
    });
  });

  describe('MIGRATIONS_V3_TO_V4', () => {
    it('batches the v4 DDL statements in declaration order', () => {
      expect(Array.isArray(MIGRATIONS_V3_TO_V4)).toBe(true);
      // Must contain at least: CREATE_TABLE_V4, CREATE_INDICES_V4, user_version bump.
      const joined = MIGRATIONS_V3_TO_V4.join('\n');
      expect(joined).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+recurring_transactions/i);
      expect(joined).toMatch(/idx_recurring_active/i);
      expect(joined).toMatch(/idx_tx_recurring_id/i);
      expect(joined).toMatch(/idx_tx_recurring_run/i);
      expect(joined).toMatch(/PRAGMA\s+user_version\s*=\s*4/i);
    });

    it('uses IF NOT EXISTS for the table and indices (idempotent replay safety)', () => {
      const joined = MIGRATIONS_V3_TO_V4.join('\n');
      expect(joined).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+recurring_transactions/i);
      expect(joined).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_recurring_active/i);
      expect(joined).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tx_recurring_id/i);
      expect(joined).toMatch(
        /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tx_recurring_run/i
      );
    });
  });
});
