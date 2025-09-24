import { Ranks } from '../ranks/ranks_object';
import { Memberships } from '../types';

/**
 * Puntos que ganas al inscribir un paquete
 */
export const pack_points: Record<Memberships, number> = {
  'free': 0,
  'p-100': 100,
  'p-500': 500,
  'p-1000': 1000,
};

export const binary_percent: Record<Ranks, number> = {
  none: 0.07,
  contructor: 0.07,
  director: 0.07,
  director_premier: 0.07,
  embajador: 0.07,
  diamante: 0.08,
  diamante_ejecutivo: 0.08,
  diamante_premier: 0.08,
  diamante_negro: 0.09,
  diamante_corona: 0.09,
  diamante_royal: 0.1,
};

export const getBinaryPercent = (rank: Ranks) => {
  return binary_percent[rank];
};
