import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrayType = 'escalerilla' | 'canal';
export type TrayCategory = 'super-liviana' | 'liviana' | 'semi-pesada' | 'pesada' | 'super-pesada';

@Schema()
export class TrayTechnicalDetails extends Document {
  @Prop({ required: true })
  thicknessInMM: number;

  @Prop({ required: true })
  widthInMM: number;

  @Prop({ required: true })
  heightInMM: number;

  @Prop({ required: true })
  loadResistanceInKgM: number;

  @Prop()
  usefulAreaInMM2?: number;
}

export const TrayTechnicalDetailsSchema = SchemaFactory.createForClass(TrayTechnicalDetails);

@Schema()
export class Tray extends Document {
  @Prop()
  id?: string;
  
  @Prop({ required: true, enum: ['escalerilla', 'canal'] })
  trayType: TrayType;

  @Prop({ required: true, enum: ['super-liviana', 'liviana', 'semi-pesada', 'pesada', 'super-pesada'] })
  trayCategory: TrayCategory;

  @Prop({ type: TrayTechnicalDetailsSchema, required: true })
  technicalDetails: TrayTechnicalDetails;

  // Campos adicionales que podrían ser útiles pero no son parte de la interfaz del frontend
  @Prop()
  trayName?: string;

  @Prop()
  trayDescription?: string;
}

export const TraySchema = SchemaFactory.createForClass(Tray);
