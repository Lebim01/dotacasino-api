import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });
    this.bucket = process.env.GCP_STORAGE_BUCKET!;
  }

  async uploadBase64File(
    base64Data: string,
    folder: string,
    extension: string,
  ): Promise<{ storageKey: string; checksum: string }> {
    // Remover el prefijo data:image/...;base64,
    const base64File = base64Data.split(';base64,').pop()!;
    const buffer = Buffer.from(base64File, 'base64');

    // Generar nombre único
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const filename = `${timestamp}-${randomString}.${extension}`;
    const storageKey = `casino/${folder}/${filename}`;

    // Subir archivo
    const file = this.storage.bucket(this.bucket).file(storageKey);
    await file.save(buffer, {
      contentType: `image/${extension}`,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Calcular checksum
    const checksum = crypto.createHash('md5').update(buffer).digest('hex');

    return { storageKey, checksum };
  }
}
