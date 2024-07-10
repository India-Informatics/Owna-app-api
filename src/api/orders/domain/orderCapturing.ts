import { NZD } from '@dinero.js/currencies'
import { dinero, multiply } from 'dinero.js'
import { chain } from 'mathjs'

// TODO: Add unit tests
export function getTotalOrderPrice(blockValue: number, numberOfBlocks: number) {
  const singleBlockPrice = getSingleBlockPrice(blockValue)

  const totalOrderPrice = multiply(singleBlockPrice, numberOfBlocks)

  return totalOrderPrice
}

export function getSingleBlockPrice(blockValue: number) {
  const multiplier = NZD.base ** NZD.exponent
  const amount = chain(multiplier).multiply(blockValue).round().done()
  const singleBlockPrice = dinero({ amount, currency: NZD, scale: NZD.exponent })

  return singleBlockPrice
}
