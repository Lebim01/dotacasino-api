import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { StdMexWebhookDto, StdMexStatus } from './dto/webhook.dto';
import { FxService } from '@domain/fx/fx.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { UsersService } from 'apps/client-api/src/users/users.service';

type GetOrCreateClabeResponse = {
  id_usuario: string;
  clabe: string;
  Banco: string; // "STP" u otro
  instrucciones: {
    BENEFICIARIO: string;
    CONCEPTO: string;
  };
};

type CreateOrderResponse = {
  id_transaccion: string;
  id_usuario: string;
  clabe: string;
  banco: string;
  monto: string; // MXN
  instrucciones: {
    BENEFICIARIO: string;
    CONCEPTO: string;
  };
};

@Injectable()
export class StdMexService {
  private readonly logger = new Logger(StdMexService.name);

  private readonly expectedWebhookAuth: string | undefined;

  constructor(
    private readonly http: HttpService,
    private readonly cfg: ConfigService,
    private readonly fx: FxService,
    private readonly users: UsersService,
    private readonly wallets: WalletService,
  ) {
    // Token que STDMEX enviará en el header Authorization a tu webhook
    this.expectedWebhookAuth = this.cfg.get<string>('STDMEX_WEBHOOK_TOKEN');
  }

  /**
   * Obtiene o crea la CLABE del usuario (una sola CLABE por usuario; se reutiliza).
   * Si ya la tenemos en BD, devolvemos la local; si no, pedimos a STDMEX y persistimos.
   */
  async getOrCreateClabeForUser(
    userId: string,
  ): Promise<GetOrCreateClabeResponse> {
    const existing = await this.users.getStdMexClabe(userId);
    if (existing?.clabe) {
      return {
        id_usuario: userId,
        clabe: existing.clabe,
        Banco: existing.bank ?? 'STP',
        instrucciones: {
          BENEFICIARIO: '',
          CONCEPTO: '',
        },
      };
    }

    const { data } = await firstValueFrom(
      this.http.get<GetOrCreateClabeResponse>(
        '/api/deposit/get-or-create-info-deposit/',
        {
          // STDMEX espera GET con body JSON (según su doc); si no acepta body en GET,
          // puedes cambiar a POST con la misma ruta o usar params. La doc indica body JSON.
          data: { id_usuario: userId },
        },
      ),
    );

    await this.users.setStdMexClabe(userId, {
      clabe: data.clabe,
      bank: data.Banco,
      instructions: data.instrucciones,
    });

    return data;
  }

  /**
   * Crea una “orden de depósito” (aviso) en STDMEX para el monto en MXN.
   * Retorna la respuesta de STDMEX + la CLABE asignada.
   */
  async createDepositOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResponse> {
    const clabeInfo = await this.getOrCreateClabeForUser(userId);

    const payload = {
      id_usuario: userId,
      monto: dto.amountMxn.toFixed(2),
      clabe: clabeInfo.clabe,
    };

    const { data } = await firstValueFrom(
      this.http.post<CreateOrderResponse>(
        '/api/deposit/post-create-order-deposit/',
        payload,
      ),
    );

    return data;
  }

  /**
   * Bloquear CLABE del usuario (opcional).
   */
  async blockClabe(
    clabe: string,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await firstValueFrom(
      this.http.post<{ sucess: boolean; message: string }>(
        '/api/cuenta/bloquear/',
        { clabe },
      ),
    );
    return { success: data.sucess, message: data.message };
  }

  /**
   * Desbloquear CLABE del usuario (opcional).
   */
  async unblockClabe(
    clabe: string,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await firstValueFrom(
      this.http.post<{ sucess: boolean; message: string }>(
        '/api/cuenta/desbloquear/',
        { clabe },
      ),
    );
    return { success: data.sucess, message: data.message };
  }

  /**
   * Procesa el webhook de STDMEX. Verifica Authorization, y si está APPROVED:
   * - Convierte MXN → USDT
   * - Acredita en la wallet del usuario
   * - Idempotencia usando id_transaccion
   * Debe responder { "respuesta": "aceptado" }.
   */
  async handleWebhook(
    authHeader: string | undefined,
    body: StdMexWebhookDto,
  ): Promise<{ respuesta: 'aceptado' }> {
    if (!this.expectedWebhookAuth) {
      this.logger.warn(
        'STDMEX_WEBHOOK_TOKEN no configurado; se omite validación de Authorization',
      );
    } else {
      if (!authHeader || authHeader !== `Bearer ${this.expectedWebhookAuth}`) {
        throw new UnauthorizedException(
          'Authorization inválido para webhook STDMEX',
        );
      }
    }

    // Guarda/actualiza CLABE si viene y no la tenemos (resiliencia)
    const known = await this.users.getStdMexClabe(body.id_usuario);
    if (!known?.clabe && body.clabe) {
      await this.users.setStdMexClabe(body.id_usuario, { clabe: body.clabe });
    }

    // Solo acreditar si está aprobado
    if (body.status === StdMexStatus.APPROVED) {
      const amountMxn = Number(body.monto);
      const usdMxn = await this.fx.getUsdMxn(); // p.ej. 1 USD = 18.50 MXN
      const amountUsdt = amountMxn / usdMxn;

      await this.wallets.credit({
        userId: body.id_usuario,
        amount: amountUsdt,
        meta: {
          provider: 'STDMEX',
          id_transaccion: body.id_transaccion,
          clabe: body.clabe,
          amountMxn,
          rateUsdMxn: usdMxn,
          tiene_aviso_deposito: body.tiene_aviso_deposito,
        },
        idempotencyKey: body.id_transaccion,
        reason: 'USER_TOPUP',
      });

      this.logger.log(
        `Acreditado ${amountUsdt.toFixed(6)} USDT a ${body.id_usuario} (MXN ${amountMxn.toFixed(2)})`,
      );
    }

    // Respuesta EXACTA requerida por STDMEX
    return { respuesta: 'aceptado' };
  }
}
