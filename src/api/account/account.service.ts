import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import axios from 'axios'

import { config } from '../../config/config'
import { Account } from '../../types/domain/account'

import { WalletAccount } from './entities/account.entity'

@Injectable()
export class AccountService {
  constructor(@Inject(REQUEST) private request) {}
  async getAccount(accountId: string): Promise<WalletAccount> {
    const baseUrl = config().integration.financialsUrl
    const response = await axios.get(`${baseUrl}/banking/accounts/${accountId}`, {
      headers: {
        Authorization: this.request.headers['authorization'],
        'id-token': this.request.headers['id-token'],
      },
    })

    const data = response.data as Account

    const account = new WalletAccount(
      data.id,
      data.userId,
      data.name,
      data.accountNumber,
      data.balance,
    )

    return account
  }
}
