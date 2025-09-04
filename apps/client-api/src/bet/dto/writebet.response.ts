export type WriteBetApiResponse = Success | Error;

type Success = {
  status: 'success';
  login: string;
  balance: string;
  currency: string;
  operationId: string;
};

type Error = {
  status: 'fail';
  error: '';
};
