import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FxService } from './fx.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Cache sencillo para evitar golpear Banxico en cada request
    CacheModule.register({
      ttl: 60 * 10, // 10 minutos
      max: 100,
      isGlobal: true,
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        baseURL: 'https://www.banxico.org.mx/SieAPIRest/service/v1',
        timeout: 8000,
        headers: {
          'Bmx-Token': cfg.get<string>('BANXICO_TOKEN') ?? '',
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
