import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/')
  ping() {
    return { ok: true, app: 'admin-api' };
  }

  @Post('log')
  log(@Body() body: any, @Headers() headers: any) {
    console.log(headers);
    console.log(body);
  }
}
