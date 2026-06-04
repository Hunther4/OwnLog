import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinanceStore, Transaction } from '../types/master';
import { createTransactionSlice } from './slices/transactionSlice';
import { createUISlice } from './slices/uiSlice';
import { createRecurringSlice } from './slices/recurringSlice';
import SQLiteEngine from '../database/SQLiteEngine';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { QuickActionRepository } from '../repositories/QuickActionRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { PerformanceMonitor } from '../utils/performance';
import { log, warn } from '../utils/log';

export const useBoundStore = create<FinanceStore>()(
  persist(
    (set, get, api) => ({
      ...createTransactionSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...createRecurringSlice(set, get, api),

      currentBalance: 0,
      currency: 'CLP',
      isDbInitialized: false,
      isInitializing: false,
      lastError: null,
      categories: [],
      appOpenCount: 0,
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
            set((state) => {
              const filteredCategories = [];
              for (const c of state.categories) {
                if (c.id !== id) {
                  filteredCategories.push(c);
                }
              }
              return {
                categories: filteredCategories,
              };
            });
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
        const state = get();
        const count = (state.appOpenCount || 0) + 1;
        set({ appOpenCount: count });
        await SettingsRepository.setSetting('app_open_count', count.toString());

        // Run a one-time performance audit on the third open. We do NOT
        // reset the counter here — resetting to 0 caused the onboarding
        // gate to re-fire on every launch (the persisted value would loop
        // 0→1→2→3→0 across launches). The audit only needs to run once;
        // subsequent opens with count > 3 are a no-op for the audit.
        if (count === 3) {
          try {
            const limits = PerformanceMonitor.getThresholds();
            console.debug('[Performance] Thresholds:', limits);
          } catch (err) {
            warn('[incrementAppOpens] Auditoría falló:', err);
          }
        }

        return count;
      },

      // Hybrid hydration: restore from AsyncStorage (zustand persist) then sync from SQLite
      hydrate: async () => {
        // Guard: skip if already hydrating
        const state = get();
        if (state.isInitializing || state.isDbInitialized) {
          log('[useBoundStore] Already initialized or initializing, skipping hydrate');
          return;
        }
        // BUGFIX (TOCTOU race): set isInitializing=true BEFORE any await so a
        // second concurrent caller of hydrate() will hit the guard above
        // and bail out. Previously, two parallel hydrates both passed the
        // guard and the second `set()` could clobber the first.
        set({ isInitializing: true, lastError: null });

        try {

          // OPTIMIZATION: parallelize independent reads. Two batches because
          // cached_balance is used to decide whether to write the new one back.
          const [balance, cachedBalance, recentTxs, quickActions, categories, uiSettings] =
            await Promise.all([
              TransactionRepository.getTotalBalance(),
              SettingsRepository.getSetting('cached_balance'),
              TransactionRepository.getLastN(20),
              QuickActionRepository.getAll(),
              CategoryRepository.getAll(),
              SettingsRepository.getMany([
                'theme_mode',
                'selected_currency',
                'haptics_enabled',
              ]),
            ]);

          // Use SQLite-computed balance if different from cached
          if (cachedBalance) {
            const cached = parseInt(cachedBalance, 10);
            if (!isNaN(cached) && cached !== balance) {
              log('[useBoundStore] SQLite balance differs from cached, syncing...');
              // Fire-and-forget; not on critical path
              void SettingsRepository.setSetting('cached_balance', balance.toString());
            }
          }

          // Load recent transactions for Recent Transactions screen
          const txIds: number[] = [];
          const txEntities: Record<number, Transaction> = {};
           for (const tx of recentTxs) {
             txIds.push(tx.id);
             txEntities[tx.id] = tx;
           }

          const themeModeSetting = uiSettings['theme_mode'];
          const currencySetting = uiSettings['selected_currency'];
          const hapticsSetting = uiSettings['haptics_enabled'];

          const themeMode = (themeModeSetting === 'dark' || themeModeSetting === 'light')
            ? themeModeSetting as 'dark' | 'light'
            : 'dark';
          const currency = (currencySetting as 'CLP' | 'USD' | 'EUR') || 'CLP';
          const hapticsEnabled = hapticsSetting === 'true';

          set({
            currentBalance: balance,
            isDbInitialized: true,
            transactions: { ids: txIds, entities: txEntities },
            quickActions: quickActions,
            categories: categories,
            themeMode,
            currency,
            hapticsEnabled,
            isInitializing: false,
          });

          // Recurring rules (v1.2.20) are SQLite-backed and re-hydrated
          // on every boot. We hydrate them AFTER the main set() so the
          // user sees the rest of the app immediately, even if the
          // recurring read is slow on a low-end device. The scheduler
          // tick (PR #2) and the upcoming-runs preview (PR #3) attach
          // to this state.
          await get().loadRecurring();

          log(
            '[useBoundStore] ✅ Hydrated balance, transactions, recurring rules, and quick actions from SQLite'
          );
        } catch (error) {
          console.error('[useBoundStore] ❌ Hydration failed:', error);
          set({
            isInitializing: false,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          // Fire-and-forget analytics; not on the boot critical path.
          try {
            void get().incrementAppOpens();
          } catch (err) {
            warn('[useBoundStore] incrementAppOpens falló:', err);
          }
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
           for (const tx of recentTxs) {
             entities[tx.id] = tx;
           }

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
          log('[Store] Predictive cache populated');
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
          // Reset DB first
          await SQLiteEngine.resetDatabase();
          // CRITICAL: Force hydration guard to re-evaluate.
          // The hydrate() guard at line 91 skips if isDbInitialized=true,
          // so we must reset that flag before calling hydrate().
          set({
            isDbInitialized: false,
            isInitializing: false,
            currentBalance: 0,
            transactions: { ids: [], entities: {} },
            filteredIds: [],
            quickActions: [],
            categories: [],
            reports: { categoryTotals: [], monthlyTrend: [] },
            recurring: { ids: [], entities: {} },
          });
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
      partialize: (state) => {
        // SQLite-backed slices (transactions, recurring) and the
        // derived reports view are NOT persisted through AsyncStorage
        // — they are re-hydrated from SQLite on every boot. Only UI
        // settings and counters survive a cold start.
        const { transactions, reports, recurring, ...persistable } = state;
        return persistable;
      },
    }
  )
);
