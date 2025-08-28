import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthModule } from '@security/jwt.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [],
  imports: [JwtAuthModule],
})
export class AuthModule {}
