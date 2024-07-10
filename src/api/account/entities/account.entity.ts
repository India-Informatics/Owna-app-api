import { NZD } from '@dinero.js/currencies'
import { Dinero, compare, dinero } from 'dinero.js'
import { round } from 'mathjs'

import { Balance } from '../../../types/domain/account'

export class WalletAccount {
  constructor(
    id: string,
    userId: string,
    name: string,
    accountNumber: string,
    balance: Balance,
  ) {
    this.id = id
    this.userId = userId
    this.name = name
    this.accountNumber = accountNumber
    this.balance = balance
  }

  id: string
  userId: string
  name: string
  accountNumber: string
  balance: Balance

  hasEnoughFundsForPurchase(orderPrice: Dinero<number>) {
    const funds = dinero({
      amount: round(this.balance.availableAmount * 100),
      currency: NZD,
      scale: 2,
    })

    const insufficientFunds = compare(funds, orderPrice) === -1
    // -1 is returned by dinero when the first arg is less than the second.

    if (insufficientFunds) return false

    return true
  }
}
