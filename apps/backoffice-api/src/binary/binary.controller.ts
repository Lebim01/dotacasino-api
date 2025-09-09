import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
} from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { HasRoles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { BinaryService } from '../binary/binary.service';
import { db } from '../firebase/admin';
import { RequestWithUser } from '../types/jwt';

@Controller('binary')
export class BinaryController {
  constructor(private readonly binaryService: BinaryService) {}

  @ApiExcludeEndpoint()
  @Post('/corte-manual')
  @ApiOperation({ summary: '[ADMIN]' })
  async cortemanual() {
    const users = await db
      .collection('users')
      .where('left_points', '>', 0)
      .where('right_points', '>', 0)
      .get();

    const response = await Promise.allSettled(
      users.docs.map((u) => this.binaryService.matchBinaryPoints(u.id)),
    );

    console.log('corte binario manual', response);

    return response;
  }

  @ApiExcludeEndpoint()
  @Post('/match-points')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[ADMIN]' })
  async matchPoints(@Body() body: { userId: string }) {
    await this.binaryService.matchBinaryPoints(body.userId);
    return { success: true, message: 'Points matched successfully.' };
  }

  @ApiExcludeEndpoint()
  @Post('/pay')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[ADMIN]' })
  async payBinary(@Body() body: { registerUserId: string; points: number }) {
    if (!body.registerUserId) throw new Error('registerUserId required');
    if (!body.points) throw new Error('points required');
    return this.binaryService.increaseBinaryPoints(
      body.registerUserId,
      body.points,
    );
  }

  @Get('get-tree/:userid')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get user binary tree' })
  gettree(
    @Request() request: RequestWithUser,
    @Param('userid') userid: string,
  ) {
    const { id } = request.user;
    return this.binaryService.getBinaryUsers(id, userid, 3, 1, {});
  }

  @Delete('delete-points')
  deletepoints() {
    return this.binaryService.deleteExpiredPoints();
  }
}
