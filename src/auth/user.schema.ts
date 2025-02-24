import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class CategoryOption {
  @Prop({ required: true })
  text: string;

  @Prop({
    required: true,
    enum: [
      'commercial',
      'construction',
      'industry',
      'installations',
      'projects',
    ],
  })
  value: string;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  company?: string;

  @Prop({ type: CategoryOption, required: true })
  category: CategoryOption;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  location: string;

  @Prop({ default: false })
  isVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
