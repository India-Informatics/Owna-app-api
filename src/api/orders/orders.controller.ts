import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'

import { AuthNGuard } from '../auth/auth.guard'

import { CaptureOrderDto } from './dto/capture-order.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthNGuard)
  @Post()
  create(@Req() request: Request, @Body() createOrderDto: CreateOrderDto) {
    const { id: userId } = request['user']
    return this.ordersService.create({ ...createOrderDto, userId })
  }

  @UseGuards(AuthNGuard)
  @Put(':id/capture')
  captureOrder(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() captureOrderDto: CaptureOrderDto,
  ) {
    const { id: userId } = request['user']

    const createBlockDto = {
      orderId: new Types.ObjectId(id),
      userId,
      ...captureOrderDto,
    }
    return this.ordersService.capture(createBlockDto)
  }

  @UseGuards(AuthNGuard)
  @Get()
  findAll() {
    return this.ordersService.findAll()
  }

  @UseGuards(AuthNGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id)
  }

  @UseGuards(AuthNGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto)
  }

  @UseGuards(AuthNGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id)
  }
}
