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

  constructor(private readonly prisma: PrismaService) {
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
      .then(async (r) => {
        await this.prisma.softGamingRecords.update({
          data: {
            status: RequestStatus.SUCCESS,
            metadata: {
              HASH,
              tid,
              url,
            },
          },
          where: { id },
        });
        return r.data;
      })
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

  async getCategoryList() {
    const { tid, id } = await this.getTID();
    const HASH = MD5(
      `Game/Categories/${SERVER_IP}/${tid}/${this.APIKEY}/${this.APIPASS}`,
    ).toString();
    const url = `https://apitest.fundist.org/System/Api/${this.APIKEY}/Game/Categories?TID=${tid}&Hash=${HASH}&WithTechnical=1`;
    return axios
      .get(url)
      .then(async (r) => {
        await this.prisma.softGamingRecords.update({
          data: {
            status: RequestStatus.SUCCESS,
            metadata: {
              HASH,
              tid,
              url,
            },
          },
          where: { id },
        });

        try {
          return r.data
        } catch (error) {
          this.logger.error('Error parsing category list JSON', error);
          return [];
        }
      })
      .catch(async (error) => {
        await this.prisma.softGamingRecords.update({
          data: {
            status: RequestStatus.ERROR,
            metadata: {
              HASH,
              tid,
              url,
              error: error.message,
            },
          },
          where: { id },
        });
        return [];
      });
  }

  async syncCategories() {
    const list = (await this.getCategoryList()) as Array<{
      id: string;
      name: string;
    }>;
    if (!list || list.length === 0) return { count: 0 };

    for (const cat of list) {
      await (this.prisma as any).category.upsert({
        where: { externalId: cat.id },
        update: { name: cat.name },
        create: {
          externalId: cat.id,
          name: cat.name,
        },
      });
    }
    return { count: list.length };
  }

  async getAuthorizationUser(userId: string, gameId: string, userIp: string) {
    const game = await this.prisma.game.findFirst({
      where: { id: gameId },
    });
    if (!game) {
      this.logger.error(`Game not found: ${gameId}`);
      return null;
    }

    type Params = {
      LOGIN: string;
      PASSWORD: string;
      SYSTEM: string;
      PAGE: string;
      USERIP: string;
      LANGUAGE?: string;
      USERAUTOCREATE: string;
      CURRENCY: string;
      COUNTRY: string;
    }
    const params: Params = {
      USERAUTOCREATE: '1',
      CURRENCY: 'USD',
      COUNTRY: 'MX',
      LANGUAGE: 'es',
      PAGE: game.PageCode!,
      PASSWORD: '123987xd', // fija para el usuario?
      SYSTEM: game.System,
      USERIP: userIp,
      LOGIN: userId,
    }
    const url = `https://apitest.fundist.org/System/Api/${this.APIKEY}/User/AuthHTML`;
    return axios
      .get(url, {
        params,
      });
  }
}
