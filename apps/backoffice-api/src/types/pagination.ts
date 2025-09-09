import { ApiProperty } from '@nestjs/swagger';

export class Pagination {
  @ApiProperty({ required: false, minimum: 1 })
  page!: number;

  @ApiProperty({ maximum: 500, minimum: 0, required: false })
  limit!: number;

  @ApiProperty({ required: false, example: 'Search text' })
  q!: string;
}

export type PaginatedData = {
  data: any[];
  totalPages: number;
  totalRecords: number;
  pageRecords: number;
};
