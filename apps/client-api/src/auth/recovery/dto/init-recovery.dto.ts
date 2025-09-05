import { IsEmail } from 'class-validator';
export class InitRecoveryDto {
  @IsEmail() email!: string;
}
