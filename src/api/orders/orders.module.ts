import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { AccountModule } from '../account/account.module'
import { BlocksModule } from '../blocks/blocks.module'
import { BlockDataModel, BlockSchema } from '../blocks/blocks.schema'
import { PropertiesModule } from '../properties/properties.module'
import { PropertyDataModel, PropertySchema } from '../properties/properties.schema'
import { TransactionsModule } from '../transactions/transactions.module'

import { OrdersController } from './orders.controller'
import { OrderDataModel, OrderSchema } from './orders.schema'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderDataModel.name, schema: OrderSchema },
      { name: BlockDataModel.name, schema: BlockSchema },
      { name: PropertyDataModel.name, schema: PropertySchema },
    ]),
    PropertiesModule,
    AccountModule,
    BlocksModule,
    TransactionsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
