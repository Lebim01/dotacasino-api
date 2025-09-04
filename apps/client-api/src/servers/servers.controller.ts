import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ServersService } from './servers.service';

@ApiTags('Servers')
@Controller('servers')
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get servers',
  })
  async list() {
    return this.servers.getServers();
  }
}
