import { ApiProperty } from '@nestjs/swagger';

export class GameDto {
  @ApiProperty({ example: '1c9c67b2-9a36-4453-bcbf-71806de3fe62' })
  id!: string;

  @ApiProperty({ example: 'ag-baccarat-agin' })
  slug!: string;

  @ApiProperty({ example: 'Baccarat (AGIN)' })
  title!: string;

  @ApiProperty({ example: 'AG' })
  provider!: string;

  @ApiProperty({ example: 'Asia Gaming' })
  providerName!: string;

  @ApiProperty({ example: 'LIVE' })
  category!: string;

  @ApiProperty({ example: 'AGIN' })
  platformType!: string;

  @ApiProperty({ example: 'BAC', nullable: true })
  gameType!: string | null;

  @ApiProperty({ example: 'SB49', nullable: true })
  providerGameId!: string | null;

  @ApiProperty({ example: null, nullable: true })
  rtp!: number | null;

  @ApiProperty({ example: ['DESKTOP', 'MOBILE'] })
  devices!: string[];

  @ApiProperty({ example: ['popular'] })
  tags!: string[];

  @ApiProperty({ example: 'https://cdn.example.com/ag/bac-agin.jpg' })
  thumbnailUrl!: string;

  @ApiProperty({ example: 10 })
  order!: number;
}

export class ListGamesResponseDto {
  @ApiProperty({ type: [GameDto] })
  items!: GameDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 24 })
  pageSize!: number;
}
