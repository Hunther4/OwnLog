import { useBoundStore } from '../../store/useBoundStore';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { CategoryRepository } from '../../repositories/CategoryRepository';
import { QuickActionRepository } from '../../repositories/QuickActionRepository';
import { SettingsRepository } from '../../repositories/SettingsRepository';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
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

jest.mock('../../repositories/ReportRepository', () => ({
  ReportRepository: {
    getCategoryTotals: jest.fn().mockResolvedValue([]),
    getMonthlyTrend: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    setBudget: jest.fn(),
    getBudget: jest.fn(),
    resetDatabase: jest.fn(),
  },
}));

const setupState = (overrides: Record<string, any> = {}) => {
  useBoundStore.setState({
    categories: [],
    transactions: { ids: [], entities: {} },
    filteredIds: [],
    currentBalance: 0,
    _lastTransactionTime: 0,
    lastError: null,
    isDbInitialized: false,
    isInitializing: false,
    quickActions: [],
    reports: { categoryTotals: [], monthlyTrend: [] },
    ...overrides,
  });
};

describe('useBoundStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupState();
  });

  // --- Existing test (fixed: reset _lastTransactionTime after failed add) ---
  it('should perform surgical rollback on failure', async () => {
    (TransactionRepository.add as jest.Mock)
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce(999);

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'Test', emoji: '💸', color_hex: '#000', activa: true },
      ],
      transactions: { ids: [], entities: {} },
      filteredIds: [],
      currentBalance: 1000,
      _lastTransactionTime: 0,
    });

    const tx1 = {
      monto: 100,
      fecha_utc: '...',
      fecha_local: '...',
      categoria_id: 1,
      descripcion: 'Fail',
    };
    const tx2 = {
      monto: 200,
      fecha_utc: '...',
      fecha_local: '...',
      categoria_id: 1,
      descripcion: 'Pass',
    };

    try { await useBoundStore.getState().addTransaction(tx1); } catch (e) {}
    // Reset rate limiter after failed call
    useBoundStore.setState({ _lastTransactionTime: 0 });
    await useBoundStore.getState().addTransaction(tx2);

    const state = useBoundStore.getState();
    expect(state.transactions.ids.length).toBe(1);
    expect(state.transactions.entities[state.transactions.ids[0]]?.descripcion).toBe('Pass');
    expect(state.currentBalance).toBe(800);
  });

  // --- Balance delta by type ---
  it('should add income and increase balance', async () => {
    (TransactionRepository.add as jest.Mock).mockResolvedValue(99);

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'ingreso', nombre: 'Sueldo', emoji: '💰', color_hex: '#0F0', activa: true },
      ],
      transactions: { ids: [], entities: {} },
      filteredIds: [],
      currentBalance: 1000,
      _lastTransactionTime: 0,
    });

    await useBoundStore.getState().addTransaction({
      monto: 500,
      fecha_utc: '...',
      fecha_local: '...',
      categoria_id: 1,
      descripcion: 'Salario',
    });

    const state = useBoundStore.getState();
    expect(state.currentBalance).toBe(1500);
  });

  it('should add expense and decrease balance', async () => {
    (TransactionRepository.add as jest.Mock).mockResolvedValue(5);

    useBoundStore.setState({
      categories: [
        { id: 2, tipo: 'egreso', nombre: 'Comida', emoji: '🍕', color_hex: '#F00', activa: true },
      ],
      transactions: { ids: [], entities: {} },
      filteredIds: [],
      currentBalance: 2000,
      _lastTransactionTime: 0,
    });

    await useBoundStore.getState().addTransaction({
      monto: 300,
      fecha_utc: '...',
      fecha_local: '...',
      categoria_id: 2,
      descripcion: 'Almuerzo',
    });

    expect(useBoundStore.getState().currentBalance).toBe(1700);
  });

  // --- Rate limiting ---
  it('should rate-limit transactions (3-second minimum)', async () => {
    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'T', emoji: 'X', color_hex: '#000', activa: true },
      ],
      _lastTransactionTime: Date.now(),
    });

    await expect(
      useBoundStore.getState().addTransaction({
        monto: 100,
        fecha_utc: '...',
        fecha_local: '...',
        categoria_id: 1,
        descripcion: 'Rápido',
      })
    ).rejects.toThrow('Espera un momento');
  });

  // --- Add category ---
  it('should add category and append to state', async () => {
    (CategoryRepository.add as jest.Mock).mockResolvedValue(10);

    const category = {
      nombre: 'Nueva',
      tipo: 'egreso' as const,
      emoji: '🆕',
      color_hex: '#ABC',
      activa: true,
    };

    const id = await useBoundStore.getState().addCategory(category);
    expect(id).toBe(10);

    const state = useBoundStore.getState();
    expect(state.categories).toHaveLength(1);
    expect(state.categories[0].id).toBe(10);
    expect(state.categories[0].nombre).toBe('Nueva');
  });

  // --- Delete category ---
  it('should delete category and sync balance', async () => {
    (CategoryRepository.delete as jest.Mock).mockResolvedValue(undefined);
    (TransactionRepository.getTotalBalance as jest.Mock).mockResolvedValue(500);

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'A', emoji: 'A', color_hex: '#111', activa: true },
        { id: 2, tipo: 'ingreso', nombre: 'B', emoji: 'B', color_hex: '#222', activa: true },
      ],
      currentBalance: 0,
    });

    await useBoundStore.getState().deleteCategory(1);

    const state = useBoundStore.getState();
    expect(state.categories).toHaveLength(1);
    expect(state.categories[0].id).toBe(2);
    expect(state.currentBalance).toBe(500);
  });

  // --- syncBalance ---
  it('should syncBalance from repository', async () => {
    (TransactionRepository.getTotalBalance as jest.Mock).mockResolvedValue(9999);

    await useBoundStore.getState().syncBalance();

    expect(useBoundStore.getState().currentBalance).toBe(9999);
  });

  // --- getMonthlySummary ---
  it('should compute getMonthlySummary with current month', async () => {
    (TransactionRepository.getMonthlyTotals as jest.Mock).mockResolvedValue({
      income: 5000,
      expense: 2000,
    });

    const result = await useBoundStore.getState().getMonthlySummary();

    expect(result).toEqual({ income: 5000, expense: 2000 });
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(TransactionRepository.getMonthlyTotals).toHaveBeenCalledWith(expectedMonth);
  });

  // --- fetchTransactionsPaged ---
  it('should paginate using filteredIds.length as offset', async () => {
    (TransactionRepository.getAll as jest.Mock)
      .mockResolvedValueOnce([
        { id: 10, monto: 100, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'p1' },
        { id: 11, monto: 200, fecha_utc: '...', fecha_local: '...', categoria_id: 2, descripcion: 'p2' },
      ]);

    useBoundStore.setState({
      filteredIds: [1, 2, 3], // cursor = 3
      transactions: { ids: [1, 2, 3], entities: {} },
      filters: { categoryId: null },
    });

    const count = await useBoundStore.getState().fetchTransactionsPaged();
    expect(count).toBe(2);
    expect(TransactionRepository.getAll).toHaveBeenCalledWith(
      { categoryId: null },
      100,
      3
    );

    const state = useBoundStore.getState();
    expect(state.filteredIds).toHaveLength(5);
  });

  // --- setFilters ---
  it('should reset pagination on setFilters', async () => {
    (TransactionRepository.getAll as jest.Mock).mockResolvedValue([
      { id: 5, monto: 50, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'f' },
    ]);

    useBoundStore.setState({
      filters: { categoryId: null },
      filteredIds: [1, 2, 3, 4],
      transactions: { ids: [1, 2, 3, 4], entities: {} },
    });

    await useBoundStore.getState().setFilters({ categoryId: 3 });

    // should query with offset=0
    expect(TransactionRepository.getAll).toHaveBeenCalledWith(
      { categoryId: 3 },
      100,
      0
    );

    const state = useBoundStore.getState();
    expect(state.filteredIds).toHaveLength(1);
  });

  // --- deleteTransaction --- (existing tests remain)
  it('should delete transaction optimistically', async () => {
    (TransactionRepository.delete as jest.Mock).mockResolvedValue(undefined);

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'T', emoji: 'X', color_hex: '#000', activa: true },
      ],
      transactions: {
        ids: [10, 20],
        entities: {
          10: { id: 10, monto: 300, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'X' },
          20: { id: 20, monto: 100, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'Y' },
        },
      },
      filteredIds: [10, 20],
      currentBalance: 500,
    });

    await useBoundStore.getState().deleteTransaction(10);

    const state = useBoundStore.getState();
    expect(state.transactions.ids).toEqual([20]);
    expect(state.filteredIds).toEqual([20]);
    expect(state.currentBalance).toBe(800); // 500 - (-300) = 800
  });

  it('should rollback delete on failure', async () => {
    (TransactionRepository.delete as jest.Mock).mockRejectedValue(new Error('Fail'));

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'T', emoji: 'X', color_hex: '#000', activa: true },
      ],
      transactions: {
        ids: [10, 20],
        entities: {
          10: { id: 10, monto: 100, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'X' },
          20: { id: 20, monto: 50, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'Y' },
        },
      },
      filteredIds: [10, 20],
      currentBalance: 1000,
    });

    await expect(
      useBoundStore.getState().deleteTransaction(10)
    ).rejects.toThrow('Fail');

    const state = useBoundStore.getState();
    expect(state.transactions.ids).toContain(10);
    expect(state.currentBalance).toBe(1000);
  });

  // --- updateTransaction ---
  it('should update transaction and refresh filteredIds', async () => {
    (TransactionRepository.update as jest.Mock).mockResolvedValue(undefined);
    (TransactionRepository.getAll as jest.Mock).mockResolvedValue([
      { id: 10, monto: 999, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'Updated' },
    ]);

    useBoundStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'T', emoji: 'X', color_hex: '#000', activa: true },
      ],
      transactions: {
        ids: [10],
        entities: {
          10: { id: 10, monto: 100, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'Old' },
        },
      },
      filteredIds: [10],
      filters: { categoryId: null },
    });

    await useBoundStore.getState().updateTransaction(10, { monto: 999, descripcion: 'Updated' });

    const state = useBoundStore.getState();
    expect(state.transactions.entities[10]?.monto).toBe(999);
    expect(state.transactions.entities[10]?.descripcion).toBe('Updated');
    expect(TransactionRepository.update).toHaveBeenCalledWith(10, { monto: 999, descripcion: 'Updated' });
  });

  // --- setInitialBalance ---
  it('should set initial balance from provided amount', async () => {
    await useBoundStore.getState().setInitialBalance(5000);

    expect(SettingsRepository.setSetting).toHaveBeenCalledWith('cached_balance', '5000');
    expect(useBoundStore.getState().currentBalance).toBe(5000);
  });

  it('should set initial balance to 0', async () => {
    await useBoundStore.getState().setInitialBalance(0);

    expect(SettingsRepository.setSetting).toHaveBeenCalledWith('cached_balance', '0');
    expect(useBoundStore.getState().currentBalance).toBe(0);
  });

  // --- hydrate ---
  it('should hydrate from SQLite (hybrid hydration)', async () => {
    (TransactionRepository.getTotalBalance as jest.Mock).mockResolvedValue(1500);
    (SettingsRepository.getSetting as jest.Mock).mockResolvedValueOnce('1000'); // cached_balance
    (SettingsRepository.getMany as jest.Mock).mockResolvedValue({
      theme_mode: 'dark',
      selected_currency: 'USD',
      haptics_enabled: 'true',
    });
    (TransactionRepository.getLastN as jest.Mock).mockResolvedValue([
      { id: 1, monto: 500, fecha_utc: '...', fecha_local: '...', categoria_id: 1, descripcion: 'Salario' },
    ]);
    (QuickActionRepository.getAll as jest.Mock).mockResolvedValue([
      { id: 1, nombre: 'Pagar', emoji: '💸', categoria_id: 2 },
    ]);
    (CategoryRepository.getAll as jest.Mock).mockResolvedValue([
      { id: 1, tipo: 'ingreso', nombre: 'Sueldo', emoji: '💰', color_hex: '#0F0', activa: true },
    ]);

    useBoundStore.setState({
      isDbInitialized: false,
      isInitializing: false,
      currentBalance: 0,
      transactions: { ids: [], entities: {} },
      quickActions: [],
      categories: [],
      themeMode: 'light',
      currency: 'CLP',
      hapticsEnabled: false,
    });

    await useBoundStore.getState().hydrate();

    const state = useBoundStore.getState();
    expect(state.isDbInitialized).toBe(true);
    expect(state.currentBalance).toBe(1500);
    expect(state.currency).toBe('USD');
    expect(state.hapticsEnabled).toBe(true);
    expect(state.themeMode).toBe('dark');
    expect(state.transactions.ids).toHaveLength(1);
    expect(state.categories).toHaveLength(1);
    expect(state.quickActions).toHaveLength(1);
  });

  it('should skip hydrate if already initialized', async () => {
    useBoundStore.setState({ isDbInitialized: true, isInitializing: false });

    await useBoundStore.getState().hydrate();

    // Should not have called any repository methods
    expect(TransactionRepository.getTotalBalance).not.toHaveBeenCalled();
    expect(TransactionRepository.getLastN).not.toHaveBeenCalled();
  });

  // --- fetchReports ---
  it('should fetch reports from repository', async () => {
    const { ReportRepository } = require('../../repositories/ReportRepository');
    (ReportRepository.getCategoryTotals as jest.Mock).mockResolvedValue([
      { nombre: 'Comida', total: 500, color: '#F00', tipo: 'egreso' },
    ]);
    (ReportRepository.getMonthlyTrend as jest.Mock).mockResolvedValue([
      { month: '2025-01', total: 1000 },
    ]);

    useBoundStore.setState({
      reports: { categoryTotals: [], monthlyTrend: [] },
    });

    await useBoundStore.getState().fetchReports();

    const state = useBoundStore.getState();
    expect(state.reports.categoryTotals).toHaveLength(1);
    expect(state.reports.monthlyTrend).toHaveLength(1);
  });
});
