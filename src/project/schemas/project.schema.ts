import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/auth/user.schema';
import { Sector, SectorSchema } from './sector.schema';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true })
  projectName: string;

  @Prop({ required: true })
  projectCompany: string;

  @Prop({ required: true })
  projectLocation: string;

  @Prop({ type: [SectorSchema], default: [] })
  sectors: Sector[];

  @Prop({ 
    type: {
      fileId: String
    }, 
    default: null 
  })
  calculationReport: { fileId: string } | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
