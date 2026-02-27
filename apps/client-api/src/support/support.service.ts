/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTicketsByUser(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId, status: 'opened' },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getTicketById(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async createTicket(
    userId: string,
    username: string,
    topic: string,
    description: string,
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        username,
        topic,
        status: 'opened',
        messages: {
          create: {
            id: uuidv4(),
            userId,
            username,
            text: description,
            images: [],
            unread: false,
          },
        },
      },
    });
    return { status: true, id: ticket.id };
  }

  async sendMessage(
    ticketId: string,
    userId: string,
    username: string,
    text: string,
  ) {
    // Verify ticket exists and belongs to user
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.supportMessage.create({
      data: {
        id: uuidv4(),
        ticketId,
        userId,
        username,
        text,
        images: [],
        unread: true,
      },
    });
  }

  async readMessages(ticketId: string, userId: string) {
    // Mark as read messages not from current user
    await this.prisma.supportMessage.updateMany({
      where: {
        ticketId,
        unread: true,
        userId: { not: userId },
      },
      data: { unread: false },
    });
  }

  async getMessages(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
