import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { db } from './firebase/admin';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('')
  async remove() {
    const docs = await db.collectionGroup('ipn').get();
    for (const d of docs.docs) {
      await d.ref.delete();
    }
  }
}
