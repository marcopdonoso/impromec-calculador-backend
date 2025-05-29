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

  @Prop({ enum: ['escalerilla', 'canal'] })
  trayTypeSelection?: TrayType;

  @Prop({ default: 30 })
  reservePercentage?: number;

  @Prop({ enum: ['singleLayer', 'multiLayer'] })
  installationLayerSelection?: InstallationLayerType;

  @Prop({ type: [CableInTraySchema], default: [] })
  cablesInTray: CableInTray[];

  @Prop({ type: ResultsSchema, default: null })
  results: Results;
}

export const SectorSchema = SchemaFactory.createForClass(Sector);
