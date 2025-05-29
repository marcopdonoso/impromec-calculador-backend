import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InstallationLayerType, TrayType } from '../schemas/sector.schema';

export class CreateSectorDto {
  @ApiProperty({ description: 'Nombre del sector' })
  @IsNotEmpty()
  @IsString()
  sectorName: string;

  @ApiProperty({ description: 'Tipo de bandeja seleccionada', enum: ['escalerilla', 'canal'] })
  @IsNotEmpty()
  @IsEnum(['escalerilla', 'canal'])
  trayTypeSelection: TrayType;

  @ApiProperty({ description: 'Porcentaje de reserva', default: 30 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  reservePercentage?: number = 30;

  @ApiProperty({ description: 'Tipo de instalación', enum: ['singleLayer', 'multiLayer'] })
  @IsNotEmpty()
  @IsEnum(['singleLayer', 'multiLayer'])
  installationLayerSelection: InstallationLayerType;
}
