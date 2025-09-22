import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Coins, Memberships } from '../../types';

export class CreateTransactionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount!: number;
}

export class CreateTransactionMembershipDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  membership_type!: Memberships;
}

export class FirebaseObject {
  @IsString()
  amount!: string;
  @IsString()
  uid!: string;
  expires_at!: { seconds: number };
  @IsString()
  qrcode_url!: string;
  @IsString()
  status_url!: string;
  @IsString()
  checkout_url!: string;
  @IsString()
  confirms_needed!: string;
  @IsString()
  currency!: Coins;
  @IsString()
  status!: 'pending' | 'confirming' | 'paid';
  @IsString()
  address!: string;
  @IsString()
  redirect_url?: string;
  @IsString()
  txn_id!: string;
  @IsNumber()
  timeout!: number;
}
