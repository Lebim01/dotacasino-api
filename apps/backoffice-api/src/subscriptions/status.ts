import dayjs from 'dayjs';

export const isExpired = (expires_at: { seconds: number } | null) => {
  if (!expires_at) return true;
  const date = dayjs(expires_at.seconds * 1000);
  const is_active = date.isValid() && date.isAfter(dayjs());
  return !is_active;
};
