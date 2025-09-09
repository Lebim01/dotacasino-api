export type CreateTransactionResponse = {
  address: string;

  amount: string;

  checkout_url: string;

  confirms_needed: string;

  expires_at: string;

  qrcode_url: string;

  status: string;

  status_url: string;

  timeout: number;

  txn_id: string;
};
