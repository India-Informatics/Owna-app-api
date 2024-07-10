import { OrderType } from '../../../types/domain'

export class CreateOrderDto {
  userId: string
  propertyId: string
  numberOfBlocks: string
  type: OrderType
}
