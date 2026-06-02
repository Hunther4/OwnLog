import { StateCreator } from 'zustand';
import { Transaction, FinanceStore } from '../../types/master';
import { TransactionRepository } from '../../repositories/TransactionRepository';

export const createTransactionSlice: StateCreator<
  FinanceStore,
  [],
  [],
  {
    transactions: {
      ids: number[];
      entities: Record<number, Transaction>;
    };
    filteredIds: number[];
    filters: { categoryId: number | null; startDate?: string; endDate?: string };
    _lastTransactionTime: number;
    hydrate: () => Promise<void>;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;
    setFilters: (newFilters: Partial<{ categoryId: number | null; startDate?: string; endDate?: string }>) => Promise<void>;
    fetchTransactionsPaged: () => Promise<number>;
    updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
    getMonthlySummary: () => Promise<{ income: number; expense: number }>;
  }
> = (set, get) => ({
  transactions: {
    ids: [],
    entities: {},
  },
  filteredIds: [],
  filters: {
    categoryId: null,
    startDate: undefined,
    endDate: undefined,
  },
  _lastTransactionTime: 0,

  hydrate: async () => {
    try {
      const transactionsArray = await TransactionRepository.getAll();
      
      const ids: number[] = [];
      const entities: Record<number, Transaction> = {};
      
       for (const tx of transactionsArray) {
         ids.push(tx.id);
         entities[tx.id] = tx;
       }

      set({ 
        transactions: { ids, entities }, 
        filteredIds: ids,
      });
    } catch (error) {
      console.error('[TransactionSlice] Hydration failed:', error);
      set({ lastError: 'Failed to load data' });
    }
  },

  addTransaction: async (tx) => {
    // Rate limit: sólo 1 transacción cada 3 segundos
    const now = Date.now();
    if (get()._lastTransactionTime && now - get()._lastTransactionTime < 3000) {
      throw new Error('Espera un momento antes de agregar otra transacción');
    }

    // Validate amount is positive (BEFORE consuming the rate-limit window
    // so a typo doesn't lock the user out of an immediate retry).
    if (!tx.monto || tx.monto <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const state = get();
    const category = state.categories.find(c => c.id === tx.categoria_id);
    if (!category) throw new Error('Category not found');

    // All validation passed — now consume the rate-limit window.
    set({ _lastTransactionTime: now });

    const delta = category.tipo === 'ingreso' ? tx.monto : -tx.monto;
    const tempId = -(Date.now() + Math.random());
    const optimisticTx = { ...tx, id: tempId };
    const previousBalance = state.currentBalance;

    // Optimistic Update: O(1) injection
    set((state) => ({
      transactions: {
        ids: [tempId, ...state.transactions.ids],
        entities: { ...state.transactions.entities, [tempId]: optimisticTx },
      },
      filteredIds: [tempId, ...state.filteredIds],
      currentBalance: previousBalance + delta,
    }));

    try {
      const realId = await TransactionRepository.add(tx);
      
       set((state) => {
         const { ids, entities } = state.transactions;
         const newIds = [];
         for (const id of ids) {
           newIds.push(id === tempId ? realId : id);
         }
         const newEntities = { ...entities };
         newEntities[realId] = { ...optimisticTx, id: realId };
         delete newEntities[tempId];

         const newFilteredIds = [];
         for (const id of state.filteredIds) {
           newFilteredIds.push(id === tempId ? realId : id);
         }

         return {
           transactions: { ids: newIds, entities: newEntities },
           filteredIds: newFilteredIds,
         };
       });
    } catch (error) {
       set((state) => {
         const newEntities = { ...state.transactions.entities };
         delete newEntities[tempId];
         
         const filteredIds = [];
         for (const id of state.transactions.ids) {
           if (id !== tempId) filteredIds.push(id);
         }
         
         const filteredFilteredIds = [];
         for (const id of state.filteredIds) {
           if (id !== tempId) filteredFilteredIds.push(id);
         }

          return {
            transactions: {
              ids: filteredIds,
              entities: newEntities,
            },
            filteredIds: filteredFilteredIds,
            currentBalance: previousBalance,
            lastError: 'Failed to save transaction',
          };
       });
       // Reconcile with database truth to prevent drift
       try { await get().syncBalance(); } catch {}
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    const state = get();
    const tx = state.transactions.entities[id];
    if (!tx) throw new Error('Transaction not found');
    
    const category = state.categories.find(c => c.id === tx.categoria_id);
    if (!category) throw new Error('Category not found');
    
    const delta = category.tipo === 'ingreso' ? tx.monto : -tx.monto;

    // Optimistic Delete: O(1) removal
    set((state) => {
      const { ids, entities } = state.transactions;
      const newEntities = { ...entities };
      delete newEntities[id];
      
      return {
        transactions: {
          ids: ids.filter(tid => tid !== id),
          entities: newEntities,
        },
        filteredIds: state.filteredIds.filter(tid => tid !== id),
        currentBalance: state.currentBalance - delta,
      };
    });

    try {
      await TransactionRepository.delete(id);
    } catch (error) {
      set((state) => ({
        transactions: {
          ids: [id, ...state.transactions.ids],
          entities: { ...state.transactions.entities, [id]: tx },
        },
        filteredIds: [id, ...state.filteredIds],
        currentBalance: state.currentBalance + delta,
        lastError: 'Failed to delete transaction',
      }));
      // Reconcile with database truth to prevent drift
      try { await get().syncBalance(); } catch {}
      throw error;
    }
  },

  setFilters: async (newFilters) => {
    const currentFilters = { ...get().filters, ...newFilters };
    try {
      const rows = await TransactionRepository.getAll(currentFilters, 100, 0);
      
      const ids: number[] = [];
      const newEntities: Record<number, Transaction> = {};
      
       for (const tx of rows) {
         ids.push(tx.id);
         newEntities[tx.id] = tx;
       }

      set((state) => ({
        filters: currentFilters,
        filteredIds: ids,
        transactions: {
          ids: [...new Set([...state.transactions.ids, ...ids])],
          entities: { ...state.transactions.entities, ...newEntities },
        },
      }));
    } catch (error) {
      set({ lastError: 'Failed to update filters' });
    }
  },

  fetchTransactionsPaged: async () => {
    const { filters, filteredIds } = get();
    const offset = filteredIds.length;
    try {
      const newTransactions = await TransactionRepository.getAll(filters, 100, offset);
      
      const newIds: number[] = [];
      const newEntities: Record<number, Transaction> = {};
      
       for (const tx of newTransactions) {
         newIds.push(tx.id);
         newEntities[tx.id] = tx;
       }

      set((state) => ({
        filteredIds: [...state.filteredIds, ...newIds],
        transactions: {
          ids: [...state.transactions.ids, ...newIds],
          entities: { ...state.transactions.entities, ...newEntities },
        },
      }));
      return newTransactions.length;
    } catch (error) {
      set({ lastError: 'Failed to load more transactions' });
      return 0;
    }
  },

  updateTransaction: async (id, updates) => {
    await TransactionRepository.update(id, updates);
    
    // Update entity optimistically
    set((state) => {
      const tx = state.transactions.entities[id];
      if (!tx) return state;
      
      return {
        transactions: {
          ...state.transactions,
          entities: {
            ...state.transactions.entities,
            [id]: { ...tx, ...updates },
          },
        },
      };
    });

    await get().setFilters(get().filters);
  },

  getMonthlySummary: async () => {
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { income, expense } = await TransactionRepository.getMonthlyTotals(monthYear);
      return { income, expense };
    } catch (error) {
      console.error('[transactionSlice] Failed to get monthly summary:', error);
      return { income: 0, expense: 0 };
    }
  },
});
