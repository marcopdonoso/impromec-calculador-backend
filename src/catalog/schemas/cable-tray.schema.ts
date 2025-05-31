import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum TrayType {
  LADDER = 'escalerilla',
  CHANNEL = 'canal'
}

export enum TrayCategory {
  SUPER_LIGHT = 'super liviana',
  LIGHT = 'liviana',
  SEMI_HEAVY = 'semi pesada',
  HEAVY = 'pesada'
}

@Schema({ timestamps: true })
export class CableTray extends Document {
  @Prop({ required: true, enum: TrayType })
  @ApiProperty({ description: 'Tipo de bandeja', enum: TrayType })
  type: TrayType;
  
  @Prop({ required: true, enum: TrayCategory })
  @ApiProperty({ description: 'Categoría de la bandeja', enum: TrayCategory })
  category: TrayCategory;

  @Prop({ required: true })
  @ApiProperty({ description: 'Espesor de plancha (en mm)' })
  thickness: number;

  @Prop({ required: true })
  @ApiProperty({ description: 'Alto de bandeja (en mm)' })
  height: number;

  @Prop({ required: true })
  @ApiProperty({ description: 'Ancho de Bandeja (en mm)' })
  width: number;

  @Prop({ required: true })
  @ApiProperty({ description: 'Carga de Servicio (en kg/ml)' })
  loadCapacity: number;

  @Prop({ required: false })
  @ApiProperty({ description: 'Código o referencia del producto', required: false })
  code?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Nombre o descripción del producto', required: false })
  name?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Largo de la bandeja en mm', required: false })
  length?: number;

  @Prop({ required: false })
  @ApiProperty({ description: 'Material de fabricación', required: false })
  material?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Acabado o recubrimiento', required: false })
  finish?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Área útil para cables en mm²', required: false })
  usefulArea?: number;

  @Prop({ required: false })
  @ApiProperty({ description: 'URL de la imagen del producto', required: false })
  imageUrl?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'URL de la ficha técnica', required: false })
  dataSheetUrl?: string;

  @Prop({ required: false, default: true })
  @ApiProperty({ description: 'Indica si el producto está activo/disponible', default: true })
  isActive: boolean;

  @Prop({ type: Object, required: false })
  @ApiProperty({ description: 'Propiedades adicionales específicas del tipo de bandeja', required: false })
  additionalProperties?: Record<string, any>;
}

export const CableTraySchema = SchemaFactory.createForClass(CableTray);
