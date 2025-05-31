import { IsNotEmpty, IsString, IsNumber, IsEnum, IsUrl, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TrayType, TrayCategory } from '../schemas/cable-tray.schema';

export class CreateCableTrayDto {
  @ApiProperty({ description: 'Tipo de bandeja', enum: TrayType })
  @IsNotEmpty()
  @IsEnum(TrayType)
  type: TrayType;
  
  @ApiProperty({ description: 'Categoría de la bandeja', enum: TrayCategory })
  @IsNotEmpty()
  @IsEnum(TrayCategory)
  category: TrayCategory;

  @ApiProperty({ description: 'Espesor de plancha (en mm)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  thickness: number;

  @ApiProperty({ description: 'Alto de bandeja (en mm)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({ description: 'Ancho de Bandeja (en mm)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  width: number;

  @ApiProperty({ description: 'Carga de Servicio (en kg/ml)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  loadCapacity: number;

  @ApiProperty({ description: 'Código o referencia del producto', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Nombre o descripción del producto', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Largo de la bandeja en mm', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiProperty({ description: 'Material de fabricación', required: false })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiProperty({ description: 'Acabado o recubrimiento', required: false })
  @IsOptional()
  @IsString()
  finish?: string;

  @ApiProperty({ description: 'Área útil para cables en mm²', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usefulArea?: number;

  @ApiProperty({ description: 'URL de la imagen del producto', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: 'URL de la ficha técnica', required: false })
  @IsOptional()
  @IsUrl()
  dataSheetUrl?: string;

  @ApiProperty({ description: 'Indica si el producto está activo/disponible', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Propiedades adicionales específicas del tipo de bandeja', required: false })
  @IsOptional()
  additionalProperties?: Record<string, any>;
}
