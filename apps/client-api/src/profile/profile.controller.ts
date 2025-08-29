import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get user profile',
    type: ProfileResponseDto
  })
  async me(@CurrentUser() user: { userId: string }) {
    return this.profile.getProfile(user.userId);
  }

  @Patch()
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({
    description: 'Update user profile',
    type: ProfileResponseDto
  })
  async update(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profile.updateProfile(user.userId, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: { 
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully'
        }
      }
    }
  })
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profile.changePassword(user.userId, dto);
  }
}
