import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CatergoryOptionDto {
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

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@impromec.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'passwordSeguro123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'Empresa XYZ', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ type: CatergoryOptionDto })
  @ValidateNested()
  @Type(() => CatergoryOptionDto)
  @IsNotEmpty()
  category: CatergoryOptionDto;

  @ApiProperty({ example: '12345678' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Calle 123, Cochabamba, Bolivia' })
  @IsNotEmpty()
  @IsString()
  location: string;
}
