import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GameProvidersService } from './game-providers.service';
import { CreateProviderCurrencyDto, UpdateProviderCurrencyDto } from './dto/provider-currency.dto';
import { JwtAuthGuard } from '@security/jwt.guard';

@ApiTags('Game Providers')
@Controller('game-providers')
export class GameProvidersController {
  constructor(private readonly gameProvidersService: GameProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all game providers' })
  findAllProviders() {
    return this.gameProvidersService.findAllProviders();
  }

  @Get(':providerId/currencies')
  @ApiOperation({ summary: 'List all supported currencies for a specific provider' })
  findCurrenciesByProvider(@Param('providerId') providerId: string) {
    return this.gameProvidersService.findCurrenciesByProvider(providerId);
  }

  @Get('currencies/:id')
  @ApiOperation({ summary: 'Get details of a specific provider-currency relationship' })
  findOneCurrency(@Param('id') id: string) {
    return this.gameProvidersService.findOneCurrency(id);
  }

  @Post('currencies')
  @ApiBearerAuth('access-token')
  //@UseGuards(JwtAuthGuard) // Enable if only admins should manage this
  @ApiOperation({ summary: 'Add a new supported currency to a provider' })
  createCurrency(@Body() createDto: CreateProviderCurrencyDto) {
    return this.gameProvidersService.createCurrency(createDto);
  }

  @Patch('currencies/:id')
  @ApiBearerAuth('access-token')
  //@UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a provider-currency relationship' })
  updateCurrency(@Param('id') id: string, @Body() updateDto: UpdateProviderCurrencyDto) {
    return this.gameProvidersService.updateCurrency(id, updateDto);
  }

  @Delete('currencies/:id')
  @ApiBearerAuth('access-token')
  //@UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a supported currency from a provider' })
  removeCurrency(@Param('id') id: string) {
    return this.gameProvidersService.removeCurrency(id);
  }
}
