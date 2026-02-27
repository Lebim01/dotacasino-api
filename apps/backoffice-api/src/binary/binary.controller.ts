import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { BinaryService } from '../binary/binary.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';
import { CurrentUser } from '@security/current-user.decorator';

@ApiTags('Binary Tree')
@Controller('binary')
export class BinaryController {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly prisma: PrismaService,
  ) { }

  @ApiExcludeEndpoint()
  @Post('/corte-manual')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Process binary matching for users with points on both sides' })
  async cortemanual() {
    const users = await this.prisma.user.findMany({
      where: {
        leftPoints: { gt: 0 },
        rightPoints: { gt: 0 },
      },
      select: { id: true },
    });

    const response = await Promise.allSettled(
      users.map((u) => this.binaryService.matchBinaryPoints(u.id)),
    );

    console.log('corte binario manual', response);

    return response;
  }

  @ApiExcludeEndpoint()
  @Post('/match-points')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Match binary points for a specific user' })
  async matchPoints(@Body() body: { userId: string }) {
    await this.binaryService.matchBinaryPoints(body.userId);
    return { success: true, message: 'Points matched successfully.' };
  }

  @ApiExcludeEndpoint()
  @Post('/pay')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Manually increase binary points' })
  async payBinary(@Body() body: { registerUserId: string; points: number }) {
    if (!body.registerUserId) throw new Error('registerUserId required');
    if (!body.points) throw new Error('points required');
    return this.binaryService.increaseBinaryPoints(
      body.registerUserId,
      body.points,
    );
  }

  @Get('get-tree/:userid')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user binary tree' })
  gettree(
    @CurrentUser() user: { userId: string },
    @Param('userid') userid: string,
  ) {
    return this.binaryService.getBinaryUsers(user.userId, userid, 3, 1, {});
  }

  @Delete('delete-points')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Delete expired binary points' })
  deletepoints() {
    return this.binaryService.deleteExpiredPoints();
  }
}
