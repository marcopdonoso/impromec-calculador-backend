import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Cable extends Document {
  @Prop({ required: true })
  nominalSectionMM2: string;

  @Prop({ required: true })
  nominalSectionAWG: string;

  @Prop({ required: true })
  externalDiameterMM: number;

  @Prop({ required: true })
  externalAreaMM2: number;

  @Prop({ required: true })
  weightPerMeterKG: number;
}

export const CableSchema = SchemaFactory.createForClass(Cable);

export type CableArrangementType = 'horizontal' | 'clover';

@Schema()
export class CableInTray extends Document {
  @Prop({ type: CableSchema, required: true })
  cable: Cable;

  @Prop({ required: true })
  quantity: number;

  @Prop({ enum: ['horizontal', 'clover'], default: 'horizontal' })
  arrangement?: CableArrangementType;
}

export const CableInTraySchema = SchemaFactory.createForClass(CableInTray);
