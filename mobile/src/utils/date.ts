/**
 * Helper utilities to standardize date format to DD-MM-YYYY across the app.
 */

export function getTodayDDMMYYYY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatDateToDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return getTodayDDMMYYYY();
  }

  const trimmed = dateStr.trim();

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  // Attempt JS Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  return trimmed;
}

export function parseDDMMYYYY(str?: string | null): Date {
  if (!str) return new Date();

  const trimmed = str.trim();

  // Check if DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return !isNaN(d.getTime()) ? d : new Date();
  }

  // Check if YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return !isNaN(d.getTime()) ? d : new Date();
  }

  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d : new Date();
}
