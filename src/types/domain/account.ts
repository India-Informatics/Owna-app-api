export type Balance = {
  currency: string
  balanceAmount: number
  availableAmount: number
  overdrawn: boolean
}

export type Account = {
  id: string
  userId: string
  linkId: string
  linkName?: string
  externalRef: string
  accountType: string
  holder?: string
  name: string
  accountNumber: string
  balance: Balance
}
