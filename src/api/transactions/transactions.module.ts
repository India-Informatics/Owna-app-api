import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { OrderDataModel, OrderSchema } from '../orders/orders.schema'

import { TransactionsService } from './transactions.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrderDataModel.name, schema: OrderSchema }]),
  ],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
