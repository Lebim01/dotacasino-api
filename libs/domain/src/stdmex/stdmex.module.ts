import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StdMexService } from './stdmex.service';
import { StdMexController } from './stdmex.controller';
import { HttpModule } from '@nestjs/axios';
import { FxService } from '@domain/fx/fx.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        baseURL:
          cfg.get<string>('STDMEX_BASE_URL') ??
          'https://api-s1.serviciostdmexico.com',
        headers: {
          // El token de aplicación de STDMEX
          Authorization: `Bearer ${cfg.get<string>('STDMEX_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [StdMexController],
  providers: [StdMexService, FxService],
  exports: [StdMexService],
})
export class StdMexModule {}
