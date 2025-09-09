export const validatePageAndLimit = (page: number, limit: number) => {
  if (page < 1) return { message: 'Page cannot be less than 1' };
  if (limit < 1) return { message: 'Limit cannot be less than 1' };
  if (limit > 500) return { message: 'Max page size is 500' };
  return null;
};
