import dayjs from 'dayjs';

export function formatMoney(
  value: number | string | null | undefined,
  compact = false,
): string {
  if (value == null || value === '') return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';

  if (compact && Math.abs(num) >= 100000) {
    const lakh = num / 100000;
    return `\u20B9${lakh.toFixed(1)}L`;
  }
  if (compact && Math.abs(num) >= 1000) {
    const k = num / 1000;
    return `\u20B9${k.toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value == null || value === '') return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(
  date: string | Date | null | undefined,
  format = 'DD MMM YYYY',
): string {
  if (!date) return '\u2014';
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '\u2014';
  return dayjs(date).format('DD MMM YYYY, hh:mm A');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '\u2014';
  const d = dayjs(date);
  const now = dayjs();
  const diffMin = now.diff(d, 'minute');
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = now.diff(d, 'hour');
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = now.diff(d, 'day');
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.format('DD MMM YYYY');
}

export function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return isNaN(value) ? fallback : value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
