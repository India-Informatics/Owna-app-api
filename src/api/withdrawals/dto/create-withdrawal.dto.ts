export class CreateWithdrawalDto {
  withdrawalAmountRequested: {
    currency: {
      code: string
      base: number
      exponent: number
    }
    amount: number
    scale: number
  }
}
