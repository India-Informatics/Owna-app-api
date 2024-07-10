import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongooseOptionsFactory } from '@nestjs/mongoose'

@Injectable()
export class DatabaseConfig implements MongooseOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMongooseOptions() {
    return this.configService.get('db')
  }
}
