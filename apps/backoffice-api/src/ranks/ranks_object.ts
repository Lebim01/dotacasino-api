import { binary_percent } from '../binary/binary_packs';

export enum Ranks {
  NONE = 'none',
  CONSTRUCTOR = 'contructor',
  DIRECTOR = 'director',
  DIRECTOR_PREMIER = 'director_premier',
  EMBAJADOR = 'embajador',
  DIAMANTE = 'diamante',
  DIAMANTE_EJECUTIVO = 'diamante_ejecutivo',
  DIAMANTE_PREMIER = 'diamante_premier',
  DIAMANTE_NEGRO = 'diamante_negro',
  DIAMANTE_CORONA = 'diamante_corona',
  DIAMANTE_ROYAL = 'diamante_royal',
}

export const ranksPoints: Record<Ranks, number> = {
  [Ranks.DIAMANTE_ROYAL]: 8_000_000,
  [Ranks.DIAMANTE_CORONA]: 5_000_000,
  [Ranks.DIAMANTE_NEGRO]: 1_500_000,
  [Ranks.DIAMANTE_PREMIER]: 600_000,
  [Ranks.DIAMANTE_EJECUTIVO]: 300_000,
  [Ranks.DIAMANTE]: 150_000,
  [Ranks.EMBAJADOR]: 60_000,
  [Ranks.DIRECTOR_PREMIER]: 30_000,
  [Ranks.DIRECTOR]: 15_000,
  [Ranks.CONSTRUCTOR]: 5000,
  [Ranks.NONE]: 0,
};

export const ranksOrder = [
  Ranks.CONSTRUCTOR,
  Ranks.DIRECTOR,
  Ranks.DIRECTOR_PREMIER,
  Ranks.EMBAJADOR,
  Ranks.DIAMANTE,
  Ranks.DIAMANTE_EJECUTIVO,
  Ranks.DIAMANTE_PREMIER,
  Ranks.DIAMANTE_NEGRO,
  Ranks.DIAMANTE_CORONA,
  Ranks.DIAMANTE_ROYAL,
];

export type RankDetail = {
  display: string;
  key: Ranks;
  order: number;
  ranks: Ranks[][];
  points: number;
  start_points: number;
  bonus: number;
  binary_percent: number;
};

const sumTo = (rank: Ranks) => {
  const indexOf = ranksOrder.indexOf(rank);
  const points = ranksOrder
    .slice(0, indexOf)
    .reduce((a, b) => a + ranksPoints[b], 0);
  return points;
};

export const ranks_object: Record<Ranks, RankDetail> = {
  [Ranks.NONE]: {
    display: 'Emprendedor',
    key: Ranks.NONE,
    order: -1,
    ranks: [],
    start_points: 0,
    points: ranksPoints[Ranks.NONE],
    binary_percent: binary_percent[Ranks.NONE],
    bonus: 0,
  },
  [Ranks.CONSTRUCTOR]: {
    display: 'Constructor',
    key: Ranks.CONSTRUCTOR,
    order: 0,
    ranks: [],
    start_points: sumTo(Ranks.CONSTRUCTOR),
    points: ranksPoints[Ranks.CONSTRUCTOR],
    binary_percent: binary_percent[Ranks.CONSTRUCTOR],
    bonus: 50,
  },
  [Ranks.DIRECTOR]: {
    display: 'Director',
    key: Ranks.DIRECTOR,
    order: 1,
    ranks: [],
    start_points: sumTo(Ranks.DIRECTOR),
    points: ranksPoints[Ranks.DIRECTOR],
    binary_percent: binary_percent[Ranks.DIRECTOR],
    bonus: 200,
  },
  [Ranks.DIRECTOR_PREMIER]: {
    display: 'Director Premier',
    key: Ranks.DIRECTOR_PREMIER,
    order: 2,
    ranks: [],
    start_points: sumTo(Ranks.DIRECTOR_PREMIER),
    points: ranksPoints[Ranks.DIRECTOR_PREMIER],
    binary_percent: binary_percent[Ranks.DIRECTOR_PREMIER],
    bonus: 400,
  },
  [Ranks.EMBAJADOR]: {
    display: 'Embajador',
    key: Ranks.EMBAJADOR,
    order: 3,
    ranks: [],
    start_points: sumTo(Ranks.EMBAJADOR),
    points: ranksPoints[Ranks.EMBAJADOR],
    binary_percent: binary_percent[Ranks.EMBAJADOR],
    bonus: 800,
  },
  [Ranks.DIAMANTE]: {
    display: 'Diamante',
    key: Ranks.DIAMANTE,
    order: 4,
    ranks: [],
    start_points: sumTo(Ranks.DIAMANTE),
    points: ranksPoints[Ranks.DIAMANTE],
    binary_percent: binary_percent[Ranks.DIAMANTE],
    bonus: 1500,
  },
  [Ranks.DIAMANTE_EJECUTIVO]: {
    display: 'Diamante Ejecutivo',
    key: Ranks.DIAMANTE_EJECUTIVO,
    order: 5,
    ranks: [],
    start_points: sumTo(Ranks.DIAMANTE_EJECUTIVO),
    points: ranksPoints[Ranks.DIAMANTE_EJECUTIVO],
    binary_percent: binary_percent[Ranks.DIAMANTE_EJECUTIVO],
    bonus: 4000,
  },
  [Ranks.DIAMANTE_PREMIER]: {
    display: 'Diamante Premier',
    key: Ranks.DIAMANTE_PREMIER,
    order: 6,
    ranks: [
      [Ranks.DIAMANTE_EJECUTIVO, Ranks.DIAMANTE_EJECUTIVO],
      [Ranks.DIAMANTE_EJECUTIVO],
    ],
    start_points: sumTo(Ranks.DIAMANTE_PREMIER),
    points: ranksPoints[Ranks.DIAMANTE_PREMIER],
    binary_percent: binary_percent[Ranks.DIAMANTE_PREMIER],
    bonus: 8000,
  },
  [Ranks.DIAMANTE_NEGRO]: {
    display: 'Diamante Negro',
    key: Ranks.DIAMANTE_NEGRO,
    order: 7,
    ranks: [
      [Ranks.DIAMANTE_PREMIER, Ranks.DIAMANTE_PREMIER],
      [Ranks.DIAMANTE_PREMIER],
    ],
    start_points: sumTo(Ranks.DIAMANTE_NEGRO),
    points: ranksPoints[Ranks.DIAMANTE_NEGRO],
    binary_percent: binary_percent[Ranks.DIAMANTE_NEGRO],
    bonus: 20_000,
  },
  [Ranks.DIAMANTE_CORONA]: {
    display: 'Diamante Corona',
    key: Ranks.DIAMANTE_CORONA,
    order: 8,
    ranks: [
      [Ranks.DIAMANTE_NEGRO, Ranks.DIAMANTE_NEGRO],
      [Ranks.DIAMANTE_NEGRO, Ranks.DIAMANTE_NEGRO],
    ],
    start_points: sumTo(Ranks.DIAMANTE_CORONA),
    points: ranksPoints[Ranks.DIAMANTE_CORONA],
    binary_percent: binary_percent[Ranks.DIAMANTE_CORONA],
    bonus: 100_000,
  },
  [Ranks.DIAMANTE_ROYAL]: {
    display: 'Diamante Royal',
    key: Ranks.DIAMANTE_ROYAL,
    order: 9,
    ranks: [
      [Ranks.DIAMANTE_CORONA, Ranks.DIAMANTE_CORONA],
      [Ranks.DIAMANTE_CORONA, Ranks.DIAMANTE_CORONA],
    ],
    start_points: sumTo(Ranks.DIAMANTE_ROYAL),
    points: ranksPoints[Ranks.DIAMANTE_ROYAL],
    binary_percent: binary_percent[Ranks.DIAMANTE_ROYAL],
    bonus: 200_000,
  },
};
