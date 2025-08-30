import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { KycService } from './kyc.service';
import { CreateKycDocumentDto } from './dto/create-doc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@ApiTags('KYC')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly svc: KycService) {}

  @Get('status')
  status(@CurrentUser() u: { userId: string }) {
    return this.svc.getStatus(u.userId);
  }

  @Get('requirements')
  requirements(@Query('country') country?: string) {
    return this.svc.getRequirements(country);
  }

  @Get('documents')
  list(@CurrentUser() u: { userId: string }) {
    return this.svc.listDocuments(u.userId);
  }

  @Post('documents')
  create(
    @CurrentUser() u: { userId: string },
    @Body() dto: CreateKycDocumentDto,
  ) {
    return this.svc.createDocument(u.userId, dto);
  }

  @Delete('documents/:id')
  remove(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.svc.deleteDocument(u.userId, id);
  }

  @Post('submit')
  submit(@CurrentUser() u: { userId: string }, @Body() dto: SubmitKycDto) {
    return this.svc.submit(u.userId, dto);
  }
}
