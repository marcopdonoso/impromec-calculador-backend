import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Tray, TraySchema } from './tray.schema';

@Schema()
export class Results extends Document {
  @Prop({ type: TraySchema, default: null })
  moreConvenientOption: Tray;

  @Prop({ type: [TraySchema], default: [] })
  otherRecommendedOptions: Tray[];
  
  @Prop({ type: Number, default: null })
  calculatedLoadInKgM: number;
  
  @Prop({ type: Number, default: null })
  calculatedAreaInMM2: number;
}

export const ResultsSchema = SchemaFactory.createForClass(Results);
