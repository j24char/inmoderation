// Utility functions for processing user drink data and calculating statistics

/**
 * Normalize a date (Date or date-string) to ISO date (YYYY-MM-DD) string in UTC.
 * Returns null for invalid dates.
 */
function toIsoDateString(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * processDailyTotals(records)
 * - records: array of objects with at least { date, quantity }
 * Returns an array of { date: 'YYYY-MM-DD', quantity: number } where quantity
 * is the total quantity for that date. Dates are unique and sorted ascending.
 */
export function processDailyTotals(records = []) {
  const map = new Map();

  for (const rec of records) {
    if (!rec) continue;
    const rawDate = rec.date ?? rec.datetime ?? rec.timestamp;
    const qty = Number(rec.quantity ?? rec.qty ?? 0);
    const iso = toIsoDateString(rawDate);
    if (!iso) continue; // skip invalid dates

    const prev = map.get(iso) ?? 0;
    map.set(iso, prev + (Number.isFinite(qty) ? qty : 0));
  }

  // Convert map to sorted array
  const result = Array.from(map.entries())
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * averageLast7Days(processedData, options)
 * - processedData: array returned from processDailyTotals
 * - options (optional): { referenceDate: Date|string }
 * Returns the average quantity per day over the last 7 calendar days (including referenceDate).
 * Missing days count as zero in the average calculation.
 */
export function averageLast7Days(processedData = [], options = {}) {
  return averageLastNDays(processedData, 7, options);
}

/**
 * averageLastNDays(processedData, n = 7, options)
 * - processedData: array returned from processDailyTotals
 * - n: number of days to average (including referenceDate)
 * - options (optional): { referenceDate: Date|string }
 * Returns the average quantity per day over the last n calendar days (including referenceDate).
 * Missing days count as zero in the average calculation.
 */
export function averageLastNDays(processedData = [], n = 7, options = {}) {
  const ref = options.referenceDate ? new Date(options.referenceDate) : new Date();
  if (isNaN(ref.getTime())) throw new Error('Invalid referenceDate');

  // Build a lookup for quick access
  const lookup = new Map(processedData.map((p) => [p.date, p.quantity]));

  // Gather last n days (including ref)
  const totals = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const q = lookup.get(iso) ?? 0;
    totals.push(q);
  }

  const sum = totals.reduce((s, v) => s + v, 0);
  const avg = sum / n;
  return avg;
}

/**
 * weekOverWeekChange(processedData)
 * - processedData: array returned from processDailyTotals
 * Returns the percentage change in total quantity between the last 7 days
 * and the previous 7 days.
 */
export function weekOverWeekChange(data) {
  if (data.length < 14) return null;

  const last7 = data.slice(-7);
  const prev7 = data.slice(-14, -7);

  const sumLast = last7.reduce((s, d) => s + d.quantity, 0);
  const sumPrev = prev7.reduce((s, d) => s + d.quantity, 0);

  if (sumPrev === 0) return null;

  return ((sumLast - sumPrev) / sumPrev) * 100;
}

/**
 * longestZeroStreak(processedData)
 * - processedData: array returned from processDailyTotals
 * Returns the longest consecutive streak of zero quantities.
 */
export function longestZeroStreak(data) {
  let longest = 0;
  let current = 0;

  data.forEach(d => {
    if ((Number(d.quantity) || 0) === 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });

  return longest;
}

/**
 * daysSinceLastDrink(data)
 * - data: array of { date, quantity } sorted ascending by date
 * Returns the number of days since the last drink.
 */
export function daysSinceLastDrink(data) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  for (let i = data.length - 1; i >= 0; i--) {
    if ((Number(data[i].quantity)) > 0) {
      return Math.floor((new Date(todayIso) - new Date(data[i].date)) / (1000 * 60 * 60 * 24));
    }
  }
  return data.length; // never drank
}


export default {
  processDailyTotals,
  averageLast7Days,
  averageLastNDays,
  weekOverWeekChange,
  longestZeroStreak,
  daysSinceLastDrink,
};
