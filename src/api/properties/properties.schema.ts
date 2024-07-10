/* eslint-disable max-classes-per-file */
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

import {
  Address,
  Area,
  Fraction,
  Investment,
  PropertyType,
  Valuation,
} from '../../types/domain'

class AddressDataModel implements Address {
  streetType: string
  countryISO: string
  fullAddress: string
  postCode: string
  streetName: string
  streetNumber: string
  suburb: string
  territorialAuthorityName: string
  territorialAuthorityType: string
}

class AreaDataModel implements Area {
  unit: string
  value: number
}

class ValuationDataModel implements Valuation {
  date: Date
  value: number
}

class FractionDataModel implements Fraction {
  blocksTotal: number
  blocksSold: number
  blockValue: number
  blockValueUnit: string
  blockValueCurrency: string
}

class InvestmentDataModel implements Investment {
  annualYield: number
  weeklyRent: number
  weeklyBodyCorpFees: number
  weeklyPropertyManagementFees: number
  weeklyRates: number
}

@Schema({ collection: 'properties' })
export class PropertyDataModel {
  @Prop(raw(FractionDataModel))
  fractions: Fraction

  @Prop(raw(InvestmentDataModel))
  investment: InvestmentDataModel

  @Prop(raw(AddressDataModel))
  address: Address

  @Prop()
  propertyType: PropertyType

  @Prop(raw(AreaDataModel))
  floorArea: Area

  @Prop(raw(AreaDataModel))
  landArea: Area

  @Prop()
  numberOfBedrooms: number

  @Prop()
  numberOfBathrooms: number

  @Prop()
  numberOfParkingSpaces: number

  @Prop()
  laundry: boolean

  @Prop()
  garage: boolean

  @Prop()
  outdoorSpace: boolean

  @Prop()
  deck: boolean

  @Prop()
  condition: string

  @Prop()
  insulation: string[]

  @Prop()
  heating: string[]

  @Prop()
  internet: string

  @Prop(raw(ValuationDataModel))
  valuations: Valuation[]

  @Prop()
  externalRef: string

  @Prop()
  imagesUris: string[]
}

export type PropertyDocument = HydratedDocument<PropertyDataModel>
export const PropertySchema = SchemaFactory.createForClass(PropertyDataModel)
