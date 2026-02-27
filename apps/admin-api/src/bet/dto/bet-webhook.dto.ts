import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

const REQUIRES_USER_CONTEXT = ['balance', 'debit', 'credit'] as const;
const REQUIRES_TRANSACTION_FIELDS = ['debit', 'credit'] as const;

export class BetWebhookDto {
  @IsIn(['ping', 'balance', 'debit', 'credit'])
  type!: 'ping' | 'balance' | 'debit' | 'credit';

  @IsOptional()
  @IsString()
  hmac?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_USER_CONTEXT.includes(o.type as (typeof REQUIRES_USER_CONTEXT)[number]),
  )
  @IsString()
  userid?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_USER_CONTEXT.includes(o.type as (typeof REQUIRES_USER_CONTEXT)[number]),
  )
  @IsString()
  currency?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_TRANSACTION_FIELDS.includes(o.type as (typeof REQUIRES_TRANSACTION_FIELDS)[number]),
  )
  @IsNumberString()
  amount?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_TRANSACTION_FIELDS.includes(o.type as (typeof REQUIRES_TRANSACTION_FIELDS)[number]),
  )
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value),
  )
  @IsString()
  tid?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_TRANSACTION_FIELDS.includes(o.type as (typeof REQUIRES_TRANSACTION_FIELDS)[number]),
  )
  @IsString()
  i_gameid?: string;

  @ValidateIf((o: BetWebhookDto) =>
    REQUIRES_TRANSACTION_FIELDS.includes(o.type as (typeof REQUIRES_TRANSACTION_FIELDS)[number]),
  )
  @IsString()
  i_actionid?: string;

  @IsOptional()
  @IsString()
  i_extparam?: string;

  @IsOptional()
  @IsString()
  i_gamedesc?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value),
  )
  @IsString()
  i_rollback?: string;

  @IsOptional()
  @IsString()
  subtype?: string;
}
