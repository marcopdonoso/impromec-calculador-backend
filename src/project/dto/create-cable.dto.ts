import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CableArrangementType } from '../schemas/cable.schema';

export class CreateCableDto {
  @ApiProperty({ description: 'Sección nominal en mm²' })
  @IsNotEmpty()
  @IsString()
  nominalSectionMM2: string;

  @ApiProperty({ description: 'Sección nominal en AWG' })
  @IsNotEmpty()
  @IsString()
  nominalSectionAWG: string;

  @ApiProperty({ description: 'Diámetro externo en mm' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  externalDiameterMM: number;

  @ApiProperty({ description: 'Área externa en mm²' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  externalAreaMM2: number;

  @ApiProperty({ description: 'Peso por metro en kg' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  weightPerMeterKG: number;
}

export class CreateCableInTrayDto {
  @ApiProperty({ description: 'Información del cable' })
  @IsNotEmpty()
  cable: CreateCableDto;

  @ApiProperty({ description: 'Cantidad de cables' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Disposición de los cables', enum: ['horizontal', 'clover'], default: 'horizontal' })
  @IsOptional()
  @IsEnum(['horizontal', 'clover'])
  arrangement?: CableArrangementType;
}
