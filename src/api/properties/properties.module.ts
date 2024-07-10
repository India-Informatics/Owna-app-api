import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { PropertiesController } from './properties.controller'
import { PropertyDataModel, PropertySchema } from './properties.schema'
import { PropertiesService } from './properties.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyDataModel.name, schema: PropertySchema },
    ]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
