import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RefreshDto {
  @ApiProperty()
  @IsString() 
  refresh_token?: string; // opcional si usas cookie httpOnly
}