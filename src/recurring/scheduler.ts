import { RecurringRepository } from '../repositories/RecurringRepository';
import { useBoundStore } from '../store/useBoundStore';
import { computeNextDate, Frequency } from './computeNext';

export class RecurringScheduler {
  private static instance: RecurringScheduler;
  private isTicking = false;

  private constructor() {}

  public static getInstance(): RecurringScheduler {
    if (!RecurringScheduler.instance) {
      RecurringScheduler.instance = new RecurringScheduler();
    }
    return RecurringScheduler.instance;
  }

  public async tick(): Promise<void> {
    if (this.isTicking) {
      console.debug('[RecurringScheduler] Tick already in progress, skipping');
      return;
    }

    this.isTicking = true;
    try {
      const activeRules = await RecurringRepository.getActive();
      const nowStr = new Date().toISOString().split('T')[0];

      for (const rule of activeRules) {
        let lastRun = rule.last_run_date || rule.start_date;
        let missedRuns = 0;
        const MAX_MISSED_RUNS = 30;

        while (true) {
          const nextDue = computeNextDate(lastRun, rule.frequency as Frequency, rule.interval_days);
          
          if (nextDue > nowStr || missedRuns >= MAX_MISSED_RUNS) {
            break;
          }

          // Materialize transaction
          try {
            await useBoundStore.getState().addTransaction({
              monto: rule.monto,
              categoria_id: rule.categoria_id,
              descripcion: `[Recurrente] ${rule.descripcion}`,
              fecha_local: nextDue,
              fecha_utc: new Date(nextDue).toISOString(),
            });

            // Update rule's last run date
            await RecurringRepository.markRun(rule.id, nextDue);
            lastRun = nextDue;
            missedRuns++;
          } catch (error) {
            console.error(`[RecurringScheduler] Failed to process run for rule ${rule.id} on ${nextDue}:`, error);
            break; // Stop this rule for now to avoid infinite loops on bad data
          }
        }
      }
    } catch (error) {
      console.error('[RecurringScheduler] Critical tick failure:', error);
    } finally {
      this.isTicking = false;
    }
  }
}
