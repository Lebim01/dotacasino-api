import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('/:code')
  @ApiOkResponse({
    description: 'Get user reference',
  })
  async reference(@Param('code') code: string) {
    return this.users.getReferenceCode(code);
  }
}
