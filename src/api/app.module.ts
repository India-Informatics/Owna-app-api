import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'

import { config } from '../config/config'
import { DatabaseConfig } from '../config/database.config'
import { getEnvPath } from '../config/env/helper/env.helper'

import { AccountModule } from './account/account.module'
import { BlocksModule } from './blocks/blocks.module'
import { HealthModule } from './health/health.module'
import { OrdersModule } from './orders/orders.module'
import { PropertiesModule } from './properties/properties.module'
import { TransactionsModule } from './transactions/transactions.module'
import { WithdrawalsModule } from './withdrawals/withdrawals.module'

const envFilePath: string = getEnvPath(`${process.cwd()}/src/config/env`)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      load: [config],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),
    HealthModule,
    OrdersModule,
    PropertiesModule,
    BlocksModule,
    AccountModule,
    WithdrawalsModule,
    TransactionsModule,
  ],
})
export class AppModule {}
