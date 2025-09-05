import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';
import { InitRecoveryDto } from './dto/init-recovery.dto';
import { VerifyRecoveryDto } from './dto/verify-recovery.dto';
import { CompleteRecoveryDto } from './dto/complete-recovery.dto';
import { Request } from 'express';

@ApiTags('Auth • Recovery')
@Controller('auth/recovery')
export class RecoveryController {
  constructor(private readonly svc: RecoveryService) {}

  @Post('init')
  @HttpCode(HttpStatus.OK)
  async init(@Body() dto: InitRecoveryDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    const ua = req.headers['user-agent'] as string | undefined;
    return this.svc.init(dto.email, ip, ua);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyRecoveryDto) {
    return this.svc.verify(dto.rid, dto.rt);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Body() dto: CompleteRecoveryDto) {
    return this.svc.complete(dto.rid, dto.rt, dto.newPassword);
  }
}
