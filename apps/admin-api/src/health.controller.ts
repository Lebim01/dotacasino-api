import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/')
  ping() {
    return { ok: true, app: 'admin-api' };
  }

  @Get('egress-ip')
  async egressIp() {
    const r = await fetch('https://api.ipify.org?format=json');
    return r.json(); // { ip: "x.x.x.x" }
  }
}
