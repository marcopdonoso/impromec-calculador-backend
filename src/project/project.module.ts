import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { AuthModule } from 'src/auth/auth.module';
import { TrayCalculatorService } from './tray-calculator.service';
import { CableTray, CableTraySchema } from '../catalog/schemas/cable-tray.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: CableTray.name, schema: CableTraySchema },
    ]),
    AuthModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, TrayCalculatorService],
  exports: [ProjectService, TrayCalculatorService],
})
export class ProjectModule {}
