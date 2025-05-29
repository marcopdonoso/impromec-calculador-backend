import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CableInTray, CableInTraySchema } from './cable.schema';
import { Results, ResultsSchema } from './results.schema';

export type InstallationLayerType = 'singleLayer' | 'multiLayer';
export type TrayType = 'escalerilla' | 'canal';

@Schema()
export class Sector extends Document {
  @Prop({ required: true })
  sectorName: string;

  @Prop({ required: true, enum: ['escalerilla', 'canal'] })
  trayTypeSelection: TrayType;

  @Prop({ required: true, default: 30 })
  reservePercentage: number;

  @Prop({ required: true, enum: ['singleLayer', 'multiLayer'] })
  installationLayerSelection: InstallationLayerType;

  @Prop({ type: [CableInTraySchema], default: [] })
  cablesInTray: CableInTray[];

  @Prop({ type: ResultsSchema, default: null })
  results: Results;
}

export const SectorSchema = SchemaFactory.createForClass(Sector);
