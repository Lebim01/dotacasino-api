import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import crypto from 'crypto';
import { RequestStatus } from '@prisma/client';
import { MD5 } from 'crypto-js';
import axios from 'axios';

const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomString(length = 32) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const SERVER_IP = '147.93.32.164';

@Injectable()
export class SoftGamingService {
  private readonly logger = new Logger(SoftGamingService.name);
  private APIPASS: string;
  private APIKEY: string;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.APIPASS = process.env.SOFTGAMING_APIPASS || '';
    this.APIKEY = process.env.SOFTGAMING_APIKEY || '';
  }

  async getTID() {
    const record = await this.prisma.softGamingRecords.create({
      data: {
        tid: randomString(),
        status: RequestStatus.PENDING,
      },
    });
    return record;
  }

  async getGameList() {
    const { tid, id } = await this.getTID();
    const HASH = MD5(
      `Game/List/${SERVER_IP}/${tid}/${this.APIKEY}/${this.APIPASS}`,
    ).toString();
    const url = `https://apitest.fundist.org/System/Api/${this.APIKEY}/Game/List?TID=${tid}&Hash=${HASH}`;
    return axios
      .get(url)
      .then(() =>
        this.prisma.softGamingRecords.update({
          data: {
            status: RequestStatus.SUCCESS,
            metadata: {
              HASH,
              tid,
              url,
            },
          },
          where: { id },
        }),
      )
      .catch(() =>
        this.prisma.softGamingRecords.update({
          data: {
            status: RequestStatus.ERROR,
            metadata: {
              HASH,
              tid,
              url,
            },
          },
          where: { id },
        }),
      );
  }
}
