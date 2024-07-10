/* eslint-disable max-classes-per-file */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

import { WithdrawalStatus } from '../../types/domain/withdrawal'

class WithdrawalAmount {
  currency: {
    code: string
    base: number
    exponent: number
  }

  amount: number
  scale: number
}

@Schema({ collection: 'withdrawals', timestamps: true })
export class WithdrawalDataModel {
  @Prop()
  userId: Types.ObjectId

  @Prop()
  amount: WithdrawalAmount

  @Prop()
  status: WithdrawalStatus
}

export type WithdrawalDocument = HydratedDocument<WithdrawalDataModel>
export const WithdrawalSchema = SchemaFactory.createForClass(WithdrawalDataModel)
