import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { ResourceCreateFailure } from '../../tools/exceptions'

import { CreatePropertyDto } from './dto/create-property.dto'
import { UpdatePropertyDto } from './dto/update-property.dto'
import { Property } from './entities/property.entity'
import { PropertyDataModel } from './properties.schema'

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(PropertyDataModel.name)
    private PropertyModel: Model<PropertyDataModel>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto) {
    try {
      const createdProperty = await new this.PropertyModel(createPropertyDto)

      return createdProperty.save()
    } catch (error) {
      // TODO: Log error
      throw new ResourceCreateFailure(error.message)
    }
  }

  async findAll(q: string = null, offset = 0, limit = 20, sort: string = null) {
    const properties = await this.PropertyModel.find({}).skip(offset).limit(limit)

    return properties
  }

  async findOne(id: string) {
    const model = await this.PropertyModel.findOne({
      _id: new Types.ObjectId(id),
    })

    const property = new Property(
      model.fractions,
      model.investment,
      model.address,
      model.propertyType,
      model.floorArea,
      model.landArea,
      model.numberOfBedrooms,
      model.numberOfBathrooms,
      model.numberOfParkingSpaces,
      model.laundry,
      model.garage,
      model.outdoorSpace,
      model.deck,
      model.condition,
      model.insulation,
      model.heating,
      model.internet,
      model.valuations,
      model.externalRef,
      model.imagesUris,
    )

    property.calculateTotalFigures()

    property.calculateBlocksRemaining()

    return property
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    await this.PropertyModel.updateOne(
      { _id: new Types.ObjectId(id) },
      updatePropertyDto,
    )
  }

  async remove(id: string) {
    await this.PropertyModel.deleteOne({ _id: new Types.ObjectId(id) })
  }
}
