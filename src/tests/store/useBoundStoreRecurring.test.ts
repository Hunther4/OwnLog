import { useBoundStore } from '../../store/useBoundStore';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { CategoryRepository } from '../../repositories/CategoryRepository';
import { QuickActionRepository } from '../../repositories/QuickActionRepository';
import { SettingsRepository } from '../../repositories/SettingsRepository';
import { RecurringRepository } from '../../repositories/RecurringRepository';
import type { RecurringTransaction } from '../../recurring/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../repositories/TransactionRepository', () => ({
  TransactionRepository: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
    getLastN: jest.fn().mockResolvedValue([]),
    getTotalBalance: jest.fn().mockResolvedValue(0),
    getSumForMonth: jest.fn().mockResolvedValue(0),
    getMonthlyTotals: jest.fn().mockResolvedValue({ income: 0, expense: 0 }),
  },
}));

jest.mock('../../repositories/CategoryRepository', () => ({
  CategoryRepository: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../repositories/QuickActionRepository', () => ({
  QuickActionRepository: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../repositories/SettingsRepository', () => ({
  SettingsRepository: {
    getSetting: jest.fn().mockResolvedValue(null),
    setSetting: jest.fn().mockResolvedValue(undefined),
    getMany: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../repositories/RecurringRepository', () => ({
  RecurringRepository: {
    getActive: jest.fn().mockResolvedValue([]),
    getById: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    toggle: jest.fn(),
    markRun: jest.fn(),
  },
}));

const mockedRecurring = RecurringRepository as jest.Mocked<
  typeof RecurringRepository
>;

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

describe('useBoundStore.hydrate() — recurring slice wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the bound store's persisted state between tests by re-loading
    // the module fresh — jest.resetModules() gives us a clean store each
    // time so the hydrate guard (isDbInitialized) doesn't skip our call.
    jest.isolateModules(() => {
      jest.resetModules();
      // re-mock repos in the fresh module graph
      jest.doMock('../../repositories/TransactionRepository', () => ({
        TransactionRepository: {
          getAll: jest.fn().mockResolvedValue([]),
          getLastN: jest.fn().mockResolvedValue([]),
          getTotalBalance: jest.fn().mockResolvedValue(0),
        },
      }));
      jest.doMock('../../repositories/CategoryRepository', () => ({
        CategoryRepository: { getAll: jest.fn().mockResolvedValue([]) },
      }));
      jest.doMock('../../repositories/QuickActionRepository', () => ({
        QuickActionRepository: { getAll: jest.fn().mockResolvedValue([]) },
      }));
      jest.doMock('../../repositories/SettingsRepository', () => ({
        SettingsRepository: {
          getSetting: jest.fn().mockResolvedValue(null),
          setSetting: jest.fn().mockResolvedValue(undefined),
          getMany: jest.fn().mockResolvedValue({}),
        },
      }));
    });
  });

  it('starts with an empty recurring slice', () => {
    const state = useBoundStore.getState();
    expect(state.recurring).toBeDefined();
    expect(state.recurring.ids).toEqual([]);
    expect(state.recurring.entities).toEqual({});
  });

  it('exposes the recurring action surface on the bound store', () => {
    const state = useBoundStore.getState();
    expect(typeof state.loadRecurring).toBe('function');
    expect(typeof state.addRecurringRule).toBe('function');
    expect(typeof state.updateRecurringRule).toBe('function');
    expect(typeof state.deleteRecurringRule).toBe('function');
    expect(typeof state.toggleRecurringRule).toBe('function');
  });

  it('loadRecurring populates the bound store from the repository', async () => {
    const r1 = makeRule({ id: 1 });
    const r2 = makeRule({ id: 2, descripcion: 'Alquiler' });
    mockedRecurring.getActive.mockResolvedValueOnce([r1, r2]);

    await useBoundStore.getState().loadRecurring();

    const state = useBoundStore.getState();
    expect(state.recurring.ids).toEqual([1, 2]);
    expect(state.recurring.entities[1]).toEqual(r1);
    expect(state.recurring.entities[2]).toEqual(r2);
  });
});
