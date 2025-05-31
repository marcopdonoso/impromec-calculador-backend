import { PartialType } from '@nestjs/swagger';
import { CreateCableTrayDto } from './create-cable-tray.dto';

export class UpdateCableTrayDto extends PartialType(CreateCableTrayDto) {}
