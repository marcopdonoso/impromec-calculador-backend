import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrayType = 'escalerilla' | 'canal';

@Schema()
export class TrayTechnicalDetails extends Document {
  @Prop({ required: true })
  thicknessInMM: number;

  @Prop({ required: true })
  widthInMM: number;

  @Prop({ required: true })
  heightInMM: number;

  @Prop({ required: true })
  usefulAreaInMM2: number;

  @Prop({ required: true })
  loadResistanceInKgM: number;
}

export const TrayTechnicalDetailsSchema = SchemaFactory.createForClass(TrayTechnicalDetails);

@Schema()
export class Tray extends Document {
  @Prop({ required: true })
  trayName: string;

  @Prop({ required: true })
  trayDescription: string;

  @Prop({ required: true, enum: ['escalerilla', 'canal'] })
  trayType: TrayType;

  @Prop({ type: TrayTechnicalDetailsSchema, required: true })
  technicalDetails: TrayTechnicalDetails;
}

export const TraySchema = SchemaFactory.createForClass(Tray);
