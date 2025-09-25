// src/games-api/dtos.ts
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsISO8601,
  IsNumberString,
  Length,
  Min,
  IsNumber,
} from 'class-validator';

export class BaseCmdDto {
  @IsString() cmd!: string;
  @IsString() hall!: string; // se maneja como string para no perder ceros
  @IsString() key?: string;
  @IsOptional() @IsString() sign?: string; // firma opcional
}

export class GetBalanceDto extends BaseCmdDto {
  @IsString() login!: string;
}

export class WriteBetDto extends BaseCmdDto {
  @IsString() login!: string;
  @IsString() sessionId!: string;
  @IsNumberString() bet!: string; // Decimal 12,2 como cadena
  @IsNumberString() win!: string; // Decimal 12,2 como cadena (puede ser negativo en manual)
  @IsString() tradeId!: string;
  @IsString() betInfo!: string;
  @IsString() gameId!: string;
  @IsOptional() @IsString() matrix?: string;
  @IsOptional() @IsISO8601({ strict: false }) date?: string; // "YYYY-MM-DD HH:mm:ss" -> validaremos suavemente
  @IsOptional() @IsString() WinLines?: string;
  @IsOptional() @IsString() refund?: string; // SportBetting
}

export class GamesListDto {
  @IsOptional() @IsString() cdnUrl?: string;
}

export class OpenGameDto extends BaseCmdDto {
  @IsString() domain!: string; // requerido para protocolo/cierre
  @IsString() exitUrl!: string;
  @IsString() language!: string;
  @IsString() continent!: string; // eur, usa, asia, australia
  @IsString() login!: string;
  @IsString() gameId!: string;
  @IsOptional() @IsString() cdnUrl?: string;
  @IsIn(['0', '1']) demo!: '0' | '1';
}

export class SessionsLogDto extends BaseCmdDto {
  @IsString() sessionsId!: string;
  @IsInt() @Min(1) count!: number;
  @IsInt() @Min(1) page!: number;
}

export class CreateHallDto {
  @IsIn(['createHall']) cmd!: 'createHall';
  @IsString() api_key!: string;
  @IsString() agent!: string;
  @IsString() key!: string; // hall_key
  @IsString() host!: string; // callback url
  @IsString() hall!: string;
  @IsString() login!: string;
  @IsString() currency!: string;
}

export class ChangeHallConfigGetDto extends BaseCmdDto {}

export class ChangeHallConfigSetDto extends ChangeHallConfigGetDto {
  data!: Record<string, any>; // se pasa tal cual según manual
}

// Utilidad para construir respuestas estándar
export type Success<T extends object = {}> = {
  status: 'success';
  error: '';
} & T;
export type Fail = { status: 'fail'; error: string };


export class GameSessionLogDto extends BaseCmdDto {
  @IsString() sessionsId!: string;
  @IsNumber() count!: number;
  @IsNumber() page!: number;
}