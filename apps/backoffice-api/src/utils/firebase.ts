import dayjs from 'dayjs';

/**
 * Converts a date value to ISO string.
 * Supports both Firestore Timestamp objects ({ seconds }) and native Date objects.
 */
export const dateToString = (date: any) => {
  if (!date) return null;
  // Legacy Firestore Timestamp support during transition period
  if (date?.seconds) return dayjs(date.seconds * 1000).toISOString();
  return dayjs(date).toISOString();
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
