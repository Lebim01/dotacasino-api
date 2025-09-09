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
import { HasRoles } from '../auth/roles/roles.decorator';
import { USER_ROLES } from '../auth/auth.constants';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { validatePageAndLimit } from '../utils/pagination';
import { PaginatedData } from '../types/pagination';
import { RankReportDTO } from './dto/payload';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('active-users')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  async commpanybalance() {
    return this.reportsService.getCompanyBalance();
  }

  @Get('coinpayments-transactions')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  stats() {
    return this.reportsService.stats();
  }

  @Get('incomechart')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  incomechart() {
    return this.reportsService.monthIncomeReport();
  }

  @Get('get-ranks-months')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  getranksmonths() {
    return this.reportsService.getListRanksMonths();
  }

  @Get('get-ranks-promotions')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  getranks(@Body() ranks: RankReportDTO) {
    return this.reportsService.rankPromotion(ranks.year, ranks.month);
  }

  @Get('last-invoices')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  lastinvoices() {
    return this.reportsService.getLastInvoices();
  }

  @Get('last-users')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  lastusers() {
    return this.reportsService.getLastUsers();
  }

  @Get('users-balances')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  usersbalances() {
    return this.reportsService.usersBalances();
  }

  @Get('weekly-payments')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  weeklypayments() {
    return this.reportsService.weeklyPayments();
  }

  @Get('weekly-payments/:id')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  weeklypaymentsbyid(@Param('id') id: string) {
    return this.reportsService.weeklyPaymentsById(id);
  }

  @Get('calendar-payments')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  calendarpayments() {
    return this.reportsService.calendarPayments();
  }
}
