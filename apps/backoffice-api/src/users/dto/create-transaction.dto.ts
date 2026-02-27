import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Memberships } from '../../types';
import { Networks } from '@domain/node-payments/node-payments.service';

export class CreateTransactionMembershipDto {
  @ApiProperty({ example: 'p-100', enum: ['free', 'p-100', 'p-500', 'p-1000'] })
  @IsString()
  membership_type!: Memberships;

  @ApiProperty({ example: 'BSC', enum: ['BSC', 'TRX', 'ETH', 'POLYGON'] })
  @IsString()
  network!: Networks;
}
