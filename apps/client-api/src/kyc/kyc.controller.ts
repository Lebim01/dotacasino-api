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
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { KycService } from './kyc.service';
import { CreateKycDocumentDto } from './dto/create-doc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatusResponseDto, KycRequirementDto, KycDocumentDto } from './dto/kyc-responses.dto';

@ApiTags('KYC')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly svc: KycService) {}

  @Get('status')
  @ApiOkResponse({
    description: 'Get KYC verification status',
    type: KycStatusResponseDto
  })
  status(@CurrentUser() u: { userId: string }) {
    return this.svc.getStatus(u.userId);
  }

  @Get('requirements')
  @ApiOkResponse({
    description: 'Get KYC document requirements',
    type: [KycRequirementDto]
  })
  requirements(@Query('country') country?: string) {
    return this.svc.getRequirements(country);
  }

  @Get('documents')
  @ApiOkResponse({
    description: 'List uploaded KYC documents',
    type: [KycDocumentDto]
  })
  list(@CurrentUser() u: { userId: string }) {
    return this.svc.listDocuments(u.userId);
  }

  @Post('documents')
  @ApiBody({ type: CreateKycDocumentDto })
  @ApiCreatedResponse({
    description: 'Document uploaded successfully',
    type: KycDocumentDto
  })
  create(
    @CurrentUser() u: { userId: string },
    @Body() dto: CreateKycDocumentDto,
  ) {
    return this.svc.createDocument(u.userId, dto);
  }

  @Delete('documents/:id')
  @ApiOkResponse({
    description: 'Document deleted successfully',
    schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } }
  })
  remove(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.svc.deleteDocument(u.userId, id);
  }

  @Post('submit')
  @ApiBody({ type: SubmitKycDto })
  @ApiOkResponse({
    description: 'KYC verification submitted successfully',
    type: KycStatusResponseDto
  })
  submit(@CurrentUser() u: { userId: string }, @Body() dto: SubmitKycDto) {
    return this.svc.submit(u.userId, dto);
  }
}
