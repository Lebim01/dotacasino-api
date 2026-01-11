import ShortUniqueId from 'short-unique-id';

const uid = new ShortUniqueId({
  dictionary: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''),
});

// Sin 0/O/1/I para evitar confusión. 8 chars = ~36 bits
export const makeRefCode = () => uid.rnd(8);

