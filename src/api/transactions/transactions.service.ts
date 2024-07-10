import { Inject, Injectable, Logger } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { InjectModel } from '@nestjs/mongoose'
import axios, { AxiosResponse } from 'axios'
import { Dinero, toDecimal } from 'dinero.js'
import { Model } from 'mongoose'

import { config } from '../../config/config'
import { ResourceCreationException } from '../../tools/exceptions'
import { TransactionType } from '../../types/domain/transaction'
import { OrderDataModel } from '../orders/orders.schema'

import { Transaction } from './entities/transaction.entity'

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name)

  constructor(
    @Inject(REQUEST) private request,
    @InjectModel(OrderDataModel.name)
    private OrderModel: Model<OrderDataModel>,
  ) {}

  async create({
    orderId,
    amount,
    transactionType,
    accountId,
    description,
  }: {
    orderId: string
    amount: Dinero<number>
    transactionType: TransactionType
    accountId: string
    description?: string
  }): Promise<Transaction> {
    const decimalAmount = parseFloat(toDecimal(amount))
    const newTransaction = {
      transactionDate: new Date().toISOString(),
      amount: decimalAmount,
      origin: 'account',
      merchantName: 'owna',
      transactionType,
      description,
      accountId,
      shouldAdjustBalance: true,
    }

    const baseUrl = config().integration.financialsUrl
    const endpoint = `${baseUrl}/banking/transactions`

    const response: AxiosResponse<Transaction> = await axios.post(
      endpoint,
      newTransaction,
      {
        headers: {
          Authorization: this.request.headers['authorization'],
          'id-token': this.request.headers['id-token'],
        },
      },
    )
    if (response.status !== 201) {
      this.logger.error(
        `Failed to create transaction from Financials API for account ${accountId}`,
      )
      throw new ResourceCreationException('Failed to create transactions')
    }

    await this.OrderModel.findByIdAndUpdate(orderId, {
      payment: {
        transactionReference: response.data,
        timestamp: response.data.transactionDate,
      },
    })

    return response.data
  }
}
