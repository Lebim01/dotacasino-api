import { Controller, Get } from '@nestjs/common';
import { db } from '../firebase/admin';

@Controller('countries')
export class CountriesController {
  @Get('')
  async getchart() {
    const report = await db.collection('reports').doc('countries').get();
    return report.data();
  }
}
