import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinanceStore } from '../types/master';
import { createTransactionSlice } from './slices/transactionSlice';
import { createUISlice } from './slices/uiSlice';
import SQLiteEngine from '../database/SQLiteEngine';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { QuickActionRepository } from '../repositories/QuickActionRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { useShallow } from 'zustand/react/shallow';

export const useBoundStore = create<FinanceStore>()(
  persist(
    (set, get, api) => ({
      ...createTransactionSlice(set, get, api),
      ...createUISlice(set, get, api),

      currentBalance: 0,
      currency: 'CLP',
      isDbInitialized: false,
      isInitializing: false,
      lastError: null,
      categories: [],
      reports: {
        categoryTotals: [],
        monthlyTrend: [],
      },
      themeMode: 'dark',
      hapticsEnabled: false,
      quickActions: [],

      // Estos métodos deben estar implementados en los slices o aquí
      deleteCategory: async (id) => {
        try {
          await CategoryRepository.delete(id);
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
          }));
          await get().syncBalance();
        } catch (e) {
          set({ lastError: 'Failed to delete category' });
        }
      },
      setBudget: async (categoryId, amount) => {
        try {
          const monthYear = new Date().toISOString().slice(0, 7);
          await SQLiteEngine.setBudget(categoryId, amount, monthYear);
        } catch (e) {
          set({ lastError: 'Failed to set budget' });
        }
      },

      incrementAppOpens: async () => {
        try {
          const row = await SettingsRepository.getSetting('app_open_count');
          const currentCount = row ? parseInt(row, 10) : 0;
          const newCount = currentCount + 1;
          await SettingsRepository.setSetting('app_open_count', newCount.toString());
          return newCount;
        } catch (error) {
          return 0;
        }
      },

      // Hybrid hydration: restore from AsyncStorage (zustand persist) then sync from SQLite
      hydrate: async () => {
        try {
          // Sync balance from SQLite to ensure consistency (source of truth)
          const balance = await TransactionRepository.getTotalBalance();
          const cachedBalance = await SettingsRepository.getSetting('cached_balance');

          // Use SQLite-computed balance if different from cached
          if (cachedBalance) {
            const cached = parseInt(cachedBalance, 10);
            if (!isNaN(cached) && cached !== balance) {
              console.log('[useBoundStore] SQLite balance differs from cached, syncing...');
              await SettingsRepository.setSetting('cached_balance', balance.toString());
            }
          }

          // Load recent transactions for Recent Transactions screen
          const recentTxs = await TransactionRepository.getLastN(20);
          const txIds: number[] = [];
          const txEntities: Record<number, any> = {};
          recentTxs.forEach((tx) => {
            txIds.push(tx.id);
            txEntities[tx.id] = tx;
          });

          // Load quick actions
          const quickActions = await QuickActionRepository.getAll();

          // Load categories
          const categories = await CategoryRepository.getAll();

          set({
            currentBalance: balance,
            isDbInitialized: true,
            transactions: { ids: txIds, entities: txEntities },
            quickActions: quickActions,
            categories: categories,
          });
          console.log(
            '[useBoundStore] ✅ Hydrated balance, transactions, and quick actions from SQLite'
          );
        } catch (error) {
          console.error('[useBoundStore] ❌ Hydration failed:', error);
          set({ lastError: 'Failed to hydrate', isDbInitialized: false });
        }
      },

      setInitialBalance: async (amount?: number) => {
        try {
          // If amount provided, set initial balance (used during first setup)
          if (amount !== undefined) {
            await SettingsRepository.setSetting('cached_balance', amount.toString());
            set({ currentBalance: amount });
            return;
          }

          // Otherwise, do predictive cache population (prefetch for faster UI)
          const recentTxs = await TransactionRepository.getLastN(100);
          const entities = { ...get().transactions.entities };
          recentTxs.forEach((tx) => {
            entities[tx.id] = tx;
          });

          const [categoryTotals, monthlyTrend] = await Promise.all([
            ReportRepository.getCategoryTotals(),
            ReportRepository.getMonthlyTrend(),
          ]);

          set({
            transactions: {
              ...get().transactions,
              entities,
            },
            reports: {
              categoryTotals,
              monthlyTrend,
            },
          });
          console.log('[Store] Predictive cache populated');
        } catch (error) {
          console.error('[Store] Prefetch error:', error);
        }
      },

      prefetchPredictiveData: async () => {
        // Alias to setInitialBalance without amount to trigger prefetch
        // Use undefined to trigger prefetch logic
        await get().setInitialBalance(undefined as unknown as number);
      },

      syncBalance: async () => {
        try {
          const balance = await TransactionRepository.getTotalBalance();
          set({ currentBalance: balance });
        } catch (error) {
          set({ lastError: 'Failed to sync balance' });
        }
      },

      loadQuickActions: async () => {
        try {
          const actions = await QuickActionRepository.getAll();
          set({ quickActions: actions });
        } catch (error) {
          set({ lastError: 'Failed to load quick actions' });
        }
      },

      updateQuickAction: async (id, updates) => {
        try {
          await QuickActionRepository.update(id, updates);
          await get().loadQuickActions();
        } catch (error) {
          set({ lastError: 'Failed to update quick action' });
        }
      },

      resetAllData: async () => {
        try {
          await SQLiteEngine.resetDatabase();
          await get().hydrate();
        } catch (error) {
          set({ lastError: 'Failed to reset data' });
        }
      },

      fetchReports: async () => {
        try {
          const [categoryTotals, monthlyTrend] = await Promise.all([
            ReportRepository.getCategoryTotals(),
            ReportRepository.getMonthlyTrend(),
          ]);

          set({
            reports: {
              categoryTotals,
              monthlyTrend,
            },
          });
        } catch (error) {
          set({ lastError: 'Failed to fetch reports' });
        }
      },

      addCategory: async (category) => {
        try {
          const id = await CategoryRepository.add(category);
          set((state) => ({
            categories: [...state.categories, { ...category, id }],
          }));
          return id;
        } catch (error) {
          set({ lastError: 'Failed to add category' });
          throw error;
        }
      },

      updateCategory: async (id, updates) => {
        try {
          await CategoryRepository.update(id, updates);
          const categories = await CategoryRepository.getAll();
          set({ categories });
        } catch (error) {
          set({ lastError: 'Failed to update category' });
        }
      },

      getSpendingForCategoryInMonth: async (categoryId: number) => {
        const monthYear = new Date().toISOString().slice(0, 7);
        return await TransactionRepository.getSumForMonth(monthYear, categoryId);
      },
      getBudgetForCategory: async (categoryId: number) => {
        try {
          const monthYear = new Date().toISOString().slice(0, 7);
          return await SQLiteEngine.getBudget(categoryId, monthYear);
        } catch (error) {
          return null;
        }
      },
    }),
    {
      name: 'finance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
