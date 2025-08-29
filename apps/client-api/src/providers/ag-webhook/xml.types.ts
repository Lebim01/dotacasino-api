export type PostTransferRecord = {
  sessionToken?: string;
  currency: string;
  value?: string; // en BET
  netAmount?: string; // en WIN/LOSE/DRAW
  validBetAmount?: string; // en WIN/LOSE/DRAW
  playname: string; // p.ej. B17user123  (prefijo = product id) :contentReference[oaicite:4]{index=4}
  agentCode?: string; // p.ej. B17
  betTime?: string;
  settletime?: string;
  transactionID: string; // clave idempotencia
  billNo?: string; // clave idempotencia (puede variar por juego) :contentReference[oaicite:5]{index=5}
  gametype?: string; // BAC/DT/SHB/ROU/... :contentReference[oaicite:6]{index=6}
  gameCode?: string;
  tableCode?: string;
  transactionType: 'BET' | 'WIN' | 'LOSE' | 'REFUND' | string; // :contentReference[oaicite:7]{index=7}
  transactionCode?: string; // códigos por juego (BCB/BCP/etc.) :contentReference[oaicite:8]{index=8}
  ticketStatus?: string; // WIN/LOSE/BET/Refund  :contentReference[oaicite:9]{index=9}
  deviceType?: string; // DESKTOP/MOBILE
  finish?: string; // "true"/"false" (último payout del round) :contentReference[oaicite:10]{index=10}
};

export type PostTransferXml = { Data: { Record: PostTransferRecord } };
