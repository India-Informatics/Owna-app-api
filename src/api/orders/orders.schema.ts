/* eslint-disable max-classes-per-file */
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import {
  OrderStatus,
  OrderStatusEvent,
  PaymentHistory,
  BlockPrice,
  OrderType,
} from '../../types/domain'

class StatusModel implements OrderStatusEvent {
  status: OrderStatus
  timestamp: Date
}

class Payment implements PaymentHistory {
  timestamp: Date
  transactionReference: Types.ObjectId
  receiptReferece: Types.ObjectId
}

@Schema({ collection: 'orders', timestamps: true })
export class OrderDataModel {
  @Prop()
  userId: Types.ObjectId

  @Prop()
  propertyId: Types.ObjectId

  @Prop()
  blockId: Types.ObjectId

  @Prop()
  numberOfBlocks: number

  @Prop({ enum: OrderType, required: true })
  type: OrderType

  @Prop({ type: Object })
  blockPrice: BlockPrice

  @Prop({ type: Object })
  totalPrice: BlockPrice

  @Prop(raw(Payment))
  payment: Payment

  @Prop(raw(StatusModel))
  statuses: StatusModel[]
}

export type OrderDocument = HydratedDocument<OrderDataModel>
export const OrderSchema = SchemaFactory.createForClass(OrderDataModel)
