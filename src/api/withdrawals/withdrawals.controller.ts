import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'

import { AuthNGuard } from '../auth/auth.guard'

import { CreateWithdrawalDto } from './dto/create-withdrawal.dto'
import { WithdrawalsService } from './withdrawals.service'

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @UseGuards(AuthNGuard)
  @Post()
  create(@Req() request: Request, @Body() createWithdrawalDto: CreateWithdrawalDto) {
    const { id: userId } = request['user']

    return this.withdrawalsService.create(userId, createWithdrawalDto)
  }

  @Get()
  findAll() {
    return this.withdrawalsService.findAll()
  }
}
