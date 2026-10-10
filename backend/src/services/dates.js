// All deadlines are treated in Indian Standard Time.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' in IST for a given moment.
export function istDate(date) {
  return new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// A deadline given as a date means "until the end of that day in India".
export function deadlineFromDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) return null;
  const d = new Date(`${dateString}T23:59:59+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isClosed(deadline, now = new Date()) {
  return new Date(deadline).getTime() < now.getTime();
}

// Whole calendar days until the deadline. 0 means it closes today.
export function daysLeft(deadline, now = new Date()) {
  return Math.round((Date.parse(istDate(deadline)) - Date.parse(istDate(now))) / DAY_MS);
}
