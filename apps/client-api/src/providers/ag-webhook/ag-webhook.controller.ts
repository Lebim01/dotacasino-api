import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Body,
} from '@nestjs/common';
import { AgWebhookService } from './ag-webhook.service';
import { XMLParser } from 'fast-xml-parser';
import type { Response } from 'express';
import type { PostTransferXml, PostTransferRecord } from './xml.types';
import { ApiExcludeController } from '@nestjs/swagger';

// Construye la respuesta XML como pide el proveedor :contentReference[oaicite:17]{index=17}
function buildXmlResponse(code: string, balance: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TransferResponse><ResponseCode>${code}</ResponseCode><Balance>${balance}</Balance></TransferResponse>`;
}

@Controller('rest/integration')
@ApiExcludeController()
export class AgWebhookController {
  private parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

  constructor(private readonly svc: AgWebhookService) {}

  @Post('postTransfer')
  @HttpCode(HttpStatus.OK)
  async postTransfer(
    @Headers('content-type') ct: string,
    @Body() body: string,
    @Res() res: Response,
  ) {
    try {
      if (!/xml/i.test(ct)) {
        const xml = buildXmlResponse('INVALID_DATA', '0');
        return res.type('application/xml').status(200).send(xml);
      }
      const parsed = this.parser.parse(body) as PostTransferXml;
      const rec = parsed?.Data?.Record as PostTransferRecord;

      if (
        !rec?.transactionID ||
        !rec?.transactionType ||
        !rec?.currency ||
        !rec?.playname
      ) {
        const xml = buildXmlResponse('INVALID_DATA', '0');
        return res.type('application/xml').status(200).send(xml);
      }

      const { code, balance } = await this.svc.handle(rec);

      // IMPORTANTE: responder siempre lo mismo en reintentos (idempotencia) :contentReference[oaicite:18]{index=18}
      return res
        .type('application/xml')
        .status(200)
        .send(buildXmlResponse(code, balance));
    } catch (e) {
      // 500 ERROR → dispara mecanismo de reenvío del proveedor :contentReference[oaicite:19]{index=19}
      const xml = buildXmlResponse('ERROR', '0');
      return res.type('application/xml').status(200).send(xml);
    }
  }
}
