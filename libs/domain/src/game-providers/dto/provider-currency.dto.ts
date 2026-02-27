import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProviderCurrencyDto {
  @ApiProperty({ example: 'provider-uuid' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currencyCode!: string;


  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isCrypto?: boolean;

  @ApiProperty({ example: 'Only for local licenses' })
  @IsString()
  @IsOptional()
  disclaimer?: string;
}

export class UpdateProviderCurrencyDto {
  @ApiProperty({ example: 'EUR' })
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isCrypto?: boolean;

  @ApiProperty({ example: 'Updated disclaimer' })
  @IsString()
  @IsOptional()
  disclaimer?: string;
}
