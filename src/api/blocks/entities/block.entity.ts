import { ResourceUpdateException } from '../../../tools/exceptions'
import { OrderType } from '../../../types/domain/order'

/* eslint-disable max-classes-per-file */
export class Block {
  constructor(
    public id: string,
    public userId: string,
    public propertyId: string,
    public blocksPurchased: number,
  ) {}

  hasEnoughBlocksToSell(desiredNumOfBlocks: number) {
    return this.blocksPurchased >= desiredNumOfBlocks
  }

  calculateNumBlocksPurchased(orderType: OrderType, numberOfBlocks: number) {
    this.validateNumberOfBlocks(numberOfBlocks)
    switch (orderType) {
      case OrderType.BUY:
        this.blocksPurchased += numberOfBlocks

        break

      case OrderType.SELL:
        this.blocksPurchased -= numberOfBlocks

        break

      default:
        break
    }
    return this.blocksPurchased
  }

  private validateNumberOfBlocks(numberOfBlocks: number) {
    if (numberOfBlocks === null || numberOfBlocks === undefined) {
      throw new ResourceUpdateException(`Failed to update block`)
    }
  }
}
