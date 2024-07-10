import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { WithdrawalsController } from './withdrawals.controller'
import { WithdrawalDataModel, WithdrawalSchema } from './withdrawals.schema'
import { WithdrawalsService } from './withdrawals.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WithdrawalDataModel.name, schema: WithdrawalSchema },
    ]),
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
