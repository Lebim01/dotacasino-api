import { HttpException } from '@nestjs/common';

export const errorHandler = (
  error: any,
  genericMessage?: string,
  genericStatusCode?: number,
) => {
  if (error.message && error.status) {
    throw new HttpException(error.message, error.status);
  }
  throw new HttpException(
    genericMessage || 'INTERNAL_SERVER_ERROR',
    genericStatusCode || 500,
  );
};
