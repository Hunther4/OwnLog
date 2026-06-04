import { computeNextDate } from '../../recurring/computeNext';

describe('computeNextDate', () => {
  it('should calculate daily recurrence', () => {
    const last = '2026-06-04';
    const next = computeNextDate(last, 'daily', 1);
    expect(next).toBe('2026-06-05');
  });

  it('should clamp monthly recurrence to month end', () => {
    // Jan 31 + 1 month = Feb 28
    const last = '2026-01-31';
    const next = computeNextDate(last, 'monthly', 1);
    expect(next).toBe('2026-02-28');
  });
});
