export type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom_days';

export function computeNextDate(lastDateStr: string, frequency: Frequency, intervalDays: number | null): string {
  const [year, month, day] = lastDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'monthly': {
      const originalDay = date.getUTCDate();
      const targetMonth = date.getUTCMonth() + 1;
      
      date.setUTCDate(1);
      date.setUTCMonth(targetMonth);
      
      const lastDayOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
      break;
    }
    case 'custom_days':
      if (intervalDays) {
        date.setUTCDate(date.getUTCDate() + intervalDays);
      }
      break;
  }

  return date.toISOString().split('T')[0];
}
