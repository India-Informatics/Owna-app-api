import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'

import { AuthNGuard } from '../auth/auth.guard'

import { CreatePropertyDto } from './dto/create-property.dto'
import { UpdatePropertyDto } from './dto/update-property.dto'
import { PropertiesService } from './properties.service'

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(AuthNGuard)
  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto)
  }

  @Get()
  findAll(@Req() request: Request) {
    const { offset: offsetQ, limit: limitQ } = request.query

    if (offsetQ && limitQ) {
      const offset = parseInt(offsetQ as string, 10)
      const limit = parseInt(limitQ as string, 10)

      return this.propertiesService.findAll(null, offset, limit, null)
    }

    return this.propertiesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id)
  }

  @UseGuards(AuthNGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertiesService.update(id, updatePropertyDto)
  }

  @UseGuards(AuthNGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id)
  }
}
