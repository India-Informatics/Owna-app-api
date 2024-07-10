export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export type OrderStatusEvent = {
  status: OrderStatus
  timestamp: Date
}

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}
