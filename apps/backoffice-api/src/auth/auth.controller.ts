import {
  Body,
  Controller,
  HttpException,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OpsAuthDTO } from './dto/ops-auth.dto';
import { JWTAuthGuard } from './jwt/jwt-auth.guard';
import { RolesGuard } from './roles/roles.guard';
import { HasRoles } from './roles/roles.decorator';
import { USER_ROLES } from './auth.constants';
import { db } from '../firebase/admin';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@ApiTags('Authentication & Authorization')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authAcademyService: AuthAcademyService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async registerUser(@Body() userObject: RegisterAuthDto) {
    const { email } = userObject;
    const isExistingUser = await this.authService.isExistingUser(email);
    if (isExistingUser) {
      throw new HttpException('USER_ALREADY_EXISTS', 403);
    }

    let sponsor;
    if (userObject.sponsor_id) {
      const sponsor = await db
        .collection('users')
        .doc(userObject.sponsor_id)
        .get();
      if (!sponsor.exists) throw new HttpException('USER_INVALID', 403);

      if (
        sponsor.get('left') != userObject.side &&
        sponsor.get('right') != userObject.side
      )
        throw new HttpException('POSITION_INVALID', 403);
    }

    if (userObject.username) {
      if (!(await this.authService.verifyUsername(userObject.username))) {
        throw new HttpException('Username invalid', 401);
      }
    }

    const userNode = await this.authAcademyService.registerUser(userObject);

    const { name, roles, id } = userNode;

    return { name, email, roles, id };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  loginUser(@Body() userObjectLogin: LoginAuthDto) {
    return this.authService.loginUser(userObjectLogin);
  }

  @ApiExcludeEndpoint()
  @Patch('give/admin')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Give admin role to user [ADMIN]' })
  async giveAdminRole(@Body() body: OpsAuthDTO) {
    const { email } = body;
    const updatedUser = await this.authService.giveAdminRole(email);
    return updatedUser;
  }

  @ApiExcludeEndpoint()
  @Patch('remove/admin')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Remove admin role from user [ADMIN]' })
  async removeAdminRole(@Body() body: OpsAuthDTO) {
    const { email } = body;
    const updatedUser = await this.authService.revokeAdminRole(email);
    return updatedUser;
  }
}
