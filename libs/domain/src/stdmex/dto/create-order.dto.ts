import { IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
  /** Monto en MXN que el usuario depositará */
  @IsNumber()
  @IsPositive()
  amountMxn!: number;
}
