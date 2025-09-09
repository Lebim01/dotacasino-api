import dayjs from 'dayjs';

export const dateToString = (date: any) => {
  if (!date) return null;
  return dayjs(date.seconds * 1000).toISOString();
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
