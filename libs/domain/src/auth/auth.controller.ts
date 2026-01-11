import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  Ip,
} from '@nestjs/common';
import { AuthCommonService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RefreshDto } from './dto/refresh.dto';
import {
  RegisterResponseDto,
  AuthTokensResponseDto,
  LogoutResponseDto,
  RefreshTokenResponseDto,
} from './dto/auth-responses.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthCommonService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);
    return { message: 'Registro exitoso', user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: AuthTokensResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    const token = dto.refresh_token;
    if (!token) {
      return new UnauthorizedException({ message: 'refresh token requerido' });
    }

    const out = await this.auth.refresh(token);

    return out;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'User logged out successfully',
    type: LogoutResponseDto,
  })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refresh_token);
    return { ok: true };
  }
}
