import { customAlphabet } from 'nanoid';

// Sin 0/O/1/I para evitar confusión. 8 chars = ~36 bits
export const makeRefCode = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  8,
);
