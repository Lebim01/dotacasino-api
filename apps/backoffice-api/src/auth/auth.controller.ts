import { Body, Controller, Ip, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OpsAuthDTO } from './dto/ops-auth.dto';
import { USER_ROLES } from './auth.constants';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';
import { AuthCommonService } from '@domain/auth/auth.service';
import { RegisterDto } from '@domain/auth/dto/register.dto';
import { LoginDto } from '@domain/auth/dto/login.dto';
import { PrismaService } from 'libs/db/src/prisma.service';

@ApiTags('Authentication & Authorization')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCommonService: AuthCommonService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async registerUser(@Body() dto: RegisterDto) {
    return this.authCommonService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  loginUser(@Body() dto: LoginDto) {
    return this.authCommonService.login(dto);
  }

  @ApiExcludeEndpoint()
  @Patch('give/admin')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Give admin role to user [ADMIN]' })
  async giveAdminRole(@Body() body: OpsAuthDTO) {
    const { email } = body;
    const updatedUser = await this.authService.giveAdminRole(email);
    return updatedUser;
  }

  @ApiExcludeEndpoint()
  @Patch('remove/admin')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Remove admin role from user [ADMIN]' })
  async removeAdminRole(@Body() body: OpsAuthDTO) {
    const { email } = body;
    const updatedUser = await this.authService.revokeAdminRole(email);
    return updatedUser;
  }

  @Post('test')
  async test() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    for (const u of users) {
      const parent_id = u.parentBinaryUserId;
      if (!parent_id && u.id != '4h3b3ZGUXw8n3xUSZT6d') {
        console.log(u.id);
      }
    }
  }
}
