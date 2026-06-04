import { act } from '@testing-library/react-native';
import { createRecurringSlice, type RecurringSlice } from '../../store/slices/recurringSlice';
import { RecurringRepository } from '../../repositories/RecurringRepository';
import {
  RecurringTransaction,
  RecurringTransactionInput,
} from '../../recurring/types';

// Repository is fully mocked — the slice test exercises only the slice
// state machine, not the SQL.
jest.mock('../../repositories/RecurringRepository', () => ({
  RecurringRepository: {
    getActive: jest.fn(),
    getById: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    toggle: jest.fn(),
    markRun: jest.fn(),
  },
}));

const mockedRepo = RecurringRepository as jest.Mocked<typeof RecurringRepository>;

function makeRule(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
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
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<RecurringTransactionInput> = {}
): RecurringTransactionInput {
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

// The slice's optimistic-update contract is exercised via a tiny store
// harness: we feed the slice a (set, get) pair and inspect the resulting
// state. The shape mirrors the production useBoundStore's slice contract.
function makeHarness() {
  // The Zustand store mutates `state.current` in place via set() and reads
  // it back via get(). We snapshot a *reference* and read `current` for
  // assertions — the slice object returned from createRecurringSlice is
  // the INITIAL state and does not reflect subsequent updates.
  const state: { current: any } = { current: {} };
  const api = {
    getState: () => state.current,
    setState: (
      partial:
        | Record<string, unknown>
        | ((s: any) => Record<string, unknown>)
    ) => {
      const next = typeof partial === 'function' ? partial(state.current) : partial;
      state.current = { ...state.current, ...next };
    },
  };
  // Initialise the store with the slice's initial state.
  const initial = createRecurringSlice(
    api.setState as any,
    api.getState as any,
    api as any
  );
  state.current = initial;
  return { state, api };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recurringSlice', () => {
  describe('initial state', () => {
    it('starts with empty ids and entities', () => {
      const { state } = makeHarness();
      expect(state.current.recurring.ids).toEqual([]);
      expect(state.current.recurring.entities).toEqual({});
    });
  });

  describe('loadRecurring', () => {
    it('populates ids and entities from the repository', async () => {
      const r1 = makeRule({ id: 1 });
      const r2 = makeRule({ id: 2, descripcion: 'Alquiler' });
      mockedRepo.getActive.mockResolvedValueOnce([r1, r2]);
      const { state } = makeHarness();
      await act(async () => {
        await state.current.loadRecurring();
      });
      expect(state.current.recurring.ids).toEqual([1, 2]);
      expect(state.current.recurring.entities[1]).toBe(r1);
      expect(state.current.recurring.entities[2]).toBe(r2);
      expect(mockedRepo.getActive).toHaveBeenCalledTimes(1);
    });

    it('replaces the previous list (does not merge)', async () => {
      const old = makeRule({ id: 99 });
      const fresh = makeRule({ id: 1 });
      mockedRepo.getActive.mockResolvedValueOnce([old]);
      const { state } = makeHarness();
      await state.current.loadRecurring();
      mockedRepo.getActive.mockResolvedValueOnce([fresh]);
      await state.current.loadRecurring();
      expect(state.current.recurring.ids).toEqual([1]);
      expect(state.current.recurring.entities[99]).toBeUndefined();
    });

    it('records an error message on failure but does not throw', async () => {
      mockedRepo.getActive.mockRejectedValueOnce(new Error('db down'));
      const { state } = makeHarness();
      await state.current.loadRecurring();
      expect(state.current.recurring.ids).toEqual([]);
      expect(state.current.lastError).toBe('Failed to load recurring rules');
    });
  });

  describe('addRecurringRule', () => {
    it('optimistically inserts with a negative placeholder id', async () => {
      mockedRepo.add.mockResolvedValueOnce(7);
      const { state } = makeHarness();
      const input = makeInput();
      let returned: RecurringTransaction | undefined;
      await act(async () => {
        returned = await state.current.addRecurringRule(input);
      });
      expect(returned!.id).toBe(7);
      // After the repo resolves, ids must contain the real id (7), not the
      // negative placeholder. Entities contain the real rule.
      expect(state.current.recurring.ids).toContain(7);
      expect(state.current.recurring.ids.every((id: number) => id >= 0)).toBe(true);
      expect(state.current.recurring.entities[7]).toMatchObject({
        id: 7,
        monto: 100000,
        descripcion: 'Sueldo',
        frequency: 'monthly',
      });
    });

    it('removes the placeholder on rejection (rollback)', async () => {
      mockedRepo.add.mockRejectedValueOnce(new Error('FK violation'));
      const { state } = makeHarness();
      await expect(
        state.current.addRecurringRule(makeInput())
      ).rejects.toThrow('FK violation');
      // The placeholder must NOT remain in the state.
      const placeholders = state.current.recurring.ids.filter(
        (id: number) => id < 0
      );
      expect(placeholders).toEqual([]);
      expect(state.current.recurring.entities).toEqual({});
      expect(state.current.lastError).toBe('Failed to add recurring rule');
    });
  });

  describe('updateRecurringRule', () => {
    it('optimistically patches the entity in the map', async () => {
      mockedRepo.update.mockResolvedValueOnce(undefined);
      const r1 = makeRule({ id: 1, monto: 1000 });
      mockedRepo.getActive.mockResolvedValueOnce([r1]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await state.current.updateRecurringRule(1, { monto: 2000 });

      // Optimistic update visible immediately.
      expect(state.current.recurring.entities[1].monto).toBe(2000);
      // Repo was called with the partial.
      expect(mockedRepo.update).toHaveBeenCalledWith(1, { monto: 2000 });
    });

    it('restores the original entity on rejection', async () => {
      mockedRepo.update.mockRejectedValueOnce(new Error('SQL constraint'));
      const r1 = makeRule({ id: 1, monto: 1000 });
      mockedRepo.getActive.mockResolvedValueOnce([r1]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await expect(
        state.current.updateRecurringRule(1, { monto: 2000 })
      ).rejects.toThrow('SQL constraint');

      // The rollback must restore the original monto.
      expect(state.current.recurring.entities[1].monto).toBe(1000);
      expect(state.current.lastError).toBe('Failed to update recurring rule');
    });
  });

  describe('deleteRecurringRule', () => {
    it('removes the rule from ids and entities, and soft-deletes in the DB', async () => {
      mockedRepo.softDelete.mockResolvedValueOnce(undefined);
      const r1 = makeRule({ id: 1 });
      const r2 = makeRule({ id: 2 });
      mockedRepo.getActive.mockResolvedValueOnce([r1, r2]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await state.current.deleteRecurringRule(1);

      expect(state.current.recurring.ids).toEqual([2]);
      expect(state.current.recurring.entities[1]).toBeUndefined();
      expect(mockedRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('restores the rule on rejection', async () => {
      mockedRepo.softDelete.mockRejectedValueOnce(new Error('FK in use'));
      const r1 = makeRule({ id: 1 });
      mockedRepo.getActive.mockResolvedValueOnce([r1]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await expect(
        state.current.deleteRecurringRule(1)
      ).rejects.toThrow('FK in use');

      // The rule must be back in the state.
      expect(state.current.recurring.ids).toContain(1);
      expect(state.current.recurring.entities[1]).toEqual(r1);
      expect(state.current.lastError).toBe('Failed to delete recurring rule');
    });
  });

  describe('toggleRecurringRule', () => {
    it('optimistically flips active to the new value', async () => {
      mockedRepo.toggle.mockResolvedValueOnce(undefined);
      const r1 = makeRule({ id: 1, active: 1 });
      mockedRepo.getActive.mockResolvedValueOnce([r1]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await state.current.toggleRecurringRule(1, false);

      expect(state.current.recurring.entities[1].active).toBe(0);
      expect(mockedRepo.toggle).toHaveBeenCalledWith(1, false);
    });

    it('flips active back to the original value on rejection', async () => {
      mockedRepo.toggle.mockRejectedValueOnce(new Error('DB locked'));
      const r1 = makeRule({ id: 1, active: 1 });
      mockedRepo.getActive.mockResolvedValueOnce([r1]);
      const { state } = makeHarness();
      await state.current.loadRecurring();

      await expect(
        state.current.toggleRecurringRule(1, false)
      ).rejects.toThrow('DB locked');

      expect(state.current.recurring.entities[1].active).toBe(1);
      expect(state.current.lastError).toBe('Failed to toggle recurring rule');
    });
  });
});
