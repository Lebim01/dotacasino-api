import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { CreateProviderCurrencyDto, UpdateProviderCurrencyDto } from './dto/provider-currency.dto';

@Injectable()
export class GameProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllProviders() {
    return this.prisma.gameProvider.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findCurrenciesByProvider(providerId: string) {
    return this.prisma.providerCurrency.findMany({
      where: { providerId },
      orderBy: { currencyCode: 'asc' },
    });
  }

  async findOneCurrency(id: string) {
    const currency = await this.prisma.providerCurrency.findUnique({
      where: { id },
    });
    if (!currency) {
      throw new NotFoundException(`Provider currency with ID ${id} not found`);
    }
    return currency;
  }

  async createCurrency(data: CreateProviderCurrencyDto) {
    return this.prisma.providerCurrency.create({
      data,
    });
  }

  async updateCurrency(id: string, data: UpdateProviderCurrencyDto) {
    await this.findOneCurrency(id);
    return this.prisma.providerCurrency.update({
      where: { id },
      data,
    });
  }

  async removeCurrency(id: string) {
    await this.findOneCurrency(id);
    return this.prisma.providerCurrency.delete({
      where: { id },
    });
  }

  // Helper to bulk sync or similar if needed later
}
