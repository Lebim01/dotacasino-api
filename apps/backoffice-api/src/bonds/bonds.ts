import { Memberships } from '../types';

export enum Bonds {
  DIRECT = 'bond_direct',
  BINARY = 'bond_binary',
  REWARD = 'bond_rewards',
  RANK = 'bond_rank',
  RESIDUAL = 'bond_residual',
}

export const withdraw_percent_fee: Record<Memberships, number> = {
  'p-100': 0.1,
  'p-500': 0.07,
  'p-1000': 0.05,
};

/**
 * Porcentaje de ganancia bono directo
 */
export const direct_percent = 0.08;

export const messages: Record<Bonds, string> = {
  bond_direct: 'Bono Directo',
  bond_binary: 'Bono Binario',
  bond_rewards: 'Bono Rendimiento',
  bond_rank: 'Bono Rango',
  bond_residual: 'Bono Residual',
};

export const levels_percent = [
  0.05, 0.02, 0.01, 0.008, 0.007, 0.006, 0.005, 0.004, 0.003, 0.002, 0.0015,
  0.001,
];
