import { Controller, Get } from '@nestjs/common'
import { Transport } from '@nestjs/microservices'
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus'

@Controller('/')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private serviceIndicator: MicroserviceHealthIndicator,
    private dbIndicator: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.serviceIndicator.pingCheck('tcp', {
          transport: Transport.TCP,
          options: { host: 'localhost', port: process.env.SERVER_PORT },
        }),
      () => this.dbIndicator.pingCheck('mongodb', { timeout: 2000 }),
    ])
  }
}
