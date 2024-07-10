/* eslint-disable complexity */
import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { toDecimal, toSnapshot } from 'dinero.js'
import { Model, Types } from 'mongoose'

import { CaptureOrderException, ResourceCreateFailure } from '../../tools/exceptions'
import {
  OrderStatus,
  OrderStatusEvent,
  OrderType,
  TransactionType,
} from '../../types/domain'
import { AccountService } from '../account/account.service'
import { BlockDataModel } from '../blocks/blocks.schema'
import { BlocksService } from '../blocks/blocks.service'
import { PropertyDataModel } from '../properties/properties.schema'
import { PropertiesService } from '../properties/properties.service'
import { TransactionsService } from '../transactions/transactions.service'

import { getSingleBlockPrice, getTotalOrderPrice } from './domain/orderCapturing'
import { CaptureOrderDto } from './dto/capture-order.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { OrderDataModel, OrderDocument } from './orders.schema'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)
  constructor(
    @InjectModel(OrderDataModel.name)
    private OrderModel: Model<OrderDataModel>,
    @InjectModel(PropertyDataModel.name)
    private PropertyModel: Model<PropertyDataModel>,
    @InjectModel(BlockDataModel.name)
    private BlocksModel: Model<BlockDataModel>,
    private PropertyService: PropertiesService,
    private AccService: AccountService,
    private TxnService: TransactionsService,
    private BlockService: BlocksService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    try {
      const newStatus: OrderStatusEvent = {
        status: OrderStatus.PENDING,
        timestamp: new Date(),
      }

      const newOrder = await new this.OrderModel({
        ...createOrderDto,
        statuses: [newStatus],
      })

      return await newOrder.save()
    } catch (error) {
      this.logger.error(error.message)
      this.logger.error(
        `Create Order Failed - failed for user ${createOrderDto.userId} }`,
      )
      throw new ResourceCreateFailure(error.message)
    }
  }

  async capture(captureOrderDto: CaptureOrderDto) {
    const { orderId, userId, accountId } = captureOrderDto
    this.logger.log(
      `Trying to capture order with orderId ${orderId}, userId ${userId}, accountId ${accountId}`,
    )
    try {
      const order = await this.OrderModel.findOne({ _id: orderId, userId })
      this.logger.log(`Found order with orderId ${orderId}, userId ${userId}`)
      if (order.type === OrderType.BUY) {
        this.logger.log(`Processing purchase order with orderId ${orderId}`)
        return this.capturePurchaseOrder(order, accountId)
      }

      this.logger.log(`Processing sell order with orderId ${orderId}`)
      return this.captureSellOrder(order, accountId)
    } catch (error) {
      this.logger.error(error.message)
      this.logger.error(
        `Capture Order Failed - order ${orderId} failed for user ${userId} }`,
      )
      await this.OrderModel.findOneAndUpdate(
        { _id: orderId },
        {
          $push: {
            statuses: {
              status: OrderStatus.CANCELLED,
              timestamp: new Date().toISOString(),
            },
          },
        },
      )
      throw new CaptureOrderException(
        `Capture Order Failed - order ${orderId} failed for user ${userId} }`,
      )
    }
  }

  private async capturePurchaseOrder(order: OrderDocument, accountId: string) {
    const { id, userId, propertyId, numberOfBlocks } = order

    this.logger.log(
      `capturePurchaseOrder - Processing purchase order with orderId ${id}`,
    )

    const property = await this.PropertyService.findOne(propertyId.toString())
    this.logger.log(
      `capturePurchaseOrder - found property with propertyId ${propertyId}`,
    )
    if (!property.hasEnoughBlocksForPurchase(numberOfBlocks)) {
      this.logger.log(
        `capturePurchaseOrder - property have only ${property.fractions.blocksRemaining} but ${numberOfBlocks} blocks is desired for order ${id}`,
      )
      throw new CaptureOrderException(
        `Property has only ${property.fractions.blocksRemaining} blocks remaining`,
      )
    }

    const totalOrderPrice = getTotalOrderPrice(
      property.fractions.blockValue,
      numberOfBlocks,
    )

    const account = await this.AccService.getAccount(accountId)

    this.logger.log(`capturePurchaseOrder - account found with ${accountId}`)

    if (!account.hasEnoughFundsForPurchase(totalOrderPrice)) {
      this.logger.log(
        `capturePurchaseOrder - account ${accountId} has only ${
          account.balance.availableAmount
        } available but ${toDecimal(totalOrderPrice)} is required to make the purchase`,
      )

      throw new CaptureOrderException(
        `Insufficient balance: availableAmount ${account.balance.availableAmount}}}`,
      )
    }
    const singleBlockPrice = getSingleBlockPrice(property.fractions.blockValue)

    const singleBlockPriceSnapshot = toSnapshot(singleBlockPrice)
    const totalPriceSnapshot = toSnapshot(totalOrderPrice)

    await this.OrderModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          blockPrice: singleBlockPriceSnapshot,
          totalPrice: totalPriceSnapshot,
        },
      },
    )

    this.logger.log(
      `capturePurchaseOrder - order ${id} updated with blockPrice ${toDecimal(
        singleBlockPrice,
      )} and totalPrice ${toDecimal(singleBlockPrice)}`,
    )

    property.increaseBlocksSold(numberOfBlocks)

    const newProperty = await this.PropertyModel.findOneAndUpdate(
      { _id: propertyId },
      {
        $set: { 'fractions.blocksSold': property.fractions.blocksSold },
      },
      { new: true },
    )

    this.logger.log(
      `capturePurchaseOrder - property ${newProperty?.id} with blockSold ${newProperty?.fractions.blocksSold}`,
    )

    let block = await this.BlockService.findWithDeleted(
      userId.toString(),
      propertyId.toString(),
    )

    if (block) {
      this.logger.log(`capturePurchaseOrder - found block ${block?.id}`)
      await this.BlockService.updateBlockForOrderType(
        block,
        numberOfBlocks,
        order.type,
        userId,
      )
    } else {
      block = await this.BlockService.create({
        userId: userId.toString(),
        propertyId: propertyId.toString(),
        numberOfBlocks,
      })
      this.logger.log(`capturePurchaseOrder - created block ${block?.id}`)
    }
    const updatedOrder = await this.OrderModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          blockId: new Types.ObjectId(block.id),
        },
        $push: {
          statuses: {
            status: OrderStatus.PAID,
            timestamp: new Date().toISOString(),
          },
        },
      },
      {
        new: true,
      },
    )

    await this.TxnService.create({
      orderId: id,
      amount: totalOrderPrice,
      transactionType: TransactionType.BlockPurchase,
      accountId,
      description: 'Block purchase',
    })

    this.logger.log(
      `capturePurchaseOrder - returning updated order ${updatedOrder?.id}`,
    )

    return updatedOrder
  }

  private async captureSellOrder(order: OrderDocument, accountId: string) {
    const { id, userId, propertyId, numberOfBlocks } = order
    this.logger.log(`captureSellOrder - Processing sell order with orderId ${id}`)
    const block = await this.BlockService.findWithDeleted(
      userId.toString(),
      propertyId.toString(),
    )

    if (!block) {
      this.logger.log(
        `captureSellOrder - did not find block with userId ${userId} and propertyId ${propertyId}`,
      )

      throw new CaptureOrderException(
        `No Block found for user ${userId} with property ${propertyId}`,
      )
    }

    this.logger.log(`captureSellOrder - found block trying to sell ${block.id}`)

    if (!block.hasEnoughBlocksToSell(numberOfBlocks)) {
      this.logger.log(
        `captureSellOrder - block have only ${block.blocksPurchased} but ${numberOfBlocks} blocks is desired for order ${id}`,
      )

      throw new CaptureOrderException(
        `User has only ${block.blocksPurchased} blocks remaining`,
      )
    }

    const property = await this.PropertyService.findOne(propertyId.toString())

    this.logger.log(`captureSellOrder - found property trying to sell ${propertyId}`)

    const totalOrderPrice = getTotalOrderPrice(
      property.fractions.blockValue,
      numberOfBlocks,
    )
    const singleBlockPrice = getSingleBlockPrice(property.fractions.blockValue)

    const singleBlockPriceSnapshot = toSnapshot(singleBlockPrice)
    const totalPriceSnapshot = toSnapshot(totalOrderPrice)

    await this.OrderModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          blockPrice: singleBlockPriceSnapshot,
          totalPrice: totalPriceSnapshot,
        },
      },
    )

    this.logger.log(
      `captureOrder - order ${id} updated with blockPrice ${toDecimal(
        singleBlockPrice,
      )} and totalPrice ${toDecimal(totalOrderPrice)}`,
    )

    property.decreaseBlocksSold(numberOfBlocks)

    const newProperty = await this.PropertyModel.findOneAndUpdate(
      { _id: propertyId },
      {
        $set: { 'fractions.blocksSold': property.fractions.blocksSold },
      },
      { new: true },
    )

    this.logger.log(
      `captureSellOrder - property ${newProperty?.id} with blockSold ${newProperty?.fractions.blocksSold}`,
    )

    this.logger.log(`captureSellOrder - trying to update block with orderId ${id}`)

    await this.BlockService.updateBlockForOrderType(
      block,
      numberOfBlocks,
      order.type,
      userId,
    )

    const updatedOrder = await this.OrderModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          blockId: new Types.ObjectId(block.id),
        },
        $push: {
          statuses: {
            status: OrderStatus.PAID,
            timestamp: new Date().toISOString(),
          },
        },
      },
      { new: true },
    )

    await this.TxnService.create({
      orderId: id,
      amount: totalOrderPrice,
      transactionType: TransactionType.BlockSale,
      accountId,
      description: 'Block sale',
    })

    this.logger.log(`captureSellOrder - returning updated order ${updatedOrder?.id}`)
    return updatedOrder
  }

  findAll() {
    return `This action returns all orders`
  }

  findOne(id: string) {
    return `This action returns a #${id} order`
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`
  }

  remove(id: string) {
    return `This action removes a #${id} order`
  }
}
