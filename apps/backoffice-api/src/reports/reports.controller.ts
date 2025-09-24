import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { validatePageAndLimit } from '../utils/pagination';
import { PaginatedData } from '../types/pagination';
import { RankReportDTO } from './dto/payload';
import { Roles } from '@security/roles.decorator';
import { JwtAuthGuard } from '@security/jwt.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('active-users')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Usuarios membresias activas, rangos, dinero depositado, expiración [ADMIN]',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  activeusers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.activeUsers(_page, _limit);
  }

  @Get('inactive-users')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Usuarios membresias caducadas [ADMIN]' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  inactiveusers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.inactiveUsers(_page, _limit);
  }

  @Get('users-interest')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Deuda de intereses por pagar, interes compuesto activo (si/no), pagado, deuda, tiempo faltante [ADMIN]',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  @ApiQuery({
    name: 'compound-active',
    required: false,
    example: 1,
    schema: { type: 'number', minimum: 0 },
    description: 'Compound actived or not',
  })
  usersinterest(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('compound-active') compound?: string,
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.usersInterest(
      _page,
      _limit,
      compound == undefined ? undefined : compound == '1',
    );
  }

  @Get('company-balance')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  async commpanybalance() {
    return this.reportsService.getCompanyBalance();
  }

  @Get('coinpayments-transactions')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  coinpaymentstransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.coinpaymentsTransactions(_page, _limit);
  }

  @Get('disruptive-transactions')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  disruptivetransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.disruptiveTransactions(_page, _limit);
  }

  @Get('profits')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  profits(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.profitsHistory(_page, _limit);
  }

  @Get('users-ranks')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  usersranks(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedData> {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.reportsService.usersranks(_page, _limit);
  }

  @Get('stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  stats() {
    return this.reportsService.stats();
  }

  @Get('incomechart')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  incomechart() {
    return this.reportsService.monthIncomeReport();
  }

  @Get('get-ranks-months')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  getranksmonths() {
    return this.reportsService.getListRanksMonths();
  }

  @Get('get-ranks-promotions')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  getranks(@Body() ranks: RankReportDTO) {
    return this.reportsService.rankPromotion(ranks.year, ranks.month);
  }

  @Get('last-invoices')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  lastinvoices() {
    return this.reportsService.getLastInvoices();
  }

  @Get('last-users')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  lastusers() {
    return this.reportsService.getLastUsers();
  }

  @Get('users-balances')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  usersbalances() {
    return this.reportsService.usersBalances();
  }

  @Get('weekly-payments')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  weeklypayments() {
    return this.reportsService.weeklyPayments();
  }

  @Get('weekly-payments/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  weeklypaymentsbyid(@Param('id') id: string) {
    return this.reportsService.weeklyPaymentsById(id);
  }

  @Get('calendar-payments')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  calendarpayments() {
    return this.reportsService.calendarPayments();
  }
}
