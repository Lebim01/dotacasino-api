import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';

@ApiTags('Support')
@Controller('support')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Get open tickets for current user' })
  getTickets(@CurrentUser() user: { userId: string; name: string }) {
    return this.supportService.getTicketsByUser(user.userId);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get ticket by ID with messages' })
  getTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.supportService.getTicketById(ticketId, user.userId);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create new support ticket' })
  @ApiBody({
    schema: {
      properties: {
        topic: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  createTicket(
    @Body() body: { topic: string; description: string },
    @CurrentUser() user: { userId: string; name: string },
  ) {
    return this.supportService.createTicket(
      user.userId,
      user.name,
      body.topic,
      body.description,
    );
  }

  @Get('tickets/:ticketId/messages')
  @ApiOperation({ summary: 'Get all messages for a ticket' })
  getMessages(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.supportService.getMessages(ticketId, user.userId);
  }

  @Post('tickets/:ticketId/messages')
  @ApiOperation({ summary: 'Send a message in a ticket' })
  @ApiBody({ schema: { properties: { text: { type: 'string' } } } })
  sendMessage(
    @Param('ticketId') ticketId: string,
    @Body() body: { text: string },
    @CurrentUser() user: { userId: string; name: string },
  ) {
    return this.supportService.sendMessage(
      ticketId,
      user.userId,
      user.name,
      body.text,
    );
  }

  @Put('tickets/:ticketId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  readMessages(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.supportService.readMessages(ticketId, user.userId);
  }
}
