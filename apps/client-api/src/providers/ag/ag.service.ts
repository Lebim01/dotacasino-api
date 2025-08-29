import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { desEcbBase64, md5Lower, buildParamsKV } from './crypto.util';

type CheckCreateInput = {
  loginname: string; // máx 20 chars, solo [A-Za-z0-9_]
  password: string; // máx 20, sin caracteres prohibidos
  actype?: '0' | '1'; // 1=real, 0=trial
  oddtype?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'; // default A
  cur?: 'CNY' | 'USD' | 'EUR'; // ver doc
};

@Injectable()
export class AgService {
  private readonly giBase = process.env.AG_GI_BASE_URL!;
  private readonly cagent = process.env.AG_CAGENT!;
  private readonly desKey = process.env.AG_DES_KEY!;
  private readonly md5Key = process.env.AG_MD5_KEY!;
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });

  constructor(private readonly http: HttpService) {}

  /**
   * Implementa 4.1 CheckOrCreateAccount
   * GET {giBase}/doBusiness.do?params={base64(des(...))}&key={md5(params+md5Key)}
   * method=lg (constante)
   */
  async checkOrCreateAccount(input: CheckCreateInput) {
    const payload = buildParamsKV({
      cagent: this.cagent,
      loginname: input.loginname,
      method: 'lg', // "CheckOrCreateGameAccount"
      actype: input.actype ?? '1', // 1 real, 0 trial
      password: input.password,
      oddtype: input.oddtype ?? 'A',
      cur: 'USD',
    });

    const params = desEcbBase64(payload, this.desKey); // DES+Base64 (params)
    const key = md5Lower(params + this.md5Key); // MD5(params + MD5_Encrypt_key)

    const url = `${this.giBase}/doBusiness.do?params=${encodeURIComponent(params)}&key=${key}`;

    const { data } = await firstValueFrom(
      this.http.get(url, { responseType: 'text' }),
    );
    // Respuesta es XML: <result info="0" msg="..."/> ; 0=Success, otros códigos en doc
    // Ver "Return result: XML" y valores info/key_error/... en la sección 4.1.1
    // Parseamos atributos info y msg
    const xml = this.parser.parse(data);
    const result = xml?.result || xml?.Result || xml;
    const info = String(result?.info ?? '');
    const msg = String(result?.msg ?? '');

    // info="0" => Success
    if (info !== '0') {
      const error = new Error(
        `AG CheckOrCreateAccount failed: info=${info} msg=${msg}`,
      );
      (error as any).agInfo = info;
      (error as any).agMsg = msg;
      throw error;
    }

    return { ok: true, info, msg };
  }
}
