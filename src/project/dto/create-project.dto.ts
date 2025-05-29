import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Nombre del proyecto' })
  @IsNotEmpty()
  @IsString()
  projectName: string;

  @ApiProperty({ description: 'Empresa del proyecto' })
  @IsNotEmpty()
  @IsString()
  projectCompany: string;

  @ApiProperty({ description: 'Ubicación del proyecto' })
  @IsNotEmpty()
  @IsString()
  projectLocation: string;

  @ApiProperty({ description: 'Indica si el proyecto se dividirá en sectores' })
  @IsOptional()
  @IsBoolean()
  hasSectors?: boolean;
}
