import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CableTray, CableTraySchema } from './schemas/cable-tray.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CableTray.name, schema: CableTraySchema }
    ])
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
