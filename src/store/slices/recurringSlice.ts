import { StateCreator } from 'zustand';
import { FinanceStore } from '../../types/master';
import { RecurringRepository } from '../../repositories/RecurringRepository';
import {
  RecurringTransaction,
  RecurringTransactionInput,
} from '../../recurring/types';

/**
 * Shape of the normalized `recurring` state. Mirrors the `transactions`
 * shape from `transactionSlice` so the UI can swap one for the other
 * with no mental model shift.
 */
export interface RecurringState {
  ids: number[];
  entities: Record<number, RecurringTransaction>;
}

/**
 * Public surface of the recurring slice. PR #1 only ships the five
 * CRUD-ish actions; the scheduler tick (`runSchedulerTick`,
 * `refreshUpcomingPreview`) and the upcoming preview itself land in
 * PR #2 / #3.
 */
export interface RecurringSlice {
  recurring: RecurringState;
  loadRecurring: () => Promise<void>;
  addRecurringRule: (
    input: RecurringTransactionInput
  ) => Promise<RecurringTransaction>;
  updateRecurringRule: (
    id: number,
    partial: Partial<RecurringTransactionInput>
  ) => Promise<void>;
  deleteRecurringRule: (id: number) => Promise<void>;
  toggleRecurringRule: (id: number, active: boolean) => Promise<void>;
}

/**
 * Optimistic-update helper. The slice uses a negative placeholder id
 * (the inverse of the current timestamp + a small random offset) so
 * the UI can render the rule instantly while the DB INSERT resolves.
 * On success, the placeholder is swapped for the real auto-increment
 * id. On error, the placeholder is removed.
 */
function makePlaceholderId(): number {
  return -(Date.now() + Math.random());
}

/**
 * Slice factory. Follows the same `StateCreator<FinanceStore, [], [], Slice>`
 * pattern as `createTransactionSlice` so the bound store can compose it
 * with a simple spread (`...createRecurringSlice(set, get, api)`).
 *
 * The slice does NOT import the scheduler (PR #2) or the upcoming preview
 * (PR #3). All actions are synchronous state changes around an async
 * repository call, with optimistic update + rollback on rejection
 * (project standard from AGENTS.md).
 */
export const createRecurringSlice: StateCreator<
  FinanceStore,
  [],
  [],
  RecurringSlice
> = (set, get) => ({
  recurring: {
    ids: [],
    entities: {},
  },

  loadRecurring: async () => {
    try {
      const rules = await RecurringRepository.getActive();
      const ids: number[] = [];
      const entities: Record<number, RecurringTransaction> = {};
      for (const r of rules) {
        ids.push(r.id);
        entities[r.id] = r;
      }
      set({ recurring: { ids, entities } });
    } catch (error) {
      console.error('[RecurringSlice] loadRecurring failed:', error);
      set({ lastError: 'Failed to load recurring rules' });
    }
  },

  addRecurringRule: async (input) => {
    // Optimistic insert with a negative placeholder id so the UI can
    // render the new rule immediately.
    const placeholderId = makePlaceholderId();
    const optimistic: RecurringTransaction = {
      ...input,
      id: placeholderId,
      active: 1,
      last_run_date: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      recurring: {
        ids: [placeholderId, ...state.recurring.ids],
        entities: { ...state.recurring.entities, [placeholderId]: optimistic },
      },
    }));

    try {
      const realId = await RecurringRepository.add(input);
      const real: RecurringTransaction = { ...optimistic, id: realId };
      set((state) => {
        const ids = state.recurring.ids.map((id) =>
          id === placeholderId ? realId : id
        );
        const { [placeholderId]: _drop, ...rest } = state.recurring.entities;
        return {
          recurring: {
            ids,
            entities: { ...rest, [realId]: real },
          },
        };
      });
      return real;
    } catch (error) {
      // Rollback: remove the placeholder, surface the error.
      set((state) => {
        const { [placeholderId]: _drop, ...rest } = state.recurring.entities;
        return {
          recurring: {
            ids: state.recurring.ids.filter((id) => id !== placeholderId),
            entities: rest,
          },
          lastError: 'Failed to add recurring rule',
        };
      });
      throw error;
    }
  },

  updateRecurringRule: async (id, partial) => {
    const state = get();
    const original = state.recurring.entities[id];
    if (!original) {
      const err = new Error('Recurring rule not found');
      set({ lastError: 'Failed to update recurring rule' });
      throw err;
    }
    const merged = { ...original, ...partial };

    // Optimistic patch.
    set((s) => ({
      recurring: {
        ...s.recurring,
        entities: { ...s.recurring.entities, [id]: merged },
      },
    }));

    try {
      await RecurringRepository.update(id, partial);
    } catch (error) {
      // Rollback: restore the original entity.
      set((s) => ({
        recurring: {
          ...s.recurring,
          entities: { ...s.recurring.entities, [id]: original },
        },
        lastError: 'Failed to update recurring rule',
      }));
      throw error;
    }
  },

  deleteRecurringRule: async (id) => {
    const state = get();
    const original = state.recurring.entities[id];
    if (!original) {
      // Already gone — treat as a no-op success.
      return;
    }

    // Optimistic remove from ids and entities.
    set((s) => {
      const { [id]: _drop, ...rest } = s.recurring.entities;
      return {
        recurring: {
          ids: s.recurring.ids.filter((rid) => rid !== id),
          entities: rest,
        },
      };
    });

    try {
      await RecurringRepository.softDelete(id);
    } catch (error) {
      // Rollback: restore the original rule to the top of the list.
      set((s) => ({
        recurring: {
          ids: [id, ...s.recurring.ids],
          entities: { ...s.recurring.entities, [id]: original },
        },
        lastError: 'Failed to delete recurring rule',
      }));
      throw error;
    }
  },

  toggleRecurringRule: async (id, active) => {
    const state = get();
    const original = state.recurring.entities[id];
    if (!original) {
      const err = new Error('Recurring rule not found');
      set({ lastError: 'Failed to toggle recurring rule' });
      throw err;
    }
    const newActive: 0 | 1 = active ? 1 : 0;
    const merged = { ...original, active: newActive };

    set((s) => ({
      recurring: {
        ...s.recurring,
        entities: { ...s.recurring.entities, [id]: merged },
      },
    }));

    try {
      await RecurringRepository.toggle(id, active);
    } catch (error) {
      set((s) => ({
        recurring: {
          ...s.recurring,
          entities: { ...s.recurring.entities, [id]: original },
        },
        lastError: 'Failed to toggle recurring rule',
      }));
      throw error;
    }
  },
});
