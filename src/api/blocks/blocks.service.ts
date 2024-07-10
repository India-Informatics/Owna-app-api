import { NZD } from '@dinero.js/currencies'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { dinero, toSnapshot, multiply } from 'dinero.js'
import { Model, Types } from 'mongoose'
import { SoftDeleteModel } from 'mongoose-delete'

import { ResourceCreateFailure, ResourceUpdateException } from '../../tools/exceptions'
import { OrderType } from '../../types/domain/order'
import { PropertyDataModel } from '../properties/properties.schema'

import { BlockDataModel, BlockDocument } from './blocks.schema'
import { CreateBlockDto } from './dto/create-block.dto'
import { UpdateBlockDto } from './dto/update-block.dto'
import { Block } from './entities/block.entity'

@Injectable()
export class BlocksService {
  constructor(
    @InjectModel(BlockDataModel.name)
    private BlockModel: SoftDeleteModel<BlockDocument>,
    @InjectModel(PropertyDataModel.name)
    private PropertyModel: Model<PropertyDataModel>,
  ) {}

  async create(createBlockDto: CreateBlockDto) {
    try {
      const property = await this.PropertyModel.findById(createBlockDto.propertyId)

      const originalBlockValue = property?.fractions?.blockValue ?? 0

      const paddedBlockValue = parseFloat(originalBlockValue.toFixed(2))

      const { base, exponent } = NZD
      const multiplier = base ** exponent
      const amount = paddedBlockValue * multiplier
      const roundedBlockValueAmount = Math.round(amount)

      const blockValueDinero = dinero({
        amount: roundedBlockValueAmount,
        currency: NZD,
      })

      const blockPricePaidDinero = multiply(
        blockValueDinero,
        createBlockDto.numberOfBlocks,
      )

      const {
        currency,
        amount: blockPriceAmount,
        scale: blockPriceScale,
      } = toSnapshot(blockPricePaidDinero)

      const blockPricePaid = {
        currency,
        amount: blockPriceAmount,
        scale: blockPriceScale,
      }
      // TODO: add validation for propertyId and userId

      const model = await new this.BlockModel({
        userId: createBlockDto?.userId,
        propertyId: createBlockDto?.propertyId,
        blocksPurchased: createBlockDto?.numberOfBlocks,
        blockPricePaid,
      })

      model.save()

      const block = new Block(
        model.id,
        model.userId.toString(),
        model.propertyId.toString(),
        model.blocksPurchased,
      )
      return block
    } catch (error) {
      // TODO: Log error
      throw new ResourceCreateFailure(error.message)
    }
  }

  async findAll(userId: string | null) {
    if (!userId) {
      throw new Error('UserId is not defined')
    }
    const blocks = await this.BlockModel.find({ userId })
    return blocks
  }

  async findWithDeleted(userId: string, propertyId: string) {
    if (!userId) {
      throw new Error('UserId is not defined')
    }
    if (!propertyId) {
      throw new Error('PropertyId is not defined')
    }
    const model = await this.BlockModel.findOneWithDeleted({ userId, propertyId })
    if (!model) {
      return null
    }
    const { _id: id, blocksPurchased } = model

    const block = new Block(id.toString(), userId, propertyId, blocksPurchased)
    return block
  }

  async updateBlockForOrderType(
    block: Block,
    numberOfBlocks: number,
    orderType: OrderType,
    userId: Types.ObjectId,
  ) {
    const blocksPurchased = block.calculateNumBlocksPurchased(orderType, numberOfBlocks)

    if (orderType === OrderType.SELL && blocksPurchased < 0) {
      throw new ResourceUpdateException(
        `Failed to update block ${block.id} with number of blocks ${numberOfBlocks}, order type ${orderType}}`,
      )
    }

    const updatedblocks = await this.BlockModel.findOneAndUpdateWithDeleted(
      { _id: block.id, userId },
      {
        $set: {
          blocksPurchased,
        },
      },
      { new: true },
    )
    const shouldDelete = updatedblocks.blocksPurchased === 0

    if (shouldDelete) {
      await this.remove(updatedblocks._id.toString(), userId.toString())
    } else {
      await this.BlockModel.restore({ _id: block.id })
    }
  }

  async findOne(id: string) {
    const block = await this.BlockModel.findOne({ _id: id })
    return block
  }

  async remove(id: string, userId: string) {
    const block = await this.BlockModel.delete({ _id: id }, userId)
    return block
  }

  update(id: string, updateBlockDto: UpdateBlockDto) {
    return `This action updates a #${id} block`
  }
}
