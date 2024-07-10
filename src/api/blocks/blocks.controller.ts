import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common'
import { Request } from 'express'

import { AuthNGuard } from '../auth/auth.guard'

import { BlocksService } from './blocks.service'
import { CreateBlockDto } from './dto/create-block.dto'
import { UpdateBlockDto } from './dto/update-block.dto'

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @UseGuards(AuthNGuard)
  @Post()
  create(@Body() createBlockDto: CreateBlockDto) {
    return this.blocksService.create(createBlockDto)
  }

  @UseGuards(AuthNGuard)
  @Get()
  findAll(@Req() request: Request) {
    const { id } = request['user']

    return this.blocksService.findAll(id)
  }

  @UseGuards(AuthNGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blocksService.findOne(id)
  }

  @UseGuards(AuthNGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlockDto: UpdateBlockDto) {
    return this.blocksService.update(id, updateBlockDto)
  }
}
