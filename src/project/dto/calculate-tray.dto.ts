import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { TrayType } from '../schemas/tray.schema';

export class CalculateTrayDto {
  @ApiProperty({
    description: 'Tipo de bandeja a utilizar',
    enum: ['escalerilla', 'canal'],
    example: 'escalerilla',
  })
  @IsEnum(['escalerilla', 'canal'], {
    message: 'El tipo de bandeja debe ser "escalerilla" o "canal"',
  })
  trayTypeSelection: TrayType;

  @ApiProperty({
    description: 'Porcentaje de reserva para futuros cables',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  reservePercentage?: number;
}
