import balanceChecksum from '../../utils/balanceChecksum';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  getFirst: jest.fn(),
  executeSql: jest.fn(),
}));

describe('balanceChecksum', () => {
  it('should detect drift if cached balance differs from computed', async () => {
    (SQLiteEngine.getFirst as jest.Mock)
      .mockResolvedValueOnce({ total: 5000 }) // computeActualBalance
      .mockResolvedValueOnce({ value: '4000' }); // getCachedBalance

    const isBalanced = await balanceChecksum.auditBalance();
    expect(isBalanced).toBe(false);
  });

  it('should pass if drift is within limits (1 CLP)', async () => {
    (SQLiteEngine.getFirst as jest.Mock)
      .mockResolvedValueOnce({ total: 5000 }) // computeActualBalance
      .mockResolvedValueOnce({ value: '5001' }); // getCachedBalance

    const isBalanced = await balanceChecksum.auditBalance();
    expect(isBalanced).toBe(true);
  });
});
