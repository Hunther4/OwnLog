import { ReportRepository } from '../../repositories/ReportRepository';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

describe('ReportRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategoryTotals', () => {
    it('should group by category and assign colors', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { category: 'Supermercado', total: 50000, tipo: 'egreso' },
        { category: 'Sueldo', total: 200000, tipo: 'ingreso' },
      ]);

      const result = await ReportRepository.getCategoryTotals();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        nombre: 'Supermercado',
        total: 50000,
        tipo: 'egreso',
        color: '#36A2EB',
      });
      expect(result[1]).toEqual({
        nombre: 'Sueldo',
        total: 200000,
        tipo: 'ingreso',
        color: '#4caf50',
      });
    });

    it('should return empty array when no data', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([]);

      const result = await ReportRepository.getCategoryTotals();
      expect(result).toEqual([]);
    });
  });

  describe('getMonthlyTrend', () => {
    it('should return last 6 months of net totals', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { month: '2026-05', total: 15000 },
        { month: '2026-04', total: -5000 },
        { month: '2026-03', total: 20000 },
        { month: '2026-02', total: 0 },
        { month: '2026-01', total: 10000 },
        { month: '2025-12', total: 8000 },
      ]);

      const result = await ReportRepository.getMonthlyTrend();

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ month: '2026-05', total: 15000 });
      expect(result[5]).toEqual({ month: '2025-12', total: 8000 });
    });

    it('should return fewer than 6 if less data exists', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { month: '2026-05', total: 5000 },
      ]);

      const result = await ReportRepository.getMonthlyTrend();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no data', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([]);

      const result = await ReportRepository.getMonthlyTrend();
      expect(result).toEqual([]);
    });
  });
});
