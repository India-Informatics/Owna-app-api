import { TransactionType } from '../../../types/domain/transaction'

export class Transaction {
  id: string
  transactionDate: Date
  amount: number
  transactionType?: TransactionType
  description?: string
}
