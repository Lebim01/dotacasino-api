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

function toIPv4(ip: string) {
  if (ip && ip.includes(':')) {
    const parts = ip.split(':');
    const last = parts[parts.length - 1];
    if (last.includes('.')) {
      return last;
    }
  }
  return ip;
}

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

  async getAuthorizationUser(userId: string, gameId: string, userIp: string, userPassword: string) {
    const [game, user] = await Promise.all([
      this.prisma.game.findFirst({ where: { id: gameId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!game) {
      this.logger.error(`Game not found: ${gameId}`);
      return null;
    }

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return null;
    }

    type Params = {
      Login: string;
      Password: string;
      System: string;
      Page: string;
      UserIP: string;
      Language?: string;
      Country?: string;
      Hash: string;
      Currency: string;
      UserAutoCreate: string;
    };
    const { tid, id } = await this.getTID();
    const USER_PASSWORD = userPassword;
    const USER_LOGIN = userId;
    const HASH = MD5(
      `User/AuthHTML/${SERVER_IP}/${tid}/${this.APIKEY}/${USER_LOGIN}/${USER_PASSWORD}/${game.System}/${this.APIPASS}`,
    ).toString();
    const params: Params = {
      Page: game.PageCode!,
      Password: USER_PASSWORD,
      System: game.System,
      UserIP: toIPv4(userIp),
      Login: USER_LOGIN,
      Hash: HASH,
      UserAutoCreate: '1',
      Currency: 'USD',
    };
    const url = `https://apitest.fundist.org/System/Api/${this.APIKEY}/User/AuthHTML?Login=${params.Login}&Password=${params.Password}&System=${params.System}&Page=${params.Page}&UserIP=${params.UserIP}&TID=${tid}&Hash=${params.Hash}&Demo=0`;
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

        if (typeof r.data === 'string' && !r.data.startsWith("1,")) {
          throw r.data
        }
        return r.data
      }).catch(async (error) => {
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
        throw error
      });
  }

  async addUser(userId: string, userIp: string, userCountry: string, userPassword: string) {
    type Params = {
      Login: string;
      Password: string;
      RegistrationIP: string;
      Language?: string;
      Currency?: string;
      Hash: string;
      Country?: string;
    }
    const { tid, id } = await this.getTID();
    const USER_PASSWORD = userPassword;
    const HASH = MD5(`User/Add/${SERVER_IP}/${tid}/${this.APIKEY}/${userId}/${USER_PASSWORD}/USD/${this.APIPASS}`).toString()
    const params: Params = {
      Currency: 'USD',
      Language: 'es',
      Password: USER_PASSWORD,
      RegistrationIP: toIPv4(userIp),
      Login: userId,
      Hash: HASH,
      Country: userCountry
    }
    const url = `https://apitest.fundist.org/System/Api/${this.APIKEY}/User/Add?Login=${params.Login}&Password=${params.Password}&Currency=${params.Currency || ''}&RegistrationIP=${params.RegistrationIP}&Language=${params.Language || ''}&TID=${tid}&Hash=${params.Hash}&Country=${params.Country}`;
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

        if (typeof r.data === 'string' && !r.data.startsWith('1,')) {
          throw r.data;
        }
        return r.data;
      }).catch(async (error) => {
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
        throw error
      });
  }
}
