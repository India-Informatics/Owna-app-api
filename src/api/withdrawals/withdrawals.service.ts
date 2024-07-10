import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { ResourceCreateFailure } from '../../tools/exceptions'
import { WithdrawalStatus } from '../../types/domain/withdrawal'

import { CreateWithdrawalDto } from './dto/create-withdrawal.dto'
import { WithdrawalDataModel } from './withdrawals.schema'

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name)

  constructor(
    @InjectModel(WithdrawalDataModel.name)
    private WithdrawalModel: Model<WithdrawalDataModel>,
  ) {}

  async create(userId: string, createWithdrawalDto: CreateWithdrawalDto) {
    try {
      const newWithdrawal = await new this.WithdrawalModel({
        userId,
        status: WithdrawalStatus.PENDING,
        amount: { ...createWithdrawalDto.withdrawalAmountRequested },
      })

      return newWithdrawal.save()
    } catch (error) {
      this.logger.error(`Create Withdrawal Failed.`)
      this.logger.error(error.message)
      throw new ResourceCreateFailure(error.message)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  findAll() {}
}
