/* eslint-disable no-console */
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
  console.info('API: initialising')

  const app = await NestFactory.create(AppModule)
  const configService: ConfigService = app.get<ConfigService>(ConfigService)

  const port = configService.get('server.port')

  await app.listen(port)
}

bootstrap()
