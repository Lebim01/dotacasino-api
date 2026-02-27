/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdminSupportService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin can see all tickets
  async getAllTickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async sendMessage(
    ticketId: string,
    adminId: string,
    adminUsername: string,
    text: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.supportMessage.create({
      data: {
        id: uuidv4(),
        ticketId,
        userId: adminId,
        username: adminUsername,
        text,
        images: [],
        unread: true,
      },
    });
  }

  async updateTicketStatus(ticketId: string, status: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  async readMessages(ticketId: string, adminId: string) {
    await this.prisma.supportMessage.updateMany({
      where: {
        ticketId,
        unread: true,
        userId: { not: adminId },
      },
      data: { unread: false },
    });
  }
}
