import { StdMexService } from '@domain/stdmex/stdmex.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DepositsService {
  constructor(private readonly stdMexService: StdMexService) {}
}
