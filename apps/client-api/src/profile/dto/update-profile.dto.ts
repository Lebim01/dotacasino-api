import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  displayName?: string;

  @IsOptional()
  @IsString()
  // E.164 simple: + dígitos, o deja tu regex preferida
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 5)
  language?: string; // 'es', 'en', 'pt', etc.

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
