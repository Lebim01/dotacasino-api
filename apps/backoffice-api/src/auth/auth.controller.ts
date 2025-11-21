import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
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
import { db } from '../firebase/admin';

@ApiTags('Authentication & Authorization')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCommonService: AuthCommonService,
  ) {}

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
    const users = await db
      .collection('users')
      .orderBy('created_at', 'asc')
      .get();
    for (const u of users.docs) {
      const parent_id = u.get('parent_binary_user_id');
      if (!parent_id) {
        console.log(u.id);
      }
    }
  }
}
