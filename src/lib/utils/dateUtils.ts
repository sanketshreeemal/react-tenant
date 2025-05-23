import { Timestamp } from 'firebase/firestore';

/**
 * Formats a date for display purposes only (no calculations)
 * Uses the browser's locale for consistent display
 */
export const formatDisplayDate = (date: Date | Timestamp | string | null): string => {
  if (!date) return '';
  
  const normalizedDate = normalizeDate(date);
  return normalizedDate.toLocaleDateString();
};

/**
 * Normalizes different date formats into a consistent Date object
 * Uses noon time to avoid timezone boundary issues
 */
export const normalizeDate = (date: Date | Timestamp | string | null): Date => {
  if (!date) return new Date();

  if (date instanceof Timestamp) {
    return date.toDate();
  }

  if (typeof date === 'string') {
    // Handle YYYY-MM-DD format
    const [year, month, day] = date.split('-').map(Number);
    // Set time to noon to avoid timezone issues
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  if (date instanceof Date) {
    // Ensure time is set to noon
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0
    );
  }

  return new Date();
};

/**
 * Formats a date range for display (e.g., lease periods)
 */
export const formatDateRange = (startDate: Date | Timestamp | string | null, endDate: Date | Timestamp | string | null): string => {
  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
};

/**
 * Converts a Date object to a Firestore Timestamp
 * Ensures consistent storage format
 */
export const dateToTimestamp = (date: Date | null): Timestamp => {
  if (!date) return Timestamp.now();
  const normalizedDate = normalizeDate(date);
  return Timestamp.fromDate(normalizedDate);
}; 