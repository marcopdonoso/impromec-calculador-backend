import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TrayType } from '../schemas/cable-tray.schema';

export class ImportCableTraysDto {
  @ApiProperty({
    description: 'URL de la hoja de Google Sheets que contiene los datos a importar',
    example: 'https://docs.google.com/spreadsheets/d/1ABC123def456/edit#gid=0'
  })
  @IsNotEmpty()
  @IsString()
  sourceUrl: string;

  @ApiProperty({
    description: 'Nombre de la hoja dentro del documento de Google Sheets',
    example: 'Bandejas Canal' 
  })
  @IsNotEmpty()
  @IsString()
  sheetName: string;

  @ApiProperty({
    description: 'Tipo de bandeja portacables a importar',
    enum: TrayType
  })
  @IsNotEmpty()
  @IsEnum(TrayType)
  trayType: TrayType;

  @ApiProperty({
    description: 'Rango de celdas a importar (opcional). Si no se especifica, se importará toda la hoja.',
    example: 'A1:F50',
    required: false 
  })
  @IsOptional()
  @IsString()
  range?: string;

  @ApiProperty({
    description: 'Si es true, elimina todas las bandejas existentes del tipo especificado antes de importar',
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}
