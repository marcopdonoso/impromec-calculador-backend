import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CalculationReportDto {
  @ApiProperty({
    description: 'ID del archivo de reporte en PDF Monkey',
    example: '109e1113-0cf5-4321-91a9-ed75222aae9a',
  })
  @IsNotEmpty()
  @IsString()
  fileId: string;
}
