import { Memberships } from './types';

export const ADMIN_USER = 'L6eYPuVkOhYwRaITWcuq';

export const EMAIL_SENDER = 'soporte@giborcommunity.com';

export const emailTransporter = {
  host: 'mail.privateemail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: EMAIL_SENDER,
    pass: 'giborcommunity.com.2024',
  },
};

export const memberships_object: Record<Memberships, any> = {
  'p-100': {
    display: 'P100',
  },
  'p-500': {
    display: 'P500',
  },
  'p-1000': {
    display: 'P1000',
  },
};

export const MEMBERSHIP_PRICES: Record<Memberships, number> = {
  'p-100': 100,
  'p-500': 500,
  'p-1000': 1000,
};

export const PACK_POINTS: Record<Memberships, number> = {
  'p-100': 100,
  'p-500': 500,
  'p-1000': 1000,
};
