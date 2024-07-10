import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { PropertyDataModel, PropertySchema } from '../properties/properties.schema'

import { BlocksController } from './blocks.controller'
import { BlockDataModel, BlockSchema } from './blocks.schema'
import { BlocksService } from './blocks.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockDataModel.name, schema: BlockSchema },
      { name: PropertyDataModel.name, schema: PropertySchema },
    ]),
  ],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
