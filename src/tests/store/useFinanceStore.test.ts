import { useFinanceStore } from '../../store/useFinanceStore';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  executeInTransaction: jest.fn(),
  executeSql: jest.fn(),
}));

describe('useFinanceStore', () => {
  it('should perform surgical rollback on failure', async () => {
    // 1. Mock SQLiteEngine.executeInTransaction to fail for the first transaction
    (SQLiteEngine.executeInTransaction as jest.Mock)
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce('success');

    // 2. Setup initial state (need to set initial state manually)
    useFinanceStore.setState({
      categories: [
        { id: 1, tipo: 'egreso', nombre: 'Test', emoji: '💸', color_hex: '#000', activa: true },
      ],
      transactions: [],
      currentBalance: 1000,
    });

    // 3. Add 2 transactions
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

    // Act
    try {
      await useFinanceStore.getState().addTransaction(tx1);
    } catch (e) {}
    await useFinanceStore.getState().addTransaction(tx2);

    // Assert
    const state = useFinanceStore.getState();
    // After fail, tx1 should be removed and balance reverted
    // After pass, tx2 should be added and balance updated
    expect(state.transactions.length).toBe(1);
    expect(state.transactions[0].descripcion).toBe('Pass');
    expect(state.currentBalance).toBe(800); // 1000 - 200
  });
});
