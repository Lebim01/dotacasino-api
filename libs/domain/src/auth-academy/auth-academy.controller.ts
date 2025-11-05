import { Controller, Post } from '@nestjs/common';
import { AuthAcademyService } from './auth-academy.service';
import { PayloadAssignBinaryPosition } from 'apps/backoffice-api/src/subscriptions/types';

@Controller('auth-binary')
export class AuthAcademyController {
  constructor(private readonly auth: AuthAcademyService) {}

  @Post('assignBinaryPosition')
  assignBinaryPosition(payload: PayloadAssignBinaryPosition) {
    return this.auth.assignBinaryPosition(payload);
  }
}
