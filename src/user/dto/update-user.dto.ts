import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CategoryOptionDto {
  @ApiProperty({ example: 'Construcciones' })
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: 'construction',
    enum: [
      'commercial',
      'construction',
      'industry',
      'installations',
      'projects',
    ],
  })
  @IsNotEmpty()
  value: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Empresa XYZ', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ type: CategoryOptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryOptionDto)
  category?: CategoryOptionDto;

  @ApiProperty({ example: '12345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Calle 123, Cochabamba, Bolivia' })
  @IsOptional()
  @IsString()
  location?: string;
}
