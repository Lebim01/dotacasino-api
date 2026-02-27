import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminSupportService } from './support.service';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';

@ApiTags('Admin Support')
@Controller('support')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class AdminSupportController {
  constructor(private readonly supportService: AdminSupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Get all support tickets (admin)' })
  getAllTickets(@Query('status') status?: string) {
    return this.supportService.getAllTickets(status);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get ticket by ID with messages (admin)' })
  getTicket(@Param('ticketId') ticketId: string) {
    return this.supportService.getTicketById(ticketId);
  }

  @Post('tickets/:ticketId/messages')
  @ApiOperation({ summary: 'Send message as admin' })
  @ApiBody({ schema: { properties: { text: { type: 'string' } } } })
  sendMessage(
    @Param('ticketId') ticketId: string,
    @Body() body: { text: string },
    @CurrentUser() user: { userId: string; name: string },
  ) {
    return this.supportService.sendMessage(
      ticketId,
      user.userId,
      user.name || 'Admin',
      body.text,
    );
  }

  @Put('tickets/:ticketId/status')
  @ApiOperation({ summary: 'Update ticket status (admin)' })
  @ApiBody({ schema: { properties: { status: { type: 'string' } } } })
  updateStatus(
    @Param('ticketId') ticketId: string,
    @Body() body: { status: string },
  ) {
    return this.supportService.updateTicketStatus(ticketId, body.status);
  }

  @Put('tickets/:ticketId/read')
  @ApiOperation({ summary: 'Mark messages as read (admin)' })
  readMessages(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.supportService.readMessages(ticketId, user.userId);
  }
}
