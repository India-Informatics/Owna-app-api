import { DineroSnapshot } from 'dinero.js'
import { Types } from 'mongoose'

export type PaymentHistory = {
  timestamp: Date
  transactionReference: Types.ObjectId
  receiptReferece: Types.ObjectId
}

export type BlockPrice = DineroSnapshot<number>
