import { RecurringScheduler } from '../../recurring/scheduler';
import { RecurringRepository } from '../../repositories/RecurringRepository';
import { useBoundStore } from '../../store/useBoundStore';

jest.mock('../../repositories/RecurringRepository');
jest.mock('../../store/useBoundStore');

describe('RecurringScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not create transactions if no active rules exist', async () => {
    (RecurringRepository.getActive as jest.Mock).mockResolvedValue([]);
    await RecurringScheduler.getInstance().tick();
    expect(RecurringRepository.getActive).toHaveBeenCalled();
  });

  it('should materialize transactions for a due rule', async () => {
    const nowStr = new Date().toISOString().split('T')[0];
    const lastRun = new Date(new Date(nowStr).getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 40 days ago
    
    const rule = { id: 1, monto: 100, categoria_id: 1, descripcion: 'Rent', frequency: 'monthly', start_date: lastRun, last_run_date: lastRun, active: 1, deleted_at: null };
    (RecurringRepository.getActive as jest.Mock).mockResolvedValue([rule]);
    
    const addTransactionSpy = jest.fn();
    (useBoundStore.getState as jest.Mock).mockReturnValue({
      addTransaction: addTransactionSpy,
    });

    await RecurringScheduler.getInstance().tick();
    
    // Monthly from 40 days ago should produce exactly 1 run
    expect(addTransactionSpy).toHaveBeenCalledTimes(1);
    expect(RecurringRepository.markRun).toHaveBeenCalledWith(1, expect.any(String));
  });

  it('should cap missed runs at 30', async () => {
    const rule = { id: 1, monto: 100, categoria_id: 1, descripcion: 'Debt', frequency: 'daily', start_date: '2025-01-01', last_run_date: '2025-01-01', active: 1, deleted_at: null };
    (RecurringRepository.getActive as jest.Mock).mockResolvedValue([rule]);
    
    const addTransactionSpy = jest.fn();
    (useBoundStore.getState as jest.Mock).mockReturnValue({
      addTransaction: addTransactionSpy,
    });

    await RecurringScheduler.getInstance().tick();
    
    expect(addTransactionSpy).toHaveBeenCalledTimes(30);
  });
});
