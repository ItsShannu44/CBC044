export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });

// 'YYYY-MM-DD' in India time, for date inputs.
export const istDateInput = (d) => new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function deadlineText(s) {
  if (s.closed) return `Closed on ${formatDate(s.deadline)}`;
  if (s.daysLeft === 0) return 'Closes today';
  if (s.daysLeft === 1) return 'Closes tomorrow';
  if (s.daysLeft <= 7) return `${s.daysLeft} days left`;
  return `Closes ${formatDate(s.deadline)}`;
}

export const fileSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
