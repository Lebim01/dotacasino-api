import {
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsString,
  Length,
} from 'class-validator';

export enum StdMexStatus {
  PENDING = 'PENDING',
  DECLINED = 'DECLINED',
  APPROVED = 'APPROVED',
}

export class StdMexWebhookDto {
  @IsString()
  @Length(1, 64)
  id_transaccion!: string;

  @IsString()
  @Length(1, 100)
  id_usuario!: string;

  @IsString()
  @Length(18, 18)
  clabe!: string;

  // Monto en MXN con máximo 2 decimales (STDMEX lo envía como string)
  @IsNumberString()
  monto!: string;

  @IsEnum(StdMexStatus)
  status!: StdMexStatus;

  @IsBoolean()
  tiene_aviso_deposito!: boolean;
}
